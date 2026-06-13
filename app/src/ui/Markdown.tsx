import { lazy, Suspense } from "react";
import { cn } from "@/ui/cn";

// Chunk separato: react-markdown/remark-gfm sono pesanti e servono solo qui.
const MarkdownRender = lazy(() => import("@/ui/MarkdownRender"));

export interface MarkdownProps {
  children: string;
  className?: string;
}

/**
 * Rendering di testo Markdown (GFM) con lo stile editoriale dei token (.md in
 * index.css). Il renderer è caricato in lazy; nel frattempo si mostra il testo
 * grezzo, così il contenuto è subito visibile senza salti di layout. I link si
 * aprono in una nuova scheda; nessun HTML grezzo (sicuro per contenuti utente).
 */
export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div className={cn("md", className)}>
      <Suspense
        fallback={<div className="whitespace-pre-wrap">{children}</div>}
      >
        <MarkdownRender>{children}</MarkdownRender>
      </Suspense>
    </div>
  );
}
