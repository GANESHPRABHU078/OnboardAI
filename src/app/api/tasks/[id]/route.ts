import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, unauthorizedResponse, serverErrorResponse } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await verifyToken(req);
    if (!payload) return unauthorizedResponse();

    const { id } = await params;
    const task = await db.task.findFirst({
      where: { id, userId: payload.userId },
      include: {
        assignee: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ task });
  } catch (error) {
    return serverErrorResponse(error);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await verifyToken(req);
    if (!payload) return unauthorizedResponse();

    const { id } = await params;
    const task = await db.task.findFirst({
      where: { id, userId: payload.userId },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const body = await req.json();
    const { title, description, type, priority, status, dueDate, assigneeId, tags } = body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) updateData.type = type;
    if (priority !== undefined) updateData.priority = priority;
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId;
    if (tags !== undefined) updateData.tags = JSON.stringify(tags);

    if (status !== undefined) {
      updateData.status = status;
      if (status === 'done') {
        updateData.completedAt = new Date();
      } else {
        updateData.completedAt = null;
      }
    }

    if (dueDate !== undefined) {
      updateData.dueDate = dueDate ? new Date(dueDate) : null;
    }

    const updated = await db.task.update({
      where: { id },
      data: updateData,
      include: {
        assignee: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    return NextResponse.json({ task: updated });
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
    const task = await db.task.findFirst({
      where: { id, userId: payload.userId },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    await db.task.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return serverErrorResponse(error);
  }
}