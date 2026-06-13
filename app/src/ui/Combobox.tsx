import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/ui/cn";

export interface ComboboxOption {
  id: string;
  label: string;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value: string | null;
  onChange: (id: string) => void;
  label?: string;
  placeholder?: string;
  emptyText?: string;
}

/**
 * Input filtrabile con lista navigabile da tastiera (↑/↓/Invio/Esc).
 * Ruoli ARIA combobox/listbox/option; base per la cascata cliente→progetto.
 */
export function Combobox({
  options,
  value,
  onChange,
  label,
  placeholder,
  emptyText = "Nessun risultato",
}: ComboboxProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.id === value) ?? null;

  const [query, setQuery] = useState(selected?.label ?? "");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  // Sincronizza il testo quando la selezione cambia dall'esterno.
  useEffect(() => {
    setQuery(selected?.label ?? "");
  }, [selected?.label]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  // Chiude la lista al click fuori.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function select(opt: ComboboxOption) {
    onChange(opt.id);
    setQuery(opt.label);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      if (open && filtered[highlight]) {
        e.preventDefault();
        select(filtered[highlight]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <input
        type="text"
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className={cn(
          "h-9 w-full rounded border border-line bg-bg px-3 text-sm text-ink",
          "placeholder:text-faint",
          "focus:border-primary focus:outline-none",
        )}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          className={cn(
            "absolute z-dropdown mt-1 max-h-60 w-full overflow-auto rounded-lg",
            "border border-line bg-surface p-1 shadow",
          )}
        >
          {filtered.length === 0 && (
            <li className="px-2 py-1.5 text-sm text-muted">{emptyText}</li>
          )}
          {filtered.map((opt, i) => {
            const active = i === highlight;
            const isSelected = opt.id === value;
            return (
              <li
                key={opt.id}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => {
                  e.preventDefault(); // mantiene il focus sull'input
                  select(opt);
                }}
                className={cn(
                  "cursor-pointer rounded px-2 py-1.5 text-sm",
                  active ? "bg-raised text-ink" : "text-ink",
                  isSelected && "font-medium text-primary",
                )}
              >
                {opt.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
