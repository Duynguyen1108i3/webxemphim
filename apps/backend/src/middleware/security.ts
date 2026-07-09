import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import { doubleCsrf } from "csrf-csrf";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import type { Express, RequestHandler } from "express";
import { env } from "../config/env.js";

const { doubleCsrfProtection } = doubleCsrf({
  getSecret: () => env.COOKIE_SECRET,
  cookieName: "__Host-streamforge-csrf",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/"
  },
  getTokenFromRequest: (req) => req.headers["x-csrf-token"] as string | undefined
});

export function applySecurity(app: Express) {
  app.set("trust proxy", 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors({ origin: [env.FRONTEND_URL, env.ADMIN_URL], credentials: true }));
  app.use(express.json({ limit: "1mb" }) as RequestHandler);
  app.use(express.urlencoded({ extended: true, limit: "1mb" }) as RequestHandler);
  app.use(cookieParser(env.COOKIE_SECRET) as RequestHandler);
  app.use(compression() as RequestHandler);
  app.use(morgan("combined"));
  app.use(rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: true, legacyHeaders: false }) as RequestHandler);
  app.use("/api/auth", rateLimit({ windowMs: 15 * 60_000, limit: 30, standardHeaders: true, legacyHeaders: false }) as RequestHandler);
  app.use(doubleCsrfProtection as RequestHandler);
}
