import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, notFoundResponse, badRequestResponse, serverErrorResponse } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRole(request, 'admin', 'hr');
    if (!auth.success) return auth.response;

    const { id } = await params;

    const certificate = await db.certificate.findUnique({ where: { id } });
    if (!certificate) {
      return notFoundResponse('Certificate');
    }

    if (certificate.status !== 'pending') {
      return badRequestResponse(`Certificate is already ${certificate.status}`);
    }

    const updatedCertificate = await db.certificate.update({
      where: { id },
      data: {
        status: 'approved',
        approvedBy: auth.payload.userId,
        approvedAt: new Date(),
      },
    });

    await logAudit(
      auth.payload.userId,
      'CERTIFICATE_APPROVED',
      'Certificate',
      `Approved certificate: ${id}`,
      request
    );

    return NextResponse.json({ certificate: updatedCertificate });
  } catch (error) {
    console.error('Approve certificate error:', error);
    return serverErrorResponse('Failed to approve certificate');
  }
}