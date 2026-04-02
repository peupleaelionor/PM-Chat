import { Server as IOServer, Socket } from "socket.io";
import { getRedis, REDIS_KEYS, REDIS_TTL } from "../../redis";
import { parseSocketPayload } from "../guards";
import { logger } from "../../utils/logger";
import { z } from "zod";

const typingSchema = z.object({
  conversationId: z.string().min(1).max(128),
});

/**
 * Manages user presence (online/offline) and typing indicators.
 *
 * Presence state is stored in Redis with a TTL so a crashed client
 * is automatically considered offline after the TTL expires.
 */
export function registerPresenceHandlers(_io: IOServer, socket: Socket): void {
  const redis = getRedis();

  // Mark user online on connection
  void markOnline();

  async function markOnline(): Promise<void> {
    await redis.setex(REDIS_KEYS.userPresence(socket.userId), REDIS_TTL.presence, "online");
    socket.broadcast.emit("user:presence", { userId: socket.userId, status: "online" });
    logger.debug("User online", { userId: socket.userId });
  }

  // Heartbeat: client should send this every ~20 s to refresh presence TTL
  socket.on("user:online", async () => {
    await redis.setex(REDIS_KEYS.userPresence(socket.userId), REDIS_TTL.presence, "online");
  });

  // Typing started
  socket.on("typing:start", (data: unknown) => {
    const payload = parseSocketPayload<z.infer<typeof typingSchema>>(typingSchema, data);
    if (!payload) return;

    void redis.setex(
      REDIS_KEYS.typingIndicator(payload.conversationId, socket.userId),
      REDIS_TTL.typing,
      "1"
    );

    // Broadcast to everyone in the conversation room except the sender
    socket.to(`conv:${payload.conversationId}`).emit("typing:indicator", {
      conversationId: payload.conversationId,
      userId: socket.userId,
      isTyping: true,
    });
  });

  // Typing stopped
  socket.on("typing:stop", (data: unknown) => {
    const payload = parseSocketPayload<z.infer<typeof typingSchema>>(typingSchema, data);
    if (!payload) return;

    void redis.del(REDIS_KEYS.typingIndicator(payload.conversationId, socket.userId));

    socket.to(`conv:${payload.conversationId}`).emit("typing:indicator", {
      conversationId: payload.conversationId,
      userId: socket.userId,
      isTyping: false,
    });
  });

  // Mark offline on disconnect and clean up typing indicators
  socket.on("disconnect", async () => {
    await redis.del(REDIS_KEYS.userPresence(socket.userId));

    // Notify all rooms this socket was in
    socket.broadcast.emit("user:presence", { userId: socket.userId, status: "offline" });

    logger.debug("User offline", { userId: socket.userId });
  });
}
