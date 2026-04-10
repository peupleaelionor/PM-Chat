'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChatList } from '@/components/chat/ChatList';
import { Header } from './Header';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';
import { createConversation } from '@/lib/api';
import { useChatStore } from '@/lib/store/chatStore';
import { cn } from '@/lib/utils';

export function Sidebar({ activeConversationId }: { activeConversationId?: string }) {
  const [showNewChat, setShowNewChat] = useState(false);
  const [recipientId, setRecipientId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const { upsertConversation } = useChatStore();

  const handleCreate = async () => {
    const id = recipientId.trim();
    if (!id) return;
    setIsCreating(true);
    setError('');
    try {
      const { conversation } = await createConversation({ participantIds: [id] });
      upsertConversation(conversation);
      setShowNewChat(false);
      setRecipientId('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Échec de la création de la conversation');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <aside className="flex h-full w-full flex-col bg-bg-secondary">
      <Header />

      {/* New chat button */}
      <div className="px-4 py-3 border-b border-bg-tertiary">
        <Button
          variant="primary"
          size="sm"
          className="w-full gap-2"
          onClick={() => setShowNewChat((s) => !s)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
          Nouvelle conversation
        </Button>

        {showNewChat && (
          <div className="mt-2 space-y-2">
            <input
              type="text"
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              placeholder="Entrez l'ID de l'utilisateur…"
              className="w-full rounded-lg bg-bg-tertiary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
            {error && <p className="text-xs text-accent-danger">{error}</p>}
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreate}
                disabled={isCreating || !recipientId.trim()}
                className="flex-1"
              >
                {isCreating ? 'Création…' : 'Démarrer la conversation'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setShowNewChat(false); setError(''); }}
              >
                Annuler
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        <ChatList activeConversationId={activeConversationId} />
      </div>

      {/* Settings link */}
      <div className="border-t border-bg-tertiary p-3">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-secondary',
            'hover:bg-bg-tertiary hover:text-text-primary transition-colors'
          )}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.205 1.251l-1.18 2.044a1 1 0 01-1.186.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.113a7.048 7.048 0 010-2.228L1.821 7.773a1 1 0 01-.205-1.251l1.18-2.044a1 1 0 011.186-.447l1.598.54A6.992 6.992 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
          Paramètres
        </Link>
      </div>
    </aside>
  );
}
