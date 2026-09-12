import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../middleware/error.middleware.js";
import { recommendForProfile } from "../services/recommendation.service.js";
import { devUsersMap, sendSignupOtp, signupOtpMap, saveDevStore } from "../services/auth.service.js";
import {
  updateAvatarSchema,
  updateUsernameSchema,
  updatePasswordSchema,
  sendEmailOtpSchema,
  updateEmailSchema
} from "../schemas/user.schema.js";

export async function validateProfileOwnership(req: Request, _res: Response, next: NextFunction) {
  try {
    const profileId = String(req.params.profileId);
    const profile = await prisma.profile.findFirst({
      where: { id: profileId, userId: req.user!.id },
      select: { id: true }
    });
    if (!profile) throw new ApiError(403, "Profile does not belong to the authenticated user", "PROFILE_FORBIDDEN");
    next();
  } catch (error) {
    next(error);
  }
}

export async function getCurrentUser(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    let user: any;
    try {
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, username: true, role: true, avatarUrl: true, subscriptions: { orderBy: { currentPeriodEnd: "desc" }, take: 1 } }
      });
    } catch {
      user = devUsersMap.get(userId) || { id: userId, email: req.user!.email, username: req.user!.email.split("@")[0], role: req.user!.role };
    }

    if (!user) {
      user = devUsersMap.get(userId) || { id: userId, email: req.user!.email, username: req.user!.email.split("@")[0], role: req.user!.role };
    }

    let profiles: any[] = [];
    try {
      const profileDefinitions = [
        { name: user.username, type: "ADULT" as const },
        { name: "Kids", type: "KIDS" as const },
        { name: "Guest", type: "ADULT" as const },
        { name: "Private", type: "ADULT" as const }
      ];
      await Promise.all(profileDefinitions.map((profile) => prisma.profile.upsert({
        where: { id: `${userId}-${profile.name.toLowerCase()}` },
        create: { id: `${userId}-${profile.name.toLowerCase()}`, userId, ...profile },
        update: {}
      })));
      profiles = await prisma.profile.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
    } catch {
      profiles = [
        { id: `${userId}-${(user.username || "user").toLowerCase()}`, name: user.username || "user", type: "ADULT" },
        { id: `${userId}-kids`, name: "Kids", type: "KIDS" },
        { id: `${userId}-guest`, name: "Guest", type: "ADULT" },
        { id: `${userId}-private`, name: "Private", type: "ADULT" }
      ];
    }

    const safeUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      avatarUrl: user.avatarUrl,
      subscriptions: user.subscriptions || []
    };
    res.json({ user: { ...safeUser, profiles } });
  } catch (error) {
    next(error);
  }
}

export async function updateAvatar(req: Request, res: Response, next: NextFunction) {
  try {
    const { avatarUrl } = updateAvatarSchema.parse(req.body);
    const userId = req.user!.id;

    let user: any;
    try {
      user = await prisma.user.update({
        where: { id: userId },
        data: { avatarUrl },
        select: { id: true, email: true, username: true, role: true, avatarUrl: true }
      });

      try {
        await prisma.profile.updateMany({
          where: { userId, name: user.username },
          data: { avatarUrl }
        });
      } catch {}
    } catch (dbErr) {
      console.warn("[Dev Fallback] Database offline, saving avatar in dev fallback store:", (dbErr as Error).message);
      const devUser = devUsersMap.get(userId);
      if (devUser) {
        devUser.avatarUrl = avatarUrl;
        devUsersMap.set(userId, devUser);
        if (devUser.email) devUsersMap.set(devUser.email.toLowerCase(), devUser);
        user = { id: devUser.id, email: devUser.email, username: devUser.username, role: devUser.role, avatarUrl };
      } else {
        user = { id: userId, email: req.user!.email, username: req.user!.email.split("@")[0], role: req.user!.role, avatarUrl };
        devUsersMap.set(userId, user);
        devUsersMap.set(user.email.toLowerCase(), user);
      }
      saveDevStore();
    }

    // Always keep dev store cache synced
    const devUser = devUsersMap.get(userId);
    if (devUser) {
      devUser.avatarUrl = avatarUrl;
      devUsersMap.set(userId, devUser);
      if (devUser.email) devUsersMap.set(devUser.email.toLowerCase(), devUser);
      saveDevStore();
    }

    let profiles: any[] = [];
    try {
      profiles = await prisma.profile.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
    } catch {
      profiles = [
        { id: `${userId}-${(user.username || "user").toLowerCase()}`, name: user.username || "user", type: "ADULT", avatarUrl },
        { id: `${userId}-kids`, name: "Kids", type: "KIDS" },
        { id: `${userId}-guest`, name: "Guest", type: "ADULT" },
        { id: `${userId}-private`, name: "Private", type: "ADULT" }
      ];
    }

    res.json({ user: { ...user, profiles } });
  } catch (error) {
    next(error);
  }
}

