import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, badRequestResponse, notFoundResponse, serverErrorResponse } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

async function generateAIOnboardingPlan(profile: Record<string, unknown>) {
  const prompt = `You are an expert enterprise onboarding plan generator. Generate a comprehensive onboarding plan for the following employee profile. Return ONLY valid JSON (no markdown, no code fences) matching this exact structure:

{
  "title": "string - descriptive plan title",
  "objectives": ["string - learning objective 1", "string - learning objective 2", "string - learning objective 3", "string - learning objective 4"],
  "modules": [
    {
      "title": "string - module title",
      "description": "string - detailed description of what this module covers",
      "duration": "string - e.g. '2 hours', '1 day', '3 days'",
      "type": "string - one of: video, reading, hands-on, workshop, assessment, meeting",
      "content": "string - detailed content/curriculum for this module"
    }
  ],
  "milestones": [
    {
      "title": "string - milestone name",
      "description": "string - what needs to be achieved",
      "targetDay": "number - which day/week this should be completed"
    }
  ],
  "deliverables": [
    {
      "title": "string - deliverable name",
      "description": "string - what needs to be submitted/demonstrated",
      "dueBy": "string - e.g. 'Week 1', 'Week 2'"
    }
  ],
  "requiredReading": [
    {
      "title": "string - document/resource title",
      "type": "string - e.g. 'Policy', 'Technical Guide', 'Best Practice'",
      "priority": "string - 'required' or 'optional'"
    }
  ],
  "handsOnTasks": [
    {
      "title": "string - task name",
      "description": "string - detailed task description",
      "estimatedHours": "number"
    }
  ],
  "estimatedDuration": "string - e.g. '4 weeks'"
}

Employee Profile:
- Name: ${profile.name || 'New Employee'}
- Role/Position: ${profile.position || 'Software Engineer'}
- Department: ${profile.department || 'Engineering'}
- Experience Level: ${profile.experience || 'mid-level'}
- Skills: ${profile.skills || 'General'}
- Security Level: ${profile.securityLevel || 'standard'}

Generate 6-8 modules covering: company culture, security & compliance, team introduction, tools & infrastructure, role-specific technical training, project overview, and hands-on practice. Make the content detailed and realistic for an enterprise environment.`;

  try {
    const { callLLM } = await import('@/lib/zai');
    const content = await callLLM([
      {
        role: 'assistant',
        content: 'You are an expert enterprise onboarding plan generator. Always respond with valid JSON only, no markdown formatting.',
      },
      { role: 'user', content: prompt },
    ]);
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No valid JSON found in AI response');
  } catch (error) {
    console.error('AI generation error:', error);
    if (error instanceof Error && error.message.includes('ZAI_API_KEY is not defined')) {
      throw error;
    }
    return generateFallbackPlan(profile);
  }
}

