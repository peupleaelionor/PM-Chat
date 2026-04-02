export interface MessageEnvelope {
  version: 1;
  iv: string;
  ciphertext: string;
  senderId: string;
  timestamp: number;
  nonce: string;
}

/**
 * Generate a cryptographically random nonce string for replay-attack prevention.
 */
export function generateNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return toBase64(bytes);
}

/**
 * Pack encrypted message data into the wire envelope format.
 */
export function packEnvelope(
  iv: string,
  ciphertext: string,
  senderId: string
): MessageEnvelope {
  return {
    version: 1,
    iv,
    ciphertext,
    senderId,
    timestamp: Date.now(),
    nonce: generateNonce(),
  };
}

/**
 * Convert Uint8Array to base64 string.
 */
export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to Uint8Array.
 */
export function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
