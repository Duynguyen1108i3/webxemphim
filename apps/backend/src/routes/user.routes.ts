import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { recommendForProfile } from "../services/recommendation.service.js";

const router = Router();
router.use(requireAuth);

router.get("/me", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, username: true, role: true, avatarUrl: true, profiles: true, subscriptions: { orderBy: { currentPeriodEnd: "desc" }, take: 1 } }
    });
    res.json({ user });
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
