# Architecture

## System Overview

The Enterprise AI Onboarding Platform is a monolithic Next.js 16 application following the App Router pattern. It serves both the frontend SPA and the REST API from a single process, backed by a SQLite database managed through Prisma ORM. AI capabilities are provided by the `z-ai-web-dev-sdk` for onboarding plan generation and assessment creation. A simulated embedding pipeline enables RAG-based document search without external vector database dependencies.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Dashboard │  │ Employees│  │Onboarding│  │  Assessments  │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬────────┘  │
│       │             │              │               │           │
│  ┌────┴─────────────┴──────────────┴───────────────┴────────┐  │
│  │            Framer Motion + shadcn/ui + Tailwind CSS 4    │  │
│  └────────────────────────┬────────────────────────────────┘  │
│                           │ HTTP / JSON                        │
│                    ┌──────┴──────┐                             │
│                    │  Zustand    │  Client State               │
│                    │ TanStack    │  Server State Cache         │
│                    └─────────────┘                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                     ┌───────┴───────┐
                     │   Caddy /     │  Reverse Proxy / Gateway
                     │   Nginx       │
                     └───────┬───────┘
                             │
┌────────────────────────────┴────────────────────────────────────┐
│                  Next.js 16 (App Router)                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    API Routes (29)                        │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐  │   │
│  │  │ Auth   │ │Employees│ │Onboard │ │  RAG   │ │ Assess │  │   │
│  │  │ Guards │ │  CRUD  │ │AI Gen  │ │Search  │ │  Quiz  │  │   │
│  │  └────────┘ └────────┘ └────┬───┘ └────────┘ └────────┘  │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐  │   │
│  │  │Certif. │ │Progress│ │ Admin  │ │ Seed   │ │  API   │  │   │
│  │  │Mgmt    │ │Tracking│ │ Panel  │ │        │ │Services│  │   │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                  │
│  ┌──────────┐  ┌────────────┴───────────┐  ┌───────────────┐  │
│  │ Auth Lib │  │    Prisma Client       │  │ Audit Logger  │  │
│  │ (jose)   │  │    (SQLite ORM)        │  │ (non-blocking)│  │
│  └──────────┘  └────────────┬───────────┘  └───────────────┘  │
│                               │                                 │
│  ┌────────────────────────────┴──────────────────────────────┐  │
│  │                    z-ai-web-dev-sdk                        │  │
│  │          (AI Onboarding + Assessment Generation)           │  │
│  └───────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    │  SQLite (file)  │  custom.db
                    │  15 tables      │
                    └─────────────────┘
```

## Frontend Architecture

### Component Hierarchy

```
App (layout.tsx)
├── AuthProvider (AuthContext)
├── ThemeProvider (next-themes)
├── ToastProvider (sonner)
│
├── LoginPage          (unauthenticated)
├── RegisterPage       (unauthenticated)
│
└── Main Layout        (authenticated)
    ├── Header         (user menu, notifications, theme toggle)
    ├── Sidebar        (role-based navigation, Framer Motion)
    │
    ├── Dashboard          (charts, stats, activity feed)
    ├── EmployeeManagement (table, search, CRUD modals)
    ├── OnboardingGenerator (AI form, plan preview)
    ├── RAGDocuments       (upload, search, results)
    ├── Assessments        (list, take quiz, results)
    ├── ProgressTracking   (module cards, progress bars)
    ├── Certificates       (list, approve/reject, generate)
    └── AdminPanel         (tabs: departments, policies, settings, analytics, audit)
