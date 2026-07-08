import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole, badRequestResponse, serverErrorResponse } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

async function generateAIAssessment(department: string, difficulty: string, topics: string[]) {
  const topicsStr = topics.join(', ');
  const prompt = `You are an expert assessment creator for enterprise onboarding programs. Generate a quiz assessment and return ONLY valid JSON (no markdown, no code fences) matching this exact structure:

{
  "title": "string - assessment title",
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "question": "string - the question text",
      "options": ["string - option A", "string - option B", "string - option C", "string - option D"],
      "correctAnswer": "string - the exact correct option text",
      "explanation": "string - explanation of why this is the correct answer",
      "points": 10
    }
  ],
  "learningObjectives": ["string - objective 1", "string - objective 2", "string - objective 3"],
  "passingScore": 70,
  "timeLimit": 30
}

Department: ${department}
Difficulty: ${difficulty}
Topics: ${topicsStr}

Generate exactly 10 questions. Mix multiple choice questions about the given topics relevant to the ${department} department. Each question should have exactly 4 options. Make questions ${difficulty} level difficulty.`;

  try {
    const { getZAI } = await import('@/lib/zai');
    const zai = await getZAI();

    const completion = await zai.chat.completions.create({
      model: process.env.ZAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'assistant',
          content: 'You are an expert assessment creator. Always respond with valid JSON only, no markdown formatting.',
        },
        { role: 'user', content: prompt },
      ],
    });

    const content = completion.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No valid JSON found in AI response');
  } catch (error) {
    console.error('AI assessment generation error:', error);
    if (error instanceof Error && error.message.includes('ZAI_API_KEY is not defined')) {
      throw error;
    }
    return generateFallbackAssessment(department, difficulty, topics);
  }
}

function generateFallbackAssessment(department: string, difficulty: string, topics: string[]) {
  const topicList = topics.length > 0 ? topics : ['Security', 'Compliance', 'Company Policies', 'Team Processes'];
  return {
    title: `${department} Department Assessment`,
    questions: [
      {
        id: 'q1',
        type: 'multiple_choice',
        question: `What is the primary purpose of the ${department} department's security protocols?`,
        options: [
          'To protect sensitive company and client data from unauthorized access',
          'To monitor employee internet usage',
          'To restrict access to the office building',
          'To manage software licenses',
        ],
        correctAnswer: 'To protect sensitive company and client data from unauthorized access',
        explanation: 'Security protocols are primarily designed to safeguard sensitive information from unauthorized access, ensuring data confidentiality and integrity.',
        points: 10,
      },
      {
        id: 'q2',
        type: 'multiple_choice',
        question: 'When should you report a potential security incident?',
        options: [
          'Only if data has been confirmed to be stolen',
          'Immediately upon suspecting any security breach or vulnerability',
          'During the next scheduled team meeting',
          'Only when directed by your manager',
        ],
        correctAnswer: 'Immediately upon suspecting any security breach or vulnerability',
        explanation: 'Security incidents should be reported immediately to minimize potential damage. Early reporting allows the security team to respond quickly.',
        points: 10,
      },
      {
        id: 'q3',
        type: 'multiple_choice',
        question: 'Which of the following is considered a strong password?',
        options: [
          'password123',
          'MyDog2024',
          'X#9kL!mP2$vR@nQ',
          'companyname01',
        ],
        correctAnswer: 'X#9kL!mP2$vR@nQ',
        explanation: 'A strong password contains a mix of uppercase and lowercase letters, numbers, and special characters, and is at least 12 characters long.',
        points: 10,
      },
      {
        id: 'q4',
        type: 'multiple_choice',
        question: `What is the correct procedure for handling sensitive ${topicList[0]} data?`,
        options: [
          'Share it freely with any team member who asks',
          'Store it on personal cloud storage for convenience',
          'Follow the data classification policy and use only approved storage solutions',
          'Email it to yourself so you can work from home',
        ],
        correctAnswer: 'Follow the data classification policy and use only approved storage solutions',
        explanation: 'All sensitive data must be handled according to the data classification policy, using only approved and encrypted storage solutions.',
        points: 10,
      },
      {
        id: 'q5',
        type: 'multiple_choice',
        question: 'How often should you update your work passwords?',
        options: [
          'Never, unless prompted by IT',
          'Every 90 days or immediately if compromised',
          'Once a year',
          'Only when you forget them',
        ],
        correctAnswer: 'Every 90 days or immediately if compromised',
        explanation: 'Regular password updates help maintain security. Passwords should be changed every 90 days or immediately if there is any suspicion of compromise.',
        points: 10,
      },
      {
        id: 'q6',
        type: 'multiple_choice',
        question: `What is the purpose of ${topicList[1]} training in the onboarding process?`,
        options: [
          'It is optional and only for managers',
          'To ensure employees understand regulatory requirements and company obligations',
          'To reduce the onboarding period',
          'To replace the employee handbook',
        ],
        correctAnswer: 'To ensure employees understand regulatory requirements and company obligations',
        explanation: 'Compliance training ensures all employees understand their legal and regulatory obligations, protecting both the individual and the organization.',
        points: 10,
      },
      {
        id: 'q7',
        type: 'multiple_choice',
        question: 'Which action is appropriate when receiving a suspicious email?',
        options: [
          'Click the links to verify if they are real',
          'Reply to the sender asking if it is legitimate',
          'Report it to the IT security team and do not click any links',
          'Forward it to your colleagues to warn them',
        ],
        correctAnswer: 'Report it to the IT security team and do not click any links',
        explanation: 'Suspicious emails should be reported to IT security immediately. Never click links or download attachments from suspicious emails.',
        points: 10,
      },
      {
        id: 'q8',
        type: 'multiple_choice',
        question: `What is the company policy on ${topicList[2]} regarding remote work?`,
        options: [
          'There are no specific policies for remote work',
          'Employees must use the company VPN and follow data protection guidelines',
          'Remote work is not allowed under any circumstances',
          'Any personal device can be used for work purposes',
        ],
        correctAnswer: 'Employees must use the company VPN and follow data protection guidelines',
        explanation: 'Remote work requires the use of company VPN and adherence to all data protection guidelines to maintain security standards.',
        points: 10,
      },
      {
        id: 'q9',
        type: 'multiple_choice',
        question: 'What should you do if you accidentally share confidential information with the wrong person?',
        options: [
          'Ignore it if the person seems trustworthy',
          'Send a follow-up email asking them to delete it',
          'Immediately report the incident to your manager and the security team',
          'Wait to see if any consequences occur before reporting',
        ],
        correctAnswer: 'Immediately report the incident to your manager and the security team',
        explanation: 'Any accidental data disclosure must be reported immediately to allow the company to take appropriate mitigation steps.',
        points: 10,
      },
      {
        id: 'q10',
        type: 'multiple_choice',
        question: `Which of the following best describes the ${topicList[3]} process for the ${department} team?`,
        options: [
          'There is no formal process in place',
          'The process is documented in the team wiki and reviewed quarterly',
          'Only senior team members need to follow the process',
          'The process changes weekly based on team preferences',
        ],
        correctAnswer: 'The process is documented in the team wiki and reviewed quarterly',
        explanation: 'Team processes are documented and regularly reviewed to ensure they remain effective and up-to-date with best practices.',
        points: 10,
      },
    ],
    learningObjectives: [
      `Understand ${department} department security protocols and data handling procedures`,
      'Recognize and properly respond to security incidents and suspicious activities',
      `Comply with ${topicList[1]} requirements and company policies`,
      `Follow ${topicList[3]} processes and best practices`,
    ],
    passingScore: 70,
    timeLimit: 30,
  };
}

