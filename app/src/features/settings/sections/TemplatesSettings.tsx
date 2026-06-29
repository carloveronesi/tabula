import { useTemplateStore } from "@/store/templates";
import { IconButton, Input } from "@/ui";
import { IconClose } from "@/ui/icons";
import { SettingsSection } from "@/features/settings/SettingsSection";

/** Elenco dei template attività: rinomina ed elimina. Si creano dal calendario. */
export function TemplatesSettings() {
  const templates = useTemplateStore((s) => s.templates);
  const saveTemplate = useTemplateStore((s) => s.saveTemplate);
  const removeTemplate = useTemplateStore((s) => s.removeTemplate);

  return (
    <SettingsSection
      title="Template attività"
      description="Attività salvate, da reinserire con un clic dalla creazione rapida. Per crearne uno: tasto destro su un'attività → «Salva come template»."
    >
      {templates.length === 0 ? (
        <p className="text-sm text-muted">
          Nessun template per ora.
        </p>
      ) : (
        <ul className="space-y-2">
          {templates.map((t) => (
            <li key={t.id} className="flex items-center gap-2">
              <Input
                aria-label="Nome template"
                value={t.name}
                onChange={(e) =>
                  void saveTemplate({ ...t, name: e.target.value })
                }
              />
              <IconButton
                label={`Elimina ${t.name}`}
                size="sm"
                onClick={() => void removeTemplate(t.id)}
              >
                <IconClose size={16} />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </SettingsSection>
  );
}
