# Deployment Guide

1. Copy `.env.example` to `.env` and replace secrets.
2. Start local dependencies with `docker compose up postgres redis`.
3. Run `npm install`, `npm run db:generate`, `npm run db:migrate` and `npm run db:seed`.
4. Run the API with `npm run dev --workspace @streamforge/backend`.
5. Run the viewer app with `npm run dev:frontend`.
6. Run the admin app with `npm run dev:admin`.
7. For containerized deployment, run `docker compose up --build`.
8. In production, run migrations with `prisma migrate deploy`, configure CDN origins for HLS/DASH assets and point Nginx to the API upstream.
