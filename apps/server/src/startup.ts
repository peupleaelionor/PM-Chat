import mongoose from "mongoose";
import { config } from "./config";
import { logger } from "./utils/logger";
import { getRedis } from "./redis";

let _connected = false;
let _connecting: Promise<void> | null = null;

/**
 * Ensures MongoDB and Redis are connected.
 * Safe to call concurrently — only one connection attempt is in-flight at a time.
 * Module-level state is preserved across warm Vercel container invocations.
 */
export async function ensureConnected(): Promise<void> {
  if (_connected) return;

  // Prevent duplicate concurrent connection attempts
  if (_connecting) {
    return _connecting;
  }

  _connecting = (async () => {
    if (mongoose.connection.readyState === 0) {
      mongoose.set("strictQuery", true);
      mongoose.connection.on("connected", () =>
        logger.info("MongoDB connected", {
          uri: config.MONGODB_URI.replace(/\/\/.*@/, "//***@"),
        })
      );
      mongoose.connection.on("error", (err) => logger.error("MongoDB error", { err }));
      mongoose.connection.on("disconnected", () => logger.warn("MongoDB disconnected"));
      await mongoose.connect(config.MONGODB_URI);
    }

    const redis = getRedis();
    // ioredis uses lazyConnect:true — connect only if not already connected/connecting
    if (redis.status === "close" || redis.status === "end" || redis.status === "wait") {
      await redis.connect();
    }

    _connected = true;
    _connecting = null;
  })();

  return _connecting;
}
