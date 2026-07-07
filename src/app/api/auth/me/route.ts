import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, unauthorizedResponse, serverErrorResponse } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const payload = await verifyToken(request);
    if (!payload) {
      return unauthorizedResponse();
    }

    const user = await db.user.findUnique({
      where: { id: payload.userId },
      include: {
        employee: {
          include: {
            department: true,
            manager: {
              select: { id: true, firstName: true, lastName: true, employeeId: true },
            },
          },
        },
      },
    });

    if (!user) {
      return unauthorizedResponse();
    }

    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Get current user error:', error);
    return serverErrorResponse('Failed to fetch user');
  }
}