import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, unauthorizedResponse, serverErrorResponse } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const payload = await verifyToken(req);
    if (!payload) return unauthorizedResponse();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || '';
    const priority = searchParams.get('priority') || '';
    const type = searchParams.get('type') || '';

    const where: Record<string, unknown> = { userId: payload.userId };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (type) where.type = type;

    const [tasks, total] = await Promise.all([
      db.task.findMany({
        where,
        orderBy: [
          { priority: 'desc' },
          { dueDate: 'asc' },
          { createdAt: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          assignee: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
      db.task.count({ where }),
    ]);

    const stats = await db.task.groupBy({
      by: ['status'],
      where: { userId: payload.userId },
      _count: true,
    });

    const statsMap: Record<string, number> = {};
    for (const s of stats) statsMap[s.status] = s._count;

    return NextResponse.json({
      tasks,
      stats: {
        todo: statsMap['todo'] || 0,
        in_progress: statsMap['in_progress'] || 0,
        review: statsMap['review'] || 0,
        done: statsMap['done'] || 0,
        total,
      },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return serverErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await verifyToken(req);
    if (!payload) return unauthorizedResponse();

    const body = await req.json();
    const { title, description, type, priority, status, dueDate, assigneeId, tags } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const task = await db.task.create({
      data: {
        userId: payload.userId,
        assigneeId: assigneeId || null,
        title,
        description: description || null,
        type: type || 'onboarding',
        priority: priority || 'medium',
        status: status || 'todo',
        dueDate: dueDate ? new Date(dueDate) : null,
        tags: tags ? JSON.stringify(tags) : '[]',
      },
      include: {
        assignee: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return serverErrorResponse(error);
  }
}