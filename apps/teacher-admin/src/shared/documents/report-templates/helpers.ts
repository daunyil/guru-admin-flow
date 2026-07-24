import type { ReactNode } from "react";
import type {
  DocumentContext,
  AdminPackageItem,
  GradeKdColumn,
  PromesWeekColumn,
} from "./types";

export function upper(value?: string, fallback = "Belum tersedia"): string {
  return value ? value.toUpperCase() : fallback;
}

/** Predikat otomatis: A (≥90), B (80–89), C (70–79), D (<70) */
export function predikat(na: number | string | null | undefined): string {
  if (na === null || na === undefined) return "—";
  const num = typeof na === "string" ? parseFloat(na) : na;
  if (isNaN(num as number)) return "—";
  if (num >= 90) return "A";
  if (num >= 80) return "B";
  if (num >= 70) return "C";
  return "D";
}

/** Helper: parse numeric value, returns NaN for non-numbers */
export function numVal(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return NaN;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return typeof n === "number" && !isNaN(n) ? n : NaN;
}

/** Helper: compute average of numeric values, skip NaN */
export function avgVals(vals: number[]): number {
  const valid = vals.filter((v) => !isNaN(v));
  return valid.length > 0 ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0;
}

/** Format tanggal ke Bahasa Indonesia (misal: Senin, 14 Jul 2025).
 *  Accepts ISO date string (yyyy-mm-dd) or free-form string. */
export function formatDateID(dateStr?: string): string {
  if (!dateStr) return "—";
  // Try parsing as ISO date
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agust", "Sep", "Okt", "Nov", "Des"];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }
  // Not ISO — return as-is
  return dateStr;
}

/** Format rekap absensi harian singkat (misal: S:1, I:0, A:0) */
export function formatAbsSummary(summary?: { sick?: number; excused?: number; absent?: number }): string {
  if (!summary) return "—";
  return `S:${summary.sick ?? 0}, I:${summary.excused ?? 0}, A:${summary.absent ?? 0}`;
}

export function formatPlaceDate(context?: DocumentContext): string {
  const place = context?.place || "................";
  const date = context?.dateLabel || "........................";
  return `${place}, ${date}`;
}

export function makeIdentityRows(context?: DocumentContext, extraRows: Array<{ label: string; value?: ReactNode }> = []) {
  return [
    { label: "Nama Sekolah", value: context?.schoolName },
    { label: "Tahun Pelajaran", value: context?.academicYear },
    { label: "Nama Guru", value: context?.teacherName },
    { label: "Semester", value: context?.semester },
    { label: "Mata Pelajaran", value: context?.subject },
    { label: "Kelas", value: context?.classLabel },
    ...extraRows,
  ];
}

export function statusTone(status?: AdminPackageItem["status"]) {
  if (status === "complete") return "complete";
  if (status === "draft") return "warning";
  if (status === "missing") return "danger";
  return "incomplete";
}

export function statusText(status?: AdminPackageItem["status"]) {
  if (status === "complete") return "Lengkap";
  if (status === "draft") return "Draft";
  if (status === "missing") return "Belum Ada";
  return "Belum Lengkap";
}

export function defaultKdColumns(): GradeKdColumn[] {
  return [
    { id: "kd1", label: "KD 1" },
    { id: "kd2", label: "KD 2" },
    { id: "kd3", label: "KD 3" },
    { id: "kd4", label: "KD 4" },
    { id: "kd5", label: "KD 5" },
    { id: "kd6", label: "KD 6" },
  ];
}

export function defaultPromesWeeks(): PromesWeekColumn[] {
  return [
    ...["1", "2", "3", "4", "5"].map((week) => ({ month: "Juli", week })),
    ...["1", "2", "3", "4"].map((week) => ({ month: "Agustus", week })),
    ...["1", "2", "3", "4"].map((week) => ({ month: "September", week })),
    ...["1", "2", "3", "4", "5"].map((week) => ({ month: "Oktober", week })),
    ...["1", "2", "3", "4"].map((week) => ({ month: "November", week })),
    ...["1", "2", "3", "4", "5"].map((week) => ({ month: "Desember", week })),
  ];
}
