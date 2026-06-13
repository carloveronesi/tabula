import { useEffect } from "react";
import { useSettingsStore } from "@/store/settings";
import { resolveTheme } from "@/domain/theme";

/**
 * Applica il tema effettivo (`settings.theme`) alla classe `.dark` di `<html>`,
 * seguendo `prefers-color-scheme` quando l'impostazione è `system`. Da montare
 * una volta nello shell.
 */
export function useTheme(): void {
  const theme = useSettingsStore((s) => s.settings.theme);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved = resolveTheme(theme, mq.matches);
      document.documentElement.classList.toggle("dark", resolved === "dark");
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);
}
