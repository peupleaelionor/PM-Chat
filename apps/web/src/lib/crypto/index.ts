/**
 * PM-Chat Crypto Module
 *
 * This module is the E2EE (End-to-End Encryption) layer of PM-Chat.
 * It is deliberately isolated from all UI and network code.
 *
 * Algorithms:
 *   Key Exchange:  ECDH P-256
 *   Encryption:    AES-GCM 256-bit
 *   IV:            12 bytes, random per message
 *   Nonce:         16 bytes, random per message (replay protection)
 *
 * Security invariants:
 *   - Private keys NEVER leave the device
 *   - Derived shared keys are non-extractable
 *   - Each message has a unique random IV (no IV reuse)
 *   - Each message has a unique nonce for replay protection
 *   - The server only ever sees opaque base64 ciphertext
 */

// Key generation and management
export { generateKeyPair, exportPublicKey, importPublicKey, exportPrivateKey, importPrivateKey } from './keyGeneration';

// ECDH key exchange
export { deriveSharedKey, deriveSharedBits } from './keyExchange';

// AES-GCM encryption/decryption
export { encryptMessage } from './encrypt';
export type { EncryptResult } from './encrypt';
export { decryptMessage } from './decrypt';

// Session key storage (sessionStorage-based, never persistent)
export { storePrivateKey, loadPrivateKey, clearPrivateKey } from './keyStorage';

// Wire format envelope and encoding
export { packEnvelope, generateNonce, toBase64, fromBase64 } from './messagePackaging';
export type { MessageEnvelope } from './messagePackaging';
