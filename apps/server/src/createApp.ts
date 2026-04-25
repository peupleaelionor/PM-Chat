import path from "path";
import fs from "fs";
import express from "express";
import helmet from "helmet";
import cors from "cors";

import { config } from "./config";
import { logger } from "./utils/logger";
import { globalRateLimiter } from "./middleware/rateLimiter";
import { sanitizeBody } from "./middleware/inputGuard";
import { errorHandler } from "./middleware/errorHandler";
import { networkGuard, integrityGuard, sessionGuard } from "./middleware/securityGuards";

import healthRouter from "./routes/health";
import authRouter from "./routes/auth";
import conversationsRouter from "./routes/conversations";
import messagesRouter from "./routes/messages";
import attachmentsRouter from "./routes/attachments";
import leadsRouter from "./routes/leads";

/**
 * Creates and returns a fully-configured Express application.
 * Does NOT start an HTTP server — callers are responsible for that.
 * Safe to call in both a traditional Node.js server and Vercel serverless.
 */
export function createExpressApp(): express.Express {
  // Ensure upload directory exists (uses /tmp in read-only environments)
  const uploadDir = path.resolve(config.UPLOAD_DIR);
  try {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      logger.info("Created upload directory", { path: uploadDir });
    }
  } catch (err) {
    logger.warn("Could not create upload directory (read-only filesystem?)", { path: uploadDir, err });
  }

  const app = express();

  // ── Security headers ────────────────────────────────────────────────────────
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "same-origin" },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          connectSrc: ["'self'"],
        },
      },
    })
  );

  // ── CORS ─────────────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  // ── Body parsing ──────────────────────────────────────────────────────────────
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));

  // ── Input sanitization ────────────────────────────────────────────────────────
  app.use(sanitizeBody);

  // ── Security guards ───────────────────────────────────────────────────────────
  app.use(networkGuard);
  app.use(integrityGuard);

  // ── Global rate limiter ───────────────────────────────────────────────────────
  app.use(globalRateLimiter);

  // ── Session guard for authenticated routes ────────────────────────────────────
  app.use("/api/conversations", sessionGuard);
  app.use("/api/messages", sessionGuard);
  app.use("/api/attachments", sessionGuard);

  // ── Routes ────────────────────────────────────────────────────────────────────
  app.use("/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/conversations", conversationsRouter);
  app.use("/api/messages", messagesRouter);
  app.use("/api/attachments", attachmentsRouter);
  app.use("/api/leads", leadsRouter);

  // ── 404 fallback ──────────────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  // ── Global error handler ──────────────────────────────────────────────────────
  app.use(errorHandler);

  return app;
}
