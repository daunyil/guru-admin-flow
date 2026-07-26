/**
 * Pure utility: score columns based on gradeModel, uhCount, kdCount.
 * V4: Added "pa-split" model support and extend max columns to 10.
 */
import type { GradeEntry } from "@guru-admin/domain";

export type GradeModelType = "kd" | "uh" | "pa-split";

/** Kolom nilai yang bisa diisi, dinamis berdasarkan gradeModel dan uhCount/kdCount. */
export function getScoreColumns(
  gradeModel: GradeModelType,
  uhCount: number,
  kdCount?: number,
): Array<{ key: keyof GradeEntry; label: string; width: string; group?: string }> {
  const effectiveKdCount = kdCount ?? 6;

  if (gradeModel === "uh") {
    const cols: Array<{ key: keyof GradeEntry; label: string; width: string; group?: string }> = [];
    for (let i = 1; i <= Math.min(uhCount, 10); i++) {
      cols.push({ key: `uh${i}` as keyof GradeEntry, label: `UH${i}`, width: "w-14" });
    }
    cols.push({ key: "uts", label: "UTS", width: "w-14" });
    cols.push({ key: "uas", label: "UAS", width: "w-14" });
    return cols;
  }

  if (gradeModel === "pa-split") {
    // PA-split: Ulangan + Tugas per KD (2×kdCount columns) + PTS + PAS
    const cols: Array<{ key: keyof GradeEntry; label: string; width: string; group?: string }> = [];
    for (let i = 1; i <= Math.min(effectiveKdCount, 10); i++) {
      // Ulangan per KD — stored in uh1-uh10 fields
      cols.push({ key: `uh${i}` as keyof GradeEntry, label: `U${i}`, width: "w-12", group: "Ulangan" });
    }
    for (let i = 1; i <= Math.min(effectiveKdCount, 10); i++) {
      // Tugas per KD — stored in kd1-kd10 fields (reused for this model)
      cols.push({ key: `kd${i}` as keyof GradeEntry, label: `T${i}`, width: "w-12", group: "Tugas" });
    }
    cols.push({ key: "pts", label: "PTS", width: "w-14" });
    cols.push({ key: "pas", label: "PAS", width: "w-14" });
    return cols;
  }

  // KD model: KD1-KDn + PTS + PAS
  const cols: Array<{ key: keyof GradeEntry; label: string; width: string; group?: string }> = [];
  for (let i = 1; i <= Math.min(effectiveKdCount, 10); i++) {
    cols.push({ key: `kd${i}` as keyof GradeEntry, label: `KD${i}`, width: "w-14" });
  }
  cols.push({ key: "pts", label: "PTS", width: "w-14" });
  cols.push({ key: "pas", label: "PAS", width: "w-14" });
  return cols;
}
