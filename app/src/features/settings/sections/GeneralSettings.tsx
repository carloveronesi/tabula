import type { Settings } from "@/data/types";
import { useSettingsStore } from "@/store/settings";
import { Segmented } from "@/ui";
import { SettingsSection } from "@/features/settings/SettingsSection";

const VIEW_OPTIONS: { id: Settings["defaultView"]; label: string }[] = [
  { id: "day", label: "Giorno" },
  { id: "week", label: "Settimana" },
  { id: "month", label: "Mese" },
  { id: "projects", label: "Progetti" },
  { id: "todo", label: "Todo" },
];

/** Impostazioni generali: tema, vista iniziale, granularità del calendario. */
export function GeneralSettings() {
  const settings = useSettingsStore((s) => s.settings);
  const saveSettings = useSettingsStore((s) => s.saveSettings);
  const save = (patch: Partial<Settings>) =>
    void saveSettings({ ...settings, ...patch });

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Tema"
        description="Chiaro, scuro o in base alle preferenze del sistema."
      >
        <Segmented
          label="Tema"
          value={settings.theme}
          onChange={(theme) => save({ theme })}
          options={[
            { id: "light", label: "Chiaro" },
            { id: "dark", label: "Scuro" },
            { id: "system", label: "Sistema" },
          ]}
        />
      </SettingsSection>

      <SettingsSection
        title="Vista iniziale"
        description="La sezione mostrata all'apertura dell'app."
      >
        <Segmented
          label="Vista iniziale"
          value={settings.defaultView}
          onChange={(defaultView) => save({ defaultView })}
          options={VIEW_OPTIONS}
        />
      </SettingsSection>

      <SettingsSection
        title="Granularità calendario"
        description="La dimensione dei blocchi e lo scatto del trascinamento. A 15 min puoi usare orari come 10:15 o 10:45."
      >
        <Segmented
          label="Granularità calendario"
          value={String(settings.slotMinutes)}
          onChange={(id) => save({ slotMinutes: id === "15" ? 15 : 30 })}
          options={[
            { id: "15", label: "15 min" },
            { id: "30", label: "30 min" },
          ]}
        />
      </SettingsSection>
    </div>
  );
}
