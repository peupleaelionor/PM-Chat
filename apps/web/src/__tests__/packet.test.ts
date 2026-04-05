/**
 * @jest-environment node
 *
 * Tests for message envelope packaging, packet validation, and base64 encoding.
 */

import { packEnvelope, generateNonce, toBase64, fromBase64, MessageEnvelope } from '../lib/crypto/messagePackaging';

// ─── Nonce generation ─────────────────────────────────────────────────────────

describe('Nonce generation', () => {
  it('generates a non-empty base64 string', () => {
    const nonce = generateNonce();
    expect(typeof nonce).toBe('string');
    expect(nonce.length).toBeGreaterThan(0);
  });

  it('generates unique nonces across 100 calls', () => {
    const nonces = new Set<string>();
    for (let i = 0; i < 100; i++) {
      nonces.add(generateNonce());
    }
    expect(nonces.size).toBe(100);
  });

  it('generates nonces of consistent length (16 bytes = ~24 base64 chars)', () => {
    const nonce = generateNonce();
    // 16 bytes → ceil(16/3)*4 = 24 base64 characters
    expect(nonce.length).toBe(24);
  });

  it('generates valid base64 strings', () => {
    const nonce = generateNonce();
    expect(() => atob(nonce)).not.toThrow();
  });
});

// ─── Envelope packing ─────────────────────────────────────────────────────────

describe('Envelope packing', () => {
  it('packs an envelope with version 1', () => {
    const envelope = packEnvelope('testIV', 'testCiphertext', 'user-123');
    expect(envelope.version).toBe(1);
  });

  it('preserves iv and ciphertext values', () => {
    const envelope = packEnvelope('myIV123', 'myCiphertext456', 'user-abc');
    expect(envelope.iv).toBe('myIV123');
    expect(envelope.ciphertext).toBe('myCiphertext456');
  });

  it('preserves senderId', () => {
    const envelope = packEnvelope('iv', 'ct', 'sender-xyz');
    expect(envelope.senderId).toBe('sender-xyz');
  });

  it('includes a timestamp close to now', () => {
    const before = Date.now();
    const envelope = packEnvelope('iv', 'ct', 'user-1');
    const after = Date.now();
    expect(envelope.timestamp).toBeGreaterThanOrEqual(before);
    expect(envelope.timestamp).toBeLessThanOrEqual(after);
  });

  it('includes a unique nonce in each envelope', () => {
    const env1 = packEnvelope('iv', 'ct', 'user-1');
    const env2 = packEnvelope('iv', 'ct', 'user-1');
    expect(env1.nonce).not.toBe(env2.nonce);
  });

  it('returns an object with all required fields', () => {
    const envelope = packEnvelope('iv', 'ct', 'user-1');
    const keys = Object.keys(envelope).sort();
    expect(keys).toEqual(['ciphertext', 'iv', 'nonce', 'senderId', 'timestamp', 'version'].sort());
  });
});

// ─── Base64 encoding/decoding ─────────────────────────────────────────────────

describe('Base64 encoding/decoding', () => {
  it('round-trips arbitrary bytes', () => {
    const original = new Uint8Array([0, 1, 127, 128, 255]);
    const encoded = toBase64(original);
    const decoded = fromBase64(encoded);
    expect(decoded).toEqual(original);
  });

  it('round-trips empty array', () => {
    const original = new Uint8Array([]);
    const encoded = toBase64(original);
    const decoded = fromBase64(encoded);
    expect(decoded).toEqual(original);
  });

  it('round-trips single byte', () => {
    for (let i = 0; i < 256; i++) {
      const original = new Uint8Array([i]);
      const encoded = toBase64(original);
      const decoded = fromBase64(encoded);
      expect(decoded).toEqual(original);
    }
  });

  it('encodes known ASCII text correctly', () => {
    const hello = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    expect(toBase64(hello)).toBe('SGVsbG8=');
  });

  it('decodes known base64 correctly', () => {
    const decoded = fromBase64('SGVsbG8=');
    expect(new TextDecoder().decode(decoded)).toBe('Hello');
  });

  it('round-trips large arrays (1024 bytes)', () => {
    const original = crypto.getRandomValues(new Uint8Array(1024));
    const encoded = toBase64(original);
    const decoded = fromBase64(encoded);
    expect(decoded).toEqual(original);
  });

  it('produces valid base64 strings (no illegal characters)', () => {
    const bytes = crypto.getRandomValues(new Uint8Array(100));
    const encoded = toBase64(bytes);
    expect(encoded).toMatch(/^[A-Za-z0-9+/=]+$/);
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe('Packet edge cases', () => {
  it('handles empty string iv and ciphertext in packEnvelope', () => {
    const envelope = packEnvelope('', '', 'user-1');
    expect(envelope.iv).toBe('');
    expect(envelope.ciphertext).toBe('');
  });

  it('handles very long senderId', () => {
    const longId = 'x'.repeat(10000);
    const envelope = packEnvelope('iv', 'ct', longId);
    expect(envelope.senderId).toBe(longId);
  });

  it('handles special characters in senderId', () => {
    const specialId = '<script>alert("xss")</script>';
    const envelope = packEnvelope('iv', 'ct', specialId);
    expect(envelope.senderId).toBe(specialId);
  });

  it('handles unicode in senderId', () => {
    const unicodeId = '用户-🔒-αβγ';
    const envelope = packEnvelope('iv', 'ct', unicodeId);
    expect(envelope.senderId).toBe(unicodeId);
  });
});
