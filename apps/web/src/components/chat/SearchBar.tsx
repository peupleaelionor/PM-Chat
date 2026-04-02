'use client';

import { useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/lib/store/chatStore';

interface SearchBarProps {
  conversationId?: string;
  className?: string;
}

export function SearchBar({ conversationId, className }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<Array<{ id: string; text: string; timestamp: string }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const messages = useChatStore((s) => conversationId ? s.messages[conversationId] : undefined);

  const handleSearch = useCallback(
    (searchQuery: string) => {
      setQuery(searchQuery);
      if (!searchQuery.trim() || !messages) {
        setResults([]);
        return;
      }

      const lower = searchQuery.toLowerCase();
      const matched = messages
        .filter((m) => m.plaintext?.toLowerCase().includes(lower))
        .map((m) => ({
          id: m._id ?? m.localId ?? '',
          text: m.plaintext ?? '',
          timestamp: m.timestamp,
        }))
        .slice(0, 20); // Limit results

      setResults(matched);
    },
    [messages]
  );

  const toggleSearch = useCallback(() => {
    setIsOpen((o) => {
      if (!o) {
        // Focus input when opening
        setTimeout(() => inputRef.current?.focus(), 100);
      } else {
        setQuery('');
        setResults([]);
      }
      return !o;
    });
  }, []);

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={toggleSearch}
        className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
        title="Search messages"
        aria-label="Search messages"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-72 z-50 rounded-xl bg-bg-elevated border border-bg-tertiary shadow-xl p-2 animate-fade-in">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search messages…"
            className="w-full rounded-lg bg-bg-tertiary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent-primary"
            aria-label="Search messages"
          />
          {results.length > 0 && (
            <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
              {results.map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg px-3 py-2 text-xs text-text-secondary hover:bg-bg-tertiary cursor-pointer"
                >
                  <p className="text-text-primary truncate">{r.text}</p>
                  <p className="text-text-muted text-[10px]">
                    {new Date(r.timestamp).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
          {query && results.length === 0 && (
            <p className="mt-2 text-xs text-text-muted text-center py-2">No messages found</p>
          )}
        </div>
      )}
    </div>
  );
}
