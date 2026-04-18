import { Request, Response, NextFunction } from "express";
import type { PremiumTier } from "@pm-chat/shared";
import { isFeatureAvailable, isAgentAvailable } from "./tiers";

/**
 * Premium Middleware — Gates features based on user tier.
 *
 * In-memory user tier store (production would use DB).
 * Free tier users get full basic protection — no degraded experience.
 * Premium features are additive, never subtractive.
 */

// User tier store (userId -> tier)
const userTiers = new Map<string, { tier: PremiumTier; activatedAt: string; expiresAt?: string }>();

/**
 * Get user's current tier (defaults to free).
 */
export function getUserTier(userId: string): PremiumTier {
  const entry = userTiers.get(userId);
  if (!entry) return "free";

  // Check expiration
  if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) {
    userTiers.delete(userId);
    return "free";
  }

  return entry.tier;
}

/**
 * Set user's premium tier.
 */
export function setUserTier(
  userId: string,
  tier: PremiumTier,
  durationDays?: number
): void {
  userTiers.set(userId, {
    tier,
    activatedAt: new Date().toISOString(),
    expiresAt: durationDays
      ? new Date(Date.now() + durationDays * 86_400_000).toISOString()
      : undefined,
  });
}

/**
 * Middleware factory: require a specific feature.
 * Returns 403 if user's tier doesn't include the feature.
 */
export function requireFeature(featureId: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userId = (req as unknown as { userId?: string }).userId;
    if (!userId) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }

    const tier = getUserTier(userId);
    if (!isFeatureAvailable(tier, featureId)) {
      res.status(403).json({
        error: "Fonctionnalité non disponible dans votre plan",
        feature: featureId,
        currentTier: tier,
        requiredTier: "secure",
        upgradeUrl: "/api/premium/tiers",
      });
      return;
    }

    next();
  };
}

/**
 * Middleware factory: require a specific agent to be available.
 */
export function requireAgent(agentId: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userId = (req as unknown as { userId?: string }).userId;
    if (!userId) {
      res.status(401).json({ error: "Non authentifié" });
      return;
    }

    const tier = getUserTier(userId);
    if (!isAgentAvailable(tier, agentId)) {
      res.status(403).json({
        error: "Agent non disponible dans votre plan",
        agent: agentId,
        currentTier: tier,
        upgradeUrl: "/api/premium/tiers",
      });
      return;
    }

    next();
  };
}
