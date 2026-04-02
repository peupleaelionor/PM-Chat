import type { User } from './user';
import type { MessageEnvelope } from './message';

export interface Conversation {
  id: string;
  participants: string[]; // user IDs
  participantProfiles?: User[];
  createdAt: string;
  lastMessageAt?: string;
  selfDestruct?: boolean;
  expiresAt?: string;
  lastMessage?: MessageEnvelope;
  unreadCount?: number;
}
