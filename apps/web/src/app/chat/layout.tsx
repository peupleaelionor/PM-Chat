'use client';

import { useParams } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { useSocket } from '@/hooks/useSocket';
import { ConnectionStatus } from '@/components/ui/ConnectionStatus';
import { AnonymousLogin } from '@/components/auth/AnonymousLogin';

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Initialize socket connection for the whole chat section
  useSocket();

  const params = useParams();
  const conversationId = params?.['conversationId'] as string | undefined;

  return (
    <AnonymousLogin>
      <>
      <ConnectionStatus />
      <div className="flex h-screen overflow-hidden bg-bg-primary">
        {/* Sidebar – hidden on mobile when conversation is active */}
        <div
          className={`
            flex-shrink-0 border-r border-bg-tertiary
            w-full md:w-72 lg:w-80
            ${conversationId ? 'hidden md:flex md:flex-col' : 'flex flex-col'}
          `}
        >
          <Sidebar activeConversationId={conversationId} />
        </div>

        {/* Main content */}
        <main className={`
          flex-1 min-w-0
          ${!conversationId ? 'hidden md:flex' : 'flex'}
          flex-col
        `}>
          {children}
        </main>
      </div>
      </>
    </AnonymousLogin>
  );
}
