import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { ApiError } from "../middleware/error.js";
import { recommendForProfile } from "../services/recommendation.service.js";

const router = Router();
router.use(requireAuth);

router.use("/profiles/:profileId", async (req, _res, next) => {
  try {
    const profile = await prisma.profile.findFirst({ where: { id: req.params.profileId, userId: req.user!.id }, select: { id: true } });
    if (!profile) throw new ApiError(403, "Profile does not belong to the authenticated user", "PROFILE_FORBIDDEN");
    next();
  } catch (error) {
    next(error);
  }
});

router.get("/me", async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true, role: true, avatarUrl: true, subscriptions: { orderBy: { currentPeriodEnd: "desc" }, take: 1 } }
    });
    if (!user) return next(new ApiError(401, "Authenticated user no longer exists", "UNAUTHENTICATED"));
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
    const profiles = await prisma.profile.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
    res.json({ user: { ...user, profiles } });
  } catch (error) {
    next(error);
  }
});

import bcrypt from "bcryptjs";
import { sendSignupOtp, signupOtpMap } from "../services/auth.service.js";

router.put("/me/avatar", async (req, res, next) => {
  try {
    const { avatarUrl } = z.object({ avatarUrl: z.string() }).parse(req.body);
    const userId = req.user!.id;
    const user = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: { id: true, email: true, username: true, role: true, avatarUrl: true }
    });
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

router.put("/me/username", async (req, res, next) => {
  try {
    const { username } = z.object({
      username: z.string()
        .min(3, "Tên người dùng phải có tối thiểu 3 ký tự")
        .max(32, "Tên người dùng không được vượt quá 32 ký tự")
        .regex(/^[a-zA-Z0-9_]+$/, "Tên người dùng chỉ chứa chữ cái, chữ số và dấu gạch dưới")
    }).parse(req.body);
    const userId = req.user!.id;

    const exists = await prisma.user.findFirst({ where: { username, NOT: { id: userId } } });
    if (exists) throw new ApiError(409, "Tên người dùng này đã được sử dụng", "USERNAME_EXISTS");

    const user = await prisma.user.update({
      where: { id: userId },
      data: { username },
      select: { id: true, email: true, username: true, role: true, avatarUrl: true }
    });
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

router.put("/me/password", async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = z.object({
      currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
      newPassword: z.string()
        .min(8, "Mật khẩu phải có tối thiểu 8 ký tự")
        .regex(/[A-Z]/, "Mật khẩu phải chứa ít nhất 1 chữ cái viết hoa")
        .regex(/[a-z]/, "Mật khẩu phải chứa ít nhất 1 chữ cái viết thường")
        .regex(/[0-9]/, "Mật khẩu phải chứa ít nhất 1 chữ số")
        .regex(/[^a-zA-Z0-9]/, "Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt")
    }).parse(req.body);
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
});

router.post("/me/send-email-otp", async (req, res, next) => {
  try {
    const { newEmail } = z.object({ newEmail: z.string().email("Địa chỉ email không hợp lệ") }).parse(req.body);
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
});

router.put("/me/email", async (req, res, next) => {
  try {
    const { newEmail, otp } = z.object({
      newEmail: z.string().email("Địa chỉ email không hợp lệ"),
      otp: z.string().length(6, "Mã xác thực OTP phải gồm 6 chữ số")
    }).parse(req.body);
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
});

// DELETE self account
router.delete("/me", async (req, res, next) => {
  try {
    const userId = req.user!.id;

    await prisma.user.delete({ where: { id: userId } });

    res.clearCookie("rytoxgroup-csrf");
    res.clearCookie("streamforge-csrf");
    res.json({ success: true, message: "Tài khoản của bạn đã được xóa thành công" });
  } catch (error) {
    next(error);
  }
});

// GET user favorites (My List)
router.get("/profiles/:profileId/my-list", async (req, res, next) => {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { profileId: req.params.profileId },
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
      favorites: favorites.map(f => ({
        ...f.movie,
        genres: f.movie.genres.map(g => g.genre)
      }))
    });
  } catch (error) {
    next(error);
  }
});

// ADD to favorites (My List)
router.post("/profiles/:profileId/my-list", async (req, res, next) => {
  try {
    const movie = req.body;

    // Ensure the Movie exists in the database
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
      }
    });

    const item = await prisma.favorite.upsert({
      where: { profileId_movieId: { profileId: req.params.profileId, movieId: movie.id } },
      create: { profileId: req.params.profileId, movieId: movie.id },
      update: {}
    });
    res.json({ item });
  } catch (error) {
    next(error);
  }
});

// DELETE from favorites (My List)
router.delete("/profiles/:profileId/my-list/:movieId", async (req, res, next) => {
  try {
    await prisma.favorite.delete({
      where: { profileId_movieId: { profileId: req.params.profileId, movieId: req.params.movieId } }
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post("/profiles/:profileId/watch-progress", async (req, res, next) => {
  try {
    const body = z.object({
      movieId: z.string(),
      episodeId: z.string().optional(),
      progressSeconds: z.number().int().min(0),
      durationSeconds: z.number().int().min(1)
    }).parse(req.body);
    const item = await prisma.watchHistory.upsert({
      where: { profileId_movieId_episodeId: { profileId: req.params.profileId, movieId: body.movieId, episodeId: body.episodeId ?? "" } },
      update: { ...body, episodeId: body.episodeId ?? "", completed: body.progressSeconds / body.durationSeconds > 0.9, lastWatchedAt: new Date() },
      create: { profileId: req.params.profileId, ...body, episodeId: body.episodeId ?? "", completed: body.progressSeconds / body.durationSeconds > 0.9 }
    });
    res.json({ item });
  } catch (error) {
    next(error);
  }
});

router.get("/profiles/:profileId/recommendations", async (req, res, next) => {
  try {
    res.json({ recommendations: await recommendForProfile(req.params.profileId) });
  } catch (error) {
    next(error);
  }
});

export default router;