export async function GET(request: NextRequest) {
  try {
    const payload = await requireRole(request, 'admin', 'hr', 'employee');
    if (!payload.success) return payload.response;

    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
    const difficulty = searchParams.get('difficulty');
    const isActive = searchParams.get('isActive');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (department) where.department = department;
    if (difficulty) where.difficulty = difficulty;
    if (isActive !== null && isActive !== undefined) where.isActive = isActive === 'true';

    const [assessments, total] = await Promise.all([
      db.assessment.findMany({
        where,
        include: {
          _count: {
            select: { quizResults: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.assessment.count({ where }),
    ]);

    return NextResponse.json({
      assessments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get assessments error:', error);
    return serverErrorResponse('Failed to fetch assessments');
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, 'admin', 'hr');
    if (!auth.success) return auth.response;

    const body = await request.json();

    if (body.generate) {
      const { department, difficulty, topics } = body;
      if (!department) {
        return badRequestResponse('Department is required for AI generation');
      }

      const generated = await generateAIAssessment(
        department,
        difficulty || 'medium',
        topics || []
      );

      const assessment = await db.assessment.create({
        data: {
          title: generated.title,
          department,
          difficulty: difficulty || 'medium',
          questions: JSON.stringify(generated.questions),
          passingScore: generated.passingScore || 70,
          timeLimit: generated.timeLimit || 30,
          learningObjectives: JSON.stringify(generated.learningObjectives || []),
          createdBy: auth.payload.userId,
        },
      });

      await logAudit(
        auth.payload.userId,
        'ASSESSMENT_GENERATED',
        'Assessment',
        `AI generated assessment: ${generated.title}`,
        request
      );

      return NextResponse.json({ assessment }, { status: 201 });
    }

    const {
      title,
      trainingPlanId,
      department,
      difficulty,
      questions,
      passingScore,
      timeLimit,
      learningObjectives,
    } = body;

    if (!title || !questions || !Array.isArray(questions)) {
      return badRequestResponse('Title and questions array are required');
    }

    const assessment = await db.assessment.create({
      data: {
        title,
        trainingPlanId: trainingPlanId || null,
        department: department || null,
        difficulty: difficulty || 'medium',
        questions: JSON.stringify(questions),
        passingScore: passingScore || 70,
        timeLimit: timeLimit || null,
        learningObjectives: JSON.stringify(learningObjectives || []),
        createdBy: auth.payload.userId,
      },
    });

    await logAudit(
      auth.payload.userId,
      'ASSESSMENT_CREATED',
      'Assessment',
      `Created assessment: ${title}`,
      request
    );

    return NextResponse.json({ assessment }, { status: 201 });
  } catch (error) {
    console.error('Create assessment error:', error);
    if (error instanceof Error && error.message.includes('ZAI_API_KEY is not defined')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return serverErrorResponse('Failed to create assessment');
  }
}