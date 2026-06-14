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

/** Converte un colore hex in rgba con l'alpha indicato. */
export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Mappe colore persistite (per cliente e per sottotipo interno). */
export interface ColorMaps {
  clientColors: Record<string, string>;
  internalColors: Record<string, string>;
}

/**
 * Colore di un'attività per i blocchi-calendario: per cliente (`type=client`)
 * o per sottotipo interno (`type=internal`), con fallback deterministico se non
 * c'è un colore assegnato. `null` quando non c'è un riferimento colorabile
 * (ferie/evento senza cliente) → il chiamante usa l'accento di default.
 */
export function entryColor(
  entry: { type: string; clientId: string | null; subtypeId: string | null },
  maps: ColorMaps,
): string | null {
  if (entry.type === "client" && entry.clientId) {
    return maps.clientColors[entry.clientId] ?? colorFromKey(entry.clientId);
  }
  if (entry.type === "internal" && entry.subtypeId) {
    return maps.internalColors[entry.subtypeId] ?? colorFromKey(entry.subtypeId);
  }
  return null;
}
