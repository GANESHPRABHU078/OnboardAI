import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, notFoundResponse, badRequestResponse, serverErrorResponse } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await requireRole(request, 'admin', 'hr', 'employee');
    if (!payload.success) return payload.response;

    const { id } = await params;

    const assessment = await db.assessment.findUnique({
      where: { id },
      include: {
        _count: {
          select: { quizResults: true },
        },
      },
    });

    if (!assessment) {
      return notFoundResponse('Assessment');
    }

    const questions = JSON.parse(assessment.questions);

    if (payload.payload.role === 'employee') {
      const safeQuestions = questions.map((q: Record<string, unknown>) => ({
        id: q.id,
        type: q.type,
        question: q.question,
        options: q.options,
        points: q.points,
      }));

      return NextResponse.json({
        assessment: {
          ...assessment,
          questions: safeQuestions,
        },
      });
    }

    return NextResponse.json({
      assessment: {
        ...assessment,
        questions,
      },
    });
  } catch (error) {
    console.error('Get assessment error:', error);
    return serverErrorResponse('Failed to fetch assessment');
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(request, 'admin', 'hr');
    if (!auth.success) return auth.response;

    const { id } = await params;
    const body = await request.json();

    const assessment = await db.assessment.findUnique({ where: { id } });
    if (!assessment) {
      return notFoundResponse('Assessment');
    }

    const updatedAssessment = await db.assessment.update({
      where: { id },
      data: {
        title: body.title ?? assessment.title,
        department: body.department !== undefined ? body.department : assessment.department,
        difficulty: body.difficulty ?? assessment.difficulty,
        questions: body.questions ? JSON.stringify(body.questions) : assessment.questions,
        passingScore: body.passingScore ?? assessment.passingScore,
        timeLimit: body.timeLimit !== undefined ? body.timeLimit : assessment.timeLimit,
        learningObjectives: body.learningObjectives
          ? JSON.stringify(body.learningObjectives)
          : assessment.learningObjectives,
        isActive: body.isActive !== undefined ? body.isActive : assessment.isActive,
      },
    });

    await logAudit(
      auth.payload.userId,
      'ASSESSMENT_UPDATED',
      'Assessment',
      `Updated assessment: ${id}`,
      request
    );

    return NextResponse.json({ assessment: updatedAssessment });
  } catch (error) {
    console.error('Update assessment error:', error);
    return serverErrorResponse('Failed to update assessment');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(request, 'admin');
    if (!auth.success) return auth.response;

    const { id } = await params;

    const assessment = await db.assessment.findUnique({ where: { id } });
    if (!assessment) {
      return notFoundResponse('Assessment');
    }

    await db.assessment.delete({ where: { id } });

    await logAudit(
      auth.payload.userId,
      'ASSESSMENT_DELETED',
      'Assessment',
      `Deleted assessment: ${assessment.title}`,
      request
    );

    return NextResponse.json({ message: 'Assessment deleted successfully' });
  } catch (error) {
    console.error('Delete assessment error:', error);
    return serverErrorResponse('Failed to delete assessment');
  }
}