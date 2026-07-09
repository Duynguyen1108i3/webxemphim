import { Router } from "express";
import { z } from "zod";
import { login, register } from "../services/auth.service.js";

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

router.post("/logout", (_req, res) => {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  res.status(204).send();
});

function setAuthCookies(res: import("express").Response, accessToken: string, refreshToken: string) {
  const secure = process.env.NODE_ENV === "production";
  res.cookie("accessToken", accessToken, { httpOnly: true, sameSite: "lax", secure, maxAge: 15 * 60 * 1000 });
  res.cookie("refreshToken", refreshToken, { httpOnly: true, sameSite: "lax", secure, maxAge: 30 * 24 * 60 * 60 * 1000 });
}

export default router;
