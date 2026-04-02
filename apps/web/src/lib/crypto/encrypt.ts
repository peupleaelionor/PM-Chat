import { toBase64 } from './messagePackaging';

export interface EncryptResult {
  iv: string;       // base64
  ciphertext: string; // base64
}

/**
 * Encrypt a plaintext string with AES-GCM 256.
 * Generates a fresh random IV for each message.
 */
export async function encryptMessage(
  sharedKey: CryptoKey,
  plaintext: string
): Promise<EncryptResult> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    encoded
  );

  return {
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertextBuffer)),
  };
}
