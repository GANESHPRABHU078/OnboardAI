import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, badRequestResponse, notFoundResponse, serverErrorResponse } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const payload = await requireRole(request, 'admin', 'hr', 'employee');
    if (!payload.success) return payload.response;

    const { employeeId } = await params;
    const body = await request.json();
    const { moduleTitle, moduleIndex, status, score, notes } = body;

    if (!moduleTitle || !moduleIndex || !status) {
      return badRequestResponse('moduleTitle, moduleIndex, and status are required');
    }

    const validStatuses = ['pending', 'in_progress', 'completed'];
    if (!validStatuses.includes(status)) {
      return badRequestResponse(`Status must be one of: ${validStatuses.join(', ')}`);
    }

    if (payload.payload.role === 'employee') {
      const emp = await db.employee.findFirst({
        where: { userId: payload.payload.userId },
        select: { id: true },
      });
      if (!emp || emp.id !== employeeId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const employee = await db.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      return notFoundResponse('Employee');
    }

    const existing = await db.progressRecord.findFirst({
      where: {
        employeeId,
        moduleTitle,
        moduleIndex,
      },
    });

    let progressRecord;

    if (existing) {
      progressRecord = await db.progressRecord.update({
        where: { id: existing.id },
        data: {
          status,
          score: score !== undefined ? score : existing.score,
          completedAt: status === 'completed' ? new Date() : existing.completedAt,
          notes: notes !== undefined ? notes : existing.notes,
        },
      });
    } else {
      progressRecord = await db.progressRecord.create({
        data: {
          employeeId,
          moduleTitle,
          moduleIndex,
          status,
          score: score || null,
          completedAt: status === 'completed' ? new Date() : null,
          notes: notes || null,
        },
      });
    }

    const allCompleted = await db.progressRecord.findMany({
      where: { employeeId },
    });
    const completedCount = allCompleted.filter((p) => p.status === 'completed').length;

    const latestPlan = await db.trainingPlan.findFirst({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
    });

    let totalModules = 0;
    if (latestPlan) {
      try {
        const modules = JSON.parse(latestPlan.modules);
        totalModules = modules.length;
      } catch {
        // ignore
      }
    }

    const overallProgress =
      totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0;

    if (overallProgress === 100 && latestPlan && latestPlan.status !== 'completed') {
      await db.trainingPlan.update({
        where: { id: latestPlan.id },
        data: { status: 'completed', completedAt: new Date() },
      });

      await db.employee.update({
        where: { id: employeeId },
        data: { status: 'completed', onboardingEnd: new Date() },
      });
    }

    await logAudit(
      payload.payload.userId,
      'PROGRESS_UPDATED',
      'ProgressRecord',
      `Updated progress for ${moduleTitle}: ${status}`,
      request
    );

    return NextResponse.json({
      progressRecord,
      overallProgress,
      completedModules: completedCount,
      totalModules,
    });
  } catch (error) {
    console.error('Update progress error:', error);
    return serverErrorResponse('Failed to update progress');
  }
}