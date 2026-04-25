import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col">
      {/* ── Nav ──────────────────────────────────────────────────── */}
      <header className="border-b border-bg-tertiary px-6 py-4">
        <nav className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="text-lg font-bold tracking-tight text-text-primary">PM-Chat</span>
          <div className="flex items-center gap-4 text-sm text-text-secondary">
            <Link href="/contact" className="hover:text-text-primary transition-colors">Contact</Link>
            <Link
              href="/chat"
              className="rounded-lg bg-accent-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-purple-500 transition-colors"
            >
              Ouvrir l&apos;app →
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section className="px-6 py-24 text-center">
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-primary shadow-lg mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="h-8 w-8">
                <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold leading-tight text-text-primary sm:text-5xl">
              Communication directe.<br />Sans infrastructure.
            </h1>
            <p className="text-lg text-text-secondary">
              PM-Chat est un système de messagerie autonome, chiffré et privé.
              Appareil à appareil — sans Internet, sans Wi-Fi, sans carte SIM.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/chat"
                className="rounded-xl bg-accent-primary px-6 py-3 font-medium text-white hover:bg-purple-500 transition-colors"
              >
                Accéder à la messagerie →
              </Link>
              <Link
                href="/contact"
                className="rounded-xl border border-bg-tertiary px-6 py-3 font-medium text-text-secondary hover:text-text-primary hover:border-bg-elevated transition-colors"
              >
                Demander un pilote
              </Link>
            </div>
          </div>
        </section>

        {/* ── 3 Piliers ────────────────────────────────────────────── */}
        <section className="border-t border-bg-tertiary px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-10 text-center text-2xl font-bold text-text-primary">
              Un système en trois couches
            </h2>
            <div className="grid gap-6 sm:grid-cols-3">
              {[
                {
                  icon: '📡',
                  title: 'PM-Chat Device',
                  desc: 'Le cœur matériel. Communication LoRa longue portée, chiffrement AES-256-GCM, réseau maillé multi-sauts. Sans aucune infrastructure réseau.',
                },
                {
                  icon: '⚙️',
                  title: 'PM-Chat Setup',
                  desc: 'La couche de déploiement. Guides de flashage, provisionnement, appairage et maintenance pour rendre le réseau opérationnel.',
                },
                {
                  icon: '🌐',
                  title: 'PM-Chat Online',
                  desc: 'La vitrine numérique. Documentation technique, téléchargements firmware, demande de pilote. Compagnon du système, jamais une dépendance.',
                },
              ].map((p) => (
                <div key={p.title} className="rounded-2xl bg-bg-secondary p-6 space-y-3 border border-bg-tertiary">
                  <div className="text-3xl">{p.icon}</div>
                  <h3 className="font-semibold text-text-primary">{p.title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pourquoi PM-Chat ──────────────────────────────────────── */}
        <section className="border-t border-bg-tertiary bg-bg-secondary px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-10 text-center text-2xl font-bold text-text-primary">
              Conçu pour l&apos;autonomie totale de communication
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: 'Communication directe entre appareils', desc: 'Les messages transitent d\'appareil à appareil, sans serveur intermédiaire, sans relais cloud.' },
                { title: 'Réseau privé fermé par conception', desc: 'Seuls les appareils provisionnés avec le même code réseau peuvent communiquer.' },
                { title: 'Sans infrastructure externe', desc: 'Pas d\'Internet, pas de Wi-Fi, pas de carte SIM. Le système fonctionne partout.' },
                { title: 'Chiffrement AES-256-GCM local', desc: 'Chaque message est chiffré sur l\'appareil avant transmission. Les clés restent sur l\'appareil.' },
                { title: 'Relais maillé multi-sauts', desc: 'Les appareils intermédiaires relaient automatiquement les messages, étendant la portée sans configuration.' },
                { title: 'Aucun serveur tiers', desc: 'Aucun compte utilisateur, aucun historique centralisé. Conçu pour limiter ce qui peut être observé.' },
              ].map((f) => (
                <div key={f.title} className="rounded-xl bg-bg-primary p-5 border border-bg-tertiary space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-accent-secondary text-lg">✓</span>
                    <h3 className="font-medium text-text-primary text-sm">{f.title}</h3>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed pl-6">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Comment ça fonctionne ─────────────────────────────────── */}
        <section className="border-t border-bg-tertiary px-6 py-16">
          <div className="mx-auto max-w-3xl text-center space-y-12">
            <h2 className="text-2xl font-bold text-text-primary">Trois étapes. Un réseau opérationnel.</h2>
            <div className="grid gap-8 sm:grid-cols-3 text-left">
              {[
                {
                  step: '01',
                  title: 'Provisionner',
                  desc: 'Configurer chaque appareil avec un code réseau partagé. Ce code définit le groupe de communication.',
                },
                {
                  step: '02',
                  title: 'Communiquer',
                  desc: 'Envoyer et recevoir des messages chiffrés via LoRa. Le chiffrement est automatique et transparent.',
                },
                {
                  step: '03',
                  title: 'Relayer',
                  desc: 'Les appareils intermédiaires étendent automatiquement la portée. Un message peut traverser plusieurs sauts.',
                },
              ].map((s) => (
                <div key={s.step} className="space-y-2">
                  <div className="text-3xl font-bold text-accent-primary opacity-60">{s.step}</div>
                  <h3 className="font-semibold text-text-primary">{s.title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="pt-4 flex flex-wrap justify-center gap-3">
              <Link
                href="/contact"
                className="rounded-xl bg-accent-primary px-6 py-3 font-medium text-white hover:bg-purple-500 transition-colors"
              >
                Demander un pilote
              </Link>
              <Link
                href="/chat"
                className="rounded-xl border border-bg-tertiary px-6 py-3 font-medium text-text-secondary hover:text-text-primary hover:border-bg-elevated transition-colors"
              >
                Essayer la messagerie en ligne
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-bg-tertiary px-6 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <span className="text-sm font-semibold text-text-primary">PM-Chat</span>
          <div className="flex gap-6 text-xs text-text-muted">
            <Link href="/contact" className="hover:text-text-secondary transition-colors">Contact</Link>
            <Link href="/chat" className="hover:text-text-secondary transition-colors">Messagerie</Link>
          </div>
          <p className="text-xs text-text-muted">© PM-Chat. Système de communication autonome et privé.</p>
        </div>
      </footer>
    </div>
  );
}
