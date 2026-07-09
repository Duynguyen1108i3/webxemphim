# Security Checklist

- Passwords use bcrypt with cost 12.
- Short-lived JWT access tokens and revocable refresh sessions are used.
- Refresh and access cookies are HttpOnly, SameSite and secure in production.
- Helmet, CORS, CSRF protection, rate limits and JSON body limits are enabled.
- Prisma parameterizes database access to prevent SQL injection.
- RBAC protects moderator and admin surfaces.
- User moderation supports ban, suspend and restore.
- Validate every request body with Zod.
- Keep S3 buckets private and generate scoped upload/download URLs.
- Log security events without storing passwords, raw tokens or full payment payloads.
