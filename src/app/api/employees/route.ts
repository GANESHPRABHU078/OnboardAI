import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  verifyToken,
  requireRole,
  badRequestResponse,
  serverErrorResponse,
  hashPassword,
  generateToken,
} from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(request, 'admin', 'hr');
    if (!auth.success) return auth.response;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const departmentId = searchParams.get('departmentId');
    const status = searchParams.get('status');
    const role = searchParams.get('role');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
        { employeeId: { contains: search } },
      ];
    }
    if (departmentId) {
      where.departmentId = departmentId;
    }
    if (status) {
      where.status = status;
    }
    if (role) {
      where.role = role;
    }

    const [employees, total] = await Promise.all([
      db.employee.findMany({
        where,
        include: {
          department: {
            select: { id: true, name: true },
          },
          manager: {
            select: { id: true, firstName: true, lastName: true, employeeId: true },
          },
          _count: {
            select: {
              trainingPlans: true,
              quizResults: true,
              certificates: true,
              progressRecords: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.employee.count({ where }),
    ]);

    return NextResponse.json({
      employees,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get employees error:', error);
    return serverErrorResponse('Failed to fetch employees');
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, 'admin', 'hr');
    if (!auth.success) return auth.response;

    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      phone,
      departmentId,
      position,
      role,
      experience,
      skills,
      securityLevel,
      managerId,
    } = body;

    if (!firstName || !lastName || !email || !position) {
      return badRequestResponse('firstName, lastName, email, and position are required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return badRequestResponse('Invalid email format');
    }

    const existingEmployee = await db.employee.findUnique({ where: { email } });
    if (existingEmployee) {
      return badRequestResponse('An employee with this email already exists');
    }

    const hashedPassword = await hashPassword('changeme123');

    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name: `${firstName} ${lastName}`,
        role: role || 'employee',
      },
    });

    const employeeCount = await db.employee.count();
    const employeeIdNum = (employeeCount + 1).toString().padStart(3, '0');

    const employee = await db.employee.create({
      data: {
        userId: user.id,
        employeeId: `EMP-${employeeIdNum}`,
        firstName,
        lastName,
        email,
        phone: phone || null,
        departmentId: departmentId || null,
        position,
        role: role || 'employee',
        experience: experience || 'junior',
        skills: skills ? JSON.stringify(skills) : '[]',
        securityLevel: securityLevel || 'standard',
        status: 'onboarding',
        managerId: managerId || null,
      },
    });

    await logAudit(auth.payload.userId, 'EMPLOYEE_CREATED', 'Employee', `Created employee: ${email}`, request);

    const token = await generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return NextResponse.json({ employee, token }, { status: 201 });
  } catch (error) {
    console.error('Create employee error:', error);
    return serverErrorResponse('Failed to create employee');
  }
}