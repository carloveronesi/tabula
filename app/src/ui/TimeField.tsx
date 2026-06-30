import { useEffect, useRef, useState } from "react";
import { cn } from "@/ui/cn";
import { formatTime, parseTimeInput, snap, stepTime } from "@/domain/timeField";
import { IconChevronUp, IconChevronDown } from "@/ui/icons";

export interface TimeFieldProps {
  /** Etichetta accessibile del campo. */
  label: string;
  /** Valore in minuti dalla mezzanotte. */
  value: number;
  onChange: (minutes: number) => void;
  /** Granularità in minuti (step degli stepper e snap). */
  step?: number;
}

/**
 * Campo orario senza dropdown: testo digitabile ("9", "9:30", "930") che fa snap
 * alla granularità, più stepper ▲▼ e frecce ↑/↓ per regolare di `step` minuti.
 * Emette i minuti dalla mezzanotte. Sostituisce il nativo `type="time"`.
 */
export function TimeField({ label, value, onChange, step = 30 }: TimeFieldProps) {
  const [text, setText] = useState(() => formatTime(value));
  const [focused, setFocused] = useState(false);

  // Mentre non si digita, il testo segue il valore esterno (drag, step, ecc.).
  useEffect(() => {
    if (!focused) setText(formatTime(value));
  }, [value, focused]);

  const commit = (raw: string) => {
    const parsed = parseTimeInput(raw);
    const next = parsed === null ? value : snap(parsed, step);
    onChange(next);
    setText(formatTime(next));
  };

  const bump = (dir: 1 | -1) => {
    const next = stepTime(value, dir, step);
    onChange(next);
    setText(formatTime(next));
  };

  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className={cn(
        "flex h-10 items-stretch overflow-hidden rounded border border-line bg-bg",
        "transition-[border-color,box-shadow] duration-[var(--dur-fast)] ease-out",
        "focus-within:border-primary focus-within:shadow-[0_0_0_3px_var(--accent-wash)]",
      )}
    >
      <input
        ref={inputRef}
        aria-label={label}
        inputMode="numeric"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={(e) => {
          setFocused(true);
          e.target.select();
        }}
        onBlur={(e) => {
          setFocused(false);
          commit(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") {
            e.preventDefault();
            bump(1);
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            bump(-1);
          } else if (e.key === "Enter") {
            e.preventDefault();
            commit((e.target as HTMLInputElement).value);
          }
        }}
        className="tnum w-full min-w-0 bg-transparent px-3.5 text-center text-sm text-ink outline-none"
      />
      <div className="flex flex-col border-l border-line">
        <button
          type="button"
          tabIndex={-1}
          aria-label={`${label}: aumenta`}
          onClick={() => bump(1)}
          className="flex flex-1 items-center justify-center px-1.5 text-muted transition-colors duration-[var(--dur-fast)] hover:bg-raised hover:text-ink"
        >
          <IconChevronUp size={14} />
        </button>
        <button
          type="button"
          tabIndex={-1}
          aria-label={`${label}: diminuisci`}
          onClick={() => bump(-1)}
          className="flex flex-1 items-center justify-center border-t border-line px-1.5 text-muted transition-colors duration-[var(--dur-fast)] hover:bg-raised hover:text-ink"
        >
          <IconChevronDown size={14} />
        </button>
      </div>
    </div>
  );
}
