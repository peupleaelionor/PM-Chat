import { Server as IOServer, Socket } from "socket.io";
import { Types } from "mongoose";
import { z } from "zod";
import { Conversation } from "../../models/Conversation";
import { Message } from "../../models/Message";
import { getRedis, REDIS_KEYS, REDIS_TTL } from "../../redis";
import { parseSocketPayload } from "../guards";
import { logger } from "../../utils/logger";

// Track active burn-after-reading timers so they can be cancelled on shutdown
const burnTimers = new Set<ReturnType<typeof setTimeout>>();

/** Cancel all pending burn-after-reading timers (call during graceful shutdown). */
export function clearBurnTimers(): void {
  for (const t of burnTimers) clearTimeout(t);
  burnTimers.clear();
}

// ── Schemas ──────────────────────────────────────────────────────────────────

const sendMessageSchema = z.object({
  conversationId: z.string().regex(/^[a-f\d]{24}$/i),
  encryptedPayload: z.string().min(1).max(65_536),
  iv: z.string().min(1).max(64),
  nonce: z.string().min(8).max(128), // Replay-attack prevention
  encryptedAttachmentUrl: z.string().max(2048).optional(),
  expiresInMs: z.number().int().positive().max(7 * 24 * 3600 * 1000).optional(),
  burnAfterReading: z.boolean().optional(),
});

const statusSchema = z.object({
  messageId: z.string().regex(/^[a-f\d]{24}$/i),
  conversationId: z.string().regex(/^[a-f\d]{24}$/i),
});

const keyExchangeSchema = z.object({
  targetUserId: z.string().regex(/^[a-f\d]{24}$/i),
  encryptedKey: z.string().min(1).max(4096),
  conversationId: z.string().regex(/^[a-f\d]{24}$/i),
});

// ── Handlers ─────────────────────────────────────────────────────────────────

