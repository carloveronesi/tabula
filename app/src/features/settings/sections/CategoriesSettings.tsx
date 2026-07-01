import { nanoid } from "nanoid";
import { useSettingsStore } from "@/store/settings";
import { Button, IconButton, Input } from "@/ui";
import { IconClose, IconPlus } from "@/ui/icons";
import { SettingsSection } from "@/features/settings/SettingsSection";

/** Sottotipi del lavoro: un'unica lista condivisa da attività su cliente e
 * interne (es. SAL, preparazione offerte, KT). Solo etichette; il colore è
 * per progetto (vedi editor del progetto). */
export function CategoriesSettings() {
  const settings = useSettingsStore((s) => s.settings);
  const saveSettings = useSettingsStore((s) => s.saveSettings);

  const subtypes = settings.subtypes;
  const setSubtypes = (list: { id: string; label: string }[]) =>
    void saveSettings({ ...settings, subtypes: list });

  return (
    <SettingsSection
      title="Sottotipi"
      description="Le categorie del lavoro, condivise da attività su cliente e interne (es. SAL, preparazione offerte, KT)."
    >
      {subtypes.length > 0 && (
        <ul className="space-y-2">
          {subtypes.map((s) => (
            <li key={s.id} className="flex items-center gap-2">
              <Input
                aria-label="Nome sottotipo"
                value={s.label}
                onChange={(e) =>
                  setSubtypes(
                    subtypes.map((x) =>
                      x.id === s.id ? { ...x, label: e.target.value } : x,
                    ),
                  )
                }
              />
              <IconButton
                label={`Elimina ${s.label}`}
                size="sm"
                onClick={() => setSubtypes(subtypes.filter((x) => x.id !== s.id))}
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
        onClick={() => setSubtypes([...subtypes, { id: nanoid(), label: "Nuovo sottotipo" }])}
      >
        <IconPlus size={15} />
        Aggiungi sottotipo
      </Button>
    </SettingsSection>
  );
}