export async function updateUsername(req: Request, res: Response, next: NextFunction) {
  try {
    const { username } = updateUsernameSchema.parse(req.body);
    const userId = req.user!.id;

    let user: any;
    try {
      const exists = await prisma.user.findFirst({ where: { username, NOT: { id: userId } } });
      if (exists) throw new ApiError(409, "Tên người dùng này đã được sử dụng", "USERNAME_EXISTS");

      user = await prisma.user.update({
        where: { id: userId },
        data: { username },
        select: { id: true, email: true, username: true, role: true, avatarUrl: true }
      });
    } catch (err) {
      if (err instanceof ApiError) throw err;
      console.warn("[Dev Fallback] Database offline, updating username in dev store:", (err as Error).message);
      const devUser = devUsersMap.get(userId);
      if (devUser) {
        devUser.username = username;
        devUsersMap.set(userId, devUser);
        if (devUser.email) devUsersMap.set(devUser.email.toLowerCase(), devUser);
        user = { id: devUser.id, email: devUser.email, username, role: devUser.role, avatarUrl: devUser.avatarUrl };
      } else {
        user = { id: userId, email: req.user!.email, username, role: req.user!.role };
        devUsersMap.set(userId, user);
      }
      saveDevStore();
    }

    let profiles: any[] = [];
    try {
      profiles = await prisma.profile.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
    } catch {
      profiles = [
        { id: `${userId}-${(user.username || "user").toLowerCase()}`, name: user.username || "user", type: "ADULT", avatarUrl: user.avatarUrl }
      ];
    }

    res.json({ user: { ...user, profiles } });
  } catch (error) {
    next(error);
  }
}

export async function updatePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { currentPassword, newPassword } = updatePasswordSchema.parse(req.body);
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new ApiError(400, "Mật khẩu hiện tại không chính xác", "INVALID_PASSWORD");
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } })
    ]);
    res.json({ success: true, message: "Đổi mật khẩu thành công" });
  } catch (error) {
    next(error);
  }
}

export async function handleSendEmailOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const { newEmail } = sendEmailOtpSchema.parse(req.body);
    const userId = req.user!.id;

    const exists = await prisma.user.findFirst({ where: { email: newEmail.toLowerCase() } });
    if (exists && exists.id !== userId) {
      throw new ApiError(409, "Email này đã được sử dụng bởi tài khoản khác", "EMAIL_EXISTS");
    }

    const result = await sendSignupOtp(newEmail);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function updateEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const { newEmail, otp } = updateEmailSchema.parse(req.body);
    const userId = req.user!.id;
    const emailKey = newEmail.toLowerCase();

    const otpData = signupOtpMap.get(emailKey);
    if (!otpData || otpData.code !== otp || Date.now() > otpData.expires) {
      throw new ApiError(400, "Mã xác thực OTP không chính xác hoặc đã hết hạn", "OTP_INVALID");
    }

    const exists = await prisma.user.findFirst({ where: { email: emailKey, NOT: { id: userId } } });
    if (exists) throw new ApiError(409, "Email này đã được sử dụng bởi tài khoản khác", "EMAIL_EXISTS");

    const user = await prisma.user.update({
      where: { id: userId },
      data: { email: emailKey, emailVerifiedAt: new Date() },
      select: { id: true, email: true, username: true, role: true, avatarUrl: true }
    });

    signupOtpMap.delete(emailKey);
    res.json({ user });
  } catch (error) {
    next(error);
  }
}

