import type { Settings } from "@/data/types";
import type { SourceSettings } from "@/data/import/sourceTypes";

export const DEFAULT_SETTINGS: Settings = {
  id: "app",
  theme: "light",
  defaultView: "month",
  defaultLocation: "remote",
  workHours: {
    morningStart: 540,
    morningEnd: 780,
    afternoonStart: 840,
    afternoonEnd: 1080,
  },
  workingDays: [0, 1, 2, 3, 4],
  slotMinutes: 15,
  subtypes: { client: [], internal: [] },
  clientColors: {},
  internalColors: {},
  lastUsedByClient: {},
  patronDay: "",
  presenceTracking: { enabled: false, officeTargetPct: 0, clientTargetPct: 0 },
};

function pick<T extends string>(value: unknown, allowed: readonly T[], def: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : def;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function num(value: unknown, def: number): number {
  return typeof value === "number" ? value : def;
}

function stringRecord(value: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(asObject(value))) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

function subtypeList(value: unknown): { id: string; label: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return { id: item, label: item };
      const o = asObject(item);
      const id = typeof o.id === "string" ? o.id : "";
      const label = typeof o.label === "string" ? o.label : id;
      return { id, label };
    })
    .filter((s) => s.id);
}

/**
 * Normalizza i settings del formato di import nel modello dell'app,
 * applicando i default ai campi mancanti o non validi.
 * Nota: `clientColors` e `lastUsedByClient` sono azzerati perché legati alla
 * vecchia identità del cliente (nome), non rimappabili sugli id opachi.
 * `internalColors` passa: le chiavi sono subtypeId stabili.
 */
export function normalizeSettings(source: SourceSettings | null): Settings {
  const s = asObject(source);
  const wh = asObject(s.workHours);
  const ts = asObject(s.taskSubtypes);
  const presence = asObject(s.presenceTracking);
  const d = DEFAULT_SETTINGS;

  return {
    id: "app",
    theme: pick(s.theme, ["light", "dark", "system"], d.theme),
    defaultView: pick(
      s.defaultView,
      ["day", "week", "month", "projects", "todo"],
      d.defaultView,
    ),
    defaultLocation: pick(
      s.defaultLocation,
      ["remote", "office", "client"],
      d.defaultLocation,
    ),
    workHours: {
      morningStart: num(wh.morningStart, d.workHours.morningStart),
      morningEnd: num(wh.morningEnd, d.workHours.morningEnd),
      afternoonStart: num(wh.afternoonStart, d.workHours.afternoonStart),
      afternoonEnd: num(wh.afternoonEnd, d.workHours.afternoonEnd),
    },
    workingDays:
      Array.isArray(s.workingDays) &&
      s.workingDays.every((n) => typeof n === "number")
        ? (s.workingDays as number[])
        : [...d.workingDays],
    slotMinutes:
      s.slotMinutes === 15 || s.slotMinutes === 30
        ? s.slotMinutes
        : d.slotMinutes,
    subtypes: { client: subtypeList(ts.client), internal: subtypeList(ts.internal) },
    clientColors: {},
    internalColors: stringRecord(s.internalColors),
    lastUsedByClient: {},
    patronDay: typeof s.patronDay === "string" ? s.patronDay : d.patronDay,
    presenceTracking: {
      enabled: presence.enabled === true,
      officeTargetPct: num(presence.officeTargetPct, 0),
      clientTargetPct: num(presence.clientTargetPct, 0),
    },
  };
}
