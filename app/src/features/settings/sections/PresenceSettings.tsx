import type { Location } from "@/data/types";
import { LOCATIONS, LOCATION_LABEL } from "@/domain/presence";
import { useSettingsStore } from "@/store/settings";
import { Field, Input, Segmented, cn } from "@/ui";
import { SettingsSection } from "@/features/settings/SettingsSection";

const LOCATION_OPTIONS = LOCATIONS.map((id) => ({
  id,
  label: LOCATION_LABEL[id],
}));

const DAY_NAMES = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

const toPct = (v: string) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));

/** Tracciamento presenze: attivazione e obiettivo percentuale. */
export function PresenceSettings() {
  const settings = useSettingsStore((s) => s.settings);
  const saveSettings = useSettingsStore((s) => s.saveSettings);
  const presence = settings.presenceTracking;
  const setPresence = (patch: Partial<typeof presence>) =>
    void saveSettings({
      ...settings,
      presenceTracking: { ...presence, ...patch },
    });
  const togglePreferred = (i: number) =>
    setPresence({
      preferredDays: presence.preferredDays.includes(i)
        ? presence.preferredDays.filter((d) => d !== i)
        : [...presence.preferredDays, i].sort((a, b) => a - b),
    });
  const setDefaultLocation = (defaultLocation: Location) =>
    void saveSettings({ ...settings, defaultLocation });

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Presenze"
        description="Tieni traccia di dove lavori ogni giorno (remoto, ufficio, cliente) e confronta i giorni in presenza con il tuo obiettivo. Quando è attivo, scegli la sede nel pannello del Giorno e nelle intestazioni della Settimana; il Mese mostra quanti giorni in presenza servono e quanti ne mancano."
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
            <Field label="Obiettivo presenza (%)" className="max-w-xs">
              <Input
                type="number"
                min={0}
                max={100}
                value={presence.targetPct}
                onChange={(e) => setPresence({ targetPct: toPct(e.target.value) })}
              />
              <p className="text-xs text-muted">
                Quota minima di giorni lavorativi in ufficio o dal cliente; le
                ferie non contano. 0 = nessun obiettivo.
              </p>
            </Field>
            <Field label="Giorni preferiti in presenza">
              <div
                role="group"
                aria-label="Giorni preferiti in presenza"
                className="flex flex-wrap gap-1.5"
              >
                {settings.workingDays.map((i) => {
                  const active = presence.preferredDays.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      aria-pressed={active}
                      onClick={() => togglePreferred(i)}
                      className={cn(
                        "h-9 w-12 rounded-lg border text-sm font-medium",
                        "transition-[background-color,color,border-color] duration-[var(--dur-fast)] ease-out",
                        active
                          ? "border-primary bg-primary-wash text-primary"
                          : "border-line text-muted hover:bg-raised hover:text-ink",
                      )}
                    >
                      {DAY_NAMES[i]}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted">
                Nel Mese, «Pianifica» propone questi giorni fino a coprire
                l'obiettivo.
              </p>
            </Field>
          </>
        )}
      </SettingsSection>
    </div>
  );
}
