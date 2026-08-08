# Architecture Notes

MediFlow AI separates the browser application from the API so public frontend configuration never contains database or AI-provider secrets.

## Request flow

1. React sends a typed request to the NestJS API under `/api/v1`.
2. The API authenticates, validates input, checks permissions, and scopes records to a hospital.
3. Prisma reads or writes PostgreSQL records.
4. Operational events can enter the transactional outbox and BullMQ workflow queue.
5. Background workflows deliver approved notifications through configured adapters.

## Boundaries

- The frontend may hide actions but the API remains the authorization boundary.
- OpenAI credentials stay in the server environment and the provider service applies demo mode and safeguards.
- `/health/live` checks process availability; `/health/ready` also checks database connectivity.

See the root README for deployment topology and the Prisma schema for record relationships.
