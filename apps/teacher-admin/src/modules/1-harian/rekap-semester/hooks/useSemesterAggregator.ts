/**
 * useSemesterAggregator — Hook for aggregating semester data for Rekap Semester view.
 *
 * Reads GradeBook from Dexie → transforms entries to StudentGradeRecord[].
 * Reads AttendanceRecord from Dexie → aggregates into monthly matriks.
 *
 * DOMAIN-BOUNDARY: Module 1-harian, imports from @shared/db/ and @guru-admin/domain only.
 */

import { useMemo, useState, useEffect } from "react";
import { transformToStudentGradeRecord, type StudentGradeRecord, type GradeBook } from "@guru-admin/domain";
import { findGradeBook } from "@shared/db/gradebook-repo";
import { listClassRosters } from "@shared/db/class-roster-repo";
import type { ClassRoster } from "@guru-admin/domain";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@shared/db/schema";
import type { LessonSession, TeachingJournal } from "@guru-admin/domain";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

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

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate(); // day 0 of next month = last day of this month
}

/* ------------------------------------------------------------------ */
/*  Hook                                                                */
/* ------------------------------------------------------------------ */

export function useSemesterAggregator(context: RekapContext | null) {
  const [gradeRecords, setGradeRecords] = useState<StudentGradeRecord[]>([]);
  const [gradeBook, setGradeBook] = useState<GradeBook | null>(null);
  const [roster, setRoster] = useState<ClassRoster | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live query: all attendance records for this class
  const attendanceRecords = useLiveQuery(
    () => context
      ? db.attendanceRecords
          .where("classId")
          .equals(context.classId)
          .toArray()
      : [],
    [context?.classId]
  );

  // Load gradebook + roster + lesson sessions on context change
  useEffect(() => {
    if (!context) {
      setGradeBook(null);
      setGradeRecords([]);
      setRoster(null);
      return;
    }

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const gb = await findGradeBook({
          academicYearId: context.academicYearId,
          teacherId: context.teacherId,
          classId: context.classId,
          subject: context.subject,
          semester: context.semester,
        });

        setGradeBook(gb ?? null);

        if (gb) {
          const records = gb.entries.map((entry) =>
            transformToStudentGradeRecord(entry, {
              gradeModel: gb.gradeModel ?? "uh",
              kdCount: gb.kdCount ?? 10,
              passingScore: gb.passingScore,
            })
          );
          setGradeRecords(records);
        } else {
          setGradeRecords([]);
        }

        const rosters = await listClassRosters(context.academicYearId);
        const matchingRoster = rosters.find((r) => r.classId === context.classId);
        setRoster(matchingRoster ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal memuat data semester.");
      } finally {
        setLoading(false);
      }
    })();
  }, [context]);

  // Enrich gradeRecords with NISN from roster lookup
  const enrichedGradeRecords = useMemo(() => {
    if (!roster || gradeRecords.length === 0) return gradeRecords;

    // Build lookup: studentId → nis (NISN in school format)
    const nisnLookup = new Map<string, string>();
    for (const s of roster.students) {
      if (s.nis) nisnLookup.set(s.id, s.nis);
    }

    return gradeRecords.map((rec) => ({
      ...rec,
      nisn: nisnLookup.get(rec.studentId) ?? rec.nisn,
    }));
  }, [gradeRecords, roster]);

  // Build monthly attendance matrices
  const monthlyMatrices = useMemo(() => {
    if (!context || !roster || !attendanceRecords) return [];

    const semesterMonths = context.semester === 1
      ? [7, 8, 9, 10, 11, 12]  // Semester Ganjil: Jul-Dec
      : [1, 2, 3, 4, 5, 6];   // Semester Genap: Jan-Jun

    // Academic year: "2023/2024" → Semester 1 uses 2023, Semester 2 uses 2024
    const parts = context.yearLabel.split("/");
    const startYear = parseInt(parts[0]) || 2023;
    const endYear = parseInt(parts[1]) || startYear + 1;

    return semesterMonths.map((month) => {
      // For semester 1 (Jul-Dec): year = startYear. For semester 2 (Jan-Jun): year = endYear.
      const year = month >= 7 ? startYear : endYear;
      const daysInMonth = getDaysInMonth(month, year);

      const studentRows = roster.students.map((student: { id: string; name: string; nis?: string; number: number }) => {
        const statusByDate: Record<number, "present" | "sick" | "excused" | "late" | "absent" | null> = {};

        // Initialize all days as null (no session)
        for (let d = 1; d <= daysInMonth; d++) {
          statusByDate[d] = null;
        }

        // Fill in attendance data for this student in this month
        const recordsForStudent = attendanceRecords.filter(
          (r) => r.studentId === student.id && r.classId === context.classId
        );

        for (const record of recordsForStudent) {
          const date = new Date(record.date);
          const recordMonth = date.getMonth() + 1; // 1-12
          const recordYear = date.getFullYear();
          const recordDay = date.getDate(); // 1-31

          if (recordMonth === month && recordYear === year && recordDay >= 1 && recordDay <= daysInMonth) {
            statusByDate[recordDay] = record.status as "present" | "sick" | "excused" | "late" | "absent";
          }
        }

        // Compute rekap
        let alpa = 0, sakit = 0, izin = 0, terlambat = 0, hadir = 0;
        for (const status of Object.values(statusByDate)) {
          if (status === "absent") alpa++;
          else if (status === "sick") sakit++;
          else if (status === "excused") izin++;
          else if (status === "late") terlambat++;
          else if (status === "present") hadir++;
        }

        return {
          studentId: student.id,
          studentName: student.name,
          nisn: student.nis,
          studentNumber: student.number,
          statusByDate,
          rekap: { alpa, sakit, izin, terlambat, hadir, jlh: alpa + sakit + izin + terlambat },
        };
      });

      return {
        month,
        monthName: MONTH_NAMES[month - 1],
        year,
        daysInMonth,
        students: studentRows,
      };
    });
  }, [context, roster, attendanceRecords]);

  // Live query: all teaching journals for this context
  const teachingJournals = useLiveQuery(
    () => context
      ? db.teachingJournals
          .where("academicYearId")
          .equals(context.academicYearId)
          .toArray()
          .then((journals) =>
            journals
              .filter((j) =>
                !j.deletedAt &&
                j.semester === context.semester &&
                j.classId === context.classId &&
                j.subject === context.subject &&
                j.teacherId === context.teacherId
              ) as TeachingJournal[]
          )
      : [],
    [context?.academicYearId, context?.semester, context?.classId, context?.subject, context?.teacherId]
  );

  // Load lesson sessions for Tatap Muka matrix
  const lessonSessions = useLiveQuery(
    () => context
      ? db.lessonSessions
          .where("academicYearId")
          .equals(context.academicYearId)
          .toArray()
          .then((sessions) =>
            sessions
              .filter((s) =>
                !s.deletedAt &&
                s.semester === context.semester &&
                s.classId === context.classId &&
                s.subject === context.subject &&
                s.teacherId === context.teacherId
              )
              .sort((a, b) => a.date.localeCompare(b.date) || a.startPeriod - b.startPeriod) as LessonSession[]
          )
      : [],
    [context?.academicYearId, context?.semester, context?.classId, context?.subject, context?.teacherId]
  );

  // FORMAT-2: Build Tatap Muka attendance matrix (1–40 Pertemuan)
  const tatapMukaMatrix = useMemo<TatapMukaAttendanceMatrix | null>(() => {
    if (!context || !roster || !lessonSessions || lessonSessions.length === 0) return null;

    // Build meetings array: each lesson session = one pertemuan
    const meetings = lessonSessions.map((session, idx) => {
      // Attendance for this session — look up attendanceRecords by date+classId
      const attendanceByStudent: Record<string, "present" | "sick" | "excused" | "late" | "absent"> = {}; // eslint-disable-line no-empty-pattern

      // Find attendance records matching this session's date and class
      const sessionAttendance = attendanceRecords?.filter(
        (r) =>
          r.classId === session.classId &&
          r.date === session.date && // same date
          r.studentId // has student data
      );

      for (const record of (sessionAttendance ?? [])) {
        attendanceByStudent[record.studentId] = record.status as "present" | "sick" | "excused" | "late" | "absent";
      }

      return {
        meetingNumber: idx + 1, // 1-based
        dateISO: session.date,
        sessionId: session.id,
        durationJP: session.durationJP,
        attendanceByStudent,
      }; // eslint-disable-line no-sequences
    });

    // Build student rows
    const studentRows = roster.students.map((student: { id: string; name: string; nis?: string; number: number }) => {
      // Calculate total JP attended
      let totalJPAttended = 0;
      let lastMeetingDate: string | null = null;

      for (const meeting of meetings) {
        const status = meeting.attendanceByStudent[student.id];
        if (status === "present" || status === "late") {
          totalJPAttended += meeting.durationJP;
          lastMeetingDate = meeting.dateISO;
        }
      }

      // PTS/PAS from GradeBook entries (if available)
      const gradeEntry = gradeBook?.entries?.find((e) => e.studentId === student.id);
      const pts = gradeEntry?.pts ?? undefined;
      const pas = gradeEntry?.pas ?? undefined;

      return {
        studentId: student.id,
        studentName: student.name,
        nisn: student.nis,
        studentNumber: student.number,
        totalJPAttended,
        lastMeetingDate,
        pts,
        pas,
        ket: undefined, // placeholder for future keterangan
      }; // eslint-disable-line no-sequences
    });

    return { meetings, students: studentRows }; // eslint-disable-line no-sequences
  }, [context, roster, lessonSessions, attendanceRecords, gradeBook]);

  // FORMAT-4: Build Jurnal Matrix (1 row per pertemuan)
  // Format referensi: SMPN 8 Bantan — JURNAL AGENDA MENGAJAR GURU
  const jurnalMatrix = useMemo<JurnalMatrix | null>(() => {
    if (!context || !lessonSessions || lessonSessions.length === 0) return null;

    // Build lookup: sessionId → journal
    const journalBySession = new Map<string, TeachingJournal>();
    for (const j of (teachingJournals ?? [])) {
      journalBySession.set(j.sessionId, j);
    }

    // Build lookup: date → attendance records for absent students
    const attendanceByDate = new Map<string, Array<{ studentId: string; status: string }>>();
    for (const r of (attendanceRecords ?? [])) {
      if (r.classId !== context.classId) continue;
      const key = r.date;
      if (!attendanceByDate.has(key)) attendanceByDate.set(key, []);
      attendanceByDate.get(key)!.push({ studentId: r.studentId, status: r.status });
    }

    // Build student name lookup from roster
    const studentNameLookup = new Map<string, string>();
    if (roster) {
      for (const s of roster.students) {
        studentNameLookup.set(s.id, s.name);
      }
    }

    const rows = lessonSessions.map((session, idx) => {
      const journal = journalBySession.get(session.id);

      // Build absent students list for this session
      const sessionAttendance = attendanceByDate.get(session.date) ?? [];
      const absentStudents: Array<{ name: string; reason: string }> = [];
      for (const ar of sessionAttendance) {
        if (ar.status === "sick" || ar.status === "excused" || ar.status === "absent") {
          const name = studentNameLookup.get(ar.studentId) ?? "?";
          const reason = ar.status === "sick" ? "S" : ar.status === "excused" ? "I" : "A";
          absentStudents.push({ name, reason });
        }
      }

      // Keterangan: Tuntas if realizationStatus=done, else based on status
      let keterangan: string | null = null;
      if (journal?.realizationStatus === "done") keterangan = "Tuntas";
      else if (journal?.realizationStatus === "continued") keterangan = "Dilanjutkan";
      else if (journal?.realizationStatus === "cancelled") keterangan = "Tidak Terlaksana";

      return {
        meetingNumber: idx + 1,
        dateISO: session.date,
        sessionId: session.id,
        startPeriod: session.startPeriod,
        durationJP: session.durationJP,
        plannedMaterialTitle: journal?.plannedMaterialTitle ?? null,
        actualMaterialTitle: journal?.actualMaterialTitle ?? null,
        realizationStatus: journal?.realizationStatus ?? null,
        absentStudents,
        keterangan,
        note: journal?.note ?? null,
        journalStatus: journal?.status ?? null,
        hasJournal: !!journal,
      };
    });

    return { rows };
  }, [context, lessonSessions, teachingJournals, attendanceRecords, roster]);

  return {
    gradeRecords: enrichedGradeRecords,
    gradeBook,
    roster,
    monthlyMatrices,
    tatapMukaMatrix,
    jurnalMatrix,
    lessonSessions,
    loading,
    error,
  };
}
