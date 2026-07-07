import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, unauthorizedResponse, serverErrorResponse } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const payload = await verifyToken(req);
    if (!payload) return unauthorizedResponse();

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const [
      totalEmployees,
      activeEmployees,
      onboardingEmployees,
      completedEmployees,
      totalDepartments,
      totalAssessments,
      totalQuizResults,
      passedQuizResults,
      totalCertificates,
      approvedCertificates,
      pendingCertificates,
    ] = await Promise.all([
      db.employee.count(),
      db.employee.count({ where: { status: 'active' } }),
      db.employee.count({ where: { status: 'onboarding' } }),
      db.employee.count({ where: { status: 'completed' } }),
      db.department.count({ where: { isActive: true } }),
      db.assessment.count({ where: { isActive: true } }),
      db.quizResult.count(),
      db.quizResult.count({ where: { passed: true } }),
      db.certificate.count(),
      db.certificate.count({ where: { status: 'approved' } }),
      db.certificate.count({ where: { status: 'pending' } }),
    ]);

    // Department distribution
    const departments = await db.department.findMany({
      where: { isActive: true },
      include: { _count: { select: { employees: true } } },
      orderBy: { name: 'asc' },
    });

    const departmentDistribution = departments.map((d) => ({
      name: d.name,
      count: d._count.employees,
    }));

    // Onboarding status distribution
    const onboardingStatusDist = [
      { name: 'Active', value: activeEmployees, color: 'oklch(0.55 0.2 270)' },
      { name: 'Onboarding', value: onboardingEmployees, color: 'oklch(0.65 0.18 160)' },
      { name: 'Completed', value: completedEmployees, color: 'oklch(0.7 0.15 45)' },
    ].filter((d) => d.value > 0);

    // Assessment pass rate over time (last 30 days)
    const recentQuizzes = await db.quizResult.findMany({
      where: { completedAt: { gte: thirtyDaysAgo } },
      select: { score: true, passed: true, completedAt: true },
      orderBy: { completedAt: 'asc' },
    });

    const quizTrend: { date: string; avgScore: number; passRate: number; count: number }[] = [];
    const quizByDate: Record<string, number[]> = {};
    const passByDate: Record<string, boolean[]> = {};

    for (const q of recentQuizzes) {
      if (!q.completedAt) continue;
      const dateKey = q.completedAt.toISOString().split('T')[0];
      if (!quizByDate[dateKey]) { quizByDate[dateKey] = []; passByDate[dateKey] = []; }
      quizByDate[dateKey].push(q.score);
      passByDate[dateKey].push(q.passed);
    }

    for (const [date, scores] of Object.entries(quizByDate)) {
      const passes = passByDate[date];
      quizTrend.push({
        date,
        avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        passRate: Math.round((passes.filter(Boolean).length / passes.length) * 100),
        count: scores.length,
      });
    }

    // Training plan completion rates by department
    const trainingPlans = await db.trainingPlan.findMany({
      include: {
        employee: {
          select: { department: { select: { name: true } } },
        },
      },
    });

    const deptTraining: Record<string, { total: number; completed: number }> = {};
    for (const tp of trainingPlans) {
      const deptName = tp.employee?.department?.name || 'Unassigned';
      if (!deptTraining[deptName]) deptTraining[deptName] = { total: 0, completed: 0 };
      deptTraining[deptName].total++;
      if (tp.status === 'completed') deptTraining[deptName].completed++;
    }

    const trainingByDepartment = Object.entries(deptTraining).map(([name, data]) => ({
      name,
      total: data.total,
      completed: data.completed,
      rate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
    }));

    // Employee experience distribution
    const experienceDist = await db.employee.groupBy({
      by: ['experience'],
      _count: true,
    });

    const experienceDistribution = experienceDist.map((e) => ({
      name: e.experience.charAt(0).toUpperCase() + e.experience.slice(1),
      value: e._count,
    }));

    // Monthly new employees (last 6 months)
    const monthlyEmployees: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const count = await db.employee.count({
        where: { joinDate: { gte: start, lt: end } },
      });
      monthlyEmployees.push({
        month: start.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        count,
      });
    }

    // Recent activity timeline (last 20)
    const recentActivity = await db.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        user: { select: { name: true, email: true, role: true } },
      },
    });

    const activityTimeline = recentActivity.map((a) => ({
      id: a.id,
      action: a.action,
      resource: a.resource,
      details: a.details,
      user: a.user ? { name: a.user.name, email: a.user.email, role: a.user.role } : null,
      createdAt: a.createdAt,
    }));

    // Top performers (highest avg quiz scores with at least 2 quizzes)
    const employeeScores = await db.quizResult.groupBy({
      by: ['employeeId'],
      where: { completedAt: { gte: ninetyDaysAgo } },
      _count: { id: true },
      _avg: { score: true },
      having: { score: { _count: { gte: 2 } } },
      orderBy: { _avg: { score: 'desc' } },
      take: 5,
    });

    const topPerformers = await Promise.all(
      employeeScores.map(async (es) => {
        const emp = await db.employee.findUnique({
          where: { id: es.employeeId },
          select: { id: true, firstName: true, lastName: true, position: true, department: { select: { name: true } } },
        });
        return {
          name: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
          position: emp?.position || '',
          department: emp?.department?.name || '',
          avgScore: Math.round(es._avg.score || 0),
          quizCount: es._count.id,
        };
      })
    );

    return NextResponse.json({
      overview: {
        totalEmployees,
        activeEmployees,
        onboardingEmployees,
        completedEmployees,
        totalDepartments,
        totalAssessments,
        avgPassRate: totalQuizResults > 0 ? Math.round((passedQuizResults / totalQuizResults) * 100) : 0,
        certificateApprovalRate: totalCertificates > 0 ? Math.round((approvedCertificates / totalCertificates) * 100) : 0,
        pendingCertificates,
      },
      departmentDistribution,
      onboardingStatusDist,
      quizTrend,
      trainingByDepartment,
      experienceDistribution,
      monthlyEmployees,
      activityTimeline,
      topPerformers,
    });
  } catch (error) {
    return serverErrorResponse(error);
  }
}