import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { Role } from "@streamforge/shared-types";
import { env } from "../config/env.js";
import { ApiError } from "./error.js";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; role: Role };
    }
  }
}

export function signAccessToken(user: { id: string; email: string; role: Role }) {
  return jwt.sign(user, env.JWT_ACCESS_SECRET, { expiresIn: "15m", audience: "streamforge", issuer: "streamforge-api" });
}

export function signRefreshToken(session: { id: string; userId: string; token: string }) {
  return jwt.sign(session, env.JWT_REFRESH_SECRET, { expiresIn: "30d", audience: "streamforge", issuer: "streamforge-api" });
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, { audience: "streamforge", issuer: "streamforge-api" }) as { id: string; userId: string; token: string };
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const bearer = req.headers.authorization?.replace("Bearer ", "");
  const token = bearer || req.cookies?.accessToken;
  if (!token) throw new ApiError(401, "Authentication required", "UNAUTHENTICATED");
  try {
    req.user = jwt.verify(token, env.JWT_ACCESS_SECRET, { audience: "streamforge", issuer: "streamforge-api" }) as Express.Request["user"];
    next();
  } catch {
    throw new ApiError(401, "Invalid or expired access token", "INVALID_TOKEN");
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new ApiError(401, "Authentication required", "UNAUTHENTICATED");
    if (!roles.includes(req.user.role)) throw new ApiError(403, "Insufficient permissions", "FORBIDDEN");
    next();
  };
}
