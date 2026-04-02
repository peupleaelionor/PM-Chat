'use client';

import { useState, useEffect } from 'react';
import { isSocketReady } from '@/lib/socket';
import { cn } from '@/lib/utils';

type ConnectionState = 'connected' | 'connecting' | 'disconnected' | 'reconnecting';

export function ConnectionStatus() {
  const [state, setState] = useState<ConnectionState>('connecting');
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const check = () => {
      if (typeof window === 'undefined') return;
      
      const isOnline = navigator.onLine;
      const socketOk = isSocketReady();

      if (!isOnline) {
        setState('disconnected');
        setVisible(true);
      } else if (!socketOk) {
        setState('reconnecting');
        setVisible(true);
      } else {
        setState('connected');
        // Hide "connected" banner after 2s
        setVisible(true);
        const timer = setTimeout(() => setVisible(false), 2000);
        return () => clearTimeout(timer);
      }
    };

    check();
    const interval = setInterval(check, 3000);

    const handleOnline = () => {
      setState('reconnecting');
      setVisible(true);
    };
    const handleOffline = () => {
      setState('disconnected');
      setVisible(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!visible) return null;

  const config: Record<ConnectionState, { text: string; className: string; icon: string }> = {
    connected: {
      text: 'Connected',
      className: 'bg-green-900/80 text-green-300 border-green-700',
      icon: '✓',
    },
    connecting: {
      text: 'Connecting…',
      className: 'bg-yellow-900/80 text-yellow-300 border-yellow-700',
      icon: '⟳',
    },
    disconnected: {
      text: 'Offline — messages will be sent when reconnected',
      className: 'bg-red-900/80 text-red-300 border-red-700',
      icon: '✕',
    },
    reconnecting: {
      text: 'Reconnecting…',
      className: 'bg-yellow-900/80 text-yellow-300 border-yellow-700',
      icon: '⟳',
    },
  };

  const { text, className, icon } = config[state];

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 py-1 text-xs border-b transition-all duration-300',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <span className={state === 'connecting' || state === 'reconnecting' ? 'animate-spin' : ''}>
        {icon}
      </span>
      <span>{text}</span>
    </div>
  );
}
