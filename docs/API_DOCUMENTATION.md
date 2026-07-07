# API Documentation

Complete reference for all 29 API endpoints in the Enterprise AI Onboarding Platform.

**Base URL:** `http://localhost:3000`

**Authentication:** All protected endpoints require a JWT token in the `Authorization` header:

```
Authorization: Bearer <token>
```

**Common Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| `400` | `{ error: "string" }` | Bad request — missing or invalid fields |
| `401` | `{ error: "Unauthorized" }` | Missing or invalid token |
| `403` | `{ error: "Forbidden: Insufficient permissions" }` | Role does not have access |
| `404` | `{ error: "<Resource> not found" }` | Resource does not exist |
| `500` | `{ error: "Internal server error" }` | Unexpected server error |

---

## 1. Authentication

### POST /api/auth/login

Authenticate a user and receive a JWT token.

**Auth:** None (public)

**Request Body:**

```typescript
{
  email: string;    // Required
  password: string; // Required
}
```

**Response (200):**

```typescript
{
  user: {
    id: string;
    email: string;
    name: string;
    role: "admin" | "hr" | "employee";
    avatar: string | null;
    isActive: boolean;
    createdAt: string;
    employee?: Employee;
  };
  token: string;
  role: string;
}
```

**Example:**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@enterprise.com","password":"admin123"}'
```

**Error Responses:** `400` (missing fields or deactivated account), `401` (invalid credentials)

---

### POST /api/auth/register

Register a new user and auto-create an employee record.

**Auth:** None (public)

**Request Body:**

```typescript
{
  email: string;    // Required, valid email format
  password: string; // Required, min 6 characters
  name: string;     // Required
  role?: "admin" | "hr" | "employee"; // Optional, defaults to "employee"
}
```

**Response (201):**

```typescript
{
  user: User & { employee: Employee };
  token: string;
}
```

**Error Responses:** `400` (missing fields, invalid email, email already registered, password too short)

---

### GET /api/auth/me

Get the currently authenticated user with full profile.

**Auth:** JWT (any role)

**Response (200):**

```typescript
{
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    avatar: string | null;
    isActive: boolean;
    createdAt: string;
    employee?: {
      id: string;
      employeeId: string;
      firstName: string;
      lastName: string;
      email: string;
      position: string;
      department?: { id: string; name: string };
      manager?: { id: string; firstName: string; lastName: string; employeeId: string };
      // ... other employee fields
    };
  };
}
```

---

## 2. Dashboard

### GET /api/dashboard

Retrieve aggregated dashboard statistics for the authenticated user.

**Auth:** JWT (any role)

**Query Parameters:** None

**Response (200):**

```typescript
{
  totalEmployees: number;
  completedOnboarding: number;
  pendingOnboarding: number;
  complianceScore: number;      // 0-100
  avgAssessmentScore: number;   // 0-100
  trainingCompletion: number;   // 0-100
  departmentStats: { id: string; name: string; _count: { employees: number } }[];
  recentActivities: {
    id: string;
    action: string;
    user: { id: string; name: string; email: string };
    timestamp: string;
    details: string;
  }[];
}
```

---

## 3. Employees

### GET /api/employees

List employees with search, filtering, and pagination.

**Auth:** JWT (admin, hr)

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `search` | `string` | Search by name, email, or employee ID |
| `departmentId` | `string` | Filter by department |
| `status` | `string` | Filter by status (`active`, `onboarding`, `completed`, `inactive`) |
| `role` | `string` | Filter by role |
| `page` | `number` | Page number (default: 1) |
| `limit` | `number` | Items per page (default: 20) |

**Response (200):**

```typescript
{
  employees: Employee[];  // Includes department, manager, _count (trainingPlans, quizResults, certificates, progressRecords)
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
```

---

### POST /api/employees

Create a new employee (and associated user account).

**Auth:** JWT (admin, hr)

**Request Body:**

```typescript
{
  firstName: string;      // Required
  lastName: string;       // Required
  email: string;          // Required, valid email
  position: string;       // Required
  phone?: string;
  departmentId?: string;
  role?: string;           // defaults to "employee"
  experience?: string;     // "junior" | "mid" | "senior" | "lead"
  skills?: string[];       // Array of skill names
  securityLevel?: string;  // "standard" | "elevated" | "privileged"
  managerId?: string;
}
```

**Response (201):**

```typescript
{
  employee: Employee;
  token: string;  // Auto-generated JWT for the new user
}
```

> **Note:** Default password for new employees is `changeme123`.

---

### GET /api/employees/[id]

Get a single employee's full profile including training plans, quiz results, certificates, and progress records.

**Auth:** JWT (admin, hr, employee — employees can only access their own record)

**Response (200):** `{ employee: Employee }` with all nested relations included.

**Error Responses:** `403` (employee accessing another's record), `404` (not found)

---

### PUT /api/employees/[id]

Update an employee's profile fields.

**Auth:** JWT (admin, hr)

**Request Body (all fields optional):**

```typescript
{
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  departmentId?: string | null;
  position?: string;
  role?: string;
  experience?: string;
  skills?: string[];
  securityLevel?: string;
  status?: string;
  onboardingStart?: string;  // ISO date
  onboardingEnd?: string;    // ISO date
  managerId?: string | null;
}
```

**Response (200):** `{ employee: Employee }`

---

### DELETE /api/employees/[id]

Delete an employee and all associated data.

**Auth:** JWT (admin only)

**Response (200):** `{ message: "Employee deleted successfully" }`

---

### GET /api/employees/[id]/onboarding

Get an employee's full onboarding plan with module-level progress.

**Auth:** JWT (admin, hr, employee)

**Response (200):**

```typescript
{
  employee: { id: string; firstName: string; lastName: string; /* ... */ };
  onboardingPlan: {
    id: string;
    title: string;
    role: string;
    department: string;
    experience: string;
    duration: string;
    status: string;
    objectives: object[];
    modules: (OnboardingModule & { index: number; progress: { status: string; score: number | null; completedAt: string | null } })[];
    milestones: object[];
    requiredReading: object[];
    handsOnTasks: object[];
    deliverables: object[];
  } | null;
  progress: {
    completedModules: number;
    totalModules: number;
    overallProgress: number;   // 0-100
    avgScore: number | null;
    assessments: number;
    certificates: number;
    passedAssessments: number;
  };
}
```

---

## 4. AI Onboarding

### POST /api/onboarding/generate

Generate an AI-powered onboarding plan for an employee.

**Auth:** JWT (admin, hr)

**Request Body:**

```typescript
{
  employeeId?: string;     // If provided, profile is loaded from DB
  // OR provide profile data directly:
  position?: string;       // Required if no employeeId
  department?: string;     // Required if no employeeId
  name?: string;
  experience?: string;
  skills?: string;
  securityLevel?: string;
}
```

**Response (201):**

```typescript
{
  plan: TrainingPlan;      // Stored DB record (JSON fields stringified)
  generated: {             // Raw AI output
    title: string;
    objectives: string[];
    modules: { title: string; description: string; duration: string; type: string; content: string }[];
    milestones: { title: string; description: string; targetDay: number }[];
    deliverables: { title: string; description: string; dueBy: string }[];
    requiredReading: { title: string; type: string; priority: string }[];
    handsOnTasks: { title: string; description: string; estimatedHours: number }[];
    estimatedDuration: string;
  };
}
```

> **Note:** Falls back to a template-based plan if AI generation fails.

---

## 5. RAG Documents

### POST /api/rag/upload

Upload a handbook document for RAG processing (chunking + embedding).

**Auth:** JWT (admin, hr)

**Request:** `multipart/form-data` with a `file` field.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | `File` | Yes | PDF, DOCX, or TXT (max 50MB via Nginx) |

**Response (201):**

```typescript
{
  message: string;
  handbookId: string;
  title: string;
  chunksProcessed: number;
  fileSize: number;
}
```

---

### POST /api/rag/search

Perform semantic search across uploaded handbooks using cosine similarity.

**Auth:** JWT (any role)

**Request Body:**

```typescript
{
  query: string;        // Required — search query text
  handbookId?: string;  // Optional — scope to specific handbook
  topK?: number;        // Optional — number of results (1-20, default: 5)
}
```

**Response (200):**

```typescript
{
  query: string;
  results: {
    content: string;
    chunkIndex: number;
    relevanceScore: number;   // 0.0 - 1.0
    handbook: { id: string; title: string; fileName: string };
  }[];
  context: string;           // Combined context of all results
  totalChunks: number;
}
```

---

### GET /api/rag/handbooks

List all uploaded handbooks.

**Auth:** JWT (any role)

**Response (200):**

```typescript
{
  handbooks: {
    id: string;
    title: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    uploadedBy: string;
    isActive: boolean;
    createdAt: string;
    _count: { embeddings: number };
  }[];
}
```

---

### DELETE /api/rag/handbooks

Delete a handbook and its embeddings.

**Auth:** JWT (admin only)

**Query Parameters:** `id` (string, required) — Handbook ID

**Response (200):** `{ message: "Handbook deleted successfully" }`

---

## 6. Assessments

### GET /api/assessments

List assessments with filtering and pagination.

**Auth:** JWT (any role)

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `department` | `string` | Filter by department |
| `difficulty` | `string` | Filter by difficulty (`easy`, `medium`, `hard`) |
| `isActive` | `boolean` | Filter by active status |
| `page` | `number` | Page number |
| `limit` | `number` | Items per page |

**Response (200):**

```typescript
{
  assessments: (Assessment & { _count: { quizResults: number } })[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
```

---

### POST /api/assessments

Create a new assessment or AI-generate one.

**Auth:** JWT (admin, hr)

**Request Body (manual creation):**

```typescript
{
  title: string;                // Required
  questions: QuizQuestion[];    // Required — array of question objects
  trainingPlanId?: string;
  department?: string;
  difficulty?: string;          // "easy" | "medium" | "hard"
  passingScore?: number;        // Default: 70
  timeLimit?: number;           // Minutes
  learningObjectives?: string[];
}
```

**Request Body (AI generation):**

```typescript
{
  generate: true;               // Required to trigger AI
  department: string;           // Required
  difficulty?: string;          // Default: "medium"
  topics?: string[];            // Optional topic focus areas
}
```

**Response (201):** `{ assessment: Assessment }`

---

### GET /api/assessments/[id]

Get a single assessment. Employee role excludes `correctAnswer` and `explanation` from questions.

**Auth:** JWT (any role)

**Response (200):** `{ assessment: Assessment }`

---

### PUT /api/assessments/[id]

Update an assessment.

**Auth:** JWT (admin, hr)

**Request Body (all fields optional):**

```typescript
{
  title?: string;
  department?: string;
  difficulty?: string;
  questions?: QuizQuestion[];
  passingScore?: number;
  timeLimit?: number | null;
  learningObjectives?: string[];
  isActive?: boolean;
}
```

**Response (200):** `{ assessment: Assessment }`

---

### DELETE /api/assessments/[id]

Delete an assessment and all associated quiz results.

**Auth:** JWT (admin only)

**Response (200):** `{ message: "Assessment deleted successfully" }`

---

### POST /api/assessments/[id]/submit

Submit answers for an assessment and receive auto-graded results.

**Auth:** JWT (any role)

**Request Body:**

```typescript
{
  answers: {
    questionId: string;
    answer: string;
  }[];
}
```

**Response (200):**

```typescript
{
  score: number;              // 0-100
  passed: boolean;
  correctAnswers: number;
  totalQuestions: number;
  passingScore: number;
  results: {
    questionId: string;
    correct: boolean;
    userAnswer: string;
    correctAnswer: string;
    points: number;
  }[];
  quizResult: QuizResult;     // Stored DB record
}
```

---

## 7. Certificates

### GET /api/certificates

List certificates with filtering. Employees can only see their own.

**Auth:** JWT (any role)

**Query Parameters:** `status`, `employeeId`, `page`, `limit`

**Response (200):**

```typescript
{
  certificates: (Certificate & { employee: { id: string; firstName: string; lastName: string; email: string; employeeId: string; department: { name: string } } })[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
```

---

### POST /api/certificates/generate

Generate and auto-approve a certificate for an employee.

**Auth:** JWT (admin, hr)

**Request Body:**

```typescript
{
  employeeId: string;     // Required
  title: string;          // Required
  description?: string;
  trainingPlanId?: string;
  assessmentId?: string;
}
```

**Response (201):** `{ certificate: Certificate }`

> Generated certificates are auto-approved with `status: "approved"`.

---

### GET /api/certificates/[id]

Get a single certificate with full employee details.

**Auth:** JWT (any role)

**Response (200):** `{ certificate: Certificate & { employee: Employee & { department: Department } } }`

---

### POST /api/certificates/[id]/approve

Approve a pending certificate.

**Auth:** JWT (admin, hr)

**Response (200):** `{ certificate: Certificate }`

**Error Responses:** `400` (certificate already processed), `404` (not found)

---

### POST /api/certificates/[id]/reject

Reject a pending certificate.

**Auth:** JWT (admin, hr)

**Response (200):** `{ certificate: Certificate }`

---

## 8. Progress Tracking

### GET /api/progress/[employeeId]

Get comprehensive progress data for an employee.

**Auth:** JWT (any role — employees can only access their own)

**Response (200):**

```typescript
{
  employee: { id: string; firstName: string; /* ... */ };
  trainingPlan: { id: string; title: string; duration: string; status: string } | null;
  progress: {
    completedModules: number;
    totalModules: number;
    overallProgress: number;     // 0-100
    avgQuizScore: number | null;
    totalAssessments: number;
    passedAssessments: number;
    totalCertificates: number;
    approvedCertificates: number;
  };
  modules: (OnboardingModule & { index: number; progress: { status: string; score: number | null; completedAt: string | null; notes: string | null } })[];
  quizResults: QuizResult[];
  certificates: Certificate[];
}
```

---

### POST /api/progress/[employeeId]/update

Update progress for a specific module. Auto-completes the training plan when all modules are done.

**Auth:** JWT (any role — employees can only update their own)

**Request Body:**

```typescript
{
  moduleTitle: string;      // Required
  moduleIndex: number;      // Required
  status: "pending" | "in_progress" | "completed";  // Required
  score?: number;           // Optional
  notes?: string;           // Optional
}
```

**Response (200):**

```typescript
{
  progressRecord: ProgressRecord;
  overallProgress: number;
  completedModules: number;
  totalModules: number;
}
```

> When `overallProgress` reaches 100%, the training plan status is set to `completed` and the employee status is updated to `completed` with `onboardingEnd` set to the current time.

---

## 9. Admin

### GET /api/admin/departments

List all departments with employee and policy counts.

**Auth:** JWT (admin, hr)

**Response (200):**

```typescript
{
  departments: (Department & { _count: { employees: number; policies: number } })[];
}
```

---

### POST /api/admin/departments

Create a new department.

**Auth:** JWT (admin only)

**Request Body:**

```typescript
{
  name: string;           // Required, unique
  description?: string;
  headName?: string;
}
```

**Response (201):** `{ department: Department }`

---

### PUT /api/admin/departments/[id]

Update a department.

**Auth:** JWT (admin only)

**Request Body (all optional):** `{ name?: string; description?: string; headName?: string; isActive?: boolean }`

**Response (200):** `{ department: Department }`

---

### DELETE /api/admin/departments/[id]

Delete a department. Fails if the department has employees.

**Auth:** JWT (admin only)

**Response (200):** `{ message: "Department deleted successfully" }`

**Error Responses:** `400` (department has employees)

---

### GET /api/admin/policies

List policies with filtering and pagination.

**Auth:** JWT (any role)

**Query Parameters:** `category`, `departmentId`, `page`, `limit`

**Response (200):**

```typescript
{
  policies: (Policy & { department?: { id: string; name: string } })[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
```

---

### POST /api/admin/policies

Create a new policy.

**Auth:** JWT (admin, hr)

**Request Body:**

```typescript
{
  title: string;           // Required
  content: string;         // Required
  description?: string;
  category?: string;       // "security" | "compliance" | "hr" | "it" | "engineering" | "general"
  departmentId?: string;
  version?: string;        // Default: "1.0"
}
```

**Response (201):** `{ policy: Policy }`

---

### PUT /api/admin/policies/[id]

Update a policy.

**Auth:** JWT (admin, hr)

**Request Body (all optional):** `{ title?: string; content?: string; description?: string; category?: string; departmentId?: string; version?: string; isActive?: boolean }`

**Response (200):** `{ policy: Policy }`

---

### DELETE /api/admin/policies/[id]

Delete a policy.

**Auth:** JWT (admin only)

**Response (200):** `{ message: "Policy deleted successfully" }`

---

### GET /api/admin/settings

Get all system settings (returns defaults for missing keys).

**Auth:** JWT (admin only)

**Response (200):**

```typescript
{
  settings: Record<string, {
    key: string;
    value: string;
    type: "string" | "number" | "boolean" | "json";
    description: string;
  }>;
}
```

---

### PUT /api/admin/settings

Update system settings. Accepts partial updates.

**Auth:** JWT (admin only)

**Request Body:**

```typescript
{
  settings?: Record<string, string>;
  // Or flat: { onboarding_duration_weeks: "4", enable_ai_generation: "true" }
}
```

**Response (200):** `{ settings: SystemSetting[]; updated: number }`

---

### GET /api/admin/analytics

Get comprehensive platform analytics.

**Auth:** JWT (admin, hr)

**Response (200):**

```typescript
{
  overview: {
    totalEmployees: number;
    onboardingRate: number;
    trainingCompletionRate: number;
    assessmentPassRate: number;
    avgAssessmentScore: number;
    certificateApprovalRate: number;
  };
  employees: {
    byStatus: { status: string; count: number }[];
    byDepartment: { department: string; count: number }[];
    byExperience: { experience: string; count: number }[];
  };
  training: { totalPlans: number; activePlans: number; completedPlans: number };
  assessments: {
    total: number; totalAttempts: number; passed: number;
    stats: { id: string; title: string; totalAttempts: number; avgScore: number; passRate: number }[];
  };
  certificates: { total: number; approved: number; pending: number };
  knowledgeBase: { policies: number; handbooks: number };
  recentOnboardings: Employee[];
  monthlyTrend: { joinDate: Date; _count: number }[];
}
```

---

### GET /api/admin/audit-logs

Retrieve audit logs with filtering and aggregation summary.

**Auth:** JWT (admin only)

**Query Parameters:** `userId`, `action`, `resource`, `page`, `limit`

**Response (200):**

```typescript
{
  logs: (AuditLog & { user?: { id: string; name: string; email: string; role: string } })[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  summary: {
    totalActions: number;
    uniqueActions: number;
    actions: { action: string; count: number }[];
    resources: { resource: string; count: number }[];
  };
}
```

---

## 10. Seed

### POST /api/seed

Seed the database with demo data. Only works on an empty database.

**Auth:** None (public)

**Request Body:** None

**Response (200):**

```typescript
{
  message: "Database seeded successfully";
  stats: {
    departments: number;
    users: number;
    employees: number;
    policies: number;
    trainingPlans: number;
    assessments: number;
    certificates: number;
  };
  testAccounts: {
    admin: { email: string; password: string; token: string };
    hr: { email: string; password: string; token: string };
    employee: { email: string; password: string; token: string };
  };
}
```

**Error Responses:** `400` (database already has data)