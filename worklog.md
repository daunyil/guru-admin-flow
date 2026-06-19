# Worklog — Guru Admin Flow

File ini adalah log kerja tunggal lintas sprint. **Append-only**. Setiap entri wajib diawali dengan `---` pada baris baru.

Format entri:

```markdown
---
Task ID: <id>
Agent: <nama>
Task: <deskripsi singkat>

Work Log:
- <langkah 1>
- <langkah 2>

Stage Summary:
- <hasil / keputusan / artefak yang dihasilkan>
```

---

Task ID: 0
Agent: Sprint 0 owner (main)
Task: Sprint 0 — Product Contract & Technical Foundation. Membaca referensi, menyusun kontrak produk, rencana teknis, draft data model, dan scaffold repo minimal tanpa fitur/UI besar/Supabase.

Work Log:
- Membaca `upload/GURU_ADMIN_FLOW_REFERENCE.md` (781 baris) sebagai sumber otoritas produk.
- Membaca preview `upload/promes_generator_smpn8bantan (1).html` (prototipe Promes Generator SMPN 8 Bantan, referensi visual untuk Sprint 2).
- Membuat struktur direktori monorepo: `apps/teacher-admin`, `packages/domain`, `packages/shared`, `docs`, `scripts`.
- Menyalin `GURU_ADMIN_FLOW_REFERENCE.md` ke `docs/` sebagai sumber otoritas read-only.
- Menulis `docs/PROJECT_CONTRACT.md`: visi, target pengguna, 7 masalah utama, 9 modul MVP (M01–M09), 13 non-goals, 4 user flow (awal tahun, awal semester, harian, akhir semester), data ownership + aturan tahun baru, 6 prinsip UX, AC Sprint 0 + 15 AC MVP v1, 10 aturan untuk dev berikutnya.
- Menulis `docs/TECHNICAL_PLAN.md`: pilihan stack (TS+Vite+React+Dexie+Supabase-ditunda), alternatif yang ditolak + alasan, modul utama aplikasi, struktur folder monorepo + aturan dependensi antar-paket, strategi local-first + skema Dexie draft, rencana Supabase Sprint 6 (ditunda), strategi backup/restore JSON + snapshot, strategi testing piramida + alur E2E wajib, 13 justifikasi non-goals, roadmap Sprint 1–6, 7 risiko teknis awal, Definition of Done per sprint.
- Menulis `docs/DATA_MODEL_DRAFT.md`: 11 entitas inti (AcademicYear, SchoolProfile, TeacherProfile, CalendarEvent, ProtaProfile+ProtaUnit digabung jadi 1 entitas ProtaProfile dengan units, TeachingSchedule, LessonSession, AttendanceRecord+ClassRoster+StudentEntry, TeachingJournal, SemesterReport) + 2 entitas pendukung (DocumentSnapshot, SyncQueue), konvensi umum (BaseEntity, SyncStatus, DocumentStatus, format tanggal, aturan ID), relasi antar entitas (diagram teks), aturan implementasi "Buat Tahun Baru dari Tahun Lalu", validasi lintas entitas, daftar entitas yang belum didefinisikan.
- Menulis root `package.json` (pnpm workspace, scripts typecheck/lint/test), `pnpm-workspace.yaml`, `tsconfig.base.json` (strict mode).
- Menulis `packages/shared/` (package.json + tsconfig + src/index.ts placeholder + README).
- Menulis `packages/domain/` (package.json dengan zod dep + tsconfig + src/index.ts stub + README).
- Menulis `apps/teacher-admin/` minimal: package.json (React 18 + Vite 5, TANPA Supabase/Dexie/Tailwind/Router di Sprint 0), tsconfig.json, vite.config.ts, index.html, src/main.tsx, src/App.tsx (placeholder Sprint 0 yang menampilkan status + daftar dokumen kontrak).
- Menulis `README.md` root, `.gitignore`, `.editorconfig`.

