import { DAY_LABELS_ID_SHORT, MONTH_LABELS_ID_SHORT } from "@guru-admin/shared";
import type { StructuredNoteCategory } from "./types";

/** Structured note categories — 4 tabs for progressive disclosure */
export const STRUCTURED_NOTE_CATEGORIES = [
  { key: "activities", label: "Aktivitas", icon: "🎯" },
  { key: "studentResponse", label: "Respons", icon: "💡" },
  { key: "obstacle", label: "Hambatan", icon: "⚠️" },
  { key: "followUp", label: "Tindak Lanjut", icon: "🚀" },
] as const;

/** Quick choices for each structured note category */
export const STRUCTURED_CHIPS: Record<StructuredNoteCategory, readonly string[]> = {
  activities: [
    "Diskusi Kelompok", "Presentasi", "Ceramah", "Latihan",
    "Kuis", "Tanya Jawab", "Praktik", "Project",
  ] as const,
  studentResponse: [
    "Aktif", "Cukup aktif", "Masih pasif", "Perlu bimbingan", "Antusias",
  ] as const,
  obstacle: [
    "Sebagian siswa belum memahami materi", "Waktu pembelajaran terbatas",
    "Sebagian siswa belum aktif", "Tidak ada kendala berarti",
  ] as const,
  followUp: [
    "Penguatan materi", "Latihan tambahan", "Bimbingan individu",
    "Remedial ringan", "Dilanjutkan pertemuan berikutnya",
  ] as const,
};

/** Realization status options */
export const REALIZATION_STATUS_OPTIONS = [
  { value: "done" as const, label: "Terlaksana", color: "emerald" },
  { value: "continued" as const, label: "Diganti", color: "amber" },
  { value: "cancelled" as const, label: "Tidak Terlaksana", color: "rose" },
] as const;

/** Nilai type options — each value maps to a GradeEntry field */
export const NILAI_TYPE_OPTIONS = [
  { value: "uh1", label: "Ulangan Harian 1 (UH-1)" },
  { value: "uh2", label: "Ulangan Harian 2 (UH-2)" },
  { value: "uh3", label: "Ulangan Harian 3 (UH-3)" },
  { value: "pts", label: "Penilaian Tengah Semester (PTS)" },
  { value: "pas", label: "Penilaian Akhir Semester (PAS)" },
] as const;

/** 4a: Map nilaiType selector value → GradeEntry field key */
export const NILAI_TYPE_TO_FIELD: Record<string, string> = {
  uh1: "uh1", uh2: "uh2", uh3: "uh3",
  uh4: "uh4", uh5: "uh5", uh6: "uh6",
  uh7: "uh7", uh8: "uh8", uh9: "uh9", uh10: "uh10",
  pts: "pts", pas: "pas", uts: "uts", uas: "uas",
};

/** 5a: Format session date for dropdown — "Sen, 15 Jul" */
export function formatSessionDateLabel(iso: string): string {
  if (!iso || iso.length < 10) return "-";
  try {
    const date = new Date(
      parseInt(iso.slice(0, 4)),
      parseInt(iso.slice(5, 7)) - 1,
      parseInt(iso.slice(8, 10))
    );
    const dayIdx = date.getDay() === 0 ? 7 : date.getDay();
    const dayShort = DAY_LABELS_ID_SHORT[dayIdx] ?? "?";
    const day = date.getDate();
    const monthShort = MONTH_LABELS_ID_SHORT[date.getMonth() + 1] ?? "?";
    return `${dayShort}, ${day} ${monthShort}`;
  } catch {
    return iso.slice(5);
  }
}
