import type { TeachingJournal } from "@guru-admin/domain";

export type RealizationStatus = TeachingJournal["realizationStatus"];

export const REALIZATION_OPTIONS: Array<{ value: RealizationStatus; label: string }> = [
  { value: "done", label: "Selesai" },
  { value: "continued", label: "Dilanjutkan" },
  { value: "cancelled", label: "Tidak Terlaksana" },
];

export type JournalMode = "pertemuan" | "manual" | "susulan";
