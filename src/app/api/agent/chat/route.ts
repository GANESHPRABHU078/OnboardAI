import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, unauthorizedResponse, serverErrorResponse } from '@/lib/auth';
import { db } from '@/lib/db';
import { getZAI, callLLM } from '@/lib/zai';
import {
  getOrCreateConversation,
  addConversationMessage,
  buildMessageHistory,
  type ToolResult,
} from '@/lib/agent-store';

// ---------------------------------------------------------------------------
// Helper: cosine similarity for RAG search
// ---------------------------------------------------------------------------
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

function generateQueryEmbedding(query: string): number[] {
  const embedding: number[] = [];
  const words = query.toLowerCase().split(/\s+/);
  const wordSet = new Set(words);
  for (let i = 0; i < 128; i++) {
    const word = words[i % words.length] || '';
    const charCodes = [...word].map((c) => c.charCodeAt(0));
    const base = wordSet.has(word) ? 0.6 : 0.1;
    const variation = charCodes.reduce((sum, code) => sum + (code % 100) / 400, 0);
    embedding.push(Math.min(1, Math.max(-1, base + (i % 2 === 0 ? variation : -variation))));
  }
  return embedding;
}

// ---------------------------------------------------------------------------
// Tool types
// ---------------------------------------------------------------------------
interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
}

type ToolExecutor = (
  employeeId: string,
  userId: string,
  args: Record<string, unknown>,
) => Promise<string>;

// ---------------------------------------------------------------------------
// Tool: get_progress
// ---------------------------------------------------------------------------
const getProgress: ToolExecutor = async (employeeId) => {
  const records = await db.progressRecord.findMany({
    where: { employeeId },
    orderBy: { moduleIndex: 'asc' },
  });

  if (records.length === 0) {
    return 'No progress records found for this employee.';
  }

  const total = records.length;
  const completed = records.filter((r) => r.status === 'completed').length;
  const inProgress = records.filter((r) => r.status === 'in_progress').length;
  const pending = records.filter((r) => r.status === 'pending').length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const modules = records.map((r) => ({
    module: r.moduleTitle,
    index: r.moduleIndex,
    status: r.status,
    score: r.score,
    completedAt: r.completedAt,
  }));

  return JSON.stringify({
    summary: { total, completed, inProgress, pending, percent },
    modules,
  });
};

// ---------------------------------------------------------------------------
// Tool: search_documents
// ---------------------------------------------------------------------------
const searchDocuments: ToolExecutor = async (employeeId, _userId, args) => {
  const query = (args.query as string) || '';
  if (!query.trim()) return 'No query provided for document search.';

  const embeddings = await db.embedding.findMany({
    where: { handbook: { isActive: true } },
    include: { handbook: { select: { id: true, title: true, fileName: true } } },
    orderBy: { chunkIndex: 'asc' },
  });

  if (embeddings.length === 0) {
    return 'No documents available in the knowledge base.';
  }

  const queryEmbedding = generateQueryEmbedding(query);
  const scored = embeddings.map((emb) => {
    const embVector = JSON.parse(emb.embedding) as number[];
    const score = cosineSimilarity(queryEmbedding, embVector);
    return { content: emb.content, chunkIndex: emb.chunkIndex, score, handbook: emb.handbook };
  });

  scored.sort((a, b) => b.score - a.score);
  const topResults = scored.slice(0, 5);

  const results = topResults.map((r) => ({
    content: r.content,
    handbook: r.handbook.title,
    relevance: Math.round(r.score * 100) / 100,
  }));

  return JSON.stringify({ query, results });
};

// ---------------------------------------------------------------------------
// Tool: get_training_plan
// ---------------------------------------------------------------------------
const getTrainingPlan: ToolExecutor = async (employeeId) => {
  const plan = await db.trainingPlan.findFirst({
    where: { employeeId, status: 'active' },
    orderBy: { createdAt: 'desc' },
  });

  if (!plan) {
    return 'No active training plan found for this employee.';
  }

  return JSON.stringify({
    id: plan.id,
    title: plan.title,
    role: plan.role,
    department: plan.department,
    experience: plan.experience,
    duration: plan.duration,
    status: plan.status,
    objectives: JSON.parse(plan.objectives),
    modules: JSON.parse(plan.modules),
    milestones: JSON.parse(plan.milestones),
    deliverables: JSON.parse(plan.deliverables),
    handsOnTasks: JSON.parse(plan.handsOnTasks),
    requiredReading: JSON.parse(plan.requiredReading),
    generatedAt: plan.generatedAt,
    completedAt: plan.completedAt,
  });
};

