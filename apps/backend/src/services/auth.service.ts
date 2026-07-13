import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../middleware/error.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../middleware/auth.js";

export async function register(input: { email: string; username: string; password: string }) {
  const exists = await prisma.user.findFirst({ where: { OR: [{ email: input.email }, { username: input.username }] } });
  if (exists) throw new ApiError(409, "Email or username is already registered", "ACCOUNT_EXISTS");
  const passwordHash = await bcrypt.hash(input.password, 12);
  const userId = crypto.randomUUID();
  const user = await prisma.user.create({
    data: {
      id: userId,
      email: input.email.toLowerCase(),
      username: input.username,
      passwordHash,
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
