import { Router } from "express";
import { z } from "zod";
import { login, refreshSession, register, revokeSession } from "../services/auth.service.js";
import { ApiError } from "../middleware/error.js";

const router = Router();
const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(3).max(32).optional()
});

router.get("/csrf", (req, res) => res.json({ csrfToken: (req as typeof req & { csrfToken: () => string }).csrfToken() }));

router.post("/register", async (req, res, next) => {
  try {
    const input = authSchema.required({ username: true }).parse(req.body);
    const session = await register(input);
    setAuthCookies(res, session.accessToken, session.refreshToken);
    res.status(201).json({ user: session.user });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const input = authSchema.omit({ username: true }).parse(req.body);
    const session = await login({ ...input, userAgent: req.get("user-agent"), ipAddress: req.ip });
    setAuthCookies(res, session.accessToken, session.refreshToken);
    res.json({ user: session.user });
  } catch (error) {
    next(error);
  }
});

router.post("/logout", async (req, res, next) => {
  try {
    await revokeSession(req.cookies?.refreshToken);
    clearAuthCookies(res);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.post("/refresh", async (req, res, next) => {
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
});

function setAuthCookies(res: import("express").Response, accessToken: string, refreshToken: string) {
  const sameSite = process.env.AUTH_COOKIE_SAME_SITE === "none" ? "none" as const : process.env.AUTH_COOKIE_SAME_SITE === "strict" ? "strict" as const : "lax" as const;
  const secure = process.env.NODE_ENV === "production" || sameSite === "none";
  const options = { httpOnly: true, sameSite, secure, path: "/" };
  res.cookie("accessToken", accessToken, { ...options, maxAge: 15 * 60 * 1000 });
  res.cookie("refreshToken", refreshToken, { ...options, maxAge: 30 * 24 * 60 * 60 * 1000 });
}

function clearAuthCookies(res: import("express").Response) {
  const sameSite = process.env.AUTH_COOKIE_SAME_SITE === "none" ? "none" as const : process.env.AUTH_COOKIE_SAME_SITE === "strict" ? "strict" as const : "lax" as const;
  const options = { httpOnly: true, sameSite, secure: process.env.NODE_ENV === "production" || sameSite === "none", path: "/" };
  res.clearCookie("accessToken", options);
  res.clearCookie("refreshToken", options);
}

export default router;
