/**
 * useKbmHub — Orchestrator that composes all 4 sub-hooks.
 *
 * Manages:
 *   - saving, justSaved, isDirty, notice
 *   - saveAll() — calls all 3 repos
 *   - loadedSnapshot ref for dirty tracking
 *   - Session load effect (coordinates attendance + journal + nilai init)
 *   - Returns the SAME interface as original useKbmHub
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getLessonSession,
  updateLessonSession,
} from "@shared/db/lesson-session-repo";
import {
  initAttendanceForSession,
  updateAttendance,
} from "@shared/db/attendance-repo";
import {
  initJournalForSession,
  updateJournal,
} from "@shared/db/journal-repo";
import {
  findGradeBook,
  saveGradeBook,
  updateGradeBook,
} from "@shared/db/gradebook-repo";
import { findClassRoster } from "@shared/db/class-roster-repo";
import { listAssignments } from "@shared/db/teaching-assignment-repo";
import {
  packStructuredNote,
  unpackStructuredNote,
} from "@guru-admin/domain";
import type {
  AcademicYear,
  AttendanceStatus,
  ClassRoster,
  GradeBook,
  GradeEntry,
  LessonSession,
} from "@guru-admin/domain";
import { NILAI_TYPE_TO_FIELD } from "../constants";
import { useKbmInit } from "./useKbmInit";
import { useKbmAttendance } from "./useKbmAttendance";
import { useKbmJournal, createCopyPreviousJournalHandler } from "./useKbmJournal";
import type { JournalSnapshot } from "./useKbmJournal";
import { useKbmNilai } from "./useKbmNilai";

export function useKbmHub() {
  /* ================================================================ */
  /*  Loaded snapshot ref for dirty tracking                           */
  /* ================================================================ */

  const savedChangesSnapshotRef = useRef<Map<string, AttendanceStatus> | null>(null);
  const savedNoteMapSnapshotRef = useRef<Map<string, string> | null>(null);
  const savedJournalSnapshotRef = useRef<JournalSnapshot | null>(null);
  const savedNilaiMapSnapshotRef = useRef<Map<string, number> | null>(null);

  /* ================================================================ */
  /*  Sub-hooks                                                       */
  /* ================================================================ */

  // Init — drives the session load effect which we handle below
  const init = useKbmInit(); // onSessionDataLoaded handled separately

  // Attendance
  const att = useKbmAttendance(
    init.presensiStep,
    init.setPresensiStep,
    savedChangesSnapshotRef.current,
    savedNoteMapSnapshotRef.current,
  );

  // Journal
  const jnl = useKbmJournal(
    init.jurnalStep,
    init.setJurnalStep,
    savedJournalSnapshotRef.current,
    init.setNotice,
  );

  // Nilai
  const nil = useKbmNilai(
    init.nilaiStep,
    savedNilaiMapSnapshotRef.current,
  );

  /* ================================================================ */
  /*  Save state                                                      */
  /* ================================================================ */

  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  /* ================================================================ */
  /*  Dirty tracking (combined)                                       */
  /* ================================================================ */

  const isDirty = useMemo(() => {
    return att.isAttendanceDirty || jnl.isJournalDirty || nil.isNilaiDirty;
  }, [att.isAttendanceDirty, jnl.isJournalDirty, nil.isNilaiDirty]);

  /* ================================================================ */
  /*  Session load effect — coordinates all sub-hooks                  */
  /* ================================================================ */

  useEffect(() => {
    if (!init.selectedSessionId || !init.year) return;
    const yearId = init.year.id;
    const sessionId = init.selectedSessionId;
    void (async () => {
      try {
        const session = await getLessonSession(sessionId);
        if (!session) return;

        // Update init's selectedSession & roster
        // (We set these through init's setters indirectly)
        // NOTE: We need to update selectedSession and roster — but those are inside useKbmInit.
        // For now, we trigger the same loading logic by setting session data directly.

        const r = await findClassRoster(yearId, session.classId);

        // Load attendance
        const attRecords = await initAttendanceForSession({
          sessionId, date: session.date, roster: r ?? null,
        });
        att.setRecords(attRecords);

        // 2a FIX: Load saved attendance into changes Map
        const savedChanges = new Map<string, AttendanceStatus>();
        for (const rec of attRecords) {
          if (rec.status !== "present") savedChanges.set(rec.studentId, rec.status);
        }
        att.setChanges(savedChanges);

        // Load journal
        const j = await initJournalForSession({ session, attendanceRecords: attRecords });
        jnl.setJournal(j);
        const unpacked = unpackStructuredNote(j.note);
        jnl.setJournalInput({ actualMaterialTitle: j.actualMaterialTitle ?? "", note: unpacked.freeNote });
        jnl.setRealizationStatus(j.realizationStatus ?? "done");
        jnl.setRealizationReason("");
        jnl.setStructuredNote({
          activities: unpacked.activities,
          studentResponse: unpacked.studentResponse ? [unpacked.studentResponse] : [],
          obstacle: unpacked.obstacle ? [unpacked.obstacle] : [],
          followUp: j.followUp ? [j.followUp] : [],
        });
        jnl.setActiveCategoryTab("activities");

        // Load nilai
        const assignment = await findAssignmentForSession(session, init.year!);
        let loadedNilai = new Map<string, number>();
        if (assignment) {
          const existingBook = await findGradeBook({
            academicYearId: yearId, teacherId: session.teacherId,
            classId: session.classId, semester: session.semester, subject: session.subject,
          });
          nil.setGradeBook(existingBook ?? null);
          if (existingBook) {
            const existingNilai = new Map<string, number>();
            for (const entry of existingBook.entries) {
              const field = NILAI_TYPE_TO_FIELD[nil.nilaiType] ?? "uh1";
              const val = entry[field as keyof GradeEntry];
              if (typeof val === "number" && val !== null) {
                existingNilai.set(entry.studentId, val);
              }
            }
            if (existingNilai.size > 0) {
              loadedNilai = existingNilai;
            }
          }
        } else { nil.setGradeBook(null); }

        // Auto-detect: if session already saved, skip to jurnal/nilai
        const sessionAlreadyDone = session.status === "done";
        const hasJournalContent = !!j.actualMaterialTitle;
        init.setPresensiStep(sessionAlreadyDone ? "done" : "active");
        init.setJurnalStep(hasJournalContent ? "done" : "active");
        init.setNilaiStep("active");

        // B4-01 FIX: Only set nilaiMap/toggle AFTER loading logic
        nil.setNilaiMap(loadedNilai);
        nil.setNilaiToggle(loadedNilai.size > 0);

        // B4-02: Save loaded snapshot for accurate dirty tracking
        savedChangesSnapshotRef.current = savedChanges;
        savedNoteMapSnapshotRef.current = new Map();
        savedJournalSnapshotRef.current = {
          journalInput: { actualMaterialTitle: j.actualMaterialTitle ?? "", note: unpacked.freeNote },
          structuredNote: {
            activities: unpacked.activities,
            studentResponse: unpacked.studentResponse ? [unpacked.studentResponse] : [],
            obstacle: unpacked.obstacle ? [unpacked.obstacle] : [],
            followUp: j.followUp ? [j.followUp] : [],
          },
          realizationStatus: j.realizationStatus ?? "done",
          realizationReason: "",
        };
        savedNilaiMapSnapshotRef.current = loadedNilai;

        // Update selectedSession & roster via init (we need to expose these setters)
        // For now, we handle this by having the init hook watch selectedSessionId
        // and update selectedSession/roster internally
      } catch (err) {
        console.error("[useKbmHub] Gagal memuat sesi:", err);
      }
    })();
  }, [init.selectedSessionId, init.year]);

  /* ================================================================ */
  /*  handleCopyPreviousJournal                                        */
  /* ================================================================ */

  const handleCopyPreviousJournal = useCallback(
    createCopyPreviousJournalHandler(
      () => init.year,
      () => init.selectedClassId,
      () => init.selectedSubject,
      () => init.selectedSession,
      jnl.setJournalInput,
      jnl.setStructuredNote,
      init.setNotice,
    ),
    [init.year, init.selectedClassId, init.selectedSubject, init.selectedSession, jnl.setJournalInput, jnl.setStructuredNote, init.setNotice],
  );

  /* ================================================================ */
  /*  saveAll                                                         */
  /* ================================================================ */

  const saveAll = useCallback(async () => {
    if (!init.selectedSessionId || !jnl.journal || !init.year || !init.teacher) return;
    // 3a: Validate materi — warn if empty
    if (!jnl.journalInput.actualMaterialTitle.trim()) {
      const confirmed = window.confirm("Materi / Tujuan Pembelajaran masih kosong. Yakin ingin menyimpan?");
      if (!confirmed) return;
    }
    setSaving(true);
    try {
      // Only send attendance changes that differ from the saved records
      if (att.changes.size > 0) {
        const payload = Array.from(att.changes.entries()).map(([studentId, status]) => ({ studentId, status }));
        const updated = await updateAttendance(init.selectedSessionId, payload);
        att.setRecords(updated);
        // Rebuild changes from saved data (only non-present)
        const savedChanges = new Map<string, AttendanceStatus>();
        for (const rec of updated) {
          if (rec.status !== "present") savedChanges.set(rec.studentId, rec.status);
        }
        att.setChanges(savedChanges);
      }
      const packedNote = packStructuredNote({
        activities: jnl.structuredNote.activities,
        studentResponse: jnl.structuredNote.studentResponse.join(", "),
        obstacle: jnl.structuredNote.obstacle.join(", "),
        freeNote: jnl.journalInput.note || "",
      });
      await updateJournal(jnl.journal.id, {
        actualMaterialTitle: jnl.journalInput.actualMaterialTitle || undefined,
        note: packedNote,
        followUp: jnl.structuredNote.followUp.join(", ") || undefined,
        realizationStatus: jnl.realizationStatus,
      });
      if (nil.nilaiToggle && nil.nilaiMap.size > 0 && init.selectedSession) {
        await saveNilaiToGradeBook(init.year, init.teacher, init.selectedSession, init.roster, nil.gradeBook, nil.nilaiMap, nil.nilaiType);
      }
      if (init.selectedSession) {
        await updateLessonSession(init.selectedSession.id, { status: "done" });
        init.setSessions((prev) =>
          prev.map((s) => s.id === init.selectedSession!.id ? { ...s, status: "done" as const } : s)
        );
      }
      init.setNotice("KBM Sesi Berhasil Disimpan!");
      // 5b: Brief green checkmark feedback
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
      // Refresh dashboard after save
      void init.refreshDashboard();
    } catch (err) {
      console.error("[useKbmHub] Gagal simpan:", err);
      init.setNotice("Gagal menyimpan. Coba lagi.");
    } finally { setSaving(false); }
  }, [init.selectedSessionId, init.selectedSession, init.year, init.teacher, init.roster, jnl.journal, att.changes, jnl.journalInput, jnl.structuredNote, jnl.realizationStatus, nil.nilaiToggle, nil.nilaiMap, nil.gradeBook, nil.nilaiType]);

  /* ================================================================ */
  /*  Return — SAME interface as original useKbmHub                   */
  /* ================================================================ */

  return {
    // Loading & core
    loading: init.loading,
    year: init.year,
    teacher: init.teacher,
    sessions: init.sessions,
    assignments: init.assignments,
    selectedSessionId: init.selectedSessionId,
    setSelectedSessionId: init.setSelectedSessionId,
    selectedSession: init.selectedSession,
    roster: init.roster,

    // Dashboard
    dashboardCards: init.dashboardCards,
    dashboardClassGroups: init.dashboardClassGroups,
    daySummary: init.daySummary,
    progressPercent: init.progressPercent,
    dashboardLoading: init.dashboardLoading,
    selectDashboardSession: init.selectDashboardSession,
    backToDashboard: init.backToDashboard,
    refreshDashboard: init.refreshDashboard,

    // Cascading selector (assignment-driven)
    selectedClassId: init.selectedClassId,
    setSelectedClassId: init.setSelectedClassId,
    selectedSubject: init.selectedSubject,
    setSelectedSubject: init.setSelectedSubject,
    classOptions: init.classOptions,
    subjectOptions: init.subjectOptions,
    filteredSessions: init.filteredSessions,
    hasNoSessions: init.hasNoSessions,
    handlePertemuanTambahan: init.handlePertemuanTambahan,
    isReadyToStart: init.isReadyToStart,

    // Attendance
    records: att.records,
    changes: att.changes,
    effectiveRecords: att.effectiveRecords,
    summary: att.summary,
    absentList: att.absentList,
    noteMap: att.noteMap,
    setStatus: att.setStatus,
    setAllPresent: att.setAllPresent,
    setStudentNote: att.setStudentNote,
    donePresensi: att.donePresensi,
    undoLastStatus: att.undoLastStatus,

    // Journal
    journal: jnl.journal,
    journalInput: jnl.journalInput,
    setJournalInput: jnl.setJournalInput,
    realizationStatus: jnl.realizationStatus,
    setRealizationStatus: jnl.setRealizationStatus,
    realizationReason: jnl.realizationReason,
    setRealizationReason: jnl.setRealizationReason,
    structuredNote: jnl.structuredNote,
    setStructuredNote: jnl.setStructuredNote,
    toggleStructuredChip: jnl.toggleStructuredChip,
    activeCategoryTab: jnl.activeCategoryTab,
    setActiveCategoryTab: jnl.setActiveCategoryTab,
    autoNarasi: jnl.autoNarasi,
    handleCopyPreviousJournal,

    // No finalize/lock

    // Nilai
    gradeBook: nil.gradeBook,
    nilaiMap: nil.nilaiMap,
    setNilai: nil.setNilai,
    nilaiToggle: nil.nilaiToggle,
    setNilaiToggle: nil.setNilaiToggle,
    nilaiType: nil.nilaiType,
    setNilaiType: nil.setNilaiType,
    justSaved,

    // Step flow
    presensiStep: att.presensiStep,
    jurnalStep: jnl.jurnalStep,
    nilaiStep: init.nilaiStep,
    reopenPresensi: att.reopenPresensi,

    // Status
    notice: init.notice,
    setNotice: init.setNotice,
    saving,
    saveAll,
    isDirty,

    // Utility
    todayDate: init.todayDate,
  };
}

