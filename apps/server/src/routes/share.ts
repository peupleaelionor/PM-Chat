import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/inputGuard";
import {
  createShareLink,
  validateLinkAccess,
  revokeLink,
  getUserLinks,
} from "../agents/linkGuard";
import { getUserTier } from "../premium/middleware";
import { TIER_DEFINITIONS } from "../premium/tiers";
import { CreateLinkShareSchema, AccessLinkShareSchema } from "@pm-chat/shared";
import { Conversation } from "../models/Conversation";
import { logger } from "../utils/logger";

const router = Router();

/**
 * POST /api/share — Create a protected share link for a conversation.
 */
router.post(
  "/",
  authenticate,
  validate(CreateLinkShareSchema),
  async (req, res) => {
    try {
      const userId = (req as unknown as { userId: string }).userId;
      const body = req.body as {
        conversationId: string;
        expiresInMinutes: number;
        maxViews: number;
        pin?: string;
        oneTimeView: boolean;
        ipWhitelist: string[];
      };

      // Verify user is participant
      const conversation = await Conversation.findById(body.conversationId);
      if (!conversation || !conversation.participants.includes(userId)) {
        res.status(404).json({ error: "Conversation non trouvée" });
        return;
      }

      // Check shared link limit based on tier
      const tier = getUserTier(userId);
      const tierDef = TIER_DEFINITIONS[tier];
      const existingLinks = getUserLinks(userId);
      if (tierDef.maxSharedLinks !== -1 && existingLinks.length >= tierDef.maxSharedLinks) {
        res.status(403).json({
          error: "Limite de liens partagés atteinte pour votre plan",
          currentCount: existingLinks.length,
          maxAllowed: tierDef.maxSharedLinks,
          upgradeUrl: "/api/premium/tiers",
        });
        return;
      }

      const link = createShareLink({
        conversationId: body.conversationId,
        createdBy: userId,
        expiresInMinutes: body.expiresInMinutes,
        maxViews: body.maxViews,
        pin: body.pin,
        oneTimeView: body.oneTimeView,
        ipWhitelist: body.ipWhitelist,
      });

      res.status(201).json({
        token: link.token,
        expiresAt: link.expiresAt.toISOString(),
        maxViews: link.maxViews,
        pinProtected: !!link.pinHash,
        oneTimeView: link.oneTimeView,
        shareUrl: `/share/${link.token}`,
      });
    } catch (err) {
      logger.error("Failed to create share link", { err });
      res.status(500).json({ error: "Erreur lors de la création du lien" });
    }
  }
);

/**
 * POST /api/share/access — Access a shared conversation via token.
 * This endpoint does NOT require authentication — it's for link recipients.
 */
router.post("/access", validate(AccessLinkShareSchema), (req, res) => {
  const body = req.body as { token: string; pin?: string };
  const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
  const userAgent = req.headers["user-agent"] ?? "unknown";

  const result = validateLinkAccess(body.token, ip, userAgent, body.pin);

  if (!result.allowed) {
    res.status(403).json({ error: result.reason });
    return;
  }

  res.json({
    allowed: true,
    conversationId: result.conversationId,
  });
});

/**
 * GET /api/share/links — Get all active share links for current user.
 */
router.get("/links", authenticate, (req, res) => {
  const userId = (req as unknown as { userId: string }).userId;
  const links = getUserLinks(userId);

  res.json({
    links: links.map((l) => ({
      token: l.token,
      conversationId: l.conversationId,
      expiresAt: l.expiresAt.toISOString(),
      maxViews: l.maxViews,
      currentViews: l.currentViews,
      pinProtected: !!l.pinHash,
      oneTimeView: l.oneTimeView,
      active: l.active,
      createdAt: l.createdAt.toISOString(),
    })),
    count: links.length,
  });
});

/**
 * DELETE /api/share/:token — Revoke a share link.
 */
router.delete("/:token", authenticate, (req, res) => {
  const userId = (req as unknown as { userId: string }).userId;
  const token = req.params.token;

  if (!token) {
    res.status(400).json({ error: "Jeton requis" });
    return;
  }

  const revoked = revokeLink(token, userId);
  if (!revoked) {
    res.status(404).json({ error: "Lien non trouvé ou non autorisé" });
    return;
  }

  res.json({ revoked: true });
});

export default router;
