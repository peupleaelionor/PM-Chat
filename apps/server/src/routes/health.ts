import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import { config } from "../config";
import { getRedis } from "../redis";
import { getSecurityMetricsJSON } from "../utils/securityMonitor";
import { getErrorSummary } from "../utils/errorTracker";

const router = Router();

/**
 * GET /health
 * Comprehensive health check with DB, Redis, and security status.
 */
router.get("/", async (_req: Request, res: Response) => {
  const mongoState = mongoose.connection.readyState;
  const mongoConnected = mongoState === 1;
  const mongoStatus = mongoConnected ? "connecté" : mongoState === 2 ? "en cours de connexion" : "déconnecté";

  let redisConnected = false;
  let redisStatus = "déconnecté";
  try {
    const redis = getRedis();
    const pong = await redis.ping();
    redisConnected = pong === "PONG";
    redisStatus = redisConnected ? "connecté" : "dégradé";
  } catch {
    redisStatus = "déconnecté";
  }

  const isHealthy = mongoConnected && redisConnected;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "ok" : "dégradé",
    timestamp: new Date().toISOString(),
    version: config.VERSION,
    securityMode: config.securityMode,
    services: {
      mongodb: mongoStatus,
      redis: redisStatus,
    },
    uptime: Math.floor(process.uptime()),
  });
});

/**
 * GET /health/detailed
 * Dev-only: detailed metrics including security and error tracking.
 */
router.get("/detailed", (_req: Request, res: Response) => {
  if (config.isProduction) {
    res.status(403).json({ error: "Non disponible en production" });
    return;
  }

  const memUsage = process.memoryUsage();

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: config.VERSION,
    securityMode: config.securityMode,
    uptime: Math.floor(process.uptime()),
    memory: {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    },
    security: getSecurityMetricsJSON(),
    errors: getErrorSummary(),
  });
});

export default router;
