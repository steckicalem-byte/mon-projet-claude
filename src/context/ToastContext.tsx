import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/cn';

type ToastKind = 'success' | 'info' | 'error';
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
  action?: { label: string; onClick: () => void };
}

interface ToastApi {
  notify: (message: string, kind?: ToastKind, action?: Toast['action']) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const notify = useCallback<ToastApi['notify']>(
    (message, kind = 'success', action) => {
      const id = next.current++;
      setToasts((t) => [...t.slice(-3), { id, kind, message, action }]);
      window.setTimeout(() => dismiss(id), action ? 6000 : 3500);
    },
    [dismiss],
  );

  const api = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6 md:right-6 md:left-auto md:items-end"
      >
        {toasts.map((t) => {
          const Icon = t.kind === 'success' ? CheckCircle2 : t.kind === 'error' ? AlertTriangle : Info;
          return (
            <div
              key={t.id}
              role={t.kind === 'error' ? 'alert' : 'status'}
              className="pointer-events-auto flex w-full max-w-sm animate-slide-up items-center gap-3 rounded-xl border border-line bg-surface/95 px-4 py-3 text-sm shadow-card backdrop-blur"
            >
              <Icon
                className={cn(
                  'h-5 w-5 shrink-0',
                  t.kind === 'success' && 'text-emerald-500',
                  t.kind === 'info' && 'text-electric-500',
                  t.kind === 'error' && 'text-red-500',
                )}
                aria-hidden
              />
              <span className="flex-1">{t.message}</span>
              {t.action && (
                <button
                  type="button"
                  className="rounded-md px-2 py-1 font-semibold text-brand-500 hover:bg-brand-500/10"
                  onClick={() => {
                    t.action!.onClick();
                    dismiss(t.id);
                  }}
                >
                  {t.action.label}
                </button>
              )}
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="rounded-md p-1 text-muted hover:bg-elevated hover:text-fg"
                aria-label="Fermer la notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast doit être utilisé dans ToastProvider');
  return ctx;
}
