# Security Policy

## Reporting a vulnerability

Do not open a public issue for a suspected security vulnerability, exposure of patient data, authentication bypass, or credential leak. Contact the repository owner privately with a concise reproduction, impact, and affected version.

Please avoid including real patient information, access tokens, passwords, or database exports in a report. Acknowledgement and remediation timing depend on severity and reproducibility.

## Deployment baseline

- Keep `AI_DEMO_MODE=true` until the provider and clinical safeguards are reviewed.
- Use different, high-entropy values for JWT, CSRF, and metrics secrets.
- Set `COOKIE_SECURE=true`, Redis rate limiting, HTTPS origins, and a metrics token in production.
- Review access, audit logs, backups, retention, and incident procedures before processing real health information.
