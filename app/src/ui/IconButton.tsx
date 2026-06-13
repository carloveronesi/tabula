import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/ui/cn";

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> {
  /** Etichetta accessibile: obbligatoria, non c'è testo visibile. */
  label: string;
  size?: "sm" | "md";
}

const sizes = { sm: "h-7 w-7", md: "h-9 w-9" } as const;

/** Bottone di sola icona. `label` diventa `aria-label`. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { label, size = "md", className, type = "button", children, ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        className={cn(
          "inline-flex items-center justify-center rounded text-muted",
          "transition-colors duration-[var(--dur-fast)] ease-out",
          "hover:bg-raised hover:text-ink",
          "disabled:opacity-50 disabled:pointer-events-none",
          sizes[size],
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    );
  },
);
