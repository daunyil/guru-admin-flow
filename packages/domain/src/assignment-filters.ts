/**
 * Assignment filter helpers — strict filter per Data Mengajar.
 *
 * AUTO-DOCUMENT-ENGINE-RC1-PATCH-1: pastikan engine tidak mengambil
 * data dari guru/kelas/mapel/grade/semester lain.
 *
 * Semua function pure. Dipakai oleh AutoDocumentPage loader sebelum
 * pass data ke generateAdminDocumentPackage.
 */

import type { TeachingAssignment } from "./teaching-assignment";

/**
 * Derive grade dari classLabel.
 * Contoh: "VII A" → "VII", "VIII B" → "VIII", "IX C" → "IX".
 */
export function deriveGradeFromClassLabel(classLabel: string): string {
  const match = classLabel.match(/^(VIII|VII|IX|X|XI|XII)/i);
  return match ? match[1].toUpperCase() : "";
}

/**
 * Cek apakah subject cocok dengan assignment.
 */
export function matchesAssignmentSubject(
  subject: string | undefined,
  assignment: TeachingAssignment
): boolean {
  if (!subject) return false;
  return subject === assignment.subject;
}

/**
 * Cek apakah grade cocok dengan assignment.
 * Grade di-derive dari assignment.classLabel.
 */
export function matchesAssignmentGrade(
  grade: string | undefined,
  assignment: TeachingAssignment
): boolean {
  if (!grade) return false;
  const assignmentGrade = deriveGradeFromClassLabel(assignment.classLabel);
  return grade === assignmentGrade || grade === assignment.classLabel;
}

/**
 * Cek apakah classId cocok dengan assignment.
 * Bila classId kosong/undefined → dianggap umum untuk grade (return true).
 * Bila classId terisi → harus sama dengan assignment.classId.
 */
export function matchesAssignmentClassOptional(
  classId: string | undefined | null,
  assignment: TeachingAssignment
): boolean {
  if (!classId) return true; // umum untuk grade
  return classId === assignment.classId;
}

/**
 * Filter Prota untuk assignment.
 * Cocokkan: teacherId + subject + grade.
 */
export function filterProtaForAssignment<T extends {
  teacherId: string;
  subject: string;
  grade: string;
}>(
  protas: T[],
  assignment: TeachingAssignment
): T | null {
  const assignmentGrade = deriveGradeFromClassLabel(assignment.classLabel);
  return protas.find(
    (p) =>
      p.teacherId === assignment.teacherId &&
      p.subject === assignment.subject &&
      (p.grade === assignmentGrade || p.grade === assignment.classLabel)
  ) ?? null;
}

/**
 * Filter ATP entries untuk assignment.
 * Cocokkan: teacherId + subject + grade + classId (opsional).
 */
export function filterATPForAssignment<T extends {
  teacherId: string;
  subject: string;
  grade: string;
  classId?: string;
}>(
  entries: T[],
  assignment: TeachingAssignment
): T[] {
  const assignmentGrade = deriveGradeFromClassLabel(assignment.classLabel);
  return entries.filter(
    (e) =>
      e.teacherId === assignment.teacherId &&
      e.subject === assignment.subject &&
      (e.grade === assignmentGrade || e.grade === assignment.classLabel) &&
      (!e.classId || e.classId === assignment.classId)
  );
}

/**
 * Filter LKPD untuk assignment.
 * Cocokkan: teacherId + subject + grade + classId (opsional).
 */
export function filterLKPDForAssignment<T extends {
  teacherId: string;
  subject: string;
  grade: string;
  classId?: string;
}>(
  lkpds: T[],
  assignment: TeachingAssignment
): T[] {
  const assignmentGrade = deriveGradeFromClassLabel(assignment.classLabel);
  return lkpds.filter(
    (l) =>
      l.teacherId === assignment.teacherId &&
      l.subject === assignment.subject &&
      (l.grade === assignmentGrade || l.grade === assignment.classLabel) &&
      (!l.classId || l.classId === assignment.classId)
  );
}

/**
 * Filter RPP documents untuk assignment.
 * Bila assignmentId ada → harus sama.
 * Bila assignmentId kosong → cocokkan teacherId + subject + classLabel + semester.
 */
export function filterRppDocumentsForAssignment<T extends {
  teacherId: string;
  assignmentId?: string | null;
  subject?: string;
  classLabel?: string;
  semester?: 1 | 2;
}>(
  docs: T[],
  assignment: TeachingAssignment
): T[] {
  return docs.filter((d) => {
    // Guard: teacherId harus cocok
    if (d.teacherId !== assignment.teacherId) return false;

    // Bila RPP punya assignmentId, harus sama persis
    if (d.assignmentId) {
      return d.assignmentId === assignment.id;
    }

    // Bila tidak ada assignmentId, cocokkan by subject + classLabel + semester
    if (d.subject && d.subject !== assignment.subject) return false;
    if (d.classLabel && d.classLabel !== assignment.classLabel) return false;
    if (d.semester && d.semester !== assignment.semester) return false;

    return true;
  });
}

/**
 * Guard eksplisit untuk remedial/enrichment/semester report.
 * Bila field tersedia, pastikan cocok dengan assignment.
 */
export function matchesAssignmentContext<T extends {
  teacherId?: string;
  subject?: string;
  classId?: string;
  semester?: 1 | 2;
}>(
  item: T,
  assignment: TeachingAssignment
): boolean {
  if (item.teacherId && item.teacherId !== assignment.teacherId) return false;
  if (item.subject && item.subject !== assignment.subject) return false;
  if (item.classId && item.classId !== assignment.classId) return false;
  if (item.semester && item.semester !== assignment.semester) return false;
  return true;
}