```

### State Management

| Concern | Tool | Scope |
|---------|------|-------|
| Auth state (user, token, role) | `AuthContext` (React Context) | Global, persisted in localStorage |
| Server data (API responses) | `TanStack Query` | Cached, auto-refetched, stale-while-revalidate |
| UI state (modals, filters) | Component `useState` | Local |
| Optimistic updates | TanStack `useMutation` | Per-mutation |

### Routing

The application uses a single-page architecture. All views are rendered client-side within `/src/app/page.tsx` based on the authenticated user's role and selected navigation item. There are no additional Next.js routes — all routing is handled by the `AuthContext`-driven view switcher.

## Backend Architecture

### API Route Organization

All routes live under `src/app/api/` and follow Next.js 16 App Router conventions. Each route file exports named HTTP method handlers (`GET`, `POST`, `PUT`, `DELETE`).

### Middleware Pattern

Authentication is enforced at the route level using guard functions from `src/lib/auth.ts`:

- **`verifyToken(request)`** — Extracts and validates the JWT from the `Authorization` header. Returns a `TokenPayload` or `null`.
- **`requireRole(request, ...roles)`** — Verifies the token AND checks role membership. Returns either `{ success: true, payload }` or `{ success: false, response }` (401/403).

### Service Layer

Business logic lives directly in route handlers. Shared utilities are in `src/lib/`:

| File | Purpose |
|------|---------|
| `auth.ts` | JWT sign/verify (jose), bcrypt hashing, role guards, HTTP error helpers |
| `db.ts` | Prisma Client singleton with hot-reload safety |
| `audit.ts` | Non-blocking `logAudit()` function that writes to `AuditLog` table |
| `utils.ts` | General-purpose utility functions (cn, etc.) |

## Database Schema

The platform uses **15 tables** defined in `prisma/schema.prisma`:

### Core Tables

| Table | Key Fields | Relationships |
|-------|-----------|---------------|
| **User** | `id`, `email`, `password`, `name`, `role`, `avatar`, `isActive` | → `Employee` (1:1), `AuditLog` (1:N), `Session` (1:N) |
| **Session** | `id`, `userId`, `token`, `expiresAt` | ← `User` |
| **Department** | `id`, `name`, `description`, `headName`, `isActive` | → `Employee` (1:N), `Policy` (1:N) |
| **Employee** | `id`, `userId`, `employeeId`, `firstName`, `lastName`, `email`, `phone`, `position`, `role`, `experience`, `skills` (JSON), `securityLevel`, `status`, `joinDate`, `onboardingStart`, `onboardingEnd`, `managerId` | ← `User`, ← `Department`, → `Employee` (self-ref: manager/reports), → `TrainingPlan`, `QuizResult`, `Certificate`, `ProgressRecord` (all 1:N) |

### Training & Assessment Tables

| Table | Key Fields | Relationships |
|-------|-----------|---------------|
| **TrainingPlan** | `id`, `employeeId`, `title`, `role`, `department`, `experience`, `objectives` (JSON), `modules` (JSON), `duration`, `requiredReading` (JSON), `handsOnTasks` (JSON), `deliverables` (JSON), `milestones` (JSON), `status`, `generatedAt`, `completedAt` | ← `Employee` |
| **Assessment** | `id`, `title`, `trainingPlanId`, `department`, `difficulty`, `questions` (JSON), `passingScore`, `timeLimit`, `learningObjectives` (JSON), `isActive`, `createdBy` | → `QuizResult` (1:N) |
| **QuizResult** | `id`, `assessmentId`, `employeeId`, `score`, `totalQuestions`, `correctAnswers`, `answers` (JSON), `passed`, `timeTaken`, `startedAt`, `completedAt` | ← `Assessment`, ← `Employee` |

### Progress & Certification Tables

| Table | Key Fields | Relationships |
|-------|-----------|---------------|
| **ProgressRecord** | `id`, `employeeId`, `moduleTitle`, `moduleIndex`, `status`, `score`, `completedAt`, `notes` | ← `Employee` |
| **Certificate** | `id`, `employeeId`, `title`, `description`, `trainingPlanId`, `assessmentId`, `issuedAt`, `approvedBy`, `approvedAt`, `status`, `certificateUrl` | ← `Employee` |

### Knowledge Base Tables

| Table | Key Fields | Relationships |
|-------|-----------|---------------|
| **Handbook** | `id`, `title`, `fileName`, `fileUrl`, `fileType`, `fileSize`, `content`, `uploadedBy`, `isActive` | → `Embedding` (1:N) |
| **Embedding** | `id`, `handbookId`, `chunkIndex`, `content`, `embedding` (JSON string of floats) | ← `Handbook` |
| **Policy** | `id`, `title`, `description`, `content`, `category`, `departmentId`, `version`, `isActive`, `createdBy` | ← `Department` |

### System Tables

| Table | Key Fields | Relationships |
|-------|-----------|---------------|
| **AuditLog** | `id`, `userId`, `action`, `resource`, `details`, `ipAddress`, `userAgent`, `createdAt` | ← `User` |
| **SystemSetting** | `id`, `key` (unique), `value`, `type`, `description` | None |

## Authentication Flow

```
Client                    Server                      Database
  │                         │                            │
  │  POST /api/auth/login   │                            │
  │  { email, password }    │                            │
  │────────────────────────>│                            │
  │                         │  Find user by email        │
  │                         │───────────────────────────>│
  │                         │  User record               │
  │                         │<───────────────────────────│
  │                         │  bcrypt.compare(password)   │
  │                         │  Check isActive             │
  │                         │                            │
  │                         │  jose.SignJWT({userId,      │
  │                         │    email, role})            │
  │                         │  Create Session record      │
  │                         │───────────────────────────>│
  │  { user, token, role }  │                            │
  │<────────────────────────│                            │
  │                         │                            │
  │  GET /api/dashboard     │                            │
  │  Authorization: Bearer  │                            │
  │────────────────────────>│                            │
  │                         │  jose.jwtVerify(token)      │
  │                         │  Extract payload            │
  │                         │  Query dashboard data       │
  │                         │───────────────────────────>│
  │  { stats, activities }  │                            │
  │<────────────────────────│                            │
