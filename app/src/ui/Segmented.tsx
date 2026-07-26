import { cn } from "@/ui/cn";

export interface SegmentedOption<T extends string> {
  id: T;
  label: string;
  /** Etichetta corta usata sotto `xl` (collasso progressivo). `label` resta
   * l'etichetta accessibile e il tooltip. */
  short?: string;
}

export interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (id: T) => void;
  label?: string;
}

/**
 * Controllo a segmenti per selezione esclusiva (es. switch vista). I segmenti
 * sono bottoni con `aria-pressed`; l'attivo è la chip rialzata su `--surface`,
 * lo stesso idioma di "selezionato" degli altri gruppi (DayLocationPicker).
 * Con `short` i segmenti si accorciano sotto `xl` senza perdere l'etichetta
 * accessibile.
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
      className="inline-flex gap-0.5 rounded-pill border border-line bg-bg p-1"
    >
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={active}
            aria-label={opt.short ? opt.label : undefined}
            title={opt.short ? opt.label : undefined}
            onClick={() => onChange(opt.id)}
            className={cn(
              "h-8 rounded-pill text-xs font-medium",
              opt.short ? "px-2.5 xl:px-3.5" : "px-3.5",
              "transition-[background-color,color,box-shadow] duration-[var(--dur-fast)] ease-out",
              active
                ? "bg-surface text-ink shadow-sm"
                : "text-muted hover:text-ink",
            )}
          >
            {opt.short ? (
              <>
                <span className="hidden xl:inline">{opt.label}</span>
                <span aria-hidden className="xl:hidden">
                  {opt.short}
                </span>
              </>
            ) : (
              opt.label
            )}
          </button>
        );
      })}
    </div>
  );
}
