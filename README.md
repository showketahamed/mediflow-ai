# MediFlow AI

MediFlow AI is a full-stack hospital operations platform that combines patient
management, clinical workflows, role-based access, background automation, and
AI-assisted tools in one responsive application.

The repository contains a React frontend, a NestJS REST API, a normalized
PostgreSQL database managed by Prisma, Redis-backed BullMQ workers, n8n
integration, and production deployment configuration.

> MediFlow AI is a demonstration and decision-support platform. AI-generated
> clinical output must be reviewed by a qualified healthcare professional. The
> project is not certified for unsupervised diagnosis or treatment.

## Table of Contents

- [Main Features](#main-features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Roles and Permissions](#roles-and-permissions)
- [Demo Accounts](#demo-accounts)
- [Quick Start with Docker](#quick-start-with-docker)
- [Native Development](#native-development)
- [Environment Configuration](#environment-configuration)
- [API Overview](#api-overview)
- [Database Design](#database-design)
- [Automation Architecture](#automation-architecture)
- [AI Architecture](#ai-architecture)
- [Security](#security)
- [Useful Commands](#useful-commands)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Documentation](#documentation)

## Main Features

### Hospital Operations

- Live dashboard with hospital statistics, vital trends, patient flow, and AI insights
- Patient registration, clinical status, admission details, vitals, and notes
- Appointment creation, scheduling, updating, cancellation, and follow-up
- Diagnostic workflow with findings, recommendations, and status tracking
- Notification center with read, read-all, and delete actions
- Analytics dashboard with filters, exports, operational metrics, and predictions
- User preferences for theme, language, notifications, and reduced motion
- Responsive layouts, lazy-loaded routes and charts, skeletons, empty states, and error pages

### Automation

- BullMQ background processing with Redis persistence
- Appointment confirmation and reminder workflows
- Lab order and result automation
- Pharmacy order and dispensing automation
- Bed allocation and release automation
- Emergency escalation workflows
- Follow-up scheduling and completion workflows
- Email, SMS, in-app notification, and n8n delivery adapters
- Exponential retry configuration, step logs, run history, and monitoring dashboard
- Transactional outbox records to prevent losing automation events

### AI Features

- AI Receptionist
- AI Chat
- AI Patient Summary
- AI Appointment Assistant
- Demo-labeled diagnosis suggestions
- Medical document OCR
- Voice-note transcription
- Medical report summarization
- AI operational analytics
- AI prediction dashboard
- Provider abstraction with OpenAI and deterministic demo providers

API keys are used only by the backend. No OpenAI key is embedded in the browser
bundle.

## Architecture

```text
                         Browser
                            |
                            | HTTPS
                            v
               Vercel or Nginx frontend
             React 18 + TypeScript + Vite
                            |
                            | REST + JWT + CSRF
                            v
                  Railway or Docker API
                  NestJS + Prisma + Swagger
                     |              |
                     |              +----------------------+
                     v                                     v
          PostgreSQL / Supabase                    Redis / BullMQ
       normalized hospital records             jobs, retries, rate limits
                     |                                     |
                     +------------------+------------------+
                                        |
                                        v
                          Automation and AI adapters
                     n8n, SMTP, SMS, OpenAI, notifications
```

Authentication uses a short-lived JWT access token plus a rotating refresh
token stored in an HttpOnly cookie. Mutating cookie-authenticated requests use
CSRF protection. All hospital data is tenant-scoped through `hospitalId`.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite 6, Tailwind CSS |
| UI | Radix UI, Motion, Lucide, Recharts, Sonner |
| Backend | NestJS 11, REST, Swagger/OpenAPI |
| Database | PostgreSQL 16, Prisma ORM |
| Authentication | Passport JWT, rotating refresh tokens, bcryptjs |
| Validation | class-validator, class-transformer, Zod environment validation |
| Automation | BullMQ, Redis, n8n, SMTP, SMS |
| AI | OpenAI SDK behind a server-side provider interface |
| Monitoring | Structured logs, correlation IDs, Prometheus metrics, health probes |
| Infrastructure | Docker, Docker Compose, GitHub Actions |
| Managed deployment | Vercel, Railway, Supabase |

## Project Structure

```text
.
|-- src/                       React application
|   |-- app/components/        Shared UI and feature components
|   |-- app/context/           Authentication and hospital data state
|   |-- app/layout/            Header, sidebar, and application shell
|   |-- app/pages/             Lazy-loaded frontend routes
|   |-- app/services/          Typed API client
|   `-- styles/                Theme and responsive styles
|-- server/
|   |-- prisma/                Schema, migrations, and seed data
|   |-- src/modules/           Auth, users, patients, appointments, AI, and more
|   |-- src/automation/        BullMQ workflows, adapters, outbox, and processors
|   |-- src/common/            Guards, decorators, filters, and shared types
|   |-- src/monitoring/        Liveness, readiness, and metrics endpoints
|   `-- n8n/                   n8n workflow documentation
|-- docker/                    Nginx and container support files
|-- docs/                      Installation and deployment guides
|-- .github/workflows/         CI, migrations, and production deployment
|-- docker-compose.yml         Local full-stack orchestration
|-- Dockerfile                 Production frontend image
|-- vercel.json                Vercel Vite and SPA configuration
`-- package.json               Workspace commands
```

## Roles and Permissions

RBAC is enforced on the server. Hiding a frontend button is not treated as an
authorization control.

| Role | Primary access |
|---|---|
| Super Admin | Cross-hospital platform administration and all permissions |
| Hospital Admin | Hospital users, patients, appointments, analytics, audit, automation, and settings |
| Doctor | Clinical records, diagnostics, appointments, emergencies, lab, follow-up, and AI tools |
| Nurse | Patient updates, beds, emergencies, follow-ups, notifications, and selected AI tools |
| Receptionist | Patient intake, appointments, bed requests, follow-ups, and AI receptionist tools |
| Lab Technician | Lab orders, diagnostics, OCR, reports, and automation monitoring |
| Pharmacist | Pharmacy orders, dispensing, reports, and automation monitoring |
| Patient | Own permitted records, appointments, diagnostics, notifications, and patient-facing AI tools |

Permissions are deny-by-default and checked with resource/action values such as
`patients:read`, `appointments:create`, `beds:allocate`, and `ai:chat`.

## Demo Accounts

Run the seed command before using these accounts. Every seeded account uses the
same development-only password:

```text
Mediflow123!
```

| Role | Email |
|---|---|
| Super Admin | `superadmin@mediflow.demo` |
| Hospital Admin | `admin@mediflow.demo` |
| Doctor | `doctor@mediflow.demo` |
| Nurse | `nurse@mediflow.demo` |
| Receptionist | `reception@mediflow.demo` |
| Lab Technician | `lab@mediflow.demo` |
| Pharmacist | `pharmacist@mediflow.demo` |
| Patient | `patient@mediflow.demo` |

These accounts are for local demonstration only. Do not seed them into a real
production hospital database.

## Quick Start with Docker

### Prerequisites

- Docker Desktop with the Linux engine running
- Git
- At least 4 GB of free memory for the full stack

### 1. Configure the Environment

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Windows Command Prompt:

```cmd
copy .env.example .env
```

Linux or macOS:

```bash
cp .env.example .env
```

Open `.env` and replace every placeholder secret. Generate a 32-byte secret
from Command Prompt with:

```cmd
powershell -NoProfile -Command "[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).ToLower()"
```

Generate a different value for each JWT, CSRF, monitoring, n8n, database, and
Redis secret.

Keep AI and external automation in safe demo mode initially:

```dotenv
AI_DEMO_MODE=true
AUTOMATION_DRY_RUN=true
OPENAI_API_KEY=
```

### 2. Build and Start

```bash
docker compose up --build -d
docker compose ps
```

The `postgres` and `redis` containers should become `healthy`, the `migrate`
container should exit successfully, and the `api`, `web`, and `n8n` containers
should remain running.

### 3. Seed Demo Data

```bash
docker compose run --rm migrate npm run seed:prod
```

### 4. Open the Services

| Service | Local URL |
|---|---|
| Frontend | `http://localhost:8080` |
| API | `http://localhost:4000/api/v1` |
| Swagger | `http://localhost:4000/docs` |
| Health check | `http://localhost:4000/api/v1/health` |
| n8n | `http://localhost:5678` |

### 5. Check Logs

```bash
docker compose logs --tail=100 api
docker compose logs --tail=100 migrate
docker compose logs --tail=100 web
```

## Native Development

For development without running the frontend and API in Docker:

1. Install Node.js 22, PostgreSQL, and Redis.
2. Create `.env` and `server/.env` from their example files.
3. Point `DATABASE_URL` to PostgreSQL and Redis variables to the Redis server.
4. Install dependencies and prepare Prisma.

```bash
npm ci
npm --prefix server ci
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev:all
```

Development URLs:

- Frontend: `http://localhost:5173`
- API: `http://localhost:4000/api/v1`
- Swagger: `http://localhost:4000/docs`

See the [Installation Guide](docs/INSTALLATION.md) for platform-specific details.

## Environment Configuration

### Frontend Variable

| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Public API base URL embedded at build time | `http://localhost:4000/api/v1` |

Never prefix a secret with `VITE_`. Vite variables are public browser values.

### Core Backend Variables

| Variable | Description |
|---|---|
| `NODE_ENV` | `development`, `test`, or `production` |
| `PORT` | API listening port |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Access-token signing secret |
| `JWT_REFRESH_SECRET` | Independent refresh-token signing secret |
| `CSRF_SECRET` | CSRF token signing secret |
| `CORS_ORIGIN` | Comma-separated exact frontend origins |
| `COOKIE_SECURE` | Must be `true` in production |
| `COOKIE_SAME_SITE` | `strict`, `lax`, or `none` |
| `TRUST_PROXY` | Trusted reverse-proxy count |
| `REDIS_HOST` | Redis host |
| `REDIS_PORT` | Redis port |
| `REDIS_PASSWORD` | Redis password |
| `METRICS_TOKEN` | Protects the metrics endpoint |

### Automation and AI Variables

| Variable | Description |
|---|---|
| `AUTOMATION_DRY_RUN` | Prevents real external delivery when `true` |
| `AUTOMATION_MAX_ATTEMPTS` | Maximum BullMQ retry attempts |
| `AUTOMATION_BACKOFF_MS` | Initial retry backoff |
| `N8N_BASE_URL` | n8n service URL |
| `N8N_WEBHOOK_SECRET` | Verifies n8n callbacks |
| `SMTP_*` | Email provider configuration |
| `SMS_*` | SMS provider configuration |
| `AI_DEMO_MODE` | Uses deterministic demo AI when `true` |
| `OPENAI_API_KEY` | Server-only OpenAI credential |
| `OPENAI_MODEL` | Configured text model |
| `OPENAI_AUDIO_MODEL` | Configured transcription model |

Complete templates are available in `.env.example`, `.env.vercel.example`,
`server/.env.example`, `server/.env.production.example`, and
`server/.env.railway.example`.

## API Overview

All REST endpoints use the `/api/v1` prefix. Swagger documents request bodies,
validation rules, authorization requirements, and response schemas at `/docs`.

| Route group | Purpose |
|---|---|
| `/auth` | Login, registration, OTP, refresh, CSRF, logout, password reset, sessions |
| `/users` | Role-based user administration |
| `/patients` | Patient records and clinical status |
| `/appointments` | Appointment CRUD and scheduling |
| `/diagnostics` | Diagnostic records and findings |
| `/dashboard` | Dashboard summary data |
| `/analytics` | Aggregate hospital analytics |
| `/notifications` | User notification management |
| `/settings` | User preferences |
| `/audit-logs` | Authorized audit-log queries |
| `/automations` | Dispatch, monitor, run logs, retry, and n8n callbacks |
| `/lab/orders` | Lab orders and results |
| `/pharmacy/orders` | Pharmacy orders and dispensing |
| `/beds` | Beds, allocation, and release |
| `/emergencies` | Emergency creation and closure |
| `/follow-ups` | Follow-up creation and completion |
| `/ai` | Receptionist, chat, summaries, OCR, voice, reports, analytics, predictions |
| `/monitoring` | Liveness, readiness, and protected metrics |
| `/health` | API and database health |

The frontend API client sends credentials for refresh cookies, obtains CSRF
tokens for protected mutations, and performs one refresh attempt when an access
token expires.

## Database Design

The Prisma schema is normalized around tenant-owned hospital records:

- Organization: `Hospital`, `Department`, `Ward`, `Bed`
- Identity: `User`, `UserSettings`, `RefreshToken`, `VerificationToken`
- Clinical: `Patient`, `Admission`, `VitalSign`, `Appointment`
- Diagnostics: `Diagnostic`, `DiagnosticFinding`, `LabOrder`
- Operations: `PharmacyOrder`, `BedAllocation`, `EmergencyCase`, `FollowUp`
- Communication: `Notification`
- Governance: `AuditLog`
- Automation: `AutomationRun`, `AutomationStepLog`, `AutomationOutbox`
- AI: `AiInteraction`, `AiConversation`, `AiMessage`

Foreign keys, unique constraints, indexes, and tenant identifiers are defined in
`server/prisma/schema.prisma`. Versioned SQL migrations live in
`server/prisma/migrations`.

Production deployments should run only:

```bash
npm run db:deploy
```

Do not run `prisma migrate dev`, `prisma db push`, or the demo seed against a
production database.

## Automation Architecture

1. A domain event is written to the automation outbox.
2. The producer dispatches a typed BullMQ job.
3. The workflow router selects the appointment, lab, pharmacy, bed, emergency,
   follow-up, or notification workflow.
4. Each workflow records step-level execution logs.
5. Delivery adapters send email, SMS, in-app notifications, or n8n webhooks.
6. Failed jobs use the configured retry and backoff policy.
7. Authorized users inspect and retry runs from the automation monitor.

Set `AUTOMATION_DRY_RUN=true` until SMTP, SMS, and n8n have been tested.

## AI Architecture

AI controllers call a provider-neutral service instead of using the OpenAI SDK
directly. The service handles:

- Input limits and validation
- Role permissions
- Prompt construction
- Structured response schemas
- Request timeouts
- Usage and interaction logging
- Demo-provider fallback
- Clinical disclaimers

Use `AI_DEMO_MODE=true` without an API key. For model-backed responses, set
`AI_DEMO_MODE=false` and configure `OPENAI_API_KEY` only in the backend secret
store.

## Security

- Helmet security headers
- Global DTO validation and payload whitelisting
- Prisma parameterized database access
- Password hashing with bcrypt
- JWT access authentication
- Rotating, revocable refresh-token sessions
- HttpOnly, Secure, and SameSite cookie controls
- CSRF validation
- Redis-backed rate limiting
- Deny-by-default RBAC
- Tenant-scoped data access
- Audit logs and request correlation IDs
- Protected Prometheus metrics
- Strict production environment validation
- CORS allowlist
- File type and size validation for AI uploads

For real health information, complete regulatory, privacy, retention, backup,
incident-response, data residency, vendor agreement, and clinical governance
reviews before launch.

## Useful Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Vite frontend |
| `npm run dev:api` | Start the NestJS API in watch mode |
| `npm run dev:all` | Start frontend and API together |
| `npm run typecheck` | Type-check the frontend |
| `npm run build` | Build the production frontend |
| `npm run build:api` | Build the API |
| `npm run build:all` | Build frontend and API |
| `npm run verify` | Type-check and build both applications |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:migrate` | Create/apply a development migration |
| `npm run db:deploy` | Apply committed migrations |
| `npm run db:status` | Check migration status |
| `npm run db:seed` | Seed local demo data |
| `npm run docker:up` | Build and start Docker Compose |
| `npm run docker:down` | Stop Docker Compose |

## Deployment

Recommended managed topology:

| Component | Platform |
|---|---|
| Frontend | Vercel |
| NestJS API and BullMQ worker | Railway |
| PostgreSQL | Supabase |
| Redis | Railway Redis |
| Migrations | Railway pre-deploy command or protected GitHub Action |

Deployment order:

1. Push the repository to GitHub.
2. Create Supabase PostgreSQL and configure `DATABASE_URL`.
3. Deploy Redis and the `/server` service to Railway.
4. Verify `https://YOUR_API/api/v1/health`.
5. Import the repository into Vercel.
6. Set `VITE_API_URL=https://YOUR_API/api/v1`.
7. Deploy Vercel and copy its final HTTPS URL.
8. Set that URL as Railway `CORS_ORIGIN`.
9. For unrelated Vercel and Railway domains, use:

```dotenv
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
COOKIE_DOMAIN=
TRUST_PROXY=1
```

10. Redeploy the API and test login, refresh, direct route navigation, and logout.

See the [Deployment Guide](docs/DEPLOYMENT.md) for Supabase, Railway, Vercel,
GitHub Actions, migration, rollback, and production checklist details.

## Troubleshooting

### Docker daemon is unavailable

Start Docker Desktop, wait until the engine reports that it is running, and run:

```bash
docker context use desktop-linux
docker version
```

Both Client and Server sections must be displayed.

### A migration container exits

Inspect the migration output:

```bash
docker compose logs --no-color migrate
```

Confirm that PostgreSQL is healthy and all required `.env` values are present.

### The API is unhealthy

```bash
docker compose logs --tail=200 api
curl http://localhost:4000/api/v1/health
```

### The frontend refuses to connect

```bash
docker compose ps
docker compose up --build -d web
```

Then open `http://localhost:8080` and perform a hard refresh.

### Login works locally but not on Vercel

Check:

- `VITE_API_URL` points to the public Railway HTTPS API and includes `/api/v1`
- Railway `CORS_ORIGIN` exactly matches the Vercel URL
- `COOKIE_SECURE=true`
- `COOKIE_SAME_SITE=none` for unrelated Vercel and Railway domains
- Environment changes were followed by new deployments

### Seed accounts are missing

```bash
docker compose run --rm migrate npm run seed:prod
```

## CI/CD

GitHub Actions includes:

- `CI`: dependency installation, Prisma generation, migration validation, type checks, and builds
- `Deploy Database Migrations`: protected manual migration deployment
- `Deploy Production`: Railway deployment followed by Vercel deployment

If native Railway and Vercel GitHub integrations are enabled, disable the
duplicate deployment workflow or configure only one deployment path.

## Documentation

- [Installation Guide](docs/INSTALLATION.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [n8n Integration](server/n8n/README.md)
- [Frontend Vercel Template](.env.vercel.example)
- [Backend Environment Template](server/.env.example)
- Swagger UI: `/docs` on the running API

## License and Attribution

Review [ATTRIBUTIONS.md](ATTRIBUTIONS.md) for third-party design and asset
attributions. Add an explicit project license before public distribution if this
repository will be open sourced.
