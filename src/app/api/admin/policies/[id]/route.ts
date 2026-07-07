import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, badRequestResponse, notFoundResponse, serverErrorResponse } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(request, 'admin', 'hr');
    if (!auth.success) return auth.response;

    const { id } = await params;
    const body = await request.json();

    const policy = await db.policy.findUnique({ where: { id } });
    if (!policy) {
      return notFoundResponse('Policy');
    }

    const updated = await db.policy.update({
      where: { id },
      data: {
        title: body.title ?? policy.title,
        description: body.description !== undefined ? body.description : policy.description,
        content: body.content ?? policy.content,
        category: body.category ?? policy.category,
        departmentId: body.departmentId !== undefined ? body.departmentId : policy.departmentId,
        version: body.version ?? policy.version,
        isActive: body.isActive !== undefined ? body.isActive : policy.isActive,
      },
    });

    await logAudit(
      auth.payload.userId,
      'POLICY_UPDATED',
      'Policy',
      `Updated policy: ${id}`,
      request
    );

    return NextResponse.json({ policy: updated });
  } catch (error) {
    console.error('Update policy error:', error);
    return serverErrorResponse('Failed to update policy');
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

    const policy = await db.policy.findUnique({ where: { id } });
    if (!policy) {
      return notFoundResponse('Policy');
    }

    await db.policy.delete({ where: { id } });

    await logAudit(
      auth.payload.userId,
      'POLICY_DELETED',
      'Policy',
      `Deleted policy: ${policy.title}`,
      request
    );

    return NextResponse.json({ message: 'Policy deleted successfully' });
  } catch (error) {
    console.error('Delete policy error:', error);
    return serverErrorResponse('Failed to delete policy');
  }
}