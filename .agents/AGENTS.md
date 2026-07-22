# Project Security Guidelines & Cybersecurity Hardening

Mapped to NIST CSF 2.0, MITRE ATT&CK, OWASP Top 10 & agentskills.io Cybersecurity Standards.

## Core Application Security Directives

### 1. Authentication & Session Security (MITRE ATT&CK T1110, T1556)
- **Password Policies**: Enforce strong password complexity (minimum 8 characters, at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character).
- **Secure Password Hashing**: Always use `bcrypt` with a minimum cost factor of 12 rounds.
- **Token Handling**: Store session refresh tokens in HTTP-only, SameSite cookies. Access tokens must be verified per request.
- **CSRF Protection**: Require `X-CSRF-Token` header on all mutating API calls (`POST`, `PUT`, `DELETE`, `PATCH`).

### 2. Input Validation & Injection Prevention (OWASP A03:2021)
- **Schema Validation**: Validate 100% of incoming request bodies, query params, and route parameters using `zod` schemas before processing.
- **Database Safety**: Use Prisma ORM parameterized queries exclusively to prevent SQL injection attacks. Never concatenate user strings into raw SQL queries.
- **Sanitization**: Sanitize user-provided display names, URLs, and strings before rendering. Avoid `dangerouslySetInnerHTML` unless passed through DOMPurify.

### 3. Rate Limiting & Anti-Brute-Force (NIST CSF PR.IR-1)
- **Global Rate Limiting**: Limit API requests to 300 requests per minute per IP.
- **Auth Endpoint Protection**: Apply strict rate limiting (max 30 requests per 15 minutes) on sensitive routes (`/api/auth/login`, `/api/auth/register`, `/api/auth/send-otp`, `/api/auth/verify-reset-code`).
- **Body Payload Limits**: Cap JSON parsing payloads to prevent denial of service (DoS) via memory exhaustion.

### 4. CORS & HTTP Security Headers (OWASP A05:2021)
- **CORS Origin Whitelisting**: Strict origin checking against allowed domain lists. Never combine `Access-Control-Allow-Origin: *` with `credentials: true`.
- **Security Headers**: Enable `helmet` middleware for HTTP Strict Transport Security (HSTS), X-Content-Type-Options, X-Frame-Options, and Referrer-Policy.
