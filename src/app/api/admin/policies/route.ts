import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, badRequestResponse, serverErrorResponse } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    const payload = await requireRole(request, 'admin', 'hr', 'employee');
    if (!payload.success) return payload.response;

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const departmentId = searchParams.get('departmentId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { isActive: true };
    if (category) where.category = category;
    if (departmentId) where.departmentId = departmentId;

    const [policies, total] = await Promise.all([
      db.policy.findMany({
        where,
        include: {
          department: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.policy.count({ where }),
    ]);

    return NextResponse.json({
      policies,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get policies error:', error);
    return serverErrorResponse('Failed to fetch policies');
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, 'admin', 'hr');
    if (!auth.success) return auth.response;

    const body = await request.json();
    const { title, description, content, category, departmentId, version } = body;

    if (!title || !content) {
      return badRequestResponse('Title and content are required');
    }

    const validCategories = ['security', 'compliance', 'hr', 'it', 'engineering', 'general'];
    const policyCategory = category && validCategories.includes(category) ? category : 'general';

    const policy = await db.policy.create({
      data: {
        title,
        description: description || null,
        content,
        category: policyCategory,
        departmentId: departmentId || null,
        version: version || '1.0',
        createdBy: auth.payload.userId,
      },
    });

    await logAudit(
      auth.payload.userId,
      'POLICY_CREATED',
      'Policy',
      `Created policy: ${title}`,
      request
    );

    return NextResponse.json({ policy }, { status: 201 });
  } catch (error) {
    console.error('Create policy error:', error);
    return serverErrorResponse('Failed to create policy');
  }
}