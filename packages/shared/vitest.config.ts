import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import path from "node:path";

const pkgDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: pkgDir,
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.test.ts", "src/**/*.test.ts"],
  },
  css: false,
  // Disable PostCSS resolution entirely — we don't process CSS in tests
  // and Vite's auto-resolution walks up to /home/z/my-project/postcss.config.mjs
  // which has incompatible plugins.
  build: {
    rollupOptions: {},
  },
  plugins: [
    {
      name: "skip-postcss",
      config() {
        return {
          css: {
            postcss: { plugins: [] },
          },
        };
      },
    },
  ],
});
