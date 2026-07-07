import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, serverErrorResponse } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(request, 'admin');
    if (!auth.success) return auth.response;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const resource = searchParams.get('resource');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (resource) where.resource = resource;

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.auditLog.count({ where }),
    ]);

    const actions = await db.auditLog.groupBy({
      by: ['action'],
      _count: true,
      orderBy: { _count: { action: 'desc' } },
      take: 20,
    });

    const resources = await db.auditLog.groupBy({
      by: ['resource'],
      _count: true,
      orderBy: { _count: { resource: 'desc' } },
      take: 20,
    });

    return NextResponse.json({
      logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      summary: {
        totalActions: actions.reduce((sum, a) => sum + a._count, 0),
        uniqueActions: actions.length,
        actions: actions.map((a) => ({ action: a.action, count: a._count })),
        resources: resources.map((r) => ({ resource: r.resource, count: r._count })),
      },
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    return serverErrorResponse('Failed to fetch audit logs');
  }
}