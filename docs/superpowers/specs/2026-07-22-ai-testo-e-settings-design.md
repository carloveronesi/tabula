# AI: miglioramento testo + sezione Settings — Design

Data: 2026-07-22
Stato: approvato (in attesa di review dello spec)

## Contesto e obiettivo

Tabula è una PWA locale: i dati stanno su IndexedDB e la promessa in cima ai
Settings è *"Tutto resta sul tuo dispositivo: nessun dato lascia il browser"*.

Vogliamo introdurre funzionalità AI **BYO-key** (l'utente inserisce la propria
API key): niente backend, niente costi per noi, la chiamata parte dal browser.
Il primo uso concreto è **migliorare/riformulare i testi** che l'utente scrive
(note attività, e per estensione altri campi liberi). L'infrastruttura va
progettata riusabile per usi futuri, ma **non** li costruiamo tutti ora.

Vincolo di posizionamento (non tecnico): l'AI è opt-in per definizione (senza
key non fa nulla), ma quando è attiva il testo *scelto dall'utente* lascia il
browser verso il provider. Va detto esplicitamente nella UI, non nascosto.

## Decisioni prese (con l'utente)

1. **Scope**: infrastruttura riusabile + un uso concreto (riscrivi il testo),
   progettando in mente altri punti d'uso ma senza costruirli.
2. **Architettura**: un solo client `fetch` verso un endpoint
   **OpenAI-compatible** (`POST {baseUrl}/chat/completions`), con **base URL
   configurabile** e preset. Nessuna dipendenza nuova, nessun codice
   per-provider. Copre OpenAI, OpenRouter, Google Gemini e (con limiti)
   Anthropic, tutti dietro lo stesso formato.

## Modello dati

Nuovo campo `ai` in `Settings` (`app/src/data/types.ts`), quindi persistito in
IndexedDB come il resto:

```ts
interface AiSettings {
  enabled: boolean;
  baseUrl: string;   // es. "https://api.openai.com/v1"
  apiKey: string;    // in chiaro nel DB locale — inevitabile senza server
  model: string;     // id modello, inserito dall'utente (es. "gpt-4o-mini")
}
```

La key sta in chiaro nel DB locale: è lo stesso modello di fiducia del resto dei
dati dell'app (chi ha accesso al browser ha accesso a tutto). Lo dichiariamo
nella UI. Default: `{ enabled: false, baseUrl: "", apiKey: "", model: "" }`.

`migrateSettings` / `normalizeSettings` in `app/src/data/settings.ts` vanno
estesi per fornire i default del campo `ai` a settings vecchi o importati (mai
`undefined`).

**Export**: la `apiKey` è **esclusa** dall'export (`collectExport` /
`buildExport`): è un segreto, non deve finire in un file condivisibile. Gli
altri campi `ai` (enabled, baseUrl, model) possono restare o essere azzerati in
import — micro-decisione, di default restano. In import la key resta vuota e
l'utente la reinserisce.

## Componenti

### 1. Client — `app/src/domain/ai/client.ts`

Una funzione pura sull'I/O:

```ts
async function chat(
  cfg: AiSettings,
  messages: { role: "system" | "user"; content: string }[],
  signal?: AbortSignal,
): Promise<string>
```

- Fa un solo `fetch` a `${cfg.baseUrl}/chat/completions`, body OpenAI
  (`{ model, messages }`), header `Authorization: Bearer ${cfg.apiKey}`.
- Gestisce gli errori **veri** con messaggi leggibili in italiano:
  - 401/403 → "API key non valida o senza permessi"
  - rete assente / `fetch` reject → "Impossibile raggiungere il provider"
  - risposta non OK o JSON malformato / senza `choices[0].message.content`
    → "Risposta non valida dal provider"
  - `AbortError` (annullato) → propagato, non è un errore da mostrare
- Niente streaming per ora. `// ponytail: no streaming; aggiungere se un
  singolo "riscrivi" diventa lento (testo breve, oggi non serve)`.

### 2. Preset provider — costante nel client o accanto ad esso

Solo per precompilare la base URL; il motore resta uno. Esempi:

