/**
 * Konstanta global aplikasi Guru Admin Flow.
 * Sumber otoritas: docs/DATA_MODEL_DRAFT.md §0
 */

export const APP_NAME = "Guru Admin Flow";
export const APP_VERSION = "1.0.0";

/**
 * Versi skema data. Wajib dinaikkan setiap kali struktur data berubah
 * secara breaking. Backup JSON wajib menyertakan schemaVersion dan
 * restore wajib memvalidasi bahwa schemaVersion <= DATA_SCHEMA_VERSION.
 *
 * v0.6 menaikkan versi karena menambah GradeBook ke Dexie + Backup JSON.
 * v0.6.3 (PATCH-FLOW-RC2C) menaikkan versi karena menambah TeachingAssignment.
 * v0.6.4 (APP-USABLE-RC1) menaikkan versi karena menambah atpEntries + lkpds.
 * v0.6.5 (APP-USABLE-RC1B) menaikkan versi karena menambah classId + classLabel
 *   ke SemesterReport schema.
 * v0.6.6 (GENERATOR-COMPLETION-RC1) menaikkan versi karena menambah
 *   rppDocuments + remedialPrograms + enrichmentPrograms ke Dexie + Backup JSON.
 *   Backup lama (v5) tetap bisa di-restore karena field baru default=[].
 * v1.0.0 adalah release lock aplikasi harian. Tidak ada perubahan schema;
 *   DATA_SCHEMA_VERSION tetap 7.
 */
export const DATA_SCHEMA_VERSION = 7;

/** Timezone default untuk MVP v1 (Asia/Jakarta). */
export const DEFAULT_TIMEZONE = "Asia/Jakarta";

/** Locale default untuk format tanggal Indonesia. */
export const DEFAULT_LOCALE = "id-ID";

export const DAY_OF_WEEK = {
  SENIN: 1,
  SELASA: 2,
  RABU: 3,
  KAMIS: 4,
  JUMAT: 5,
  SABTU: 6,
  MINGGU: 7,
} as const;

export const DAY_LABELS_ID: Record<number, string> = {
  1: "Senin",
  2: "Selasa",
  3: "Rabu",
  4: "Kamis",
  5: "Jumat",
  6: "Sabtu",
  7: "Minggu",
};

export const MONTH_LABELS_ID: Record<number, string> = {
  1: "Januari",
  2: "Februari",
  3: "Maret",
  4: "April",
  5: "Mei",
  6: "Juni",
  7: "Juli",
  8: "Agustus",
  9: "September",
  10: "Oktober",
  11: "November",
  12: "Desember",
};

/**
 * Status sinkronisasi cloud (untuk Sprint 6, didefinisikan sejak Sprint 0
 * agar field sudah ada di skema Dexie sejak awal).
 *
 * Lihat docs/DATA_MODEL_DRAFT.md §0.1.
 */
export const SYNC_STATUSES = [
  "local_only",
  "pending",
  "synced",
  "error",
  "conflict",
] as const;

/**
 * Status dokumen yang dapat difinalisasi.
 * Lihat docs/DATA_MODEL_DRAFT.md §0.4.
 */
export const DOCUMENT_STATUSES = [
  "draft",
  "ready_for_review",
  "final",
  "revised",
  "locked",
] as const;

/**
 * Label Indonesia untuk DocumentStatus.
 * UX-PLAN-04: ganti istilah developer (ready_for_review, revised, locked)
 * dengan bahasa guru.
 */
export const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  draft: "Draf",
  ready_for_review: "Siap Dicek",
  final: "Final",
  revised: "Perlu Revisi",
  locked: "Dikunci",
};

/** Helper: dapatkan label Indonesia untuk status dokumen. */
export function documentStatusLabel(status: string): string {
  return DOCUMENT_STATUS_LABELS[status] ?? status;
}

/** Status nilai ringan v0.6. */
export const GRADE_ENTRY_STATUSES = [
  "complete",
  "remedial",
  "incomplete",
] as const;

/** Tipe CalendarEvent sesuai docs/DATA_MODEL_DRAFT.md §4. */
export const CALENDAR_EVENT_TYPES = [
  "learning",
  "assessment",
  "holiday",
  "school_activity",
  "remedial",
  "report",
  "cocurricular",
] as const;

/** Status LessonSession sesuai docs/DATA_MODEL_DRAFT.md §7. */
export const LESSON_SESSION_STATUSES = [
  "planned",
  "done",
  "continued",
  "cancelled",
  "rescheduled",
] as const;

