import { useState, type ComponentType } from "react";
import { cn } from "@/ui";
import {
  IconSettings,
  IconClock,
  IconBuilding,
  IconTag,
  IconDatabase,
} from "@/ui/icons";
import { GeneralSettings } from "@/features/settings/sections/GeneralSettings";
import { ScheduleSettings } from "@/features/settings/sections/ScheduleSettings";
import { PresenceSettings } from "@/features/settings/sections/PresenceSettings";
import { CategoriesSettings } from "@/features/settings/sections/CategoriesSettings";
import { DataSettings } from "@/features/settings/sections/DataSettings";

type SectionId =
  | "general"
  | "schedule"
  | "presence"
  | "categories"
  | "data";

const SECTIONS: {
  id: SectionId;
  label: string;
  Icon: ComponentType<{ size?: number }>;
}[] = [
  { id: "general", label: "Generale", Icon: IconSettings },
  { id: "schedule", label: "Orario di lavoro", Icon: IconClock },
  { id: "presence", label: "Presenze", Icon: IconBuilding },
  { id: "categories", label: "Categorie & colori", Icon: IconTag },
  { id: "data", label: "Dati", Icon: IconDatabase },
];

/**
 * Impostazioni dell'app, divise in sezioni con una sotto-nav verticale; solo la
 * sezione attiva è montata. Tutti i dati restano sul dispositivo.
 */
export function SettingsView() {
  const [active, setActive] = useState<SectionId>("general");

  return (
    <div className="mx-auto w-full max-w-3xl">
      <header className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight">Impostazioni</h2>
        <p className="mt-1 text-sm text-muted">
          Tutto resta sul tuo dispositivo: nessun dato lascia il browser.
        </p>
      </header>

      <div className="flex flex-col gap-6 sm:flex-row">
        <nav
          aria-label="Sezioni impostazioni"
          className="flex flex-row gap-0.5 overflow-x-auto sm:w-44 sm:flex-none sm:flex-col"
        >
          {SECTIONS.map((s) => {
            const isActive = s.id === active;
            return (
              <button
                key={s.id}
                type="button"
                aria-current={isActive ? "page" : undefined}
                onClick={() => setActive(s.id)}
                className={cn(
                  "flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm",
                  "transition-[background-color,color] duration-[var(--dur-fast)] ease-out",
                  isActive
                    ? "bg-primary-wash font-medium text-accent"
                    : "text-muted hover:bg-raised hover:text-ink",
                )}
              >
                <s.Icon size={16} />
                {s.label}
              </button>
            );
          })}
        </nav>

        <div className="min-w-0 flex-1">
          {active === "general" && <GeneralSettings />}
          {active === "schedule" && <ScheduleSettings />}
          {active === "presence" && <PresenceSettings />}
          {active === "categories" && <CategoriesSettings />}
          {active === "data" && <DataSettings />}
        </div>
      </div>
    </div>
  );
}
