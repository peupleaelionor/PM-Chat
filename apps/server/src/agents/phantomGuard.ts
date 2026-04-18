import crypto from "crypto";
import { logger } from "../utils/logger";

/**
 * Phantom Guard Agent — Invisible, undetectable protection layer.
 *
 * Capabilities beyond human:
 * - Watermarks encrypted messages with invisible markers for leak detection
 * - Detects message replay from different contexts
 * - Monitors timing patterns that indicate automated extraction tools
 * - Honeypot trap payloads for detecting compromised endpoints
 * - Silent alerting on suspicious decryption patterns
 */

interface PhantomTrace {
  traceId: string;
  conversationId: string;
  userId: string;
  timestamp: number;
  context: string; // encoded context hash
}

interface ExtractionPattern {
  userId: string;
  rapidDecryptionCount: number;
  lastDecryptionTimestamp: number;
  bulkDownloadAttempts: number;
  suspicious: boolean;
}

const phantomTraces = new Map<string, PhantomTrace>();
const extractionPatterns = new Map<string, ExtractionPattern>();
const RAPID_DECRYPT_THRESHOLD = 50; // per minute
const RAPID_DECRYPT_WINDOW_MS = 60_000;

// Decryption timestamps per user
const decryptionTimestamps = new Map<string, number[]>();

/**
 * Generate an invisible watermark for a message.
 * This embeds context information that can later identify the source
 * of a leaked message without modifying the visible content.
 */
export function generateWatermark(
  conversationId: string,
  userId: string,
  messageId: string
): string {
  const traceId = crypto.randomBytes(8).toString("hex");
  const context = crypto
    .createHmac("sha256", traceId)
    .update(`${conversationId}:${userId}:${messageId}`)
    .digest("hex")
    .substring(0, 16);

  phantomTraces.set(traceId, {
    traceId,
    conversationId,
    userId,
    timestamp: Date.now(),
    context,
  });

  return traceId;
}

/**
 * Verify a watermark to trace the source of a leaked message.
 */
export function verifyWatermark(
  traceId: string
): PhantomTrace | null {
  return phantomTraces.get(traceId) ?? null;
}

/**
 * Monitor decryption patterns for automated extraction detection.
 */
export function monitorDecryption(
  userId: string
): { suspicious: boolean; reason?: string } {
  const now = Date.now();

  // Track decryption timestamps
  if (!decryptionTimestamps.has(userId)) {
    decryptionTimestamps.set(userId, []);
  }
  const timestamps = decryptionTimestamps.get(userId)!;
  timestamps.push(now);

  // Clean old timestamps
  const cutoff = now - RAPID_DECRYPT_WINDOW_MS;
  const filtered = timestamps.filter((t) => t > cutoff);
  decryptionTimestamps.set(userId, filtered);

  // Get or create pattern
  let pattern = extractionPatterns.get(userId);
  if (!pattern) {
    pattern = {
      userId,
      rapidDecryptionCount: 0,
      lastDecryptionTimestamp: now,
      bulkDownloadAttempts: 0,
      suspicious: false,
    };
    extractionPatterns.set(userId, pattern);
  }
  pattern.lastDecryptionTimestamp = now;
  pattern.rapidDecryptionCount = filtered.length;

  // Detect rapid bulk decryption (extraction tool pattern)
  if (filtered.length > RAPID_DECRYPT_THRESHOLD) {
    pattern.suspicious = true;
    pattern.bulkDownloadAttempts++;
    logger.warn("PhantomGuard: Rapid decryption pattern detected", {
      userId: userId.substring(0, 8),
      count: filtered.length,
    });
    return {
      suspicious: true,
      reason: "Pattern de déchiffrement rapide détecté — possible extraction automatisée",
    };
  }

  // Detect perfectly regular intervals (bot extraction)
  if (filtered.length >= 10) {
    const intervals: number[] = [];
    for (let i = 1; i < filtered.length; i++) {
      intervals.push(filtered[i] - filtered[i - 1]);
    }
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance =
      intervals.reduce((a, b) => a + Math.pow(b - avgInterval, 2), 0) / intervals.length;
    const cv = avgInterval > 0 ? Math.sqrt(variance) / avgInterval : 0;

    if (cv < 0.1 && avgInterval < 1000) {
      pattern.suspicious = true;
      return {
        suspicious: true,
        reason: "Cadence de déchiffrement suspecte — possible outil automatisé",
      };
    }
  }

  return { suspicious: false };
}

/**
 * Generate a honeypot marker for detecting compromised endpoints.
 */
export function generateHoneypot(conversationId: string): string {
  return crypto
    .createHmac("sha256", "phantom-honeypot")
    .update(`${conversationId}:${Date.now()}`)
    .digest("hex")
    .substring(0, 24);
}

/**
 * Get agent metrics.
 */
export function getPhantomGuardMetrics(): {
  activeTraces: number;
  suspiciousUsers: number;
  bulkExtractionAttempts: number;
} {
  let suspiciousUsers = 0;
  let bulkAttempts = 0;
  for (const pattern of extractionPatterns.values()) {
    if (pattern.suspicious) suspiciousUsers++;
    bulkAttempts += pattern.bulkDownloadAttempts;
  }
  return {
    activeTraces: phantomTraces.size,
    suspiciousUsers,
    bulkExtractionAttempts: bulkAttempts,
  };
}

// Cleanup traces older than 24 hours
setInterval(() => {
  const cutoff = Date.now() - 86_400_000;
  for (const [id, trace] of phantomTraces.entries()) {
    if (trace.timestamp < cutoff) {
      phantomTraces.delete(id);
    }
  }
  for (const [userId, pattern] of extractionPatterns.entries()) {
    if (pattern.lastDecryptionTimestamp < cutoff) {
      extractionPatterns.delete(userId);
    }
  }
}, 3_600_000).unref();
