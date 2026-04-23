import type { PremiumTier, TierDefinition } from "@pm-chat/shared";

/**
 * Premium tier definitions.
 *
 * Free tier: Full E2EE + 3 basic agents (link-guard, anomaly-detector, content-integrity)
 * Secure tier: +4 advanced agents (threat-intelligence, session-protector, behavior-analyzer, crypto-watchdog)
 * Fortress tier: +phantom-guard, extended retention, priority support
 */

export const TIER_DEFINITIONS: Record<PremiumTier, TierDefinition> = {
  free: {
    id: "free",
    name: "Libre",
    description: "Chiffrement E2EE complet + protection de base — gratuit pour tous",
    price: 0,
    features: [
      { id: "e2ee", name: "Chiffrement de bout en bout", description: "AES-GCM 256 + ECDH P-256", included: true },
      { id: "link-share", name: "Partage par lien", description: "Liens protégés avec expiration", included: true },
      { id: "burn-after-reading", name: "Lecture unique", description: "Messages éphémères", included: true },
      { id: "basic-agents", name: "3 agents de protection", description: "Link Guard, Anomaly Detector, Content Integrity", included: true },
      { id: "advanced-agents", name: "Agents avancés", description: "Threat Intelligence, Session Protector, etc.", included: false },
      { id: "phantom-guard", name: "Garde fantôme", description: "Watermarking invisible et détection d'extraction", included: false },
      { id: "priority-support", name: "Support prioritaire", description: "Réponse sous 4 heures", included: false },
    ],
    agentIds: ["link-guard", "anomaly-detector", "content-integrity"],
    maxConversations: 10,
    maxMessageRetentionDays: 7,
    maxSharedLinks: 5,
    prioritySupport: false,
  },
  secure: {
    id: "secure",
    name: "Sécurisé",
    description: "Protection avancée avec agents intelligents — pour ceux qui veulent plus de sécurité",
    price: 4.99,
    features: [
      { id: "e2ee", name: "Chiffrement de bout en bout", description: "AES-GCM 256 + ECDH P-256", included: true },
      { id: "link-share", name: "Partage par lien", description: "Liens protégés avec PIN et IP whitelist", included: true },
      { id: "burn-after-reading", name: "Lecture unique", description: "Messages éphémères", included: true },
      { id: "basic-agents", name: "3 agents de protection", description: "Link Guard, Anomaly Detector, Content Integrity", included: true },
      { id: "advanced-agents", name: "4 agents avancés", description: "Threat Intelligence, Session Protector, Behavior Analyzer, Crypto Watchdog", included: true },
      { id: "phantom-guard", name: "Garde fantôme", description: "Watermarking invisible et détection d'extraction", included: false },
      { id: "priority-support", name: "Support prioritaire", description: "Réponse sous 4 heures", included: false },
    ],
    agentIds: [
      "link-guard", "anomaly-detector", "content-integrity",
      "threat-intelligence", "session-protector", "behavior-analyzer", "crypto-watchdog",
    ],
    maxConversations: 50,
    maxMessageRetentionDays: 30,
    maxSharedLinks: 25,
    prioritySupport: false,
  },
  fortress: {
    id: "fortress",
    name: "Forteresse",
    description: "Protection maximale — tous les agents, watermarking invisible, support prioritaire",
    price: 14.99,
    features: [
      { id: "e2ee", name: "Chiffrement de bout en bout", description: "AES-GCM 256 + ECDH P-256", included: true },
      { id: "link-share", name: "Partage par lien", description: "Liens protégés — toutes les options", included: true },
      { id: "burn-after-reading", name: "Lecture unique", description: "Messages éphémères", included: true },
      { id: "basic-agents", name: "3 agents de protection", description: "Link Guard, Anomaly Detector, Content Integrity", included: true },
      { id: "advanced-agents", name: "4 agents avancés", description: "Threat Intelligence, Session Protector, Behavior Analyzer, Crypto Watchdog", included: true },
      { id: "phantom-guard", name: "Garde fantôme", description: "Watermarking invisible et détection d'extraction", included: true },
      { id: "priority-support", name: "Support prioritaire", description: "Réponse sous 4 heures", included: true },
    ],
    agentIds: [
      "link-guard", "anomaly-detector", "content-integrity",
      "threat-intelligence", "session-protector", "behavior-analyzer", "crypto-watchdog",
      "phantom-guard",
    ],
    maxConversations: -1, // unlimited
    maxMessageRetentionDays: 90,
    maxSharedLinks: -1, // unlimited
    prioritySupport: true,
  },
};

/**
 * Get all tier definitions.
 */
export function getAllTiers(): TierDefinition[] {
  return Object.values(TIER_DEFINITIONS);
}

/**
 * Get a specific tier definition.
 */
export function getTier(tierId: PremiumTier): TierDefinition | undefined {
  return TIER_DEFINITIONS[tierId];
}

/**
 * Check if an agent is available for a given tier.
 */
export function isAgentAvailable(tierId: PremiumTier, agentId: string): boolean {
  const tier = TIER_DEFINITIONS[tierId];
  return tier ? tier.agentIds.includes(agentId) : false;
}

/**
 * Check if a feature is available for a given tier.
 */
export function isFeatureAvailable(tierId: PremiumTier, featureId: string): boolean {
  const tier = TIER_DEFINITIONS[tierId];
  if (!tier) return false;
  const feature = tier.features.find((f) => f.id === featureId);
  return feature?.included ?? false;
}
