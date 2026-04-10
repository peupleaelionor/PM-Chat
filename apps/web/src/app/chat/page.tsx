export default function ChatIndexPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center px-6">
      <div className="text-6xl mb-4">💬</div>
      <h2 className="text-xl font-semibold text-text-primary mb-2">
        Sélectionnez une conversation
      </h2>
      <p className="text-text-secondary text-sm max-w-xs">
        Choisissez une conversation dans la barre latérale, ou démarrez-en une nouvelle en partageant votre ID d&apos;invitation.
      </p>
    </div>
  );
}
