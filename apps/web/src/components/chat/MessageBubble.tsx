'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { LocalMessage } from '@/lib/store/chatStore';

interface MessageBubbleProps {
  message: LocalMessage;
  isMine: boolean;
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusIcon({ message }: { message: LocalMessage }) {
  if (message.optimistic) {
    return <span className="text-text-muted">●</span>;
  }
  if (message.read) {
    return <span className="text-accent-secondary text-xs" title="Read">✓✓</span>;
  }
  if (message.delivered) {
    return <span className="text-text-secondary text-xs" title="Delivered">✓✓</span>;
  }
  return <span className="text-text-muted text-xs" title="Sent">✓</span>;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  isMine,
}: MessageBubbleProps) {
  const displayText = message.plaintext ?? '🔒 Encrypted';
  const isDecrypting = !message.plaintext && !message.optimistic;

  const expiresAt = message.expiresAt ? new Date(message.expiresAt) : null;
  const now = new Date();
  const isExpired = expiresAt ? expiresAt < now : false;

  if (isExpired) return null;

  return (
    <div
      className={cn(
        'flex w-full mb-1 animate-slide-up',
        isMine ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'relative max-w-[70%] rounded-2xl px-4 py-2 text-sm shadow-sm',
          isMine
            ? 'bg-bubble-sent text-white rounded-br-sm'
            : 'bg-bubble-received text-text-primary rounded-bl-sm',
          message.optimistic && 'opacity-70',
          isDecrypting && 'animate-pulse'
        )}
      >
        {/* Burn-after-reading indicator */}
        {message.burnAfterReading && (
          <span className="mr-1" title="Burns after reading" aria-label="Burn after reading">
            🔥
          </span>
        )}

        <span className={cn(isDecrypting && 'text-text-muted italic')}>
          {isDecrypting ? 'Decrypting…' : displayText}
        </span>

        {/* Expiry timer */}
        {expiresAt && (
          <span className="ml-2 text-xs opacity-60">
            ⏱ {Math.max(0, Math.round((expiresAt.getTime() - now.getTime()) / 60000))}m
          </span>
        )}

        {/* Timestamp + status */}
        <div
          className={cn(
            'mt-1 flex items-center gap-1 text-[10px]',
            isMine ? 'justify-end text-purple-200' : 'justify-start text-text-muted'
          )}
        >
          <span>{formatTime(message.timestamp)}</span>
          {isMine && <StatusIcon message={message} />}
        </div>
      </div>
    </div>
  );
});
