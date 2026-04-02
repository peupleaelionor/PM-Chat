import { create } from 'zustand';
import type { Conversation, Message } from '../api';

export interface LocalMessage extends Message {
  // Decrypted plaintext (populated client-side after decryption)
  plaintext?: string;
  // Optimistic: shown before server confirms
  optimistic?: boolean;
  // Optimistic local ID before server assigns real _id
  localId?: string;
  // Emoji reactions: emoji -> array of userIds
  reactions?: Record<string, string[]>;
}

interface TypingState {
  [conversationId: string]: Set<string>; // set of userId strings
}

interface ChatState {
  conversations: Conversation[];
  conversationsLoaded: boolean;
  messages: Record<string, LocalMessage[]>; // keyed by conversationId
  typingUsers: TypingState;
  onlineUsers: Set<string>;
  unreadCounts: Record<string, number>;

  setConversations: (convs: Conversation[]) => void;
  prependConversations: (convs: Conversation[]) => void;
  upsertConversation: (conv: Conversation) => void;
  removeConversation: (id: string) => void;

  setMessages: (conversationId: string, messages: LocalMessage[]) => void;
  prependMessages: (conversationId: string, messages: LocalMessage[]) => void;
  addMessage: (conversationId: string, message: LocalMessage) => void;
  replaceOptimisticMessage: (conversationId: string, localId: string, real: LocalMessage) => void;
  updateMessageStatus: (conversationId: string, messageId: string, status: 'delivered' | 'read') => void;
  updateMessagePlaintext: (conversationId: string, messageId: string, plaintext: string) => void;
  removeMessage: (conversationId: string, messageId: string) => void;

  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void;
  setOnline: (userId: string, online: boolean) => void;
  markRead: (conversationId: string) => void;
  incrementUnread: (conversationId: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  conversationsLoaded: false,
  messages: {},
  typingUsers: {},
  onlineUsers: new Set(),
  unreadCounts: {},

  setConversations: (convs) => set({ conversations: convs, conversationsLoaded: true }),

  prependConversations: (convs) =>
    set((s) => ({ conversations: [...s.conversations, ...convs] })),

  upsertConversation: (conv) =>
    set((s) => {
      const exists = s.conversations.findIndex((c) => c._id === conv._id);
      if (exists >= 0) {
        const next = [...s.conversations];
        next[exists] = conv;
        return { conversations: next };
      }
      return { conversations: [conv, ...s.conversations] };
    }),

  removeConversation: (id) =>
    set((s) => ({ conversations: s.conversations.filter((c) => c._id !== id) })),

  setMessages: (conversationId, messages) =>
    set((s) => ({ messages: { ...s.messages, [conversationId]: messages } })),

  prependMessages: (conversationId, messages) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: [...messages, ...(s.messages[conversationId] ?? [])],
      },
    })),

  addMessage: (conversationId, message) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: [...(s.messages[conversationId] ?? []), message],
      },
    })),

  replaceOptimisticMessage: (conversationId, localId, real) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: (s.messages[conversationId] ?? []).map((m) =>
          m.localId === localId ? real : m
        ),
      },
    })),

  updateMessageStatus: (conversationId, messageId, status) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: (s.messages[conversationId] ?? []).map((m) =>
          m._id === messageId
            ? {
                ...m,
                delivered: status === 'delivered' || m.delivered,
                read: status === 'read' || m.read,
              }
            : m
        ),
      },
    })),

  updateMessagePlaintext: (conversationId, messageId, plaintext) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: (s.messages[conversationId] ?? []).map((m) =>
          m._id === messageId ? { ...m, plaintext } : m
        ),
      },
    })),

  removeMessage: (conversationId, messageId) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: (s.messages[conversationId] ?? []).filter(
          (m) => m._id !== messageId
        ),
      },
    })),

  setTyping: (conversationId, userId, isTyping) =>
    set((s) => {
      const current = new Set(s.typingUsers[conversationId] ?? []);
      if (isTyping) {
        current.add(userId);
      } else {
        current.delete(userId);
      }
      return { typingUsers: { ...s.typingUsers, [conversationId]: current } };
    }),

  setOnline: (userId, online) =>
    set((s) => {
      const next = new Set(s.onlineUsers);
      if (online) {
        next.add(userId);
      } else {
        next.delete(userId);
      }
      return { onlineUsers: next };
    }),

  markRead: (conversationId) =>
    set((s) => ({ unreadCounts: { ...s.unreadCounts, [conversationId]: 0 } })),

  incrementUnread: (conversationId) =>
    set((s) => ({
      unreadCounts: {
        ...s.unreadCounts,
        [conversationId]: (s.unreadCounts[conversationId] ?? 0) + 1,
      },
    })),
}));
