import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/ui/cn";

export type ButtonVariant = "primary" | "subtle" | "ghost" | "danger" | "accent";
export type ButtonSize = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-pill font-medium " +
  "transition-[background-color,box-shadow,border-color,transform,color] " +
  "duration-[var(--dur-fast)] ease-out select-none active:translate-y-px " +
  "disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-ink shadow-[var(--shadow-primary)] hover:bg-primary-hover",
  subtle:
    "border border-line bg-surface text-ink shadow-sm hover:bg-raised hover:border-line-strong",
  // Accento senza fill: si stacca dal resto senza competere con `primary`, che
  // in una barra d'azioni resta l'azione conclusiva (Salva).
  accent:
    "border border-primary bg-primary-wash text-accent shadow-sm hover:border-accent-hover hover:text-accent-hover",
  ghost: "text-muted hover:bg-raised hover:text-ink",
  danger: "bg-danger text-primary-ink shadow-sm hover:opacity-90",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3.5 text-xs",
  md: "h-10 px-5 text-sm",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/** Bottone base del design system. Default `subtle`/`md`, `type=button`. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "subtle", size = "md", className, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      data-variant={variant}
      className={cn(base, variants[variant], sizes[size], className)}
      {...rest}
    />
  );
});
