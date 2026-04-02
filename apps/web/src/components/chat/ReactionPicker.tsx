'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

interface ReactionPickerProps {
  onReact: (emoji: string) => void;
  className?: string;
}

export function ReactionPicker({ onReact, className }: ReactionPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  return (
    <div ref={ref} className={cn('relative inline-flex', className)}>
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-text-secondary text-xs p-1 rounded"
        aria-label="Add reaction"
        title="React"
      >
        😊
      </button>

      {isOpen && (
        <div className="absolute bottom-8 left-0 z-50 flex gap-0.5 rounded-xl bg-bg-elevated p-1.5 shadow-xl border border-bg-tertiary animate-fade-in">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onReact(emoji);
                setIsOpen(false);
              }}
              className="text-lg hover:scale-125 transition-transform p-1 rounded hover:bg-bg-tertiary"
              aria-label={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface ReactionDisplayProps {
  reactions: Record<string, string[]>; // emoji -> array of userIds
  currentUserId?: string;
  onToggle: (emoji: string) => void;
}

export function ReactionDisplay({ reactions, currentUserId, onToggle }: ReactionDisplayProps) {
  const entries = Object.entries(reactions).filter(([, users]) => users.length > 0);
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {entries.map(([emoji, users]) => {
        const isMine = currentUserId ? users.includes(currentUserId) : false;
        return (
          <button
            key={emoji}
            onClick={() => onToggle(emoji)}
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs transition-colors',
              isMine
                ? 'bg-accent-primary/20 border border-accent-primary/40 text-text-primary'
                : 'bg-bg-tertiary border border-bg-tertiary text-text-secondary hover:border-text-muted'
            )}
            title={`${users.length} reaction${users.length > 1 ? 's' : ''}`}
          >
            <span>{emoji}</span>
            <span className="text-[10px]">{users.length}</span>
          </button>
        );
      })}
    </div>
  );
}
