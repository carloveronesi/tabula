import type { Settings } from "@/data/types";
import { useSettingsStore } from "@/store/settings";
import { Button, Field, Input, TimeField, cn } from "@/ui";
import { SettingsSection } from "@/features/settings/SettingsSection";

const DAY_NAMES = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const pad2 = (n: number) => String(n).padStart(2, "0");
const clamp = (v: string, max: number) =>
  Math.max(0, Math.min(max, Math.round(Number(v) || 0)));

/** Orario di lavoro: fasce orarie, giorni lavorativi, giorno del patrono. */
export function ScheduleSettings() {
  const settings = useSettingsStore((s) => s.settings);
  const saveSettings = useSettingsStore((s) => s.saveSettings);
  const save = (patch: Partial<Settings>) =>
    void saveSettings({ ...settings, ...patch });

  const wh = settings.workHours;
  const setWh = (patch: Partial<Settings["workHours"]>) =>
    save({ workHours: { ...wh, ...patch } });

  const toggleDay = (i: number) => {
    const has = settings.workingDays.includes(i);
    save({
      workingDays: has
        ? settings.workingDays.filter((d) => d !== i)
        : [...settings.workingDays, i].sort((a, b) => a - b),
    });
  };

  const [pm, pd] = settings.patronDay
    ? settings.patronDay.split("-").map(Number)
    : [0, 0];
  const setPatron = (month: number, day: number) =>
    save({
      patronDay:
        month >= 1 && month <= 12 && day >= 1 && day <= 31
          ? `${pad2(month)}-${pad2(day)}`
          : "",
    });

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Fasce orarie"
        description="Gli estremi della giornata mostrata nel calendario, divisi tra mattina e pomeriggio (la pausa è lo spazio tra le due)."
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Mattina — inizio">
            <TimeField
              label="Mattina — inizio"
              value={wh.morningStart}
              step={settings.slotMinutes}
              onChange={(morningStart) => setWh({ morningStart })}
            />
          </Field>
          <Field label="Mattina — fine">
            <TimeField
              label="Mattina — fine"
              value={wh.morningEnd}
              step={settings.slotMinutes}
              onChange={(morningEnd) => setWh({ morningEnd })}
            />
          </Field>
          <Field label="Pomeriggio — inizio">
            <TimeField
              label="Pomeriggio — inizio"
              value={wh.afternoonStart}
              step={settings.slotMinutes}
              onChange={(afternoonStart) => setWh({ afternoonStart })}
            />
          </Field>
          <Field label="Pomeriggio — fine">
            <TimeField
              label="Pomeriggio — fine"
              value={wh.afternoonEnd}
              step={settings.slotMinutes}
              onChange={(afternoonEnd) => setWh({ afternoonEnd })}
            />
          </Field>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Giorni lavorativi"
        description="I giorni mostrati come colonne nella vista Settimana."
      >
        <div
          role="group"
          aria-label="Giorni lavorativi"
          className="flex flex-wrap gap-1.5"
        >
          {DAY_NAMES.map((name, i) => {
            const active = settings.workingDays.includes(i);
            return (
              <button
                key={name}
                type="button"
                aria-pressed={active}
                onClick={() => toggleDay(i)}
                className={cn(
                  "h-9 w-12 rounded-lg border text-sm font-medium",
                  "transition-[background-color,color,border-color] duration-[var(--dur-fast)] ease-out",
                  active
                    ? "border-accent bg-accent-wash text-accent"
                    : "border-line text-muted hover:bg-raised hover:text-ink",
                )}
              >
                {name}
              </button>
            );
          })}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Giorno del patrono"
        description="Una festività locale ricorrente: viene mostrata come festivo nel calendario, come un fine settimana."
      >
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Mese">
            <Input
              type="number"
              min={1}
              max={12}
              className="w-24"
              value={pm || ""}
              placeholder="MM"
              onChange={(e) => setPatron(clamp(e.target.value, 12), pd)}
            />
          </Field>
          <Field label="Giorno">
            <Input
              type="number"
              min={1}
              max={31}
              className="w-24"
              value={pd || ""}
              placeholder="GG"
              onChange={(e) => setPatron(pm, clamp(e.target.value, 31))}
            />
          </Field>
          {settings.patronDay && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => save({ patronDay: "" })}
            >
              Rimuovi
            </Button>
          )}
        </div>
      </SettingsSection>
    </div>
  );
}
