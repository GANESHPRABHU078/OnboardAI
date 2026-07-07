import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

export async function logAudit(
  userId: string | undefined,
  action: string,
  resource: string,
  details?: string,
  request?: NextRequest
): Promise<void> {
  try {
    const ipAddress = request?.headers.get('x-forwarded-for') || request?.headers.get('x-real-ip') || null;
    const userAgent = request?.headers.get('user-agent') || null;

    await db.auditLog.create({
      data: {
        userId: userId || null,
        action,
        resource,
        details: details || null,
        ipAddress,
        userAgent,
      },
    });
  } catch {
    // Audit logging should not break the main flow
  }
}