/**
 * NAV-MODULE-REORG-01: Navigasi sidebar yang mencerminkan 5 module groups.
 *
 * Structure:
 *   1-harian   → Absensi, Jurnal, Nilai, Rekap Semester (operasional harian per mapel)
 *   2-piket    → Guru Piket (supervisi harian per kelas/sekolah)
 *   3-admin    → Paket Admin gate (document generator per semester)
 *   4-integrasi→ Pusat Laporan (cross-module reporting)
 *   5-data     → Profil, Kelas & Mapel (master data)
 *
 * Sidebar: 3 modul utama (Harian, Piket, Admin) + Data Dasar + Integrasi.
 * Gate Groups: sub-modul Administrasi via Paket Admin page.
 *
 * FORMAT-REF: Format absen & nilai dari SMPN 8 Bantan:
 *   - Absen: Landscape matriks 31 kolom tanggal + rekap (ALPA/SAKIT/IZIN/JLH)
 *   - Nilai: Landscape PA (Ulangan 10 KD + Tugas 10 KD) + PTS + PAS
 *   - Kedua format berorientasi LANDSCAPE untuk cetak/print
 */

import { FEATURE_FLAGS } from "@guru-admin/shared";
import {
  FileSpreadsheet,
  ClipboardList,
  BookMarked,
  Home,
  Library,
  BarChart3,
  PieChart,
  Settings,
  Zap,
} from "./icons";

export interface NavItem {
  to: string;
  label: string;
  icon: typeof Zap;
  badge?: string;         // e.g. "Sprint 4", "New"
  badgeVariant?: "info" | "success" | "warning";
}

export interface NavGroup {
  title: string;
  items: NavItem[];
  collapsible?: boolean;  // future: collapsible sidebar groups
}

/* ------------------------------------------------------------------ */
/*  Sidebar Desktop — 3 modul utama + Data Dasar + Integrasi           */
/*  Group numbering matches code: 1-harian, 2-piket, 3-administrasi    */
/* ------------------------------------------------------------------ */

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Menu Utama",
    items: [
      { to: "/", label: "Hari Ini", icon: Home },
    ],
  },
  {
    title: "1 · Harian Guru",
    items: [
      // UNIFIED KBM: 1 halaman untuk semua (Dashboard + Presensi + Jurnal + Nilai)
      // Absen/Jurnal/Nilai dihapus — semua ada di dalam KBM
      { to: "/kbm-hub", label: "KBM", icon: Zap, badge: "New", badgeVariant: "info" },
      { to: "/grades", label: "Nilai", icon: FileSpreadsheet },
      { to: "/rekap-semester", label: "Rekap Semester", icon: BarChart3 },
    ],
  },
  {
    title: "2 · Piket",
    items: [
      ...(FEATURE_FLAGS.dailyDuty
        ? [{ to: "/piket", label: "Guru Piket", icon: ClipboardList }]
        : []),
    ],
  },
  {
    title: "3 · Administrasi",
    items: [
      { to: "/admin-package", label: "Paket Admin", icon: BookMarked },
    ],
  },
  {
    title: "Data Dasar",
    items: [
      { to: "/profile", label: "Profil", icon: Settings },
      { to: "/assignments", label: "Kelas & Mapel", icon: Library },
    ],
  },
  {
    title: "Integrasi",
    items: [
      { to: "/report-center", label: "Pusat Laporan", icon: PieChart },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Mobile Bottom Nav — maksimal 5 item                                */
/*  Priority: daily operations (Home, Absen, Jurnal, Nilai) + Piket    */
/* ------------------------------------------------------------------ */

export const MOBILE_PRIMARY: NavItem[] = [
  { to: "/", label: "Home", icon: Home },
  // UNIFIED KBM: 1 tombol untuk semua kebutuhan KBM
  { to: "/kbm-hub", label: "KBM", icon: Zap },
  { to: "/grades", label: "Nilai", icon: FileSpreadsheet },
  ...(FEATURE_FLAGS.dailyDuty
    ? [{ to: "/piket", label: "Piket", icon: ClipboardList }]
    : []),
];

export function getPrimaryNavLabels(): string[] {
  return [...NAV_GROUPS[0].items, ...NAV_GROUPS[1].items].map((i) => i.label);
}

export function getMobileNavLabels(): string[] {
  return MOBILE_PRIMARY.map((i) => i.label);
}

/* ------------------------------------------------------------------ */
/*  Gate Groups — Kartu di halaman Paket Administrasi Guru             */
/*  Reflects 3-administrasi sub-domain + integrasi + data dasar        */
/* ------------------------------------------------------------------ */

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
      { id: "semester-report", label: "Laporan Semester", to: "/semester-report", description: "Laporan akhir semester" },
      { id: "lainnya", label: "Dokumen Lainnya", to: "/lainnya", description: "Surat, catatan, dokumen administrasi lain" },
    ],
  },
  {
    title: "E. Integrasi",
    cards: [
      { id: "apps-script-import", label: "Import dari HP", to: "/apps-script-import", description: "Import data dari Apps Script" },
      { id: "auto-document", label: "Auto Document", to: "/auto-document", description: "Generate paket dokumen" },
      { id: "completeness", label: "Cek Kelengkapan", to: "/completeness", description: "Cek kelengkapan administrasi" },
      { id: "report-center", label: "Pusat Laporan", to: "/report-center", description: "Cetak laporan piket, absensi, nilai, jurnal" },
    ],
  },
];
