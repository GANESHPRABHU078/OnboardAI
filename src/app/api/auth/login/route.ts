import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { comparePassword, generateToken, badRequestResponse, serverErrorResponse, unauthorizedResponse } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return badRequestResponse('Email and password are required');
    }

    const user = await db.user.findUnique({
      where: { email },
      include: { employee: true },
    });

    if (!user) {
      return unauthorizedResponse();
    }

    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      return unauthorizedResponse();
    }

    if (!user.isActive) {
      return badRequestResponse('Account is deactivated');
    }

    const token = await generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    await logAudit(user.id, 'USER_LOGIN', 'User', `User logged in: ${email}`, request);

    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      user: userWithoutPassword,
      token,
      role: user.role,
    });
  } catch (error) {
    console.error('Login error:', error);
    return serverErrorResponse('Login failed');
  }
}