```

**Token Details:**
- Algorithm: HS256
- Expiry: 7 days
- Payload: `{ userId, email, role, iat, exp }`
- Sessions are tracked in the `Session` table

## AI Integration Flow

### Onboarding Plan Generation

```
HR/Admin selects employee → POST /api/onboarding/generate
  → Load employee profile (or use provided data)
  → Build prompt with role, department, experience, skills, security level
  → z-ai-web-dev-sdk chat.completions.create()
  → Parse JSON response (extract from markdown fences if needed)
  → Store as TrainingPlan (JSON fields stringified)
  → Update employee status to "onboarding"
  → Return raw plan + DB record
  → Fallback: template-based plan if AI fails
```

### Assessment Generation

```
HR/Admin → POST /api/assessments { generate: true, department, difficulty, topics }
  → Build prompt with department context and difficulty level
  → z-ai-web-dev-sdk chat.completions.create()
  → Parse JSON (10 questions with options, correct answers, explanations)
  → Store as Assessment
  → Fallback: pre-built question templates
```

## RAG Pipeline Flow

```
1. UPLOAD:  POST /api/rag/upload (multipart file)
   → Save file to /uploads/handbooks/
   → Extract text (TXT: direct read; PDF/DOCX: best-effort extraction)
   → Chunk text by sentences (~1000 chars per chunk)
   → Generate simulated 128-dim embeddings per chunk
   → Store Handbook + Embedding[] records

2. SEARCH:  POST /api/rag/search { query, handbookId?, topK? }
   → Generate query embedding (same 128-dim simulation)
   → Fetch all embeddings (optionally filtered by handbook)
   → Compute cosine similarity between query and each chunk
   → Sort by score descending, return top-K results
   → Concatenate results into combined context string
```

> **Note:** The current implementation uses deterministic simulated embeddings rather than a production embedding model. For production use, replace `generateSimulatedEmbedding()` and `generateQueryEmbedding()` with calls to a real embedding API (e.g., OpenAI `text-embedding-3-small`).

## Security Measures

- **Password Hashing:** bcrypt with 10 salt rounds
- **JWT Tokens:** HS256 signed with configurable secret, 7-day expiry
- **Role-Based Access Control:** Three tiers — `admin` (full access), `hr` (employee management, assessments, certificates), `employee` (own data only)
- **Input Validation:** Email format, password length, required fields checked server-side
- **Audit Logging:** Every mutating operation is logged with user ID, IP address, and user agent
- **Data Isolation:** Employees can only access their own records (progress, certificates, quiz results)
- **Non-blocking Audit:** Audit failures do not break the main request flow
- **File Upload Restrictions:** Only `.pdf`, `.docx`, `.txt` accepted; files stored outside web root
- **Query Parameter Injection:** Prisma ORM prevents SQL injection; all dynamic queries use parameterized inputs

## Deployment Architecture

```
Internet → [Nginx :80] → [Next.js :3000]
                              │
                         [SQLite file]
                         [Uploads dir]
```

For production with CI/CD:

```
GitHub Push → GitHub Actions → Docker Build → Push to Registry → EC2 Pull & Deploy
```