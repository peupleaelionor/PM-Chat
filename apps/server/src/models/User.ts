import { Schema, model, Document, Types } from "mongoose";

export interface IUser extends Document {
  _id: Types.ObjectId;
  nickname: string;
  /** Argon2/bcrypt hash of the account password (optional – anonymous accounts may omit) */
  passwordHash?: string;
  /** Client's base64-encoded EC public key for E2EE key exchange */
  publicKey: string;
  /** Stable device fingerprint so a returning device can reclaim its account */
  deviceFingerprint: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    nickname: {
      type: String,
      required: true,
      trim: true,
      maxlength: 64,
      index: true,
    },
    passwordHash: {
      type: String,
      select: false, // Never returned by default
    },
    publicKey: {
      type: String,
      required: true,
      maxlength: 2048,
    },
    deviceFingerprint: {
      type: String,
      required: true,
      maxlength: 256,
      index: true,
    },
  },
  {
    timestamps: true,
    // Never return password hash in JSON serialisation
    toJSON: {
      transform(_doc, ret) {
        delete ret.passwordHash;
        return ret;
      },
    },
  }
);

export const User = model<IUser>("User", userSchema);
