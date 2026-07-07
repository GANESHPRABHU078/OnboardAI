import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, unauthorizedResponse, serverErrorResponse } from '@/lib/auth';
import { db } from '@/lib/db';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await verifyToken(req);
    if (!payload) return unauthorizedResponse();

    const { id } = await params;
    const notification = await db.notification.findFirst({
      where: { id, userId: payload.userId },
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    const updated = await db.notification.update({
      where: { id },
      data: { isRead: true, updatedAt: new Date() },
    });

    return NextResponse.json({ notification: updated });
  } catch (error) {
    return serverErrorResponse(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await verifyToken(req);
    if (!payload) return unauthorizedResponse();

    const { id } = await params;
    const notification = await db.notification.findFirst({
      where: { id, userId: payload.userId },
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    await db.notification.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return serverErrorResponse(error);
  }
}