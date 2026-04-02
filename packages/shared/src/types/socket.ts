import type { MessageEnvelope, MessageStatus } from './message';

export interface ClientToServerEvents {
  'message:send': (payload: MessageEnvelope) => void;
  'typing:start': (conversationId: string) => void;
  'typing:stop': (conversationId: string) => void;
  'conversation:join': (conversationId: string) => void;
  'conversation:leave': (conversationId: string) => void;
  'message:delivered': (messageId: string) => void;
  'message:read': (messageId: string) => void;
  'key:exchange': (payload: { recipientId: string; publicKey: string }) => void;
}

export interface ServerToClientEvents {
  'message:new': (message: MessageEnvelope) => void;
  'typing:indicator': (payload: { conversationId: string; userId: string; isTyping: boolean }) => void;
  'user:presence': (payload: { userId: string; isOnline: boolean; lastSeen?: string }) => void;
  'message:status': (payload: { messageId: string; status: MessageStatus; timestamp: string }) => void;
  'key:received': (payload: { senderId: string; publicKey: string }) => void;
  'error': (payload: { code: string; message: string }) => void;
}
