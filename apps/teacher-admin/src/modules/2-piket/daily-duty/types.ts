/**
 * PIKET-REDESIGN: 3 tab utama — Laporkan, Catatan, Riwayat.
 *
 * Tab 1 — Laporkan: catat pelanggaran siswa (lapangan, express)
 * Tab 2 — Catatan: ringkasan hari ini + kehadiran + finalize
 * Tab 3 — Riwayat: riwayat pelanggaran siswa setahun + surat
 */

export type MainView = "laporkan" | "catatan" | "riwayat";

/** Threshold warning data — muncul setelah simpan jika poin >= threshold */
export interface ThresholdWarning {
  studentName: string;
  classLabel: string;
  newPoints: number;
  totalPoints: number;
  /** SP level: "sp1" (50+), "sp2" (75+), "sp3" (100+) */
  thresholdLevel: "sp1" | "sp2" | "sp3";
  studentId: string;
  classId: string;
}
