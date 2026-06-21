import type { Location } from "@/data/types";
import { LOCATIONS, LOCATION_LABEL } from "@/domain/presence";
import { IconHome, IconBuilding, IconBriefcase } from "@/ui/icons";
import { cn } from "@/ui/cn";

const LOCATION_ICON: Record<Location, typeof IconHome> = {
  remote: IconHome,
  office: IconBuilding,
  client: IconBriefcase,
};

interface DayLocationPickerProps {
  value: Location | null;
  onChange: (location: Location | null) => void;
  /** `full` → etichette (pannello Giorno); `compact` → iniziali (Settimana). */
  variant?: "full" | "compact";
  /** Giorno per l'aria-label del gruppo (es. "Lun 16"). */
  dayLabel?: string;
  /** Sede predefinita: evidenziata come suggerimento quando nulla è impostato. */
  suggested?: Location | null;
}

/**
 * Sede di una giornata (remoto/ufficio/cliente). Selezione esclusiva con
 * ri-click sulla sede attiva per azzerarla. La variante compatta usa le
 * iniziali per stare nelle intestazioni di colonna della Settimana.
 */
export function DayLocationPicker({
  value,
  onChange,
  variant = "full",
  dayLabel,
  suggested = null,
}: DayLocationPickerProps) {
  const compact = variant === "compact";
  return (
    <div
      role="group"
      aria-label={dayLabel ? `Sede di ${dayLabel}` : "Sede del giorno"}
      className={cn(
        "border border-line bg-bg",
        compact
          ? "inline-flex gap-px rounded-pill p-0.5"
          : "flex w-full gap-1 rounded-xl p-1",
      )}
    >
      {LOCATIONS.map((loc) => {
        const active = loc === value;
        const isSuggested = value === null && suggested === loc;
        const Icon = LOCATION_ICON[loc];
        return (
          <button
            key={loc}
            type="button"
            aria-pressed={active}
            aria-label={
              isSuggested
                ? `${LOCATION_LABEL[loc]} (predefinita)`
                : LOCATION_LABEL[loc]
            }
            title={
              isSuggested
                ? `${LOCATION_LABEL[loc]} (predefinita)`
                : LOCATION_LABEL[loc]
            }
            onClick={() => onChange(active ? null : loc)}
            className={cn(
              "inline-flex items-center justify-center font-medium",
              "transition-[background-color,color,box-shadow] duration-[var(--dur-fast)] ease-out",
              compact
                ? "h-6 w-6 rounded-pill"
                : "flex-1 flex-col gap-1.5 rounded-lg py-2.5 text-[11px]",
              active
                ? compact
                  ? "bg-accent-wash text-accent shadow-sm"
                  : "bg-surface text-ink shadow-sm"
                : isSuggested
                  ? "text-accent/70 ring-1 ring-inset ring-accent/30"
                  : "text-muted hover:text-ink",
            )}
          >
            <Icon size={compact ? 14 : 17} />
            {!compact && LOCATION_LABEL[loc]}
          </button>
        );
      })}
    </div>
  );
}
