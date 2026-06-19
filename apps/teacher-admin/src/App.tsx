/**
 * Sprint 0 App placeholder.
 *
 * Menampilkan status Sprint 0 dan daftar dokumen kontrak yang sudah dibuat.
 * BUKAN UI besar — tidak ada layout, tidak ada routing, tidak ada modul.
 *
 * Sprint 1 akan mengganti file ini dengan:
 *   - Shell layout mobile + desktop
 *   - Routing (React Router 6)
 *   - Dashboard hari ini (lihat docs/PROJECT_CONTRACT.md §8.1)
 */

import { APP_NAME, APP_VERSION, SCHEMA_VERSION } from "@guru-admin/shared";

const SPRINT0_DOCS = [
  { path: "docs/GURU_ADMIN_FLOW_REFERENCE.md", desc: "Sumber otoritas produk (read-only)" },
  { path: "docs/PROJECT_CONTRACT.md", desc: "Kontrak produk: visi, scope MVP, non-goals, AC" },
  { path: "docs/TECHNICAL_PLAN.md", desc: "Stack, struktur folder, strategi local-first & sync" },
  { path: "docs/DATA_MODEL_DRAFT.md", desc: "11 entitas inti + 2 entitas pendukung" },
];

export function App() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", maxWidth: "720px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{APP_NAME}</h1>
      <p style={{ color: "#475569", marginBottom: "1.5rem" }}>
        Sprint 0 — Product Contract &amp; Technical Foundation. Scaffold siap, belum ada UI.
      </p>

      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Status</h2>
        <ul style={{ paddingLeft: "1.25rem", lineHeight: 1.7 }}>
          <li>App version: <code>{APP_VERSION}</code></li>
          <li>Schema version: <code>{SCHEMA_VERSION}</code></li>
          <li>Supabase: <strong>tidak dipasang</strong> (ditunda ke Sprint 6)</li>
          <li>UI besar: <strong>tidak dibangun</strong> (sesuai acceptance criteria Sprint 0)</li>
        </ul>
      </section>

      <section style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Dokumen Kontrak</h2>
        <ul style={{ paddingLeft: "1.25rem", lineHeight: 1.7 }}>
          {SPRINT0_DOCS.map((doc) => (
            <li key={doc.path}>
              <code>{doc.path}</code>
              <br />
              <span style={{ color: "#64748b", fontSize: "0.875rem" }}>{doc.desc}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>Langkah Berikutnya</h2>
        <p style={{ color: "#475569" }}>
          Lihat <code>docs/TECHNICAL_PLAN.md</code> §9 untuk roadmap Sprint 1–6.
          Sprint 1 akan membangun fondasi lokal: shell layout, Dexie schema, modul Profil, modul Backup/Restore.
        </p>
      </section>
    </main>
  );
}
