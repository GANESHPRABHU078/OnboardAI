import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, badRequestResponse, notFoundResponse, serverErrorResponse } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, 'admin', 'hr');
    if (!auth.success) return auth.response;

    const body = await request.json();
    const { employeeId, title, description, trainingPlanId, assessmentId } = body;

    if (!employeeId || !title) {
      return badRequestResponse('employeeId and title are required');
    }

    const employee = await db.employee.findUnique({
      where: { id: employeeId },
      include: { department: true },
    });
    if (!employee) {
      return notFoundResponse('Employee');
    }

    const certificate = await db.certificate.create({
      data: {
        employeeId,
        title,
        description: description || `Certificate of completion for ${title}`,
        trainingPlanId: trainingPlanId || null,
        assessmentId: assessmentId || null,
        status: 'approved',
        approvedBy: auth.payload.userId,
        approvedAt: new Date(),
      },
    });

    await logAudit(
      auth.payload.userId,
      'CERTIFICATE_GENERATED',
      'Certificate',
      `Generated certificate for ${employee.firstName} ${employee.lastName}: ${title}`,
      request
    );

    return NextResponse.json({ certificate }, { status: 201 });
  } catch (error) {
    console.error('Generate certificate error:', error);
    return serverErrorResponse('Failed to generate certificate');
  }
}