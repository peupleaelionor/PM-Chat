'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

type FormType = 'pilot' | 'contact';

interface FormState {
  type: FormType;
  // pilot fields
  organisation: string;
  context: string;
  deviceCount: string;
  environment: string;
  // shared
  name: string;
  email: string;
  // contact-only
  subject: string;
  message: string;
}

const empty: FormState = {
  type: 'pilot',
  organisation: '',
  context: '',
  deviceCount: '',
  environment: '',
  name: '',
  email: '',
  subject: '',
  message: '',
};

export default function ContactPage() {
  const [form, setForm] = useState<FormState>(empty);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const set = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg('');
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
      const res = await fetch(`${apiUrl}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? 'Erreur serveur');
      }
      setStatus('success');
      setForm(empty);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur inconnue');
      setStatus('error');
    }
  };

  const inputClass =
    'w-full rounded-lg bg-bg-tertiary border border-bg-elevated px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent transition';

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col">
      {/* Nav */}
      <header className="border-b border-bg-tertiary px-6 py-4">
        <nav className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight text-text-primary hover:text-accent-primary transition-colors">
            PM-Chat
          </Link>
          <Link href="/chat" className="rounded-lg bg-accent-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-purple-500 transition-colors">
            Ouvrir l&apos;app →
          </Link>
        </nav>
      </header>

      <main className="flex-1 px-6 py-16">
        <div className="mx-auto max-w-2xl space-y-10">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-text-primary">Contact</h1>
            <p className="text-text-secondary">
              Demande de pilote ou question générale — nous vous répondons sous 48 h.
            </p>
          </div>

          {/* Tab selector */}
          <div className="flex rounded-xl bg-bg-secondary p-1 border border-bg-tertiary">
            {(['pilot', 'contact'] as FormType[]).map((t) => (
              <button
                key={t}
                onClick={() => setForm((f) => ({ ...f, type: t }))}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                  form.type === t
                    ? 'bg-accent-primary text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {t === 'pilot' ? '🚀 Demande de pilote' : '✉️ Contact général'}
              </button>
            ))}
          </div>

          {status === 'success' ? (
            <div className="rounded-2xl bg-bg-secondary border border-accent-secondary p-8 text-center space-y-4">
              <div className="text-4xl">✅</div>
              <h2 className="text-xl font-semibold text-text-primary">Message envoyé</h2>
              <p className="text-text-secondary text-sm">
                Nous avons bien reçu votre demande et vous répondrons sous 48 h.
              </p>
              <Button variant="ghost" onClick={() => setStatus('idle')}>
                Envoyer une autre demande
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="rounded-2xl bg-bg-secondary border border-bg-tertiary p-8 space-y-5">
              {/* Pilot-only fields */}
              {form.type === 'pilot' && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-text-muted uppercase tracking-wide">
                      Organisation <span className="text-accent-danger">*</span>
                    </label>
                    <input
                      required
                      value={form.organisation}
                      onChange={set('organisation')}
                      placeholder="Nom de l'organisation"
                      className={inputClass}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-text-muted uppercase tracking-wide">
                      Contexte d&apos;utilisation <span className="text-accent-danger">*</span>
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={form.context}
                      onChange={set('context')}
                      placeholder="Décrivez votre contexte opérationnel (zone isolée, événement, site industriel…)"
                      className={inputClass}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-text-muted uppercase tracking-wide">
                        Nombre d&apos;appareils envisagé
                      </label>
                      <select value={form.deviceCount} onChange={set('deviceCount')} className={inputClass}>
                        <option value="">— Sélectionner —</option>
                        <option>1–5</option>
                        <option>6–20</option>
                        <option>21–50</option>
                        <option>50+</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-text-muted uppercase tracking-wide">
                        Environnement
                      </label>
                      <input
                        value={form.environment}
                        onChange={set('environment')}
                        placeholder="Ex : montagne, forêt, site industriel"
                        className={inputClass}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Contact-only: subject */}
              {form.type === 'contact' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-muted uppercase tracking-wide">
                    Objet <span className="text-accent-danger">*</span>
                  </label>
                  <input
                    required
                    value={form.subject}
                    onChange={set('subject')}
                    placeholder="Objet de votre message"
                    className={inputClass}
                  />
                </div>
              )}

              {/* Shared fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-muted uppercase tracking-wide">
                    Nom <span className="text-accent-danger">*</span>
                  </label>
                  <input
                    required
                    value={form.name}
                    onChange={set('name')}
                    placeholder="Votre nom"
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-muted uppercase tracking-wide">
                    Adresse e-mail <span className="text-accent-danger">*</span>
                  </label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={set('email')}
                    placeholder="vous@exemple.com"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-muted uppercase tracking-wide">
                  Message <span className="text-accent-danger">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={form.message}
                  onChange={set('message')}
                  placeholder={
                    form.type === 'pilot'
                      ? 'Informations complémentaires, questions, contraintes spécifiques…'
                      : 'Votre message…'
                  }
                  className={inputClass}
                />
              </div>

              {status === 'error' && (
                <p className="text-sm text-accent-danger">{errorMsg || 'Une erreur est survenue. Veuillez réessayer.'}</p>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={status === 'submitting'}
              >
                {status === 'submitting'
                  ? 'Envoi en cours…'
                  : form.type === 'pilot'
                  ? 'Envoyer la demande de pilote'
                  : 'Envoyer le message'}
              </Button>
            </form>
          )}
        </div>
      </main>

      <footer className="border-t border-bg-tertiary px-6 py-6 text-center">
        <p className="text-xs text-text-muted">© PM-Chat. Système de communication autonome et privé.</p>
      </footer>
    </div>
  );
}
