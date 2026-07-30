import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@guru-admin/shared": resolve(__dirname, "../../packages/shared/src/index.ts"),
      "@guru-admin/domain": resolve(__dirname, "../../packages/domain/src/index.ts"),
      "@shared/documents": resolve(__dirname, "src/shared/documents/index.ts"),
      "@shared/db": resolve(__dirname, "src/shared/db/index.ts"),
      "@shared/db/schema": resolve(__dirname, "src/shared/db/schema.ts"),
      "@shared/db/attendance-repo": resolve(__dirname, "src/shared/db/attendance-repo.ts"),
      "@shared/db/journal-repo": resolve(__dirname, "src/shared/db/journal-repo.ts"),
      "@shared/db/gradebook-repo": resolve(__dirname, "src/shared/db/gradebook-repo.ts"),
      "@shared/db/profile-repo": resolve(__dirname, "src/shared/db/profile-repo.ts"),
      "@shared/db/class-roster-repo": resolve(__dirname, "src/shared/db/class-roster-repo.ts"),
      "@shared/db/teaching-schedule-repo": resolve(__dirname, "src/shared/db/teaching-schedule-repo.ts"),
      "@shared/db/teaching-assignment-repo": resolve(__dirname, "src/shared/db/teaching-assignment-repo.ts"),
      "@shared/db/lesson-session-repo": resolve(__dirname, "src/shared/db/lesson-session-repo.ts"),
      "@shared/db/crud": resolve(__dirname, "src/shared/db/crud.ts"),
      "@shared/ui": resolve(__dirname, "src/shared/ui/index.ts"),
      "@shared/exporters": resolve(__dirname, "src/shared/exporters/index.ts"),
      "@shared/hooks": resolve(__dirname, "src/shared/hooks/index.ts"),
      "@shared/layout": resolve(__dirname, "src/shared/layout/index.ts"),
      "@shared/supabase": resolve(__dirname, "src/shared/supabase/index.ts"),
      "@shared/constants/attendance-status": resolve(__dirname, "src/shared/constants/attendance-status.ts"),
      "@harian/kbm-kilat/useKbmSession": resolve(__dirname, "src/modules/1-harian/kbm-kilat/useKbmSession.ts"),
      // Module group aliases — needed for cross-module imports in exporters
      "@shared": resolve(__dirname, "src/shared"),
      "@modules": resolve(__dirname, "src/modules"),
      "@routes": resolve(__dirname, "src/routes"),
      "@harian": resolve(__dirname, "src/modules/1-harian"),
      "@piket": resolve(__dirname, "src/modules/2-piket"),
      "@admin": resolve(__dirname, "src/modules/3-administrasi"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/__tests__/**/*.test.{ts,tsx}"],
  },
});
