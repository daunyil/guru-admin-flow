/**
 * NAV-DAILY-GATE-01: Konfigurasi navigasi yang diekstrak supaya testable.
 *
 * Menu utama hanya 5 item kerja harian:
 *   Absen, Jurnal, Nilai, Guru Piket, Laporan Tahunan
 *
 * Semua modul lain (Prota, Promes, RPP, LKPD, dll) disembunyikan dari sidebar
 * dan hanya bisa diakses dari halaman Laporan Tahunan.
 */

import { FEATURE_FLAGS } from "@guru-admin/shared";
import {
  CheckCircle, BookOpen, FileSpreadsheet, ClipboardList, BookMarked,
} from "./icons";

export interface NavItem {
  to: string;
  label: string;
  icon: typeof CheckCircle;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

/** Sidebar desktop — hanya 2 grup: Harian + Laporan */
export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Harian",
    items: [
      { to: "/attendance", label: "Absen", icon: CheckCircle },
      { to: "/journal", label: "Jurnal", icon: BookOpen },
      { to: "/grades", label: "Nilai", icon: FileSpreadsheet },
      ...(FEATURE_FLAGS.dailyDuty
        ? [{ to: "/piket", label: "Guru Piket", icon: ClipboardList }]
        : []),
    ],
  },
  {
    title: "Laporan",
    items: [
      { to: "/admin-package", label: "Laporan Tahunan", icon: BookMarked },
    ],
  },
];

/** Mobile bottom nav — maksimal 5 item, tidak ada "Lainnya" */
export const MOBILE_PRIMARY: NavItem[] = [
  { to: "/attendance", label: "Absen", icon: CheckCircle },
  { to: "/journal", label: "Jurnal", icon: BookOpen },
  { to: "/grades", label: "Nilai", icon: FileSpreadsheet },
  ...(FEATURE_FLAGS.dailyDuty
    ? [{ to: "/piket", label: "Piket", icon: ClipboardList }]
    : []),
  { to: "/admin-package", label: "Laporan", icon: BookMarked },
];

/** Helper untuk test: daftar label menu utama */
export function getPrimaryNavLabels(): string[] {
  return [...NAV_GROUPS[0].items, ...NAV_GROUPS[1].items].map((i) => i.label);
}

/** Helper untuk test: daftar label mobile nav */
export function getMobileNavLabels(): string[] {
  return MOBILE_PRIMARY.map((i) => i.label);
}

/**
 * NAV-DAILY-GATE-01: Kartu gerbang di Laporan Tahunan.
 * Semua modul yang disembunyikan dari sidebar, tampilkan sebagai kartu di sini.
 */
export interface GateCard {
  id: string;
  label: string;
  to: string;
  description: string;
}

export interface GateGroup {
  title: string;
  cards: GateCard[];
}

export const GATE_GROUPS: GateGroup[] = [
  {
    title: "A. Data Dasar",
    cards: [
      { id: "profile", label: "Profil Sekolah/Guru", to: "/profile", description: "Identitas sekolah dan guru" },
      { id: "new-year", label: "Tahun Pelajaran", to: "/new-year", description: "Buat tahun pelajaran baru" },
      { id: "assignments", label: "Kelas dan Mapel", to: "/assignments", description: "Kelola kelas dan mata pelajaran" },
      { id: "roster", label: "Siswa", to: "/roster", description: "Daftar siswa per kelas" },
      { id: "backup", label: "Backup/Restore", to: "/backup", description: "Export/import data JSON" },
    ],
  },
  {
    title: "B. Perencanaan",
    cards: [
      { id: "calendar", label: "Kalender Pendidikan", to: "/calendar", description: "Kalender semester" },
      { id: "prota", label: "Prota", to: "/prota", description: "Program Tahunan" },
      { id: "promes", label: "Promes", to: "/promes", description: "Program Semester" },
      { id: "schedule", label: "Jadwal", to: "/schedule", description: "Jadwal mengajar + generate sesi" },
      { id: "atp", label: "Bank TP", to: "/atp", description: "Tujuan Pembelajaran" },
    ],
  },
  {
    title: "C. Dokumen Ajar",
    cards: [
      { id: "rpp", label: "RPP / Modul Ajar", to: "/rpp", description: "Rencana pelaksanaan pembelajaran" },
      { id: "rpp-bulk", label: "Perbarui Identitas Dokumen", to: "/rpp-bulk", description: "Ganti identitas DOCX/teks massal" },
      { id: "lkpd", label: "LKPD", to: "/lkpd", description: "Lembar Kerja Peserta Didik" },
    ],
  },
  {
    title: "D. Evaluasi dan Tindak Lanjut",
    cards: [
      { id: "evaluation-docs", label: "Perangkat Penilaian", to: "/evaluation-docs", description: "Kisi-kisi, kartu soal, naskah" },
      { id: "remedial", label: "Remedial", to: "/remedial", description: "Program remedial" },
      { id: "pengayaan", label: "Pengayaan", to: "/pengayaan", description: "Program pengayaan" },
      { id: "grades", label: "Nilai", to: "/grades", description: "Daftar nilai KD1-KD6" },
      { id: "semester-report", label: "Laporan Semester", to: "/semester-report", description: "Laporan akhir semester" },
    ],
  },
  {
    title: "E. Integrasi",
    cards: [
      { id: "apps-script-import", label: "Import dari HP", to: "/apps-script-import", description: "Import data dari Apps Script" },
      { id: "auto-document", label: "Auto Document", to: "/auto-document", description: "Generate paket dokumen" },
      { id: "completeness", label: "Cek Kelengkapan", to: "/completeness", description: "Cek kelengkapan administrasi" },
    ],
  },
];
