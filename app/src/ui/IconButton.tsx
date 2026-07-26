import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/ui/cn";

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> {
  /** Etichetta accessibile: obbligatoria, non c'è testo visibile. */
  label: string;
  size?: "sm" | "md";
}

const sizes = { sm: "h-8 w-8", md: "h-10 w-10" } as const;

/**
 * Bottone di sola icona. `label` diventa `aria-label`. Raggio pill come `Button`:
 * i controlli hanno una forma sola, e dentro i contenitori pill (cluster della
 * TopBar) l'anello di focus segue il contenitore invece di tagliarne gli angoli.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { label, size = "md", className, type = "button", title, children, ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        title={title ?? label}
        className={cn(
          "inline-flex items-center justify-center rounded-pill text-muted",
          "transition-[background-color,color,transform] duration-[var(--dur-fast)] ease-out",
          "hover:bg-raised hover:text-ink active:translate-y-px",
          "aria-pressed:bg-primary-wash aria-pressed:text-primary",
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
