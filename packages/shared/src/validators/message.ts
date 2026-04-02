import { z } from 'zod';

export const MessageEnvelopeSchema = z.object({
  version: z.number().int().positive(),
  id: z.string().uuid(),
  conversationId: z.string().min(1),
  senderId: z.string().min(1),
  encryptedPayload: z.string().min(1),
  iv: z.string().min(1),
  nonce: z.string().min(1),
  timestamp: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  burnAfterReading: z.boolean().optional(),
  deliveredAt: z.string().datetime().optional(),
  readAt: z.string().datetime().optional(),
  attachmentId: z.string().optional(),
});

export type MessageEnvelopeInput = z.infer<typeof MessageEnvelopeSchema>;

export const MessageStatusSchema = z.enum(['sending', 'sent', 'delivered', 'read', 'failed']);
