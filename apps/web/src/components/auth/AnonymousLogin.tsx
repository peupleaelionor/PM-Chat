'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, loadPersistedAuth } from '@/lib/store/authStore';
import { useCryptoStore } from '@/lib/store/cryptoStore';
import {
  generateKeyPair,
  exportPublicKey,
  storePrivateKey,
  loadPrivateKey,
} from '@/lib/crypto';
import { register, refreshTokens, setAccessToken } from '@/lib/api';

function generateFingerprint(): string {
  const nav = navigator;
  const raw = [
    nav.userAgent,
    nav.language,
    screen.colorDepth,
    screen.width,
    screen.height,
    new Date().getTimezoneOffset(),
  ].join('|');
  // Simple hash
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export function AnonymousLogin({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const { setAuth, isAuthenticated, accessToken } = useAuthStore();
  const { setKeyPair } = useCryptoStore();
  const router = useRouter();

  useEffect(() => {
    async function init() {
      try {
        // Check for existing session
        const { userId, refreshToken: storedRefreshToken } = loadPersistedAuth();

        if (userId && storedRefreshToken) {
          // Try to refresh tokens
          try {
            const { accessToken: newAccess, refreshToken: newRefresh } =
              await refreshTokens(storedRefreshToken);
            setAccessToken(newAccess);

            // Restore nickname from localStorage
            const nickname = localStorage.getItem('pm_chat_nickname') ?? 'Anonymous';
            setAuth({
              userId,
              nickname,
              accessToken: newAccess,
              refreshToken: newRefresh,
            });

            // Restore private key from session storage
            const privateKey = await loadPrivateKey();
            if (privateKey) {
              // Reconstruct the key pair (we can't reconstruct the public key from just the private key
              // in Web Crypto, so we generate fresh but keep the old public key registered on server)
              // For a real app, we'd also store/cache the public key. Here we generate a new pair.
              const kp = await generateKeyPair();
              setKeyPair(kp);
              await storePrivateKey(kp.privateKey);
            } else {
              // Generate new key pair (public key already on server from registration)
              const kp = await generateKeyPair();
              setKeyPair(kp);
              await storePrivateKey(kp.privateKey);
            }

            setStatus('ready');
            return;
          } catch {
            // Refresh failed – fall through to register as new anonymous user
          }
        }

        // New anonymous registration
        const kp = await generateKeyPair();
        const publicKeyJwk = await exportPublicKey(kp.publicKey);
        const fingerprint = generateFingerprint();

        const result = await register({
          publicKey: publicKeyJwk,
          deviceFingerprint: fingerprint,
        });

        setAccessToken(result.accessToken);
        setAuth({
          userId: result.userId,
          nickname: result.nickname,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        });

        setKeyPair(kp);
        await storePrivateKey(kp.privateKey);

        setStatus('ready');
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Initialization failed');
        setStatus('error');
      }
    }

    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent-primary border-t-transparent" />
          <p className="text-text-secondary text-sm">Initializing secure session…</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <div className="text-4xl">⚠️</div>
          <p className="text-text-primary font-semibold">Connection Error</p>
          <p className="text-text-secondary text-sm">{errorMsg}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 rounded-lg bg-accent-primary px-4 py-2 text-sm text-white hover:bg-purple-500"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
