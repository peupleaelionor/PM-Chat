'use client';

import { useChatStore } from '@/lib/store/chatStore';

export function usePresence(userId?: string) {
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  if (!userId) return { isOnline: false };
  return { isOnline: onlineUsers.has(userId) };
}