export async function deleteSelfAccount(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    await prisma.user.delete({ where: { id: userId } });
    res.clearCookie("rytoxgroup-csrf");
    res.clearCookie("streamforge-csrf");
    res.json({ success: true, message: "Tài khoản của bạn đã được xóa thành công" });
  } catch (error) {
    next(error);
  }
}

export async function getFavorites(req: Request, res: Response, next: NextFunction) {
  try {
    const profileId = String(req.params.profileId);
    const favorites = await (prisma.favorite as any).findMany({
      where: { profileId },
      include: {
        movie: {
          include: {
            genres: {
              include: {
                genre: true
              }
            }
          }
        }
      }
    });
    res.json({
      favorites: (favorites as any[]).map(f => ({
        ...f.movie,
        genres: f.movie?.genres?.map((g: any) => g.genre) || []
      }))
    });
  } catch (error) {
    next(error);
  }
}

export async function addFavorite(req: Request, res: Response, next: NextFunction) {
  try {
    const profileId = String(req.params.profileId);
    const movie = req.body;
    await prisma.movie.upsert({
      where: { id: movie.id },
      update: {
        title: movie.title,
        synopsis: movie.synopsis || movie.description || "",
        description: movie.description || movie.synopsis || "",
        posterUrl: movie.posterUrl || movie.poster || "",
        backdropUrl: movie.backdropUrl || movie.thumb || "",
        releaseYear: parseInt(movie.releaseYear) || parseInt(movie.year) || 2024,
        runtimeMinutes: parseInt(movie.runtimeMinutes) || 120,
        averageRating: parseFloat(movie.averageRating) || 0,
      },
      create: {
        id: movie.id,
        slug: movie.slug || movie.id,
        title: movie.title,
        synopsis: movie.synopsis || movie.description || "",
        description: movie.description || movie.synopsis || "",
        posterUrl: movie.posterUrl || movie.poster || "",
        backdropUrl: movie.backdropUrl || movie.thumb || "",
        releaseYear: parseInt(movie.releaseYear) || parseInt(movie.year) || 2024,
        runtimeMinutes: parseInt(movie.runtimeMinutes) || 120,
        maturityRating: "PG_13",
        averageRating: parseFloat(movie.averageRating) || 0,
      }
    });

    const item = await prisma.favorite.upsert({
      where: { profileId_movieId: { profileId, movieId: movie.id } },
      create: { profileId, movieId: movie.id },
      update: {}
    });
    res.json({ item });
  } catch (error) {
    next(error);
  }
}

