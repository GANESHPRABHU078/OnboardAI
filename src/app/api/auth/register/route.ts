import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, generateToken, badRequestResponse, serverErrorResponse } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, role } = body;

    if (!email || !password || !name) {
      return badRequestResponse('Email, password, and name are required');
    }

    if (password.length < 6) {
      return badRequestResponse('Password must be at least 6 characters');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return badRequestResponse('Invalid email format');
    }

    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return badRequestResponse('Email already registered');
    }

    const validRoles = ['admin', 'hr', 'employee'];
    const userRole = role && validRoles.includes(role) ? role : 'employee';

    const hashedPassword = await hashPassword(password);

    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: userRole,
      },
    });

    const employeeCount = await db.employee.count();
    const employeeIdNum = (employeeCount + 1).toString().padStart(3, '0');
    const nameParts = name.split(' ');
    const firstName = nameParts[0] || name;
    const lastName = nameParts.slice(1).join(' ') || '';

    const employee = await db.employee.create({
      data: {
        userId: user.id,
        employeeId: `EMP-${employeeIdNum}`,
        firstName,
        lastName,
        email,
        position: 'New Hire',
        role: userRole,
      },
    });

    await logAudit(user.id, 'USER_REGISTERED', 'User', `New user registered: ${email}`);

    const token = await generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(
      {
        user: { ...userWithoutPassword, employee },
        token,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return serverErrorResponse('Registration failed');
  }
}