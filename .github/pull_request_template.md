<!--
PR Template — Guru Admin Flow
Setiap PR wajib isi checklist berikut sebelum request review.
Lihat docs/PROJECT_CONTRACT.md §10 untuk aturan dev.
-->

## Sprint: <!-- Sprint N — singkat, contoh: "Sprint 1 — Local Foundation" -->

## Scope

<!-- Tulis singkat apa yang dikerjakan. Contoh: "Fondasi aplikasi lokal: Dexie DB, profil, backup/restore, wizard tahun baru." -->

## Non-goals yang dipatuhi

<!-- Centang item yang TIDAK Anda kerjakan di PR ini (sesuai scope sprint). -->

- [ ] Supabase (Sprint 6)
- [ ] Login (Sprint 6)
- [ ] Modul di luar scope sprint ini

## Acceptance criteria

<!-- Centang semua yang relevan. -->

- [ ] TypeScript strict pass (`npm run typecheck`)
- [ ] Test pass (`npm run test:run`)
- [ ] Build sukses (`vite build` di `apps/teacher-admin`)
- [ ] Tidak ada dependency Supabase
- [ ] Tidak ada token/credential di diff
- [ ] Tidak ada `dist/` atau `node_modules/` ikut commit
- [ ] Worklog diperbarui (`worklog.md`)
- [ ] Dokumen kontrak diperbarui bila ada perubahan scope/data model

## Manual smoke test

<!-- Bila PR ini mengubah UI atau persistensi data, jalankan manual test di browser lokal. Centang yang sudah dilakukan. -->

- [ ] Clone bersih → `npm install` sukses
- [ ] `npm run dev` sukses, app jalan di http://localhost:5173
- [ ] Data tersimpan di IndexedDB (cek DevTools → Application → IndexedDB → guru-admin-flow)
- [ ] Data tetap ada setelah refresh browser
- [ ] Backup export → import round-trip sukses

## Catatan untuk reviewer

<!-- Hal-hal yang perlu perhatian khusus, keputusan desain, trade-off, atau follow-up di sprint berikutnya. -->

-

## Checklist sebelum merge

- [ ] CI workflow `.github/workflows/ci.yml` lulus (4 jobs: typecheck, test, build, audit)
- [ ] Minimal 1 approval dari reviewer
- [ ] Tidak ada konflik merge dengan `main`
- [ ] Branch up-to-date dengan `main` (rebase bila perlu)