// ---------------------------------------------------------------------------
// Tool: get_assessment_results
// ---------------------------------------------------------------------------
const getAssessmentResults: ToolExecutor = async (employeeId) => {
  const results = await db.quizResult.findMany({
    where: { employeeId },
    include: {
      assessment: {
        select: { id: true, title: true, difficulty: true, passingScore: true },
      },
    },
    orderBy: { startedAt: 'desc' },
  });

  if (results.length === 0) {
    return 'No assessment results found for this employee.';
  }

  const totalTaken = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = totalTaken - passed;
  const avgScore = Math.round(results.reduce((sum, r) => sum + r.score, 0) / totalTaken);

  const assessments = results.map((r) => ({
    assessment: r.assessment.title,
    difficulty: r.assessment.difficulty,
    score: r.score,
    passingScore: r.assessment.passingScore,
    correct: r.correctAnswers,
    total: r.totalQuestions,
    passed: r.passed,
    timeTaken: r.timeTaken ? `${Math.round(r.timeTaken / 60)}m ${r.timeTaken % 60}s` : 'N/A',
    completedAt: r.completedAt,
  }));

  return JSON.stringify({ summary: { totalTaken, passed, failed, avgScore }, assessments });
};

// ---------------------------------------------------------------------------
// Tool: get_policies
// ---------------------------------------------------------------------------
const getPolicies: ToolExecutor = async (employeeId, userId, args) => {
  const category = (args.category as string) || '';
  const query = (args.query as string) || '';

  const where: Record<string, unknown> = { isActive: true };

  if (category && category !== 'all') {
    where.category = category;
  }

  const policies = await db.policy.findMany({
    where,
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      version: true,
      department: { select: { name: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  if (policies.length === 0) {
    return category
      ? `No policies found for category "${category}".`
      : 'No policies found.';
  }

  let filtered = policies;
  if (query.trim()) {
    const lowerQuery = query.toLowerCase();
    filtered = policies.filter(
      (p) =>
        p.title.toLowerCase().includes(lowerQuery) ||
        (p.description && p.description.toLowerCase().includes(lowerQuery)),
    );
  }

  const results = filtered.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    category: p.category,
    version: p.version,
    department: p.department?.name || 'All Departments',
  }));

  return JSON.stringify({ count: results.length, policies: results });
};

// ---------------------------------------------------------------------------
// Tool: get_next_task
// ---------------------------------------------------------------------------
const getNextTask: ToolExecutor = async (employeeId) => {
  const records = await db.progressRecord.findMany({
    where: { employeeId },
    orderBy: { moduleIndex: 'asc' },
  });

  if (records.length === 0) {
    return 'No onboarding progress found. The employee may not have started onboarding yet.';
  }

  const nextModule = records.find((r) => r.status !== 'completed');

  if (!nextModule) {
    return 'All onboarding modules have been completed! The employee has finished their onboarding program.';
  }

  const completedCount = records.filter((r) => r.status === 'completed').length;
  const totalCount = records.length;

  return JSON.stringify({
    nextModule: {
      title: nextModule.moduleTitle,
      index: nextModule.moduleIndex,
      status: nextModule.status,
    },
    progress: `${completedCount}/${totalCount} modules completed`,
    recommendation:
      nextModule.status === 'pending'
        ? `Start "${nextModule.moduleTitle}" — it's the next pending module.`
        : `Continue working on "${nextModule.moduleTitle}" — it's currently in progress.`,
  });
};

// ---------------------------------------------------------------------------
// Tool: generate_certificate_check
// ---------------------------------------------------------------------------
const generateCertificateCheck: ToolExecutor = async (employeeId) => {
  const certificates = await db.certificate.findMany({
    where: { employeeId },
    include: {
      employee: {
        select: {
          firstName: true,
          lastName: true,
          position: true,
          department: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const progressRecords = await db.progressRecord.findMany({
    where: { employeeId, status: 'completed' },
  });

  const quizResults = await db.quizResult.findMany({
    where: { employeeId, passed: true },
  });

  const totalModules = await db.progressRecord.count({ where: { employeeId } });
  const completedModules = progressRecords.length;
  const allModulesCompleted = totalModules > 0 && completedModules === totalModules;

  const hasPassedAssessments = quizResults.length > 0;
  const existingCertificates = certificates.filter((c) => c.status === 'approved');

  let qualifies = false;
  let reason = '';

  if (existingCertificates.length > 0) {
    reason = `Employee already has ${existingCertificates.length} approved certificate(s).`;
    qualifies = false;
  } else if (allModulesCompleted && hasPassedAssessments) {
    qualifies = true;
    reason =
      'Employee has completed all modules and passed all assessments. Ready for certification!';
  } else if (allModulesCompleted && !hasPassedAssessments) {
    qualifies = false;
    reason =
      'All modules are completed, but the employee has not yet passed all required assessments.';
  } else {
    const remaining = totalModules - completedModules;
    qualifies = false;
    reason = `Employee has ${remaining} remaining module(s) to complete before qualifying for a certificate.`;
  }

  const certificatesList = certificates.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    status: c.status,
    issuedAt: c.issuedAt,
    approvedAt: c.approvedAt,
  }));

  return JSON.stringify({
    qualifies,
    reason,
    progress: {
      modulesCompleted: completedModules,
      totalModules,
      assessmentsPassed: quizResults.length,
      allModulesCompleted,
    },
    existingCertificates: certificatesList,
  });
};

// ---------------------------------------------------------------------------
// Tool: get_onboarding_stats
// ---------------------------------------------------------------------------
const getOnboardingStats: ToolExecutor = async (employeeId, userId) => {
  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== 'admin' && user?.role !== 'hr') {
    return 'Error: You do not have permission to view onboarding statistics.';
  }

  const employees = await db.employee.findMany({
    select: {
      status: true,
      department: { select: { name: true } },
    },
  });

  const stats = {
    total: employees.length,
    onboarding: employees.filter((e) => e.status === 'onboarding').length,
    active: employees.filter((e) => e.status === 'active').length,
    completed: employees.filter((e) => e.status === 'completed').length,
    inactive: employees.filter((e) => e.status === 'inactive').length,
  };

  const deptMap: Record<string, { total: number; onboarding: number }> = {};
  for (const e of employees) {
    const deptName = e.department?.name || 'Unassigned';
    if (!deptMap[deptName]) {
      deptMap[deptName] = { total: 0, onboarding: 0 };
    }
    deptMap[deptName].total++;
    if (e.status === 'onboarding') {
      deptMap[deptName].onboarding++;
    }
  }

  return JSON.stringify({
    summary: stats,
    departments: deptMap,
  });
};

// ---------------------------------------------------------------------------
// Tool: get_compliance_report
// ---------------------------------------------------------------------------
const getComplianceReport: ToolExecutor = async (employeeId, userId) => {
  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== 'admin' && user?.role !== 'hr') {
    return 'Error: You do not have permission to view compliance reports.';
  }

  const employees = await db.employee.findMany({
    where: { status: 'onboarding' },
    include: {
      progressRecords: true,
      quizResults: true,
      department: { select: { name: true } },
    },
  });

  if (employees.length === 0) {
    return JSON.stringify({
      message: 'No employees are currently in the onboarding process.',
      complianceRate: 100,
      details: [],
    });
  }

  const details = employees.map((e) => {
    const totalModules = e.progressRecords.length;
    const completedModules = e.progressRecords.filter((r) => r.status === 'completed').length;
    const completionPercent = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

    const quizCount = e.quizResults.length;
    const avgQuizScore = quizCount > 0 
      ? Math.round(e.quizResults.reduce((sum, q) => sum + q.score, 0) / quizCount) 
      : null;

    return {
      employeeName: `${e.firstName} ${e.lastName}`,
      department: e.department?.name || 'Unassigned',
      completionPercent,
      avgQuizScore,
      status: e.status,
    };
  });

  const totalCompletionPercent = details.reduce((sum, d) => sum + d.completionPercent, 0);
  const overallComplianceRate = Math.round(totalCompletionPercent / employees.length);

  return JSON.stringify({
    overallComplianceRate,
    onboardingCount: employees.length,
    employeeDetails: details,
  });
};

// ---------------------------------------------------------------------------
// Tool: get_departments_attention
// ---------------------------------------------------------------------------
const getDepartmentsAttention: ToolExecutor = async (employeeId, userId) => {
  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== 'admin' && user?.role !== 'hr') {
    return 'Error: You do not have permission to view department attention reports.';
  }

  const departments = await db.department.findMany({
    where: { isActive: true },
    include: {
      employees: {
        include: {
          progressRecords: true,
          quizResults: true,
        },
      },
    },
  });

  const report = departments.map((d) => {
    const onboardingEmployees = d.employees.filter((e) => e.status === 'onboarding');
    const totalOnboarding = onboardingEmployees.length;

    if (totalOnboarding === 0) {
      return {
        department: d.name,
        needsAttention: false,
        reason: 'No employees currently onboarding.',
        onboardingCount: 0,
        avgCompletion: 100,
      };
    }

    let totalModules = 0;
    let completedModules = 0;
    let totalScore = 0;
    let quizCount = 0;

    for (const e of onboardingEmployees) {
      totalModules += e.progressRecords.length;
      completedModules += e.progressRecords.filter((r) => r.status === 'completed').length;
      
      for (const q of e.quizResults) {
        totalScore += q.score;
        quizCount++;
      }
    }

    const avgCompletion = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;
    const avgQuizScore = quizCount > 0 ? Math.round(totalScore / quizCount) : null;

    const lowCompletion = avgCompletion < 50;
    const lowQuiz = avgQuizScore !== null && avgQuizScore < 70;
    const needsAttention = lowCompletion || lowQuiz;

    return {
      department: d.name,
      needsAttention,
      onboardingCount: totalOnboarding,
      avgCompletion,
      avgQuizScore,
      reason: needsAttention 
        ? `${lowCompletion ? 'Low module completion rate. ' : ''}${lowQuiz ? 'Low average assessment scores.' : ''}`
        : 'Onboarding is progressing normally.',
    };
  });

  return JSON.stringify({
    departments: report,
    attentionRequired: report.filter((r) => r.needsAttention),
  });
};

