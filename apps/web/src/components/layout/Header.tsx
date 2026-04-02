'use client';

import Link from 'next/link';
import { useAuthStore } from '@/lib/store/authStore';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';

const isProduction = process.env.NODE_ENV === 'production';
const securityMode = isProduction ? 'PRODUCTION' : 'DEV';

export function Header() {
  const { nickname, userId } = useAuthStore();

  const copyId = () => {
    if (userId) {
      navigator.clipboard.writeText(userId).catch(() => {});
    }
  };

  return (
    <header className="flex items-center justify-between border-b border-bg-tertiary bg-bg-secondary px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-accent-primary font-bold text-lg">PM-Chat</span>
        <span className="text-[10px] text-accent-secondary bg-bg-tertiary px-2 py-0.5 rounded-full">
          E2EE
        </span>
        <span
          className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono ${
            isProduction
              ? 'bg-green-900/30 text-green-400 border border-green-800'
              : 'bg-yellow-900/30 text-yellow-400 border border-yellow-800'
          }`}
          title={`Security Mode: ${securityMode}`}
        >
          {isProduction ? '🔒' : '⚠️'} {securityMode}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={copyId}
          className="gap-1 text-xs"
          title="Copy your invite ID"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
            <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z" />
            <path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z" />
          </svg>
          Copy ID
        </Button>

        {nickname && (
          <Link href="/settings">
            <Avatar nickname={nickname} size="sm" />
          </Link>
        )}
      </div>
    </header>
  );
}
