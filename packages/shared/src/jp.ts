/**
 * Util hitung Jam Pelajaran (JP).
 * Sumber: docs/DATA_MODEL_DRAFT.md §5 (ProtaProfile)
 */

/**
 * Mendapatkan total JP dari daftar unit.
 */
export function sumJP(units: { jp: number }[]): number {
  return units.reduce((total, u) => total + (Number(u.jp) || 0), 0);
}

/**
 * Memvalidasi apakah total JP semester sesuai dengan target.
 * Lihat docs/DATA_MODEL_DRAFT.md §14.1 (validasi sebelum Promes ready_for_review).
 *
 * @returns status: "valid" | "needs_fix" dan selisih (target - actual)
 */
export function validateJPTotal(
  targetJP: number,
  units: { jp: number }[]
): { status: "valid" | "needs_fix"; actual: number; target: number; diff: number } {
  const actual = sumJP(units);
  const diff = targetJP - actual;
  return {
    status: diff === 0 ? "valid" : "needs_fix",
    actual,
    target: targetJP,
    diff,
  };
}

/**
 * Memvalidasi konsistensi total JP tahunan = semester1 + semester2.
 */
export function validateAnnualConsistency(
  annual: number,
  semester1: number,
  semester2: number
): { status: "valid" | "warning"; sum: number; diff: number } {
  const sum = semester1 + semester2;
  const diff = annual - sum;
  return {
    status: diff === 0 ? "valid" : "warning",
    sum,
    diff,
  };
}

/**
 * Hitung rata-rata JP per minggu efektif.
 */
export function jpPerWeek(totalJP: number, effectiveWeeks: number): number {
  if (effectiveWeeks <= 0) return 0;
  return Math.round((totalJP / effectiveWeeks) * 10) / 10;
}

/**
 * Format label JP: "2 JP", "1 JP", "0 JP".
 */
export function formatJP(jp: number): string {
  return `${jp} JP`;
}
