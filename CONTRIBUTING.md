# Contributing to MediFlow AI

## Before opening a pull request

1. Use Node.js 22 (`nvm use` reads `.nvmrc`).
2. Create `.env` and `server/.env` from the example files; never commit them.
3. Run `npm ci` and `npm ci --prefix server`.
4. Run `npm run verify` before requesting review.

## Change expectations

- Keep a change focused and describe its user or operational impact.
- Add or update tests for validation and behavior changes.
- Preserve tenant scoping and server-side permission checks.
- Do not include production credentials, patient data, or screenshots containing PHI.

## Commit messages

Use an imperative summary such as `Add appointment reminder validation`.
Prefer one behaviorally complete change per commit so releases can be audited and reverted safely.
