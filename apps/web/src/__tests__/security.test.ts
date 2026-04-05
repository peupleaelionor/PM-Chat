/**
 * @jest-environment node
 *
 * Tests for encryption edge cases, failure modes, and security properties.
 */

import { generateKeyPair, exportPublicKey, importPublicKey, exportPrivateKey, importPrivateKey } from '../lib/crypto/keyGeneration';
import { deriveSharedKey, deriveSharedBits } from '../lib/crypto/keyExchange';
import { encryptMessage } from '../lib/crypto/encrypt';
import { decryptMessage } from '../lib/crypto/decrypt';
import { toBase64, fromBase64 } from '../lib/crypto/messagePackaging';

// ─── Encryption security properties ──────────────────────────────────────────

describe('Encryption security properties', () => {
  let aliceKeyPair: CryptoKeyPair;
  let bobKeyPair: CryptoKeyPair;
  let sharedKey: CryptoKey;

  beforeAll(async () => {
    aliceKeyPair = await generateKeyPair();
    bobKeyPair = await generateKeyPair();
    sharedKey = await deriveSharedKey(aliceKeyPair.privateKey, bobKeyPair.publicKey);
  });

  it('different IVs for same plaintext produce different ciphertext', async () => {
    const plaintext = 'test message';
    const result1 = await encryptMessage(sharedKey, plaintext);
    const result2 = await encryptMessage(sharedKey, plaintext);

    expect(result1.iv).not.toBe(result2.iv);
    expect(result1.ciphertext).not.toBe(result2.ciphertext);
  });

  it('ciphertext is longer than plaintext (includes auth tag)', async () => {
    const plaintext = 'short';
    const { ciphertext } = await encryptMessage(sharedKey, plaintext);
    const ciphertextBytes = fromBase64(ciphertext);
    const plaintextBytes = new TextEncoder().encode(plaintext);

    // AES-GCM adds a 16-byte authentication tag
    expect(ciphertextBytes.length).toBe(plaintextBytes.length + 16);
  });

  it('handles empty string encryption', async () => {
    const { iv, ciphertext } = await encryptMessage(sharedKey, '');
    const decrypted = await decryptMessage(sharedKey, iv, ciphertext);
    expect(decrypted).toBe('');
  });

  it('handles very long messages', async () => {
    const longMessage = 'A'.repeat(100000);
    const { iv, ciphertext } = await encryptMessage(sharedKey, longMessage);
    const decrypted = await decryptMessage(sharedKey, iv, ciphertext);
    expect(decrypted).toBe(longMessage);
  });

  it('handles unicode messages', async () => {
    const unicodeMessage = '🔒 Sécurité 中文 العربية 日本語 한국어';
    const { iv, ciphertext } = await encryptMessage(sharedKey, unicodeMessage);
    const decrypted = await decryptMessage(sharedKey, iv, ciphertext);
    expect(decrypted).toBe(unicodeMessage);
  });

  it('handles messages with NUL bytes', async () => {
    const messageWithNul = 'hello\0world\0test';
    const { iv, ciphertext } = await encryptMessage(sharedKey, messageWithNul);
    const decrypted = await decryptMessage(sharedKey, iv, ciphertext);
    expect(decrypted).toBe(messageWithNul);
  });

  it('handles messages with newlines and whitespace', async () => {
    const message = '  line 1\n  line 2\r\n  line 3\t';
    const { iv, ciphertext } = await encryptMessage(sharedKey, message);
    const decrypted = await decryptMessage(sharedKey, iv, message.length > 0 ? ciphertext : ciphertext);
    expect(decrypted).toBe(message);
  });
});

// ─── Decryption failure cases ─────────────────────────────────────────────────

describe('Decryption failure cases', () => {
  let sharedKey: CryptoKey;

  beforeAll(async () => {
    const alice = await generateKeyPair();
    const bob = await generateKeyPair();
    sharedKey = await deriveSharedKey(alice.privateKey, bob.publicKey);
  });

  it('fails with wrong key', async () => {
    const wrongAlice = await generateKeyPair();
    const wrongBob = await generateKeyPair();
    const wrongKey = await deriveSharedKey(wrongAlice.privateKey, wrongBob.publicKey);

    const { iv, ciphertext } = await encryptMessage(sharedKey, 'secret');
    await expect(decryptMessage(wrongKey, iv, ciphertext)).rejects.toThrow();
  });

  it('fails with tampered ciphertext', async () => {
    const { iv, ciphertext } = await encryptMessage(sharedKey, 'secret');
    const bytes = fromBase64(ciphertext);
    bytes[0] ^= 0xFF; // flip bits
    const tampered = toBase64(bytes);
    await expect(decryptMessage(sharedKey, iv, tampered)).rejects.toThrow();
  });

  it('fails with tampered IV', async () => {
    const { iv, ciphertext } = await encryptMessage(sharedKey, 'secret');
    const ivBytes = fromBase64(iv);
    ivBytes[0] ^= 0xFF; // flip bits
    const tamperedIv = toBase64(ivBytes);
    await expect(decryptMessage(sharedKey, tamperedIv, ciphertext)).rejects.toThrow();
  });

  it('fails with truncated ciphertext', async () => {
    const { iv, ciphertext } = await encryptMessage(sharedKey, 'secret message');
    const bytes = fromBase64(ciphertext);
    const truncated = toBase64(bytes.slice(0, bytes.length - 8));
    await expect(decryptMessage(sharedKey, iv, truncated)).rejects.toThrow();
  });

  it('fails with empty ciphertext', async () => {
    const { iv } = await encryptMessage(sharedKey, 'secret');
    const emptyBase64 = toBase64(new Uint8Array(0));
    await expect(decryptMessage(sharedKey, iv, emptyBase64)).rejects.toThrow();
  });

  it('fails with swapped iv and ciphertext', async () => {
    const { iv, ciphertext } = await encryptMessage(sharedKey, 'secret');
    await expect(decryptMessage(sharedKey, ciphertext, iv)).rejects.toThrow();
  });
});

