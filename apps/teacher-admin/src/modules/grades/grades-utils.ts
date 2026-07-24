/**
 * Pure utility: score columns based on gradeModel and uhCount.
 */
import type { GradeEntry } from "@guru-admin/domain";

/** Kolom nilai yang bisa diisi, dinamis berdasarkan gradeModel dan uhCount. */
export function getScoreColumns(
  gradeModel: "kd" | "uh",
  uhCount: number,
): Array<{ key: keyof GradeEntry; label: string; width: string }> {
  if (gradeModel === "uh") {
    const cols: Array<{ key: keyof GradeEntry; label: string; width: string }> = [];
    for (let i = 1; i <= Math.min(uhCount, 6); i++) {
      cols.push({ key: `kd${i}` as keyof GradeEntry, label: `UH${i}`, width: "w-16" });
    }
    cols.push({ key: "pts", label: "UTS", width: "w-16" });
    cols.push({ key: "pas", label: "UAS", width: "w-16" });
    return cols;
  }
  return [
    { key: "kd1", label: "KD1", width: "w-16" },
    { key: "kd2", label: "KD2", width: "w-16" },
    { key: "kd3", label: "KD3", width: "w-16" },
    { key: "kd4", label: "KD4", width: "w-16" },
    { key: "kd5", label: "KD5", width: "w-16" },
    { key: "kd6", label: "KD6", width: "w-16" },
    { key: "pts", label: "PTS", width: "w-16" },
    { key: "pas", label: "PAS", width: "w-16" },
  ];
}
