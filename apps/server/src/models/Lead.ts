import { Schema, model, Document, Types } from "mongoose";

export type LeadType = "pilot" | "contact";
export type LeadStatus = "new" | "contacted" | "closed";

export interface ILead extends Document {
  _id: Types.ObjectId;
  type: LeadType;
  name: string;
  email: string;
  message: string;
  // Pilot-specific
  organisation?: string;
  context?: string;
  deviceCount?: string;
  environment?: string;
  // Contact-specific
  subject?: string;
  // Internal
  status: LeadStatus;
  priority: "high" | "normal";
  createdAt: Date;
  updatedAt: Date;
}

const leadSchema = new Schema<ILead>(
  {
    type: {
      type: String,
      enum: ["pilot", "contact"],
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 128 },
    email: { type: String, required: true, trim: true, maxlength: 256, index: true },
    message: { type: String, required: true, maxlength: 4096 },
    organisation: { type: String, trim: true, maxlength: 256 },
    context: { type: String, maxlength: 2048 },
    deviceCount: { type: String, maxlength: 32 },
    environment: { type: String, maxlength: 256 },
    subject: { type: String, trim: true, maxlength: 256 },
    status: {
      type: String,
      enum: ["new", "contacted", "closed"],
      default: "new",
      index: true,
    },
    priority: {
      type: String,
      enum: ["high", "normal"],
      default: "normal",
    },
  },
  { timestamps: true }
);

export const Lead = model<ILead>("Lead", leadSchema);
