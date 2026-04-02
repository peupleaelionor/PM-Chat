import { Socket } from "socket.io";
import { recordRateLimitHit } from "../utils/securityMonitor";
import { logger } from "../utils/logger";

interface RateBucket {
  count: number;
  windowStart: number;
}

const socketBuckets = new Map<string, RateBucket>();
const SOCKET_WINDOW_MS = 10_000; // 10 second window
const SOCKET_MAX_EVENTS = 30;    // Max 30 events per 10 seconds

/**
 * Check if a socket event should be rate-limited.
 * Returns true if the event should be blocked.
 */
export function isSocketRateLimited(socket: Socket): boolean {
  const key = socket.userId ?? socket.id;
  const now = Date.now();
  const bucket = socketBuckets.get(key);

  if (!bucket || now - bucket.windowStart > SOCKET_WINDOW_MS) {
    socketBuckets.set(key, { count: 1, windowStart: now });
    return false;
  }

  bucket.count++;
  if (bucket.count > SOCKET_MAX_EVENTS) {
    recordRateLimitHit(socket.handshake.address);
    logger.debug("Socket rate limited", { userId: socket.userId, socketId: socket.id });
    return true;
  }

  return false;
}

/**
 * Periodic cleanup of stale rate limit buckets (call every 30s).
 */
export function cleanupSocketBuckets(): void {
  const now = Date.now();
  for (const [key, bucket] of socketBuckets) {
    if (now - bucket.windowStart > SOCKET_WINDOW_MS * 2) {
      socketBuckets.delete(key);
    }
  }
}
