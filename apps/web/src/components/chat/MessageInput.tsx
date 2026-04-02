'use client';

import { useState, useRef, useCallback, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface MessageInputProps {
  onSend: (text: string, options?: { burnAfterReading?: boolean }) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  disabled?: boolean;
}

const EMOJI_LIST = ['😀', '😂', '❤️', '👍', '🎉', '🔥', '💯', '✨', '🙏', '😎'];

export function MessageInput({
  onSend,
  onTypingStart,
  onTypingStop,
  disabled,
}: MessageInputProps) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [burnAfterReading, setBurnAfterReading] = useState(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(e.target.value);

      if (!isTypingRef.current) {
        isTypingRef.current = true;
        onTypingStart();
      }

      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        isTypingRef.current = false;
        onTypingStop();
      }, 2000);
    },
    [onTypingStart, onTypingStop]
  );

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;

    onSend(trimmed, { burnAfterReading });
    setText('');
    setBurnAfterReading(false);
    setShowEmoji(false);

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    isTypingRef.current = false;
    onTypingStop();
  }, [text, disabled, burnAfterReading, onSend, onTypingStop]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const insertEmoji = useCallback((emoji: string) => {
    setText((prev) => prev + emoji);
    setShowEmoji(false);
  }, []);

  return (
    <div className="border-t border-bg-tertiary bg-bg-secondary px-4 py-3">
      {/* Burn-after-reading toggle */}
      {burnAfterReading && (
        <div className="mb-2 flex items-center gap-1 text-xs text-accent-danger">
          <span>🔥</span>
          <span>Burn-after-reading enabled</span>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Burn-after-reading button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setBurnAfterReading((b) => !b)}
          className={cn(
            'flex-shrink-0',
            burnAfterReading && 'text-accent-danger'
          )}
          title="Toggle burn-after-reading"
          aria-label="Toggle burn after reading"
        >
          🔥
        </Button>

        {/* Emoji picker toggle */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowEmoji((s) => !s)}
            className="flex-shrink-0"
            title="Emoji"
            aria-label="Open emoji picker"
          >
            😊
          </Button>
          {showEmoji && (
            <div className="absolute bottom-12 left-0 z-50 flex flex-wrap gap-1 rounded-xl bg-bg-elevated p-2 shadow-xl w-48">
              {EMOJI_LIST.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => insertEmoji(emoji)}
                  className="text-xl hover:scale-125 transition-transform p-1"
                  aria-label={`Insert ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Text area */}
        <textarea
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          rows={1}
          disabled={disabled}
          className={cn(
            'flex-1 resize-none rounded-xl bg-bg-tertiary px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted',
            'focus:outline-none focus:ring-2 focus:ring-accent-primary',
            'max-h-32 overflow-y-auto',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          style={{ height: 'auto' }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
          }}
        />

        {/* Send button */}
        <Button
          variant="primary"
          size="icon"
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          className="flex-shrink-0"
          aria-label="Send message"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
