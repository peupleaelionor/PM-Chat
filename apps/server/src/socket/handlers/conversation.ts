import { Server as IOServer, Socket } from "socket.io";
import { Types } from "mongoose";
import { Conversation } from "../../models/Conversation";
import { parseSocketPayload } from "../guards";
import { logger } from "../../utils/logger";
import { z } from "zod";

const joinLeaveSchema = z.object({
  conversationId: z.string().regex(/^[a-f\d]{24}$/i),
});

/**
 * Handles joining/leaving Socket.IO rooms that map to conversations.
 * Validates that the requester is a participant before allowing room access.
 */
export function registerConversationHandlers(_io: IOServer, socket: Socket): void {
  // conversation:join – subscribe to real-time events for a conversation
  socket.on("conversation:join", async (data: unknown, ack?: (res: unknown) => void) => {
    const payload = parseSocketPayload<z.infer<typeof joinLeaveSchema>>(
      joinLeaveSchema,
      data,
      ack as ((err: { error: string }) => void) | undefined
    );
    if (!payload) return;

    try {
      const conversation = await Conversation.findOne({
        _id: new Types.ObjectId(payload.conversationId),
        participants: new Types.ObjectId(socket.userId),
      });

      if (!conversation) {
        ack?.({ error: "Not a participant or conversation does not exist" });
        return;
      }

      await socket.join(`conv:${payload.conversationId}`);
      logger.debug("Socket joined conversation", {
        userId: socket.userId,
        conversationId: payload.conversationId,
      });

      ack?.({ ok: true });
    } catch (err) {
      logger.error("conversation:join error", { err });
      ack?.({ error: "Server error" });
    }
  });

  // conversation:leave – unsubscribe from a conversation room
  socket.on("conversation:leave", (data: unknown, ack?: (res: unknown) => void) => {
    const payload = parseSocketPayload<z.infer<typeof joinLeaveSchema>>(
      joinLeaveSchema,
      data,
      ack as ((err: { error: string }) => void) | undefined
    );
    if (!payload) return;

    void socket.leave(`conv:${payload.conversationId}`);
    logger.debug("Socket left conversation", {
      userId: socket.userId,
      conversationId: payload.conversationId,
    });

    ack?.({ ok: true });
  });
}
