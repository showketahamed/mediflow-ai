# MediFlow AI Deployment Guide

## Recommended Topology

- Frontend: Vercel
- API and BullMQ workers: Railway
- Redis: Railway Redis service
- PostgreSQL: Supabase
- Migrations: Railway pre-deploy command or protected GitHub Actions workflow

Use custom domains such as `app.example.com` and `api.example.com` for the most reliable secure-cookie behavior.

## 1. Prepare Production Secrets

Generate independent high-entropy values for:

- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CSRF_SECRET`
- `METRICS_TOKEN`
- `N8N_WEBHOOK_SECRET`

Do not prefix backend secrets with `VITE_`. Vite variables are embedded into the public browser bundle.

## 2. Deploy PostgreSQL to Supabase

1. Create a Supabase project and a dedicated Prisma database user.
2. Open the project Connect panel.
3. Copy the Supavisor session pooler connection on port `5432`.
4. URL-encode special characters in the password.
5. Append `?sslmode=require`.
6. Save the result as `DATABASE_URL` in Railway and as the GitHub secret `SUPABASE_DATABASE_URL`.

Example format:

```dotenv
DATABASE_URL=postgresql://prisma.PROJECT_REF:PASSWORD@REGION.pooler.supabase.com:5432/postgres?sslmode=require
```

Apply the committed Prisma migrations:

```bash
DATABASE_URL="..." npm run db:deploy
npm run db:status
```

Alternatively, run the `Deploy Database Migrations` GitHub workflow. Migration files are immutable and stored in `server/prisma/migrations`.

Do not run `prisma migrate dev`, `prisma db push`, or the demo seed against production. For connection details, see the [official Supabase Prisma guide](https://supabase.com/docs/guides/database/prisma).

## 3. Deploy Redis and API to Railway

1. Create a Railway project from the GitHub repository.
2. Add a Redis service.
3. Add a service for the MediFlow repository.
4. Set the service root directory to `/server`.
5. Railway will use `server/Dockerfile` and `server/railway.json`.
6. Add all variables from `server/.env.railway.example`.
7. Map `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD` to the Railway Redis service variables.
8. Set `DATABASE_URL` to the Supabase session pooler URL.
9. Generate a public Railway domain or attach `api.example.com`.
10. Deploy and verify `/api/v1/health`.

The Railway configuration runs `npm run prisma:deploy` before each deployment. A failed migration prevents the new release from becoming active. The health check must return HTTP 200 before traffic switches to the new container.

Railway injects `PORT`; the API listens on it and on `0.0.0.0`. See the official guides for [Dockerfiles](https://docs.railway.com/builds/dockerfiles), [pre-deploy commands](https://docs.railway.com/deployments/pre-deploy-command), and [health checks](https://docs.railway.com/deployments/healthchecks).

### Railway Production Variables

At minimum configure:

```dotenv
NODE_ENV=production
DATABASE_URL=...
REDIS_HOST=...
REDIS_PORT=6379
REDIS_PASSWORD=...
RATE_LIMIT_STORAGE=redis
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
CSRF_SECRET=...
METRICS_TOKEN=...
CORS_ORIGIN=https://app.example.com
COOKIE_SECURE=true
COOKIE_SAME_SITE=lax
COOKIE_DOMAIN=.example.com
TRUST_PROXY=1
```

When using unrelated `vercel.app` and `railway.app` domains, set `COOKIE_SAME_SITE=none` and leave `COOKIE_DOMAIN` empty.

Keep `AUTOMATION_DRY_RUN=true` and `AI_DEMO_MODE=true` until external providers have been verified. Then configure SMTP, SMS, n8n, and OpenAI secrets only in Railway.

## 4. Deploy the Frontend to Vercel

1. Import the GitHub repository into Vercel.
2. Keep the repository root as the project root.
3. Vercel detects Vite using `vercel.json`.
4. Add `VITE_API_URL=https://api.example.com/api/v1`.
5. Deploy.
6. Add the final Vercel/custom domain to the API `CORS_ORIGIN`.
7. Test direct navigation to `/patients`, `/schedule`, and `/ai-assistant`; the SPA rewrite should serve `index.html`.

The output directory is `dist`. Hashed assets receive immutable one-year caching while HTML remains revalidated. See the [official Vercel Vite guide](https://vercel.com/docs/frameworks/frontend/vite).

## 5. GitHub Actions

Create a protected GitHub environment named `production`. Add:

| Secret | Purpose |
|---|---|
| `SUPABASE_DATABASE_URL` | Manual production migration workflow |
| `RAILWAY_TOKEN` | Railway CLI deployment |
| `RAILWAY_SERVICE_ID` | Target Railway API service |
| `VERCEL_TOKEN` | Vercel CLI authentication |
| `VERCEL_ORG_ID` | Vercel team/account |
| `VERCEL_PROJECT_ID` | Vercel frontend project |

The `CI` workflow runs on pull requests and `main`. After successful CI on `main`, `Deploy Production` deploys Railway first and Vercel second. Add required reviewers to the `production` environment when deployment approval is required.

If native Railway and Vercel GitHub integrations are enabled, disable `.github/workflows/deploy.yml` to prevent duplicate deployments.

## 6. Docker Production Deployment

For a self-hosted environment:

```bash
cp .env.example .env
docker compose config
docker compose up --build -d
docker compose ps
```

Set `NODE_ENV=production`, exact HTTPS CORS origins, secure cookie settings, trusted proxy count, and production secrets in `.env`. Terminate TLS at a reverse proxy or load balancer.

The Compose startup order is:

```text
PostgreSQL healthy
  -> Prisma migrate deploy completes
  -> API starts and becomes healthy
  -> frontend starts
```

Back up the PostgreSQL volume and n8n data before upgrades. Managed PostgreSQL and Redis are recommended for production healthcare workloads.

## Migration Policy

1. Generate migrations only in development:

   ```bash
   npm run db:migrate
   ```

2. Review SQL in `server/prisma/migrations`.
3. Test against an empty CI database and a staging database.
4. Commit migration files with the application code.
5. Deploy with:

   ```bash
   npm run db:deploy
   ```

Use expand-and-contract migrations for destructive changes. Add nullable columns first, deploy compatible code, backfill, then enforce constraints in a later release.

## Rollback

- Frontend: promote the previous Vercel deployment.
- API: redeploy the previous Railway image/revision.
- Database: Prisma does not automatically reverse production migrations. Use a reviewed forward-fix migration or restore a tested backup.
- Automation: inspect dead-letter jobs and retry only after the underlying issue is corrected.

Never roll back application code to a version incompatible with an already-applied database migration.

## Production Checklist

- CI, type checking, builds, and migration checks pass.
- Supabase backups and point-in-time recovery match organizational requirements.
- Railway health check returns 200.
- Vercel deep links work.
- CORS contains only exact HTTPS frontend origins.
- Refresh cookies work in the selected domain topology.
- Redis rate limiting is active.
- Metrics endpoint requires `METRICS_TOKEN`.
- OpenAI and provider keys exist only in Railway.
- Demo accounts and development OTPs are absent from production.
- `AUTOMATION_DRY_RUN` is disabled only after provider testing.
- Audit, retention, alerting, incident response, and clinical governance are approved.
