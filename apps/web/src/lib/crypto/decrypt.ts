import { fromBase64 } from './messagePackaging';

/**
 * Decrypt an AES-GCM 256 encrypted message.
 */
export async function decryptMessage(
  sharedKey: CryptoKey,
  iv: string,
  ciphertext: string
): Promise<string> {
  const ivBytes = fromBase64(iv).buffer as ArrayBuffer;
  const ciphertextBytes = fromBase64(ciphertext).buffer as ArrayBuffer;

  const plaintextBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    sharedKey,
    ciphertextBytes
  );

  return new TextDecoder().decode(plaintextBuffer);
}
