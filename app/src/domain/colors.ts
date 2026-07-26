import type { EntryType } from "@/data/types";

/** Palette base per l'assegnazione deterministica dei colori. */
export const PALETTE: string[] = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f43f5e", // rose
  "#f59e0b", // amber
  "#10b981", // emerald
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#84cc16", // lime
  "#f97316", // orange
];

function hash(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Colore deterministico per una chiave (stessa chiave → stesso colore). */
export function colorFromKey(key: string, palette: string[] = PALETTE): string {
  return palette[hash(key) % palette.length];
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

function parseHex(hex: string): RGB {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/** Testo leggibile (#000000 o #ffffff) su uno sfondo dato, via luminanza YIQ. */
export function textColorOn(background: string): "#000000" | "#ffffff" {
  const { r, g, b } = parseHex(background);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "#000000" : "#ffffff";
}

/**
 * Sfondo tinto per un colore: `amount` di tinta mescolato sulla superficie del
 * tema, non un alpha fisso. Un rgba al 16% su `--surface` scuro sparisce e i
 * blocchi diventano indistinguibili; il mix segue il tema.
 *
 * Il mix è in **oklab**, non oklch: oklch interpola la tonalità, e contro un
 * bianco acromatico (hue 0) sposta indigo → rosa e smeraldo → pesca, perdendo
 * la codifica-colore per cliente. oklab è rettangolare e tiene la tinta.
 */
export function tint(hex: string, amount: number): string {
  return `color-mix(in oklab, ${hex} ${amount * 100}%, var(--surface))`;
}

/** Mappe colore persistite (per cliente e per sottotipo interno), usate dalle
 * ripartizioni analitiche che raggruppano su quelle dimensioni. */
export interface ColorMaps {
  clientColors: Record<string, string>;
  internalColors: Record<string, string>;
}

/** Colore di un progetto: assegnato a mano o fallback deterministico sull'id. */
export function projectColor(p: { id: string; color?: string | null }): string {
  return p.color ?? colorFromKey(p.id);
}

/**
 * Tinta dei gruppi-per-tipo (entry senza cliente/sottotipo, quindi senza
 * colore proprio). Valori distinti dalla palette così righe come "Interno" e
 * "Cliente" non collidono tutte sull'accento.
 */
const TYPE_COLOR: Record<EntryType, string> = {
  internal: "#6366f1", // indigo (vicino all'accento)
  client: "#f43f5e", // rose
  event: "#ec4899", // pink
  vacation: "#06b6d4", // cyan
};

/**
 * Colore-gruppo di una entry: per cliente (`type=client`), per sottotipo
 * (`type=internal`), altrimenti tinta del tipo (ferie/evento o non assegnata).
 * È la stessa dimensione-colore della legenda del giorno (`dayBreakdown`), così
 * blocchi in timeline e riepilogo concordano.
 */
export function entryGroupColor(
  entry: { type: EntryType; clientId: string | null; subtypeId: string | null },
  maps: ColorMaps,
): string {
  if (entry.type === "client" && entry.clientId)
    return maps.clientColors[entry.clientId] ?? colorFromKey(entry.clientId);
  if (entry.type === "internal" && entry.subtypeId)
    return maps.internalColors[entry.subtypeId] ?? colorFromKey(entry.subtypeId);
  return TYPE_COLOR[entry.type];
}
