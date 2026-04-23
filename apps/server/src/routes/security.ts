import { Router } from "express";
import { authMiddleware as authenticate } from "../middleware/auth";
import { getAllAgents, generateThreatReport, recordSecurityEvent } from "../agents";
import { getUserTier } from "../premium/middleware";
import { logger } from "../utils/logger";

const router = Router();

/**
 * GET /api/security/agents — Get status of all security agents.
 * Free users see basic agents. Premium users see all agents.
 */
router.get("/agents", authenticate, (req, res) => {
  const userId = (req as unknown as { userId: string }).userId;
  const tier = getUserTier(userId);
  const agents = getAllAgents();

  // Free users see all agents but premium ones are marked as locked
  const response = agents.map((agent) => {
    if (agent.premium && tier === "free") {
      return {
        ...agent,
        status: "disabled" as const,
        eventsProcessed: 0,
        threatsBlocked: 0,
        locked: true,
        unlockTier: "secure",
      };
    }
    return { ...agent, locked: false };
  });

  res.json({
    agents: response,
    userTier: tier,
    totalActive: agents.filter((a) => !a.premium || tier !== "free").length,
    totalAgents: agents.length,
  });
});

/**
 * GET /api/security/report — Get full threat report.
 * Available to secure and fortress tiers.
 */
router.get("/report", authenticate, (req, res) => {
  const userId = (req as unknown as { userId: string }).userId;
  const tier = getUserTier(userId);

  if (tier === "free") {
    res.status(403).json({
      error: "Rapport de sécurité disponible à partir du plan Sécurisé",
      currentTier: tier,
      upgradeUrl: "/api/premium/tiers",
    });
    return;
  }

  const report = generateThreatReport();
  res.json(report);
});

/**
 * POST /api/security/event — Report a security event (internal use).
 */
router.post("/event", authenticate, (req, res) => {
  const body = req.body as Record<string, unknown>;
  const agentId = body.agentId as string;
  const type = body.type as string;
  const severity = (body.severity as string) ?? "low";
  const message = (body.message as string) ?? "";

  if (!agentId || !type) {
    res.status(400).json({ error: "agentId et type sont requis" });
    return;
  }

  recordSecurityEvent({
    agentId: agentId as import("@pm-chat/shared").AgentId,
    type,
    severity: severity as import("@pm-chat/shared").ThreatLevel,
    message,
    metadata: (body.metadata as Record<string, unknown>) ?? {},
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userId: (req as unknown as { userId: string }).userId,
  });

  logger.info("Security event recorded", { agentId, type });
  res.json({ recorded: true });
});

export default router;
