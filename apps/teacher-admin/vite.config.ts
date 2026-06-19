import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Sprint 0: konfigurasi minimal. Tailwind, PWA, path alias akan ditambahkan di Sprint 1.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
