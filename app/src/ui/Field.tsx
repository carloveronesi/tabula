import type { ReactNode } from "react";
import { cn } from "@/ui/cn";

export interface FieldProps {
  label: string;
  children: ReactNode;
  className?: string;
}

/**
 * Etichetta + controllo impilati. Non è un `<label>` (i controlli compositi
 * come Combobox/Segmented portano la propria semantica ARIA).
 */
export function Field({ label, children, className }: FieldProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <span className="block text-xs font-medium text-muted">{label}</span>
      {children}
    </div>
  );
}
