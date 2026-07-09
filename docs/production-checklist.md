# Production Checklist

- Rotate JWT, cookie, Stripe and AWS secrets through a managed secret store.
- Enforce TLS at the edge and use secure cookies in production.
- Run `prisma migrate deploy` during release.
- Store uploaded masters in private S3 buckets and serve HLS/DASH through signed CDN URLs.
- Enable PostgreSQL automated backups, read replicas and point-in-time recovery.
- Configure Redis eviction policy and memory limits.
- Add Prometheus metrics endpoints and Grafana alert rules for API latency, error rate, queue depth and stream failures.
- Gate admin access with MFA and IP/device risk checks.
- Run SAST, dependency scanning, container scanning and Playwright smoke tests in CI.
- Set cache-control headers for static assets and CDN invalidation for catalog media.
