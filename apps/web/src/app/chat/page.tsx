export default function ChatIndexPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center px-6">
      <div className="text-6xl mb-4">💬</div>
      <h2 className="text-xl font-semibold text-text-primary mb-2">
        Select a conversation
      </h2>
      <p className="text-text-secondary text-sm max-w-xs">
        Choose a conversation from the sidebar, or start a new one by sharing your invite ID.
      </p>
    </div>
  );
}