// ---------------------------------------------------------------------------
// Tool registry
// ---------------------------------------------------------------------------
const toolRegistry: Record<string, ToolExecutor> = {
  get_progress: getProgress,
  search_documents: searchDocuments,
  get_training_plan: getTrainingPlan,
  get_assessment_results: getAssessmentResults,
  get_policies: getPolicies,
  get_next_task: getNextTask,
  generate_certificate_check: generateCertificateCheck,
  get_onboarding_stats: getOnboardingStats,
  get_compliance_report: getComplianceReport,
  get_departments_attention: getDepartmentsAttention,
};

// ---------------------------------------------------------------------------
// Tool descriptions for the system prompt
// ---------------------------------------------------------------------------
const TOOL_DESCRIPTIONS = `
Available tools you can use:
- get_progress: Get the employee's onboarding progress including module completion status, scores, and percentages. No arguments needed.
- search_documents: Search company handbooks, policies, and documents. Requires {"query": "search text"}.
- get_training_plan: Get the employee's active training plan including modules, objectives, milestones, and deliverables. No arguments needed.
- get_assessment_results: Get the employee's quiz and assessment scores, pass/fail status, and averages. No arguments needed.
- get_policies: Search company policies by category (security, compliance, hr, it, engineering, general). Accepts {"category": "category_name"} or {"query": "search text"}.
- get_next_task: Determine what the employee should work on next in their onboarding. No arguments needed.
- generate_certificate_check: Check if the employee qualifies for a completion certificate. No arguments needed.
`;

// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// System prompt builder
// ---------------------------------------------------------------------------
function buildSystemPrompt(employeeContext: string, progressSummary: string, employeeRole: string): string {
  let capabilities = TOOL_DESCRIPTIONS;
  if (employeeRole === 'admin' || employeeRole === 'hr') {
    capabilities += `
- get_onboarding_stats: [ADMIN/HR ONLY] Get onboarding statistics for all employees in the system, grouped by department. No arguments needed.
- get_compliance_report: [ADMIN/HR ONLY] Generate a compliance report showing completion percentages and quiz scores of onboarding employees. No arguments needed.
- get_departments_attention: [ADMIN/HR ONLY] Get a list of active departments, checking if any need attention based on completion rates or quiz scores. No arguments needed.`;
  }

  return `You are OnboardAI Agent, an intelligent onboarding assistant for an enterprise platform. You help employees navigate their onboarding journey, answer questions about policies, track progress, and provide personalized guidance.

## Employee Context
${employeeContext}

## Onboarding Progress Summary
${progressSummary}

## Your Capabilities
${capabilities}

## Instructions
1. Be helpful, friendly, and professional.
2. When answering questions that require data (progress, training, assessments, etc.), use the available tools.
3. When you need to use a tool, respond ONLY with a JSON object in this exact format (no markdown, no extra text):
   {"thought": "Brief reasoning about what tool to use and why", "tool": "tool_name", "args": {}}
4. If you do NOT need to call a tool, respond with a direct, conversational natural language answer. Do NOT use JSON formatting.
5. Do NOT include any other text when calling a tool — only the raw JSON object.
6. After receiving tool results, provide a clear, well-formatted answer to the user's question.
7. Use markdown formatting for better readability (headers, bullet points, bold text).
8. If you don't know the answer or can't find relevant information, say so honestly.
9. Always keep responses concise but informative.
10. Reference specific data (scores, dates, module names) when available.
11. If the user asks about something not related to onboarding, politely redirect them to onboarding topics.`;
}

