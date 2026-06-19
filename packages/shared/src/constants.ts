/**
 * Konstanta global aplikasi Guru Admin Flow.
 * Sumber otoritas: docs/DATA_MODEL_DRAFT.md §0
 */

export const APP_NAME = "Guru Admin Flow";
export const APP_VERSION = "0.1.0-sprint1";

/**
 * Versi skema data. Wajib dinaikkan setiap kali struktur data berubah
 * secara breaking. Backup JSON wajib menyertakan schemaVersion dan
 * restore wajib memvalidasi bahwa schemaVersion <= DATA_SCHEMA_VERSION.
 *
 * Lihat docs/TECHNICAL_PLAN.md §6.1 (format backup) dan §6.3 (validasi impor).
 */
export const DATA_SCHEMA_VERSION = 1;

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
] as const;

/** Status realisasi jurnal sesuai docs/DATA_MODEL_DRAFT.md §9. */
export const JOURNAL_REALIZATION_STATUSES = [
  "done",
  "continued",
  "cancelled",
] as const;
