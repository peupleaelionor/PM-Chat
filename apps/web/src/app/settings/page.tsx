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
          Back
        </button>

        <h1 className="mb-6 text-2xl font-bold text-text-primary">Settings</h1>

        {/* Profile card */}
        <div className="mb-4 rounded-2xl bg-bg-secondary p-6 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted">Profile</h2>

          <div className="flex items-center gap-4">
            {nickname && <Avatar nickname={nickname} size="lg" />}
            <div>
              <p className="font-semibold text-text-primary">{nickname ?? 'Anonymous'}</p>
              <p className="text-xs text-text-muted">Anonymous account</p>
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs text-text-muted">Your Invite ID</p>
            <div className="rounded-lg bg-bg-tertiary p-3 font-mono text-xs text-text-secondary break-all">
              {userId}
            </div>
            <p className="mt-1 text-xs text-text-muted">
              Share this ID with others so they can start a conversation with you.
            </p>
          </div>

          <Button variant="ghost" size="sm" onClick={copyId} className="w-full">
            {copied ? '✓ Copied!' : '📋 Copy Invite ID'}
          </Button>
        </div>

        {/* Security info */}
        <div className="mb-4 rounded-2xl bg-bg-secondary p-6 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted">Security</h2>
          <div className="space-y-2 text-sm text-text-secondary">
            <div className="flex items-center gap-2">
              <span className="text-accent-secondary">✓</span>
              <span>End-to-end encrypted (ECDH P-256 + AES-GCM 256)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-accent-secondary">✓</span>
              <span>Private key never leaves your device</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-accent-secondary">✓</span>
              <span>Anonymous – no email or phone required</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-accent-secondary">✓</span>
              <span>Burn-after-reading support</span>
            </div>
          </div>
        </div>

        {/* Danger zone */}
        <div className="rounded-2xl bg-bg-secondary p-6 space-y-3 border border-accent-danger/20">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-accent-danger">Danger Zone</h2>
          <p className="text-sm text-text-secondary">
            Logging out will clear your session keys. You will get a new anonymous identity on next visit.
          </p>
          <Button
            variant="danger"
            size="sm"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full"
          >
            {isLoggingOut ? 'Logging out…' : 'Log Out & Clear Session'}
          </Button>
        </div>
      </div>
    </div>
  );
}
