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
  const mongoStatus = mongoState === 1 ? "connected" : mongoState === 2 ? "connecting" : "disconnected";

  let redisStatus = "disconnected";
  try {
    const redis = getRedis();
    const pong = await redis.ping();
    redisStatus = pong === "PONG" ? "connected" : "degraded";
  } catch {
    redisStatus = "disconnected";
  }

  const isHealthy = mongoStatus === "connected" && redisStatus === "connected";

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "ok" : "degraded",
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
    res.status(403).json({ error: "Not available in production" });
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
