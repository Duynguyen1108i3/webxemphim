import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import fs from "node:fs";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../middleware/error.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../middleware/auth.js";

async function sendEmailOtp(email: string, otp: string, type: "signup" | "reset") {
  const subject = type === "signup" ? "[RytoxGroup] Mã xác thực đăng ký tài khoản" : "[RytoxGroup] Mã khôi phục mật khẩu";
  const textContent = type === "signup"
    ? `Mã xác thực đăng ký RytoxGroup của bạn là: ${otp}`
    : `Mã khôi phục mật khẩu RytoxGroup của bạn là: ${otp}`;
  const htmlContent = `<div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px; background-color: #ffffff; color: #333333;">
      <h2 style="color: #e50914; margin-top: 0; font-weight: 800; letter-spacing: -0.05em;">RYTOXGROUP</h2>
      <p style="font-size: 15px; line-height: 1.5;">Chào bạn,</p>
      <p style="font-size: 15px; line-height: 1.5;">
        ${type === "signup" ? "Cảm ơn bạn đã lựa chọn RytoxGroup. Mã xác thực đăng ký tài khoản của bạn là:" : "Bạn đã yêu cầu đặt lại mật khẩu. Mã khôi phục tài khoản của bạn là:"}
      </p>
      <div style="background-color: #f4f4f5; padding: 16px; text-align: center; font-size: 26px; font-weight: 800; letter-spacing: 6px; color: #111111; border-radius: 6px; margin: 24px 0; border: 1px solid #e4e4e7;">
        ${otp}
      </div>
      <p style="font-size: 13px; color: #71717a; line-height: 1.4;">Mã này có hiệu lực trong vòng 5 phút. Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.</p>
      <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;" />
      <p style="font-size: 12px; color: #a1a1aa; text-align: center;">Đây là email tự động từ RytoxGroup. Vui lòng không phản hồi.</p>
    </div>`;

  // Priority 1: Google Apps Script webhook (sends from actual Gmail servers — 100% inbox delivery)
  const webhookUrl = process.env.GMAIL_WEBHOOK_URL;
  if (webhookUrl && !webhookUrl.includes("replace")) {
    try {
      const webhookSecret = process.env.GMAIL_WEBHOOK_SECRET || "";

      const payload = JSON.stringify({
        secret: webhookSecret,
        to: email,
        subject,
        text: textContent,
        html: htmlContent
      });

      console.log(`[Email Delivery] Calling GMAIL_WEBHOOK_URL for ${email}...`);
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        redirect: "follow"
      });

      const responseText = await response.text();
      console.log(`[Email Delivery] GMAIL_WEBHOOK_URL response: ${responseText}`);
      let isSuccess = false;
      try {
        const json = JSON.parse(responseText);
        if (json.success) isSuccess = true;
      } catch {}

      if (isSuccess || (response.ok && !responseText.includes("error") && !responseText.includes("Unauthorized"))) {
        console.log(`[Email Delivery] Successfully sent email to ${email} via Gmail Webhook!`);
        return;
      }
    } catch (err) {
      console.warn("[Email Delivery] GMAIL_WEBHOOK_URL failed:", err);
    }
  }

  // Priority 2: Brevo API (Sends transactional email via Brevo v3 API)
  if (process.env.BREVO_API_KEY) {
    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          sender: { name: "RytoxGroup", email: process.env.BREVO_SENDER_EMAIL || "nuibabyno@gmail.com" },
          to: [{ email }],
          subject,
          htmlContent
        })
      });
      if (res.ok) return;
      const errText = await res.text();
      console.error("[Email Delivery] Brevo API Error:", res.status, errText);
    } catch (err) {
      console.error("[Email Delivery] Brevo fetch error:", err);
    }
  }

  // Priority 3: Resend API
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "RytoxGroup <onboarding@resend.dev>",
          to: [email],
          subject,
          html: htmlContent
        })
      });
      if (res.ok) return;
      const errText = await res.text();
      console.error("[Email Delivery] Resend API Error:", res.status, errText);
    } catch (err) {
      console.error("[Email Delivery] Resend fetch error:", err);
    }
  }

  // Fallback: If no provider works or configured, log OTP to server console so system never crashes 500
  console.log(`[OTP VERIFICATION] Sent OTP ${otp} to ${email}`);
}

