import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  verifyToken,
  requireRole,
  badRequestResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(request, 'admin', 'hr', 'employee');
    if (!auth.success) return auth.response;

    const { id } = await params;

    if (auth.payload.role === 'employee') {
      const emp = await db.employee.findFirst({
        where: { userId: auth.payload.userId },
        select: { id: true },
      });
      if (!emp || emp.id !== id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const employee = await db.employee.findUnique({
      where: { id },
      include: {
        department: true,
        manager: {
          select: { id: true, firstName: true, lastName: true, employeeId: true, position: true },
        },
        reports: {
          select: { id: true, firstName: true, lastName: true, employeeId: true, position: true },
        },
        user: {
          select: { id: true, name: true, email: true, role: true, avatar: true, isActive: true },
        },
        trainingPlans: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        quizResults: {
          include: {
            assessment: {
              select: { id: true, title: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        certificates: {
          orderBy: { createdAt: 'desc' },
        },
        progressRecords: {
          orderBy: { moduleIndex: 'asc' },
        },
      },
    });

    if (!employee) {
      return notFoundResponse('Employee');
    }

    return NextResponse.json({ employee });
  } catch (error) {
    console.error('Get employee error:', error);
    return serverErrorResponse('Failed to fetch employee');
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(request, 'admin', 'hr');
    if (!auth.success) return auth.response;

    const { id } = await params;
    const body = await request.json();

    const employee = await db.employee.findUnique({ where: { id } });
    if (!employee) {
      return notFoundResponse('Employee');
    }

    const updatedEmployee = await db.employee.update({
      where: { id },
      data: {
        firstName: body.firstName ?? employee.firstName,
        lastName: body.lastName ?? employee.lastName,
        email: body.email ?? employee.email,
        phone: body.phone !== undefined ? body.phone : employee.phone,
        departmentId: body.departmentId !== undefined ? body.departmentId : employee.departmentId,
        position: body.position ?? employee.position,
        role: body.role ?? employee.role,
        experience: body.experience ?? employee.experience,
        skills: body.skills ? JSON.stringify(body.skills) : employee.skills,
        securityLevel: body.securityLevel ?? employee.securityLevel,
        status: body.status ?? employee.status,
        onboardingStart: body.onboardingStart ? new Date(body.onboardingStart) : employee.onboardingStart,
        onboardingEnd: body.onboardingEnd ? new Date(body.onboardingEnd) : employee.onboardingEnd,
        managerId: body.managerId !== undefined ? body.managerId : employee.managerId,
      },
      include: {
        department: {
          select: { id: true, name: true },
        },
      },
    });

    if (body.firstName || body.lastName) {
      await db.user.update({
        where: { id: employee.userId },
        data: {
          name: `${updatedEmployee.firstName} ${updatedEmployee.lastName}`,
          role: updatedEmployee.role,
        },
      });
    }

    await logAudit(auth.payload.userId, 'EMPLOYEE_UPDATED', 'Employee', `Updated employee: ${id}`, request);

    return NextResponse.json({ employee: updatedEmployee });
  } catch (error) {
    console.error('Update employee error:', error);
    return serverErrorResponse('Failed to update employee');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(request, 'admin');
    if (!auth.success) return auth.response;

    const { id } = await params;

    const employee = await db.employee.findUnique({ where: { id } });
    if (!employee) {
      return notFoundResponse('Employee');
    }

    await db.employee.delete({ where: { id } });

    await logAudit(auth.payload.userId, 'EMPLOYEE_DELETED', 'Employee', `Deleted employee: ${id}`, request);

    return NextResponse.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Delete employee error:', error);
    return serverErrorResponse('Failed to delete employee');
  }
}