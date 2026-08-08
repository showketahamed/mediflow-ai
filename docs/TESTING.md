# Testing Guide

## Fast verification

Install both dependency sets, then run:

```bash
npm run verify
```

This type-checks and builds the frontend and API. Run backend validation tests separately with:

```bash
npm --prefix server test
```

## What to test for a change

- Input validation changes: accepted and rejected values.
- Permission changes: allowed and denied roles, including tenant isolation.
- API changes: success, validation failure, expired session, and retry behavior.
- UI changes: keyboard navigation, focus visibility, error state, and narrow-screen layout.

Use demo data only. Never use real patient data in test fixtures, bug reports, or screenshots.
