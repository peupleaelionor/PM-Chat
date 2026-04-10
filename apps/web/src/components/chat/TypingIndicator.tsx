export function TypingIndicator({ names }: { names: string[] }) {
  if (names.length === 0) return null;

  const label =
    names.length === 1
      ? `${names[0]} est en train d'écrire`
      : names.length === 2
      ? `${names[0]} et ${names[1]} sont en train d'écrire`
      : 'Plusieurs personnes écrivent';

  return (
    <div className="flex items-center gap-2 px-4 py-1 text-xs text-text-secondary animate-fade-in">
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="inline-block h-1.5 w-1.5 rounded-full bg-text-secondary animate-pulse-dot"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </span>
      <span>{label}</span>
    </div>
  );
}
