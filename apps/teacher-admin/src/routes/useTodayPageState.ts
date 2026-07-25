/**
 * Custom hook that encapsulates all state management, data loading,
 * and computed values for TodayPage.
 */

import { useEffect, useState, useCallback } from "react";
import {
  getActiveAcademicYear,
  getSchoolProfile,
  getTeacherProfile,
} from "@shared/db/profile-repo";
import { getLessonSessionsByDate, listLessonSessions } from "@shared/db/lesson-session-repo";
import { listJournals } from "@shared/db/journal-repo";
import { getAttendanceByTeacherDate, countSessionsWithAttendance } from "@shared/db/attendance-repo";
import { listAssignmentsByTeacher } from "@shared/db/teaching-assignment-repo";
import { seedSampleData } from "@shared/db/seed-sample-data";
import type {
  AcademicYear,
  SchoolProfile,
  TeacherProfile,
  LessonSession,
  TeachingJournal,
  AttendanceRecord,
  TeachingAssignment,
} from "@guru-admin/domain";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";
import type { ModuleEntry, ModuleStatus, PendingItem } from "./today-page-utils";

/* ================================================================== */
/*  Return type                                                         */
/* ================================================================== */

export type TodayPageState = {
  loading: boolean;
  errorMsg: string | null;
  activeYear: AcademicYear | undefined;
  school: SchoolProfile | undefined;
  teacher: TeacherProfile | undefined;
  todaySessions: LessonSession[];
  journals: TeachingJournal[];
  attendanceRecords: AttendanceRecord[];
  assignments: TeachingAssignment[];
  seeding: boolean;
  seedMsg: string | null;
  today: string;
  todayLabel: string;
  todayAttendanceSessionIds: Set<string>;
  todayJournalSessionIds: Set<string>;
  pendingItems: PendingItem[];
  moduleList: ModuleEntry[];
  categories: string[];
  modulesByCategory: { category: string; modules: ModuleEntry[] }[];
  handleSeedSampleData: () => void;
  handleReload: () => void;
};

/* ================================================================== */
/*  Hook                                                                */
/* ================================================================== */

