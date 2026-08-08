# Support Guide

## Before requesting help

Include the environment (`local`, `Docker`, `Railway`, or `Vercel`), the route or command, the observed result, and sanitized logs. Remove access tokens, passwords, database URLs, and patient information.

## Useful checks

- API liveness: `GET /api/v1/health/live`
- API readiness and database connectivity: `GET /api/v1/health/ready`
- API documentation: `GET /docs`
- Local verification: `npm run verify`

For account access or clinical workflow questions, confirm the active role and hospital context. Role visibility in the interface does not replace API authorization checks.
