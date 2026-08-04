/**
 * Shared types for Rekap Semester matrices.
 * Extracted from useSemesterAggregator so @shared/exporters can import them
 * without violating the module boundary contract.
 */

/** Context untuk Rekap Semester — kelas + mapel + guru yang dipilih. */
export type RekapContext = {
  academicYearId: string;
  teacherId: string;
  classId: string;
  classLabel: string;
  subject: string;
  semester: 1 | 2;
  schoolName: string;
  yearLabel: string;
  teacherName: string;
};

/** FORMAT-1: Matriks absensi per bulan — 1 row per siswa, 31 kolom tanggal. (Wali Kelas & Guru Piket) */
export type MonthlyAttendanceMatrix = {
  month: number; // 1-12
  monthName: string; // "Januari", "Februari", etc.
  year: number;
  daysInMonth: number; // 28, 29, 30, or 31
  students: Array<{
    studentId: string;
    studentName: string;
    nisn?: string;
    studentNumber: number;
    /** Status per tanggal (1-31). null = tidak ada sesi (hari libur/weekend). */
    statusByDate: Record<number, "present" | "sick" | "excused" | "late" | "absent" | null>;
    /** Rekap bulanan */
    rekap: { alpa: number; sakit: number; izin: number; terlambat: number; hadir: number; jlh: number };
  }>;
};

/** FORMAT-4: Matriks Jurnal Mengajar — 1 row per pertemuan. (Guru Mata Pelajaran)
 *  Format referensi: SMPN 8 Bantan — JURNAL AGENDA MENGAJAR GURU
 *  Columns: NO | HARI/TANGGAL | JAM KE- | MATERI/TUJUAN | KEGIATAN | SISWA TIDAK HADIR | KETERANGAN */
export type JurnalMatrix = {
  /** Pertemuan rows — each lesson session + its journal. */
  rows: Array<{
    meetingNumber: number; // 1-based
    dateISO: string;
    sessionId: string;
    startPeriod: number;   // Jam ke- (start period)
    durationJP: number;   // Duration in JP
    /** Planned material from Prota (auto-filled). */
    plannedMaterialTitle: string | null;
    /** Actual teaching activity description (guru input). */
    actualMaterialTitle: string | null;
    /** Realization status: done/continued/cancelled. */
    realizationStatus: "done" | "continued" | "cancelled" | null;
    /** Absent students with reason code — e.g. "Andi (S)" */
    absentStudents: Array<{ name: string; reason: string }>;
    /** Keterangan column — e.g. Tuntas / Belum Tuntas / - */
    keterangan: string | null;
    /** Journal note (for KEGIATAN PEMBELAJARAN if actualMaterialTitle is empty). */
    note: string | null;
    /** Journal document status. */
    journalStatus: string | null;
    /** Whether journal exists for this session. */
    hasJournal: boolean;
  }>;
};

/** FORMAT-2: Matriks Daftar Hadir Tatap Muka — 1–40 Pertemuan. (Guru Mata Pelajaran) */
export type TatapMukaAttendanceMatrix = {
  /** Meetings (pertemuan) in this semester for the selected assignment, sorted chronologically. */
  meetings: Array<{
    meetingNumber: number; // 1-based: 1–40
    dateISO: string; // ISO date of this lesson session
    sessionId: string; // LessonSession.id
    durationJP: number; // Jam tatap muka for this session
    /** Attendance status per student for this meeting. */
    attendanceByStudent: Record<string, "present" | "sick" | "excused" | "late" | "absent">;
  }>;
  students: Array<{
    studentId: string;
    studentName: string;
    nisn?: string;
    studentNumber: number;
    /** Total JP attended across all meetings. */
    totalJPAttended: number;
    /** Date ISO of last meeting attended. */
    lastMeetingDate: string | null;
    /** PTS score from GradeBook. */
    pts?: number;
    /** PAS score from GradeBook. */
    pas?: number;
    /** Ket. (keterangan). */
    ket?: string;
  }>;
};
