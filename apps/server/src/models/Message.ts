import { Schema, model, Document, Types } from "mongoose";

/**
 * Only encrypted payloads are stored – the server never sees plaintext.
 *
 * Encryption scheme (client-side):
 *   - Symmetric key derived from E2EE key exchange (e.g. ECDH + HKDF)
 *   - Message encrypted with AES-256-GCM
 *   - `encryptedPayload` = base64(ciphertext + authTag)
 *   - `iv` = base64(12-byte nonce)
 *   - `nonce` = unique replay-attack prevention token (stored in Redis, not here)
 */
export interface IMessage extends Document {
  _id: Types.ObjectId;
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  encryptedPayload: string;
  iv: string;
  /** Optional: base64-encoded encrypted attachment URL */
  encryptedAttachmentUrl?: string;
  timestamp: Date;
  expiresAt?: Date;
  burnAfterReading: boolean;
  delivered: boolean;
  read: boolean;
}

const messageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    encryptedPayload: {
      type: String,
      required: true,
      maxlength: 65_536, // ~48 KB – enforce server-side size limit
    },
    iv: {
      type: String,
      required: true,
      maxlength: 64,
    },
    encryptedAttachmentUrl: {
      type: String,
      maxlength: 2048,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    // MongoDB TTL index automatically removes expired messages
    expiresAt: {
      type: Date,
      index: { expireAfterSeconds: 0 },
    },
    burnAfterReading: {
      type: Boolean,
      default: false,
    },
    delivered: {
      type: Boolean,
      default: false,
      index: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: false } // We use `timestamp` field directly
);

// Compound index for cursor-based pagination (conversationId + timestamp)
messageSchema.index({ conversationId: 1, timestamp: -1 });

export const Message = model<IMessage>("Message", messageSchema);
