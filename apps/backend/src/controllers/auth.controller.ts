import type { Request, Response, NextFunction } from "express";
import { login, refreshSession, register, revokeSession, sendSignupOtp, sendResetCode, verifyResetCodeAndChangePassword } from "../services/auth.service.js";
import { registerSchema, loginSchema, sendOtpSchema, verifyResetCodeSchema } from "../schemas/auth.schema.js";
import { ApiError } from "../middleware/error.middleware.js";

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  const sameSite = process.env.AUTH_COOKIE_SAME_SITE === "none" ? "none" as const : process.env.AUTH_COOKIE_SAME_SITE === "strict" ? "strict" as const : "lax" as const;
  const secure = process.env.NODE_ENV === "production" || sameSite === "none";
  const options = { httpOnly: true, sameSite, secure, path: "/" };
  res.cookie("accessToken", accessToken, { ...options, maxAge: 15 * 60 * 1000 });
  res.cookie("refreshToken", refreshToken, { ...options, maxAge: 30 * 24 * 60 * 60 * 1000 });
}

export function clearAuthCookies(res: Response) {
  const sameSite = process.env.AUTH_COOKIE_SAME_SITE === "none" ? "none" as const : process.env.AUTH_COOKIE_SAME_SITE === "strict" ? "strict" as const : "lax" as const;
  const options = { httpOnly: true, sameSite, secure: process.env.NODE_ENV === "production" || sameSite === "none", path: "/" };
  res.clearCookie("accessToken", options);
  res.clearCookie("refreshToken", options);
}

export async function getCsrfToken(req: Request, res: Response) {
  res.json({ csrfToken: (req as typeof req & { csrfToken: () => string }).csrfToken() });
}

export async function handleRegister(req: Request, res: Response, next: NextFunction) {
  try {
    const input = registerSchema.parse(req.body);
    const session = await register(input);
    setAuthCookies(res, session.accessToken, session.refreshToken);
    res.status(201).json({ user: session.user });
  } catch (error) {
    next(error);
  }
}

export async function handleSendOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = sendOtpSchema.parse(req.body);
    const result = await sendSignupOtp(email);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleSendResetCode(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = sendOtpSchema.parse(req.body);
    const result = await sendResetCode(email);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleVerifyResetCode(req: Request, res: Response, next: NextFunction) {
  try {
    const input = verifyResetCodeSchema.parse(req.body);
    const result = await verifyResetCodeAndChangePassword(input);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const input = loginSchema.parse(req.body);
    const session = await login({ ...input, userAgent: req.get("user-agent"), ipAddress: req.ip });
    setAuthCookies(res, session.accessToken, session.refreshToken);
    res.json({ user: session.user });
  } catch (error) {
    next(error);
  }
}

export async function handleLogout(req: Request, res: Response, next: NextFunction) {
  try {
    await revokeSession(req.cookies?.refreshToken);
    clearAuthCookies(res);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function handleRefresh(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) throw new ApiError(401, "Refresh token is required", "INVALID_REFRESH_TOKEN");
    const session = await refreshSession(refreshToken);
    setAuthCookies(res, session.accessToken, session.refreshToken);
    res.json({ user: session.user });
  } catch (error) {
    clearAuthCookies(res);
    next(error);
  }
}
