# Deployment Guide

1. For GitHub deployment, create a Render Blueprint from `render.yaml`. It provisions the API, PostgreSQL, and Redis-compatible cache. In the Render setup form, set `CORS_ORIGINS` to the final Netlify site origin (for example `https://your-site.netlify.app`).
2. After Render provides the API URL, set Netlify's `VITE_API_URL` build variable to `https://your-api.onrender.com/api`, then redeploy the Netlify site. Netlify has no backend proxy in this repository, so this variable is required. The production configuration uses `AUTH_COOKIE_SAME_SITE=none` for cross-site HTTPS cookies.
3. Copy `.env.example` to `.env`, replace secrets, and set `CORS_ORIGINS` to the exact browser origins that may call the API. Copy `apps/frontend/.env.example` when using a separate API origin. Keep the default `/api` for Vite/Nginx proxy deployments. For intentionally separate HTTPS domains, set `AUTH_COOKIE_SAME_SITE=none`; otherwise keep `lax`.
4. Start local dependencies with `docker compose up postgres redis`.
5. Run `npm install`, `npm run db:generate`, `npm run db:migrate` and `npm run db:seed`.
6. Run the API with `npm run dev --workspace @streamforge/backend`.
7. Run the viewer app with `npm run dev:frontend`.
8. Run the admin app with `npm run dev:admin`.
9. For containerized deployment, run `docker compose up --build`.
10. In production, run migrations with `prisma migrate deploy`, configure CDN origins for HLS/DASH assets and point Nginx to the API upstream.
