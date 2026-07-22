import { Button, Icons } from "@/ui";
import { useAiRewrite } from "@/features/ai/useAiRewrite";

/**
 * Attacca il flusso AI "proponi riscrittura → applica/scarta" a un campo di
 * testo. Inerte (non renderizza nulla) se l'AI non è attiva nei Settings.
 */
export function AiField({
  value,
  systemPrompt,
  onApply,
}: {
  value: string;
  systemPrompt: string;
  onApply: (proposal: string) => void;
}) {
  const { state, run, reset, enabled } = useAiRewrite(systemPrompt);
  if (!enabled) return null;

  return (
    <div className="mt-2 space-y-2">
      {state.status !== "ready" && (
        <Button
          variant="ghost"
          onClick={() => run(value)}
          disabled={state.status === "loading" || value.trim() === ""}
        >
          <Icons.IconSparkles size={16} />
          {state.status === "loading" ? "Sto migliorando…" : "Migliora"}
        </Button>
      )}

      {state.status === "error" && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}

      {state.status === "ready" && (
        <div className="space-y-2 rounded-lg border border-line bg-raised p-3">
          <p className="whitespace-pre-wrap text-sm text-ink">{state.proposal}</p>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              onClick={() => {
                onApply(state.proposal);
                reset();
              }}
            >
              Applica
            </Button>
            <Button variant="ghost" onClick={reset}>
              Scarta
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
