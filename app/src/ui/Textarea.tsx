import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/ui/cn";

/** Area di testo del design system. */
export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 3, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        "w-full rounded border border-line bg-bg px-3 py-2 text-sm text-ink",
        "placeholder:text-faint focus:border-primary focus:outline-none",
        className,
      )}
      {...rest}
    />
  );
});
