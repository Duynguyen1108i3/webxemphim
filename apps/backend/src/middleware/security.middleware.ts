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

  // 0. Force HTTPS in Production (#19 Bắt buộc HTTPS)
  app.use((req, res, next) => {
    if (
      env.NODE_ENV === "production" &&
      req.headers["x-forwarded-proto"] &&
      req.headers["x-forwarded-proto"] !== "https"
    ) {
      return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
    }
    next();
  });

  // 0.5 Block Automated Vulnerability Scanners & Malicious Bots (#13 Chặn Bot)
  const blockedBotPattern = /(sqlmap|nikto|nmap|masscan|nuclei|acunetix|nessus|dirbuster|gobuster|wpscan|zgrab|havij)/i;
  app.use((req, res, next) => {
    const ua = req.headers["user-agent"] || "";
    if (blockedBotPattern.test(ua)) {
      return res.status(403).json({
        error: "Truy cập tự động bị từ chối bởi tường lửa bảo mật.",
        code: "BOT_BLOCKED"
      });
    }
    next();
  });

  // 1. Comprehensive Helmet HTTP Security Headers (#18 Thêm Security Headers)
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
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/$/, "");
      if (
        allowedOrigins.includes(cleanOrigin) ||
        cleanOrigin.endsWith(".netlify.app")
      ) {
        return callback(null, true);
      }
      console.warn(`[CORS Blocked] Origin: "${origin}". Allowed origins in config: ${allowedOrigins.join(", ")}`);
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token", "x-dev-admin"],
    optionsSuccessStatus: 204
  }));

  // 3. Payload & Upload Limits (Anti Memory Exhaustion DoS - #16 Giới hạn File Upload)
  app.use(express.json({ limit: "3mb" }) as RequestHandler);
  app.use(express.urlencoded({ extended: true, limit: "3mb" }) as RequestHandler);
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
    skip: (req) => env.NODE_ENV !== "production" && (req.ip === "127.0.0.1" || req.ip === "::1" || req.headers["x-dev-admin"] === "true"),
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

  // 5. CSRF Token Protection
  app.use((req, res, next) => {
    if (process.env.NODE_ENV !== "production" && req.headers["x-dev-admin"] === "true") {
      return next();
    }
    // Exclude telemetry heartbeat & presence beacons (sent via navigator.sendBeacon and periodic timers)
    if (
      req.path === "/api/playback/heartbeat" ||
      req.path === "/playback/heartbeat" ||
      req.path === "/api/playback/presence" ||
      req.path === "/playback/presence"
    ) {
      return next();
    }
    return (doubleCsrfProtection as RequestHandler)(req, res, next);
  });
}
