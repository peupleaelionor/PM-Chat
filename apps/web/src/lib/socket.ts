import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3001';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    throw new Error('Socket not initialized. Call initSocket() first.');
  }
  return socket;
}

export function initSocket(token: string): Socket {
  if (socket?.connected) {
    return socket;
  }

  socket = io(WS_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function isSocketReady(): boolean {
  return socket?.connected ?? false;
}

// ── Typed event helpers ───────────────────────────────────────────────────────

export interface SendMessagePayload {
  conversationId: string;
  encryptedPayload: string;
  iv: string;
  nonce: string;
  expiresInMs?: number;
  burnAfterReading?: boolean;
}

export interface MessageNewEvent {
  messageId: string;
  conversationId: string;
  senderId: string;
  encryptedPayload: string;
  iv: string;
  timestamp: string;
  expiresAt?: string;
  burnAfterReading: boolean;
}

export interface TypingIndicatorEvent {
  userId: string;
  conversationId: string;
  isTyping: boolean;
}

export interface UserPresenceEvent {
  userId: string;
  online: boolean;
  lastSeen?: string;
}

export interface MessageStatusEvent {
  messageId: string;
  conversationId: string;
  status: 'delivered' | 'read';
}

export interface KeyReceivedEvent {
  fromUserId: string;
  conversationId: string;
  encryptedKey: string;
}
