import type { Location } from "@/data/types";
import { LOCATIONS, LOCATION_LABEL } from "@/domain/presence";
import { useSettingsStore } from "@/store/settings";
import { Field, Input, Segmented } from "@/ui";
import { SettingsSection } from "@/features/settings/SettingsSection";

const LOCATION_OPTIONS = LOCATIONS.map((id) => ({
  id,
  label: LOCATION_LABEL[id],
}));

const toPct = (v: string) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));

/** Tracciamento presenze: attivazione e obiettivi percentuali. */
export function PresenceSettings() {
  const settings = useSettingsStore((s) => s.settings);
  const saveSettings = useSettingsStore((s) => s.saveSettings);
  const presence = settings.presenceTracking;
  const setPresence = (patch: Partial<typeof presence>) =>
    void saveSettings({
      ...settings,
      presenceTracking: { ...presence, ...patch },
    });
  const setDefaultLocation = (defaultLocation: Location) =>
    void saveSettings({ ...settings, defaultLocation });

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Presenze"
        description="Tieni traccia di dove lavori ogni giorno (remoto, ufficio, cliente) e confronta la ripartizione con i tuoi obiettivi. Quando è attivo, scegli la sede nel pannello del Giorno e nelle intestazioni della Settimana; il Riepilogo mostra le quote del periodo."
      >
        <Segmented
          label="Tracciamento presenze"
          value={presence.enabled ? "on" : "off"}
          onChange={(id) => setPresence({ enabled: id === "on" })}
          options={[
            { id: "on", label: "Attivo" },
            { id: "off", label: "Disattivo" },
          ]}
        />
        {presence.enabled && (
          <>
            <Field label="Sede predefinita">
              <Segmented
                label="Sede predefinita"
                value={settings.defaultLocation}
                onChange={setDefaultLocation}
                options={LOCATION_OPTIONS}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Obiettivo ufficio (%)">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={presence.officeTargetPct}
                  onChange={(e) =>
                    setPresence({ officeTargetPct: toPct(e.target.value) })
                  }
                />
              </Field>
              <Field label="Obiettivo cliente (%)">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={presence.clientTargetPct}
                  onChange={(e) =>
                    setPresence({ clientTargetPct: toPct(e.target.value) })
                  }
                />
              </Field>
            </div>
          </>
        )}
      </SettingsSection>
    </div>
  );
}
