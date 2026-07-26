import { useState } from "react";
import { useSettingsStore } from "@/store/settings";
import { Button, Field, Input, Segmented } from "@/ui";
import { SettingsSection } from "@/features/settings/SettingsSection";
import { AI_PRESETS, chat } from "@/domain/ai/client";
import type { AiSettings as AiSettingsT } from "@/data/types";

/** Configurazione AI (BYO-key). Nessun dato lascia il browser finché non usi
 * esplicitamente l'AI; la key resta locale. */
export function AiSettings() {
  const settings = useSettingsStore((s) => s.settings);
  const saveSettings = useSettingsStore((s) => s.saveSettings);
  const ai = settings.ai;
  const patch = (p: Partial<AiSettingsT>) =>
    void saveSettings({ ...settings, ai: { ...ai, ...p } });

  const [test, setTest] = useState<
    { status: "idle" | "loading" } | { status: "done"; ok: boolean; message: string }
  >({ status: "idle" });

  async function testConnection() {
    setTest({ status: "loading" });
    try {
      await chat(ai, [{ role: "user", content: "ping" }]);
      setTest({ status: "done", ok: true, message: "Connessione riuscita." });
    } catch (e) {
      setTest({
        status: "done",
        ok: false,
        message: e instanceof Error ? e.message : "Errore imprevisto.",
      });
    }
  }

  return (
    <div className="space-y-6">
      <SettingsSection
        title="AI"
        description="Configura un provider AI con la tua API key. Ogni volta che usi l'AI esce dal browser solo la richiesta di quel momento: il testo che le dai e, per il quick-add, i nomi di clienti e progetti, che le servono per riconoscerli. Fanno eccezione il riassunto di un progetto e le domande che gli fai lì, che mandano date, ore e titoli delle attività di quel progetto: partono solo quando premi tu, e i nomi di colleghi e referenti vengono tolti dai titoli prima della chiamata."
      >
        <Segmented
          label="Attivazione AI"
          value={ai.enabled ? "on" : "off"}
          onChange={(id) => patch({ enabled: id === "on" })}
          options={[
            { id: "on", label: "Attiva" },
            { id: "off", label: "Disattiva" },
          ]}
        />

        <Field label="Preset provider">
          <Segmented
            label="Preset provider"
            value={
              AI_PRESETS.find((p) => p.baseUrl === ai.baseUrl)?.id ?? "custom"
            }
            onChange={(id) => {
              const preset = AI_PRESETS.find((p) => p.id === id);
              if (preset) patch({ baseUrl: preset.baseUrl });
            }}
            options={AI_PRESETS.map((p) => ({ id: p.id, label: p.label }))}
          />
        </Field>

        <Field label="Base URL">
          <Input
            aria-label="Base URL"
            value={ai.baseUrl}
            onChange={(e) => patch({ baseUrl: e.target.value })}
            placeholder="https://api.openai.com/v1"
          />
        </Field>

        <Field label="API key">
          <Input
            aria-label="API key"
            type="password"
            value={ai.apiKey}
            onChange={(e) => patch({ apiKey: e.target.value })}
            placeholder="sk-…"
          />
        </Field>

        <Field label="Modello">
          <Input
            aria-label="Modello"
            value={ai.model}
            onChange={(e) => patch({ model: e.target.value })}
            placeholder="gpt-4o-mini"
          />
        </Field>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => void testConnection()}
            disabled={test.status === "loading" || !ai.baseUrl || !ai.apiKey || !ai.model}
          >
            {test.status === "loading" ? "Provo…" : "Prova connessione"}
          </Button>
          {test.status === "done" && (
            <span
              role="status"
              className={test.ok ? "text-sm text-primary" : "text-sm text-danger"}
            >
              {test.message}
            </span>
          )}
        </div>
      </SettingsSection>
    </div>
  );
}
