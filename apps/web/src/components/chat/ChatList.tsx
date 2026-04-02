'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getConversations } from '@/lib/api';
import { useChatStore } from '@/lib/store/chatStore';
import { useAuthStore } from '@/lib/store/authStore';
import { Avatar } from '@/components/ui/Avatar';
import { OnlineStatus } from './OnlineStatus';
import { usePresence } from '@/hooks/usePresence';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import type { Conversation } from '@/lib/api';

function ConversationItem({
  conversation,
  isActive,
  userId,
}: {
  conversation: Conversation;
  isActive: boolean;
  userId: string | null;
}) {
  const router = useRouter();
  const unreadCounts = useChatStore((s) => s.unreadCounts);
  const peer = conversation.participants.find((p) => p._id !== userId);
  const { isOnline } = usePresence(peer?._id);
  const unread = unreadCounts[conversation._id] ?? 0;

  if (!peer) return null;

  const lastAt = new Date(conversation.lastMessageAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <button
      onClick={() => router.push(`/chat/${conversation._id}`)}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
        isActive
          ? 'bg-bg-elevated'
          : 'hover:bg-bg-tertiary active:bg-bg-elevated'
      )}
    >
      <div className="relative flex-shrink-0">
        <Avatar nickname={peer.nickname} />
        <OnlineStatus
          isOnline={isOnline}
          className="absolute -bottom-0.5 -right-0.5"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-text-primary truncate text-sm">
            {peer.nickname}
          </span>
          <span className="ml-2 text-[10px] text-text-muted flex-shrink-0">{lastAt}</span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-xs text-text-secondary truncate">
            {conversation.selfDestruct ? '💣 Self-destruct' : '🔒 Encrypted'}
          </span>
          {unread > 0 && (
            <span className="ml-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent-primary px-1 text-[10px] font-bold text-white">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export function ChatList({ activeConversationId }: { activeConversationId?: string }) {
  const userId = useAuthStore((s) => s.userId);
  const { conversations, setConversations, conversationsLoaded } = useChatStore();

  const { data, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => getConversations(),
    enabled: !!userId,
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (data) setConversations(data.conversations);
  }, [data, setConversations]);

  return (
    <div className="flex flex-col overflow-y-auto">
      {isLoading && !conversationsLoaded
        ? Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-2 w-48" />
              </div>
            </div>
          ))
        : conversations.map((conv) => (
            <ConversationItem
              key={conv._id}
              conversation={conv}
              isActive={conv._id === activeConversationId}
              userId={userId}
            />
          ))}

      {!isLoading && conversations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center px-6">
          <div className="text-4xl mb-3">💬</div>
          <p className="text-text-secondary text-sm">No conversations yet.</p>
          <p className="text-text-muted text-xs mt-1">
            Share your ID with someone to start chatting.
          </p>
        </div>
      )}
    </div>
  );
}
