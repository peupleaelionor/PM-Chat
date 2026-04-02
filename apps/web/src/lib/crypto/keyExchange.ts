/**
 * Derive a shared AES-GCM 256-bit key from our private key and the peer's public key.
 * Both sides will derive the same key from their respective private/public key pairs.
 */
export async function deriveSharedKey(
  ourPrivateKey: CryptoKey,
  theirPublicKey: CryptoKey
): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: theirPublicKey,
    },
    ourPrivateKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false, // non-extractable for security
    ['encrypt', 'decrypt']
  );
}

/**
 * Derive raw shared bits (32 bytes) from ECDH, useful for custom KDF.
 */
export async function deriveSharedBits(
  ourPrivateKey: CryptoKey,
  theirPublicKey: CryptoKey
): Promise<ArrayBuffer> {
  return crypto.subtle.deriveBits(
    { name: 'ECDH', public: theirPublicKey },
    ourPrivateKey,
    256
  );
}
