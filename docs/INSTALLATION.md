# MediFlow AI Installation Guide

## Prerequisites

- Node.js 22 LTS and npm
- Docker Desktop with Docker Compose v2
- Git
- PostgreSQL 16 and Redis 7 when not using Docker

## Option 1: Docker Compose

Docker Compose is the fastest complete setup. It starts PostgreSQL, Redis, the migration job, NestJS API, Vite production frontend, and n8n.

1. Create the local environment file:

   ```bash
   cp .env.example .env
   ```

   PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Replace all `replace-*` and `change-*` values. Generate independent random values for JWT, CSRF, metrics, Redis, PostgreSQL, and n8n secrets.

3. Build and start:

   ```bash
   docker compose up --build
   ```

4. In a second terminal, load demo data only when desired:

   ```bash
   docker compose run --rm migrate npm run seed:prod
   ```

5. Stop services:

   ```bash
   docker compose down
   ```

   Add `--volumes` only when intentionally deleting all local database, Redis, and n8n data.

## Option 2: Native Development

1. Install dependencies:

   ```bash
   npm ci
   npm ci --prefix server
   ```

2. Create environment files:

   ```bash
   cp .env.example .env
   cp server/.env.example server/.env
   ```

3. Start infrastructure:

   ```bash
   docker compose up -d postgres redis n8n
   ```

4. Generate Prisma Client and apply migrations:

   ```bash
   npm run db:generate
   npm run db:deploy
   ```

5. Optionally seed demo data:

   ```bash
   npm run db:seed
   ```

6. Start both applications:

   ```bash
   npm run dev:all
   ```

The development frontend runs on `http://localhost:5173` and the API on `http://localhost:4000`.

## Seed Accounts

All demo users use password `Mediflow123!`.

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

The local OTP is `246810`. Never seed these credentials into a database containing real patient data.

## Verification

Run the full static and production build verification:

```bash
npm run verify
```

Check migration state:

```bash
npm run db:status
```

Check API readiness:

```bash
curl http://localhost:4000/api/v1/health
```

## Common Issues

### Environment validation fails

The API validates configuration at startup. Production requires HTTPS CORS origins, secure cookies, Redis rate limiting, non-placeholder JWT/CSRF secrets, and a metrics token.

### Authentication works locally but not across hosted domains

For unrelated Vercel and Railway domains, use `COOKIE_SECURE=true` and `COOKIE_SAME_SITE=none`. Prefer custom subdomains such as `app.example.com` and `api.example.com`, then use `COOKIE_SAME_SITE=lax` with `COOKIE_DOMAIN=.example.com`.

### Prisma cannot connect

Confirm that the password is URL-encoded, the host and port are reachable, `sslmode=require` is present for Supabase, and the connection uses the Supavisor session pooler on port `5432`.

### Jobs are not processing

Confirm Redis connectivity and that the API process remains running. BullMQ workers and scheduled outbox relay execute inside the NestJS API process.
