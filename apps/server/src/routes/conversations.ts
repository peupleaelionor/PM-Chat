import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { Conversation } from "../models/Conversation";
import { Message } from "../models/Message";
import { User } from "../models/User";
import { authMiddleware } from "../middleware/auth";
import { validate } from "../middleware/inputGuard";
import { createError } from "../middleware/errorHandler";

const router = Router();
router.use(authMiddleware);

// ── Schemas ──────────────────────────────────────────────────────────────────

const createConversationSchema = z.object({
  participantIds: z
    .array(z.string().regex(/^[a-f\d]{24}$/i, "Invalid user ID"))
    .min(1)
    .max(49), // up to 50 participants including self
  selfDestruct: z.boolean().optional(),
  /** ISO 8601 duration in milliseconds until the conversation self-destructs */
  expiresInMs: z.number().int().positive().max(7 * 24 * 3600 * 1000).optional(),
});

// ── Handlers ─────────────────────────────────────────────────────────────────

/**
 * GET /api/conversations
 * Returns all conversations the authenticated user participates in,
 * sorted by most recent message (cursor-based pagination on lastMessageAt).
 */
router.get("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const limit = Math.min(Number(req.query["limit"] ?? 20), 50);
    const before = req.query["before"] as string | undefined; // cursor: lastMessageAt ISO string

    const filter: Record<string, unknown> = {
      participants: new Types.ObjectId(req.userId),
    };

    if (before) {
      filter["lastMessageAt"] = { $lt: new Date(before) };
    }

    const conversations = await Conversation.find(filter)
      .sort({ lastMessageAt: -1 })
      .limit(limit)
      .populate("participants", "nickname publicKey");

    const nextCursor =
      conversations.length === limit
        ? conversations[conversations.length - 1]?.lastMessageAt.toISOString()
        : null;

    res.json({ conversations, nextCursor });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/conversations
 * Creates a new conversation between the authenticated user and given participants.
 */
router.post(
  "/",
  validate(createConversationSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { participantIds, selfDestruct, expiresInMs } = req.body as z.infer<
        typeof createConversationSchema
      >;

      // Include the creator in participants
      const allIds = Array.from(new Set([req.userId, ...participantIds]));
      const objectIds = allIds.map((id) => new Types.ObjectId(id));

      // Verify all participants exist
      const existingCount = await User.countDocuments({ _id: { $in: objectIds } });
      if (existingCount !== objectIds.length) {
        next(createError("One or more participants not found", 404));
        return;
      }

      const expiresAt =
        selfDestruct && expiresInMs ? new Date(Date.now() + expiresInMs) : undefined;

      const conversation = await Conversation.create({
        participants: objectIds,
        selfDestruct: selfDestruct ?? false,
        expiresAt,
        lastMessageAt: new Date(),
      });

      await conversation.populate("participants", "nickname publicKey");

      res.status(201).json({ conversation });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/conversations/:id
 * Returns a single conversation if the requester is a participant.
 */
router.get("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params["id"],
      participants: new Types.ObjectId(req.userId),
    }).populate("participants", "nickname publicKey");

    if (!conversation) {
      next(createError("Conversation not found", 404));
      return;
    }

    res.json({ conversation });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/conversations/:id
 * Deletes the conversation and all its messages (only participants can do this).
 */
router.delete("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params["id"],
      participants: new Types.ObjectId(req.userId),
    });

    if (!conversation) {
      next(createError("Conversation not found", 404));
      return;
    }

    await Promise.all([
      Message.deleteMany({ conversationId: conversation._id }),
      conversation.deleteOne(),
    ]);

    res.json({ message: "Conversation deleted" });
  } catch (err) {
    next(err);
  }
});

export default router;
