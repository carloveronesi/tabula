// Config dedicata a Vitest (non inclusa nel typecheck: vedi tsconfig.node.json).
// Tenuta separata da vite.config.ts per evitare il conflitto di tipi tra la
// copia di Vite annidata in Vitest e quella di primo livello.
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    // logica pura/dati in node; i test dei componenti (.test.tsx) in jsdom
    environment: "node",
    environmentMatchGlobs: [["**/*.test.tsx", "jsdom"]],
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**"],
      exclude: [
        "src/**/__tests__/**",
        "src/**/*.test.{ts,tsx}",
        "src/main.tsx",
        "src/vite-env.d.ts",
      ],
    },
  },
});
