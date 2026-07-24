/**
 * Types and constants for Paket Administrasi Guru.
 */

type DocStatus = "lengkap" | "belum" | "kosong";

/** Kategori untuk grouping dokumen di checklist. */
type DocCategory =
  | "perencanaan"   // Prota, Promes, ATP, Kalender, Jadwal
  | "harian"         // Roster, Absensi, Jurnal
  | "evaluasi"       // Nilai, Remedial, Pengayaan
  | "dokumen"        // LKPD, RPP
  | "laporan";       // Laporan Akhir Semester

type DocItem = {
  id: string;
  name: string;
  category: DocCategory;
  status: DocStatus;
  detail: string;
  link: string;
  count: number;
  /** Label tombol aksi: "Buka" / "Buat" / "Generate". */
  actionLabel?: string;
  /** Detail tambahan untuk expand (mis. list siswa remedial). */
  expandDetails?: string[];
  /** Apakah item ini bisa di-generate dari app (bukan input manual). */
  autoGeneratable?: boolean;
};

const CATEGORY_LABELS: Record<DocCategory, string> = {
  perencanaan: "Perencanaan",
  harian: "Harian",
  evaluasi: "Evaluasi",
  dokumen: "Dokumen Pembelajaran",
  laporan: "Laporan",
};

const CATEGORY_ORDER: DocCategory[] = ["perencanaan", "harian", "evaluasi", "dokumen", "laporan"];

export type { DocStatus, DocCategory, DocItem };
export { CATEGORY_LABELS, CATEGORY_ORDER };