// ─── Key import/export round trips ────────────────────────────────────────────

describe('Key import/export', () => {
  it('round-trips public key through JWK export/import', async () => {
    const keyPair = await generateKeyPair();
    const exported = await exportPublicKey(keyPair.publicKey);
    const imported = await importPublicKey(exported);

    // Verify by using in a key exchange
    const otherPair = await generateKeyPair();
    const key1 = await deriveSharedKey(otherPair.privateKey, keyPair.publicKey);
    const key2 = await deriveSharedKey(otherPair.privateKey, imported);

    const plaintext = 'key round-trip test';
    const encrypted = await encryptMessage(key1, plaintext);
    const decrypted = await decryptMessage(key2, encrypted.iv, encrypted.ciphertext);
    expect(decrypted).toBe(plaintext);
  });

  it('round-trips private key through JWK export/import', async () => {
    const keyPair = await generateKeyPair();
    const exported = await exportPrivateKey(keyPair.privateKey);
    const imported = await importPrivateKey(exported);

    const otherPair = await generateKeyPair();
    const key1 = await deriveSharedKey(keyPair.privateKey, otherPair.publicKey);
    const key2 = await deriveSharedKey(imported, otherPair.publicKey);

    const plaintext = 'private key round-trip test';
    const encrypted = await encryptMessage(key1, plaintext);
    const decrypted = await decryptMessage(key2, encrypted.iv, encrypted.ciphertext);
    expect(decrypted).toBe(plaintext);
  });

  it('public key JWK has no private material', async () => {
    const keyPair = await generateKeyPair();
    const exported = await exportPublicKey(keyPair.publicKey);
    const jwk = JSON.parse(exported);
    expect(jwk.d).toBeUndefined(); // 'd' is the private key component
    expect(jwk.kty).toBe('EC');
    expect(jwk.crv).toBe('P-256');
    expect(jwk.x).toBeDefined();
    expect(jwk.y).toBeDefined();
  });

  it('rejects invalid JWK string for public key import', async () => {
    await expect(importPublicKey('not valid json')).rejects.toThrow();
  });

  it('rejects empty JWK string for public key import', async () => {
    await expect(importPublicKey('')).rejects.toThrow();
  });
});

// ─── ECDH shared key derivation ───────────────────────────────────────────────

describe('ECDH shared key derivation', () => {
  it('derives identical shared keys from both sides', async () => {
    const alice = await generateKeyPair();
    const bob = await generateKeyPair();

    const aliceKey = await deriveSharedKey(alice.privateKey, bob.publicKey);
    const bobKey = await deriveSharedKey(bob.privateKey, alice.publicKey);

    const plaintext = 'bidirectional test';
    const encrypted = await encryptMessage(aliceKey, plaintext);
    const decrypted = await decryptMessage(bobKey, encrypted.iv, encrypted.ciphertext);
    expect(decrypted).toBe(plaintext);
  });

  it('different key pairs derive different shared keys', async () => {
    const alice = await generateKeyPair();
    const bob1 = await generateKeyPair();
    const bob2 = await generateKeyPair();

    const key1 = await deriveSharedKey(alice.privateKey, bob1.publicKey);
    const key2 = await deriveSharedKey(alice.privateKey, bob2.publicKey);

    const plaintext = 'different partners test';
    const encrypted = await encryptMessage(key1, plaintext);
    // Decrypting with key2 should fail
    await expect(decryptMessage(key2, encrypted.iv, encrypted.ciphertext)).rejects.toThrow();
  });

  it('derives shared bits of 256 bits (32 bytes)', async () => {
    const alice = await generateKeyPair();
    const bob = await generateKeyPair();

    const bits = await deriveSharedBits(alice.privateKey, bob.publicKey);
    expect(bits.byteLength).toBe(32);
  });

  it('derives identical shared bits from both sides', async () => {
    const alice = await generateKeyPair();
    const bob = await generateKeyPair();

    const aliceBits = await deriveSharedBits(alice.privateKey, bob.publicKey);
    const bobBits = await deriveSharedBits(bob.privateKey, alice.publicKey);

    expect(new Uint8Array(aliceBits)).toEqual(new Uint8Array(bobBits));
  });
});

// ─── Replay protection simulation ────────────────────────────────────────────

describe('Replay protection (nonce uniqueness)', () => {
  it('simulates nonce deduplication with Set', () => {
    const { generateNonce } = require('../lib/crypto/messagePackaging');
    const seen = new Set<string>();

    // Simulate 1000 messages
    for (let i = 0; i < 1000; i++) {
      const nonce = generateNonce();
      expect(seen.has(nonce)).toBe(false); // No replay
      seen.add(nonce);
    }

    expect(seen.size).toBe(1000);
  });

  it('detects a replayed nonce', () => {
    const { generateNonce } = require('../lib/crypto/messagePackaging');
    const seen = new Set<string>();

    const nonce = generateNonce();
    seen.add(nonce);

    // Simulating replay: same nonce again
    expect(seen.has(nonce)).toBe(true); // Replay detected!
  });
});
