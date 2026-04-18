'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuthStore, loadPersistedAuth } from '@/lib/store/authStore';
import { useCryptoStore } from '@/lib/store/cryptoStore';
import {
  generateKeyPair,
  exportPublicKey,
  storePrivateKey,
  loadPrivateKey,
  importPublicKey,
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

/**
 * AnonymousLogin wraps the app tree.
 *
 * It tries to authenticate in the background but **never blocks rendering**.
 * If the backend API is unreachable the user still sees the UI (in a
 * degraded/offline state) instead of an empty white page.
 */
export function AnonymousLogin({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const { setAuth, isAuthenticated } = useAuthStore();
  const { setKeyPair } = useCryptoStore();
  const retryCount = useRef(0);

  const init = async () => {
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

          // Restore private key and public key JWK from session storage
          const privateKey = await loadPrivateKey();
          const publicKeyJwk = sessionStorage.getItem('pm_chat_pub_key');

          if (privateKey && publicKeyJwk) {
            const publicKey = await importPublicKey(publicKeyJwk);
            setKeyPair({ privateKey, publicKey });
          } else {
            const kp = await generateKeyPair();
            const pkJwk = await exportPublicKey(kp.publicKey);
            sessionStorage.setItem('pm_chat_pub_key', pkJwk);
            setKeyPair(kp);
            await storePrivateKey(kp.privateKey);
          }

          setStatus('ready');
          retryCount.current = 0;
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
      try {
        sessionStorage.setItem('pm_chat_pub_key', publicKeyJwk);
      } catch {
        // ignore
      }

      setStatus('ready');
      retryCount.current = 0;
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Échec de l\'initialisation');
      setStatus('error');
    }
  };

  useEffect(() => {
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRetry = () => {
    retryCount.current += 1;
    setStatus('loading');
    setErrorMsg('');
    init();
  };

  // ── Always render children ──────────────────────────────────────────────────
  // Show an inline banner for connection state instead of replacing the whole
  // page so that the UI is never blank on Vercel.

  return (
    <>
      {status === 'loading' && (
        <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-bg-secondary/90 py-2 text-xs text-text-secondary backdrop-blur">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
          Initialisation de la session sécurisée…
        </div>
      )}

      {status === 'error' && (
        <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-3 bg-red-900/90 py-2 text-xs text-red-200 backdrop-blur">
          <span>⚠️ Connexion au serveur impossible{errorMsg ? ` : ${errorMsg}` : ''}</span>
          <button
            onClick={handleRetry}
            className="rounded bg-white/20 px-2 py-0.5 text-white hover:bg-white/30 transition-colors"
          >
            Réessayer
          </button>
        </div>
      )}

      {children}
    </>
  );
}