export function useTodayPageState(): TodayPageState {
  const [loading, setLoading] = useState(true);
  const [activeYear, setActiveYear] = useState<AcademicYear | undefined>();
  const [school, setSchool] = useState<SchoolProfile | undefined>();
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [todaySessions, setTodaySessions] = useState<LessonSession[]>([]);
  const [journals, setJournals] = useState<TeachingJournal[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [assignments, setAssignments] = useState<TeachingAssignment[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Untuk menghitung status absensi & jurnal per assignment
  const [attSessionCounts, setAttSessionCounts] = useState<Record<string, { done: number; total: number }>>({});
  const [jrnSessionCounts, setJrnSessionCounts] = useState<Record<string, { done: number; total: number; drafts: number }>>({});

  useEffect(() => {
    void (async () => {
      try {
        const [year, sp, tp] = await Promise.all([
          getActiveAcademicYear(),
          getSchoolProfile(),
          getTeacherProfile(),
        ]);
        setActiveYear(year);
        setSchool(sp);
        setTeacher(tp);

        if (tp) {
          const today = todayISODate();
          const [sessions, todayAtt] = await Promise.all([
            getLessonSessionsByDate(tp.id, today),
            getAttendanceByTeacherDate(tp.id, today),
          ]);
          setTodaySessions(sessions);
          setAttendanceRecords(todayAtt);

          if (year) {
            const allJournals = await listJournals(year.id);
            setJournals(allJournals);

            const sem: 1 | 2 =
              year.semester2Start <= today && today <= year.semester2End ? 2 : 1;
            const asgList = await listAssignmentsByTeacher(tp.id, year.id, sem);
            setAssignments(asgList);

            // Hitung status absensi & jurnal per assignment
            const allSessions = await listLessonSessions(year.id, sem);
            const attCounts: Record<string, { done: number; total: number }> = {};
            const jrnCounts: Record<string, { done: number; total: number; drafts: number }> = {};

            for (const asg of asgList) {
              const asgSessions = allSessions.filter(
                (s) => s.classId === asg.classId && s.subject === asg.subject && s.teacherId === asg.teacherId && !s.deletedAt
              );
              const asgSessionIds = asgSessions.map((s) => s.id);

              // Absensi: hitung sesi yang sudah ada attendance
              const doneCount = await countSessionsWithAttendance(asgSessionIds);
              attCounts[asg.id] = { done: doneCount, total: asgSessions.length };

              // Jurnal: cek journal records
              const asgJournals = allJournals.filter(
                (j) => j.classId === asg.classId && j.subject === asg.subject && j.teacherId === asg.teacherId
              );
              const doneJournals = asgJournals.filter((j) => j.locked);
              const draftJournals = asgJournals.filter((j) => !j.locked);
              jrnCounts[asg.id] = { done: doneJournals.length, total: asgSessions.length, drafts: draftJournals.length };
            }

            setAttSessionCounts(attCounts);
            setJrnSessionCounts(jrnCounts);
          }
        }
      } catch (err) {
        console.error("[TodayPage] Gagal memuat data:", err);
        setErrorMsg(err instanceof Error ? err.message : "Gagal memuat data. Coba muat ulang halaman.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Computed: date labels
  const today = todayISODate();
  const todayLabel = formatLongDateID(today);

  // Computed: session ID sets for attendance/journal lookup
  const todayAttendanceSessionIds = new Set(
    attendanceRecords.filter((r) => r.date === today).map((r) => r.sessionId)
  );

  const todayJournalSessionIds = new Set(
    journals.filter((j) => j.date === today).map((j) => j.sessionId)
  );

  // Computed: pending work
  const pendingItems: PendingItem[] = [];

  const plannedSessions = todaySessions.filter((s) => s.status === "planned");
  for (const s of plannedSessions) {
    const hasAttendance = todayAttendanceSessionIds.has(s.id);
    const hasJournal = todayJournalSessionIds.has(s.id);
    if (!hasAttendance) {
      pendingItems.push({
        id: `absen-${s.id}`,
        label: `Absen ${s.classLabel} — ${s.subject} (${s.startTime})`,
        link: `/attendance?sessionId=${s.id}`,
        urgency: "high",
      });
    }
    if (!hasJournal) {
      pendingItems.push({
        id: `jurnal-${s.id}`,
        label: `Jurnal ${s.classLabel} — ${s.subject} (${s.startTime})`,
        link: `/journal?sessionId=${s.id}`,
        urgency: "high",
      });
    }
  }

  const draftJournals = journals.filter((j) => j.status === "draft" && !j.locked);
  for (const j of draftJournals.slice(0, 5)) {
    pendingItems.push({
      id: `draft-${j.id}`,
      label: `Jurnal draft: ${j.classLabel} — ${j.date}`,
      link: `/journal`,
      urgency: "medium",
    });
  }

  // Computed: build module list with statuses
  const moduleList: ModuleEntry[] = [
    // === TUGAS HARIAN ===
    ...assignments.map((a) => {
      const attInfo = attSessionCounts[a.id] ?? { done: 0, total: 0 };
      const jrnInfo = jrnSessionCounts[a.id] ?? { done: 0, total: 0, drafts: 0 };

      // Absensi status
      let attStatus: ModuleStatus = "belum_diisi";
      let attLabel = "Belum diisi";
      if (attInfo.total > 0 && attInfo.done >= attInfo.total) {
        attStatus = "lengkap";
        attLabel = `${attInfo.done}/${attInfo.total} Lengkap`;
      } else if (attInfo.done > 0) {
        attStatus = "draft";
        attLabel = `${attInfo.done}/${attInfo.total} Diisi`;
      } else if (attInfo.total > 0) {
        attLabel = `${attInfo.total} belum diisi`;
      }

      // Jurnal status
      let jrnStatus: ModuleStatus = "belum_diisi";
      let jrnLabel = "Belum diisi";
      if (jrnInfo.total > 0 && jrnInfo.done >= jrnInfo.total) {
        jrnStatus = "lengkap";
        jrnLabel = `${jrnInfo.done}/${jrnInfo.total} Lengkap`;
      } else if (jrnInfo.done > 0 || jrnInfo.drafts > 0) {
        if (jrnInfo.drafts > 0 && jrnInfo.done < jrnInfo.total) {
          jrnStatus = "perlu_finalisasi";
          jrnLabel = `${jrnInfo.drafts} draft, ${jrnInfo.done}/${jrnInfo.total} final`;
        } else {
          jrnStatus = "draft";
          jrnLabel = `${jrnInfo.done}/${jrnInfo.total} Final`;
        }
      } else if (jrnInfo.total > 0) {
        jrnLabel = `${jrnInfo.total} belum diisi`;
      }

      return [
        {
          id: `absen-${a.id}`,
          label: `Absen ${a.classLabel} · ${a.subject}`,
          to: `/attendance?mode=susulan`,
          category: "Tugas Harian",
          status: attStatus,
          statusLabel: attLabel,
        },
        {
          id: `jurnal-${a.id}`,
          label: `Jurnal ${a.classLabel} · ${a.subject}`,
          to: `/journal?mode=susulan`,
          category: "Tugas Harian",
          status: jrnStatus,
          statusLabel: jrnLabel,
        },
        {
          id: `nilai-${a.id}`,
          label: `Nilai ${a.classLabel} · ${a.subject}`,
          to: `/grades`,
          category: "Tugas Harian",
          status: "belum_diisi" as ModuleStatus,
          statusLabel: "Buka untuk cek",
        },
      ] as ModuleEntry[];
    }).flat(),

    // === DATA DASAR ===
    {
      id: "profile",
      label: "Profil Sekolah & Guru",
      to: "/profile",
      category: "Data Dasar",
      status: school && teacher ? "lengkap" : "belum_diisi",
      statusLabel: school && teacher ? "Lengkap" : "Belum diisi",
    },
    {
      id: "new-year",
      label: "Tahun Pelajaran",
      to: "/new-year",
      category: "Data Dasar",
      status: activeYear ? "lengkap" : "belum_diisi",
      statusLabel: activeYear ? "Lengkap" : "Belum diisi",
    },
    {
      id: "assignments",
      label: "Kelas dan Mapel",
      to: "/assignments",
      category: "Data Dasar",
      status: assignments.length > 0 ? "lengkap" : "belum_diisi",
      statusLabel: assignments.length > 0 ? `${assignments.length} kelas` : "Belum diisi",
    },
    {
      id: "roster",
      label: "Daftar Siswa",
      to: "/roster",
      category: "Data Dasar",
      status: "belum_diisi",
      statusLabel: "Buka untuk cek",
    },
    {
      id: "calendar",
      label: "Kalender Pendidikan",
      to: "/calendar",
      category: "Data Dasar",
      status: "belum_diisi",
      statusLabel: "Buka untuk cek",
    },
    {
      id: "schedule",
      label: "Jadwal Mengajar",
      to: "/schedule",
      category: "Data Dasar",
      status: "belum_diisi",
      statusLabel: "Buka untuk cek",
    },

    // === PERENCANAAN ===
    {
      id: "prota",
      label: "Program Tahunan (Prota)",
      to: "/prota",
      category: "Perencanaan",
      status: "belum_diisi",
      statusLabel: "Buka untuk cek",
    },
    {
      id: "promes",
      label: "Program Semester (Promes)",
      to: "/promes",
      category: "Perencanaan",
      status: "belum_diisi",
      statusLabel: "Buka untuk cek",
    },
    {
      id: "atp",
      label: "Bank TP / ATP",
      to: "/atp",
      category: "Perencanaan",
      status: "belum_diisi",
      statusLabel: "Buka untuk cek",
    },
    {
      id: "rpp",
      label: "RPP / Modul Ajar",
      to: "/rpp",
      category: "Perencanaan",
      status: "belum_diisi",
      statusLabel: "Buka untuk cek",
    },
    {
      id: "lkpd",
      label: "LKPD",
      to: "/lkpd",
      category: "Perencanaan",
      status: "belum_diisi",
      statusLabel: "Buka untuk cek",
    },

    // === PENILAIAN ===
    {
      id: "evaluation-docs",
      label: "Perangkat Penilaian",
      to: "/evaluation-docs",
      category: "Penilaian",
      status: "belum_diisi",
      statusLabel: "Buka untuk cek",
    },
    {
      id: "remedial",
      label: "Program Remedial",
      to: "/remedial",
      category: "Penilaian",
      status: "belum_diisi",
      statusLabel: "Buka untuk cek",
    },
    {
      id: "pengayaan",
      label: "Program Pengayaan",
      to: "/pengayaan",
      category: "Penilaian",
      status: "belum_diisi",
      statusLabel: "Buka untuk cek",
    },

    // === DOKUMEN & LAPORAN ===
    {
      id: "admin-package",
      label: "Paket Dokumen",
      to: "/admin-package",
      category: "Dokumen & Laporan",
      status: "belum_diisi",
      statusLabel: "Buka untuk cek",
    },
    {
      id: "auto-document",
      label: "Auto Document",
      to: "/auto-document",
      category: "Dokumen & Laporan",
      status: "belum_diisi",
      statusLabel: "Buka untuk cek",
    },
    {
      id: "report-center",
      label: "Pusat Laporan",
      to: "/report-center",
      category: "Dokumen & Laporan",
      status: "belum_diisi",
      statusLabel: "Buka untuk cek",
    },
    {
      id: "semester-report",
      label: "Laporan Semester",
      to: "/semester-report",
      category: "Dokumen & Laporan",
      status: "belum_diisi",
      statusLabel: "Buka untuk cek",
    },
    {
      id: "completeness",
      label: "Cek Kelengkapan",
      to: "/completeness",
      category: "Dokumen & Laporan",
      status: "belum_diisi",
      statusLabel: "Buka untuk cek",
    },
    {
      id: "rpp-bulk",
      label: "RPP Ganti Identitas",
      to: "/rpp-bulk",
      category: "Dokumen & Laporan",
      status: "belum_diisi",
      statusLabel: "Buka untuk cek",
    },

    // === UTILITAS ===
    {
      id: "backup",
      label: "Backup / Restore",
      to: "/backup",
      category: "Utilitas",
      status: "belum_diisi",
      statusLabel: "Buka untuk cek",
    },
  ];

  // Computed: group modules by category
  const categories = Array.from(new Set(moduleList.map((m) => m.category)));
  const modulesByCategory = categories.map((cat) => ({
    category: cat,
    modules: moduleList.filter((m) => m.category === cat),
  }));

  // Handlers
  const handleSeedSampleData = useCallback(async () => {
    setSeeding(true);
    const result = await seedSampleData();
    setSeedMsg(result.message);
    setSeeding(false);
    if (result.success) setTimeout(() => window.location.reload(), 2000);
  }, []);

  const handleReload = useCallback(() => {
    setErrorMsg(null);
    setLoading(true);
    window.location.reload();
  }, []);

  return {
    loading,
    errorMsg,
    activeYear,
    school,
    teacher,
    todaySessions,
    journals,
    attendanceRecords,
    assignments,
    seeding,
    seedMsg,
    today,
    todayLabel,
    todayAttendanceSessionIds,
    todayJournalSessionIds,
    pendingItems,
    moduleList,
    categories,
    modulesByCategory,
    handleSeedSampleData,
    handleReload,
  };
}
