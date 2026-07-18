import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { promises as dnsPromises } from "node:dns";
import fs from "node:fs";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../middleware/error.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../middleware/auth.js";

export const otpMap = new Map<string, { code: string, username: string, passwordHash: string, expires: number }>();

export const signupOtpMap = new Map<string, { code: string, expires: number }>();

async function isRealEmail(email: string): Promise<boolean> {
  const domain = email.split("@")[1];
  if (!domain) return false;
  return true; // Simplify email checks per user request
}

export async function sendSignupOtp(email: string) {
  const emailExists = await prisma.user.findFirst({ where: { email: email.toLowerCase() } });
  if (emailExists) {
    throw new ApiError(409, "Địa chỉ email đã được đăng ký", "EMAIL_EXISTS");
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = Date.now() + 5 * 60 * 1000;

  signupOtpMap.set(email.toLowerCase(), {
    code: otpCode,
    expires
  });

  console.log(`\n\n========================================\n[OTP VERIFICATION] code for ${email} is: ${otpCode}\n========================================\n\n`);

  try {
    fs.writeFileSync("otp_code.txt", `Email: ${email}\nOTP Code (Signup): ${otpCode}\nGeneratedAt: ${new Date().toISOString()}`);
  } catch (err) {
    console.error("Failed to write OTP code file", err);
  }

  return { success: true, message: "Mã xác thực đăng ký đã được gửi." };
}

export async function register(input: { email: string; username: string; password: string; otp: string }) {
  const emailKey = input.email.toLowerCase();
  const otpData = signupOtpMap.get(emailKey);

  if (!otpData) {
    throw new ApiError(400, "Vui lòng yêu cầu gửi mã xác thực trước", "OTP_NOT_FOUND");
  }

  if (Date.now() > otpData.expires) {
    signupOtpMap.delete(emailKey);
    throw new ApiError(400, "Mã xác thực đã hết hạn. Vui lòng gửi lại", "OTP_EXPIRED");
  }

  if (otpData.code !== input.otp) {
    throw new ApiError(400, "Mã xác thực OTP không chính xác", "OTP_INVALID");
  }

  // Check email exists
  const emailExists = await prisma.user.findFirst({ where: { email: emailKey } });
  if (emailExists) {
    throw new ApiError(409, "Địa chỉ email đã được đăng ký", "EMAIL_EXISTS");
  }

  // Check username exists
  const usernameExists = await prisma.user.findFirst({ where: { username: input.username } });
  if (usernameExists) {
    throw new ApiError(409, "Tên tài khoản (username) đã tồn tại", "USERNAME_EXISTS");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const userId = crypto.randomUUID();
  const user = await prisma.user.create({
    data: {
      id: userId,
      email: emailKey,
      username: input.username,
      passwordHash,
      emailVerifiedAt: new Date(),
      profiles: {
        create: [
          { id: profileId(userId, input.username), name: input.username, type: "ADULT" },
          { id: profileId(userId, "Kids"), name: "Kids", type: "KIDS" },
          { id: profileId(userId, "Guest"), name: "Guest", type: "ADULT" },
          { id: profileId(userId, "Private"), name: "Private", type: "ADULT" }
        ]
      }
    }
  });

  signupOtpMap.delete(emailKey);

  return createSession(user.id, user.email, user.username, user.role);
}

function profileId(userId: string, name: string) {
  return `${userId}-${name.toLowerCase()}`;
}

export async function login(input: { email: string; password: string; userAgent?: string; ipAddress?: string }) {
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) throw new ApiError(401, "Invalid credentials", "INVALID_CREDENTIALS");
  if (user.bannedAt) throw new ApiError(403, "Account is banned", "ACCOUNT_BANNED");
  if (user.suspendedUntil && user.suspendedUntil > new Date()) throw new ApiError(403, "Account is temporarily suspended", "ACCOUNT_SUSPENDED");
  return createSession(user.id, user.email, user.username, user.role, input.userAgent, input.ipAddress);
}

async function createSession(userId: string, email: string, username: string, role: "USER" | "MODERATOR" | "ADMIN" | "SUPER_ADMIN", userAgent?: string, ipAddress?: string) {
  const rawRefresh = crypto.randomBytes(48).toString("hex");
  const session = await prisma.session.create({
    data: {
      userId,
      refreshTokenHash: await bcrypt.hash(rawRefresh, 12),
      userAgent,
      ipAddress,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  });
  return {
    accessToken: signAccessToken({ id: userId, email, role }),
    refreshToken: signRefreshToken({ id: session.id, userId, token: rawRefresh }),
    user: { id: userId, email, username, role }
  };
}

export async function refreshSession(refreshToken: string) {
  let payload: ReturnType<typeof verifyRefreshToken>;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token", "INVALID_REFRESH_TOKEN");
  }

  const session = await prisma.session.findUnique({
    where: { id: payload.id },
    include: { user: true }
  });
  if (!session || session.userId !== payload.userId || session.revokedAt || session.expiresAt <= new Date() || !(await bcrypt.compare(payload.token, session.refreshTokenHash))) {
    throw new ApiError(401, "Invalid or expired refresh token", "INVALID_REFRESH_TOKEN");
  }

  if (session.user.bannedAt || (session.user.suspendedUntil && session.user.suspendedUntil > new Date())) {
    throw new ApiError(403, "Account is unavailable", "ACCOUNT_UNAVAILABLE");
  }

  const nextRawRefresh = crypto.randomBytes(48).toString("hex");
  await prisma.session.update({ where: { id: session.id }, data: { refreshTokenHash: await bcrypt.hash(nextRawRefresh, 12) } });
  return {
    accessToken: signAccessToken({ id: session.user.id, email: session.user.email, role: session.user.role }),
    refreshToken: signRefreshToken({ id: session.id, userId: session.userId, token: nextRawRefresh }),
    user: { id: session.user.id, email: session.user.email, username: session.user.username, role: session.user.role }
  };
}

export async function revokeSession(refreshToken?: string) {
  if (!refreshToken) return;
  try {
    const payload = verifyRefreshToken(refreshToken);
    await prisma.session.updateMany({ where: { id: payload.id, userId: payload.userId, revokedAt: null }, data: { revokedAt: new Date() } });
  } catch {
    // Logout must remain idempotent even if the browser already discarded an expired cookie.
  }
}

export async function sendOtp(input: { email: string; username: string; password: string }) {
  const isReal = await isRealEmail(input.email);
  if (!isReal) {
    throw new ApiError(400, "Địa chỉ email không tồn tại hoặc là email ảo/tạm thời", "INVALID_EMAIL_DOMAIN");
  }

  const emailExists = await prisma.user.findFirst({ where: { email: input.email.toLowerCase() } });
  if (emailExists) {
    throw new ApiError(409, "Địa chỉ email đã được đăng ký", "EMAIL_EXISTS");
  }

  const usernameExists = await prisma.user.findFirst({ where: { username: input.username } });
  if (usernameExists) {
    throw new ApiError(409, "Tên tài khoản (username) đã tồn tại", "USERNAME_EXISTS");
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const passwordHash = await bcrypt.hash(input.password, 12);
  const expires = Date.now() + 5 * 60 * 1000;

  otpMap.set(input.email.toLowerCase(), {
    code: otpCode,
    username: input.username,
    passwordHash,
    expires
  });

  console.log(`\n\n========================================\n[OTP VERIFICATION] code for ${input.email} is: ${otpCode}\n========================================\n\n`);

  try {
    fs.writeFileSync("otp_code.txt", `Email: ${input.email}\nOTP Code (Signup): ${otpCode}\nGeneratedAt: ${new Date().toISOString()}`);
  } catch (err) {
    console.error("Failed to write OTP code file", err);
  }

  return { success: true, message: "Mã xác thực đăng ký đã được gửi." };
}

export async function verifyOtp(input: { email: string; otp: string }) {
  const emailKey = input.email.toLowerCase();
  const otpData = otpMap.get(emailKey);

  if (!otpData) {
    throw new ApiError(400, "Không tìm thấy yêu cầu xác thực hoặc đã hết hạn", "OTP_NOT_FOUND");
  }

  if (Date.now() > otpData.expires) {
    otpMap.delete(emailKey);
    throw new ApiError(400, "Mã xác thực đã hết hạn", "OTP_EXPIRED");
  }

  if (otpData.code !== input.otp) {
    throw new ApiError(400, "Mã xác thực không chính xác", "OTP_INVALID");
  }

  const userId = crypto.randomUUID();
  const user = await prisma.user.create({
    data: {
      id: userId,
      email: emailKey,
      username: otpData.username,
      passwordHash: otpData.passwordHash,
      emailVerifiedAt: new Date(),
      profiles: {
        create: [
          { id: profileId(userId, otpData.username), name: otpData.username, type: "ADULT" },
          { id: profileId(userId, "Kids"), name: "Kids", type: "KIDS" },
          { id: profileId(userId, "Guest"), name: "Guest", type: "ADULT" },
          { id: profileId(userId, "Private"), name: "Private", type: "ADULT" }
        ]
      }
    }
  });

  otpMap.delete(emailKey);

  return createSession(user.id, user.email, user.username, user.role);
}

export const resetMap = new Map<string, { code: string, expires: number }>();

export async function sendResetCode(email: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    throw new ApiError(404, "Không tìm thấy tài khoản với email này", "EMAIL_NOT_FOUND");
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = Date.now() + 5 * 60 * 1000;

  resetMap.set(email.toLowerCase(), { code, expires });

  console.log(`\n\n========================================\n[RESET PASSWORD OTP] code for ${email} is: ${code}\n========================================\n\n`);

  try {
    fs.writeFileSync("otp_code.txt", `Email: ${email}\nOTP Code (Reset): ${code}\nGeneratedAt: ${new Date().toISOString()}`);
  } catch (err) {
    console.error("Failed to write reset code file", err);
  }

  return { success: true, message: "Mã khôi phục đã được gửi." };
}

export async function verifyResetCodeAndChangePassword(input: { email: string, code: string, newPassword: string }) {
  const emailKey = input.email.toLowerCase();
  const resetData = resetMap.get(emailKey);

  if (!resetData) {
    throw new ApiError(400, "Không tìm thấy yêu cầu khôi phục mật khẩu hoặc đã hết hạn", "RESET_NOT_FOUND");
  }

  if (Date.now() > resetData.expires) {
    resetMap.delete(emailKey);
    throw new ApiError(400, "Mã khôi phục đã hết hạn", "RESET_EXPIRED");
  }

  if (resetData.code !== input.code) {
    throw new ApiError(400, "Mã khôi phục không chính xác", "RESET_INVALID");
  }

  const passwordHash = await bcrypt.hash(input.newPassword, 12);
  await prisma.user.update({
    where: { email: emailKey },
    data: { passwordHash }
  });

  resetMap.delete(emailKey);

  return { success: true };
}
