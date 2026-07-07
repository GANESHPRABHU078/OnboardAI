# Enterprise AI Onboarding Platform

A comprehensive, AI-powered employee onboarding platform built for modern enterprises. Automate onboarding plan generation, track progress, manage assessments, and issue certificates — all through an intelligent, role-based dashboard.

## Key Features

- **AI-Powered Onboarding Plans** — Generate personalized, role-specific onboarding plans using LLM intelligence via `z-ai-web-dev-sdk`
- **RAG Document Knowledge Base** — Upload PDF, DOCX, and TXT handbooks; chunk, embed, and perform semantic search across all documents
- **Adaptive Assessments** — AI-generated quizzes with multiple-choice questions, automatic grading, and pass/fail tracking
- **Role-Based Access Control** — Three-tier authentication system with Admin, HR, and Employee roles using JWT
- **Progress Tracking** — Real-time module-by-module progress monitoring with automatic onboarding completion detection
- **Certificate Management** — Generate, approve, and reject onboarding completion certificates with full audit trails
- **Interactive Dashboard** — Rich analytics with Recharts visualizations: department stats, compliance scores, and activity feeds
- **Employee Management** — Full CRUD operations with search, filtering, pagination, and department assignments
- **Department & Policy Administration** — Manage departments, create organizational policies, and enforce compliance
- **Audit Logging** — Comprehensive audit trail capturing every significant action with IP and user-agent tracking
- **AI Assessment Generation** — Automatically create department-specific quizzes with configurable difficulty levels
- **Responsive Design** — Mobile-first UI built with shadcn/ui, Tailwind CSS 4, and Framer Motion animations
- **Dark Mode Support** — System-aware theme switching via `next-themes`
- **Docker-Ready** — Multi-stage Dockerfile with Nginx reverse proxy and docker-compose for one-command deployment
- **CI/CD Pipeline** — GitHub Actions workflow for automated testing, building, and deployment
- **SQLite with Prisma ORM** — Zero-configuration database with type-safe queries and automatic schema migration
- **Zustand + TanStack Query** — Optimistic client state management combined with server-state caching

## Tech Stack

| Category | Technology | Version |
|----------|-----------|---------|
| Framework | Next.js (App Router) | 16.x |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| UI Library | shadcn/ui (New York) | Latest |
| Animations | Framer Motion | 12.x |
| Charts | Recharts | 2.x |
| Database | SQLite via Prisma ORM | 6.x |
| Authentication | JWT (jose) | 6.x |
| Password Hashing | bcryptjs | 3.x |
| AI Integration | z-ai-web-dev-sdk | 0.0.x |
| Client State | Zustand | 5.x |
| Server State | TanStack Query | 5.x |
| Forms | React Hook Form + Zod | 7.x / 4.x |
| Icons | Lucide React | Latest |
| Runtime | Bun | Latest |
| Containerization | Docker + Docker Compose | Latest |
| Reverse Proxy | Nginx | Alpine |
| CI/CD | GitHub Actions | Latest |

## Quick Start

### Prerequisites

- **Bun** 1.0+ (recommended) or Node.js 20+
- **Git**

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/enterprise-ai-onboarding.git
cd enterprise-ai-onboarding

# Install dependencies
bun install

# Push database schema
bun run db:push

# (Optional) Generate Prisma client
bun run db:generate
```

### Environment Setup

Create a `.env` file in the project root:

```env
# Database (SQLite — no external DB required)
DATABASE_URL="file:./db/custom.db"

# JWT secret — change this in production!
JWT_SECRET="your-super-secret-jwt-key-here"

# AI SDK (required for onboarding plan generation)
ZAI_API_KEY="your-z-ai-api-key"
```

### Running the Application

```bash
# Start development server
bun run dev
```

The application will be available at `http://localhost:3000`.

### Seeding Demo Data

After starting the application, seed the database with sample data:

```bash
curl -X POST http://localhost:3000/api/seed
```

This creates:
- 5 departments (Engineering, HR, Finance, Marketing, Security)
- 10 employees across all roles
- 3 training plans for onboarding employees
- 5 assessments with sample questions
- 6 organizational policies
- Sample quiz results, progress records, and certificates
- 8 system settings

### Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@enterprise.com` | `admin123` |
| HR | `hr@enterprise.com` | `hr123` |
| Employee | `employee@enterprise.com` | `emp123` |

Other seeded employees use password `changeme123`.

## Project Structure

