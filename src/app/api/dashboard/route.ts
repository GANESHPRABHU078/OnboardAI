import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, unauthorizedResponse, serverErrorResponse } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const payload = await verifyToken(request);
    if (!payload) {
      return unauthorizedResponse();
    }

    const totalEmployees = await db.employee.count();
    const completedOnboarding = await db.employee.count({
      where: { status: 'completed' },
    });
    const pendingOnboarding = await db.employee.count({
      where: { status: { in: ['active', 'onboarding'] } },
    });

    const quizResults = await db.quizResult.findMany();
    const avgAssessmentScore =
      quizResults.length > 0
        ? Math.round(
            quizResults.reduce((sum, r) => sum + r.score, 0) / quizResults.length
          )
        : 0;

    const trainingPlans = await db.trainingPlan.count();
    const completedTrainingPlans = await db.trainingPlan.count({
      where: { status: 'completed' },
    });
    const trainingCompletion =
      trainingPlans > 0 ? Math.round((completedTrainingPlans / trainingPlans) * 100) : 0;

    const passedQuizzes = quizResults.filter((r) => r.passed).length;
    const complianceScore =
      quizResults.length > 0
        ? Math.round((passedQuizzes / quizResults.length) * 100)
        : 100;

    const recentActivities = await db.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const departmentStats = await db.department.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: { employees: true },
        },
      },
    });

    return NextResponse.json({
      totalEmployees,
      completedOnboarding,
      pendingOnboarding,
      complianceScore,
      avgAssessmentScore,
      trainingCompletion,
      departmentStats,
      recentActivities,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return serverErrorResponse('Failed to load dashboard data');
  }
}