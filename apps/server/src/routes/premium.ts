import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { getAllTiers } from "../premium/tiers";
import { getUserTier, setUserTier } from "../premium/middleware";
import { isFeatureAvailable } from "../premium/tiers";
import { logger } from "../utils/logger";

const router = Router();

/**
 * GET /api/premium/tiers — List all available tiers and pricing.
 * Public endpoint — no auth required.
 */
router.get("/tiers", (_req, res) => {
  const tiers = getAllTiers();
  res.json({ tiers });
});

/**
 * GET /api/premium/me — Get current user's tier and features.
 */
router.get("/me", authenticate, (req, res) => {
  const userId = (req as unknown as { userId: string }).userId;
  const tier = getUserTier(userId);
  const tiers = getAllTiers();
  const currentTier = tiers.find((t) => t.id === tier);

  res.json({
    userId,
    tier,
    features: currentTier?.features ?? [],
    limits: currentTier
      ? {
          maxConversations: currentTier.maxConversations,
          maxMessageRetentionDays: currentTier.maxMessageRetentionDays,
          maxSharedLinks: currentTier.maxSharedLinks,
          prioritySupport: currentTier.prioritySupport,
        }
      : null,
  });
});

/**
 * POST /api/premium/activate — Activate a premium tier.
 *
 * In a real implementation this would integrate with Stripe/payment processor.
 * For now, accepts tier activation requests and stores them.
 * The payment flow would be:
 * 1. Client requests tier activation
 * 2. Server creates a payment intent
 * 3. Client completes payment
 * 4. Webhook confirms payment → tier activated
 */
router.post("/activate", authenticate, (req, res) => {
  const userId = (req as unknown as { userId: string }).userId;
  const body = req.body as { tier?: string; durationDays?: number };

  const tier = body.tier;
  if (!tier || !["free", "secure", "fortress"].includes(tier)) {
    res.status(400).json({ error: "Plan invalide. Options: free, secure, fortress" });
    return;
  }

  const durationDays = body.durationDays ?? 30;
  setUserTier(userId, tier as "free" | "secure" | "fortress", durationDays);

  logger.info("Premium tier activated", {
    userId: userId.substring(0, 8),
    tier,
    durationDays,
  });

  res.json({
    success: true,
    tier,
    activatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + durationDays * 86_400_000).toISOString(),
    message: `Plan ${tier} activé pour ${durationDays} jours`,
  });
});

/**
 * POST /api/premium/verify — Verify if a specific feature is available.
 */
router.post("/verify", authenticate, (req, res) => {
  const userId = (req as unknown as { userId: string }).userId;
  const body = req.body as { featureId?: string };

  if (!body.featureId) {
    res.status(400).json({ error: "featureId est requis" });
    return;
  }

  const tier = getUserTier(userId);
  const allowed = isFeatureAvailable(tier, body.featureId);

  res.json({
    userId,
    tier,
    featureId: body.featureId,
    allowed,
    reason: allowed
      ? "Fonctionnalité disponible dans votre plan"
      : "Mise à niveau nécessaire pour accéder à cette fonctionnalité",
  });
});

export default router;
