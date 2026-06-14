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
        "w-full rounded-lg border border-line bg-bg px-3.5 py-2.5 text-sm text-ink",
        "transition-[border-color,box-shadow] duration-[var(--dur-fast)] ease-out",
        "placeholder:text-faint focus:border-primary focus:outline-none",
        "focus:shadow-[0_0_0_3px_var(--accent-wash)]",
        className,
      )}
      {...rest}
    />
  );
});
