/**
 * @jest-environment node
 *
 * Node 18+ exposes the Web Crypto API as globalThis.crypto, so we can test
 * the browser-targeted crypto helpers without a DOM environment.
 */

import { generateKeyPair, exportPublicKey, importPublicKey } from '../lib/crypto/keyGeneration';
import { deriveSharedKey } from '../lib/crypto/keyExchange';
import { encryptMessage } from '../lib/crypto/encrypt';
import { decryptMessage } from '../lib/crypto/decrypt';
import { packEnvelope, generateNonce, toBase64, fromBase64 } from '../lib/crypto/messagePackaging';

// ─── Key pair generation ─────────────────────────────────────────────────────

describe('Key pair generation', () => {
  it('generates an ECDH P-256 key pair', async () => {
    const keyPair = await generateKeyPair();
    expect(keyPair.publicKey).toBeDefined();
    expect(keyPair.privateKey).toBeDefined();
    expect(keyPair.publicKey.type).toBe('public');
    expect(keyPair.privateKey.type).toBe('private');
  });

  it('exports the public key as a JWK string', async () => {
    const keyPair = await generateKeyPair();
    const jwkString = await exportPublicKey(keyPair.publicKey);
    const jwk = JSON.parse(jwkString) as JsonWebKey;
    expect(jwk.kty).toBe('EC');
    expect(jwk.crv).toBe('P-256');
    expect(jwk.d).toBeUndefined(); // no private key material in public export
  });

  it('imports a previously exported public key', async () => {
    const keyPair = await generateKeyPair();
    const jwkString = await exportPublicKey(keyPair.publicKey);
    const imported = await importPublicKey(jwkString);
    expect(imported.type).toBe('public');
    expect(imported.algorithm).toMatchObject({ name: 'ECDH' });
  });

  it('generates unique key pairs each time', async () => {
    const kp1 = await generateKeyPair();
    const kp2 = await generateKeyPair();
    const pub1 = await exportPublicKey(kp1.publicKey);
    const pub2 = await exportPublicKey(kp2.publicKey);
    expect(pub1).not.toBe(pub2);
  });
});

// ─── Key exchange ─────────────────────────────────────────────────────────────

describe('Key exchange (deriveSharedKey)', () => {
  it('derives a symmetric AES-GCM key from ECDH', async () => {
    const alice = await generateKeyPair();
    const bob = await generateKeyPair();
    const sharedKey = await deriveSharedKey(alice.privateKey, bob.publicKey);
    expect(sharedKey.type).toBe('secret');
    expect(sharedKey.algorithm).toMatchObject({ name: 'AES-GCM' });
  });

  it('both parties derive the same shared secret', async () => {
    const alice = await generateKeyPair();
    const bob = await generateKeyPair();

    // Alice uses her private key + Bob's public key
    const aliceShared = await deriveSharedKey(alice.privateKey, bob.publicKey);
    // Bob uses his private key + Alice's public key
    const bobShared = await deriveSharedKey(bob.privateKey, alice.publicKey);

    // Encrypt a test message with Alice's derived key, decrypt with Bob's
    const plaintext = 'shared secret test';
    const { iv, ciphertext } = await encryptMessage(aliceShared, plaintext);
    const decrypted = await decryptMessage(bobShared, iv, ciphertext);
    expect(decrypted).toBe(plaintext);
  });
});

// ─── Encrypt + Decrypt ────────────────────────────────────────────────────────

describe('Message encryption and decryption', () => {
  let sharedKey: CryptoKey;

  beforeAll(async () => {
    const alice = await generateKeyPair();
    const bob = await generateKeyPair();
    sharedKey = await deriveSharedKey(alice.privateKey, bob.publicKey);
  });

  it('encrypts a message and returns iv + ciphertext', async () => {
    const { iv, ciphertext } = await encryptMessage(sharedKey, 'hello');
    expect(typeof iv).toBe('string');
    expect(typeof ciphertext).toBe('string');
    expect(iv.length).toBeGreaterThan(0);
    expect(ciphertext.length).toBeGreaterThan(0);
  });

  it('decrypts an encrypted message to the original plaintext', async () => {
    const plaintext = 'end-to-end encrypted message';
    const { iv, ciphertext } = await encryptMessage(sharedKey, plaintext);
    const result = await decryptMessage(sharedKey, iv, ciphertext);
    expect(result).toBe(plaintext);
  });

  it('produces different ciphertext for the same plaintext each time (random IV)', async () => {
    const plaintext = 'same message';
    const result1 = await encryptMessage(sharedKey, plaintext);
    const result2 = await encryptMessage(sharedKey, plaintext);
    // IVs should differ
    expect(result1.iv).not.toBe(result2.iv);
  });

  it('throws when decrypting with the wrong key', async () => {
    const wrongAlice = await generateKeyPair();
    const wrongBob = await generateKeyPair();
    const wrongKey = await deriveSharedKey(wrongAlice.privateKey, wrongBob.publicKey);

    const { iv, ciphertext } = await encryptMessage(sharedKey, 'secret');
    await expect(decryptMessage(wrongKey, iv, ciphertext)).rejects.toThrow();
  });
});

// ─── Message envelope packaging ───────────────────────────────────────────────

describe('Message envelope packaging', () => {
  it('generates a unique nonce string', () => {
    const n1 = generateNonce();
    const n2 = generateNonce();
    expect(typeof n1).toBe('string');
    expect(n1.length).toBeGreaterThan(0);
    expect(n1).not.toBe(n2);
  });

  it('packs an envelope with all required fields', () => {
    const envelope = packEnvelope('testIV', 'testCiphertext', 'user-123');
    expect(envelope.version).toBe(1);
    expect(envelope.iv).toBe('testIV');
    expect(envelope.ciphertext).toBe('testCiphertext');
    expect(envelope.senderId).toBe('user-123');
    expect(typeof envelope.timestamp).toBe('number');
    expect(typeof envelope.nonce).toBe('string');
    expect(envelope.nonce.length).toBeGreaterThan(0);
  });

  it('unpacks an envelope back to the original data via base64 round-trip', () => {
    const original = new Uint8Array([1, 2, 3, 4, 255, 128, 0]);
    const encoded = toBase64(original);
    const decoded = fromBase64(encoded);
    expect(decoded).toEqual(original);
  });

  it('toBase64 produces a valid base64 string', () => {
    const bytes = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    const b64 = toBase64(bytes);
    expect(b64).toBe('SGVsbG8=');
  });

  it('full round-trip: encrypt → pack → unpack → decrypt', async () => {
    const alice = await generateKeyPair();
    const bob = await generateKeyPair();
    const aliceKey = await deriveSharedKey(alice.privateKey, bob.publicKey);
    const bobKey = await deriveSharedKey(bob.privateKey, alice.publicKey);

    const plaintext = 'full round-trip test message';
    const { iv, ciphertext } = await encryptMessage(aliceKey, plaintext);
    const envelope = packEnvelope(iv, ciphertext, 'alice-id');

    // Unpack and decrypt on Bob's side
    const decrypted = await decryptMessage(bobKey, envelope.iv, envelope.ciphertext);
    expect(decrypted).toBe(plaintext);
  });
});
