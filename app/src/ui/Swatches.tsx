import { PALETTE } from "@/domain/colors";
import { cn } from "@/ui/cn";

/**
 * Selettore colore dalla palette. `value` è il colore scelto (o `null` per
 * "automatico"); se `onClear` è fornito compare un'opzione "Auto" che riporta
 * al colore deterministico.
 */
export function Swatches({
  value,
  onPick,
  onClear,
}: {
  value: string | null;
  onPick: (color: string) => void;
  onClear?: () => void;
}) {
  const v = value?.toLowerCase() ?? null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {onClear && (
        <button
          type="button"
          aria-label="Colore automatico"
          aria-pressed={v === null}
          onClick={onClear}
          className={cn(
            "h-6 rounded-full px-2.5 text-xs font-medium ring-offset-2 ring-offset-surface transition-[box-shadow]",
            v === null
              ? "ring-2 ring-ink text-ink"
              : "ring-1 ring-line text-muted hover:ring-line-strong",
          )}
        >
          Auto
        </button>
      )}
      {PALETTE.map((c) => {
        const active = c.toLowerCase() === v;
        return (
          <button
            key={c}
            type="button"
            aria-label={`Colore ${c}`}
            aria-pressed={active}
            onClick={() => onPick(c)}
            style={{ backgroundColor: c }}
            className={cn(
              "h-6 w-6 rounded-full ring-offset-2 ring-offset-surface transition-[box-shadow]",
              active ? "ring-2 ring-ink" : "ring-1 ring-line hover:ring-line-strong",
            )}
          />
        );
      })}
    </div>
  );
}
