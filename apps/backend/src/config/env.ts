import { z } from "zod";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

if (process.env.NODE_ENV !== "production") {
  const envFile = [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../../.env")].find(existsSync);
  if (envFile) process.loadEnvFile(envFile);
}

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  ADMIN_URL: z.string().url().default("http://localhost:5174"),
  CORS_ORIGINS: z.string().optional(),
  AUTH_COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  JWT_ACCESS_SECRET: z.string().min(24),
  JWT_REFRESH_SECRET: z.string().min(24),
  COOKIE_SECRET: z.string().min(12),
  AWS_REGION: z.string().default("us-east-1"),
  AWS_S3_BUCKET: z.string().default("streamforge-media"),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional()
});

export const env = schema.parse(process.env);

export const allowedOrigins = (env.CORS_ORIGINS?.split(",") ?? [env.FRONTEND_URL, env.ADMIN_URL])
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);