function generateFallbackPlan(profile: Record<string, unknown>) {
  const dept = (profile.department as string) || 'Engineering';
  const pos = (profile.position as string) || 'Software Engineer';
  const exp = (profile.experience as string) || 'mid';

  return {
    title: `${pos} Onboarding - ${dept} Department`,
    objectives: [
      `Understand company culture, values, and organizational structure`,
      `Complete all required security and compliance training modules`,
      `Gain proficiency in team tools, workflows, and development practices`,
      `Successfully complete initial project assignment and code review`,
    ],
    modules: [
      {
        title: 'Company Overview & Culture',
        description: `Introduction to the company mission, values, organizational structure, and ${dept} department goals.`,
        duration: '4 hours',
        type: 'video',
        content: 'Welcome video series covering company history, mission statement, core values, organizational chart, and department-specific culture. Includes interactive quiz on company policies.',
      },
      {
        title: 'Security & Compliance Training',
        description: 'Mandatory security awareness training, data handling policies, and compliance requirements.',
        duration: '3 hours',
        type: 'reading',
        content: 'Comprehensive guide covering information security best practices, data classification, GDPR compliance, password policies, social engineering awareness, incident reporting procedures, and acceptable use policies.',
      },
      {
        title: 'Team Introduction & Communication',
        description: 'Meet your team members, understand communication channels, and learn collaboration workflows.',
        duration: '2 hours',
        type: 'meeting',
        content: 'Scheduled 1:1 meetings with team lead, mentor, and key stakeholders. Overview of communication tools (Slack, email, meetings), team rituals, and escalation procedures.',
      },
      {
        title: 'Development Environment Setup',
        description: 'Configure your development workstation with all required tools and access credentials.',
        duration: '1 day',
        type: 'hands-on',
        content: 'Step-by-step guide to setting up IDE, version control, CI/CD access, cloud console credentials, VPN, and development environment. Includes verification checklist.',
      },
      {
        title: `${dept} Department Processes`,
        description: `Learn the specific workflows, tools, and best practices used in the ${dept} department.`,
        duration: '3 hours',
        type: 'workshop',
        content: `Department-specific training covering code review processes, sprint planning, deployment procedures, monitoring tools, and documentation standards used in ${dept}.`,
      },
      {
        title: 'Architecture & Codebase Overview',
        description: 'High-level understanding of the system architecture, key services, and codebase organization.',
        duration: '4 hours',
        type: 'reading',
        content: 'Architecture documentation, system diagrams, service dependency map, coding standards, and recommended reading from the internal knowledge base.',
      },
      {
        title: 'Hands-On Project Assignment',
        description: 'Work on a starter project to apply what you have learned and demonstrate your skills.',
        duration: '3 days',
        type: 'hands-on',
        content: 'Assigned starter project with clear requirements, design guidelines, and success criteria. Includes regular check-ins with mentor and a final code review session.',
      },
      {
        title: 'Assessment & Feedback',
        description: 'Complete the onboarding assessment and receive feedback from your manager and mentor.',
        duration: '2 hours',
        type: 'assessment',
        content: 'Comprehensive onboarding quiz covering all modules, followed by a feedback session with your manager to discuss progress, set 30/60/90-day goals, and address any questions.',
      },
    ],
    milestones: [
      { title: 'Week 1 Complete', description: 'Finish company overview, security training, and team introductions', targetDay: 5 },
      { title: 'Environment Ready', description: 'Development environment fully configured and verified', targetDay: 5 },
      { title: 'Week 2 Complete', description: 'Complete department processes and architecture training', targetDay: 10 },
      { title: 'First PR Submitted', description: 'Submit first pull request for code review', targetDay: 14 },
      { title: 'Project Delivered', description: 'Complete and present starter project', targetDay: 20 },
      { title: 'Onboarding Complete', description: 'Pass final assessment and receive onboarding certificate', targetDay: 28 },
    ],
    deliverables: [
      { title: 'Environment Setup Checklist', description: 'Complete development environment setup with all tools configured', dueBy: 'Week 1' },
      { title: 'Security Acknowledgment', description: 'Signed acknowledgment of security policies and data handling procedures', dueBy: 'Week 1' },
      { title: 'Starter Project PR', description: 'Pull request submitted for the assigned starter project', dueBy: 'Week 3' },
      { title: 'Onboarding Reflection', description: 'Written reflection on onboarding experience and suggestions for improvement', dueBy: 'Week 4' },
    ],
    requiredReading: [
      { title: 'Employee Handbook', type: 'Policy', priority: 'required' },
      { title: 'Information Security Policy', type: 'Policy', priority: 'required' },
      { title: 'Code of Conduct', type: 'Policy', priority: 'required' },
      { title: `${dept} Department Wiki`, type: 'Technical Guide', priority: 'required' },
      { title: 'Architecture Documentation', type: 'Technical Guide', priority: 'required' },
      { title: 'Development Best Practices', type: 'Best Practice', priority: 'optional' },
    ],
    handsOnTasks: [
      { title: 'Development Environment Setup', description: 'Install and configure all required development tools, IDE extensions, and access credentials', estimatedHours: 8 },
      { title: 'Bug Fix Exercise', description: 'Find and fix a designated bug in the codebase to practice the development workflow', estimatedHours: 4 },
      { title: 'Feature Implementation', description: 'Implement a small feature following the team coding standards and review process', estimatedHours: 16 },
      { title: 'Documentation Update', description: 'Update or create documentation for the feature you implemented', estimatedHours: 2 },
    ],
    estimatedDuration: '4 weeks',
  };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, 'admin', 'hr');
    if (!auth.success) return auth.response;

    const body = await request.json();
    const { employeeId, ...profileData } = body;

    let employeeProfile = profileData;
    let empId = employeeId;

    if (employeeId) {
      const employee = await db.employee.findUnique({
        where: { id: employeeId },
        include: { department: true },
      });
      if (!employee) {
        return notFoundResponse('Employee');
      }
      employeeProfile = {
        name: `${employee.firstName} ${employee.lastName}`,
        position: employee.position,
        department: employee.department?.name || 'General',
        experience: employee.experience,
        skills: employee.skills || '[]',
        securityLevel: employee.securityLevel,
      };
      empId = employee.id;
    } else if (!profileData.position || !profileData.department) {
      return badRequestResponse('Either employeeId or complete profile data (position, department) is required');
    }

    const plan = await generateAIOnboardingPlan(employeeProfile);

    const trainingPlan = await db.trainingPlan.create({
      data: {
        employeeId: empId,
        title: plan.title,
        role: employeeProfile.position as string,
        department: employeeProfile.department as string,
        experience: (employeeProfile.experience as string) || 'mid',
        objectives: JSON.stringify(plan.objectives),
        modules: JSON.stringify(plan.modules),
        duration: plan.estimatedDuration,
        requiredReading: JSON.stringify(plan.requiredReading),
        handsOnTasks: JSON.stringify(plan.handsOnTasks),
        deliverables: JSON.stringify(plan.deliverables),
        milestones: JSON.stringify(plan.milestones),
      },
    });

    if (empId) {
      await db.employee.update({
        where: { id: empId },
        data: {
          status: 'onboarding',
          onboardingStart: new Date(),
        },
      });
    }

    await logAudit(
      auth.payload.userId,
      'ONBOARDING_GENERATED',
      'TrainingPlan',
      `Generated onboarding plan for ${empId}: ${plan.title}`,
      request
    );

    return NextResponse.json({ plan: trainingPlan, generated: plan }, { status: 201 });
  } catch (error) {
    console.error('Generate onboarding error:', error);
    if (error instanceof Error && error.message.includes('ZAI_API_KEY is not defined')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return serverErrorResponse('Failed to generate onboarding plan');
  }
}