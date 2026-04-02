import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded bg-bg-tertiary',
        className
      )}
    />
  );
}

export function MessageSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className={cn('flex', i % 2 === 0 ? 'justify-start' : 'justify-end')}
        >
          <Skeleton
            className={cn(
              'h-10 rounded-2xl',
              i % 3 === 0 ? 'w-48' : i % 3 === 1 ? 'w-64' : 'w-32'
            )}
          />
        </div>
      ))}
    </div>
  );
}
