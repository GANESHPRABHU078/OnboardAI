import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, notFoundResponse, serverErrorResponse } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await requireRole(request, 'admin', 'hr', 'employee');
    if (!payload.success) return payload.response;

    const { id } = await params;

    const certificate = await db.certificate.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            department: true,
          },
        },
      },
    });

    if (!certificate) {
      return notFoundResponse('Certificate');
    }

    return NextResponse.json({ certificate });
  } catch (error) {
    console.error('Get certificate error:', error);
    return serverErrorResponse('Failed to fetch certificate');
  }
}