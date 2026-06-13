import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Rendering vero del Markdown. Isolato in un modulo a sé così che
 * react-markdown/remark-gfm finiscano in un chunk separato, caricato in lazy
 * solo quando si mostra del Markdown (vedi Markdown.tsx). Default export per
 * `React.lazy`.
 */
export default function MarkdownRender({ children }: { children: string }) {
  return (
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
  );
}