export function registerMessageHandlers(io: IOServer, socket: Socket): void {
  const redis = getRedis();

  /**
   * message:send
   * Client sends an encrypted message. We:
   *  1. Check replay attack nonce
   *  2. Verify sender is a participant
   *  3. Persist the encrypted payload
   *  4. Broadcast to the conversation room
   */
  socket.on("message:send", async (data: unknown, ack?: (res: unknown) => void) => {
    const payload = parseSocketPayload<z.infer<typeof sendMessageSchema>>(
      sendMessageSchema,
      data,
      ack as ((err: { error: string }) => void) | undefined
    );
    if (!payload) return;

    try {
      // ── Replay attack check ────────────────────────────────────────────────
      const nonceKey = REDIS_KEYS.messageNonce(payload.nonce);
      // NX = set only if not exists; returns null if already set
      const nonceSet = await redis.set(nonceKey, "1", "EX", REDIS_TTL.nonce, "NX");
      if (nonceSet === null) {
        ack?.({ error: "Duplicate message nonce detected (replay attack)" });
        return;
      }

      // ── Participant check ──────────────────────────────────────────────────
      const conversation = await Conversation.findOne({
        _id: new Types.ObjectId(payload.conversationId),
        participants: new Types.ObjectId(socket.userId),
      });

      if (!conversation) {
        ack?.({ error: "Not a participant or conversation does not exist" });
        return;
      }

      // ── Persist message ────────────────────────────────────────────────────
      const expiresAt = payload.expiresInMs
        ? new Date(Date.now() + payload.expiresInMs)
        : undefined;

      const message = await Message.create({
        conversationId: conversation._id,
        senderId: new Types.ObjectId(socket.userId),
        encryptedPayload: payload.encryptedPayload,
        iv: payload.iv,
        encryptedAttachmentUrl: payload.encryptedAttachmentUrl,
        expiresAt,
        burnAfterReading: payload.burnAfterReading ?? false,
        delivered: false,
        read: false,
      });

      // Update lastMessageAt on the conversation
      await Conversation.updateOne(
        { _id: conversation._id },
        { lastMessageAt: message.timestamp }
      );

      // ── Broadcast ──────────────────────────────────────────────────────────
      io.to(`conv:${payload.conversationId}`).emit("message:new", {
        messageId: message.id,
        conversationId: payload.conversationId,
        senderId: socket.userId,
        encryptedPayload: payload.encryptedPayload,
        iv: payload.iv,
        encryptedAttachmentUrl: payload.encryptedAttachmentUrl,
        timestamp: message.timestamp,
        expiresAt: message.expiresAt,
        burnAfterReading: message.burnAfterReading,
      });

      logger.debug("Message sent", {
        messageId: message.id,
        conversationId: payload.conversationId,
        userId: socket.userId,
      });

      ack?.({ ok: true, messageId: message.id });
    } catch (err) {
      logger.error("message:send error", { err });
      ack?.({ error: "Server error" });
    }
  });

  /**
   * message:delivered
   * Marks a message as delivered and notifies the sender.
   */
  socket.on("message:delivered", async (data: unknown, ack?: (res: unknown) => void) => {
    const payload = parseSocketPayload<z.infer<typeof statusSchema>>(
      statusSchema,
      data,
      ack as ((err: { error: string }) => void) | undefined
    );
    if (!payload) return;

    try {
      const message = await Message.findOneAndUpdate(
        {
          _id: new Types.ObjectId(payload.messageId),
          conversationId: new Types.ObjectId(payload.conversationId),
        },
        { delivered: true },
        { new: true }
      );

      if (!message) {
        ack?.({ error: "Message not found" });
        return;
      }

      // Notify the conversation so the sender sees the status update
      io.to(`conv:${payload.conversationId}`).emit("message:status", {
        messageId: payload.messageId,
        conversationId: payload.conversationId,
        status: "delivered",
      });

      ack?.({ ok: true });
    } catch (err) {
      logger.error("message:delivered error", { err });
      ack?.({ error: "Server error" });
    }
  });

  /**
   * message:read
   * Marks a message as read. If burnAfterReading is set, schedules deletion.
   */
  socket.on("message:read", async (data: unknown, ack?: (res: unknown) => void) => {
    const payload = parseSocketPayload<z.infer<typeof statusSchema>>(
      statusSchema,
      data,
      ack as ((err: { error: string }) => void) | undefined
    );
    if (!payload) return;

    try {
      const message = await Message.findOneAndUpdate(
        {
          _id: new Types.ObjectId(payload.messageId),
          conversationId: new Types.ObjectId(payload.conversationId),
        },
        { read: true, delivered: true },
        { new: true }
      );

      if (!message) {
        ack?.({ error: "Message not found" });
        return;
      }

      io.to(`conv:${payload.conversationId}`).emit("message:status", {
        messageId: payload.messageId,
        conversationId: payload.conversationId,
        status: "read",
      });

      // Burn-after-reading: schedule message deletion after a brief grace period.
      // The timer is unref'd so it won't keep the process alive during shutdown;
      // the MongoDB TTL index acts as a fallback for messages missed during a crash.
      if (message.burnAfterReading) {
        const timer = setTimeout(async () => {
          burnTimers.delete(timer);
          await Message.deleteOne({ _id: message._id });
          logger.debug("Burn-after-reading message deleted", { messageId: message.id });
        }, 3000); // 3-second grace period so the reader's UI can display it
        timer.unref();
        burnTimers.add(timer);
      }

      ack?.({ ok: true });
    } catch (err) {
      logger.error("message:read error", { err });
      ack?.({ error: "Server error" });
    }
  });

  /**
   * key:exchange
   * Forwards an encrypted session key to a specific user (E2EE key handshake).
   * The server is a passive relay – it never has access to the key.
   */
  socket.on("key:exchange", async (data: unknown, ack?: (res: unknown) => void) => {
    const payload = parseSocketPayload<z.infer<typeof keyExchangeSchema>>(
      keyExchangeSchema,
      data,
      ack as ((err: { error: string }) => void) | undefined
    );
    if (!payload) return;

    try {
      // Verify conversation membership before relaying
      const conversation = await Conversation.findOne({
        _id: new Types.ObjectId(payload.conversationId),
        participants: {
          $all: [
            new Types.ObjectId(socket.userId),
            new Types.ObjectId(payload.targetUserId),
          ],
        },
      });

      if (!conversation) {
        ack?.({ error: "Not a shared conversation participant" });
        return;
      }

      // Relay to the target user's room (they may have multiple sockets)
      io.to(`user:${payload.targetUserId}`).emit("key:received", {
        fromUserId: socket.userId,
        conversationId: payload.conversationId,
        encryptedKey: payload.encryptedKey,
      });

      ack?.({ ok: true });
    } catch (err) {
      logger.error("key:exchange error", { err });
      ack?.({ error: "Server error" });
    }
  });
}
