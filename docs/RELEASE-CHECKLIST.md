# Release Checklist

Before releasing to production:

1. Run `npm run verify` and review the CI result for the exact commit.
2. Apply only committed Prisma migrations with `npm run db:deploy`.
3. Confirm `/api/v1/health/live` and `/api/v1/health/ready` after deployment.
4. Verify `CORS_ORIGIN`, secure cookies, Redis rate limiting, and metrics protection.
5. Keep `AUTOMATION_DRY_RUN=true` until delivery adapters are explicitly tested.
6. Smoke-test login, refresh, logout, one role-restricted route, and a direct browser route.
7. Document rollback owner, release time, and any database migration dependency.

Do not seed demo users or use development credentials in a production environment.
