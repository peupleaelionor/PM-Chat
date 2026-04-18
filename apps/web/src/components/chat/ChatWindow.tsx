'use client';

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useMessages } from '@/hooks/useMessages';
import { useCrypto } from '@/hooks/useCrypto';
import { useSocket } from '@/hooks/useSocket';
import { useChatStore } from '@/lib/store/chatStore';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';
import { MessageSkeleton } from '@/components/ui/Skeleton';
import { Avatar } from '@/components/ui/Avatar';
import { OnlineStatus } from './OnlineStatus';
import { usePresence } from '@/hooks/usePresence';
import { useAuthStore } from '@/lib/store/authStore';
import { useCryptoStore } from '@/lib/store/cryptoStore';
import { generateNonce } from '@/lib/crypto';
import { getSocket } from '@/lib/socket';
import type { Conversation } from '@/lib/api';
import type { LocalMessage } from '@/lib/store/chatStore';

interface ChatWindowProps {
  conversation: Conversation;
}

export function ChatWindow({ conversation }: ChatWindowProps) {
  const userId = useAuthStore((s) => s.userId);
  const { joinConversation, sendTypingStart, sendTypingStop } = useSocket();
  const { sendEncryptedMessage, decryptReceivedMessage } = useCrypto();
  const keyPair = useCryptoStore((s) => s.keyPair);

  const {
    messages: allMessages,
    setMessages,
    addMessage,
    replaceOptimisticMessage,
    updateMessagePlaintext,
    typingUsers,
    markRead,
  } = useChatStore();

  const peer = conversation.participants.find((p) => p._id !== userId);
  const { isOnline } = usePresence(peer?._id);

  const messages = useMemo(() => allMessages[conversation._id] ?? [], [allMessages, conversation._id]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useMessages(conversation._id);

  // Populate store from react-query pages
  useEffect(() => {
    if (!data) return;
    const flat = data.pages
      .flatMap((page) => page.messages)
      .reverse() as LocalMessage[];
    setMessages(conversation._id, flat);
  }, [data, conversation._id, setMessages]);

  // Decrypt messages as they arrive
  useEffect(() => {
    for (const msg of messages) {
      if (msg.plaintext || msg.optimistic) continue;
      decryptReceivedMessage(
        conversation._id,
        msg.iv,
        msg.encryptedPayload,
        conversation.participants
      ).then((plaintext) => {
        if (plaintext) {
          updateMessagePlaintext(conversation._id, msg._id, plaintext);
        }
      });
    }
  }, [
    messages,
    conversation._id,
    conversation.participants,
    decryptReceivedMessage,
    updateMessagePlaintext,
  ]);

  // Join conversation room on mount
  useEffect(() => {
    joinConversation(conversation._id);
    markRead(conversation._id);
  }, [conversation._id, joinConversation, markRead]);

  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 10,
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    virtualizer.scrollToIndex(messages.length - 1, { behavior: 'smooth' });
  }, [messages.length, virtualizer]);

  // Scroll-to-top triggers pagination
  const handleScroll = useCallback(() => {
    const el = parentRef.current;
    if (!el) return;
    if (el.scrollTop < 80 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleSend = useCallback(
    async (text: string, options?: { burnAfterReading?: boolean }) => {
      if (!userId || !keyPair) return;

      // Optimistic message
      const localId = `opt-${Date.now()}`;
      const optimistic: LocalMessage = {
        _id: localId,
        localId,
        conversationId: conversation._id,
        senderId: userId,
        encryptedPayload: '',
        iv: '',
        timestamp: new Date().toISOString(),
        delivered: false,
        read: false,
        burnAfterReading: options?.burnAfterReading ?? false,
        plaintext: text,
        optimistic: true,
      };
      addMessage(conversation._id, optimistic);

      // Encrypt and send
      const result = await sendEncryptedMessage(
        conversation._id,
        text,
        conversation.participants,
        options
      );

      if (!result) {
        // Replace optimistic with error state
        return;
      }

      // Wait for server ack via socket (message:new will arrive with real id)
      // For now we keep the optimistic and let the replaceOptimisticMessage handle it
    },
    [
      userId,
      keyPair,
      conversation._id,
      conversation.participants,
      addMessage,
      sendEncryptedMessage,
    ]
  );

  const typingSet = typingUsers[conversation._id];
  const typingNames = useMemo(() => {
    if (!typingSet || typingSet.size === 0) return [];
    return conversation.participants
      .filter((p) => typingSet.has(p._id) && p._id !== userId)
      .map((p) => p.nickname);
  }, [typingSet, conversation.participants, userId]);

  if (!peer) return null;

  return (
    <div className="flex h-full flex-col bg-bg-primary">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-bg-tertiary bg-bg-secondary px-4 py-3">
        <div className="relative">
          <Avatar nickname={peer.nickname} />
          <OnlineStatus
            isOnline={isOnline}
            className="absolute -bottom-0.5 -right-0.5"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-text-primary truncate">{peer.nickname}</p>
          <p className="text-xs text-text-secondary">
            {isOnline ? 'En ligne' : 'Hors ligne'}
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs text-accent-secondary" title="Chiffré de bout en bout">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
          </svg>
          <span>E2EE</span>
        </div>
        {conversation.selfDestruct && (
          <span className="text-xs text-accent-danger" title="Conversation autodestructrice">💣</span>
        )}
      </div>

      {/* Messages */}
      {isLoading ? (
        <MessageSkeleton />
      ) : (
        <div
          ref={parentRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 py-2"
        >
          {isFetchingNextPage && (
            <div className="flex justify-center py-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
            </div>
          )}
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const msg = messages[virtualRow.index];
              if (!msg) return null;
              return (
                <div
                  key={msg.localId ?? msg._id}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <MessageBubble
                    message={msg}
                    isMine={msg.senderId === userId}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Typing indicator */}
      <TypingIndicator names={typingNames} />

      {/* Input */}
      <MessageInput
        onSend={handleSend}
        onTypingStart={() => sendTypingStart(conversation._id)}
        onTypingStop={() => sendTypingStop(conversation._id)}
        disabled={!keyPair}
      />
    </div>
  );
}
