import { useEffect, useState } from "react";

/**
 * `beforeinstallprompt` non è nei lib DOM standard: tipo minimale locale con
 * il solo `prompt()` che ci serve.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<unknown>;
}

/**
 * Espone l'invito all'installazione PWA. Intercetta `beforeinstallprompt`
 * (Chrome/Edge), tiene l'evento e lo rilancia al click. Su browser che non lo
 * emettono (iOS Safari) `canInstall` resta `false` e l'UI non mostra nulla.
 */
export function useInstallPrompt(): { canInstall: boolean; install: () => void } {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferred(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  return {
    canInstall: deferred !== null,
    install: () => {
      if (!deferred) return;
      void deferred.prompt();
      setDeferred(null); // l'evento è monouso
    },
  };
}
