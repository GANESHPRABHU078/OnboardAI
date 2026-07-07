import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, badRequestResponse, serverErrorResponse } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    const payload = await requireRole(request, 'admin', 'hr');
    if (!payload.success) return payload.response;

    const departments = await db.department.findMany({
      include: {
        _count: {
          select: { employees: true, policies: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ departments });
  } catch (error) {
    console.error('Get departments error:', error);
    return serverErrorResponse('Failed to fetch departments');
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, 'admin');
    if (!auth.success) return auth.response;

    const body = await request.json();
    const { name, description, headName } = body;

    if (!name) {
      return badRequestResponse('Department name is required');
    }

    const existing = await db.department.findUnique({ where: { name } });
    if (existing) {
      return badRequestResponse('Department with this name already exists');
    }

    const department = await db.department.create({
      data: {
        name,
        description: description || null,
        headName: headName || null,
      },
    });

    await logAudit(
      auth.payload.userId,
      'DEPARTMENT_CREATED',
      'Department',
      `Created department: ${name}`,
      request
    );

    return NextResponse.json({ department }, { status: 201 });
  } catch (error) {
    console.error('Create department error:', error);
    return serverErrorResponse('Failed to create department');
  }
}