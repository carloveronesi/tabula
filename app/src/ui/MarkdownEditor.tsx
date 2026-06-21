import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/ui/cn";
import { Markdown } from "@/ui/Markdown";

export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  rows?: number;
  /** Riempie in altezza il contenitore flex (l'area di testo cresce). */
  grow?: boolean;
}

function ToolbarBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      // mousedown preventDefault: non rubare il focus/selezione alla textarea
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="inline-flex h-7 min-w-7 items-center justify-center rounded px-1.5 text-xs text-muted transition-colors duration-[var(--dur-fast)] ease-out hover:bg-raised hover:text-ink"
    >
      {children}
    </button>
  );
}

/**
 * Editor Markdown: textarea con piccola toolbar (grassetto, corsivo, elenco,
 * link) e anteprima resa. Controllato (value/onChange). La logica di formattazione
 * lavora sulla selezione corrente.
 */
export function MarkdownEditor({
  value,
  onChange,
  label,
  placeholder,
  rows = 4,
  grow = false,
}: MarkdownEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);

  function surround(before: string, after: string) {
    const ta = ref.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    const sel = value.slice(s, e);
    onChange(value.slice(0, s) + before + sel + after + value.slice(e));
    queueMicrotask(() => {
      ta.focus();
      ta.selectionStart = s + before.length;
      ta.selectionEnd = e + before.length;
    });
  }

  function prefixLine(prefix: string) {
    const ta = ref.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const lineStart = value.lastIndexOf("\n", s - 1) + 1;
    onChange(value.slice(0, lineStart) + prefix + value.slice(lineStart));
    queueMicrotask(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = s + prefix.length;
    });
  }

  return (
    <div
      className={cn(
        "rounded border border-line bg-bg focus-within:border-primary",
        grow && "flex flex-1 flex-col",
      )}
    >
      <div className="flex items-center gap-0.5 border-b border-line px-1 py-1">
        <ToolbarBtn label="Grassetto" onClick={() => surround("**", "**")}>
          <span className="font-bold">B</span>
        </ToolbarBtn>
        <ToolbarBtn label="Corsivo" onClick={() => surround("*", "*")}>
          <span className="italic">I</span>
        </ToolbarBtn>
        <ToolbarBtn label="Elenco" onClick={() => prefixLine("- ")}>
          ☰
        </ToolbarBtn>
        <ToolbarBtn label="Link" onClick={() => surround("[", "](url)")}>
          ↗
        </ToolbarBtn>
        <button
          type="button"
          onClick={() => setPreview((p) => !p)}
          className="ml-auto rounded px-2 py-1 text-xs text-muted transition-colors duration-[var(--dur-fast)] ease-out hover:bg-raised hover:text-ink"
        >
          {preview ? "Modifica" : "Anteprima"}
        </button>
      </div>

      {preview ? (
        <div className={cn("min-h-[5rem] px-3 py-2", grow && "flex-1")}>
          {value.trim() ? (
            <Markdown>{value}</Markdown>
          ) : (
            <p className="text-sm text-faint">Niente da mostrare.</p>
          )}
        </div>
      ) : (
        <textarea
          ref={ref}
          aria-label={label}
          placeholder={placeholder}
          value={value}
          rows={rows}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full bg-transparent px-3 py-2 text-sm text-ink placeholder:text-faint focus:outline-none",
            grow ? "flex-1 resize-none" : "resize-y",
          )}
        />
      )}
    </div>
  );
}
