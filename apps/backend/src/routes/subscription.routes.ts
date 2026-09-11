import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();
router.use(requireAuth);

const prices = {
  BASIC: { MONTHLY: 799, YEARLY: 7990 },
  STANDARD: { MONTHLY: 1299, YEARLY: 12990 },
  PREMIUM: { MONTHLY: 1799, YEARLY: 17990 }
} as const;

router.get("/plans", (_req, res) => {
  res.json({
    plans: [
      { tier: "BASIC", screens: 1, quality: "720p", monthly: 799, yearly: 7990 },
      { tier: "STANDARD", screens: 2, quality: "1080p", monthly: 1299, yearly: 12990 },
      { tier: "PREMIUM", screens: 4, quality: "4K HDR", monthly: 1799, yearly: 17990 }
    ]
  });
});

router.post("/checkout", async (req, res, next) => {
  try {
    const body = z.object({ tier: z.enum(["BASIC", "STANDARD", "PREMIUM"]), billingInterval: z.enum(["MONTHLY", "YEARLY"]) }).parse(req.body);
    const months = body.billingInterval === "MONTHLY" ? 1 : 12;
    const subscription = await prisma.subscription.create({
      data: {
        userId: req.user!.id,
        tier: body.tier,
        billingInterval: body.billingInterval,
        priceCents: prices[body.tier][body.billingInterval],
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000)
      }
    });
    res.status(201).json({ subscription, checkoutUrl: `/billing/confirm/${subscription.id}` });
  } catch (error) {
    next(error);
  }
});

export default router;
