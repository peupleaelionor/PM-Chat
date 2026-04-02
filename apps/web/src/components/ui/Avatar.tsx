import { cn } from '@/lib/utils';

interface AvatarProps {
  nickname: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const COLORS = [
  'bg-purple-600',
  'bg-blue-600',
  'bg-green-600',
  'bg-yellow-600',
  'bg-pink-600',
  'bg-indigo-600',
  'bg-teal-600',
  'bg-orange-600',
];

function getColorIndex(nickname: string): number {
  let hash = 0;
  for (let i = 0; i < nickname.length; i++) {
    hash = nickname.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % COLORS.length;
}

export function Avatar({ nickname, size = 'md', className }: AvatarProps) {
  const initials = nickname
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  const colorClass = COLORS[getColorIndex(nickname)];

  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  };

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full font-semibold text-white flex-shrink-0',
        colorClass,
        sizeClasses[size],
        className
      )}
      aria-label={nickname}
    >
      {initials || '?'}
    </div>
  );
}
