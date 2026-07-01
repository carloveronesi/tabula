import { nanoid } from "nanoid";
import { useSettingsStore } from "@/store/settings";
import { Button, IconButton, Input } from "@/ui";
import { IconClose, IconPlus } from "@/ui/icons";
import { SettingsSection } from "@/features/settings/SettingsSection";

/** Sottotipi del lavoro (cliente/interni): solo etichette; il colore è per
 * progetto (vedi editor del progetto), i riepiloghi usano un colore derivato. */
export function CategoriesSettings() {
  const settings = useSettingsStore((s) => s.settings);
  const saveSettings = useSettingsStore((s) => s.saveSettings);

  const { client: clientSubs, internal: internalSubs } = settings.subtypes;

  const setClientSubs = (list: { id: string; label: string }[]) =>
    void saveSettings({ ...settings, subtypes: { ...settings.subtypes, client: list } });
  const setInternalSubs = (list: { id: string; label: string }[]) =>
    void saveSettings({ ...settings, subtypes: { ...settings.subtypes, internal: list } });

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Sottotipi interni"
        description="Le categorie del lavoro interno (non legato a un cliente)."
      >
        {internalSubs.length > 0 && (
          <ul className="space-y-2">
            {internalSubs.map((s) => (
              <li key={s.id} className="flex items-center gap-2">
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
                  onClick={() => setInternalSubs(internalSubs.filter((x) => x.id !== s.id))}
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
            setInternalSubs([...internalSubs, { id: nanoid(), label: "Nuovo sottotipo" }])
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
                  onClick={() => setClientSubs(clientSubs.filter((x) => x.id !== s.id))}
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
            setClientSubs([...clientSubs, { id: nanoid(), label: "Nuovo sottotipo" }])
          }
        >
          <IconPlus size={15} />
          Aggiungi sottotipo
        </Button>
      </SettingsSection>
    </div>
  );
}
