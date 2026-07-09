# Testing Strategy

- Unit tests cover pure business rules such as recommendation scoring, billing price calculation and validation helpers.
- Integration tests use Supertest against the Express app with a test PostgreSQL database and Redis.
- E2E tests use Playwright against the Vite frontend and seeded API data.
- Contract tests should validate DTO compatibility between backend routes and `packages/shared-types`.
- Coverage target is 90%+ for backend services and route handlers, with frontend coverage focused on critical viewing, auth, search and checkout paths.
- CI runs Prisma client generation, builds all workspaces and runs tests before merge.