export async function removeFavorite(req: Request, res: Response, next: NextFunction) {
  try {
    const profileId = String(req.params.profileId);
    const movieId = String(req.params.movieId);
    await prisma.favorite.delete({
      where: { profileId_movieId: { profileId, movieId } }
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function updateWatchProgress(req: Request, res: Response, next: NextFunction) {
  try {
    const profileId = String(req.params.profileId);
    const body = z.object({
      movieId: z.string(),
      episodeId: z.string().optional(),
      progressSeconds: z.number().int().min(0),
      durationSeconds: z.number().int().min(1)
    }).parse(req.body);
    const item = await prisma.watchHistory.upsert({
      where: { profileId_movieId_episodeId: { profileId, movieId: body.movieId, episodeId: body.episodeId ?? "" } },
      update: { ...body, episodeId: body.episodeId ?? "", completed: body.progressSeconds / body.durationSeconds > 0.9, lastWatchedAt: new Date() },
      create: { profileId, ...body, episodeId: body.episodeId ?? "", completed: body.progressSeconds / body.durationSeconds > 0.9 }
    });
    res.json({ item });
  } catch (error) {
    next(error);
  }
}

export async function getRecommendations(req: Request, res: Response, next: NextFunction) {
  try {
    const profileId = String(req.params.profileId);
    res.json({ recommendations: await recommendForProfile(profileId) });
  } catch (error) {
    next(error);
  }
}

// In-memory notifications fallback
const devNotificationsStore = new Map<string, Array<{
  id: string;
  userId: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}>>();

export async function getUserNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    try {
      let notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 30
      });

      // Seed initial welcoming notifications if none exist
      if (notifications.length === 0) {
        const seed = [
          {
            userId,
            title: "Chào mừng đến với RytoxGroup! 🎬",
            body: "Trải nghiệm rạp chiếu phim trực tuyến đỉnh cao với hình ảnh Full HD/4K sắc nét và âm thanh sống động.",
            readAt: null
          },
          {
            userId,
            title: "Tính năng mới: Đánh giá & Phụ đề CC ⭐",
            body: "Bạn đã có thể chấm điểm 1-10 sao, gửi bình luận và tùy chỉnh bật/tắt phụ đề Vietsub trực tiếp trên thanh điều khiển.",
            readAt: null
          },
          {
            userId,
            title: "Cập nhật tập mới hàng loạt 🚀",
            body: "Các bộ phim Anime và Phim truyền hình hot nhất tuần này đã được thêm đầy đủ các tập mới nhất.",
            readAt: null
          }
        ];
        await prisma.notification.createMany({ data: seed });
        notifications = await prisma.notification.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 30
        });
      }

      const unreadCount = notifications.filter((n) => !n.readAt).length;
      return res.json({ notifications, unreadCount });
    } catch {
      // Dev store fallback
      if (!devNotificationsStore.has(userId)) {
        devNotificationsStore.set(userId, [
          {
            id: `notif-1-${userId}`,
            userId,
            title: "Chào mừng đến với RytoxGroup! 🎬",
            body: "Trải nghiệm rạp chiếu phim trực tuyến đỉnh cao với hình ảnh Full HD/4K sắc nét và âm thanh sống động.",
            readAt: null,
            createdAt: new Date().toISOString()
          },
          {
            id: `notif-2-${userId}`,
            userId,
            title: "Tính năng mới: Đánh giá & Phụ đề CC ⭐",
            body: "Bạn đã có thể chấm điểm 1-10 sao, gửi bình luận và tùy chỉnh bật/tắt phụ đề Vietsub trực tiếp trên thanh điều khiển.",
            readAt: null,
            createdAt: new Date(Date.now() - 3600000).toISOString()
          },
          {
            id: `notif-3-${userId}`,
            userId,
            title: "Cập nhật tập mới hàng loạt 🚀",
            body: "Các bộ phim Anime và Phim truyền hình hot nhất tuần này đã được thêm đầy đủ các tập mới nhất.",
            readAt: null,
            createdAt: new Date(Date.now() - 7200000).toISOString()
          }
        ]);
      }
      const list = devNotificationsStore.get(userId)!;
      const unreadCount = list.filter((n) => !n.readAt).length;
      return res.json({ notifications: list, unreadCount });
    }
  } catch (error) {
    next(error);
  }
}

export async function markNotificationAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const notifId = String(req.params.id);
    const userId = req.user!.id;

    try {
      await prisma.notification.updateMany({
        where: { id: notifId, userId },
        data: { readAt: new Date() }
      });
      return res.json({ success: true });
    } catch {
      const list = devNotificationsStore.get(userId) || [];
      const item = list.find((n) => n.id === notifId);
      if (item) item.readAt = new Date().toISOString();
      return res.json({ success: true });
    }
  } catch (error) {
    next(error);
  }
}

export async function markAllNotificationsAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;

    try {
      await prisma.notification.updateMany({
        where: { userId, readAt: null },
        data: { readAt: new Date() }
      });
      return res.json({ success: true });
    } catch {
      const list = devNotificationsStore.get(userId) || [];
      list.forEach((n) => { n.readAt = new Date().toISOString(); });
      return res.json({ success: true });
    }
  } catch (error) {
    next(error);
  }
}

export async function getUserSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    try {
      const sub = await prisma.subscription.findFirst({
        where: { userId, status: "ACTIVE" },
        orderBy: { currentPeriodEnd: "desc" }
      });
      return res.json({ subscription: sub || null });
    } catch {
      return res.json({
        subscription: {
          id: `sub-vip-${userId}`,
          userId,
          tier: "PREMIUM",
          billingInterval: "YEARLY",
          status: "ACTIVE",
          priceCents: 17990,
          currentPeriodStart: new Date().toISOString(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          cancelAtPeriodEnd: false
        }
      });
    }
  } catch (error) {
    next(error);
  }
}

