import { nanoid } from "nanoid";
import type { Settings } from "@/data/types";
import { PALETTE, colorFromKey } from "@/domain/colors";
import { useSettingsStore } from "@/store/settings";
import { useInventoryStore } from "@/store/inventory";
import { Button, IconButton, Input, cn } from "@/ui";
import { IconClose, IconPlus } from "@/ui/icons";
import { SettingsSection } from "@/features/settings/SettingsSection";

function Swatches({
  value,
  onPick,
}: {
  value: string;
  onPick: (color: string) => void;
}) {
  const v = value.toLowerCase();
  return (
    <div className="flex flex-wrap gap-1.5">
      {PALETTE.map((c) => {
        const active = c.toLowerCase() === v;
        return (
          <button
            key={c}
            type="button"
            aria-label={`Colore ${c}`}
            aria-pressed={active}
            onClick={() => onPick(c)}
            style={{ backgroundColor: c }}
            className={cn(
              "h-6 w-6 rounded-full ring-offset-2 ring-offset-surface transition-[box-shadow]",
              active
                ? "ring-2 ring-ink"
                : "ring-1 ring-line hover:ring-line-strong",
            )}
          />
        );
      })}
    </div>
  );
}

/** Sottotipi (cliente/interni) e colori per cliente e per sottotipo interno. */
export function CategoriesSettings() {
  const settings = useSettingsStore((s) => s.settings);
  const saveSettings = useSettingsStore((s) => s.saveSettings);
  const clients = useInventoryStore((s) => s.clients);
  const save = (patch: Partial<Settings>) =>
    void saveSettings({ ...settings, ...patch });

  const { client: clientSubs, internal: internalSubs } = settings.subtypes;

  const setClientSubs = (list: { id: string; label: string }[]) =>
    save({ subtypes: { ...settings.subtypes, client: list } });
  const setInternalSubs = (list: { id: string; label: string }[]) =>
    save({ subtypes: { ...settings.subtypes, internal: list } });

  const removeInternal = (id: string) => {
    const internalColors = { ...settings.internalColors };
    delete internalColors[id];
    void saveSettings({
      ...settings,
      subtypes: {
        ...settings.subtypes,
        internal: internalSubs.filter((s) => s.id !== id),
      },
      internalColors,
    });
  };

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Colori clienti"
        description="Il colore con cui i blocchi di ogni cliente appaiono nel calendario."
      >
        {clients.length === 0 ? (
          <p className="text-sm text-muted">
            Nessun cliente: importa i dati o creane uno dall'editor delle attività.
          </p>
        ) : (
          <ul className="space-y-4">
            {clients.map((c) => (
              <li key={c.id} className="space-y-2">
                <span className="text-sm text-ink">{c.name}</span>
                <Swatches
                  value={settings.clientColors[c.id] ?? colorFromKey(c.id)}
                  onPick={(color) =>
                    save({
                      clientColors: { ...settings.clientColors, [c.id]: color },
                    })
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </SettingsSection>

      <SettingsSection
        title="Sottotipi interni"
        description="Le categorie del lavoro interno (non legato a un cliente), ognuna col suo colore."
      >
        {internalSubs.length > 0 && (
          <ul className="space-y-3">
            {internalSubs.map((s) => (
              <li key={s.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    aria-label="Nome sottotipo interno"
                    value={s.label}
                    onChange={(e) =>
                      setInternalSubs(
                        internalSubs.map((x) =>
                          x.id === s.id ? { ...x, label: e.target.value } : x,
                        ),
                      )
                    }
                  />
                  <IconButton
                    label={`Elimina ${s.label}`}
                    size="sm"
                    onClick={() => removeInternal(s.id)}
                  >
                    <IconClose size={16} />
                  </IconButton>
                </div>
                <Swatches
                  value={settings.internalColors[s.id] ?? colorFromKey(s.id)}
                  onPick={(color) =>
                    save({
                      internalColors: {
                        ...settings.internalColors,
                        [s.id]: color,
                      },
                    })
                  }
                />
              </li>
            ))}
          </ul>
        )}
        <Button
          variant="subtle"
          size="sm"
          onClick={() =>
            setInternalSubs([
              ...internalSubs,
              { id: nanoid(), label: "Nuovo sottotipo" },
            ])
          }
        >
          <IconPlus size={15} />
          Aggiungi sottotipo
        </Button>
      </SettingsSection>

      <SettingsSection
        title="Sottotipi cliente"
        description="Le categorie del lavoro su cliente (es. analisi, sviluppo, riunione)."
      >
        {clientSubs.length > 0 && (
          <ul className="space-y-2">
            {clientSubs.map((s) => (
              <li key={s.id} className="flex items-center gap-2">
                <Input
                  aria-label="Nome sottotipo cliente"
                  value={s.label}
                  onChange={(e) =>
                    setClientSubs(
                      clientSubs.map((x) =>
                        x.id === s.id ? { ...x, label: e.target.value } : x,
                      ),
                    )
                  }
                />
                <IconButton
                  label={`Elimina ${s.label}`}
                  size="sm"
                  onClick={() =>
                    setClientSubs(clientSubs.filter((x) => x.id !== s.id))
                  }
                >
                  <IconClose size={16} />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
        <Button
          variant="subtle"
          size="sm"
          onClick={() =>
            setClientSubs([
              ...clientSubs,
              { id: nanoid(), label: "Nuovo sottotipo" },
            ])
          }
        >
          <IconPlus size={15} />
          Aggiungi sottotipo
        </Button>
      </SettingsSection>
    </div>
  );
}
