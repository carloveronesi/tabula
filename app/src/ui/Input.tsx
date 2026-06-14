import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/ui/cn";

const inputClasses =
  "h-10 w-full rounded-lg border border-line bg-bg px-3.5 text-sm text-ink " +
  "transition-[border-color,box-shadow] duration-[var(--dur-fast)] ease-out " +
  "placeholder:text-faint focus:border-primary focus:outline-none " +
  "focus:shadow-[0_0_0_3px_var(--accent-wash)]";

/** Input di testo del design system. */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, type = "text", ...rest }, ref) {
    return (
      <input ref={ref} type={type} className={cn(inputClasses, className)} {...rest} />
    );
  },
);

export { inputClasses };