| Preset       | Base URL                                                  | Nota                    |
|--------------|-----------------------------------------------------------|-------------------------|
| OpenAI       | `https://api.openai.com/v1`                               | —                       |
| OpenRouter   | `https://openrouter.ai/api/v1`                            | una key, tutti i modelli|
| Gemini       | `https://generativelanguage.googleapis.com/v1beta/openai` | compat OpenAI di Google |
| Personalizz. | (vuoto, l'utente incolla)                                 | —                       |

Il modello resta un campo di testo libero (gli id cambiano nel tempo); i preset
possono suggerire un placeholder di esempio ma non vincolano.

### 3. Primitiva riusabile — `useAiRewrite` + `<AiField>`

`app/src/features/ai/useAiRewrite.ts` — hook con macchina a stati:

```ts
type RewriteState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; proposal: string }
  | { status: "error"; message: string };
```

Espone `run(text)`, `accept()`, `reset()`, e cancella la richiesta in volo su
unmount / nuova run (via `AbortController`). Legge `AiSettings` dallo store; se
`!enabled` il bottone non compare (vedi sotto).

`app/src/features/ai/AiField.tsx` — piccolo componente che avvolge un campo di
testo esistente: bottone ✨ **Migliora** → in `loading` disabilita e mostra
spinner → in `ready` mostra la proposta con **Applica** / **Scarta** → in
`error` mostra il messaggio. `Applica` chiama la `onApply(proposal)` del
chiamante (che aggiorna il draft). L'utente vede **sempre** la proposta prima
che il campo cambi.

Il bottone compare solo se `ai.enabled` è true (altrimenti la primitiva è
inerte: nessun ingombro quando l'AI non è configurata).

### 4. Primo uso concreto

`<AiField>` sul campo **Note** dell'`EntryEditor`
(`app/src/features/calendar/EntryEditor.tsx`), con un system prompt specifico
del campo (es. "Riformula queste note di lavoro rendendole chiare e concise,
mantenendo la stessa lingua e i fatti"). Riusabile senza modifiche su *Cosa è
andato storto* e *Prossimi passi* passando un prompt diverso.

**Non costruiti ora** (ma coperti dal disegno): Descrizione/Obiettivi progetto,
riassunto della giornata. Si aggiungono mettendo `<AiField>` sul campo giusto.

### 5. Sezione Settings "AI"

Nuova sezione in `app/src/features/settings/SettingsView.tsx` (nuovo `SectionId`
`"ai"` + voce nav con icona) e file
`app/src/features/settings/sections/AiSettings.tsx`:

- Toggle **Attiva AI**.
- Dropdown **Preset provider** → precompila `baseUrl`.
- Campo **Base URL** (editabile anche dopo il preset).
- Campo **API key** (`type="password"`).
- Campo **Modello** (testo libero, con placeholder d'esempio).
- Bottone **Prova connessione** → chiama `chat` con un messaggio minimo e
  mostra esito ok/errore.
- Riga privacy onesta: *"Quando l'AI è attiva, il testo che scegli di migliorare
  viene inviato al provider selezionato. Tutto il resto resta sul dispositivo."*

La frase in cima ai Settings (`SettingsView` header) va ammorbidita: da
"nessun dato lascia il browser" a una formulazione che regge con l'AI opt-in
(es. "I tuoi dati restano sul dispositivo. L'AI, se la attivi, invia solo il
testo che scegli al provider che indichi tu.").

## Sicurezza e privacy

- La key è un dato locale come gli altri; nessun invio se non su azione esplicita
  dell'utente (bottone Migliora / Prova connessione).
- Nessun log della key o dei testi.
- Il testo inviato è solo quello del campo che l'utente sceglie di migliorare.
- Disclaimer esplicito accanto alla configurazione.

## Test (Vitest, da `app/`)

Un check runnable per unità non banale, niente scaffolding:

- `client.ts`: `fetch` mockato — successo (estrae il content), 401 → messaggio
  key, reject di rete → messaggio rete, risposta 200 malformata → messaggio
  risposta non valida, `AbortError` propagato.
- `useAiRewrite`: transizioni idle→loading→ready, ready→(accept)→applica,
  loading→error su errore del client, annullamento su nuova run.
- `settings.ts`: `migrateSettings`/`normalizeSettings` forniscono i default di
  `ai` a input privi del campo (mai `undefined`).
- export: `collectExport`/`buildExport` non includono `ai.apiKey`.
- `AiField`: test componente base — bottone visibile solo se enabled; flusso
  Migliora→Applica chiama `onApply` con la proposta.

## Cosa NON facciamo ora

- Streaming delle risposte.
- SDK/librerie per-provider.
- Usi AI oltre il "riscrivi testo" (progettati, non costruiti).
- Gestione avanzata di rate-limit/retry (il messaggio d'errore basta finché non
  serve davvero).
