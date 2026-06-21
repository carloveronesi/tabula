import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/app";
import { registerServiceWorker } from "@/pwa/registerSW";
import "@/styles/index.css";

const container = document.getElementById("root");
if (!container) throw new Error("Root element non trovato");

createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Offline / installabilità: il service worker fa runtime caching dell'app shell.
// Solo in produzione (in dev intralcerebbe l'HMR di Vite).
if (import.meta.env.PROD)
  registerServiceWorker(`${import.meta.env.BASE_URL}sw.js`);
