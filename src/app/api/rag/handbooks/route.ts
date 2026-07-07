import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, notFoundResponse, serverErrorResponse } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { unlink } from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const payload = await requireRole(request, 'admin', 'hr', 'employee');
    if (!payload.success) return payload.response;

    const handbooks = await db.handbook.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { embeddings: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ handbooks });
  } catch (error) {
    console.error('List handbooks error:', error);
    return serverErrorResponse('Failed to fetch handbooks');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireRole(request, 'admin');
    if (!auth.success) return auth.response;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Handbook ID is required' }, { status: 400 });
    }

    const handbook = await db.handbook.findUnique({ where: { id } });
    if (!handbook) {
      return notFoundResponse('Handbook');
    }

    try {
      const filePath = path.join(process.cwd(), handbook.fileUrl);
      await unlink(filePath).catch(() => {});
    } catch {
      // File may not exist
    }

    await db.handbook.delete({ where: { id } });

    await logAudit(
      auth.payload.userId,
      'HANDBOOK_DELETED',
      'Handbook',
      `Deleted handbook: ${handbook.title}`,
      request
    );

    return NextResponse.json({ message: 'Handbook deleted successfully' });
  } catch (error) {
    console.error('Delete handbook error:', error);
    return serverErrorResponse('Failed to delete handbook');
  }
}