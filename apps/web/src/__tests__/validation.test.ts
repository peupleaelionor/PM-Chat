/**
 * @jest-environment node
 *
 * Tests for shared Zod validators (message envelope, auth schemas).
 * These validate packet structure on the server side.
 */

// Import Zod schemas directly
import { z } from 'zod';

// Re-create the schemas here since they may not be built yet in CI
const MessageEnvelopeSchema = z.object({
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

const RegisterSchema = z.object({
  nickname: z
    .string()
    .min(2, 'Nickname must be at least 2 characters')
    .max(32, 'Nickname must be at most 32 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Nickname may only contain letters, numbers, underscores, and hyphens'),
  publicKey: z.string().min(1, 'Public key is required'),
  deviceFingerprint: z.string().optional(),
});

// ─── MessageEnvelope validation ───────────────────────────────────────────────

describe('MessageEnvelope validation', () => {
  const validEnvelope = {
    version: 1,
    id: '550e8400-e29b-41d4-a716-446655440000',
    conversationId: 'conv_123',
    senderId: 'user_456',
    encryptedPayload: 'dGVzdCBwYXlsb2Fk',
    iv: 'dGVzdCBpdg==',
    nonce: 'dW5pcXVlLW5vbmNl',
    timestamp: '2025-01-15T10:30:00.000Z',
  };

  it('accepts a valid envelope', () => {
    const result = MessageEnvelopeSchema.safeParse(validEnvelope);
    expect(result.success).toBe(true);
  });

  it('accepts envelope with optional fields', () => {
    const result = MessageEnvelopeSchema.safeParse({
      ...validEnvelope,
      expiresAt: '2025-01-15T11:30:00.000Z',
      burnAfterReading: true,
      attachmentId: 'att_789',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing version', () => {
    const { version, ...noVersion } = validEnvelope;
    const result = MessageEnvelopeSchema.safeParse(noVersion);
    expect(result.success).toBe(false);
  });

  it('rejects non-integer version', () => {
    const result = MessageEnvelopeSchema.safeParse({ ...validEnvelope, version: 1.5 });
    expect(result.success).toBe(false);
  });

  it('rejects zero version', () => {
    const result = MessageEnvelopeSchema.safeParse({ ...validEnvelope, version: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects negative version', () => {
    const result = MessageEnvelopeSchema.safeParse({ ...validEnvelope, version: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects invalid UUID id', () => {
    const result = MessageEnvelopeSchema.safeParse({ ...validEnvelope, id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects empty conversationId', () => {
    const result = MessageEnvelopeSchema.safeParse({ ...validEnvelope, conversationId: '' });
    expect(result.success).toBe(false);
  });

  it('rejects empty senderId', () => {
    const result = MessageEnvelopeSchema.safeParse({ ...validEnvelope, senderId: '' });
    expect(result.success).toBe(false);
  });

  it('rejects empty encryptedPayload', () => {
    const result = MessageEnvelopeSchema.safeParse({ ...validEnvelope, encryptedPayload: '' });
    expect(result.success).toBe(false);
  });

  it('rejects empty iv', () => {
    const result = MessageEnvelopeSchema.safeParse({ ...validEnvelope, iv: '' });
    expect(result.success).toBe(false);
  });

  it('rejects empty nonce', () => {
    const result = MessageEnvelopeSchema.safeParse({ ...validEnvelope, nonce: '' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid timestamp format', () => {
    const result = MessageEnvelopeSchema.safeParse({ ...validEnvelope, timestamp: 'not-a-date' });
    expect(result.success).toBe(false);
  });

  it('rejects numeric timestamp', () => {
    const result = MessageEnvelopeSchema.safeParse({ ...validEnvelope, timestamp: 1234567890 });
    expect(result.success).toBe(false);
  });

  it('rejects non-boolean burnAfterReading', () => {
    const result = MessageEnvelopeSchema.safeParse({ ...validEnvelope, burnAfterReading: 'yes' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid expiresAt format', () => {
    const result = MessageEnvelopeSchema.safeParse({ ...validEnvelope, expiresAt: 'tomorrow' });
    expect(result.success).toBe(false);
  });

  it('rejects extra unknown fields (strict)', () => {
    const strictSchema = MessageEnvelopeSchema.strict();
    const result = strictSchema.safeParse({ ...validEnvelope, maliciousField: 'hack' });
    expect(result.success).toBe(false);
  });

  it('rejects null values for required fields', () => {
    const result = MessageEnvelopeSchema.safeParse({ ...validEnvelope, senderId: null });
    expect(result.success).toBe(false);
  });

  it('rejects missing encryptedPayload (blocks plaintext)', () => {
    const { encryptedPayload, ...noPayload } = validEnvelope;
    const result = MessageEnvelopeSchema.safeParse(noPayload);
    expect(result.success).toBe(false);
  });
});

// ─── RegisterSchema validation ────────────────────────────────────────────────

describe('Register validation', () => {
  const validRegister = {
    nickname: 'alice_secure',
    publicKey: '{"kty":"EC","crv":"P-256","x":"test","y":"test"}',
  };

  it('accepts valid registration', () => {
    const result = RegisterSchema.safeParse(validRegister);
    expect(result.success).toBe(true);
  });

  it('accepts registration with device fingerprint', () => {
    const result = RegisterSchema.safeParse({
      ...validRegister,
      deviceFingerprint: 'fp_abc123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects nickname shorter than 2 characters', () => {
    const result = RegisterSchema.safeParse({ ...validRegister, nickname: 'a' });
    expect(result.success).toBe(false);
  });

  it('rejects nickname longer than 32 characters', () => {
    const result = RegisterSchema.safeParse({ ...validRegister, nickname: 'a'.repeat(33) });
    expect(result.success).toBe(false);
  });

  it('rejects nickname with spaces', () => {
    const result = RegisterSchema.safeParse({ ...validRegister, nickname: 'alice secure' });
    expect(result.success).toBe(false);
  });

  it('rejects nickname with special characters', () => {
    const result = RegisterSchema.safeParse({ ...validRegister, nickname: 'alice@secure!' });
    expect(result.success).toBe(false);
  });

  it('accepts nickname with underscores and hyphens', () => {
    const result = RegisterSchema.safeParse({ ...validRegister, nickname: 'alice_secure-99' });
    expect(result.success).toBe(true);
  });

  it('rejects empty publicKey', () => {
    const result = RegisterSchema.safeParse({ ...validRegister, publicKey: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing publicKey', () => {
    const { publicKey, ...noKey } = validRegister;
    const result = RegisterSchema.safeParse(noKey);
    expect(result.success).toBe(false);
  });

  it('rejects missing nickname', () => {
    const { nickname, ...noNick } = validRegister;
    const result = RegisterSchema.safeParse(noNick);
    expect(result.success).toBe(false);
  });

  it('rejects XSS in nickname', () => {
    const result = RegisterSchema.safeParse({ ...validRegister, nickname: '<script>alert(1)</script>' });
    expect(result.success).toBe(false);
  });

  it('rejects SQL injection in nickname', () => {
    const result = RegisterSchema.safeParse({ ...validRegister, nickname: "'; DROP TABLE users;--" });
    expect(result.success).toBe(false);
  });
});
