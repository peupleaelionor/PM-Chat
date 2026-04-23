import type { SecurityAgent, ThreatReport, SecurityEvent } from "@pm-chat/shared";
import { getLinkGuardMetrics } from "./linkGuard";
import { getAnomalyDetectorMetrics } from "./anomalyDetector";
import { getContentIntegrityMetrics } from "./contentIntegrity";
import { getThreatIntelligenceMetrics } from "./threatIntelligence";
import { getSessionProtectorMetrics } from "./sessionProtector";
import { getBehaviorAnalyzerMetrics } from "./behaviorAnalyzer";
import { getCryptoWatchdogMetrics } from "./cryptoWatchdog";
import { getPhantomGuardMetrics } from "./phantomGuard";
import { logger } from "../utils/logger";

/**
 * Agent Registry — Central management of all intelligent security agents.
 *
 * 8 agents working simultaneously, 24/7, at machine speed:
 * 1. Link Guard — Protects shared conversation links
 * 2. Anomaly Detector — Detects behavioral anomalies
 * 3. Content Integrity — Verifies message integrity & IV safety
 * 4. Threat Intelligence — Aggregated threat scoring & response
 * 5. Session Protector — Concurrent session & hijacking detection
 * 6. Behavior Analyzer — Bot detection & behavior profiling
 * 7. Crypto Watchdog — Monitors crypto operations & key safety
 * 8. Phantom Guard — Invisible watermarking & extraction detection
 */

// Recent security events (ring buffer)
const recentEvents: SecurityEvent[] = [];
const MAX_EVENTS = 200;

export function recordSecurityEvent(event: SecurityEvent): void {
  recentEvents.push(event);
  if (recentEvents.length > MAX_EVENTS) {
    recentEvents.shift();
  }
}

/**
 * Get status of all agents.
 */
export function getAllAgents(): SecurityAgent[] {
  const linkGuard = getLinkGuardMetrics();
  const anomalyDetector = getAnomalyDetectorMetrics();
  const contentIntegrity = getContentIntegrityMetrics();
  const threatIntelligence = getThreatIntelligenceMetrics();
  const sessionProtector = getSessionProtectorMetrics();
  const behaviorAnalyzer = getBehaviorAnalyzerMetrics();
  const cryptoWatchdog = getCryptoWatchdogMetrics();
  const phantomGuard = getPhantomGuardMetrics();

  const now = new Date().toISOString();

  return [
    {
      id: "link-guard",
      name: "Link Guard",
      description: "Protège les conversations partagées via des liens — expiration, PIN, IP, vue unique",
      status: "active",
      threatLevel: linkGuard.blockedAccesses > 0 ? "medium" : "none",
      eventsProcessed: linkGuard.totalAccesses,
      threatsBlocked: linkGuard.blockedAccesses,
      lastActivity: now,
      premium: false,
    },
    {
      id: "anomaly-detector",
      name: "Détecteur d'anomalies",
      description: "Analyse comportementale en temps réel — détection de vélocité, changement IP, profilage",
      status: "active",
      threatLevel: anomalyDetector.highRiskUsers > 0 ? "high" : "none",
      eventsProcessed: anomalyDetector.totalEvents,
      threatsBlocked: anomalyDetector.highRiskUsers,
      lastActivity: now,
      premium: false,
    },
    {
      id: "content-integrity",
      name: "Intégrité du contenu",
      description: "Validation de l'intégrité des messages — détection de réutilisation d'IV, analyse d'entropie",
      status: "active",
      threatLevel: "none",
      eventsProcessed: contentIntegrity.totalIVsTracked,
      threatsBlocked: contentIntegrity.ivReusesDetected,
      lastActivity: now,
      premium: false,
    },
    {
      id: "threat-intelligence",
      name: "Intelligence des menaces",
      description: "Score de menace unifié — agrège les signaux de tous les agents, réponse graduée",
      status: "active",
      threatLevel: threatIntelligence.quarantinedTargets > 0 ? "critical" : threatIntelligence.activeThreats > 0 ? "medium" : "none",
      eventsProcessed: threatIntelligence.totalSignals,
      threatsBlocked: threatIntelligence.quarantinedTargets,
      lastActivity: now,
      premium: true,
    },
    {
      id: "session-protector",
      name: "Protecteur de session",
      description: "Détection de piratage de session — empreinte, sessions concurrentes, anomalies",
      status: "active",
      threatLevel: sessionProtector.suspiciousSessions > 0 ? "high" : "none",
      eventsProcessed: sessionProtector.activeSessions,
      threatsBlocked: sessionProtector.suspiciousSessions,
      lastActivity: now,
      premium: true,
    },
    {
      id: "behavior-analyzer",
      name: "Analyseur de comportement",
      description: "Détection de bots — analyse temporelle, régularité, volumes, pauses naturelles",
      status: "active",
      threatLevel: behaviorAnalyzer.suspectedBots > 0 ? "high" : "none",
      eventsProcessed: behaviorAnalyzer.totalMessagesAnalyzed,
      threatsBlocked: behaviorAnalyzer.suspectedBots,
      lastActivity: now,
      premium: true,
    },
    {
      id: "crypto-watchdog",
      name: "Vigie cryptographique",
      description: "Surveillance crypto — validation des clés, détection de substitution, limites d'échange",
      status: "active",
      threatLevel: cryptoWatchdog.alertsRaised > 0 ? "medium" : "none",
      eventsProcessed: cryptoWatchdog.totalKeyExchanges,
      threatsBlocked: cryptoWatchdog.alertsRaised,
      lastActivity: now,
      premium: true,
    },
    {
      id: "phantom-guard",
      name: "Garde fantôme",
      description: "Protection invisible — watermark, détection d'extraction, honeypot, alerte silencieuse",
      status: "active",
      threatLevel: phantomGuard.suspiciousUsers > 0 ? "high" : "none",
      eventsProcessed: phantomGuard.activeTraces,
      threatsBlocked: phantomGuard.bulkExtractionAttempts,
      lastActivity: now,
      premium: true,
    },
  ];
}

