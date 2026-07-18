import { Router } from "express";
import { z } from "zod";
import { login, refreshSession, register, revokeSession, sendOtp, verifyOtp, sendResetCode, verifyResetCodeAndChangePassword } from "../services/auth.service.js";
import { ApiError } from "../middleware/error.js";

const router = Router();
const registerSchema = z.object({
  email: z.string().email("Định dạng email không hợp lệ"),
  password: z.string()
    .min(8, "Mật khẩu phải có tối thiểu 8 ký tự")
    .regex(/[A-Z]/, "Mật khẩu phải chứa ít nhất 1 chữ cái viết hoa")
    .regex(/[a-z]/, "Mật khẩu phải chứa ít nhất 1 chữ cái viết thường")
    .regex(/[0-9]/, "Mật khẩu phải chứa ít nhất 1 chữ số")
    .regex(/[^a-zA-Z0-9]/, "Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt"),
  username: z.string()
    .min(3, "Tên tài khoản phải có tối thiểu 3 ký tự")
    .max(32, "Tên tài khoản không được vượt quá 32 ký tự")
    .regex(/^[a-zA-Z0-9_]+$/, "Tên tài khoản chỉ được phép chứa chữ cái, chữ số và dấu gạch dưới")
});

const loginSchema = z.object({
  email: z.string().email("Định dạng email không hợp lệ"),
  password: z.string().min(1, "Mật khẩu không được để trống")
});

router.get("/csrf", (req, res) => res.json({ csrfToken: (req as typeof req & { csrfToken: () => string }).csrfToken() }));

router.post("/register", async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const session = await register(input);
    setAuthCookies(res, session.accessToken, session.refreshToken);
    res.status(201).json({ user: session.user });
  } catch (error) {
    next(error);
  }
});

router.post("/send-otp", async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const result = await sendOtp(input);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/verify-otp", async (req, res, next) => {
  try {
    const schema = z.object({
      email: z.string().email("Định dạng email không hợp lệ"),
      otp: z.string().length(6, "Mã xác thực phải gồm 6 chữ số")
    });
    const input = schema.parse(req.body);
    const session = await verifyOtp(input);
    setAuthCookies(res, session.accessToken, session.refreshToken);
    res.status(201).json({ user: session.user });
  } catch (error) {
    next(error);
  }
});

router.post("/send-reset-code", async (req, res, next) => {
  try {
    const schema = z.object({ email: z.string().email("Định dạng email không hợp lệ") });
    const { email } = schema.parse(req.body);
    const result = await sendResetCode(email);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/verify-reset-code", async (req, res, next) => {
  try {
    const schema = z.object({
      email: z.string().email("Định dạng email không hợp lệ"),
      code: z.string().length(6, "Mã khôi phục phải gồm 6 chữ số"),
      newPassword: z.string()
        .min(8, "Mật khẩu phải có tối thiểu 8 ký tự")
        .regex(/[A-Z]/, "Mật khẩu phải chứa ít nhất 1 chữ cái viết hoa")
        .regex(/[a-z]/, "Mật khẩu phải chứa ít nhất 1 chữ cái viết thường")
        .regex(/[0-9]/, "Mật khẩu phải chứa ít nhất 1 chữ số")
        .regex(/[^a-zA-Z0-9]/, "Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt")
    });
    const input = schema.parse(req.body);
    const result = await verifyResetCodeAndChangePassword(input);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
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
