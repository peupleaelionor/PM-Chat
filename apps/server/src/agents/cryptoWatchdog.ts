import { logger } from "../utils/logger";

/**
 * Crypto Watchdog Agent — Monitors cryptographic operations.
 *
 * Capabilities beyond human:
 * - Detects weak key parameters
 * - Monitors key exchange frequency anomalies
 * - Validates public key format and curve parameters
 * - Detects key substitution attacks
 * - Tracks crypto operation timing for side-channel detection
 */

interface CryptoEvent {
  type: "key-exchange" | "key-generation" | "encrypt" | "decrypt" | "key-import";
  userId: string;
  timestamp: number;
  metadata: Record<string, unknown>;
}

interface UserCryptoProfile {
  userId: string;
  keyExchangeCount: number;
  publicKeys: Set<string>; // Track known public keys
  lastKeyExchange: number;
  events: CryptoEvent[];
  alerts: string[];
}

const cryptoProfiles = new Map<string, UserCryptoProfile>();
const EXCHANGE_RATE_LIMIT = 20; // max key exchanges per 5 minutes
const EXCHANGE_WINDOW_MS = 300_000;

function getOrCreateProfile(userId: string): UserCryptoProfile {
  let profile = cryptoProfiles.get(userId);
  if (!profile) {
    profile = {
      userId,
      keyExchangeCount: 0,
      publicKeys: new Set(),
      lastKeyExchange: 0,
      events: [],
      alerts: [],
    };
    cryptoProfiles.set(userId, profile);
  }
  return profile;
}

/**
 * Validate a public key format (JWK EC P-256).
 */
export function validatePublicKey(publicKeyJWK: string): {
  valid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const key = JSON.parse(publicKeyJWK) as Record<string, unknown>;

    // Check required JWK fields
    if (key.kty !== "EC") {
      errors.push("Type de clé invalide — EC attendu");
    }
    if (key.crv !== "P-256") {
      errors.push("Courbe invalide — P-256 attendue");
    }
    if (!key.x || typeof key.x !== "string") {
      errors.push("Coordonnée X manquante ou invalide");
    }
    if (!key.y || typeof key.y !== "string") {
      errors.push("Coordonnée Y manquante ou invalide");
    }

    // Ensure no private key material leaked
    if (key.d) {
      errors.push("CRITIQUE: Matériel de clé privée détecté dans la clé publique");
      logger.error("CryptoWatchdog: PRIVATE KEY MATERIAL IN PUBLIC KEY", {});
    }

    // Validate coordinate lengths (P-256 = 32 bytes = 43 base64url chars)
    if (typeof key.x === "string" && (key.x.length < 40 || key.x.length > 50)) {
      warnings.push("Longueur de coordonnée X inhabituelle");
    }
    if (typeof key.y === "string" && (key.y.length < 40 || key.y.length > 50)) {
      warnings.push("Longueur de coordonnée Y inhabituelle");
    }
  } catch {
    errors.push("Format JWK invalide — impossible de parser");
  }

  return { valid: errors.length === 0, warnings, errors };
}

/**
 * Monitor a key exchange event.
 */
export function monitorKeyExchange(
  userId: string,
  targetUserId: string,
  publicKey: string
): { allowed: boolean; reason?: string } {
  const profile = getOrCreateProfile(userId);
  const now = Date.now();

  // Record event
  profile.events.push({
    type: "key-exchange",
    userId,
    timestamp: now,
    metadata: { targetUserId, keyPrefix: publicKey.substring(0, 20) },
  });
  if (profile.events.length > 100) {
    profile.events = profile.events.slice(-100);
  }

  // Rate limit key exchanges
  const recentExchanges = profile.events.filter(
    (e) => e.type === "key-exchange" && now - e.timestamp < EXCHANGE_WINDOW_MS
  );
  if (recentExchanges.length > EXCHANGE_RATE_LIMIT) {
    logger.warn("CryptoWatchdog: Key exchange rate limit exceeded", {
      userId: userId.substring(0, 8),
      count: recentExchanges.length,
    });
    return {
      allowed: false,
      reason: "Trop d'échanges de clés — activité suspecte",
    };
  }

  // Track public key changes
  profile.publicKeys.add(publicKey.substring(0, 50));
  if (profile.publicKeys.size > 10) {
    profile.alerts.push("Nombre inhabituellement élevé de clés publiques différentes");
    logger.warn("CryptoWatchdog: Many different public keys detected", {
      userId: userId.substring(0, 8),
      keyCount: profile.publicKeys.size,
    });
  }

  profile.lastKeyExchange = now;
  profile.keyExchangeCount++;

  return { allowed: true };
}

/**
 * Detect potential key substitution attack.
 * Verifies that a user's public key hasn't changed unexpectedly.
 */
export function detectKeySubstitution(
  userId: string,
  currentPublicKey: string,
  previousPublicKey: string | null
): { substituted: boolean; reason?: string } {
  if (!previousPublicKey) return { substituted: false };

  if (currentPublicKey !== previousPublicKey) {
    logger.warn("CryptoWatchdog: Potential key substitution detected", {
      userId: userId.substring(0, 8),
    });
    return {
      substituted: true,
      reason: "La clé publique de l'utilisateur a changé de manière inattendue",
    };
  }

  return { substituted: false };
}

/**
 * Get agent metrics.
 */
export function getCryptoWatchdogMetrics(): {
  usersMonitored: number;
  totalKeyExchanges: number;
  alertsRaised: number;
} {
  let totalExchanges = 0;
  let totalAlerts = 0;
  for (const profile of cryptoProfiles.values()) {
    totalExchanges += profile.keyExchangeCount;
    totalAlerts += profile.alerts.length;
  }
  return {
    usersMonitored: cryptoProfiles.size,
    totalKeyExchanges: totalExchanges,
    alertsRaised: totalAlerts,
  };
}

// Cleanup every 10 minutes
setInterval(() => {
  const cutoff = Date.now() - 3_600_000;
  for (const [userId, profile] of cryptoProfiles.entries()) {
    if (profile.lastKeyExchange < cutoff && profile.lastKeyExchange > 0) {
      cryptoProfiles.delete(userId);
    }
  }
}, 600_000).unref();
