import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/ui/cn";
import { IconButton } from "@/ui/IconButton";
import { IconClose } from "@/ui/icons";

export type ModalSize = "sm" | "md" | "lg";
/**
 * `center`: overlay centrato. `sheet`: pannello a tutta altezza da destra.
 * `full`: a tutto schermo — pannello-superficie che galleggia sul fondo tinto.
 */
export type ModalVariant = "center" | "sheet" | "full";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Nome accessibile del dialog; reso come h2 se non si usa `header`. */
  title?: string;
  /** Contenuto dell'intestazione al posto del titolo (resta la X di chiusura). */
  header?: ReactNode;
  /** Riga di contesto sotto il titolo (es. quando/dove). */
  description?: ReactNode;
  children: ReactNode;
  /** Barra azioni ancorata in basso: resta visibile mentre il corpo scorre. */
  footer?: ReactNode;
  size?: ModalSize;
  variant?: ModalVariant;
  className?: string;
}

const centerWidths: Record<ModalSize, string> = {
  sm: "w-[min(30rem,calc(100vw-2rem))]",
  md: "w-[min(34rem,calc(100vw-2rem))]",
  lg: "w-[min(40rem,calc(100vw-2rem))]",
};

const sheetWidths: Record<ModalSize, string> = {
  sm: "w-[min(26rem,100vw)]",
  md: "w-[min(30rem,100vw)]",
  lg: "w-[min(34rem,100vw)]",
};

/**
 * Modale su `<dialog>` nativo: niente clipping da overflow, focus-trap ed Esc
 * gestiti dal browser. Chiusura anche da bottone e click sul backdrop.
 *
 * Struttura: intestazione e `footer` restano ancorati; solo il corpo scorre,
 * con altezza limitata al viewport — le azioni non spariscono mai sotto lo scroll.
 * `variant="sheet"` → pannello laterale; `variant="full"` → a tutto schermo, con
 * il contenuto in un pannello arrotondato che galleggia sul fondo tinto.
 */
export function Modal({
  open,
  onClose,
  title,
  header,
  description,
  children,
  footer,
  size = "md",
  variant = "center",
  className,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const sheet = variant === "sheet";
  const full = variant === "full";

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
      data-variant={variant}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // click sul backdrop / fondo
      }}
      className={cn(
        "z-modal border-0 text-ink",
        sheet &&
          cn(
            "fixed inset-y-0 right-0 m-0 h-[100dvh] max-h-[100dvh] bg-transparent p-0",
            sheetWidths[size],
          ),
        // full: il <dialog> è il fondo tinto a tutto schermo; il pannello bianco
        // ci galleggia sopra con un margine (identità figura/sfondo dell'app).
        full &&
          "fixed inset-0 m-0 h-[100dvh] max-h-[100dvh] w-screen max-w-none bg-bg p-4 sm:p-6",
        !sheet &&
          !full &&
          cn("m-auto max-h-[calc(100dvh-2rem)] bg-transparent p-0", centerWidths[size]),
      )}
    >
      {open && (
        <div
          className={cn(
            "flex flex-col overflow-hidden bg-surface text-ink",
            sheet && "animate-sheet-in h-full border-l border-line shadow-lg",
            full &&
              "animate-fade-in mx-auto h-full w-full max-w-5xl rounded-xl border border-line shadow-lg",
            !sheet &&
              !full &&
              "animate-modal-in max-h-[calc(100dvh-2rem)] rounded-xl border border-line shadow-lg",
          )}
        >
          {(title || header) && (
            <header
              className={cn(
                "flex items-start justify-between gap-4 px-6 pb-4 pt-5",
                full && "border-b border-line",
              )}
            >
              {header ?? (
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-semibold tracking-tight">
                    {title}
                  </h2>
                  {description && (
                    <p className="mt-0.5 text-sm text-muted">{description}</p>
                  )}
                </div>
              )}
              <IconButton
                label="Chiudi"
                size="sm"
                className="-mr-1 shrink-0"
                onClick={onClose}
              >
                <IconClose size={18} />
              </IconButton>
            </header>
          )}
          <div
            className={cn(
              "min-h-0 flex-1 overflow-y-auto px-6",
              full ? "pt-6" : title ? "pt-1" : "pt-6",
              footer ? "pb-5" : "pb-6",
              className,
            )}
          >
            {children}
          </div>
          {footer && (
            <footer className="border-t border-line px-6 py-4">{footer}</footer>
          )}
        </div>
      )}
    </dialog>
  );
}
