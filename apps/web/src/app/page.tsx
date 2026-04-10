'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';

export default function HomePage() {
  const { isAuthenticated, nickname, userId } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/chat');
    }
  }, [isAuthenticated, router]);

  const copyId = () => {
    if (userId) navigator.clipboard.writeText(userId).catch(() => {});
  };

  return (
    <main className="flex h-screen flex-col items-center justify-center bg-bg-primary px-6 text-center">
      <div className="mb-8 flex flex-col items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-accent-primary shadow-2xl">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="h-10 w-10">
            <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-text-primary">PM-Chat</h1>
        <p className="text-text-secondary">Messagerie privée chiffrée de bout en bout</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <div className="rounded-2xl bg-bg-secondary p-6 space-y-4">
          <p className="text-xs text-text-muted uppercase tracking-widest">Votre compte anonyme</p>

          {nickname && (
            <div className="flex flex-col items-center gap-2">
              <Avatar nickname={nickname} size="lg" />
              <p className="font-semibold text-text-primary">{nickname}</p>
            </div>
          )}

          <div className="rounded-lg bg-bg-tertiary p-3 break-all text-xs text-text-secondary font-mono">
            {userId ?? 'Génération…'}
          </div>

          <Button variant="ghost" size="sm" onClick={copyId} className="w-full">
            📋 Copier l&apos;ID d&apos;invitation
          </Button>
        </div>

        <Button
          variant="primary"
          size="lg"
          onClick={() => router.push('/chat')}
          className="w-full"
          disabled={!isAuthenticated}
        >
          Ouvrir le chat →
        </Button>

        <p className="text-xs text-text-muted">
          🔒 Vos messages sont chiffrés sur votre appareil. Nous ne voyons jamais votre contenu.
        </p>
      </div>
    </main>
  );
}
