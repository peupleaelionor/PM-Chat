import { cn } from '@/lib/utils';

interface OnlineStatusProps {
  isOnline: boolean;
  className?: string;
}

export function OnlineStatus({ isOnline, className }: OnlineStatusProps) {
  return (
    <span
      className={cn(
        'block h-2.5 w-2.5 rounded-full border-2 border-bg-primary',
        isOnline ? 'bg-green-500' : 'bg-text-muted',
        className
      )}
      aria-label={isOnline ? 'En ligne' : 'Hors ligne'}
    />
  );
}
