import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/ui/cn";
import { inputClasses } from "@/ui/Input";
import { IconChevronDown } from "@/ui/icons";

export interface ComboboxOption {
  id: string;
  label: string;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value: string | null;
  onChange: (id: string) => void;
  /** Se presente, un testo non in elenco può essere creato (riga "Crea …"). */
  onCreate?: (label: string) => void;
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
  onCreate,
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

  const trimmed = query.trim();
  const showCreate =
    !!onCreate &&
    trimmed !== "" &&
    !options.some((o) => o.label.toLowerCase() === trimmed.toLowerCase());
  // Indice della riga "Crea …" nella navigazione da tastiera (dopo i filtrati).
  const createIndex = showCreate ? filtered.length : -1;

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

  function create() {
    onCreate?.(trimmed);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const max = filtered.length - 1 + (showCreate ? 1 : 0);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, max));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      if (open && highlight === createIndex) {
        e.preventDefault();
        create();
      } else if (open && filtered[highlight]) {
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
        className={cn(inputClasses, "pr-9")}
      />
      <IconChevronDown
        size={15}
        aria-hidden
        className={cn(
          "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted",
          "transition-transform duration-[var(--dur-fast)]",
          open && "rotate-180",
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
          {filtered.length === 0 && !showCreate && (
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
          {showCreate && (
            <li
              role="option"
              aria-selected={false}
              onMouseEnter={() => setHighlight(createIndex)}
              onMouseDown={(e) => {
                e.preventDefault();
                create();
              }}
              className={cn(
                "cursor-pointer rounded px-2 py-1.5 text-sm",
                highlight === createIndex ? "bg-raised" : "",
                "text-accent",
              )}
            >
              Crea «{trimmed}»
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
