import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@guru-admin/shared": resolve(__dirname, "../../packages/shared/src/index.ts"),
      "@guru-admin/domain": resolve(__dirname, "../../packages/domain/src/index.ts"),
      "@shared/documents": resolve(__dirname, "src/shared/documents/index.ts"),
      "@shared/db": resolve(__dirname, "src/shared/db/index.ts"),
      "@shared/ui": resolve(__dirname, "src/shared/ui/index.ts"),
      "@shared/exporters": resolve(__dirname, "src/shared/exporters/index.ts"),
      "@shared/hooks": resolve(__dirname, "src/shared/hooks/index.ts"),
      "@shared/layout": resolve(__dirname, "src/shared/layout/index.ts"),
      "@shared/supabase": resolve(__dirname, "src/shared/supabase/index.ts"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/__tests__/**/*.test.{ts,tsx}"],
  },
});
