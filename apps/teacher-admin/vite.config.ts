import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import path from "path";

// PATH-ALIAS-01: Resolve aliases matching tsconfig paths.
// When modules move in Phase 1-3 (e.g. modules/attendance → modules/1-harian/attendance),
// only the alias mapping needs to change — all import statements stay the same.
const srcDir = path.resolve(__dirname, "src");
const aliasMap = {
  "@shared": path.resolve(srcDir, "shared"),
  "@modules": path.resolve(srcDir, "modules"),
  "@routes": path.resolve(srcDir, "routes"),
  // Module group aliases — updated after Phase 1 reorg
  "@harian": path.resolve(srcDir, "modules", "1-harian"),
  "@piket": path.resolve(srcDir, "modules", "2-piket"),
  "@admin": path.resolve(srcDir, "modules", "3-administrasi"),
};

// CODE-SPLIT-01: manualChunks — split vendor code into separate chunks
// for better caching and parallel loading.
function manualChunks(id: string): string | undefined {
  if (id.includes("node_modules")) {
    // Dexie (IndexedDB) — isolated, no circular deps
    if (id.includes("dexie")) return "vendor-dexie";
    // Docx generation — isolated, heavy
    if (id.includes("docx") || id.includes("jszip")) return "vendor-docx";
    // Supabase — isolated, heavy
    if (id.includes("@supabase")) return "vendor-supabase";
    // All other node_modules (React, router, etc.) — keep together to avoid circular deps
    return "vendor-react";
  }
  // Domain package — shared business logic
  if (id.includes("packages/domain")) return "app-domain";
  // Shared utilities
  if (id.includes("packages/shared")) return "app-shared";
  return undefined;
}

export default defineConfig({
  plugins: [react()],
  base: "/teacher-admin/",
  resolve: {
    alias: aliasMap,
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      output: {
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
        manualChunks,
      },
    },
  },
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    passWithNoTests: true,
  },
});
