/**
 * useQuickAttendanceState — all state management for QuickAttendancePage.
 *
 * Encapsulates useState, useEffect, useCallback, useMemo declarations
 * so the page component only needs to call this hook and render.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getLessonSessionsByDate, listLessonSessions } from "@shared/db/lesson-session-repo";
import { getAttendanceBySession } from "@shared/db/attendance-repo";
import { db } from "@shared/db/schema";
import { getActiveAcademicYear, getTeacherProfile } from "@shared/db/profile-repo";
import { listAssignmentsByTeacher } from "@shared/db/teaching-assignment-repo";
import type { AcademicYear, AttendanceRecord, LessonSession, TeachingAssignment, TeacherProfile, SchoolDocOrientation, DocumentStatus } from "@guru-admin/domain";
import { todayISODate } from "@guru-admin/shared";
import {
  saveSchoolDocument,
  updateSchoolDocumentData,
  updateSchoolDocumentLayout,
  setSchoolDocumentStatus,
  findSchoolDocumentByCompositeKey,
} from "@shared/db/school-document-repo";
import type { Mode, SaveInfo } from "./quick-attendance-types";

export function useQuickAttendanceState() {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [mode, setMode] = useState<Mode>("jadwal");
  const [date, setDate] = useState(todayISODate());
  const [sessions, setSessions] = useState<LessonSession[]>([]);
  const [assignments, setAssignments] = useState<TeachingAssignment[]>([]);
  const [assignmentId, setAssignmentId] = useState("");
  const [allSessions, setAllSessions] = useState<LessonSession[]>([]);
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saved, setSaved] = useState<SaveInfo | null>(null);
  const [todayDoneIds, setTodayDoneIds] = useState<Set<string>>(new Set());
  const [searchParams] = useSearchParams();

  // WYSIWYG-DOC-FASE10
  const [showSidebar, setShowSidebar] = useState(
    typeof window !== "undefined" && window.innerWidth >= 1024
  );
  const [formatDokumen, setFormatDokumen] = useState<"portrait" | "landscape">("portrait");
  const [docId, setDocId] = useState<string | undefined>(undefined);
  const [docStatus, setDocStatus] = useState<DocumentStatus>("draft");
  const [docSemester, setDocSemester] = useState<1 | 2>(1);
  const ensuringRef = useRef(false);

  /* ---------------------------------------------------------------- */
  /*  Init                                                            */
  /* ---------------------------------------------------------------- */

  useEffect(() => { void init(); }, []);

  async function init() {
    try {
      const [activeYear, profile] = await Promise.all([getActiveAcademicYear(), getTeacherProfile()]);
      setYear(activeYear ?? null); setTeacher(profile);
      if (activeYear && profile) {
        const today = todayISODate();
        const sem: 1 | 2 = activeYear.semester2Start <= today && today <= activeYear.semester2End ? 2 : 1;
        setDocSemester(sem);
        const list = await listAssignmentsByTeacher(profile.id, activeYear.id, sem);
        setAssignments(list); if (list[0]) setAssignmentId(list[0].id);
      }
      const sid = searchParams.get("sessionId");
      if (sid) setSelectedSessionId(sid);
      if (searchParams.get("mode") === "susulan") setMode("susulan");
    } catch (err) {
      console.error("[QuickAttendance] Gagal init:", err);
      setNotice("Gagal memuat data. Coba muat ulang.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadTodaySessions(); }, [date, teacher?.id]);
  useEffect(() => { void loadSusulan(); }, [assignmentId, year?.id]);

  /* ---------------------------------------------------------------- */
  /*  Data loading                                                    */
  /* ---------------------------------------------------------------- */

  async function loadTodaySessions() {
    if (!teacher) return;
    try {
      const todaySessions = await getLessonSessionsByDate(teacher.id, date);
      setSessions(todaySessions);
      const doneSet = new Set<string>();
      for (const s of todaySessions) {
        const records = await getAttendanceBySession(s.id);
        if (records.length > 0) doneSet.add(s.id);
      }
      setTodayDoneIds(doneSet);
    } catch (err) {
      console.error("[QuickAttendance] Gagal memuat sesi:", err);
    }
  }

  function assignment(): TeachingAssignment | undefined {
    return assignments.find((a) => a.id === assignmentId);
  }

  async function loadSusulan() {
    if (!year || !assignment()) { setAllSessions([]); setAllRecords([]); return; }
    const a = assignment(); if (!a) return;
    try {
      const sess = (await listLessonSessions(year.id, a.semester)).filter((s) => !s.deletedAt && s.classId === a.classId && s.subject === a.subject && s.teacherId === a.teacherId).sort((x, y) => x.date.localeCompare(y.date) || x.startPeriod - y.startPeriod);
      setAllSessions(sess);
      const ids = new Set(sess.map((s) => s.id));
      const rows = await db.attendanceRecords.where("classId").equals(a.classId).toArray();
      setAllRecords(rows.filter((r) => !r.deletedAt && ids.has(r.sessionId)) as AttendanceRecord[]);
    } catch (err) {
      console.error("[QuickAttendance] Gagal memuat susulan:", err);
    }
  }

  async function afterSave(info: SaveInfo) { setNotice("Absensi tersimpan."); setSaved(info); await loadTodaySessions(); await loadSusulan(); }
  function closeSaved() { setSaved(null); if (mode === "susulan") setSelectedSessionId(null); }
  function handlePickSession(sid: string) { setSelectedSessionId(sid); setSaved(null); }

  /* ---------------------------------------------------------------- */
  /*  ensureDoc (find-or-create schoolDocument)                       */
  /* ---------------------------------------------------------------- */

  const ensureDoc = useCallback(async (asg: TeachingAssignment, semester: 1 | 2) => {
    if (!year || !asg) return;
    if (ensuringRef.current) return;
    ensuringRef.current = true;
    try {
      const existing = await findSchoolDocumentByCompositeKey({
        docType: "absen-semester",
        semester,
        tahunAjaran: year.label,
        kodeMapel: asg.subject,
        kodeKelas: asg.classLabel,
        teacherId: asg.teacherId,
      });
      if (existing) {
        setDocId(existing.id);
        setDocStatus(existing.status);
        if (existing.orientation) setFormatDokumen(existing.orientation);
      } else {
        const doc = await saveSchoolDocument({
          docType: "absen-semester",
          semester,
          tahunAjaran: year.label,
          kodeMapel: asg.subject,
          kodeKelas: asg.classLabel,
          teacherId: asg.teacherId,
          academicYearId: year.id,
          data: { semester, subject: asg.subject, classLabel: asg.classLabel },
          orientation: "portrait",
          status: "draft",
        });
        setDocId(doc.id);
        setDocStatus("draft");
        setFormatDokumen("portrait");
      }
    } catch (err) {
      console.error("[QuickAttendance] Gagal ensureDoc:", err);
    } finally {
      ensuringRef.current = false;
    }
  }, [year]);

  // Ensure doc when assignment changes
  useEffect(() => {
    const asg = assignment();
    if (asg) {
      setDocSemester(asg.semester);
      void ensureDoc(asg, asg.semester);
    } else {
      setDocId(undefined);
      setDocStatus("draft");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentId, year?.id]);

  /* ---------------------------------------------------------------- */
  /*  WYSIWYG callbacks                                               */
  /* ---------------------------------------------------------------- */

  const handleSaveDoc = useCallback(async (id: string, data: Record<string, unknown>) => {
    await updateSchoolDocumentData(id, data);
  }, []);

  const handleSetFinal = useCallback(async (id: string) => {
    await setSchoolDocumentStatus(id, "final");
    setDocStatus("final");
  }, []);

  const handleOrientationChange = useCallback((orientation: SchoolDocOrientation) => {
    setFormatDokumen(orientation);
    if (docId) void updateSchoolDocumentLayout(docId, { orientation });
  }, [docId]);

  /* ---------------------------------------------------------------- */
  /*  Auto-save data memo                                             */
  /* ---------------------------------------------------------------- */

  const doneIds = useMemo(() => new Set(allRecords.map((r) => r.sessionId)), [allRecords]);

  const docDataForAutoSave = useMemo(() => {
    const asg = assignment();
    if (!asg) return {};
    return {
      semester: docSemester,
      tahunAjaran: year?.label ?? "",
      subject: asg.subject,
      classLabel: asg.classLabel,
      totalSessions: allSessions.length,
      doneCount: doneIds.size,
    };
  }, [assignmentId, docSemester, year?.label, allSessions.length, doneIds.size]);

  /* ---------------------------------------------------------------- */
  /*  Return                                                          */
  /* ---------------------------------------------------------------- */

  return {
    // Core state
    loading,
    year,
    teacher,
    mode,
    setMode,
    date,
    setDate,
    sessions,
    assignments,
    assignmentId,
    setAssignmentId,
    allSessions,
    allRecords,
    selectedSessionId,
    setSelectedSessionId,
    notice,
    setNotice,
    saved,
    todayDoneIds,
    // Document (WYSIWYG) state
    showSidebar,
    setShowSidebar,
    formatDokumen,
    docId,
    docStatus,
    docSemester,
    // Computed
    doneIds,
    docDataForAutoSave,
    // Functions
    assignment,
    handlePickSession,
    closeSaved,
    afterSave,
    handleSaveDoc,
    handleSetFinal,
    handleOrientationChange,
  };
}
