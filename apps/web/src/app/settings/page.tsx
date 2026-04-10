'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { useCryptoStore } from '@/lib/store/cryptoStore';
import { clearPrivateKey } from '@/lib/crypto';
import { logout, setAccessToken } from '@/lib/api';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { disconnectSocket } from '@/lib/socket';

export default function SettingsPage() {
  const { userId, nickname, accessToken, refreshToken, clearAuth } = useAuthStore();
  const { clearKeys } = useCryptoStore();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const copyId = async () => {
    if (!userId) return;
    await navigator.clipboard.writeText(userId).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      if (refreshToken) {
        await logout(refreshToken).catch(() => {});
      }
    } finally {
      clearPrivateKey();
      clearKeys();
      clearAuth();
      setAccessToken(null);
      disconnectSocket();
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary px-4 py-8">
      <div className="mx-auto max-w-lg">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
          </svg>
          Retour
        </button>

        <h1 className="mb-6 text-2xl font-bold text-text-primary">Paramètres</h1>

        {/* Profile card */}
        <div className="mb-4 rounded-2xl bg-bg-secondary p-6 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted">Profil</h2>

          <div className="flex items-center gap-4">
            {nickname && <Avatar nickname={nickname} size="lg" />}
            <div>
              <p className="font-semibold text-text-primary">{nickname ?? 'Anonyme'}</p>
              <p className="text-xs text-text-muted">Compte anonyme</p>
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs text-text-muted">Votre ID d&apos;invitation</p>
            <div className="rounded-lg bg-bg-tertiary p-3 font-mono text-xs text-text-secondary break-all">
              {userId}
            </div>
            <p className="mt-1 text-xs text-text-muted">
              Partagez cet ID avec d&apos;autres pour qu&apos;ils puissent démarrer une conversation avec vous.
            </p>
          </div>

          <Button variant="ghost" size="sm" onClick={copyId} className="w-full">
            {copied ? '✓ Copié !' : '📋 Copier l\'ID d\'invitation'}
          </Button>
        </div>

        {/* Security info */}
        <div className="mb-4 rounded-2xl bg-bg-secondary p-6 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted">Sécurité</h2>
          <div className="space-y-2 text-sm text-text-secondary">
            <div className="flex items-center gap-2">
              <span className="text-accent-secondary">✓</span>
              <span>Chiffré de bout en bout (ECDH P-256 + AES-GCM 256)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-accent-secondary">✓</span>
              <span>La clé privée ne quitte jamais votre appareil</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-accent-secondary">✓</span>
              <span>Anonyme – aucun e-mail ou téléphone requis</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-accent-secondary">✓</span>
              <span>Autodestruction après lecture</span>
            </div>
          </div>
        </div>

        {/* Danger zone */}
        <div className="rounded-2xl bg-bg-secondary p-6 space-y-3 border border-accent-danger/20">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-accent-danger">Zone de danger</h2>
          <p className="text-sm text-text-secondary">
            La déconnexion supprimera vos clés de session. Vous obtiendrez une nouvelle identité anonyme lors de votre prochaine visite.
          </p>
          <Button
            variant="danger"
            size="sm"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full"
          >
            {isLoggingOut ? 'Déconnexion…' : 'Déconnexion et suppression de session'}
          </Button>
        </div>
      </div>
    </div>
  );
}