/**
 * Generate a complete threat report.
 */
export function generateThreatReport(): ThreatReport {
  const agents = getAllAgents();
  const now = new Date().toISOString();

  // Determine overall threat level
  const levels = agents.map((a) => a.threatLevel);
  let overallThreatLevel: ThreatReport["overallThreatLevel"] = "none";
  if (levels.includes("critical")) overallThreatLevel = "critical";
  else if (levels.includes("high")) overallThreatLevel = "high";
  else if (levels.includes("medium")) overallThreatLevel = "medium";
  else if (levels.includes("low")) overallThreatLevel = "low";

  // Generate recommendations
  const recommendations: string[] = [];
  for (const agent of agents) {
    if (agent.threatLevel === "critical") {
      recommendations.push(`CRITIQUE: ${agent.name} — menace active détectée. Action immédiate recommandée.`);
    } else if (agent.threatLevel === "high") {
      recommendations.push(`ALERTE: ${agent.name} — niveau de menace élevé. Surveillance renforcée activée.`);
    }
  }
  if (recommendations.length === 0) {
    recommendations.push("Aucune menace détectée. Tous les agents sont opérationnels.");
  }

  logger.info("Threat report generated", { overallThreatLevel, activeAgents: agents.length });

  return {
    overallThreatLevel,
    agents,
    recentEvents: recentEvents.slice(-50),
    recommendations,
    timestamp: now,
  };
}

// Re-export individual agents
export { createShareLink, validateLinkAccess, revokeLink, getUserLinks } from "./linkGuard";
export { recordMessageEvent, recordLoginEvent, getAnomalyScore } from "./anomalyDetector";
export { validateMessageIntegrity, generateIntegrityHash } from "./contentIntegrity";
export { reportThreatSignal, checkThreatStatus, scanForMaliciousPatterns } from "./threatIntelligence";
export { registerSession, validateSession, removeSession } from "./sessionProtector";
export { analyzeMessageBehavior, recordConversationInitiation } from "./behaviorAnalyzer";
export { validatePublicKey, monitorKeyExchange, detectKeySubstitution } from "./cryptoWatchdog";
export { generateWatermark, verifyWatermark, monitorDecryption, generateHoneypot } from "./phantomGuard";