/** Status AttendanceRecord sesuai docs/DATA_MODEL_DRAFT.md §8. */
export const ATTENDANCE_STATUSES = [
  "present",
  "sick",
  "excused",
  "absent",
  "late",
] as const;

/** Status realisasi jurnal sesuai docs/DATA_MODEL_DRAFT.md §9. */
export const JOURNAL_REALIZATION_STATUSES = [
  "done",
  "continued",
  "cancelled",
] as const;

/* ------------------------------------------------------------------ */
/*  Sprint 2 — Konstanta Kalender, Prota, Promes                     */
/* ------------------------------------------------------------------ */

/** Schema identifier untuk impor JSON kalender (AI → aplikasi). */
export const CALENDAR_IMPORT_SCHEMA = "guru-admin-flow/calendar/v1";

/** Schema identifier untuk impor JSON Prota (AI → aplikasi). */
export const PROTA_IMPORT_SCHEMA = "guru-admin-flow/prota/v1";

/** Schema identifier untuk impor JSON ATP/TP (AI → aplikasi). */
export const ATP_IMPORT_SCHEMA = "guru-admin-flow/atp/v1";

/**
 * Default JP intrakurikuler per minggu untuk PPKn SMP.
 * Lihat docs/SPRINT_2_DESIGN.md §0 CRITICAL PROMES RULE.
 *
 * PPKn SMP: 108 JP/tahun = 72 intra + 36 KO
 * Per minggu (18 minggu efektif/semester): 2 JP intra + 1 JP KO = 3 JP total
 *
 * Yang dipakai untuk distribusi MATERI Promes = intraJpPerWeek (2), BUKAN total 3.
 */
export const DEFAULT_INTRA_JP_PER_WEEK_PPKN = 2;

/** Default JP kokurikuler per minggu untuk PPKn SMP. Row terpisah, BUKAN materi. */
export const DEFAULT_KO_JP_PER_WEEK_PPKN = 1;

/**
 * Default cadangan JP untuk Promes.
 * Di-reserve dari INTRA capacity (bukan total 3 JP).
 * Lihat docs/SPRINT_2_DESIGN.md §0.3 implikasi #3.
 */
export const DEFAULT_CADANGAN_JP = 6;

/** Mode implementasi KO (hanya catatan, tidak ada perhitungan otomatis). */
export const KO_MODES = [
  "daily_block",
  "end_of_week",
  "end_of_semester",
] as const;

/** Label Indonesia untuk KO modes. */
export const KO_MODE_LABELS_ID: Record<(typeof KO_MODES)[number], string> = {
  daily_block: "blok harian",
  end_of_week: "blok akhir minggu",
  end_of_semester: "blok akhir semester",
};

/** Label Indonesia untuk CalendarEvent types (digunakan di UI kalender). */
export const CALENDAR_EVENT_TYPE_LABELS_ID: Record<(typeof CALENDAR_EVENT_TYPES)[number], string> = {
  learning: "KBM",
  assessment: "Asesmen",
  holiday: "Libur",
  school_activity: "Kegiatan Sekolah",
  remedial: "Remedial",
  report: "Rapor",
  cocurricular: "Kokurikuler",
};

/** Schema identifier untuk impor JSON jadwal dari Smart Roster. */
export const SCHEDULE_IMPORT_SCHEMA = "guru-admin-flow/schedule/v1";

/* ------------------------------------------------------------------ */
/*  Sprint 3 — Konstanta Jadwal Guru + Sesi Mengajar                  */
/* ------------------------------------------------------------------ */

/** Slot jam ke default (SMPN 8 Bantan). */
export const DEFAULT_PERIOD_TIMES: Array<{ period: number; start: string; end: string }> = [
  { period: 1, start: "07:00", end: "07:40" },
  { period: 2, start: "07:40", end: "08:20" },
  { period: 3, start: "08:20", end: "09:00" },
  { period: 4, start: "09:20", end: "10:00" },
  { period: 5, start: "10:00", end: "10:40" },
  { period: 6, start: "10:40", end: "11:20" },
  { period: 7, start: "11:20", end: "12:00" },
  { period: 8, start: "12:30", end: "13:10" },
  { period: 9, start: "13:10", end: "13:50" },
  { period: 10, start: "13:50", end: "14:30" },
];