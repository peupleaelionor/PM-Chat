export interface MessageEnvelope {
  version: number; // 1
  id: string;
  conversationId: string;
  senderId: string;
  encryptedPayload: string; // base64 AES-GCM ciphertext
  iv: string; // base64 IV
  nonce: string; // random unique ID for replay protection
  timestamp: string; // ISO 8601
  expiresAt?: string; // ISO 8601, optional
  burnAfterReading?: boolean;
  deliveredAt?: string;
  readAt?: string;
  attachmentId?: string;
}

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
