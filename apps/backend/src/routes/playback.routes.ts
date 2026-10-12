import { Router } from "express";
import { z } from "zod";
import { optionalAuth } from "../middleware/auth.middleware.js";
import { telemetryService } from "../services/telemetry.service.js";
import { prisma } from "../lib/prisma.js";

const router = Router();

const heartbeatSchema = z.object({
  sessionId: z.string().min(1),
  userId: z.string().optional(),
  username: z.string().optional(),
  email: z.string().optional(),
  avatarUrl: z.string().optional(),
  role: z.string().optional(),
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

    let userDetails: { username?: string; email?: string; avatarUrl?: string; role?: string; profileId?: string } = {
      username: data.username,
      email: data.email,
      avatarUrl: data.avatarUrl,
      role: data.role
    };

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
            avatarUrl: dbUser.avatarUrl || data.avatarUrl || undefined,
            role: dbUser.role,
            profileId: dbUser.profiles[0]?.id
          };
        }
      } catch {
        // Fallback to token user or client payload
        userDetails = {
          username: data.username || req.user.username || req.user.email?.split("@")[0],
          email: req.user.email || data.email,
          avatarUrl: data.avatarUrl,
          role: req.user.role || data.role
        };
      }
    }

    telemetryService.recordHeartbeat({
      ...data,
      userId: req.user?.id || data.userId,
      ...userDetails,
      ipAddress: req.ip,
      device: data.device || req.get("user-agent")?.slice(0, 50) || "Trình duyệt Web"
    });

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

const presenceSchema = z.object({
  userId: z.string().optional(),
  email: z.string().optional(),
  username: z.string().optional(),
  currentPath: z.string().optional(),
  offline: z.boolean().default(false)
});

router.post("/presence", optionalAuth, (req, res, next) => {
  try {
    const body = presenceSchema.parse(req.body);
    const userId = req.user?.id || body.userId || "";
    const email = req.user?.email || body.email;
    const username = req.user?.username || body.username;

    if (userId || email) {
      telemetryService.recordUserPresence({
        userId,
        email,
        username,
        currentPath: body.currentPath,
        offline: body.offline
      });
    }

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

export default router;
