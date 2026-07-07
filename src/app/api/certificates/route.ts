import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, serverErrorResponse } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const payload = await requireRole(request, 'admin', 'hr', 'employee');
    if (!payload.success) return payload.response;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const employeeId = searchParams.get('employeeId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (employeeId) {
      where.employeeId = employeeId;
    } else if (payload.payload.role === 'employee') {
      const emp = await db.employee.findFirst({
        where: { userId: payload.payload.userId },
        select: { id: true },
      });
      if (emp) where.employeeId = emp.id;
    }

    const [certificates, total] = await Promise.all([
      db.certificate.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              employeeId: true,
              department: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.certificate.count({ where }),
    ]);

    return NextResponse.json({
      certificates,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get certificates error:', error);
    return serverErrorResponse('Failed to fetch certificates');
  }
}