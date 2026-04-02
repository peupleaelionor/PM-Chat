import Redis from "ioredis";
import { config } from "./config";
import { logger } from "./utils/logger";

let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      enableReadyCheck: true,
    });

    redisClient.on("connect", () => logger.info("Redis connected"));
    redisClient.on("error", (err) => logger.error("Redis error", { err }));
    redisClient.on("close", () => logger.warn("Redis connection closed"));
  }
  return redisClient;
}

export async function connectRedis(): Promise<void> {
  await getRedis().connect();
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info("Redis disconnected gracefully");
  }
}

// Redis key namespaces to keep things organised
export const REDIS_KEYS = {
  userPresence: (userId: string) => `presence:${userId}`,
  typingIndicator: (conversationId: string, userId: string) =>
    `typing:${conversationId}:${userId}`,
  tokenBlacklist: (jti: string) => `blacklist:${jti}`,
  messageNonce: (nonce: string) => `nonce:${nonce}`,
  refreshToken: (userId: string, jti: string) => `refresh:${userId}:${jti}`,
} as const;

// TTLs in seconds
export const REDIS_TTL = {
  presence: 30,          // Heartbeat must refresh within 30 s
  typing: 5,             // Auto-clear typing indicator after 5 s of inactivity
  nonce: 300,            // 5-minute replay window
  refreshToken: 7 * 24 * 3600, // 7 days
} as const;