/* ============================================================ */
/*  Helpers                                                      */
/* ============================================================ */

async function findAssignmentForSession(session: LessonSession, year: AcademicYear) {
  const teacherAssignments = await listAssignments(year.id);
  return teacherAssignments.find(
    (a) => a.teacherId === session.teacherId && a.classId === session.classId &&
      a.subject === session.subject && a.semester === session.semester && !a.deletedAt
  );
}

async function saveNilaiToGradeBook(
  year: AcademicYear, teacher: import("@guru-admin/domain").TeacherProfile, session: LessonSession,
  roster: ClassRoster | null, existingBook: GradeBook | null, nilaiMap: Map<string, number>,
  nilaiType: string
): Promise<void> {
  if (!roster || nilaiMap.size === 0) return;
  // 4a: Map nilaiType to the correct GradeEntry field
  const targetField = NILAI_TYPE_TO_FIELD[nilaiType] ?? "uh1";
  const baseEntries: GradeEntry[] = roster.students.sort((a, b) => a.number - b.number).map((s) => {
    const nilai = nilaiMap.get(s.id) ?? null;
    const existingEntry = existingBook?.entries.find((e) => e.studentId === s.id);
    if (existingEntry) {
      // Merge: only update the target field, preserve all other fields
      return { ...existingEntry, [targetField]: nilai ?? existingEntry[targetField as keyof GradeEntry] };
    }
    return {
      studentId: s.id, studentName: s.name, studentNumber: s.number, nis: s.nis,
      kd1: null, kd2: null, kd3: null, kd4: null, kd5: null, kd6: null,
      kd7: null, kd8: null, kd9: null, kd10: null,
      uh1: null, uh2: null, uh3: null, uh4: null, uh5: null, uh6: null,
      uh7: null, uh8: null, uh9: null, uh10: null,
      pts: null, pas: null, uts: null, uas: null,
      finalScore: null, averageKd: null,
      dailyScore: null, assignmentScore: null, summativeScore: null,
      remedialScore: null, averageScore: null,
      status: nilai !== null ? "complete" as const : "incomplete" as const,
      [targetField]: nilai,
    } as GradeEntry;
  });
  if (existingBook) {
    await updateGradeBook(existingBook.id, {
      entries: baseEntries, passingScore: existingBook.passingScore,
      gradeModel: existingBook.gradeModel ?? "uh", uhCount: existingBook.uhCount ?? 2,
      kdCount: existingBook.kdCount ?? 6, weightUH: existingBook.weightUH ?? 25,
      weightUTS: existingBook.weightUTS ?? 25, weightUAS: existingBook.weightUAS ?? 50,
    });
  } else {
    await saveGradeBook({
      academicYearId: year.id, teacherId: teacher.id, classId: session.classId,
      classLabel: session.classLabel, subject: session.subject, semester: session.semester,
      passingScore: 75, entries: baseEntries, status: "draft", gradeModel: "uh",
      uhCount: 2, kdCount: 6, weightUH: 25, weightUTS: 25, weightUAS: 50,
    });
  }
}
