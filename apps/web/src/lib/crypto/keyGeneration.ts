/**
 * Generate an ECDH P-256 key pair for the current user.
 * The private key is extractable only for in-memory use.
 */
export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );
}

/**
 * Export a public key to JWK format (safe to send to server).
 */
export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  const jwk = await crypto.subtle.exportKey('jwk', publicKey);
  return JSON.stringify(jwk);
}

/**
 * Export a private key to JWK format (kept only in memory, never sent to server).
 */
export async function exportPrivateKey(privateKey: CryptoKey): Promise<string> {
  const jwk = await crypto.subtle.exportKey('jwk', privateKey);
  return JSON.stringify(jwk);
}

/**
 * Import a public key from JWK string (received from server for a contact).
 */
export async function importPublicKey(jwkString: string): Promise<CryptoKey> {
  const jwk = JSON.parse(jwkString) as JsonWebKey;
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  );
}

/**
 * Import a private key from JWK string (restoring from in-memory session storage).
 */
export async function importPrivateKey(jwkString: string): Promise<CryptoKey> {
  const jwk = JSON.parse(jwkString) as JsonWebKey;
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );
}
