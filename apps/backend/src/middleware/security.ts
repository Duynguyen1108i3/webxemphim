import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import { doubleCsrf } from "csrf-csrf";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import type { Express, RequestHandler } from "express";
import { allowedOrigins, env } from "../config/env.js";

const { doubleCsrfProtection } = doubleCsrf({
  getSecret: () => env.COOKIE_SECRET,
  // __Host- cookies must always be Secure. Using that prefix in HTTP development
  // makes browsers silently reject the cookie and every protected request fails.
  cookieName: "streamforge-csrf",
  cookieOptions: {
    httpOnly: true,
    sameSite: env.AUTH_COOKIE_SAME_SITE,
    secure: env.NODE_ENV === "production" || env.AUTH_COOKIE_SAME_SITE === "none",
    path: "/"
  },
  getTokenFromRequest: (req) => req.headers["x-csrf-token"] as string | undefined
});

export function applySecurity(app: Express) {
  app.set("trust proxy", 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ""))) return callback(null, true);
      return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
    optionsSuccessStatus: 204
  }));
  app.use(express.json({ limit: "1mb" }) as RequestHandler);
  app.use(express.urlencoded({ extended: true, limit: "1mb" }) as RequestHandler);
  app.use(cookieParser(env.COOKIE_SECRET) as RequestHandler);
  app.use(compression() as RequestHandler);
  app.use(morgan("combined"));
  app.use(rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: true, legacyHeaders: false }) as RequestHandler);
  app.use("/api/auth", rateLimit({ windowMs: 15 * 60_000, limit: 30, standardHeaders: true, legacyHeaders: false }) as RequestHandler);
  app.use(doubleCsrfProtection as RequestHandler);
}
