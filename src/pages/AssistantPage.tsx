import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Bot, BookOpenCheck, Copy, FileText, Info, Layers, ListChecks, Send, Trash2, User } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { SimpleMarkdown } from '@/components/ui/SimpleMarkdown';
import { FilterSelect } from '@/components/ui/FilterSelect';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useStore } from '@/context/StoreContext';
import { useToast } from '@/context/ToastContext';
import { aiProvider, TASK_LABEL, type StudyTask } from '@/lib/ai';
import { copyText } from '@/lib/clipboard';
import { uid } from '@/lib/id';
import { cn } from '@/lib/cn';
import type { ChatMessage } from '@/types';

const TOOLS: Array<{ task: StudyTask; icon: typeof FileText; hint: string }> = [
  { task: 'summary', icon: FileText, hint: 'Les idées principales' },
  { task: 'flashcards', icon: Layers, hint: 'Notions et définitions' },
  { task: 'quiz', icon: ListChecks, hint: 'Questions à trous' },
];

export function AssistantPage() {
  const { chat, setChat, notes } = useStore();
  const { notify } = useToast();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedSource, setSource] = useState<string>(notes[0]?.id ?? 'paste');
  // Si la note sélectionnée a été supprimée, on revient au texte collé.
  const source = notes.some((n) => n.id === selectedSource) ? selectedSource : 'paste';
  const [pasted, setPasted] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [chat.length, loading]);

  const push = (role: ChatMessage['role'], content: string) =>
    setChat((c) => [...c, { id: uid(), role, content, createdAt: new Date().toISOString() }]);

  const run = async (fn: () => Promise<string>) => {
    setLoading(true);
    try {
      push('assistant', await fn());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue';
      push('assistant', `**Erreur :** ${msg}. Vérifiez la configuration du serveur IA.`);
      notify("L'assistant n'a pas pu répondre", 'error');
    } finally {
      setLoading(false);
    }
  };

  const send = (e?: FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const history = [...chat, { role: 'user' as const, content: text }].map(({ role, content }) => ({ role, content }));
    push('user', text);
    void run(() => aiProvider.chat(history));
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const generate = (task: StudyTask) => {
    const note = notes.find((n) => n.id === source);
    const text = note ? `${note.title}. ${note.content}` : pasted;
    if (text.trim().length < 40) {
      notify(note ? 'Cette note est trop courte.' : 'Collez un texte d’au moins quelques phrases.', 'error');
      return;
    }
    push('user', `${TASK_LABEL[task]} ${note ? `de la note « ${note.title} »` : 'du texte collé'}`);
    void run(() => aiProvider.generate(task, text));
  };

  return (
    <>
      <PageHeader
        title="Assistant IA"
        description="Posez vos questions et générez des résumés, fiches et quiz."
        actions={chat.length > 0 && <Button variant="secondary" onClick={() => setConfirmClear(true)}><Trash2 className="h-4 w-4" aria-hidden />Effacer la discussion</Button>}
      />

      {aiProvider.isDemo && (
        <div className="mb-5 flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] p-4 text-sm" role="note">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" aria-hidden />
          <div>
            <p className="font-semibold">Mode démonstration — aucune IA n'est connectée</p>
            <p className="mt-0.5 text-muted">
              Aucune requête n'est envoyée à un service externe. Le chat ne peut pas répondre à vos questions, et les résumés,
              fiches et quiz sont produits localement par des règles simples d'extraction de texte. Pour activer une vraie IA,
              configurez <code className="rounded bg-elevated px-1">VITE_AI_API_URL</code> (voir README).
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <section className="card flex h-[calc(100dvh-22rem)] min-h-[420px] flex-col overflow-hidden lg:h-[calc(100dvh-20rem)]" aria-label="Discussion">
          <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite" aria-busy={loading}>
            {chat.length === 0 && (
              <div className="grid h-full place-items-center text-center">
                <div>
                  <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-electric-500 shadow-glow">
                    <Bot className="h-6 w-6 text-white" aria-hidden />
                  </div>
                  <p className="font-semibold">Votre assistant d'étude</p>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-muted">Posez une question ou choisissez une note à droite pour générer un résumé, une fiche ou un quiz.</p>
                </div>
              </div>
            )}
            {chat.map((m) => (
              <div key={m.id} className={cn('flex gap-3 animate-fade-in', m.role === 'user' && 'flex-row-reverse')}>
                <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full', m.role === 'user' ? 'bg-elevated' : 'bg-gradient-to-br from-brand-500 to-electric-500')} aria-hidden>
                  {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-white" />}
                </span>
                <div className={cn('group relative max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed', m.role === 'user' ? 'bg-brand-600 text-white' : 'border border-line bg-elevated/60')}>
                  <span className="sr-only">{m.role === 'user' ? 'Vous :' : 'Assistant :'}</span>
                  {m.role === 'user' ? <p className="whitespace-pre-wrap">{m.content}</p> : <SimpleMarkdown text={m.content} />}
                  {m.role === 'assistant' && (
                    <button
                      type="button"
                      onClick={async () => notify((await copyText(m.content)) ? 'Réponse copiée' : 'Impossible de copier', 'success')}
                      className="absolute -bottom-3 right-2 rounded-md border border-line bg-surface p-1 text-muted opacity-0 transition hover:text-fg focus:opacity-100 group-hover:opacity-100"
                      aria-label="Copier la réponse"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3" role="status">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-electric-500"><Bot className="h-4 w-4 text-white" aria-hidden /></span>
                <div className="flex items-center gap-1 rounded-2xl border border-line bg-elevated/60 px-4 py-3">
                  <span className="sr-only">L'assistant rédige…</span>
                  {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${i * 0.15}s` }} />)}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
          <form onSubmit={send} className="flex items-end gap-2 border-t border-line p-3">
            <label htmlFor="chat-input" className="sr-only">Votre message</label>
            <textarea
              id="chat-input"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Posez une question… (Entrée pour envoyer)"
              maxLength={4000}
              className="field max-h-40 min-h-[44px] flex-1 resize-none"
            />
            <Button type="submit" size="icon" className="h-11 w-11" disabled={!input.trim() || loading} aria-label="Envoyer">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </section>

        <aside className="card h-fit p-4" aria-labelledby="tools-title">
          <h2 id="tools-title" className="mb-3 flex items-center gap-2 font-semibold"><BookOpenCheck className="h-4 w-4 text-brand-400" aria-hidden />Outils de révision</h2>
          <label htmlFor="source" className="label">Source</label>
          <FilterSelect id="source" aria-label="Source du texte" value={source} onChange={(e) => setSource(e.target.value)} className="w-full">
            {notes.map((n) => <option key={n.id} value={n.id}>{n.subject} — {n.title}</option>)}
            <option value="paste">Coller un texte…</option>
          </FilterSelect>
          {source === 'paste' && (
            <textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              aria-label="Texte à traiter"
              placeholder="Collez ici le texte de votre cours…"
              className="field mt-2 min-h-[140px] resize-y"
            />
          )}
          {notes.length === 0 && source === 'paste' && <p className="mt-2 text-xs text-muted">Astuce : vos notes de cours apparaîtront ici comme sources.</p>}
          <div className="mt-4 grid gap-2">
            {TOOLS.map(({ task, icon: Icon, hint }) => (
              <button
                key={task}
                type="button"
                disabled={loading}
                onClick={() => generate(task)}
                className="flex items-center gap-3 rounded-xl border border-line bg-elevated/50 p-3 text-left transition hover:border-brand-500/50 hover:bg-elevated disabled:opacity-50"
              >
                <span className="rounded-lg bg-brand-500/15 p-2 text-brand-400"><Icon className="h-4 w-4" aria-hidden /></span>
                <span>
                  <span className="block text-sm font-medium">Générer : {TASK_LABEL[task].toLowerCase()}</span>
                  <span className="block text-xs text-muted">{hint}</span>
                </span>
              </button>
            ))}
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="Effacer la discussion ?"
        message="Tous les messages de la discussion seront supprimés."
        confirmLabel="Effacer"
        onConfirm={() => { setChat([]); setConfirmClear(false); notify('Discussion effacée'); }}
        onCancel={() => setConfirmClear(false)}
      />
    </>
  );
}
