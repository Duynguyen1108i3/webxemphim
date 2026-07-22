---
name: cybersecurity-hardening
description: Provides structured cybersecurity skills, threat modeling, OWASP Top 10 mitigation, and DevSecOps guidelines mapped to NIST CSF 2.0, MITRE ATT&CK, and Anthropic Cybersecurity standards.
---

# Cybersecurity Hardening & Threat Mitigation Skill

This skill defines the technical framework and automated verification procedures for maintaining high security standards across web applications and API services.

## Security Domains & Controls

### 1. Web Application Firewall & API Hardening
- **Authentication**: JWT/Cookie dual auth flow with CSRF token verification (`X-CSRF-Token`).
- **Input Filtering**: Zod validation schemas on all endpoint inputs.
- **SQLi & NoSQLi Protection**: Parameterized ORM operations (Prisma).
- **XSS Defense**: Context-aware HTML entity encoding and DOMPurify for rich content.

### 2. Secrets & Credentials Management
- **Environment Isolation**: Store API keys (`DATABASE_URL`, `JWT_SECRET`, `COOKIE_SECRET`, `BREVO_API_KEY`, `RESEND_API_KEY`) strictly in `.env` files.
- **No Hardcoded Secrets**: Ensure zero secrets or tokens are committed into version control repository.

### 3. Incident Prevention & Rate Limiting
- Rate limit authentication attempts (`/api/auth/*`) to prevent credential stuffing and brute-force attacks.
- Enforce OTP expiration (max 5 minutes) and single-use invalidation.

## Verification Checklist
- Run `npm run typecheck` to verify no dynamic type casting bypasses validation.
- Verify CSRF protection on all mutating HTTP routes.
- Confirm HTTPS / Secure cookie flags for production environments.
