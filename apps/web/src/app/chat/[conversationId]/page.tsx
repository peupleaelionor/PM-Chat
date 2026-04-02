'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getConversation } from '@/lib/api';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { MessageSkeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params['conversationId'] as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => getConversation(conversationId),
    enabled: !!conversationId,
  });

  if (isLoading) {
    return (
      <div className="flex h-full flex-col bg-bg-primary">
        <div className="h-16 border-b border-bg-tertiary bg-bg-secondary" />
        <MessageSkeleton />
      </div>
    );
  }

  if (error || !data?.conversation) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-bg-primary px-6 text-center">
        <div className="text-4xl">⚠️</div>
        <p className="text-text-primary font-semibold">Conversation not found</p>
        <Button variant="ghost" onClick={() => router.push('/chat')}>
          ← Back to chats
        </Button>
      </div>
    );
  }

  return <ChatWindow conversation={data.conversation} />;
}
