import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, notFoundResponse, badRequestResponse, serverErrorResponse } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await requireRole(request, 'admin', 'hr', 'employee');
    if (!payload.success) return payload.response;

    const { id: assessmentId } = await params;
    const body = await request.json();
    const { answers } = body;

    if (!answers || !Array.isArray(answers)) {
      return badRequestResponse('Answers array is required');
    }

    const assessment = await db.assessment.findUnique({ where: { id: assessmentId } });
    if (!assessment) {
      return notFoundResponse('Assessment');
    }

    const employee = await db.employee.findFirst({
      where: { userId: payload.payload.userId },
    });
    if (!employee) {
      return badRequestResponse('Employee record not found for this user');
    }

    const questions = JSON.parse(assessment.questions);
    const answerMap = new Map(answers.map((a: { questionId: string; answer: string }) => [a.questionId, a.answer]));

    let correctCount = 0;
    const totalQuestions = questions.length;
    const detailedResults: { questionId: string; correct: boolean; userAnswer: string; correctAnswer: string; points: number }[] = [];

    questions.forEach((q: { id: string; correctAnswer: string; points: number; options?: string[] }) => {
      const userAnswer = answerMap.get(q.id);
      const isCorrect = userAnswer?.trim().toLowerCase() === q.correctAnswer?.trim().toLowerCase();
      if (isCorrect) correctCount++;

      detailedResults.push({
        questionId: q.id,
        correct: isCorrect,
        userAnswer: userAnswer || '',
        correctAnswer: q.correctAnswer,
        points: isCorrect ? q.points : 0,
      });
    });

    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const passed = score >= assessment.passingScore;

    const quizResult = await db.quizResult.create({
      data: {
        assessmentId,
        employeeId: employee.id,
        score,
        totalQuestions,
        correctAnswers: correctCount,
        answers: JSON.stringify(detailedResults),
        passed,
        completedAt: new Date(),
      },
    });

    await logAudit(
      payload.payload.userId,
      'QUIZ_SUBMITTED',
      'QuizResult',
      `Submitted quiz ${assessmentId}: score ${score}%, ${passed ? 'passed' : 'failed'}`,
      request
    );

    return NextResponse.json({
      score,
      passed,
      correctAnswers: correctCount,
      totalQuestions,
      passingScore: assessment.passingScore,
      results: detailedResults,
      quizResult,
    });
  } catch (error) {
    console.error('Submit quiz error:', error);
    return serverErrorResponse('Failed to submit quiz');
  }
}