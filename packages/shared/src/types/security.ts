/**
 * Types for intelligent security agents.
 * Each agent operates autonomously to protect conversations beyond human capability.
 */

export type AgentId =
  | 'link-guard'
  | 'anomaly-detector'
  | 'content-integrity'
  | 'threat-intelligence'
  | 'session-protector'
  | 'behavior-analyzer'
  | 'crypto-watchdog'
  | 'phantom-guard';

export type AgentStatus = 'active' | 'standby' | 'alert' | 'disabled';

export type ThreatLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

export interface SecurityAgent {
  id: AgentId;
  name: string;
  description: string;
  status: AgentStatus;
  threatLevel: ThreatLevel;
  eventsProcessed: number;
  threatsBlocked: number;
  lastActivity: string; // ISO 8601
  premium: boolean; // true = premium-only agent
}

export interface SecurityEvent {
  agentId: AgentId;
  type: string;
  severity: ThreatLevel;
  message: string;
  metadata: Record<string, unknown>;
  timestamp: string;
  ip?: string;
  userId?: string;
}

export interface LinkProtection {
  token: string;
  conversationId: string;
  createdBy: string;
  expiresAt: string; // ISO 8601
  maxViews: number;
  currentViews: number;
  pinProtected: boolean;
  pinHash?: string;
  ipWhitelist: string[];
  oneTimeView: boolean;
  active: boolean;
  createdAt: string;
}

export interface ThreatReport {
  overallThreatLevel: ThreatLevel;
  agents: SecurityAgent[];
  recentEvents: SecurityEvent[];
  recommendations: string[];
  timestamp: string;
}

export interface AgentAction {
  agentId: AgentId;
  action: 'block' | 'warn' | 'throttle' | 'quarantine' | 'allow';
  reason: string;
  target: string; // IP, userId, or sessionId
  duration?: number; // seconds
  timestamp: string;
}
