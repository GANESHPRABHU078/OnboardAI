import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, serverErrorResponse } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(request, 'admin', 'hr');
    if (!auth.success) return auth.response;

    const totalEmployees = await db.employee.count();
    const employeesByStatus = await db.employee.groupBy({
      by: ['status'],
      _count: true,
    });

    const employeesByDepartment = await db.department.findMany({
      select: {
        name: true,
        _count: { select: { employees: true } },
      },
    });

    const employeesByExperience = await db.employee.groupBy({
      by: ['experience'],
      _count: true,
    });

    const totalTrainingPlans = await db.trainingPlan.count();
    const completedTrainingPlans = await db.trainingPlan.count({
      where: { status: 'completed' },
    });
    const activeTrainingPlans = await db.trainingPlan.count({
      where: { status: 'active' },
    });

    const totalAssessments = await db.assessment.count();
    const totalQuizResults = await db.quizResult.count();
    const passedQuizzes = await db.quizResult.count({ where: { passed: true } });

    const avgScore = await db.quizResult.aggregate({
      _avg: { score: true },
    });

    const assessmentScores = await db.assessment.findMany({
      select: {
        id: true,
        title: true,
        quizResults: {
          select: { score: true, passed: true },
        },
      },
    });

    const assessmentStats = assessmentScores.map((a) => {
      const scores = a.quizResults.map((r) => r.score);
      const avg = scores.length > 0 ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0;
      const passRate = a.quizResults.length > 0
        ? Math.round((a.quizResults.filter((r) => r.passed).length / a.quizResults.length) * 100)
        : 0;
      return {
        id: a.id,
        title: a.title,
        totalAttempts: a.quizResults.length,
        avgScore: avg,
        passRate,
      };
    });

    const totalCertificates = await db.certificate.count();
    const approvedCertificates = await db.certificate.count({ where: { status: 'approved' } });
    const pendingCertificates = await db.certificate.count({ where: { status: 'pending' } });

    const recentOnboardings = await db.employee.findMany({
      where: { status: { in: ['onboarding', 'completed'] } },
      include: {
        department: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const monthlyTrend = await db.employee.groupBy({
      by: ['joinDate'],
      where: {
        joinDate: {
          gte: new Date(new Date().setMonth(new Date().getMonth() - 6)),
        },
      },
      _count: true,
    });

    const policiesCount = await db.policy.count({ where: { isActive: true } });
    const handbooksCount = await db.handbook.count({ where: { isActive: true } });

    return NextResponse.json({
      overview: {
        totalEmployees,
        onboardingRate:
          totalEmployees > 0
            ? Math.round(
                (employeesByStatus.find((e) => e.status === 'completed')?._count || 0) / totalEmployees * 100
              )
            : 0,
        trainingCompletionRate:
          totalTrainingPlans > 0
            ? Math.round((completedTrainingPlans / totalTrainingPlans) * 100)
            : 0,
        assessmentPassRate:
          totalQuizResults > 0
            ? Math.round((passedQuizzes / totalQuizResults) * 100)
            : 0,
        avgAssessmentScore: Math.round(avgScore._avg.score || 0),
        certificateApprovalRate:
          totalCertificates > 0
            ? Math.round((approvedCertificates / totalCertificates) * 100)
            : 0,
      },
      employees: {
        byStatus: employeesByStatus.map((e) => ({
          status: e.status,
          count: e._count,
        })),
        byDepartment: employeesByDepartment.map((d) => ({
          department: d.name,
          count: d._count.employees,
        })),
        byExperience: employeesByExperience.map((e) => ({
          experience: e.experience,
          count: e._count,
        })),
      },
      training: {
        totalPlans: totalTrainingPlans,
        activePlans: activeTrainingPlans,
        completedPlans: completedTrainingPlans,
      },
      assessments: {
        total: totalAssessments,
        totalAttempts: totalQuizResults,
        passed: passedQuizzes,
        stats: assessmentStats,
      },
      certificates: {
        total: totalCertificates,
        approved: approvedCertificates,
        pending: pendingCertificates,
      },
      knowledgeBase: {
        policies: policiesCount,
        handbooks: handbooksCount,
      },
      recentOnboardings,
      monthlyTrend,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return serverErrorResponse('Failed to fetch analytics');
  }
}