# @guru-admin/domain

Tipe data + validasi Zod + business rules untuk Guru Admin Flow.

**Sprint 0 status:** Stub. Implementasi nyata dimulai di Sprint 1.

## Yang akan diisi di Sprint 1+

File per entitas (lihat `docs/DATA_MODEL_DRAFT.md`):

- `src/academic-year.ts`
- `src/school-profile.ts`
- `src/teacher-profile.ts`
- `src/calendar-event.ts`
- `src/prota.ts` (ProtaProfile + ProtaUnit)
- `src/teaching-schedule.ts`
- `src/lesson-session.ts`
- `src/attendance.ts` (AttendanceRecord + ClassRoster + StudentEntry)
- `src/teaching-journal.ts`
- `src/semester-report.ts`
- `src/document-status.ts` (DocumentStatus + SyncStatus)
- `src/document-snapshot.ts`
- `src/sync-queue.ts`
- `src/rules/` (business rules lintas entitas, pure functions)
- `src/index.ts` (barrel)

## Aturan paket

- Boleh mengimpor dari `@guru-admin/shared`.
- Tidak boleh mengimpor dari `apps/*`.
- Tidak boleh mengimpor Dexie, React, Supabase.
- Semua tipe wajib punya Zod schema + `parse()` + `safeParse()`.
- Business rules (`src/rules/*`) wajib pure functions, mudah di-test.

## Sumber otoritas

`docs/DATA_MODEL_DRAFT.md` adalah sumber kebenaran. Setiap perubahan tipe wajib memperbarui dokumen tersebut terlebih dahulu.