// ---------------------------------------------------------------------------
// Parse tool call from LLM response
// ---------------------------------------------------------------------------
function parseToolCall(llmOutput: string): ToolCall | null {
  try {
    let jsonStr = llmOutput.trim();

    // Remove markdown code blocks if present
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    // Try to find JSON object in the text
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    if (parsed.tool && toolRegistry[parsed.tool]) {
      return {
        tool: parsed.tool,
        args: parsed.args || {},
      };
    }
  } catch {
    // Not valid JSON or not a tool call — that's fine, treat as normal response
  }
  return null;
}

// ---------------------------------------------------------------------------
// Clean final answer if the model outputted its thought inside JSON format
// ---------------------------------------------------------------------------
function cleanFinalAnswer(answer: string): string {
  try {
    let jsonStr = answer.trim();
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.thought && typeof parsed.thought === 'string') {
        return parsed.response || parsed.message || parsed.thought;
      }
    }
  } catch {
    // Ignore and return original
  }
  return answer;
}

// ---------------------------------------------------------------------------
// Generate follow-up suggestions based on context
// ---------------------------------------------------------------------------
function generateSuggestions(
  userMessage: string,
  toolCalls: ToolResult[],
  employeeRole: string,
): string[] {
  const suggestions = new Set<string>();

  // Default suggestions based on role
  if (employeeRole === 'admin' || employeeRole === 'hr') {
    suggestions.add('How many employees need onboarding?');
    suggestions.add('Show compliance report');
    suggestions.add('Which departments need attention?');
  }

  // Default for all users
  suggestions.add("What's my onboarding progress?");
  suggestions.add('Show me my training plan');
  suggestions.add('What should I do next?');
  suggestions.add('Search security policies');
  suggestions.add("How's my assessment score?");

  // Context-aware suggestions
  const lowerMsg = userMessage.toLowerCase();
  if (lowerMsg.includes('progress') || lowerMsg.includes('status')) {
    suggestions.add('What should I do next?');
    suggestions.add('Check if I qualify for a certificate');
  }
  if (lowerMsg.includes('training') || lowerMsg.includes('plan')) {
    suggestions.add('Show assessment results');
    suggestions.add('What are the deliverables?');
  }
  if (lowerMsg.includes('policy') || lowerMsg.includes('search')) {
    suggestions.add('Search HR policies');
    suggestions.add('Search IT policies');
  }
  if (lowerMsg.includes('assessment') || lowerMsg.includes('quiz') || lowerMsg.includes('score')) {
    suggestions.add('Show my training plan');
    suggestions.add('Check certificate eligibility');
  }

  // Remove suggestions that were just fulfilled
  for (const tc of toolCalls) {
    if (tc.tool === 'get_progress') {
      suggestions.delete("What's my onboarding progress?");
    }
    if (tc.tool === 'get_training_plan') {
      suggestions.delete('Show me my training plan');
    }
    if (tc.tool === 'get_assessment_results') {
      suggestions.delete("How's my assessment score?");
    }
    if (tc.tool === 'get_next_task') {
      suggestions.delete('What should I do next?');
    }
    if (tc.tool === 'get_policies') {
      suggestions.delete('Search security policies');
    }
    if (tc.tool === 'generate_certificate_check') {
      suggestions.delete('Check if I qualify for a certificate');
    }
  }

  return Array.from(suggestions).slice(0, 4);
}

