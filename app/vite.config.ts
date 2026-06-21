import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// In produzione il sito è servito come GitHub Pages "project page" sotto
// /tabula/; in sviluppo resta alla radice per non disturbare `npm run dev`.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/tabula/" : "/",
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
}));
