import http from "http";
import { config } from "./config";
import { logger } from "./utils/logger";
import { connectDB, disconnectDB } from "./db";
import { connectRedis, disconnectRedis } from "./redis";
import { initSocket } from "./socket";
import { clearBurnTimers } from "./socket/handlers/message";
import { Message } from "./models/Message";
import { Conversation } from "./models/Conversation";
import { cleanupSocketBuckets } from "./middleware/socketRateLimiter";
import { createExpressApp } from "./createApp";

// ── HTTP + Socket.IO server ───────────────────────────────────────────────────
const app = createExpressApp();
const httpServer = http.createServer(app);
initSocket(httpServer);

// ── Background jobs ───────────────────────────────────────────────────────────

/**
 * Periodically purges messages whose expiresAt has passed but weren't caught
 * by the MongoDB TTL index (which runs on a ~60-second cadence in MongoDB).
 * Also removes conversations whose TTL has expired.
 */
function startMessageExpiryJob(): NodeJS.Timeout {
  return setInterval(async () => {
    try {
      const now = new Date();
      const msgResult = await Message.deleteMany({ expiresAt: { $lte: now } });
      const convResult = await Conversation.deleteMany({
        selfDestruct: true,
        expiresAt: { $lte: now },
      });

      if (msgResult.deletedCount > 0 || convResult.deletedCount > 0) {
        logger.info("Expiry job ran", {
          messagesDeleted: msgResult.deletedCount,
          conversationsDeleted: convResult.deletedCount,
        });
      }
    } catch (err) {
      logger.error("Message expiry job failed", { err });
    }
  }, config.MESSAGE_EXPIRY_JOB_INTERVAL_MS);
}

// ── Startup ───────────────────────────────────────────────────────────────────
async function start(): Promise<void> {
  await connectDB();
  await connectRedis();

  const expiryJob = startMessageExpiryJob();

  // Socket rate limiter bucket cleanup
  const socketCleanupJob = setInterval(cleanupSocketBuckets, 30_000);

  httpServer.listen(config.PORT, config.HOST, () => {
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    logger.info(`🚀 PM-Chat server ready`);
    logger.info(`   Environment: ${config.NODE_ENV}`);
    logger.info(`   Security mode: ${config.securityMode}`);
    logger.info(`   Port: ${config.PORT}`);
    logger.info(`   Host: ${config.HOST}`);
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    if (!config.isProduction) {
      logger.warn("⚠️  SECURITY MODE: DEV — Do not use in production without proper secrets");
    }
  });

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  async function shutdown(signal: string): Promise<void> {
    logger.info(`Received ${signal}, shutting down…`);
    clearInterval(expiryJob);
    clearInterval(socketCleanupJob);
    clearBurnTimers();

    httpServer.close(async () => {
      await Promise.allSettled([disconnectDB(), disconnectRedis()]);
      logger.info("Shutdown complete");
      process.exit(0);
    });

    // Force exit if graceful shutdown takes too long
    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, config.SHUTDOWN_TIMEOUT_MS).unref();
  }

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

start().catch((err: unknown) => {
  logger.error("Failed to start server", { err });
  process.exit(1);
});
