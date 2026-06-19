/**
 * Sprint 0 entry point.
 *
 * Ini BUKAN UI besar. Hanya placeholder yang menandakan bahwa scaffold Vite + React + TS sudah siap.
 * Layout, routing, modul, dan komponen UI akan dibangun di Sprint 1+.
 *
 * Lihat:
 *   - docs/PROJECT_CONTRACT.md §9 (Acceptance Criteria Sprint 0: "Tidak ada UI besar")
 *   - docs/TECHNICAL_PLAN.md §2 (modul utama yang akan dibangun Sprint 1+)
 *   - docs/TECHNICAL_PLAN.md §9 (roadmap per sprint)
 */

import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root tidak ditemukan");

createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
