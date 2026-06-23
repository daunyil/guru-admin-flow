/**
 * AdminDocumentPackage — paket administrasi guru per Data Mengajar.
 *
 * AUTO-DOCUMENT-ENGINE-RC1: engine yang membaca semua data terkait
 * assignment dan menghasilkan summary kelengkapan + daftar dokumen.
 *
 * Pure function: tidak baca dari Dexie. Caller wajib provide semua data.
 * Engine hanya mengolah data yang diberikan menjadi struktur paket.
 */

import type {
  TeachingAssignment,
  LessonSession,
  AttendanceRecord,
  TeachingJournal,
  GradeBook,
  ATPEntry,
  LKPD,
  RppDocument,
  RemedialProgram,
  EnrichmentProgram,
  SemesterReport,
  ClassRoster,
  ProtaProfile,
} from "./index";

/** Status satu dokumen dalam paket. */
export type DocAvailability = "available" | "draft" | "not_available";

/** Entry satu dokumen dalam paket. */
export type PackageDocEntry = {
  key: string;
  name: string;
  status: DocAvailability;
  count: number;
  detail: string;
  /** Link ke route untuk buka dokumen. */
  route: string;
};

/** Summary paket administrasi. */
export type AdminDocumentPackage = {
  /** Konteks assignment. */
  assignment: {
    academicYearId: string;
    teacherId: string;
    teacherName: string;
    subject: string;
    classId: string;
    classLabel: string;
    semester: 1 | 2;
  };

  /** Daftar dokumen dalam paket. */
  documents: PackageDocEntry[];

  /** Summary angka. */
  summary: {
    totalDocs: number;
    availableDocs: number;
    draftDocs: number;
    notAvailableDocs: number;
    completenessScore: number; // 0-100

    totalSessions: number;
    totalAttendanceRecords: number;
    totalJournals: number;
    totalJournalsFinal: number;
    totalGradeEntries: number;
    remedialStudents: number;
    enrichmentStudents: number;
    totalStudents: number;
  };

  /** Waktu generate. */
  generatedAt: string;
};

/** Input untuk generateAdminDocumentPackage. */
export type GeneratePackageInput = {
  assignment: TeachingAssignment;
  prota: ProtaProfile | null;
  roster: ClassRoster | null;
  sessions: LessonSession[];
  attendanceRecords: AttendanceRecord[];
  journals: TeachingJournal[];
  gradeBook: GradeBook | null;
  atpEntries: ATPEntry[];
  lkpds: LKPD[];
  rppDocuments: RppDocument[];
  remedialProgram: RemedialProgram | null;
  enrichmentProgram: EnrichmentProgram | null;
  semesterReport: SemesterReport | null;
};

/**
 * Generate AdminDocumentPackage dari data yang sudah di-load oleh caller.
 *
 * Pure function. Tidak side effect. Tidak baca dari Dexie.
 *
 * Filter data by assignment 5-tuple (teacherId + subject + classId + semester)
 * dilakukan oleh caller sebelum pass ke function ini.
 */
