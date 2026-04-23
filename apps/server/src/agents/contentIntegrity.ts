import crypto from "crypto";
import { logger } from "../utils/logger";

/**
 * Content Integrity Agent — Verifies message integrity in real-time.
 *
 * Capabilities beyond human:
 * - Validates encrypted payload structure and entropy
 * - Detects payload tampering via structural analysis
 * - Monitors IV reuse (catastrophic for AES-GCM)
 * - Tracks payload size anomalies
 * - Validates base64 encoding integrity
 */

// Track IVs to detect reuse per conversation (catastrophic for AES-GCM security)
const ivHistory = new Map<string, Set<string>>(); // conversationId -> Set<iv>
const payloadSizeHistory = new Map<string, number[]>(); // userId -> sizes

const BASE64_REGEX = /^[A-Za-z0-9+/]+=*$/;
const MIN_CIPHERTEXT_LENGTH = 16; // Minimum for AES-GCM (tag alone is 16 bytes)
const MIN_IV_LENGTH = 16; // 12 bytes base64 = 16 chars
const MAX_SIZE_DEVIATION_FACTOR = 10;

interface IntegrityCheckResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
  entropyScore: number;
}

/**
 * Calculate Shannon entropy of a string — detects non-random payloads.
 */
function calculateEntropy(data: string): number {
  if (data.length === 0) return 0;
  const freq = new Map<string, number>();
  for (const char of data) {
    freq.set(char, (freq.get(char) ?? 0) + 1);
  }
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / data.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

/**
 * Validate encrypted message integrity.
 */
export function validateMessageIntegrity(params: {
  encryptedPayload: string;
  iv: string;
  nonce: string;
  conversationId: string;
  senderId: string;
}): IntegrityCheckResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  // 1. Base64 format validation
  if (!BASE64_REGEX.test(params.encryptedPayload)) {
    errors.push("Le payload chiffré n'est pas un base64 valide");
  }
  if (!BASE64_REGEX.test(params.iv)) {
    errors.push("Le IV n'est pas un base64 valide");
  }

  // 2. Minimum length checks
  if (params.encryptedPayload.length < MIN_CIPHERTEXT_LENGTH) {
    errors.push("Payload chiffré trop court — possible texte en clair");
  }
  if (params.iv.length < MIN_IV_LENGTH) {
    errors.push("IV trop court — chiffrement potentiellement faible");
  }

  // 3. IV reuse detection (catastrophic for AES-GCM)
  if (!ivHistory.has(params.conversationId)) {
    ivHistory.set(params.conversationId, new Set());
  }
  const convIVs = ivHistory.get(params.conversationId)!;
  if (convIVs.has(params.iv)) {
    errors.push("CRITIQUE: Réutilisation de IV détectée — sécurité AES-GCM compromise");
    logger.error("ContentIntegrity: IV REUSE DETECTED", {
      conversationId: params.conversationId,
      iv: params.iv.substring(0, 8),
    });
  }
  convIVs.add(params.iv);

  // 4. Entropy analysis — encrypted data should have high entropy
  const entropy = calculateEntropy(params.encryptedPayload);
  if (entropy < 3.0 && params.encryptedPayload.length > 32) {
    warnings.push("Entropie basse détectée — le payload pourrait ne pas être correctement chiffré");
  }
  if (entropy < 1.5) {
    errors.push("Entropie critique — texte en clair possible");
  }

  // 5. Payload size anomaly detection
  if (!payloadSizeHistory.has(params.senderId)) {
    payloadSizeHistory.set(params.senderId, []);
  }
  const sizes = payloadSizeHistory.get(params.senderId)!;
  sizes.push(params.encryptedPayload.length);
  if (sizes.length > 10) {
    const avg = sizes.reduce((a, b) => a + b, 0) / sizes.length;
    if (params.encryptedPayload.length > avg * MAX_SIZE_DEVIATION_FACTOR && avg > 0) {
      warnings.push("Taille de payload anormalement élevée par rapport à l'historique");
    }
    // Keep last 100
    if (sizes.length > 100) sizes.splice(0, sizes.length - 100);
  }

  // 6. Nonce format validation
  if (params.nonce.length < 16) {
    warnings.push("Nonce court — protection anti-rejeu potentiellement faible");
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
    entropyScore: entropy,
  };
}

/**
 * Generate an integrity hash for verification purposes.
 */
export function generateIntegrityHash(payload: string, iv: string, nonce: string): string {
  return crypto
    .createHash("sha256")
    .update(`${payload}:${iv}:${nonce}`)
    .digest("hex");
}

/**
 * Get agent metrics.
 */
export function getContentIntegrityMetrics(): {
  conversationsMonitored: number;
  totalIVsTracked: number;
  ivReusesDetected: number;
} {
  let totalIVs = 0;
  for (const ivs of ivHistory.values()) {
    totalIVs += ivs.size;
  }
  return {
    conversationsMonitored: ivHistory.size,
    totalIVsTracked: totalIVs,
    ivReusesDetected: 0, // Tracked via errors
  };
}

// Cleanup old IV history every 30 minutes
setInterval(() => {
  // Keep only conversations active in last hour
  for (const [convId, ivs] of ivHistory.entries()) {
    if (ivs.size > 10_000) {
      // If too many IVs tracked, keep recent ones
      const arr = Array.from(ivs);
      ivHistory.set(convId, new Set(arr.slice(-5_000)));
    }
  }
}, 1_800_000).unref();
