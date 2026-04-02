import { Router, Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { Conversation } from "../models/Conversation";
import { Message } from "../models/Message";
import { authMiddleware } from "../middleware/auth";
import { createError } from "../middleware/errorHandler";

const router = Router();
router.use(authMiddleware);

/**
 * GET /api/messages/:conversationId
 *
 * Returns a page of messages in descending timestamp order (newest first).
 * Cursor-based pagination using the `before` query param (message timestamp ISO string).
 *
 * Query params:
 *   - limit  (number, 1–100, default 50)
 *   - before (ISO string cursor – return messages older than this timestamp)
 */
router.get(
  "/:conversationId",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { conversationId } = req.params;

      // Ensure the requester is a participant
      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: new Types.ObjectId(req.userId),
      });

      if (!conversation) {
        next(createError("Conversation not found or access denied", 404));
        return;
      }

      const limit = Math.min(Number(req.query["limit"] ?? 50), 100);
      const before = req.query["before"] as string | undefined;

      const filter: Record<string, unknown> = { conversationId: conversation._id };

      if (before) {
        filter["timestamp"] = { $lt: new Date(before) };
      }

      const messages = await Message.find(filter)
        .sort({ timestamp: -1 })
        .limit(limit);

      const nextCursor =
        messages.length === limit
          ? messages[messages.length - 1]?.timestamp.toISOString()
          : null;

      res.json({ messages, nextCursor });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
