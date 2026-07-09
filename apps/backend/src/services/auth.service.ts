import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../middleware/error.js";
import { signAccessToken, signRefreshToken } from "../middleware/auth.js";

export async function register(input: { email: string; username: string; password: string }) {
  const exists = await prisma.user.findFirst({ where: { OR: [{ email: input.email }, { username: input.username }] } });
  if (exists) throw new ApiError(409, "Email or username is already registered", "ACCOUNT_EXISTS");
  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      username: input.username,
      passwordHash,
      profiles: { create: { name: input.username, type: "ADULT" } }
    }
  });
  return createSession(user.id, user.email, user.role);
}

export async function login(input: { email: string; password: string; userAgent?: string; ipAddress?: string }) {
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) throw new ApiError(401, "Invalid credentials", "INVALID_CREDENTIALS");
  if (user.bannedAt) throw new ApiError(403, "Account is banned", "ACCOUNT_BANNED");
  if (user.suspendedUntil && user.suspendedUntil > new Date()) throw new ApiError(403, "Account is temporarily suspended", "ACCOUNT_SUSPENDED");
  return createSession(user.id, user.email, user.role, input.userAgent, input.ipAddress);
}

async function createSession(userId: string, email: string, role: "USER" | "MODERATOR" | "ADMIN" | "SUPER_ADMIN", userAgent?: string, ipAddress?: string) {
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
    refreshToken: signRefreshToken({ id: session.id, userId }),
    user: { id: userId, email, role }
  };
}
