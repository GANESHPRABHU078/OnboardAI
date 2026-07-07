import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, notFoundResponse, serverErrorResponse } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(request, 'admin', 'hr', 'employee');
    if (!auth.success) return auth.response;

    const { id } = await params;

    const employee = await db.employee.findUnique({
      where: { id },
      include: {
        department: true,
        trainingPlans: {
          orderBy: { createdAt: 'desc' },
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

    const trainingPlan = employee.trainingPlans[0] || null;

    const modules = trainingPlan ? JSON.parse(trainingPlan.modules) : [];
    const milestones = trainingPlan ? JSON.parse(trainingPlan.milestones) : [];
    const objectives = trainingPlan ? JSON.parse(trainingPlan.objectives) : [];
    const requiredReading = trainingPlan ? JSON.parse(trainingPlan.requiredReading) : [];
    const handsOnTasks = trainingPlan ? JSON.parse(trainingPlan.handsOnTasks) : [];
    const deliverables = trainingPlan ? JSON.parse(trainingPlan.deliverables) : [];

    const progressMap = new Map(
      employee.progressRecords.map((p) => [p.moduleTitle, p])
    );

    const modulesWithProgress = modules.map((mod: Record<string, unknown>, idx: number) => {
      const progress = progressMap.get(mod.title as string);
      return {
        ...mod,
        index: idx,
        progress: progress
          ? { status: progress.status, score: progress.score, completedAt: progress.completedAt }
          : { status: 'pending', score: null, completedAt: null },
      };
    });

    const completedModules = employee.progressRecords.filter(
      (p) => p.status === 'completed'
    ).length;
    const totalModules = modules.length;
    const overallProgress =
      totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

    const avgScore =
      employee.quizResults.length > 0
        ? Math.round(
            employee.quizResults.reduce((sum, r) => sum + r.score, 0) /
              employee.quizResults.length
          )
        : null;

    return NextResponse.json({
      employee: {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        employeeId: employee.employeeId,
        position: employee.position,
        department: employee.department,
        status: employee.status,
        joinDate: employee.joinDate,
        onboardingStart: employee.onboardingStart,
        onboardingEnd: employee.onboardingEnd,
      },
      onboardingPlan: trainingPlan
        ? {
            id: trainingPlan.id,
            title: trainingPlan.title,
            role: trainingPlan.role,
            department: trainingPlan.department,
            experience: trainingPlan.experience,
            duration: trainingPlan.duration,
            status: trainingPlan.status,
            objectives,
            modules: modulesWithProgress,
            milestones,
            requiredReading,
            handsOnTasks,
            deliverables,
          }
        : null,
      progress: {
        completedModules,
        totalModules,
        overallProgress,
        avgScore,
        assessments: employee.quizResults.length,
        certificates: employee.certificates.length,
        passedAssessments: employee.quizResults.filter((r) => r.passed).length,
      },
    });
  } catch (error) {
    console.error('Get onboarding error:', error);
    return serverErrorResponse('Failed to fetch onboarding plan');
  }
}