import type { SourceEntry } from "@/data/import/sourceTypes";

/** Serializzazione deterministica (chiavi ordinate ricorsivamente). */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return Object.keys(obj)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = canonical(obj[key]);
        return acc;
      }, {});
  }
  return value;
}

/** Due entry sono "uguali" se hanno lo stesso contenuto (le copie per slot lo sono). */
export function sameEntry(a: SourceEntry, b: SourceEntry): boolean {
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}