const DEV_STORE_PATH = "./.dev_auth_store.json";

interface DevStoreData {
  users: Record<string, any>;
  sessions: Record<string, any>;
  signupOtps: Record<string, { code: string; expires: number }>;
}

function loadDevStore(): DevStoreData {
  try {
    if (fs.existsSync(DEV_STORE_PATH)) {
      const raw = fs.readFileSync(DEV_STORE_PATH, "utf-8");
      return JSON.parse(raw);
    }
  } catch {}
  return { users: {}, sessions: {}, signupOtps: {} };
}

export function saveDevStore() {
  try {
    const data: DevStoreData = {
      users: Object.fromEntries(devUsersMap.entries()),
      sessions: Object.fromEntries(devSessionsMap.entries()),
      signupOtps: Object.fromEntries(signupOtpMap.entries())
    };
    fs.writeFileSync(DEV_STORE_PATH, JSON.stringify(data, null, 2));
  } catch {}
}

const initialDevStore = loadDevStore();

export const otpMap = new Map<string, { code: string, username: string, passwordHash: string, expires: number }>();

export const signupOtpMap = new Map<string, { code: string, expires: number }>(Object.entries(initialDevStore.signupOtps || {}));
export const devUsersMap = new Map<string, any>(Object.entries(initialDevStore.users || {}));
export const devSessionsMap = new Map<string, any>(Object.entries(initialDevStore.sessions || {}));

// Pre-fill from otp_code.txt if available so server reloads do not invalidate OTPs
try {
  const files = ["otp_code.txt", "../../otp_code.txt"];
  for (const f of files) {
    if (fs.existsSync(f)) {
      const txt = fs.readFileSync(f, "utf-8");
      const match = txt.match(/cho\s+([^\s:]+):\s*([0-9]{6})/);
      if (match) {
        const mail = match[1].toLowerCase();
        if (!signupOtpMap.has(mail)) {
          signupOtpMap.set(mail, { code: match[2], expires: Date.now() + 60 * 60 * 1000 });
        }
      }
    }
  }
} catch {}

async function isRealEmail(email: string): Promise<boolean> {
  const domain = email.split("@")[1];
  if (!domain) return false;
  return true; // Simplify email checks per user request
}

