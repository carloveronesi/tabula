import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/app";
import "@/styles/index.css";

const container = document.getElementById("root");
if (!container) throw new Error("Root element non trovato");

createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
