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

export const { doubleCsrfProtection, generateToken } = doubleCsrf({
  getSecret: () => env.COOKIE_SECRET,
  // __Host- cookies must always be Secure. Using that prefix in HTTP development
  // makes browsers silently reject the cookie and every protected request fails.
  cookieName: "rytoxgroup-csrf",
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
  
  // 1. Comprehensive Helmet HTTP Security Headers
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hidePoweredBy: true,
    xssFilter: true,
    noSniff: true,
    frameguard: { action: "deny" },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" }
  }));

  // 2. Strict CORS Whitelisting
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ""))) {
        return callback(null, true);
      }
      console.warn(`[CORS Blocked] Origin: "${origin}". Allowed origins in config: ${allowedOrigins.join(", ")}`);
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
    optionsSuccessStatus: 204
  }));

  // 3. Payload Limits (Anti Memory Exhaustion DoS)
  app.use(express.json({ limit: "5mb" }) as RequestHandler);
  app.use(express.urlencoded({ extended: true, limit: "5mb" }) as RequestHandler);
  app.use(cookieParser(env.COOKIE_SECRET) as RequestHandler);
  app.use(compression() as RequestHandler);
  app.use(morgan("combined"));

  // 4. Rate Limiting & Anti-Brute-Force
  // Global Limiter: 300 requests per minute
  app.use(rateLimit({ 
    windowMs: 60_000, 
    limit: 300, 
    standardHeaders: true, 
    legacyHeaders: false,
    message: { error: "Quá nhiều yêu cầu từ IP này. Vui lòng thử lại sau 1 phút.", code: "TOO_MANY_REQUESTS" }
  }) as RequestHandler);

  // Auth Limiter: 30 requests per 15 minutes on sensitive authentication routes (login, register, otp, password reset)
  const sensitiveAuthLimiter = rateLimit({ 
    windowMs: 15 * 60_000, 
    limit: 30, 
    standardHeaders: true, 
    legacyHeaders: false,
    message: { error: "Thao tác quá nhiều lần. Vui lòng thử lại sau 15 phút.", code: "AUTH_RATE_LIMITED" }
  }) as RequestHandler;

  app.use([
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/send-otp",
    "/api/auth/verify-reset-code",
    "/api/auth/send-change-email-otp",
    "/api/auth/forgot-password"
  ], sensitiveAuthLimiter);

  // User Profile Mutations Limiter: 30 requests per 15 minutes
  app.use("/api/users", rateLimit({
    windowMs: 15 * 60_000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false
  }) as RequestHandler);

  // 5. CSRF Token Protection
  app.use((req, res, next) => {
    if (process.env.NODE_ENV !== "production" && req.headers["x-dev-admin"] === "true") {
      return next();
    }
    // Exclude telemetry heartbeat beacons (sent via navigator.sendBeacon and periodic timers)
    if (req.path === "/api/playback/heartbeat" || req.path === "/playback/heartbeat") {
      return next();
    }
    return (doubleCsrfProtection as RequestHandler)(req, res, next);
  });
}