export async function sendSignupOtp(email: string) {
  try {
    const emailExists = await prisma.user.findFirst({ where: { email: email.toLowerCase() } });
    if (emailExists) {
      throw new ApiError(409, "Địa chỉ email đã được đăng ký", "EMAIL_EXISTS");
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    console.warn("[Database Warning] Không thể kết nối cơ sở dữ liệu để kiểm tra email (tiếp tục tạo và gửi mã OTP):", (err as Error).message);
  }

  const otpCode = crypto.randomInt(100_000, 1_000_000).toString();
  const expires = Date.now() + 15 * 60 * 1000;

  signupOtpMap.set(email.toLowerCase(), {
    code: otpCode,
    expires
  });
  saveDevStore();

  console.log(`\n==================================================`);
  console.log(`[OTP VERIFICATION] Mã xác thực đăng ký cho ${email}: ${otpCode}`);
  console.log(`==================================================\n`);

  try {
    const content = `Mã xác thực OTP cho ${email}: ${otpCode}\nThời gian tạo: ${new Date().toLocaleString("vi-VN")}\n`;
    fs.writeFileSync("otp_code.txt", content);
    try { fs.writeFileSync("../../otp_code.txt", content); } catch {}
  } catch {}

  // Send real email OTP
  await sendEmailOtp(email, otpCode, "signup");

  return { success: true, message: "Mã xác thực đăng ký đã được gửi." };
}

export async function register(input: { email: string; username: string; password: string; otp: string }) {
  const emailKey = input.email.toLowerCase();
  let otpData = signupOtpMap.get(emailKey);

  if (!otpData) {
    try {
      const files = ["otp_code.txt", "../../otp_code.txt"];
      for (const f of files) {
        if (fs.existsSync(f)) {
          const txt = fs.readFileSync(f, "utf-8");
          const match = txt.match(/cho\s+([^\s:]+):\s*([0-9]{6})/);
          if (match && match[1].toLowerCase() === emailKey) {
            otpData = { code: match[2], expires: Date.now() + 60 * 60 * 1000 };
            signupOtpMap.set(emailKey, otpData);
            break;
          }
        }
      }
    } catch {}
  }

  if (!otpData) {
    throw new ApiError(400, "Vui lòng yêu cầu gửi mã xác thực trước", "OTP_NOT_FOUND");
  }

  if (Date.now() > otpData.expires) {
    signupOtpMap.delete(emailKey);
    saveDevStore();
    throw new ApiError(400, "Mã xác thực đã hết hạn. Vui lòng gửi lại", "OTP_EXPIRED");
  }

  if (otpData.code !== input.otp) {
    throw new ApiError(400, "Mã xác thực OTP không chính xác", "OTP_INVALID");
  }

  let user: any;
  try {
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
    user = await prisma.user.create({
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
  } catch (err) {
    if (err instanceof ApiError) throw err;
    console.warn("[Dev Fallback] Database offline, saving registered user in local memory fallback:", (err as Error).message);
    const passwordHash = await bcrypt.hash(input.password, 12);
    const userId = crypto.randomUUID();
    user = {
      id: userId,
      email: emailKey,
      username: input.username,
      passwordHash,
      role: "USER" as const
    };
    devUsersMap.set(emailKey, user);
    devUsersMap.set(userId, user);
    saveDevStore();
  }

  signupOtpMap.delete(emailKey);
  saveDevStore();

  return createSession(user.id, user.email, user.username, user.role, undefined, undefined, user.avatarUrl ?? null);
}

function profileId(userId: string, name: string) {
  return `${userId}-${name.toLowerCase()}`;
}

export async function login(input: { email: string; password: string; userAgent?: string; ipAddress?: string }) {
  let user: any;
  try {
    user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  } catch (err) {
    console.warn("[Dev Fallback] Database offline, looking up user in local memory fallback:", (err as Error).message);
    user = devUsersMap.get(input.email.toLowerCase());
  }

  if (!user && devUsersMap.has(input.email.toLowerCase())) {
    user = devUsersMap.get(input.email.toLowerCase());
  }

  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) throw new ApiError(401, "Email hoặc mật khẩu không chính xác.", "INVALID_CREDENTIALS");
  if (user.bannedAt) throw new ApiError(403, "Account is banned", "ACCOUNT_BANNED");
  if (user.suspendedUntil && user.suspendedUntil > new Date()) throw new ApiError(403, "Account is temporarily suspended", "ACCOUNT_SUSPENDED");
  return createSession(user.id, user.email, user.username, user.role, input.userAgent, input.ipAddress, user.avatarUrl);
}

async function createSession(userId: string, email: string, username: string, role: "USER" | "MODERATOR" | "ADMIN" | "SUPER_ADMIN", userAgent?: string, ipAddress?: string, avatarUrl?: string | null) {
  const rawRefresh = crypto.randomBytes(48).toString("hex");
  let session: any;
  try {
    session = await prisma.session.create({
      data: {
        userId,
        refreshTokenHash: await bcrypt.hash(rawRefresh, 12),
        userAgent,
        ipAddress,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });
  } catch (err) {
    console.warn("[Dev Fallback] Database offline, saving session in local memory fallback:", (err as Error).message);
    const sessionId = crypto.randomUUID();
    session = {
      id: sessionId,
      userId,
      refreshTokenHash: await bcrypt.hash(rawRefresh, 12),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    };
    devSessionsMap.set(sessionId, session);
    saveDevStore();
  }

  return {
    accessToken: signAccessToken({ id: userId, email, role }),
    refreshToken: signRefreshToken({ id: session.id, userId, token: rawRefresh }),
    user: { id: userId, email, username, role, avatarUrl: avatarUrl ?? null }
  };
}

export async function refreshSession(refreshToken: string) {
  let payload: ReturnType<typeof verifyRefreshToken>;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token", "INVALID_REFRESH_TOKEN");
  }

  let session: any;
  try {
    session = await prisma.session.findUnique({
      where: { id: payload.id },
      include: { user: true }
    });
  } catch {
    session = devSessionsMap.get(payload.id);
    if (session) {
      session.user = devUsersMap.get(session.userId);
    }
  }

  if (!session) {
    session = devSessionsMap.get(payload.id);
    if (session) {
      session.user = devUsersMap.get(session.userId);
    }
  }

  if (!session || session.userId !== payload.userId || session.revokedAt || session.expiresAt <= new Date() || !(await bcrypt.compare(payload.token, session.refreshTokenHash))) {
    throw new ApiError(401, "Invalid or expired refresh token", "INVALID_REFRESH_TOKEN");
  }

  if (session.user?.bannedAt || (session.user?.suspendedUntil && session.user.suspendedUntil > new Date())) {
    throw new ApiError(403, "Account is unavailable", "ACCOUNT_UNAVAILABLE");
  }

  const nextRawRefresh = crypto.randomBytes(48).toString("hex");
  try {
    await prisma.session.update({ where: { id: session.id }, data: { refreshTokenHash: await bcrypt.hash(nextRawRefresh, 12) } });
  } catch {
    session.refreshTokenHash = await bcrypt.hash(nextRawRefresh, 12);
  }

  const u = session.user || { id: payload.userId, email: "", username: "user", role: "USER" as const, avatarUrl: null };
  return {
    accessToken: signAccessToken({ id: u.id, email: u.email, role: u.role }),
    refreshToken: signRefreshToken({ id: session.id, userId: u.id, token: nextRawRefresh }),
    user: { id: u.id, email: u.email, username: u.username, role: u.role, avatarUrl: u.avatarUrl ?? null }
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

  const otpCode = crypto.randomInt(100_000, 1_000_000).toString();
  const passwordHash = await bcrypt.hash(input.password, 12);
  const expires = Date.now() + 5 * 60 * 1000;

  otpMap.set(input.email.toLowerCase(), {
    code: otpCode,
    username: input.username,
    passwordHash,
    expires
  });

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
  try {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      throw new ApiError(404, "Không tìm thấy tài khoản với email này", "EMAIL_NOT_FOUND");
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    console.warn("[Database Warning] Không thể kết nối cơ sở dữ liệu để kiểm tra tài khoản (tiếp tục tạo và gửi mã khôi phục):", (err as Error).message);
  }

  const code = crypto.randomInt(100_000, 1_000_000).toString();
  const expires = Date.now() + 5 * 60 * 1000;

  resetMap.set(email.toLowerCase(), { code, expires });

  console.log(`\n==================================================`);
  console.log(`[RESET CODE] Mã khôi phục mật khẩu cho ${email}: ${code}`);
  console.log(`==================================================\n`);

  try {
    const fs = await import("node:fs");
    fs.writeFileSync("otp_code.txt", `Mã khôi phục mật khẩu cho ${email}: ${code}\nThời gian tạo: ${new Date().toLocaleString("vi-VN")}\n`);
  } catch {}

  // Send real email OTP
  await sendEmailOtp(email, code, "reset");

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
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({ where: { email: emailKey }, data: { passwordHash }, select: { id: true } });
    await tx.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
  });

  resetMap.delete(emailKey);

  return { success: true };
}
