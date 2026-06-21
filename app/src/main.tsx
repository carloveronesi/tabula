import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/app";
import { useUiStore } from "@/store";
import { useSettingsStore } from "@/store/settings";
import { registerServiceWorker } from "@/pwa/registerSW";
import "@/styles/index.css";

const container = document.getElementById("root");
if (!container) throw new Error("Root element non trovato");

/**
 * Carica le impostazioni e applica la vista iniziale prima del primo render,
 * così la "Vista iniziale" ha effetto senza clobberare un'eventuale
 * navigazione successiva.
 */
async function bootstrap(): Promise<void> {
  try {
    await useSettingsStore.getState().loadSettings();
    useUiStore.getState().setView(useSettingsStore.getState().settings.defaultView);
  } catch {
    // Impostazioni non leggibili: si parte dai default.
  }
}

void bootstrap().finally(() => {
  createRoot(container).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});

// Offline / installabilità: il service worker fa runtime caching dell'app shell.
// Solo in produzione (in dev intralcerebbe l'HMR di Vite).
if (import.meta.env.PROD)
  registerServiceWorker(`${import.meta.env.BASE_URL}sw.js`);