// ---------------------------------------------------------------------------
// POST /api/agent/chat
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    // 1. Verify auth
    const tokenPayload = await verifyToken(request);
    if (!tokenPayload) {
      return unauthorizedResponse();
    }

    // 2. Parse request body
    const body = await request.json();
    const { message, conversationId, context: extraContext } = body as {
      message?: string;
      conversationId?: string;
      context?: Record<string, unknown>;
    };

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // 3. Get user + employee data
    const user = await db.user.findUnique({
      where: { id: tokenPayload.userId },
      include: {
        employee: {
          include: {
            department: { select: { name: true, description: true, headName: true } },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const employee = user.employee;
    const employeeId = employee?.id;
    const employeeRole = employee?.role || user.role;

    // Build employee context string
    let employeeContext = `Name: ${user.name}\nEmail: ${user.email}\nRole: ${user.role}`;

    if (employee) {
      employeeContext += `\nEmployee ID: ${employee.employeeId}
Position: ${employee.position}
Department: ${employee.department?.name || 'Not assigned'}
Experience Level: ${employee.experience}
Status: ${employee.status}
Join Date: ${employee.joinDate.toISOString().split('T')[0]}`;
      if (employee.onboardingStart) {
        employeeContext += `\nOnboarding Start: ${employee.onboardingStart.toISOString().split('T')[0]}`;
      }
      if (employee.onboardingEnd) {
        employeeContext += `\nOnboarding End: ${employee.onboardingEnd.toISOString().split('T')[0]}`;
      }
    } else {
      employeeContext += '\nNote: No employee profile linked to this user.';
    }

    // 4. Fetch progress summary for system prompt
    let progressSummary = 'No onboarding progress data available.';
    if (employeeId) {
      try {
        const progressResult = await getProgress(employeeId, tokenPayload.userId, {});
        const parsed = JSON.parse(progressResult);
        progressSummary = `Overall: ${parsed.summary.percent}% complete (${parsed.summary.completed}/${parsed.summary.total} modules). ${parsed.summary.inProgress} in progress, ${parsed.summary.pending} pending.`;
      } catch {
        progressSummary = 'Could not fetch progress data.';
      }
    }

    // 5. Get or create conversation
    const { conversation, isNew } = getOrCreateConversation(
      tokenPayload.userId,
      conversationId,
    );

    // Set conversation title from first user message
    if (isNew) {
      conversation.title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
    }

    // 6. Add user message to conversation
    addConversationMessage(conversation, 'user', message);

    // 7. Build system prompt
    const systemPrompt = buildSystemPrompt(employeeContext, progressSummary, employeeRole);

    // 8. Build message history
    const messageHistory = buildMessageHistory(conversation);

    // 9. Agent Loop
    const toolCallResults: ToolResult[] = [];
    let finalAnswer = '';
    const MAX_TOOL_ROUNDS = 3;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      try {
        const llmMessages = [
          { role: 'system' as const, content: systemPrompt },
          ...messageHistory.map((m) => ({
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content,
          })),
        ];

        if (round === 0 && toolCallResults.length === 0) {
          // First LLM call — decide if a tool is needed
          const llmOutput = await callLLM(llmMessages);
          const toolCall = parseToolCall(llmOutput);

          if (toolCall && employeeId) {
            // Execute the tool
            const executor = toolRegistry[toolCall.tool];
            const result = await executor(employeeId, tokenPayload.userId, toolCall.args);
            const toolResult: ToolResult = {
              tool: toolCall.tool,
              args: toolCall.args,
              result: result.length > 500 ? result.substring(0, 500) + '...' : result,
            };
            toolCallResults.push(toolResult);

            // Second LLM call — synthesize tool result into a natural answer
            const secondMessages = [
              ...llmMessages,
              {
                role: 'user' as const,
                content: `[Tool Result from ${toolCall.tool}]:\n${result}`,
              },
              {
                role: 'user' as const,
                content: `Now answer the original question: "${message}" using the tool result above. Be specific and reference the data. Do not mention tools or the internal process.`,
              },
            ];

            try {
              finalAnswer = await callLLM(secondMessages);
            } catch {
              // Fallback: present the raw tool result
              finalAnswer = `Based on the ${toolCall.tool} results:\n\n${toolCallResults[0].result}`;
            }
            break;
          } else if (toolCall && !employeeId) {
            // Tool call needed but no employee profile — answer without tools
            finalAnswer = llmOutput;
            break;
          } else {
            // No tool call — use the LLM response directly
            finalAnswer = llmOutput;
            break;
          }
        } else {
          // Subsequent rounds — handle chained tool calls
          finalAnswer = await callLLM(llmMessages);
          const toolCall = parseToolCall(finalAnswer);

          if (toolCall && employeeId) {
            const executor = toolRegistry[toolCall.tool];
            const result = await executor(employeeId, tokenPayload.userId, toolCall.args);
            toolCallResults.push({
              tool: toolCall.tool,
              args: toolCall.args,
              result: result.length > 500 ? result.substring(0, 500) + '...' : result,
            });

            // Add intermediate messages and continue
            messageHistory.push({ role: 'assistant', content: finalAnswer });
            messageHistory.push({
              role: 'user',
              content: `[Tool Result]: ${toolCallResults[toolCallResults.length - 1].result}\nPlease provide the final answer.`,
            });
            continue;
          }
          break;
        }
      } catch (error) {
        console.error(`Agent loop error (round ${round}):`, error);

        const errorMessage = error instanceof Error ? error.message : String(error);

        if (error instanceof Error && error.message.includes('ZAI_API_KEY is not defined')) {
          finalAnswer = `### ⚠️ Configuration Required\n\nThe AI Agent is missing its API key. Please add the \`ZAI_API_KEY\` (or \`OPENAI_API_KEY\`) environment variable in your Vercel project dashboard settings under **Settings > Environment Variables**, and then redeploy your application.`;
          break;
        }

        // Graceful fallback — never crash
        if (toolCallResults.length > 0) {
          finalAnswer = `I retrieved some information for you. Here's what I found:\n\n${toolCallResults.map((t) => `**${t.tool}**: ${t.result}`).join('\n\n')}`;
        } else {
          finalAnswer = `I'm sorry, I encountered an issue processing your request.\n\n**Error details**: \`${errorMessage}\`\n\n- Your onboarding status: ${employee?.status || 'N/A'}\n- Your department: ${employee?.department?.name || 'N/A'}\n\nPlease try again or ask a different question.`;
        }
        break;
      }
    }

    // If the final answer still looks like a tool call, convert it
    if (finalAnswer && parseToolCall(finalAnswer)) {
      if (toolCallResults.length > 0) {
        finalAnswer = `I found some relevant information for your query. Here's a summary:\n\n${toolCallResults.map((t) => `**${t.tool}**: ${t.result}`).join('\n\n')}`;
      } else {
        finalAnswer = "I wasn't able to complete your request. Please try rephrasing your question.";
      }
    }

    // Ensure we always have a non-empty response
    if (!finalAnswer || finalAnswer.trim().length === 0) {
      finalAnswer = "I wasn't able to generate a response. Please try rephrasing your question.";
    }

    // Clean final answer if model output was wrapped in tool JSON structure (e.g. {"thought": "...", "tool": "none"})
    finalAnswer = cleanFinalAnswer(finalAnswer);

    // 10. Store assistant response in conversation
    addConversationMessage(conversation, 'assistant', finalAnswer);

    // 11. Generate contextual suggestions
    const suggestions = generateSuggestions(message, toolCallResults, employeeRole);

    // 12. Return response
    return NextResponse.json({
      conversationId: conversation.id,
      message: finalAnswer,
      toolCalls: toolCallResults,
      suggestions,
    });
  } catch (error) {
    console.error('Agent chat error:', error);
    return serverErrorResponse('Failed to process your message. Please try again.');
  }
}