export function generateAdminDocumentPackage(
  input: GeneratePackageInput
): AdminDocumentPackage {
  const { assignment } = input;
  const now = new Date().toISOString();

  // Hitung data
  const totalSessions = input.sessions.length;
  const totalAttendanceRecords = input.attendanceRecords.length;
  const totalJournals = input.journals.length;
  const totalJournalsFinal = input.journals.filter((j) => j.status === "final" || j.locked).length;
  const totalGradeEntries = input.gradeBook?.entries.length ?? 0;
  const remedialStudents = input.remedialProgram?.students.length ?? 0;
  const enrichmentStudents = input.enrichmentProgram?.students.length ?? 0;
  const totalStudents = input.roster?.students.length ?? 0;

  // Build dokumen entries
  const documents: PackageDocEntry[] = [
    {
      key: "prota",
      name: "Program Tahunan",
      status: input.prota ? "available" : "not_available",
      count: input.prota?.units.length ?? 0,
      detail: input.prota
        ? `${input.prota.units.length} unit`
        : "Belum dibuat",
      route: "/prota",
    },
    {
      key: "promes",
      name: "Program Semester",
      status: totalSessions > 0 ? "available" : "not_available",
      count: totalSessions,
      detail: totalSessions > 0
        ? `${totalSessions} sesi terjadwal`
        : "Belum ada sesi (generate di menu Jadwal)",
      route: "/promes",
    },
    {
      key: "atp",
      name: "Bank TP (Tujuan Pembelajaran)",
      status: input.atpEntries.length > 0 ? "available" : "not_available",
      count: input.atpEntries.length,
      detail: `${input.atpEntries.length} TP`,
      route: "/atp",
    },
    {
      key: "roster",
      name: "Daftar Siswa",
      status: totalStudents > 0 ? "available" : "not_available",
      count: totalStudents,
      detail: totalStudents > 0
        ? `${totalStudents} siswa`
        : "Belum dibuat",
      route: "/roster",
    },
    {
      key: "attendance",
      name: "Absensi Semester",
      status: totalAttendanceRecords > 0 ? "available" : "not_available",
      count: totalAttendanceRecords,
      detail: `${totalAttendanceRecords} record absensi`,
      route: "/attendance",
    },
    {
      key: "journal",
      name: "Jurnal Mengajar",
      status: totalJournals > 0
        ? totalJournalsFinal === totalJournals
          ? "available"
          : "draft"
        : "not_available",
      count: totalJournals,
      detail: totalJournals > 0
        ? `${totalJournalsFinal}/${totalJournals} jurnal final`
        : "Belum ada jurnal",
      route: "/journal",
    },
    {
      key: "grades",
      name: "Daftar Nilai",
      status: input.gradeBook
        ? input.gradeBook.entries.every((e) => e.finalScore !== null)
          ? "available"
          : "draft"
        : "not_available",
      count: totalGradeEntries,
      detail: input.gradeBook
        ? `${totalGradeEntries} siswa`
        : "Belum dibuat",
      route: "/grades",
    },
    {
      key: "remedial",
      name: "Program Remedial",
      status: input.remedialProgram
        ? input.remedialProgram.status === "final"
          ? "available"
          : "draft"
        : "not_available",
      count: remedialStudents,
      detail: input.remedialProgram
        ? `${remedialStudents} siswa remedial`
        : "Belum dibuat",
      route: "/remedial",
    },
    {
      key: "pengayaan",
      name: "Program Pengayaan",
      status: input.enrichmentProgram
        ? input.enrichmentProgram.status === "final"
          ? "available"
          : "draft"
        : "not_available",
      count: enrichmentStudents,
      detail: input.enrichmentProgram
        ? `${enrichmentStudents} siswa pengayaan`
        : "Belum dibuat",
      route: "/pengayaan",
    },
    {
      key: "lkpd",
      name: "LKPD",
      status: input.lkpds.length > 0
        ? input.lkpds.some((l) => l.status === "final")
          ? "available"
          : "draft"
        : "not_available",
      count: input.lkpds.length,
      detail: `${input.lkpds.length} LKPD`,
      route: "/lkpd",
    },
    {
      key: "rpp",
      name: "RPP (Arsip Bulk Replace)",
      status: input.rppDocuments.length > 0 ? "available" : "not_available",
      count: input.rppDocuments.length,
      detail: `${input.rppDocuments.length} arsip RPP`,
      route: "/rpp-bulk",
    },
    {
      key: "laporan",
      name: "Laporan Akhir Semester",
      status: input.semesterReport
        ? input.semesterReport.status === "final"
          ? "available"
          : "draft"
        : "not_available",
      count: input.semesterReport ? 1 : 0,
      detail: input.semesterReport
        ? input.semesterReport.status === "final"
          ? "Final"
          : "Draft"
        : "Belum dibuat",
      route: "/semester-report",
    },
  ];

  // Hitung completeness
  const totalDocs = documents.length;
  const availableDocs = documents.filter((d) => d.status === "available").length;
  const draftDocs = documents.filter((d) => d.status === "draft").length;
  const notAvailableDocs = documents.filter((d) => d.status === "not_available").length;
  const completenessScore = totalDocs > 0
    ? Math.round(((availableDocs + draftDocs * 0.5) / totalDocs) * 100)
    : 0;

  return {
    assignment: {
      academicYearId: assignment.academicYearId,
      teacherId: assignment.teacherId,
      teacherName: assignment.teacherName,
      subject: assignment.subject,
      classId: assignment.classId,
      classLabel: assignment.classLabel,
      semester: assignment.semester,
    },
    documents,
    summary: {
      totalDocs,
      availableDocs,
      draftDocs,
      notAvailableDocs,
      completenessScore,
      totalSessions,
      totalAttendanceRecords,
      totalJournals,
      totalJournalsFinal,
      totalGradeEntries,
      remedialStudents,
      enrichmentStudents,
      totalStudents,
    },
    generatedAt: now,
  };
}
