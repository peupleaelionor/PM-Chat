import { ILead, Lead } from "../models/Lead";
import { logger } from "./logger";

const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 h

/**
 * Processes a freshly-created lead:
 * 1. Detects duplicates (same email within 24 h)
 * 2. Qualifies priority based on lead type
 * 3. Emits structured log events so ops tooling can react
 */
export async function processLead(lead: ILead): Promise<void> {
  // ── 1. Duplicate detection ────────────────────────────────────────────────
  const since = new Date(Date.now() - DUPLICATE_WINDOW_MS);
  const duplicateCount = await Lead.countDocuments({
    email: lead.email,
    createdAt: { $gte: since },
    _id: { $ne: lead._id },
  });

  if (duplicateCount > 0) {
    logger.warn("lead:duplicate", {
      leadId: lead._id.toString(),
      emailDomain: lead.email.split("@")[1] ?? "unknown",
      type: lead.type,
      duplicatesFound: duplicateCount,
    });
    return; // Do not re-alert for duplicates
  }

  // ── 2. Priority qualification ─────────────────────────────────────────────
  const priority = lead.type === "pilot" ? "high" : "normal";

  if (lead.priority !== priority) {
    await Lead.findByIdAndUpdate(lead._id, { priority });
    lead.priority = priority;
  }

  // ── 3. Structured alert ────────────────────────────────────────────────────
  const logPayload = {
    leadId: lead._id.toString(),
    type: lead.type,
    priority,
    name: lead.name,
    email: lead.email,
    ...(lead.organisation ? { organisation: lead.organisation } : {}),
    ...(lead.deviceCount ? { deviceCount: lead.deviceCount } : {}),
    ...(lead.subject ? { subject: lead.subject } : {}),
    createdAt: lead.createdAt,
  };

  if (priority === "high") {
    logger.warn("lead:new:pilot", logPayload);
  } else {
    logger.info("lead:new:contact", logPayload);
  }
}
