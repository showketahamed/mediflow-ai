# Data Handling Principles

MediFlow AI is a demonstration and decision-support platform. Treat all clinical or identity information as sensitive.

## Development and support

- Use the seeded demo accounts and synthetic records for local development.
- Keep production data out of source control, test fixtures, screenshots, and public issues.
- Sanitize request logs, error reports, exports, and AI prompts before sharing them.
- Limit access by role and hospital, and review audit logs for sensitive workflow changes.

## Production readiness

Before processing real health information, complete legal, privacy, security, retention, backup, vendor, data-residency, and clinical-governance reviews applicable to the operating jurisdiction. AI output requires qualified human review and must not be used as unsupervised diagnosis or treatment.
