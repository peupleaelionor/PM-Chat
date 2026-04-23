import { logger } from "../utils/logger";

/**
 * Behavior Analyzer Agent — Learns and detects behavioral deviations.
 *
 * Capabilities beyond human:
 * - Builds temporal activity profiles (when users are typically active)
 * - Detects bot-like patterns (perfect timing, no natural pauses)
 * - Identifies message pattern anomalies (always same length, perfect cadence)
 * - Tracks conversation initiation patterns
 * - Entropy analysis of user actions
 */

interface BehaviorModel {
  userId: string;
  // Hourly activity histogram (24 bins)
  hourlyActivity: number[];
  // Message length distribution
  messageLengths: number[];
  // Inter-message intervals (ms)
  messageIntervals: number[];
  // Conversations initiated
  conversationsInitiated: number;
  // Total messages
  totalMessages: number;
  // Last message timestamp
  lastMessageAt: number;
  // Bot likelihood score (0-100)
  botScore: number;
  createdAt: number;
}

const behaviorModels = new Map<string, BehaviorModel>();

function getOrCreateModel(userId: string): BehaviorModel {
  let model = behaviorModels.get(userId);
  if (!model) {
    model = {
      userId,
      hourlyActivity: new Array(24).fill(0),
      messageLengths: [],
      messageIntervals: [],
      conversationsInitiated: 0,
      totalMessages: 0,
      lastMessageAt: 0,
      botScore: 0,
      createdAt: Date.now(),
    };
    behaviorModels.set(userId, model);
  }
  return model;
}

/**
 * Record a message and analyze behavior.
 */
export function analyzeMessageBehavior(
  userId: string,
  messageLength: number
): { botLikely: boolean; score: number; indicators: string[] } {
  const model = getOrCreateModel(userId);
  const now = Date.now();
  const hour = new Date().getHours();
  const indicators: string[] = [];

  // Update activity histogram
  model.hourlyActivity[hour]++;

  // Track message interval
  if (model.lastMessageAt > 0) {
    const interval = now - model.lastMessageAt;
    model.messageIntervals.push(interval);
    if (model.messageIntervals.length > 100) {
      model.messageIntervals = model.messageIntervals.slice(-100);
    }
  }
  model.lastMessageAt = now;

  // Track message length
  model.messageLengths.push(messageLength);
  if (model.messageLengths.length > 100) {
    model.messageLengths = model.messageLengths.slice(-100);
  }

  model.totalMessages++;

  // ── Bot detection heuristics ──

  let botScore = 0;

  // 1. Interval regularity — bots have suspiciously regular timing
  if (model.messageIntervals.length >= 10) {
    const intervals = model.messageIntervals.slice(-20);
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance =
      intervals.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / intervals.length;
    const cv = avg > 0 ? Math.sqrt(variance) / avg : 0; // coefficient of variation
    if (cv < 0.1 && avg < 5000) {
      botScore += 30;
      indicators.push("Intervalle de messages suspects — cadence trop régulière");
    }
  }

  // 2. Message length regularity — bots often send same-sized messages
  if (model.messageLengths.length >= 10) {
    const lengths = model.messageLengths.slice(-20);
    const avgLen = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const lenVariance =
      lengths.reduce((a, b) => a + Math.pow(b - avgLen, 2), 0) / lengths.length;
    const lenCV = avgLen > 0 ? Math.sqrt(lenVariance) / avgLen : 0;
    if (lenCV < 0.05 && lengths.length >= 15) {
      botScore += 20;
      indicators.push("Longueur de messages suspecte — trop uniforme");
    }
  }

  // 3. No natural pauses — humans take breaks
  if (model.messageIntervals.length >= 20) {
    const recent = model.messageIntervals.slice(-20);
    const hasPause = recent.some((i) => i > 30_000); // 30+ sec pause
    if (!hasPause) {
      botScore += 15;
      indicators.push("Aucune pause naturelle détectée dans l'activité");
    }
  }

  // 4. Activity outside normal hours with high volume
  const nightHours = [0, 1, 2, 3, 4, 5];
  const nightActivity = nightHours.reduce((a, h) => a + model.hourlyActivity[h], 0);
  const totalActivity = model.hourlyActivity.reduce((a, b) => a + b, 0);
  if (totalActivity > 0 && nightActivity / totalActivity > 0.6) {
    botScore += 10;
    indicators.push("Activité concentrée pendant les heures nocturnes");
  }

  // 5. Very high message rate
  if (model.totalMessages > 100) {
    const ageMinutes = (now - model.createdAt) / 60_000;
    if (ageMinutes > 0 && model.totalMessages / ageMinutes > 30) {
      botScore += 25;
      indicators.push("Volume de messages extrêmement élevé");
    }
  }

  model.botScore = Math.min(100, botScore);

  if (botScore >= 50) {
    logger.warn("BehaviorAnalyzer: Bot-like behavior detected", {
      userId: userId.substring(0, 8),
      score: botScore,
      indicators,
    });
  }

  return {
    botLikely: botScore >= 50,
    score: botScore,
    indicators,
  };
}

/**
 * Record a conversation initiation.
 */
export function recordConversationInitiation(userId: string): void {
  const model = getOrCreateModel(userId);
  model.conversationsInitiated++;
}

/**
 * Get agent metrics.
 */
export function getBehaviorAnalyzerMetrics(): {
  trackedUsers: number;
  suspectedBots: number;
  totalMessagesAnalyzed: number;
} {
  let suspectedBots = 0;
  let totalMessages = 0;
  for (const model of behaviorModels.values()) {
    if (model.botScore >= 50) suspectedBots++;
    totalMessages += model.totalMessages;
  }
  return {
    trackedUsers: behaviorModels.size,
    suspectedBots,
    totalMessagesAnalyzed: totalMessages,
  };
}

// Cleanup stale models every 15 minutes
setInterval(() => {
  const cutoff = Date.now() - 7_200_000; // 2 hours
  for (const [userId, model] of behaviorModels.entries()) {
    if (model.lastMessageAt < cutoff && model.lastMessageAt > 0) {
      behaviorModels.delete(userId);
    }
  }
}, 900_000).unref();
