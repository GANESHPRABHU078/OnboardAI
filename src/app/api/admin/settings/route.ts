import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, serverErrorResponse } from '@/lib/auth';

const DEFAULT_SETTINGS: Record<string, { value: string; type: string; description: string }> = {
  onboarding_duration_weeks: {
    value: '4',
    type: 'number',
    description: 'Default onboarding duration in weeks',
  },
  assessment_passing_score: {
    value: '70',
    type: 'number',
    description: 'Default passing score for assessments',
  },
  max_retries: {
    value: '3',
    type: 'number',
    description: 'Maximum number of quiz retry attempts',
  },
  enable_ai_generation: {
    value: 'true',
    type: 'boolean',
    description: 'Enable AI-powered onboarding plan generation',
  },
  enable_rag_search: {
    value: 'true',
    type: 'boolean',
    description: 'Enable RAG-based handbook search',
  },
  auto_approve_certificates: {
    value: 'false',
    type: 'boolean',
    description: 'Automatically approve completed certificates',
  },
  email_notifications: {
    value: 'true',
    type: 'boolean',
    description: 'Enable email notifications for onboarding events',
  },
  welcome_message: {
    value: 'Welcome to the team! We are excited to have you on board.',
    type: 'string',
    description: 'Welcome message displayed to new employees',
  },
  company_name: {
    value: 'Enterprise Corp',
    type: 'string',
    description: 'Company name used throughout the platform',
  },
};

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(request, 'admin');
    if (!auth.success) return auth.response;

    const settings = await db.systemSetting.findMany();

    const settingsMap: Record<string, string> = {};
    settings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    const allSettings: Record<string, { value: string; type: string; description: string; key: string }> = {};
    for (const [key, defaultSetting] of Object.entries(DEFAULT_SETTINGS)) {
      allSettings[key] = {
        ...defaultSetting,
        key,
        value: settingsMap[key] ?? defaultSetting.value,
      };
    }

    return NextResponse.json({ settings: allSettings });
  } catch (error) {
    console.error('Get settings error:', error);
    return serverErrorResponse('Failed to fetch settings');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireRole(request, 'admin');
    if (!auth.success) return auth.response;

    const body = await request.json();
    const updates: Record<string, string> = body.settings || body;

    const results = [];

    for (const [key, value] of Object.entries(updates)) {
      const defaultSetting = DEFAULT_SETTINGS[key];
      if (!defaultSetting) continue;

      const existing = await db.systemSetting.findUnique({ where: { key } });

      if (existing) {
        const updated = await db.systemSetting.update({
          where: { key },
          data: { value: String(value) },
        });
        results.push(updated);
      } else {
        const created = await db.systemSetting.create({
          data: {
            key,
            value: String(value),
            type: defaultSetting.type,
            description: defaultSetting.description,
          },
        });
        results.push(created);
      }
    }

    return NextResponse.json({ settings: results, updated: results.length });
  } catch (error) {
    console.error('Update settings error:', error);
    return serverErrorResponse('Failed to update settings');
  }
}