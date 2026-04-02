'use client';

import { useEffect, useRef, useCallback } from 'react';
import { initSocket, disconnectSocket, getSocket } from '@/lib/socket';
import { useAuthStore } from '@/lib/store/authStore';
import { useChatStore } from '@/lib/store/chatStore';
import type {
  MessageNewEvent,
  TypingIndicatorEvent,
  UserPresenceEvent,
  MessageStatusEvent,
} from '@/lib/socket';

export function useSocket() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const {
    addMessage,
    setTyping,
    setOnline,
    updateMessageStatus,
    incrementUnread,
  } = useChatStore();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;
    if (initializedRef.current) return;

    initializedRef.current = true;
    const socket = initSocket(accessToken);

    socket.on('message:new', (event: MessageNewEvent) => {
      addMessage(event.conversationId, {
        _id: event.messageId,
        conversationId: event.conversationId,
        senderId: event.senderId,
        encryptedPayload: event.encryptedPayload,
        iv: event.iv,
        timestamp: event.timestamp,
        delivered: false,
        read: false,
        burnAfterReading: event.burnAfterReading,
        expiresAt: event.expiresAt,
      });
      incrementUnread(event.conversationId);

      // Acknowledge delivery
      socket.emit('message:delivered', {
        messageId: event.messageId,
        conversationId: event.conversationId,
      });
    });

    socket.on('typing:indicator', (event: TypingIndicatorEvent) => {
      setTyping(event.conversationId, event.userId, event.isTyping);
    });

    socket.on('user:presence', (event: UserPresenceEvent) => {
      setOnline(event.userId, event.online);
    });

    socket.on('message:status', (event: MessageStatusEvent) => {
      updateMessageStatus(event.conversationId, event.messageId, event.status);
    });

    return () => {
      initializedRef.current = false;
      disconnectSocket();
    };
  }, [
    isAuthenticated,
    accessToken,
    addMessage,
    setTyping,
    setOnline,
    updateMessageStatus,
    incrementUnread,
  ]);

  const joinConversation = useCallback((conversationId: string) => {
    try {
      getSocket().emit('conversation:join', { conversationId });
    } catch {
      // socket not ready yet
    }
  }, []);

  const sendTypingStart = useCallback((conversationId: string) => {
    try {
      getSocket().emit('typing:start', { conversationId });
    } catch {
      // ignore
    }
  }, []);

  const sendTypingStop = useCallback((conversationId: string) => {
    try {
      getSocket().emit('typing:stop', { conversationId });
    } catch {
      // ignore
    }
  }, []);

  return { joinConversation, sendTypingStart, sendTypingStop };
}
