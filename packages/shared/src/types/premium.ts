/**
 * Premium security tiers.
 * Graduated security — free users get strong protection,
 * paying users get advanced intelligent agents.
 */

export type PremiumTier = 'free' | 'secure' | 'fortress';

export interface TierDefinition {
  id: PremiumTier;
  name: string;
  description: string;
  price: number; // EUR/month, 0 for free
  features: TierFeature[];
  agentIds: string[]; // which agents are included
  maxConversations: number;
  maxMessageRetentionDays: number;
  maxSharedLinks: number;
  prioritySupport: boolean;
}

export interface TierFeature {
  id: string;
  name: string;
  description: string;
  included: boolean;
}

export interface UserTier {
  userId: string;
  tier: PremiumTier;
  activatedAt: string;
  expiresAt?: string;
  features: string[]; // feature IDs enabled
}

export interface PremiumVerification {
  userId: string;
  tier: PremiumTier;
  featureId: string;
  allowed: boolean;
  reason?: string;
}
