/**
 * ContextCard helper — format context info untuk ditampilkan di UI.
 *
 * APP-USABLE-RC1 Issue 3: semua layar kerja wajib punya kartu konteks
 * yang menampilkan: Guru, Mapel, Kelas, Semester, Tahun Pelajaran.
 *
 * Pure formatting helpers — caller tetap yang render React-nya.
 */

import type {
  TeachingAssignment,
  AcademicYear,
} from "./index";

export type ContextInfo = {
  teacherName: string;
  subject: string;
  classLabel: string;
  semester: 1 | 2;
  academicYearLabel: string;
};

/**
 * Build ContextInfo dari assignment + academicYear.
 */
export function buildContextInfo(args: {
  assignment: TeachingAssignment;
  academicYear: AcademicYear;
}): ContextInfo {
  return {
    teacherName: args.assignment.teacherName,
    subject: args.assignment.subject,
    classLabel: args.assignment.classLabel,
    semester: args.assignment.semester,
    academicYearLabel: args.academicYear.label,
  };
}

/**
 * Format context info jadi string satu baris.
 * Contoh: "Emi Ramdani · PPKn · VII A · Sem 1 · TP 2025/2026"
 */
export function formatContextLine(info: ContextInfo): string {
  return [
    info.teacherName,
    info.subject,
    info.classLabel,
    `Sem ${info.semester}`,
    `TP ${info.academicYearLabel}`,
  ].join(" · ");
}

/**
 * Format context info jadi array pasangan label-value
 * untuk render grid.
 */
export function contextEntries(info: ContextInfo): Array<{ label: string; value: string }> {
  return [
    { label: "Guru", value: info.teacherName },
    { label: "Mapel", value: info.subject },
    { label: "Kelas", value: info.classLabel },
    { label: "Semester", value: String(info.semester) },
    { label: "Tahun Pelajaran", value: info.academicYearLabel },
  ];
}
