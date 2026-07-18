import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@guru-admin/shared": resolve(__dirname, "../../packages/shared/src/index.ts"),
      "@guru-admin/domain": resolve(__dirname, "../../packages/domain/src/index.ts"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/__tests__/**/*.test.ts"],
  },
});
