/**
 * PIKET-UI-V2: Opsi B (Segmented Switcher)
 * Dua mode utama: Catat (lapangan) & Rekap (meja).
 * Rekap memiliki 4 sub-tab.
 */

export type MainView = "catat" | "rekap";

export type RekapSubTab = "presensi" | "catatan" | "poin" | "cetak";

/** Legacy — kept for backward compat during migration */
export type Tab = "catat" | "rekap" | "catatan" | "poin" | "cetak";
