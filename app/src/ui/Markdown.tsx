import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/ui/cn";

export interface MarkdownProps {
  children: string;
  className?: string;
}

/**
 * Rendering di testo Markdown (GFM) con lo stile editoriale dei token (.md in
 * index.css). I link si aprono in una nuova scheda. Nessun HTML grezzo
 * (react-markdown lo ignora di default): sicuro per contenuti dell'utente.
 */
export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div className={cn("md", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a({ node: _node, ...props }) {
            return <a target="_blank" rel="noreferrer" {...props} />;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
