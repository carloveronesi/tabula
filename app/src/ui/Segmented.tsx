import { cn } from "@/ui/cn";

export interface SegmentedOption<T extends string> {
  id: T;
  label: string;
}

export interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (id: T) => void;
  label?: string;
}

/**
 * Controllo a segmenti per selezione esclusiva (es. switch vista). I segmenti
 * sono bottoni con `aria-pressed`; l'attivo è rialzato su `--raised`.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: SegmentedProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex gap-0.5 rounded-lg border border-line bg-surface p-0.5"
    >
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.id)}
            className={cn(
              "h-7 rounded px-3 text-xs font-medium",
              "transition-colors duration-[var(--dur-fast)] ease-out",
              active
                ? "bg-raised text-ink shadow-sm"
                : "text-muted hover:text-ink",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
