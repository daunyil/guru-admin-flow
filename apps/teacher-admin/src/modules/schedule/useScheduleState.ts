import { useEffect, useState, useCallback } from "react";
import {
  listTeachingSchedules,
  deleteTeachingSchedule,
} from "@shared/db/teaching-schedule-repo";
import {
  generateAndSaveLessonSessions,
  listLessonSessions,
  clearLessonSessions,
} from "@shared/db/lesson-session-repo";
import { listCalendarEvents } from "@shared/db/calendar-repo";
import { getActiveAcademicYear, getTeacherProfile } from "@shared/db/profile-repo";
import type { TeachingSchedule, LessonSession, AcademicYear } from "@guru-admin/domain";

export interface UseScheduleStateReturn {
  loading: boolean;
  activeYear: AcademicYear | null;
  schedules: TeachingSchedule[];
  sessions: LessonSession[];
  semester: 1 | 2;
  showForm: boolean;
  showImport: boolean;
  editing: TeachingSchedule | null;
  generating: boolean;
  error: string | null;
  success: string | null;
  setSemester: (s: 1 | 2) => void;
  openAddForm: () => void;
  openEditForm: (s: TeachingSchedule) => void;
  closeForm: () => void;
  openImport: () => void;
  closeImport: () => void;
  onImported: (count: number) => void;
  onImportError: (errors: string[]) => void;
  onFormSaved: () => void;
  onLinkerError: (msg: string) => void;
  onLinkerSuccess: (msg: string) => void;
  onDeleteSchedule: (s: TeachingSchedule) => Promise<void>;
  onGenerate: () => Promise<void>;
  onClearSessions: () => Promise<void>;
}

export function useScheduleState(): UseScheduleStateReturn {
  const [loading, setLoading] = useState(true);
  const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
  const [schedules, setSchedules] = useState<TeachingSchedule[]>([]);
  const [sessions, setSessions] = useState<LessonSession[]>([]);
  const [semester, setSemester] = useState<1 | 2>(1);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState<TeachingSchedule | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function reload() {
    if (!activeYear) return;
    const [scheds, sess] = await Promise.all([
      listTeachingSchedules(activeYear.id),
      listLessonSessions(activeYear.id, semester),
    ]);
    setSchedules(scheds.filter((s) => s.semester === semester));
    setSessions(sess);
  }

  useEffect(() => {
    void (async () => {
      const year = await getActiveAcademicYear();
      if (year) {
        setActiveYear(year);
        const [scheds, sess] = await Promise.all([
          listTeachingSchedules(year.id),
          listLessonSessions(year.id, semester),
        ]);
        setSchedules(scheds.filter((s) => s.semester === semester));
        setSessions(sess);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (activeYear) void reload();
  }, [semester]);

  useEffect(() => {
    if (!error && !success) return;
    const t = setTimeout(() => { setError(null); setSuccess(null); }, error ? 5000 : 3000);
    return () => clearTimeout(t);
  }, [error, success]);

  const openAddForm = useCallback(() => {
    setEditing(null);
    setShowForm(true);
  }, []);

  const openEditForm = useCallback((s: TeachingSchedule) => {
    setEditing(s);
    setShowForm(true);
  }, []);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setEditing(null);
  }, []);

  const openImport = useCallback(() => {
    setShowImport(true);
  }, []);

  const closeImport = useCallback(() => {
    setShowImport(false);
  }, []);

  const onImported = useCallback((count: number) => {
    setShowImport(false);
    setSuccess(`${count} jadwal berhasil diimpor.`);
    void reload();
  }, []);

  const onImportError = useCallback((errors: string[]) => {
    setError(errors.join("; "));
  }, []);

  const onFormSaved = useCallback(() => {
    setShowForm(false);
    setEditing(null);
    void reload();
  }, []);

  const onLinkerError = useCallback((msg: string) => {
    setError(msg);
  }, []);

  const onLinkerSuccess = useCallback((msg: string) => {
    setSuccess(msg);
    void reload();
  }, []);

  const onDeleteSchedule = useCallback(async (s: TeachingSchedule) => {
    if (window.confirm(`Hapus jadwal ${s.subject} - ${s.classLabel}?`)) {
      await deleteTeachingSchedule(s.id);
      setSuccess("Jadwal dihapus.");
      void reload();
    }
  }, []);

  const onGenerate = useCallback(async () => {
    if (!activeYear) return;
    setGenerating(true);
    setError(null);
    try {
      const teacher = await getTeacherProfile();
      if (!teacher) throw new Error("Profil guru belum diisi.");
      const calendar = await listCalendarEvents(activeYear.id);
      const allSchedules = await listTeachingSchedules(activeYear.id);
      const semSchedules = allSchedules.filter((s) => s.semester === semester);
      if (semSchedules.length === 0) {
        throw new Error(`Tidak ada jadwal untuk semester ${semester}. Tambahkan jadwal dulu.`);
      }
      const result = await generateAndSaveLessonSessions({
        academicYear: activeYear,
        schedules: semSchedules,
        calendar,
        semester,
        teacherId: teacher.id,
      });
      if (result.success && result.summary) {
        setSuccess(
          `${result.summary.totalSessions} sesi di-generate (${result.summary.plannedSessions} planned, ${result.summary.cancelledSessions} cancelled).`
        );
        void reload();
      } else {
        setError(result.errors.join("; ") || "Gagal generate sesi.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal generate sesi.");
    } finally {
      setGenerating(false);
    }
  }, [activeYear, semester]);

  const onClearSessions = useCallback(async () => {
    if (!activeYear) return;
    if (window.confirm(`Hapus semua sesi semester ${semester}?`)) {
      await clearLessonSessions(activeYear.id, semester);
      setSuccess("Sesi dihapus.");
      void reload();
    }
  }, [activeYear, semester]);

  return {
    loading,
    activeYear,
    schedules,
    sessions,
    semester,
    showForm,
    showImport,
    editing,
    generating,
    error,
    success,
    setSemester,
    openAddForm,
    openEditForm,
    closeForm,
    openImport,
    closeImport,
    onImported,
    onImportError,
    onFormSaved,
    onLinkerError,
    onLinkerSuccess,
    onDeleteSchedule,
    onGenerate,
    onClearSessions,
  };
}
