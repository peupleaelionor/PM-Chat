import { exportPrivateKey, importPrivateKey } from './keyGeneration';

const PRIVATE_KEY_SESSION_KEY = 'pm_chat_pk';

/**
 * Store the private key JWK in sessionStorage (survives page refresh, not new tabs).
 * The key is never sent to the server.
 */
export async function storePrivateKey(privateKey: CryptoKey): Promise<void> {
  const jwkString = await exportPrivateKey(privateKey);
  try {
    sessionStorage.setItem(PRIVATE_KEY_SESSION_KEY, jwkString);
  } catch {
    // sessionStorage unavailable (e.g., private browsing restrictions) – key stays in memory only
  }
}

/**
 * Load the private key from sessionStorage, if available.
 */
export async function loadPrivateKey(): Promise<CryptoKey | null> {
  try {
    const jwkString = sessionStorage.getItem(PRIVATE_KEY_SESSION_KEY);
    if (!jwkString) return null;
    return await importPrivateKey(jwkString);
  } catch {
    return null;
  }
}

/**
 * Clear the private key from sessionStorage (on logout).
 */
export function clearPrivateKey(): void {
  try {
    sessionStorage.removeItem(PRIVATE_KEY_SESSION_KEY);
  } catch {
    // ignore
  }
}
