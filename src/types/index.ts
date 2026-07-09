export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'hr' | 'employee';
  avatar?: string;
  isActive: boolean;
  createdAt: string;
  employee?: Employee;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  headName?: string;
  isActive: boolean;
  employeeCount?: number;
  policyCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  userId: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  departmentId?: string;
  department?: Department;
  position: string;
  role: string;
  experience: string;
  skills: string;
  securityLevel: string;
  status: string;
  joinDate: string;
  onboardingStart?: string;
  onboardingEnd?: string;
  managerId?: string;
  manager?: Employee;
  user?: User;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingModule {
  title: string;
  description: string;
  duration: string;
  type: string;
  content: string | string[];
}

export interface Milestone {
  title: string;
  description: string;
  targetDate: string;
  completed: boolean;
}

export interface TrainingPlan {
  id: string;
  employeeId: string;
  employee?: Employee;
  title: string;
  role: string;
  department: string;
  experience: string;
  objectives: string;
  modules: string;
  duration: string;
  requiredReading: string;
  handsOnTasks: string;
  deliverables: string;
  milestones: string;
  status: string;
  generatedAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'short_answer' | 'practical';
  options?: string[];
  correctAnswer?: string;
  evaluationCriteria?: string;
  difficulty: string;
  learningObjective: string;
  points: number;
}

export interface Assessment {
  id: string;
  title: string;
  trainingPlanId?: string;
  department?: string;
  difficulty: string;
  questions: string;
  passingScore: number;
  timeLimit?: number;
  learningObjectives: string;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuizResult {
  id: string;
  assessmentId: string;
  assessment?: Assessment;
  employeeId: string;
  employee?: Employee;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  answers: string;
  passed: boolean;
  timeTaken?: number;
  startedAt: string;
  completedAt?: string;
}

export interface Certificate {
  id: string;
  employeeId: string;
  employee?: Employee;
  title: string;
  description: string;
  trainingPlanId?: string;
  assessmentId?: string;
  issuedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  status: string;
  certificateUrl?: string;
}

export interface ProgressRecord {
  id: string;
  employeeId: string;
  moduleTitle: string;
  moduleIndex: number;
  status: string;
  score?: number;
  completedAt?: string;
  notes?: string;
}

export interface Policy {
  id: string;
  title: string;
  description?: string;
  content: string;
  category: string;
  departmentId?: string;
  department?: Department;
  version: string;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Handbook {
  id: string;
  title: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  isActive: boolean;
  createdAt: string;
  embeddingCount?: number;
}

export interface AuditLog {
  id: string;
  userId?: string;
  user?: User;
  action: string;
  resource: string;
  details?: string;
  ipAddress?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalEmployees: number;
  completedOnboarding: number;
  pendingOnboarding: number;
  complianceScore: number;
  avgAssessmentScore: number;
  trainingCompletion: number;
  departmentStats: { name: string; count: number }[];
  recentActivities: { id: string; action: string; user: string; timestamp: string; details: string }[];
}

export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  type: string;
  description?: string;
}

export type NavItem = {
  id: string;
  label: string;
  icon: string;
  roles: string[];
};