# Operations Runbook

## Health checks

Use `/api/v1/health/live` for a process liveness probe. Use `/api/v1/health/ready` for a readiness probe because it verifies database connectivity. A readiness failure should prevent new traffic but does not necessarily mean the process is down.

## Safe incident triage

1. Check deployment and service logs using the request ID returned in `X-Request-Id`.
2. Check API readiness and Redis/database provider health.
3. Confirm environment secrets and allowed CORS origin values without exposing them.
4. Pause external automation by using dry-run mode when delivery behavior is uncertain.
5. Record impact and remediation in the operational incident log.

Do not share database exports, authentication cookies, AI prompts containing clinical data, or metrics tokens in a public channel.
