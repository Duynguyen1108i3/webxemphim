import { Router } from "express";
import { z } from "zod";
import { optionalAuth } from "../middleware/auth.middleware.js";
import { telemetryService } from "../services/telemetry.service.js";
import { prisma } from "../lib/prisma.js";

const router = Router();

const heartbeatSchema = z.object({
  sessionId: z.string().min(1),
  movieId: z.string().min(1),
  movieTitle: z.string().default("Phim"),
  movieSlug: z.string().optional(),
  posterUrl: z.string().optional(),
  backdropUrl: z.string().optional(),
  episodeId: z.string().optional(),
  episodeTitle: z.string().optional(),
  currentTime: z.number().min(0).default(0),
  duration: z.number().min(0).default(1),
  isPaused: z.boolean().default(false),
  stopped: z.boolean().default(false),
  device: z.string().optional()
});

router.post("/heartbeat", optionalAuth, async (req, res, next) => {
  try {
    const data = heartbeatSchema.parse(req.body);

    let userDetails: { username?: string; email?: string; avatarUrl?: string; role?: string; profileId?: string } = {};

    if (req.user) {
      try {
        const dbUser = await prisma.user.findUnique({
          where: { id: req.user.id },
          select: {
            username: true,
            email: true,
            avatarUrl: true,
            role: true,
            profiles: { select: { id: true } }
          }
        });
        if (dbUser) {
          userDetails = {
            username: dbUser.username,
            email: dbUser.email,
            avatarUrl: dbUser.avatarUrl || undefined,
            role: dbUser.role,
            profileId: dbUser.profiles[0]?.id
          };
        }
      } catch {
        // Fallback to token user
        userDetails = {
          email: req.user.email,
          role: req.user.role
        };
      }
    }

    telemetryService.recordHeartbeat({
      ...data,
      userId: req.user?.id,
      ...userDetails,
      ipAddress: req.ip,
      device: data.device || req.get("user-agent")?.slice(0, 50) || "Trình duyệt Web"
    });

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;
