import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/ui/cn";
import { IconButton } from "@/ui/IconButton";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Modale su `<dialog>` nativo: niente clipping da overflow, focus-trap ed Esc
 * gestiti dal browser. Chiusura anche da bottone e click sul backdrop.
 */
export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      // showModal non è implementato ovunque (jsdom): fallback all'attributo.
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Esc nativo emette "cancel": preveniamo la chiusura implicita e deleghiamo.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    dialog.addEventListener("cancel", onCancel);
    return () => dialog.removeEventListener("cancel", onCancel);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // click sul backdrop
      }}
      className={cn(
        "z-modal m-auto w-[min(32rem,calc(100vw-2rem))] rounded-lg border border-line",
        "bg-surface p-0 text-ink shadow-lg",
      )}
    >
      {open && (
        <div className={cn("p-5", className)}>
          {title && (
            <div className="mb-3 flex items-center justify-between gap-4">
              <h2 className="font-serif text-xl">{title}</h2>
              <IconButton label="Chiudi" size="sm" onClick={onClose}>
                ×
              </IconButton>
            </div>
          )}
          {children}
        </div>
      )}
    </dialog>
  );
}
