import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/ui/cn";

const inputClasses =
  "h-9 w-full rounded border border-line bg-bg px-3 text-sm text-ink " +
  "placeholder:text-faint focus:border-primary focus:outline-none";

/** Input di testo del design system. */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, type = "text", ...rest }, ref) {
    return (
      <input ref={ref} type={type} className={cn(inputClasses, className)} {...rest} />
    );
  },
);

export { inputClasses };
