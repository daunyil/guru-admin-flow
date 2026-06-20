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
