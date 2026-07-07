import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, unauthorizedResponse, serverErrorResponse } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const payload = await verifyToken(req);
    if (!payload) return unauthorizedResponse();

    await db.notification.updateMany({
      where: { userId: payload.userId, isRead: false },
      data: { isRead: true, updatedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return serverErrorResponse(error);
  }
}