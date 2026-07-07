import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, unauthorizedResponse, serverErrorResponse } from '@/lib/auth';
import { db } from '@/lib/db';

// ---------------------------------------------------------------------------
// Suggestion type
// ---------------------------------------------------------------------------
interface Suggestion {
  text: string;
  icon: string;
}

// ---------------------------------------------------------------------------
// Icon map for consistent icon assignment
// ---------------------------------------------------------------------------
const ICON_MAP: Record<string, string> = {
  progress: 'trending_up',
  training: 'book_open',
  next_task: 'compass',
  policy_security: 'shield',
  policy_hr: 'users',
  policy_it: 'monitor',
  policy_compliance: 'file_check',
  policy_engineering: 'code',
  assessment: 'clipboard_check',
  certificate: 'award',
  search: 'search',
  analytics: 'bar_chart_3',
  employees: 'users',
  department: 'building_2',
  report: 'file_bar_chart',
  document: 'file_text',
  general: 'message_circle',
};

// ---------------------------------------------------------------------------
// Employee suggestions (for regular employees)
// ---------------------------------------------------------------------------
const EMPLOYEE_SUGGESTIONS: Suggestion[] = [
  { text: "What's my onboarding progress?", icon: ICON_MAP.progress },
  { text: 'Show me my training plan', icon: ICON_MAP.training },
  { text: 'What should I do next?', icon: ICON_MAP.next_task },
  { text: 'Search security policies', icon: ICON_MAP.policy_security },
  { text: "How's my assessment score?", icon: ICON_MAP.assessment },
  { text: 'Check certificate eligibility', icon: ICON_MAP.certificate },
  { text: 'Search HR policies', icon: ICON_MAP.policy_hr },
  { text: 'Search IT policies', icon: ICON_MAP.policy_it },
];

// ---------------------------------------------------------------------------
// Admin/HR suggestions
// ---------------------------------------------------------------------------
const ADMIN_SUGGESTIONS: Suggestion[] = [
  { text: 'How many employees need onboarding?', icon: ICON_MAP.employees },
  { text: 'Show compliance report', icon: ICON_MAP.report },
  { text: 'Which departments need attention?', icon: ICON_MAP.department },
  { text: 'Show overall analytics', icon: ICON_MAP.analytics },
  { text: 'Search security policies', icon: ICON_MAP.policy_security },
  { text: 'Search compliance policies', icon: ICON_MAP.policy_compliance },
  { text: 'Search HR policies', icon: ICON_MAP.policy_hr },
  { text: 'Search engineering policies', icon: ICON_MAP.policy_engineering },
];

// ---------------------------------------------------------------------------
// Build contextual suggestions based on employee status and progress
// ---------------------------------------------------------------------------
function buildContextualSuggestions(
  employeeRole: string,
  employeeStatus?: string | null,
  progressPercent?: number,
  hasTrainingPlan?: boolean,
  hasCertificates?: boolean,
): Suggestion[] {
  const isAdmin = employeeRole === 'admin' || employeeRole === 'hr';
  const base = isAdmin ? ADMIN_SUGGESTIONS : EMPLOYEE_SUGGESTIONS;

  // If not an admin/HR and we have employee context, customize
  if (!isAdmin && employeeStatus) {
    const filtered = new Set<Suggestion>(base);

    // If onboarding is completed, remove "next task" and "progress" emphasis
    if (employeeStatus === 'completed') {
      const withoutNext = base.filter((s) => s.icon !== ICON_MAP.next_task);
      // Add certificate-related suggestions
      withoutNext.push({
        text: 'Check my certificates',
        icon: ICON_MAP.certificate,
      });
      return withoutNext.slice(0, 6);
    }

    // If onboarding hasn't started
    if (employeeStatus === 'active' && progressPercent === 0) {
      return base
        .filter((s) => s.icon === ICON_MAP.training || s.icon === ICON_MAP.next_task || s.icon === ICON_MAP.policy_security)
        .concat([
          { text: 'How do I start onboarding?', icon: ICON_MAP.general },
          { text: 'Show me my training plan', icon: ICON_MAP.training },
        ]);
    }

    // If progress is high (>75%), suggest certificate check
    if (progressPercent !== undefined && progressPercent >= 75) {
      filtered.add({ text: 'Check if I qualify for a certificate', icon: ICON_MAP.certificate });
    }

    // If no training plan, emphasize getting one
    if (!hasTrainingPlan) {
      filtered.add({ text: 'Generate my training plan', icon: ICON_MAP.training });
    }

    // If has certificates, show them
    if (hasCertificates) {
      filtered.add({ text: 'Show my certificates', icon: ICON_MAP.certificate });
    }

    return Array.from(filtered).slice(0, 6);
  }

  return base.slice(0, 6);
}

// ---------------------------------------------------------------------------
// GET /api/agent/suggestions
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    // 1. Verify auth
    const tokenPayload = await verifyToken(request);
    if (!tokenPayload) {
      return unauthorizedResponse();
    }

    // 2. Get user + employee data for contextual suggestions
    const user = await db.user.findUnique({
      where: { id: tokenPayload.userId },
      include: {
        employee: {
          include: {
            department: { select: { name: true } },
            _count: {
              select: {
                trainingPlans: { where: { status: 'active' } },
                certificates: true,
                progressRecords: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const employee = user.employee;
    const role = employee?.role || user.role;

    // Calculate progress
    let progressPercent = 0;
    if (employee) {
      const completedCount = await db.progressRecord.count({
        where: { employeeId: employee.id, status: 'completed' },
      });
      const totalCount = await db.progressRecord.count({
        where: { employeeId: employee.id },
      });
      progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    }

    const hasTrainingPlan = (employee?._count.trainingPlans ?? 0) > 0;
    const hasCertificates = (employee?._count.certificates ?? 0) > 0;

    // 3. Build contextual suggestions
    const suggestions = buildContextualSuggestions(
      role,
      employee?.status,
      progressPercent,
      hasTrainingPlan,
      hasCertificates,
    );

    return NextResponse.json({
      suggestions,
      context: {
        role,
        status: employee?.status || null,
        department: employee?.department?.name || null,
        progressPercent,
        hasTrainingPlan,
        hasCertificates,
      },
    });
  } catch (error) {
    console.error('Suggestions error:', error);
    return serverErrorResponse('Failed to generate suggestions');
  }
}