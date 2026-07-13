# Deployment Guide

1. Copy `.env.example` to `.env`, replace secrets, and set `CORS_ORIGINS` to the exact browser origins that may call the API. Copy `apps/frontend/.env.example` when using a separate API origin. Keep the default `/api` for Vite/Nginx proxy deployments. For intentionally separate HTTPS domains, set `AUTH_COOKIE_SAME_SITE=none`; otherwise keep `lax`.
   Netlify has no backend proxy in this repository, so its build environment must set `VITE_API_URL` to the external HTTPS API URL (including `/api`) and that Netlify site origin must be included in `CORS_ORIGINS`.
2. Start local dependencies with `docker compose up postgres redis`.
3. Run `npm install`, `npm run db:generate`, `npm run db:migrate` and `npm run db:seed`.
4. Run the API with `npm run dev --workspace @streamforge/backend`.
5. Run the viewer app with `npm run dev:frontend`.
6. Run the admin app with `npm run dev:admin`.
7. For containerized deployment, run `docker compose up --build`.
8. In production, run migrations with `prisma migrate deploy`, configure CDN origins for HLS/DASH assets and point Nginx to the API upstream.
