export type ThemeSetting = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

/**
 * Tema effettivo da applicare: i valori espliciti vincono, `system` segue la
 * preferenza dell'OS (`prefers-color-scheme: dark`). Logica pura: l'hook che
 * applica la classe `.dark` osserva matchMedia e richiama questa funzione.
 */
export function resolveTheme(
  setting: ThemeSetting,
  prefersDark: boolean,
): ResolvedTheme {
  if (setting === "system") return prefersDark ? "dark" : "light";
  return setting;
}
