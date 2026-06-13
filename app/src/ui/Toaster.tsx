import { useEffect } from "react";
import { cn } from "@/ui/cn";
import { useToastStore, type Toast } from "@/store/toast";

const AUTO_DISMISS_MS = 5000;

/** Singolo toast: messaggio + eventuale azione, con auto-dismiss temporizzato. */
function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    const t = setTimeout(() => dismiss(toast.id), AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [toast.id, dismiss]);

  return (
    <div
      className={cn(
        "pointer-events-auto flex items-center gap-3 rounded-lg border px-3.5 py-2.5 shadow-lg",
        "border-line bg-surface text-sm text-ink",
        toast.variant === "danger" && "border-danger/40",
      )}
    >
      {toast.variant === "danger" && (
        <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-danger" />
      )}
      <span className="flex-1">{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          className="rounded font-medium text-accent hover:underline underline-offset-2"
          onClick={() => {
            toast.action!.run();
            dismiss(toast.id);
          }}
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        aria-label="Chiudi notifica"
        title="Chiudi"
        className="text-muted hover:text-ink"
        onClick={() => dismiss(toast.id)}
      >
        ×
      </button>
    </div>
  );
}

/**
 * Regione delle notifiche effimere (in basso a destra). `aria-live="polite"` per
 * annunciarle agli screen reader senza interrompere. Vuota = nessun nodo visibile.
 */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-toast flex flex-col items-center gap-2 p-4 sm:items-end"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
