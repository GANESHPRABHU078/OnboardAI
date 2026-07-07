import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, badRequestResponse, notFoundResponse, serverErrorResponse } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(request, 'admin');
    if (!auth.success) return auth.response;

    const { id } = await params;
    const body = await request.json();

    const department = await db.department.findUnique({ where: { id } });
    if (!department) {
      return notFoundResponse('Department');
    }

    if (body.name && body.name !== department.name) {
      const existing = await db.department.findUnique({ where: { name: body.name } });
      if (existing) {
        return badRequestResponse('Department with this name already exists');
      }
    }

    const updated = await db.department.update({
      where: { id },
      data: {
        name: body.name ?? department.name,
        description: body.description !== undefined ? body.description : department.description,
        headName: body.headName !== undefined ? body.headName : department.headName,
        isActive: body.isActive !== undefined ? body.isActive : department.isActive,
      },
    });

    await logAudit(
      auth.payload.userId,
      'DEPARTMENT_UPDATED',
      'Department',
      `Updated department: ${id}`,
      request
    );

    return NextResponse.json({ department: updated });
  } catch (error) {
    console.error('Update department error:', error);
    return serverErrorResponse('Failed to update department');
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

    const department = await db.department.findUnique({
      where: { id },
      include: { _count: { select: { employees: true } } },
    });

    if (!department) {
      return notFoundResponse('Department');
    }

    if (department._count.employees > 0) {
      return badRequestResponse(
        `Cannot delete department with ${department._count.employees} employees. Reassign employees first.`
      );
    }

    await db.department.delete({ where: { id } });

    await logAudit(
      auth.payload.userId,
      'DEPARTMENT_DELETED',
      'Department',
      `Deleted department: ${department.name}`,
      request
    );

    return NextResponse.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Delete department error:', error);
    return serverErrorResponse('Failed to delete department');
  }
}