```
enterprise-ai-onboarding/
├── docker/
│   ├── Dockerfile              # Multi-stage Next.js production build
│   ├── Dockerfile.nginx        # Nginx reverse proxy image
│   ├── docker-compose.yml      # Full stack orchestration
│   └── nginx.conf              # Nginx proxy configuration
├── prisma/
│   └── schema.prisma           # Database schema (15 models)
├── db/
│   └── custom.db               # SQLite database file
├── public/
│   ├── logo.svg
│   └── robots.txt
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with providers
│   │   ├── page.tsx            # Single-page application entry
│   │   ├── globals.css         # Global styles + Tailwind
│   │   └── api/                # 29 API route handlers
│   │       ├── auth/           # Login, register, me
│   │       ├── dashboard/      # Dashboard statistics
│   │       ├── employees/      # Employee CRUD + onboarding
│   │       ├── onboarding/     # AI plan generation
│   │       ├── rag/            # Upload, search, handbooks
│   │       ├── assessments/    # CRUD, submit, AI generate
│   │       ├── certificates/   # CRUD, generate, approve, reject
│   │       ├── progress/       # Track & update progress
│   │       ├── admin/          # Departments, policies, settings, analytics, audit-logs
│   │       └── seed/           # Database seeding
│   ├── components/
│   │   ├── ui/                 # 40+ shadcn/ui components
│   │   ├── layout/             # Header, Sidebar, LoadingScreen
│   │   ├── auth/               # LoginPage, RegisterPage
│   │   ├── dashboard/          # Dashboard with charts
│   │   ├── employees/          # EmployeeManagement
│   │   ├── onboarding/         # OnboardingGenerator
│   │   ├── rag/                # RAGDocuments
│   │   ├── assessments/        # Assessments
│   │   ├── progress/           # ProgressTracking
│   │   ├── certificates/       # Certificates
│   │   └── admin/              # AdminPanel
│   ├── contexts/
│   │   └── AuthContext.tsx      # Authentication state provider
│   ├── hooks/
│   │   ├── use-toast.ts
│   │   └── use-mobile.ts
│   ├── lib/
│   │   ├── db.ts               # Prisma client singleton
│   │   ├── auth.ts             # JWT, bcrypt, role guards
│   │   ├── audit.ts            # Audit logging utility
│   │   └── utils.ts            # General utilities
│   ├── services/
│   │   └── api.ts              # API client service
│   └── types/
│       └── index.ts            # TypeScript interfaces
├── .github/
│   └── workflows/              # CI/CD pipelines
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
├── eslint.config.mjs
├── postcss.config.mjs
└── Caddyfile                   # Caddy gateway config
```

## API Documentation Summary

The platform exposes **29 API endpoints** organized across 10 modules:

| Module | Endpoints | Auth Required |
|--------|-----------|---------------|
| **Authentication** | `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/auth/me` | Public / JWT |
| **Dashboard** | `GET /api/dashboard` | JWT |
| **Employees** | `GET /api/employees`, `POST /api/employees`, `GET /api/employees/[id]`, `PUT /api/employees/[id]`, `DELETE /api/employees/[id]`, `GET /api/employees/[id]/onboarding` | Admin/HR/Employee |
| **AI Onboarding** | `POST /api/onboarding/generate` | Admin/HR |
| **RAG Documents** | `POST /api/rag/upload`, `POST /api/rag/search`, `GET /api/rag/handbooks`, `DELETE /api/rag/handbooks` | Varies |
| **Assessments** | `GET /api/assessments`, `POST /api/assessments`, `GET /api/assessments/[id]`, `PUT /api/assessments/[id]`, `DELETE /api/assessments/[id]`, `POST /api/assessments/[id]/submit` | Varies |
| **Certificates** | `GET /api/certificates`, `POST /api/certificates/generate`, `GET /api/certificates/[id]`, `POST /api/certificates/[id]/approve`, `POST /api/certificates/[id]/reject` | Varies |
| **Progress** | `GET /api/progress/[employeeId]`, `POST /api/progress/[employeeId]/update` | JWT |
| **Admin** | `GET/POST /api/admin/departments`, `PUT/DELETE /api/admin/departments/[id]`, `GET/POST /api/admin/policies`, `PUT/DELETE /api/admin/policies/[id]`, `GET/PUT /api/admin/settings`, `GET /api/admin/analytics`, `GET /api/admin/audit-logs` | Admin/HR |
| **Seed** | `POST /api/seed` | Public |

For complete endpoint documentation with request/response schemas, see [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md).

## Docker Deployment

```bash
# Build and run with Docker Compose
cd docker
docker compose up -d --build

# View logs
docker compose logs -f

# Stop
docker compose down
```

The application will be available at `http://localhost` (port 80 via Nginx).

## AWS EC2 Deployment

```bash
# 1. Launch an EC2 instance (Ubuntu 22.04, t3.medium+)
# 2. SSH into the instance
ssh -i your-key.pem ubuntu@<ec2-ip>

# 3. Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker

# 4. Clone and deploy
git clone https://github.com/your-org/enterprise-ai-onboarding.git
cd enterprise-ai-onboarding/docker

# 5. Set environment variables
export JWT_SECRET="your-production-jwt-secret"
export ZAI_API_KEY="your-z-ai-api-key"

# 6. Start services
docker compose up -d --build

# 7. Seed the database
curl -X POST http://localhost/api/seed

# 8. Open port 80 in EC2 Security Group
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | `file:./db/custom.db` | SQLite database connection string |
| `JWT_SECRET` | Yes (production) | `enterprise-onboarding-secret-key-2024` | Secret key for JWT token signing |
| `NODE_ENV` | No | `development` | Environment mode (`development` / `production`) |
| `ZAI_API_KEY` | For AI features | — | API key for z-ai-web-dev-sdk AI generation |
| `PORT` | No | `3000` | Application listen port |

## Available Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server with hot reload |
| `bun run build` | Create production build |
| `bun run start` | Start production server |
| `bun run lint` | Run ESLint code quality checks |
| `bun run db:push` | Push Prisma schema to database |
| `bun run db:generate` | Generate Prisma Client |
| `bun run db:migrate` | Run database migrations |
| `bun run db:reset` | Reset database (destructive) |

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `test:` Test additions or updates
- `chore:` Maintenance tasks

### Code Standards

- TypeScript strict mode enabled
- ESLint with Next.js recommended config
- Use existing shadcn/ui components — do not build from scratch
- All API routes must use proper auth guards (`requireRole`)
- All mutating operations must write audit logs (`logAudit`)

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

Built with Next.js 16, TypeScript, Tailwind CSS 4, shadcn/ui, Prisma, and AI.