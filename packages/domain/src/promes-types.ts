/**
 * Tipe data untuk engine Promes.
 * Sumber: docs/SPRINT_2_DESIGN.md §5.2
 *
 * Penting: type ini mengikuti §0 CRITICAL PROMES RULE:
 *   - Material capacity pakai INTRA JP (bukan total 3 JP)
 *   - KO tampil sebagai row terpisah, TIDAK mengurangi materialCapacityJP
 *   - Cadangan dari INTRA capacity, tidak boleh membuat materialCapacityJP negatif
 */

import type { ProtaProfile } from "./prota";
import type { CalendarEvent } from "./calendar-event";
import type { AcademicYear } from "./academic-year";

/** Mode implementasi KO (hanya catatan, tidak ada perhitungan otomatis). */
export type KOMode = "daily_block" | "end_of_week" | "end_of_semester";

/**
 * Opsi untuk generatePromes.
 * Lihat docs/SPRINT_2_DESIGN.md §5.2.
 */
export type PromesOptions = {
  /**
   * JP intrakurikuler per minggu untuk distribusi MATERI.
   * Default: 2 (PPKn — sesuai §0.1: 2 JP intra + 1 JP KO = 3 JP/minggu).
   * Untuk mapel lain: user input manual (tidak di-hardcode).
   */
  intraJpPerWeek: number;

  /**
   * JP kokurikuler per minggu — tampil sebagai ROW TERPISAH, BUKAN bagian
   * kapasitas materi. Default: 1 (PPKn). Bisa 0 bila mapel tidak punya KO.
   */
  koJpPerWeek: number;

  /**
   * Cadangan JP — di-reserve dari INTRA capacity, bukan dari total.
   * Default: 6 (untuk asesmen, remedial, pengayaan, penyesuaian kegiatan sekolah).
   * Bisa diedit guru. Tidak boleh membuat materialCapacityJP negatif.
   */
  cadanganJP: number;

  /** Cadangan di-reserve dari minggu terakhir ke depan. Default: true. */
  reserveFromEnd: boolean;

  /** Mode KO (hanya catatan). Default: "daily_block". */
  koMode?: KOMode;
};

/** Hasil generate Promes per minggu. */
export type PromesWeek = {
  weekNumber: number;       // 1, 2, 3, ...
  startDate: string;        // ISO date (Senin minggu itu)
  endDate: string;          // ISO date (Minggu minggu itu)
  isEffective: boolean;     // true bila ada event "learning" dan tidak diblokir
  blockReason?: string;     // bila isEffective=false, alasan (holiday label, etc.)

  // Intra (material) capacity
  intraCapacityJP: number;       // bila effective: intraJpPerWeek, bila tidak: 0
  reservedForCadangan: number;   // JP intra yang di-reserve untuk cadangan minggu ini
  availableForMaterial: number;  // intraCapacityJP - reservedForCadangan

  // KO capacity (row terpisah, tidak mengurangi material)
  koJP: number;                  // bila effective: koJpPerWeek, bila tidak: 0

  // Material assigned to this week
  assignedUnits: Array<{
    unitId: string;
    title: string;
    jp: number;
  }>;
};

/** Row KO terpisah per minggu efektif (BUKAN bagian distribusi materi). */
export type KORow = {
  weekNumber: number;
  date: string;          // ISO date (start of week)
  jp: number;            // koJpPerWeek
  mode: KOMode;
  label: string;         // "Alokasi kokurikuler: 1 JP/minggu (blok harian)"
};

/** Status distribusi per ProtaUnit (materi). */
export type UnitDistribution = {
  unitId: string;
  title: string;
  totalJP: number;
  distributedJP: number;
  undistributedJP: number;
  weeks: number[]; // weekNumber tempat unit ini diajar
  status: "fully_distributed" | "partially_distributed" | "not_distributed";
};

/** Ringkasan hasil generate Promes. */
export type PromesSummary = {
  totalWeeks: number;
  effectiveWeeks: number;

  // Intra (material) — sesuai §0
  intraCapacityJP: number;     // effectiveWeeks × intraJpPerWeek
  cadanganJP: number;
  materialCapacityJP: number;  // intraCapacityJP - cadanganJP (TIDAK boleh negatif)
  totalUnitJP: number;         // sum of ProtaUnit.jp untuk semester ini
  distributedJP: number;
  undistributedJP: number;

  // KO — row terpisah, tidak mempengaruhi material
  koTotalJP: number;           // effectiveWeeks × koJpPerWeek

  allocationStatus: "tepat" | "cukup" | "kurang";
  // tepat: materialCapacityJP === totalUnitJP
  // cukup: materialCapacityJP > totalUnitJP (ada sisa untuk kegiatan lain)
  // kurang: materialCapacityJP < totalUnitJP (materi tidak muat)
};

/** Hasil lengkap generate Promes. */
export type PromesResult = {
  weeks: PromesWeek[];
  distribution: UnitDistribution[];  // per ProtaUnit (materi only)
  koRows: KORow[];                    // row KO terpisah per minggu efektif
  summary: PromesSummary;
  status: "valid" | "needs_fix";
  warnings: string[];
  errors: string[];
};

/** Input untuk generatePromes. */
export type GeneratePromesInput = {
  prota: ProtaProfile;
  academicYear: AcademicYear;
  calendar: CalendarEvent[];
  semester: 1 | 2;
  options: PromesOptions;
};
