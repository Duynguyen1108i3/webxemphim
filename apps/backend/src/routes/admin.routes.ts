import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ApiError } from "../middleware/error.js";

const router = Router();
router.use(requireAuth, requireRole("ADMIN", "SUPER_ADMIN"));

router.get("/dashboard", async (_req, res, next) => {
  try {
    const [totalUsers, activeSubscriptions, revenue, views, watch] = await Promise.all([
      prisma.user.count(),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.payment.aggregate({ where: { status: "SUCCEEDED" }, _sum: { amountCents: true } }),
      prisma.watchHistory.count(),
      prisma.watchHistory.aggregate({ _sum: { progressSeconds: true } })
    ]);
    res.json({
      totalUsers,
      activeSubscriptions,
      revenueCents: revenue._sum.amountCents ?? 0,
      views,
      watchTimeSeconds: watch._sum.progressSeconds ?? 0
    });
  } catch (error) {
    next(error);
  }
});

router.post("/movies", async (req, res, next) => {
  try {
    const body = movieSchema.parse(req.body);
    const movie = await prisma.movie.create({ data: body });
    res.status(201).json({ movie });
  } catch (error) {
    next(error);
  }
});

router.patch("/movies/:id", async (req, res, next) => {
  try {
    const movie = await prisma.movie.update({ where: { id: req.params.id }, data: movieSchema.partial().parse(req.body) });
    res.json({ movie });
  } catch (error) {
    next(error);
  }
});

router.delete("/movies/:id", async (req, res, next) => {
  try {
    await prisma.movie.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get("/users", async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = (req.query.search as string || "").trim();

    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" as const } },
            { username: { contains: search, mode: "insensitive" as const } }
          ]
        }
      : {};

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          avatarUrl: true,
          createdAt: true,
          bannedAt: true,
          suspendedUntil: true,
          subscriptions: { orderBy: { currentPeriodEnd: "desc" }, take: 1, select: { status: true, tier: true } }
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit
      })
    ]);

    res.json({ total, users, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
});

router.delete("/users/:id", async (req, res, next) => {
  try {
    const targetUserId = req.params.id;
    
    // Prevent admin from deleting themselves accidentally
    if (targetUserId === req.user!.id) {
      throw new ApiError(400, "Bạn không thể tự xóa tài khoản Quản trị viên của chính mình tại đây.", "CANNOT_DELETE_SELF");
    }

    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) {
      throw new ApiError(404, "Tài khoản không tồn tại", "USER_NOT_FOUND");
    }

    // Cascade delete user from DB (Prisma handles all onDelete: Cascade relations)
    await prisma.user.delete({ where: { id: targetUserId } });

    res.json({ success: true, message: "Đã xóa tài khoản vĩnh viễn" });
  } catch (error) {
    next(error);
  }
});

router.patch("/users/:id/moderation", async (req, res, next) => {
  try {
    const body = z.object({ action: z.enum(["BAN", "SUSPEND", "RESTORE"]) }).parse(req.body);
    const data = body.action === "BAN" ? { bannedAt: new Date() } : body.action === "SUSPEND" ? { suspendedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } : { bannedAt: null, suspendedUntil: null };
    res.json({ user: await prisma.user.update({ where: { id: req.params.id }, data }) });
  } catch (error) {
    next(error);
  }
});

const movieSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  synopsis: z.string().min(1),
  description: z.string().min(1),
  posterUrl: z.string().url(),
  backdropUrl: z.string().url(),
  trailerUrl: z.string().url().optional(),
  hlsUrl: z.string().url().optional(),
  dashUrl: z.string().url().optional(),
  releaseYear: z.number().int().min(1888),
  runtimeMinutes: z.number().int().min(1),
  maturityRating: z.enum(["G", "PG", "PG_13", "R", "NC_17", "TV_Y", "TV_G", "TV_PG", "TV_14", "TV_MA"]),
  averageRating: z.number().min(0).max(5).default(0),
  popularityScore: z.number().min(0).default(0),
  publishedAt: z.coerce.date().optional()
});

export default router;
