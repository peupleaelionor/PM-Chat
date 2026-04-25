import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import crypto from "crypto";
import { Lead } from "../models/Lead";
import { validate } from "../middleware/inputGuard";
import { authRateLimiter } from "../middleware/rateLimiter";
import { processLead } from "../utils/leadAgent";
import { createError } from "../middleware/errorHandler";
import { logger } from "../utils/logger";
import { config } from "../config";

const router = Router();

// ── Schemas ───────────────────────────────────────────────────────────────────

const pilotSchema = z.object({
  type: z.literal("pilot"),
  name: z.string().min(1).max(128).trim(),
  email: z.string().email().max(256).trim(),
  message: z.string().min(1).max(4096).trim(),
  organisation: z.string().min(1).max(256).trim(),
  context: z.string().max(2048).trim().optional(),
  deviceCount: z.string().max(32).optional(),
  environment: z.string().max(256).trim().optional(),
});

const contactSchema = z.object({
  type: z.literal("contact"),
  name: z.string().min(1).max(128).trim(),
  email: z.string().email().max(256).trim(),
  message: z.string().min(1).max(4096).trim(),
  subject: z.string().min(1).max(256).trim(),
});

const leadSchema = z.discriminatedUnion("type", [pilotSchema, contactSchema]);

// ── POST /api/leads ───────────────────────────────────────────────────────────

router.post(
  "/",
  authRateLimiter,
  validate(leadSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = req.body as z.infer<typeof leadSchema>;
      const lead = await Lead.create(data);

      // Fire-and-forget: agent errors must not break the HTTP response
      processLead(lead).catch((err) =>
        logger.error("leadAgent:error", { error: (err as Error).message, leadId: lead._id.toString() })
      );

      res.status(201).json({ id: lead._id.toString(), status: lead.status });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/leads (admin only) ───────────────────────────────────────────────

const ALLOWED_STATUSES = new Set(["new", "contacted", "closed"]);
const ALLOWED_TYPES = new Set(["pilot", "contact"]);

router.get(
  "/",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminToken = process.env.ADMIN_TOKEN;
      const provided = req.headers["x-admin-token"];

      // Constant-time comparison to prevent timing attacks
      const isAuthorized =
        adminToken &&
        typeof provided === "string" &&
        provided.length === adminToken.length &&
        crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(adminToken));

      if (!isAuthorized) {
        next(createError("Non autorisé", 401));
        return;
      }

      const { status, type, page = "1", limit = "50" } = req.query as Record<string, string>;

      // Validate against allowed values before building the filter
      const filter: Record<string, string> = {};
      if (status !== undefined) {
        if (!ALLOWED_STATUSES.has(status)) {
          next(createError("Valeur de statut invalide", 400));
          return;
        }
        filter["status"] = status;
      }
      if (type !== undefined) {
        if (!ALLOWED_TYPES.has(type)) {
          next(createError("Valeur de type invalide", 400));
          return;
        }
        filter["type"] = type;
      }

      const pageNum = Math.max(1, parseInt(page, 10));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

      const [total, leads] = await Promise.all([
        Lead.countDocuments(filter),
        Lead.find(filter)
          .sort({ createdAt: -1 })
          .skip((pageNum - 1) * limitNum)
          .limit(limitNum)
          .lean(),
      ]);

      if (!config.isProduction) {
        logger.debug("leads:list", { filter, page: pageNum, limit: limitNum, total });
      }

      res.json({ total, page: pageNum, limit: limitNum, leads });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
