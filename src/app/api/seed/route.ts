import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, generateToken, requireRole, serverErrorResponse } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function POST(request: NextRequest) {
  try {
    // Seed endpoint is open (no auth required) for initial setup
    const existingEmployees = await db.employee.count();
    if (existingEmployees > 0) {
      return NextResponse.json(
        { message: 'Database already has data. Clear it first before seeding.' },
        { status: 400 }
      );
    }

    // Create departments
    const departments = await Promise.all([
      db.department.create({
        data: { name: 'Engineering', description: 'Software development and technical operations', headName: 'Sarah Chen' },
      }),
      db.department.create({
        data: { name: 'HR', description: 'Human resources and people operations', headName: 'Michael Torres' },
      }),
      db.department.create({
        data: { name: 'Finance', description: 'Financial planning, accounting, and budgeting', headName: 'David Park' },
      }),
      db.department.create({
        data: { name: 'Marketing', description: 'Brand, growth, and market communication', headName: 'Emily Rodriguez' },
      }),
      db.department.create({
        data: { name: 'Security', description: 'Information security and compliance', headName: 'James Wilson' },
      }),
    ]);

    const deptMap = new Map(departments.map((d) => [d.name, d.id]));

    // Create admin user
    const adminPassword = await hashPassword('admin123');
    const adminUser = await db.user.create({
      data: { email: 'admin@enterprise.com', password: adminPassword, name: 'Admin User', role: 'admin' },
    });
    const adminEmp = await db.employee.create({
      data: {
        userId: adminUser.id,
        employeeId: 'EMP-001',
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@enterprise.com',
        position: 'System Administrator',
        role: 'admin',
        departmentId: deptMap.get('Engineering'),
        experience: 'lead',
        skills: JSON.stringify(['System Administration', 'Security', 'DevOps']),
        securityLevel: 'privileged',
        status: 'completed',
        joinDate: new Date('2024-01-15'),
      },
    });

    // Create HR user
    const hrPassword = await hashPassword('hr123');
    const hrUser = await db.user.create({
      data: { email: 'hr@enterprise.com', password: hrPassword, name: 'Sarah Johnson', role: 'hr' },
    });
    const hrEmp = await db.employee.create({
      data: {
        userId: hrUser.id,
        employeeId: 'EMP-002',
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'hr@enterprise.com',
        position: 'HR Manager',
        role: 'hr',
        departmentId: deptMap.get('HR'),
        experience: 'senior',
        skills: JSON.stringify(['Recruiting', 'Onboarding', 'Employee Relations', 'Compliance']),
        securityLevel: 'elevated',
        status: 'completed',
        joinDate: new Date('2024-02-01'),
        managerId: adminEmp.id,
      },
    });

    // Create test employee user
    const empPassword = await hashPassword('emp123');
    const empUser = await db.user.create({
      data: { email: 'employee@enterprise.com', password: empPassword, name: 'John Smith', role: 'employee' },
    });
    const testEmp = await db.employee.create({
      data: {
        userId: empUser.id,
        employeeId: 'EMP-003',
        firstName: 'John',
        lastName: 'Smith',
        email: 'employee@enterprise.com',
        position: 'Software Engineer',
        role: 'employee',
        departmentId: deptMap.get('Engineering'),
        experience: 'mid',
        skills: JSON.stringify(['TypeScript', 'React', 'Node.js', 'PostgreSQL']),
        securityLevel: 'standard',
        status: 'onboarding',
        joinDate: new Date('2024-11-01'),
        onboardingStart: new Date('2024-11-01'),
        managerId: adminEmp.id,
      },
    });

    // Create more sample employees
    const employeeData = [
      { firstName: 'Alice', lastName: 'Williams', email: 'alice.w@enterprise.com', position: 'Senior Developer', department: 'Engineering', experience: 'senior', skills: ['Python', 'AWS', 'Docker', 'Kubernetes'], securityLevel: 'elevated', status: 'completed', joinDate: '2024-03-15', manager: adminEmp.id },
      { firstName: 'Bob', lastName: 'Martinez', email: 'bob.m@enterprise.com', position: 'HR Specialist', department: 'HR', experience: 'mid', skills: ['Recruiting', 'Benefits Administration', 'HRIS'], securityLevel: 'standard', status: 'completed', joinDate: '2024-04-01', manager: hrEmp.id },
      { firstName: 'Carol', lastName: 'Lee', email: 'carol.l@enterprise.com', position: 'Financial Analyst', department: 'Finance', experience: 'mid', skills: ['Financial Modeling', 'Excel', 'SQL', 'Tableau'], securityLevel: 'elevated', status: 'onboarding', joinDate: '2024-10-15', manager: adminEmp.id },
      { firstName: 'David', lastName: 'Brown', email: 'david.b@enterprise.com', position: 'Marketing Coordinator', department: 'Marketing', experience: 'junior', skills: ['Social Media', 'Content Writing', 'Analytics'], securityLevel: 'standard', status: 'onboarding', joinDate: '2024-11-01', manager: hrEmp.id },
      { firstName: 'Eva', lastName: 'Kim', email: 'eva.k@enterprise.com', position: 'Security Analyst', department: 'Security', experience: 'senior', skills: ['Penetration Testing', 'SIEM', 'Incident Response', 'Compliance'], securityLevel: 'privileged', status: 'completed', joinDate: '2024-02-15', manager: adminEmp.id },
      { firstName: 'Frank', lastName: 'Garcia', email: 'frank.g@enterprise.com', position: 'DevOps Engineer', department: 'Engineering', experience: 'mid', skills: ['CI/CD', 'Terraform', 'AWS', 'Docker'], securityLevel: 'elevated', status: 'active', joinDate: '2024-11-10', manager: adminEmp.id },
      { firstName: 'Grace', lastName: 'Davis', email: 'grace.d@enterprise.com', position: 'UX Designer', department: 'Engineering', experience: 'mid', skills: ['Figma', 'User Research', 'Prototyping', 'Design Systems'], securityLevel: 'standard', status: 'active', joinDate: '2024-11-15', manager: adminEmp.id },
    ];

    const createdEmployees: { id: string; employeeId: string }[] = [adminEmp, hrEmp, testEmp];

    for (let i = 0; i < employeeData.length; i++) {
      const emp = employeeData[i];
      const password = await hashPassword('changeme123');
      const user = await db.user.create({
        data: { email: emp.email, password, name: `${emp.firstName} ${emp.lastName}`, role: 'employee' },
      });
      const employee = await db.employee.create({
        data: {
          userId: user.id,
          employeeId: `EMP-${String(i + 4).padStart(3, '0')}`,
          firstName: emp.firstName,
          lastName: emp.lastName,
          email: emp.email,
          position: emp.position,
          departmentId: deptMap.get(emp.department),
          experience: emp.experience,
          skills: JSON.stringify(emp.skills),
          securityLevel: emp.securityLevel,
          status: emp.status,
          joinDate: new Date(emp.joinDate),
          managerId: emp.manager,
          onboardingStart: emp.status === 'onboarding' || emp.status === 'active' ? new Date(emp.joinDate) : null,
        },
      });
      createdEmployees.push(employee);
    }

    // Create sample policies
    const policies = [
      { title: 'Information Security Policy', description: 'Comprehensive security guidelines for all employees', content: 'All employees must follow information security best practices. This includes using strong passwords, encrypting sensitive data, reporting security incidents immediately, and completing mandatory security training. Data classification must be followed for all documents and communications.', category: 'security', departmentId: deptMap.get('Security'), version: '2.1' },
      { title: 'Code of Conduct', description: 'Expected behavior and professional standards', content: 'All employees are expected to maintain the highest standards of professional conduct. This includes treating all colleagues with respect, maintaining confidentiality, avoiding conflicts of interest, and reporting any violations of this policy.', category: 'hr', departmentId: deptMap.get('HR'), version: '1.5' },
      { title: 'Remote Work Policy', description: 'Guidelines for working remotely', content: 'Remote work is available for eligible employees who have completed their onboarding period. Employees must use the company VPN, follow data protection guidelines, maintain regular communication with their team, and ensure their home office meets security requirements.', category: 'hr', departmentId: deptMap.get('HR'), version: '1.3' },
      { title: 'Data Protection Policy', description: 'Guidelines for handling personal and sensitive data', content: 'All personal data must be handled in compliance with applicable data protection regulations. Employees must only collect data that is necessary, store it securely, and ensure it is only accessible to authorized personnel. Data retention periods must be followed.', category: 'compliance', departmentId: deptMap.get('Security'), version: '3.0' },
      { title: 'Software Development Standards', description: 'Coding standards and development practices', content: 'All software development must follow the established coding standards. Code must be reviewed by at least one peer before merging. Automated testing is required with a minimum of 80% code coverage. Documentation must be kept up to date.', category: 'engineering', departmentId: deptMap.get('Engineering'), version: '2.0' },
      { title: 'Acceptable Use Policy', description: 'Acceptable use of company technology resources', content: 'Company technology resources are provided for business purposes. Limited personal use is permitted but must not interfere with work duties. Employees must not install unauthorized software, access inappropriate content, or use company resources for illegal activities.', category: 'it', departmentId: deptMap.get('Security'), version: '1.8' },
    ];

    for (const policy of policies) {
      await db.policy.create({
        data: {
          ...policy,
          createdBy: adminUser.id,
        },
      });
    }

    // Create sample training plans for onboarding employees
    const sampleModules = [
      { title: 'Company Overview & Culture', description: 'Introduction to company mission, values, and culture', duration: '4 hours', type: 'video', content: 'Welcome video series covering company history, mission statement, and core values.' },
      { title: 'Security & Compliance Training', description: 'Mandatory security and compliance training', duration: '3 hours', type: 'reading', content: 'Comprehensive guide covering information security best practices and compliance requirements.' },
      { title: 'Team Introduction & Communication', description: 'Meet your team and learn communication workflows', duration: '2 hours', type: 'meeting', content: 'Scheduled 1:1 meetings with team lead and key stakeholders.' },
      { title: 'Development Environment Setup', description: 'Configure your development workstation', duration: '1 day', type: 'hands-on', content: 'Step-by-step guide to setting up IDE, version control, and CI/CD access.' },
      { title: 'Department Processes & Workflows', description: 'Learn team-specific workflows and processes', duration: '3 hours', type: 'workshop', content: 'Department-specific training covering code review processes and deployment procedures.' },
      { title: 'Architecture & Codebase Overview', description: 'System architecture and codebase introduction', duration: '4 hours', type: 'reading', content: 'Architecture documentation, system diagrams, and coding standards.' },
    ];

    const sampleObjectives = [
      'Understand company culture and organizational structure',
      'Complete all security and compliance training',
      'Set up development environment and tools',
      'Understand team workflows and processes',
    ];

    const sampleMilestones = [
      { title: 'Week 1 Complete', description: 'Finish company overview and security training', targetDay: 5 },
      { title: 'Environment Ready', description: 'Development environment configured', targetDay: 5 },
      { title: 'Week 2 Complete', description: 'Complete department training and architecture overview', targetDay: 10 },
      { title: 'Onboarding Complete', description: 'Pass final assessment', targetDay: 14 },
    ];

    const sampleDeliverables = [
      { title: 'Environment Setup Checklist', description: 'Complete development environment setup', dueBy: 'Week 1' },
      { title: 'Security Acknowledgment', description: 'Signed acknowledgment of security policies', dueBy: 'Week 1' },
      { title: 'First Code Contribution', description: 'Submit first pull request', dueBy: 'Week 2' },
    ];

    const sampleReading = [
      { title: 'Employee Handbook', type: 'Policy', priority: 'required' },
      { title: 'Information Security Policy', type: 'Policy', priority: 'required' },
      { title: 'Development Best Practices', type: 'Technical Guide', priority: 'optional' },
    ];

    const sampleTasks = [
      { title: 'Environment Setup', description: 'Install and configure all required tools', estimatedHours: 8 },
      { title: 'Bug Fix Exercise', description: 'Fix a designated bug in the codebase', estimatedHours: 4 },
    ];

    // Training plan for John Smith (onboarding)
    const johnPlan = await db.trainingPlan.create({
      data: {
        employeeId: testEmp.id,
        title: 'Software Engineer Onboarding - Engineering',
        role: 'Software Engineer',
        department: 'Engineering',
        experience: 'mid',
        objectives: JSON.stringify(sampleObjectives),
        modules: JSON.stringify(sampleModules),
        duration: '2 weeks',
        requiredReading: JSON.stringify(sampleReading),
        handsOnTasks: JSON.stringify(sampleTasks),
        deliverables: JSON.stringify(sampleDeliverables),
        milestones: JSON.stringify(sampleMilestones),
        status: 'active',
      },
    });

    // Training plan for Carol Lee (onboarding)
    const carolEmp = createdEmployees.find(e => e.employeeId === 'EMP-006');
    if (carolEmp) {
      await db.trainingPlan.create({
        data: {
          employeeId: carolEmp.id,
          title: 'Financial Analyst Onboarding - Finance',
          role: 'Financial Analyst',
          department: 'Finance',
          experience: 'mid',
          objectives: JSON.stringify([
            'Understand financial systems and reporting tools',
            'Complete compliance and data handling training',
            'Learn budgeting and forecasting processes',
          ]),
          modules: JSON.stringify(sampleModules.slice(0, 5)),
          duration: '2 weeks',
          requiredReading: JSON.stringify(sampleReading),
          handsOnTasks: JSON.stringify(sampleTasks),
          deliverables: JSON.stringify(sampleDeliverables),
          milestones: JSON.stringify(sampleMilestones),
          status: 'active',
        },
      });
    }

    // Training plan for David Brown (onboarding)
    const davidEmp = createdEmployees.find(e => e.employeeId === 'EMP-007');
    if (davidEmp) {
      await db.trainingPlan.create({
        data: {
          employeeId: davidEmp.id,
          title: 'Marketing Coordinator Onboarding - Marketing',
          role: 'Marketing Coordinator',
          department: 'Marketing',
          experience: 'junior',
          objectives: JSON.stringify(sampleObjectives),
          modules: JSON.stringify(sampleModules.slice(0, 4)),
          duration: '2 weeks',
          requiredReading: JSON.stringify(sampleReading),
          handsOnTasks: JSON.stringify(sampleTasks),
          deliverables: JSON.stringify(sampleDeliverables),
          milestones: JSON.stringify(sampleMilestones),
          status: 'active',
        },
      });
    }

    // Create sample assessments
    const sampleQuestions = [
      {
        id: 'q1', type: 'multiple_choice',
        question: 'What should you do if you suspect a security incident?',
        options: ['Ignore it', 'Report it immediately to the security team', 'Try to fix it yourself', 'Wait and see what happens'],
        correctAnswer: 'Report it immediately to the security team',
        explanation: 'All security incidents should be reported immediately to minimize potential damage.',
        points: 10,
      },
      {
        id: 'q2', type: 'multiple_choice',
        question: 'Which of the following is a strong password?',
        options: ['password123', 'MyDog2024', 'X#9kL!mP2$vR@nQ', 'companyname01'],
        correctAnswer: 'X#9kL!mP2$vR@nQ',
        explanation: 'Strong passwords contain a mix of letters, numbers, and special characters.',
        points: 10,
      },
      {
        id: 'q3', type: 'multiple_choice',
        question: 'How often should passwords be updated?',
        options: ['Never', 'Every 90 days or if compromised', 'Once a year', 'Only when forgotten'],
        correctAnswer: 'Every 90 days or if compromised',
        explanation: 'Regular password updates help maintain security.',
        points: 10,
      },
      {
        id: 'q4', type: 'multiple_choice',
        question: 'What is the correct action for a suspicious email?',
        options: ['Click links to verify', 'Reply to the sender', 'Report to IT security', 'Forward to colleagues'],
        correctAnswer: 'Report to IT security',
        explanation: 'Suspicious emails should be reported to IT security without clicking any links.',
        points: 10,
      },
      {
        id: 'q5', type: 'multiple_choice',
        question: 'Which data handling practice is correct?',
        options: ['Share freely with anyone', 'Use personal cloud storage', 'Follow data classification policy', 'Email to personal account'],
        correctAnswer: 'Follow data classification policy',
        explanation: 'All data must be handled according to the data classification policy.',
        points: 10,
      },
    ];

    const assessments = [
      { title: 'Security Fundamentals Assessment', department: 'Engineering', difficulty: 'easy', trainingPlanId: johnPlan.id },
      { title: 'Security Fundamentals Assessment', department: 'Finance', difficulty: 'easy' },
      { title: 'Security Fundamentals Assessment', department: 'Marketing', difficulty: 'easy' },
      { title: 'Engineering Best Practices', department: 'Engineering', difficulty: 'medium' },
      { title: 'HR Compliance Assessment', department: 'HR', difficulty: 'medium' },
    ];

    const createdAssessments = [];
    for (const a of assessments) {
      const assessment = await db.assessment.create({
        data: {
          title: a.title,
          trainingPlanId: a.trainingPlanId || null,
          department: a.department,
          difficulty: a.difficulty,
          questions: JSON.stringify(sampleQuestions),
          passingScore: 70,
          timeLimit: 30,
          learningObjectives: JSON.stringify(['Understand security protocols', 'Know password policies', 'Recognize threats']),
          createdBy: adminUser.id,
        },
      });
      createdAssessments.push(assessment);
    }

    // Create some sample quiz results (for completed employees)
    const completedEmps = createdEmployees.filter(e =>
      ['EMP-001', 'EMP-002', 'EMP-005'].includes(e.employeeId)
    );

    for (const emp of completedEmps) {
      for (const assessment of createdAssessments.slice(0, 2)) {
        const correctCount = Math.floor(Math.random() * 3) + 3;
        const score = Math.round((correctCount / sampleQuestions.length) * 100);
        await db.quizResult.create({
          data: {
            assessmentId: assessment.id,
            employeeId: emp.id,
            score,
            totalQuestions: sampleQuestions.length,
            correctAnswers: correctCount,
            answers: JSON.stringify([]),
            passed: score >= 70,
            completedAt: new Date(),
          },
        });
      }
    }

    // Create sample progress records for John Smith
    for (let i = 0; i < sampleModules.length; i++) {
      const mod = sampleModules[i];
      const status = i < 2 ? 'completed' : i === 2 ? 'in_progress' : 'pending';
      await db.progressRecord.create({
        data: {
          employeeId: testEmp.id,
          moduleTitle: mod.title,
          moduleIndex: i,
          status,
          score: status === 'completed' ? Math.floor(Math.random() * 30) + 70 : null,
          completedAt: status === 'completed' ? new Date() : null,
          notes: status === 'completed' ? 'Module completed successfully' : null,
        },
      });
    }

    // Create sample certificates for completed employees
    await db.certificate.create({
      data: {
        employeeId: adminEmp.id,
        title: 'System Administration Onboarding Completion',
        description: 'Successfully completed all onboarding requirements for System Administrator role',
        status: 'approved',
        approvedBy: adminUser.id,
        approvedAt: new Date('2024-01-29'),
      },
    });

    await db.certificate.create({
      data: {
        employeeId: hrEmp.id,
        title: 'HR Manager Onboarding Completion',
        description: 'Successfully completed all onboarding requirements for HR Manager role',
        status: 'approved',
        approvedBy: adminUser.id,
        approvedAt: new Date('2024-02-15'),
      },
    });

    // Create system settings
    const defaultSettings = [
      { key: 'onboarding_duration_weeks', value: '4', type: 'number', description: 'Default onboarding duration in weeks' },
      { key: 'assessment_passing_score', value: '70', type: 'number', description: 'Default passing score' },
      { key: 'max_retries', value: '3', type: 'number', description: 'Maximum quiz retry attempts' },
      { key: 'enable_ai_generation', value: 'true', type: 'boolean', description: 'Enable AI plan generation' },
      { key: 'enable_rag_search', value: 'true', type: 'boolean', description: 'Enable RAG handbook search' },
      { key: 'auto_approve_certificates', value: 'false', type: 'boolean', description: 'Auto-approve certificates' },
      { key: 'company_name', value: 'Enterprise Corp', type: 'string', description: 'Company name' },
      { key: 'welcome_message', value: 'Welcome to the team!', type: 'string', description: 'Welcome message' },
    ];

    for (const setting of defaultSettings) {
      await db.systemSetting.create({ data: setting });
    }

    // Create audit logs for seeding
    await logAudit(adminUser.id, 'SEED_DATA', 'System', 'Database seeded with sample data');

    const adminToken = await generateToken({ userId: adminUser.id, email: adminUser.email, role: adminUser.role });
    const hrToken = await generateToken({ userId: hrUser.id, email: hrUser.email, role: hrUser.role });
    const empToken = await generateToken({ userId: empUser.id, email: empUser.email, role: empUser.role });

    return NextResponse.json({
      message: 'Database seeded successfully',
      stats: {
        departments: departments.length,
        users: 10,
        employees: createdEmployees.length,
        policies: policies.length,
        trainingPlans: 3,
        assessments: createdAssessments.length,
        certificates: 2,
      },
      testAccounts: {
        admin: { email: 'admin@enterprise.com', password: 'admin123', token: adminToken },
        hr: { email: 'hr@enterprise.com', password: 'hr123', token: hrToken },
        employee: { email: 'employee@enterprise.com', password: 'emp123', token: empToken },
      },
    });
  } catch (error) {
    console.error('Seed error:', error);
    return serverErrorResponse('Failed to seed database');
  }
}