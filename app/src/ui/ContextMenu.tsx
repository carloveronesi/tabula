import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/ui/cn";

export interface ContextMenuItem {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
}

interface ContextMenuProps {
  /** Coordinate viewport del menu, o `null` quando è chiuso. */
  at: { x: number; y: number } | null;
  items: ContextMenuItem[];
  onClose: () => void;
}

const MARGIN = 8;

/**
 * Menu contestuale leggero ancorato a un punto (es. click destro sulla griglia).
 * Si chiude con Escape, click fuori, scroll o ridimensionamento; porta il focus
 * sulla prima voce attiva. Reso in un portale così non eredita overflow/transform
 * del contenitore. Niente sotto-menu: una lista piatta di azioni.
 */
export function ContextMenu({ at, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(at);

  // Riallinea il punto quando cambia l'ancora; il clamp ai bordi avviene dopo
  // la misura reale del menu (useLayoutEffect).
  useEffect(() => setPos(at), [at]);

  useLayoutEffect(() => {
    if (!at || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = Math.min(at.x, window.innerWidth - rect.width - MARGIN);
    const y = Math.min(at.y, window.innerHeight - rect.height - MARGIN);
    setPos({ x: Math.max(MARGIN, x), y: Math.max(MARGIN, y) });
    ref.current.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
  }, [at]);

  useEffect(() => {
    if (!at) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer, true);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer, true);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
    };
  }, [at, onClose]);

  if (!at || !pos) return null;

  const style: CSSProperties = { position: "fixed", top: pos.y, left: pos.x };

  return createPortal(
    <div
      ref={ref}
      role="menu"
      style={style}
      className="z-50 min-w-[176px] rounded-lg border border-line bg-surface py-1 shadow-card"
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          disabled={item.disabled}
          onClick={() => {
            onClose();
            item.onSelect();
          }}
          className={cn(
            "flex w-full items-center px-3 py-1.5 text-left text-[13px] text-ink",
            "transition-colors duration-[var(--dur-fast)] ease-out",
            item.disabled
              ? "cursor-not-allowed text-faint"
              : "hover:bg-raised focus:bg-raised focus:outline-none",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>,
    document.body,
  );
}
