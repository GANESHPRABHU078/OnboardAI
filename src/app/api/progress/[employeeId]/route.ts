import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, notFoundResponse, serverErrorResponse } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const payload = await requireRole(request, 'admin', 'hr', 'employee');
    if (!payload.success) return payload.response;

    const { employeeId } = await params;

    if (payload.payload.role === 'employee') {
      const emp = await db.employee.findFirst({
        where: { userId: payload.payload.userId },
        select: { id: true },
      });
      if (!emp || emp.id !== employeeId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      include: {
        department: true,
        trainingPlans: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        progressRecords: {
          orderBy: { moduleIndex: 'asc' },
        },
        quizResults: {
          include: {
            assessment: {
              select: { id: true, title: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        certificates: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!employee) {
      return notFoundResponse('Employee');
    }

    const latestPlan = employee.trainingPlans[0];
    let modules: unknown[] = [];
    let completedModules = 0;
    let totalModules = 0;

    if (latestPlan) {
      try {
        modules = JSON.parse(latestPlan.modules);
        totalModules = modules.length;
      } catch {
        modules = [];
      }
    }

    const progressMap = new Map(
      employee.progressRecords.map((p) => [p.moduleTitle, p])
    );

    completedModules = employee.progressRecords.filter(
      (p) => p.status === 'completed'
    ).length;

    const overallProgress =
      totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

    const modulesWithProgress = modules.map((mod: Record<string, unknown>, idx: number) => {
      const progress = progressMap.get(mod.title as string);
      return {
        ...mod,
        index: idx,
        progress: progress
          ? {
              status: progress.status,
              score: progress.score,
              completedAt: progress.completedAt,
              notes: progress.notes,
            }
          : { status: 'pending', score: null, completedAt: null, notes: null },
      };
    });

    const avgQuizScore =
      employee.quizResults.length > 0
        ? Math.round(
            employee.quizResults.reduce((sum, r) => sum + r.score, 0) /
              employee.quizResults.length
          )
        : null;

    const passedAssessments = employee.quizResults.filter((r) => r.passed).length;

    return NextResponse.json({
      employee: {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        employeeId: employee.employeeId,
        position: employee.position,
        department: employee.department,
        status: employee.status,
        joinDate: employee.joinDate,
        onboardingStart: employee.onboardingStart,
        onboardingEnd: employee.onboardingEnd,
      },
      trainingPlan: latestPlan
        ? {
            id: latestPlan.id,
            title: latestPlan.title,
            duration: latestPlan.duration,
            status: latestPlan.status,
          }
        : null,
      progress: {
        completedModules,
        totalModules,
        overallProgress,
        avgQuizScore,
        totalAssessments: employee.quizResults.length,
        passedAssessments,
        totalCertificates: employee.certificates.length,
        approvedCertificates: employee.certificates.filter((c) => c.status === 'approved').length,
      },
      modules: modulesWithProgress,
      quizResults: employee.quizResults,
      certificates: employee.certificates,
    });
  } catch (error) {
    console.error('Get progress error:', error);
    return serverErrorResponse('Failed to fetch progress');
  }
}