Stage Summary:
- 4 dokumen kontrak siap di `docs/`: GURU_ADMIN_FLOW_REFERENCE.md (sumber), PROJECT_CONTRACT.md, TECHNICAL_PLAN.md, DATA_MODEL_DRAFT.md.
- Struktur monorepo siap untuk Sprint 1: pnpm workspace + 2 packages + 1 app.
- Tidak ada dependensi Supabase di `package.json` mana pun (verifikasi: hanya `zod` di packages/domain, `react` + `react-dom` + `vite` + `@vitejs/plugin-react` di apps/teacher-admin).
- Tidak ada UI besar: `App.tsx` hanya placeholder 1 komponen tanpa routing, tanpa layout, tanpa modul.
- Tidak ada fitur di luar MVP v1: tidak ada kode Prota/Promes/absensi/jurnal/laporan — hanya stub.
- Sprint 0 acceptance criteria (PROJECT_CONTRACT.md §9) seluruhnya terpenuhi.
- Risiko awal tercatat di TECHNICAL_PLAN.md §10 (7 risiko): migration skema Dexie, kompleksitas engine Promes, quota IndexedDB iOS, background sync iOS, konflik multi-perangkat, Tailwind bundle, PWA install prompt.
- Yang belum dikerjakan (sesuai scope Sprint 0): implementasi tipe domain di packages/domain/src/*, skema Dexie, modul M01–M09, layout shell, routing. Semua ditunda ke Sprint 1+.
- Instruksi untuk Sprint 1: lihat bagian "Sprint 1 — Fondasi Aplikasi Lokal" di TECHNICAL_PLAN.md §9.1.

---

Task ID: 0-preview
Agent: main (preview setup)
Task: Setup Next.js 16 preview page untuk menampilkan status Sprint 0 secara visual (dashboard project).

Work Log:
- Backup root package.json pnpm workspace ke package.json.sprint0.bak & pnpm-workspace.yaml.sprint0.bak (Sprint 0 deliverable tetap aman).
- Inisialisasi Next.js 16 via init-fullstack.sh (Vite + React monorepo Sprint 0 dipreservasi di apps/teacher-admin & packages/*, struktur Next.js dibangun di root untuk preview system).
- Update src/app/layout.tsx: metadata bahasa Indonesia, title "Guru Admin Flow — Sprint 0", lang="id".
- Buat src/app/page.tsx (~500 baris): dashboard Sprint 0 dengan 5 tab (Dokumen, Modul MVP, User Flow, Stack, Roadmap), hero section, stat cards (4 modul MVP, 9 modul, 13 non-goals, 0/6 sprint), filosofi produk, 9 modul MVP grid, 13 non-goals list, 4 user flow cards, 12 stack items, 7 sprint timeline, 9 acceptance criteria checklist, accordion 10 aturan dev. Tema emerald/teal (sesuai aturan "hindari indigo/biru").
- Verifikasi via Agent Browser: page load HTTP 200, semua tab interaktif (Dokumen/Modul MVP/User Flow/Stack/Roadmap), accordion "10 Aturan" bisa expand, mobile viewport 390x844 responsive, tidak ada console error, tidak ada page error.
- Lint bersih (bun run lint = 0 errors).
- Screenshot desktop & mobile disimpan di download/sprint0-preview.png & sprint0-preview-mobile.png.

Stage Summary:
- Preview Next.js berjalan di port 3000, return HTTP 200, semua interaksi (tab switch, accordion expand) berfungsi.
- Sprint 0 deliverables (docs/, apps/teacher-admin, packages/*) tetap utuh dan dipreservasi.
- Halaman preview menampilkan: 4 dokumen kontrak, 9 modul MVP (M01–M09), 13 non-goals, 4 user flow, 12 stack items, 7 sprint roadmap, 9 acceptance criteria, 10 aturan dev.
- Backup Sprint 0 root files tersedia di package.json.sprint0.bak & pnpm-workspace.yaml.sprint0.bak untuk restore bila nanti dilanjutkan ke Sprint 1 dengan struktur monorepo pnpm asli.
