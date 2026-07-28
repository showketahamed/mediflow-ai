# MediFlow n8n integration

MediFlow remains the source of truth for clinical and operational state. n8n receives signed webhook events for cross-system orchestration and must call the MediFlow callback endpoint only for execution metadata.

## Outbound webhooks

The API posts JSON to:

```text
{N8N_BASE_URL}/webhook/{eventName}
```

The `x-mediflow-signature` header is the hex HMAC-SHA256 of the exact request body using `N8N_WEBHOOK_SECRET`. Workflows should reject requests whose signature does not match.

Supported event names:

- `appointment.created`
- `appointment.updated`
- `appointment.reminder`
- `appointment.cancelled`
- `lab.order.created`
- `lab.result.ready`
- `pharmacy.order.created`
- `bed.allocation.requested`
- `emergency.case.opened`
- `follow-up.due`

## Callback

Workflows may report their n8n execution ID to:

```text
POST /api/v1/automations/n8n/callback
x-n8n-secret: {N8N_WEBHOOK_SECRET}
```

```json
{
  "correlationId": "the-correlation-id-from-the-webhook",
  "executionId": "n8n-execution-id"
}
```

Callbacks never mutate patient, medication, lab, emergency, or bed state. Those changes must use authenticated MediFlow domain APIs so RBAC, validation, auditing, and transactional outbox guarantees remain intact.
