import { Schema, model, Document, Types } from "mongoose";

export interface IConversation extends Document {
  _id: Types.ObjectId;
  participants: Types.ObjectId[];
  createdAt: Date;
  lastMessageAt: Date;
  /** When true, the conversation and all messages are deleted after expiresAt */
  selfDestruct: boolean;
  expiresAt?: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    participants: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      required: true,
      validate: {
        validator: (arr: Types.ObjectId[]) => arr.length >= 2,
        message: "A conversation must have at least 2 participants",
      },
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    selfDestruct: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      index: { expireAfterSeconds: 0 }, // MongoDB TTL index for self-destruct convos
    },
  },
  { timestamps: true }
);

// Compound index so lookups by participant are efficient
conversationSchema.index({ participants: 1, lastMessageAt: -1 });

export const Conversation = model<IConversation>("Conversation", conversationSchema);
