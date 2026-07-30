/**
 * useKbmSession — Unified state hook for KBM Kilat flow.
 *
 * V4: REFACTOR TOTAL & COMPLETION
 *   - Realization Status (Terlaksana / Tidak Terlaksana / Diganti)
 *   - Copy Journal from previous session
 *   - Structured Note with 4 Category Tabs (Aktivitas, Respons, Hambatan, Tindak Lanjut)
 *   - Journal Finalize & Lock (isFinalized / locked)
 *   - Read-only mode when locked
 *   - MULAI KBM SESI INI action button
 *
 * Data flow:
 *   1. Init: load year, teacher, assignments (ALWAYS available)
 *   2. Cascading: Kelas → Mapel → Sesi (from assignments, not sessions)
 *   3. Select session → initAttendance + initJournal
 *   4. Presensi: changes Map → donePresensi (auto-generate narasi)
 *   5. Jurnal: structured note (4 categories) + narasi → doneJurnal
 *   6. Nilai (optional): toggle ON → nilaiMap
 *   7. saveAll → attendance-repo + journal-repo + gradebook-repo
 *   8. Finalize → lock journal + all steps
 *
 * DOMAIN-BOUNDARY: Module 1-harian, presentation hook only.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getLessonSessionsByDate,
  getLessonSession,
  findOrCreateManualSession,
  listLessonSessions,
  updateLessonSession,
} from "@shared/db/lesson-session-repo";
import {
  initAttendanceForSession,
  updateAttendance,
} from "@shared/db/attendance-repo";
import {
  initJournalForSession,
  updateJournal,
  finalizeJournal,
  unlockJournal,
} from "@shared/db/journal-repo";
import {
  findGradeBook,
  saveGradeBook,
  updateGradeBook,
} from "@shared/db/gradebook-repo";
import { findClassRoster } from "@shared/db/class-roster-repo";
import {
  getActiveAcademicYear,
  getTeacherProfile,
} from "@shared/db/profile-repo";
import { listAssignments } from "@shared/db/teaching-assignment-repo";
import {
  summarizeAttendance,
  buildJournalNarrative,
  packStructuredNote,
  unpackStructuredNote,
} from "@guru-admin/domain";
import type {
  AcademicYear,
  AttendanceRecord,
  AttendanceStatus,
  ClassRoster,
  GradeBook,
  GradeEntry,
  LessonSession,
  TeachingAssignment,
  TeachingJournal,
  TeacherProfile,
  JournalRealizationStatus,
} from "@guru-admin/domain";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";
import { ATTENDANCE_STATUS_OPTIONS } from "@shared/constants/attendance-status";
import type { StepState } from "@shared/ui/mobile/AccordionCard";

/* ============================================================ */
/*  Types                                                        */
/* ============================================================ */

export type ClassOption = {
  classId: string;
  classLabel: string;
};

export type SubjectOption = {
  subject: string;
  classId: string;
};

export type SessionOption = {
  session: LessonSession;
  meetingNumber: number;
  statusLabel: string;
  statusIcon: string;
  isToday: boolean;
  isDone: boolean;
  isUnfilled: boolean;
};

/** Structured note categories — 4 tabs for progressive disclosure */
export const STRUCTURED_NOTE_CATEGORIES = [
  { key: "activities", label: "Aktivitas", icon: "🎯" },
  { key: "studentResponse", label: "Respons", icon: "💡" },
  { key: "obstacle", label: "Hambatan", icon: "⚠️" },
  { key: "followUp", label: "Tindak Lanjut", icon: "🚀" },
] as const;

export type StructuredNoteCategory = (typeof STRUCTURED_NOTE_CATEGORIES)[number]["key"];

/** Quick choices for each structured note category */
export const STRUCTURED_CHIPS: Record<StructuredNoteCategory, readonly string[]> = {
  activities: [
    "Diskusi Kelompok",
    "Presentasi",
    "Ceramah",
    "Latihan",
    "Kuis",
    "Tanya Jawab",
    "Praktik",
    "Project",
  ] as const,
  studentResponse: [
    "Aktif",
    "Cukup aktif",
    "Masih pasif",
    "Perlu bimbingan",
    "Antusias",
  ] as const,
  obstacle: [
    "Sebagian siswa belum memahami materi",
    "Waktu pembelajaran terbatas",
    "Sebagian siswa belum aktif",
    "Tidak ada kendala berarti",
  ] as const,
  followUp: [
    "Penguatan materi",
    "Latihan tambahan",
    "Bimbingan individu",
    "Remedial ringan",
    "Dilanjutkan pertemuan berikutnya",
  ] as const,
};

/** Realization status options for Step 2 dropdown */
export const REALIZATION_STATUS_OPTIONS = [
  { value: "done" as const, label: "Terlaksana", color: "emerald" },
  { value: "continued" as const, label: "Diganti", color: "amber" },
  { value: "cancelled" as const, label: "Tidak Terlaksana", color: "rose" },
] as const;

/** Nilai type options */
export const NILAI_TYPE_OPTIONS = [
  { value: "uh1", label: "Ulangan Harian 1 (UH-1)" },
  { value: "uh2", label: "Ulangan Harian 2 (UH-2)" },
  { value: "uh3", label: "Ulangan Harian 3 (UH-3)" },
  { value: "pts", label: "Penilaian Tengah Semester (PTS)" },
  { value: "pas", label: "Penilaian Akhir Semester (PAS)" },
] as const;

/* ============================================================ */
/*  Hook                                                         */
/* ============================================================ */

export function useKbmSession() {
  const [searchParams] = useSearchParams();

  // Core state
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [assignments, setAssignments] = useState<TeachingAssignment[]>([]);
  const [sessions, setSessions] = useState<LessonSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<LessonSession | null>(null);
  const [roster, setRoster] = useState<ClassRoster | null>(null);

  // Cascading selector — driven by ASSIGNMENTS (not sessions)
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  // Attendance data
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [changes, setChanges] = useState<Map<string, AttendanceStatus>>(new Map());
  const [noteMap, setNoteMap] = useState<Map<string, string>>(new Map());

  // Journal data
  const [journal, setJournal] = useState<TeachingJournal | null>(null);
  const [journalInput, setJournalInput] = useState({
    actualMaterialTitle: "",
    note: "",
  });
  const [realizationStatus, setRealizationStatus] = useState<JournalRealizationStatus>("done");
  const [realizationReason, setRealizationReason] = useState("");
  const [structuredNote, setStructuredNote] = useState({
    activities: [] as string[],
    studentResponse: [] as string[],
    obstacle: [] as string[],
    followUp: [] as string[],
  });
  const [activeCategoryTab, setActiveCategoryTab] = useState<StructuredNoteCategory>("activities");
  const [isFinalized, setIsFinalized] = useState(false);

  // Nilai data
  const [gradeBook, setGradeBook] = useState<GradeBook | null>(null);
  const [nilaiMap, setNilaiMap] = useState<Map<string, number>>(new Map());
  const [nilaiToggle, setNilaiToggle] = useState(false);
  const [nilaiType, setNilaiType] = useState("uh1");

  // Step flow
  const [presensiStep, setPresensiStep] = useState<StepState>("active");
  const [jurnalStep, setJurnalStep] = useState<StepState>("pending");
  const [nilaiStep, setNilaiStep] = useState<StepState>("pending");
  const [showBottomBar, setShowBottomBar] = useState(false);

  // Status
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // B4-01: Dirty tracking — simple flag set when user edits, reset on save
  const [hasEdits, setHasEdits] = useState(false);
  const isDirty = useMemo(() => hasEdits || changes.size > 0 || noteMap.size > 0 || nilaiMap.size > 0, [hasEdits, changes.size, noteMap.size, nilaiMap.size]);

  /* ================================================================ */
  /*  Computed: Cascading selector — PRIMARY SOURCE = ASSIGNMENTS     */
  /* ================================================================ */

  const classOptions = useMemo<ClassOption[]>(() => {
    const seen = new Map<string, string>();
    for (const a of assignments) {
      if (!seen.has(a.classId)) {
        seen.set(a.classId, a.classLabel);
      }
    }
    return Array.from(seen.entries()).map(([classId, classLabel]) => ({
      classId,
      classLabel,
    })).sort((a, b) => a.classLabel.localeCompare(b.classLabel));
  }, [assignments]);

  const subjectOptions = useMemo<SubjectOption[]>(() => {
    if (!selectedClassId) return [];
    const filtered = assignments.filter((a) => a.classId === selectedClassId);
    const seen = new Set<string>();
    const result: SubjectOption[] = [];
    for (const a of filtered) {
      if (!seen.has(a.subject)) {
        seen.add(a.subject);
        result.push({ subject: a.subject, classId: a.classId });
      }
    }
    return result.sort((a, b) => a.subject.localeCompare(b.subject));
  }, [assignments, selectedClassId]);

  const filteredSessions = useMemo<SessionOption[]>(() => {
    if (!selectedClassId || !selectedSubject) return [];
    const filtered = sessions
      .filter((s) => s.classId === selectedClassId && s.subject === selectedSubject)
      .sort((a, b) => a.date.localeCompare(b.date) || a.startPeriod - b.startPeriod);

    const today = todayISODate();
    let meetingNumber = 0;

    return filtered.map((s) => {
      meetingNumber++;
      const isToday = s.date === today;
      const isDone = s.status === "done";
      const isUnfilled = s.status === "planned" && !isToday;

      let statusIcon = "⚠️";
      let statusLabel = "Belum Diisi";
      if (isDone) {
        statusIcon = "✓";
        statusLabel = "Selesai";
      } else if (isToday) {
        statusIcon = "⭐";
        statusLabel = "Hari Ini";
      }

      return {
        session: s,
        meetingNumber,
        statusLabel,
        statusIcon,
        isToday,
        isDone,
        isUnfilled,
      };
    });
  }, [sessions, selectedClassId, selectedSubject]);

  const hasNoSessions = useMemo(() => {
    if (!selectedClassId || !selectedSubject) return false;
    return filteredSessions.length === 0;
  }, [filteredSessions, selectedClassId, selectedSubject]);

  /* ---- Computed: Attendance ---- */

  const effectiveRecords = useMemo(() => {
    return records.map((r) => ({
      ...r,
      status: changes.get(r.studentId) ?? r.status,
    }));
  }, [records, changes]);

  const summary = useMemo(
    () => summarizeAttendance(effectiveRecords),
    [effectiveRecords]
  );

  const absentList = useMemo(() => {
    return effectiveRecords
      .filter((r) => r.status !== "present" && r.status !== "late")
      .map((r) => {
        const opt = ATTENDANCE_STATUS_OPTIONS.find((o) => o.value === r.status);
        return `${r.studentName} (${opt?.short ?? "?"})`;
      });
  }, [effectiveRecords]);

  /* ---- Computed: Auto-generated narasi from structured note ---- */

  const autoNarasi = useMemo(() => {
    const result = buildJournalNarrative({
      material: journalInput.actualMaterialTitle || undefined,
      activities: structuredNote.activities,
      studentResponse: structuredNote.studentResponse.join(", ") || undefined,
      obstacle: structuredNote.obstacle.join(", ") || undefined,
      followUp: structuredNote.followUp.join(", ") || undefined,
      freeNote: journalInput.note || undefined,
    });
    return [result.activityNarrative, result.noteNarrative, result.followUpNarrative]
      .filter(Boolean)
      .join(" ");
  }, [journalInput.actualMaterialTitle, journalInput.note, structuredNote]);

  /* ---- Computed: isReadyToStart — class+subject+session all selected ---- */

  const isReadyToStart = useMemo(() => {
    return !!(selectedClassId && selectedSubject && selectedSessionId);
  }, [selectedClassId, selectedSubject, selectedSessionId]);

  /* ================================================================ */
  /*  Init — Load year, teacher, assignments, and sessions            */
  /* ================================================================ */

  useEffect(() => {
    void (async () => {
      try {
        const activeYear = await getActiveAcademicYear();
        const profile = await getTeacherProfile();
        setYear(activeYear ?? null);
        setTeacher(profile);

        if (activeYear && profile) {
          // 1. Load TeachingAssignments — PRIMARY source for Kelas/Mapel
          const teacherAssignments = await listAssignments(activeYear.id);
          const myAssignments = teacherAssignments.filter(
            (a) => a.teacherId === profile.id && !a.deletedAt
          );
          setAssignments(myAssignments);

          // 2. Load ALL sessions for the teacher (for today + recent)
          const todaySessions = await getLessonSessionsByDate(
            profile.id,
            todayISODate()
          );
          setSessions(todaySessions);

          // 3. Auto-select from URL param or first available
          const sid = searchParams.get("sessionId");
          const stepParam = searchParams.get("step");

          // Set initial step from URL param (for bottom nav shortcuts)
          if (stepParam === "presensi") {
            setPresensiStep("active");
            setJurnalStep("pending");
            setNilaiStep("pending");
          } else if (stepParam === "jurnal") {
            setPresensiStep("done");
            setJurnalStep("active");
            setNilaiStep("pending");
          } else if (stepParam === "nilai") {
            setPresensiStep("done");
            setJurnalStep("done");
            setNilaiStep("active");
            setShowBottomBar(true);
          }

          if (sid) {
            setSelectedSessionId(sid);
            const targetSession = todaySessions.find((s) => s.id === sid);
            if (targetSession) {
              setSelectedClassId(targetSession.classId);
              setSelectedSubject(targetSession.subject);
            }
          } else if (myAssignments.length > 0) {
            // Auto-select first assignment's class+subject
            const first = myAssignments[0];
            setSelectedClassId(first.classId);
            setSelectedSubject(first.subject);

            // If there's a session for this class+subject today, auto-select it
            const matching = todaySessions.find(
              (s) => s.classId === first.classId && s.subject === first.subject && s.status === "planned"
            );
            if (matching) {
              setSelectedSessionId(matching.id);
            }
          }
        }
      } catch (err) {
        console.error("[useKbmSession] Gagal init:", err);
        setNotice("Gagal memuat data. Coba muat ulang.");
      } finally {
        setLoading(false);
      }
    })();
  }, [searchParams]);

  /* ================================================================ */
  /*  Load sessions for selected class+subject                        */
  /* ================================================================ */

  useEffect(() => {
    if (!year || !selectedClassId || !selectedSubject) return;
    void (async () => {
      try {
        const allSessions = await listLessonSessions(year.id);
        const relevant = allSessions.filter(
          (s) => s.classId === selectedClassId && s.subject === selectedSubject
        );
        setSessions((prev) => {
          const existingIds = new Set(prev.map((s) => s.id));
          const newOnes = relevant.filter((s) => !existingIds.has(s.id));
          return [...prev, ...newOnes];
        });
      } catch (err) {
        console.error("[useKbmSession] Gagal memuat sesi untuk kelas+mapel:", err);
      }
    })();
  }, [year, selectedClassId, selectedSubject]);

  /* ---- Load session data (attendance, journal, etc.) ---- */

  useEffect(() => {
    if (!selectedSessionId || !year) return;
    void (async () => {
      try {
        const session = await getLessonSession(selectedSessionId);
        if (!session) return;
        setSelectedSession(session);

        const r = await findClassRoster(year.id, session.classId);
        setRoster(r ?? null);

        // Init attendance
        const attRecords = await initAttendanceForSession({
          sessionId: session.id,
          date: session.date,
          roster: r ?? null,
        });
        setRecords(attRecords);
        setChanges(new Map());
        setNoteMap(new Map());
        setHasEdits(false); // B4-01: reset dirty on session load

        // Init journal
        const j = await initJournalForSession({
          session,
          attendanceRecords: attRecords,
        });
        setJournal(j);

        // Unpack structured note from journal
        const unpacked = unpackStructuredNote(j.note);
        setJournalInput({
          actualMaterialTitle: j.actualMaterialTitle ?? "",
          note: unpacked.freeNote,
        });
        setRealizationStatus(j.realizationStatus ?? "done");
        setRealizationReason("");
        setStructuredNote({
          activities: unpacked.activities,
          studentResponse: unpacked.studentResponse ? [unpacked.studentResponse] : [],
          obstacle: unpacked.obstacle ? [unpacked.obstacle] : [],
          followUp: j.followUp ? [j.followUp] : [],
        });
        setIsFinalized(j.locked ?? false);
        setActiveCategoryTab("activities");

        // Init gradebook
        const assignment = await findAssignmentForSession(session, year);
        if (assignment) {
          const existingBook = await findGradeBook({
            academicYearId: year.id,
            teacherId: session.teacherId,
            classId: session.classId,
            semester: session.semester,
            subject: session.subject,
          });
          setGradeBook(existingBook ?? null);
        } else {
          setGradeBook(null);
        }

        // Reset step flow — respect locked state
        if (j.locked) {
          setPresensiStep("done");
          setJurnalStep("done");
          setNilaiStep("done");
          setShowBottomBar(true);
        } else {
          setPresensiStep("active");
          setJurnalStep("pending");
          setNilaiStep("pending");
          setShowBottomBar(false);
        }
        setNilaiMap(new Map());
        setNilaiToggle(false);
      } catch (err) {
        console.error("[useKbmSession] Gagal memuat sesi:", err);
      }
    })();
  }, [selectedSessionId, year]);

  /* ================================================================ */
  /*  Actions: Attendance                                             */
  /* ================================================================ */

  function setStatus(studentId: string, status: AttendanceStatus) {
    const next = new Map(changes);
    next.set(studentId, status);
    setChanges(next);
    setHasEdits(true); // B4-01
  }

  function setAllPresent() {
    const next = new Map<string, AttendanceStatus>();
    for (const r of records) {
      next.set(r.studentId, "present");
    }
    setChanges(next);
    setNoteMap(new Map());
    setHasEdits(true); // B4-01
  }

  function setStudentNote(studentId: string, note: string) {
    const next = new Map(noteMap);
    if (note) {
      next.set(studentId, note);
    } else {
      next.delete(studentId);
    }
    setNoteMap(next);
    setHasEdits(true); // B4-01
  }

  /* ================================================================ */
  /*  Actions: Structured Note                                        */
  /* ================================================================ */

  function toggleStructuredChip(category: StructuredNoteCategory, chip: string) {
    setStructuredNote((prev) => {
      const current = prev[category];
      const next = current.includes(chip)
        ? current.filter((c) => c !== chip)
        : [...current, chip];
      return { ...prev, [category]: next };
    });
    setHasEdits(true); // B4-01
  }

  /* ================================================================ */
  /*  Actions: Step flow                                              */
  /* ================================================================ */

  function donePresensi() {
    setPresensiStep("done");
    setJurnalStep("active");
  }

  function doneJurnal() {
    setJurnalStep("done");
    setNilaiStep("active");
    setShowBottomBar(true);
  }

  /* ================================================================ */
  /*  Actions: Nilai                                                  */
  /* ================================================================ */

  function setNilai(studentId: string, value: number | null) {
    const next = new Map(nilaiMap);
    if (value !== null && value >= 0 && value <= 100) {
      next.set(studentId, value);
    } else {
      next.delete(studentId);
    }
    setNilaiMap(next);
    setHasEdits(true); // B4-01
  }

  /* ================================================================ */
  /*  Actions: Pertemuan Tambahan                                     */
  /* ================================================================ */

  const handlePertemuanTambahan = useCallback(async () => {
    if (!year || !teacher || !selectedClassId || !selectedSubject) return;

    const r = await findClassRoster(year.id, selectedClassId);
    if (!r) {
      setNotice("Roster kelas tidak ditemukan. Pastikan data kelas sudah diatur.");
      return;
    }

    try {
      const { session, created } = await findOrCreateManualSession({
        mode: "manual",
        academicYear: year,
        teacherId: teacher.id,
        roster: r,
        subject: selectedSubject,
        date: todayISODate(),
      });

      if (created) {
        setSessions((prev) => [...prev, session]);
      }

      setSelectedSessionId(session.id);
    } catch (err) {
      console.error("[useKbmSession] Gagal buat sesi tambahan:", err);
      setNotice("Gagal membuat sesi tambahan.");
    }
  }, [year, teacher, selectedClassId, selectedSubject]);

  /* ================================================================ */
  /*  Actions: Copy Journal from previous session                     */
  /* ================================================================ */

  const handleCopyPreviousJournal = useCallback(async () => {
    if (!year || !selectedClassId || !selectedSubject || !selectedSession) return;

    try {
      // Find the previous session for this class+subject
      const allSessions = await listLessonSessions(year.id);
      const relevant = allSessions
        .filter((s) => s.classId === selectedClassId && s.subject === selectedSubject && s.id !== selectedSession.id)
        .sort((a, b) => b.date.localeCompare(a.date));

      if (relevant.length === 0) {
        setNotice("Tidak ada jurnal sebelumnya untuk kelas & mapel ini.");
        return;
      }

      // Find the most recent session with a journal
      const { getJournalBySession } = await import("@shared/db/journal-repo");
      for (const prevSession of relevant) {
        const prevJournal = await getJournalBySession(prevSession.id);
        if (prevJournal && prevJournal.actualMaterialTitle) {
          setJournalInput((prev) => ({
            ...prev,
            actualMaterialTitle: prevJournal.actualMaterialTitle ?? prev.actualMaterialTitle,
          }));

          // Unpack the previous journal's structured note
          const unpacked = unpackStructuredNote(prevJournal.note);
          setStructuredNote((prev) => ({
            activities: unpacked.activities.length > 0 ? unpacked.activities : prev.activities,
            studentResponse: unpacked.studentResponse ? [unpacked.studentResponse] : prev.studentResponse,
            obstacle: unpacked.obstacle ? [unpacked.obstacle] : prev.obstacle,
            followUp: prevJournal.followUp ? [prevJournal.followUp] : (unpacked.freeNote ? prev.followUp : prev.followUp),
          }));

          setNotice("Jurnal sebelumnya berhasil disalin!");
          return;
        }
      }

      setNotice("Tidak ada jurnal sebelumnya yang berisi materi.");
    } catch (err) {
      console.error("[useKbmSession] Gagal salin jurnal:", err);
      setNotice("Gagal menyalin jurnal sebelumnya.");
    }
  }, [year, selectedClassId, selectedSubject, selectedSession]);

  /* ================================================================ */
  /*  Actions: Finalize & Lock                                        */
  /* ================================================================ */

  const handleFinalize = useCallback(async () => {
    if (!journal) return;
    try {
      const result = await finalizeJournal(journal.id);
      if (result.success && result.journal) {
        setJournal(result.journal);
        setIsFinalized(true);
        setPresensiStep("done");
        setJurnalStep("done");
        setNilaiStep("done");
        setNotice("Jurnal berhasil dikunci & difinalisasi!");
      } else {
        setNotice(result.errors.join(" ") || "Gagal finalisasi jurnal.");
      }
    } catch (err) {
      console.error("[useKbmSession] Gagal finalisasi:", err);
      setNotice("Gagal finalisasi jurnal.");
    }
  }, [journal]);

  const handleUnlock = useCallback(async () => {
    if (!journal) return;
    try {
      const unlocked = await unlockJournal(journal.id);
      if (unlocked) {
        setJournal(unlocked);
        setIsFinalized(false);
        setNotice("Jurnal berhasil dibuka kunci. Anda bisa mengedit kembali.");
      }
    } catch (err) {
      console.error("[useKbmSession] Gagal buka kunci:", err);
      setNotice("Gagal membuka kunci jurnal.");
    }
  }, [journal]);

  /* ================================================================ */
  /*  Actions: saveAll                                                */
  /* ================================================================ */

  const saveAll = useCallback(async () => {
    if (!selectedSessionId || !journal || !year || !teacher) return;
    setSaving(true);
    try {
      // 1. Save attendance changes
      if (changes.size > 0) {
        const payload = Array.from(changes.entries()).map(
          ([studentId, status]) => ({ studentId, status })
        );
        const updated = await updateAttendance(selectedSessionId, payload);
        setRecords(updated);
        setChanges(new Map());
      }

      // 2. Save journal — pack structured note + narasi
      const packedNote = packStructuredNote({
        activities: structuredNote.activities,
        studentResponse: structuredNote.studentResponse.join(", "),
        obstacle: structuredNote.obstacle.join(", "),
        freeNote: journalInput.note || "",
      });

      await updateJournal(journal.id, {
        actualMaterialTitle: journalInput.actualMaterialTitle || undefined,
        note: packedNote,
        followUp: structuredNote.followUp.join(", ") || undefined,
        realizationStatus,
      });

      // 3. Save nilai — integrate with gradebook-repo
      if (nilaiToggle && nilaiMap.size > 0 && selectedSession) {
        await saveNilaiToGradeBook(
          year,
          teacher,
          selectedSession,
          roster,
          gradeBook,
          nilaiMap
        );
      }

      // 4. Mark session as done
      if (selectedSession) {
        await updateLessonSession(selectedSession.id, { status: "done" });
        setSelectedSession((prev) => prev ? { ...prev, status: "done" } : null);
        setSessions((prev) =>
          prev.map((s) => s.id === selectedSession.id ? { ...s, status: "done" as const } : s)
        );
      }

      setNotice("KBM Sesi Berhasil Disimpan!");
      setHasEdits(false); // B4-01: reset dirty after save
    } catch (err) {
      console.error("[useKbmSession] Gagal simpan:", err);
      setNotice("Gagal menyimpan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }, [selectedSessionId, journal, changes, journalInput, structuredNote, realizationStatus, nilaiToggle, nilaiMap, year, teacher, selectedSession, roster, gradeBook, autoNarasi]);

  /* ---- Cascading selector handlers ---- */

  function handleClassChange(classId: string) {
    setSelectedClassId(classId);
    setSelectedSubject(null);
    setSelectedSessionId(null);
    setSelectedSession(null);
  }

  function handleSubjectChange(subject: string) {
    setSelectedSubject(subject);
    if (!selectedClassId) return;
    const matching = sessions
      .filter((s) => s.classId === selectedClassId && s.subject === subject)
      .sort((a, b) => a.date.localeCompare(b.date) || a.startPeriod - b.startPeriod);
    const firstUnfilled = matching.find((s) => s.status !== "done");
    if (firstUnfilled) {
      setSelectedSessionId(firstUnfilled.id);
    } else {
      setSelectedSessionId(null);
      setSelectedSession(null);
    }
  }

  /* ---- Return ---- */
  return {
    // Loading & core
    loading, year, teacher, sessions, assignments,
    selectedSessionId, setSelectedSessionId,
    selectedSession, roster,

    // Cascading selector (assignment-driven)
    selectedClassId, setSelectedClassId: handleClassChange,
    selectedSubject, setSelectedSubject: handleSubjectChange,
    classOptions, subjectOptions, filteredSessions,
    hasNoSessions, handlePertemuanTambahan,
    isReadyToStart,

    // Attendance
    records, changes, effectiveRecords, summary, absentList,
    noteMap, setStatus, setAllPresent, setStudentNote, donePresensi,

    // Journal
    journal, journalInput, setJournalInput,
    realizationStatus, setRealizationStatus,
    realizationReason, setRealizationReason,
    structuredNote, setStructuredNote, toggleStructuredChip,
    activeCategoryTab, setActiveCategoryTab,
    autoNarasi,
    doneJurnal,
    handleCopyPreviousJournal,

    // Finalize & Lock
    isFinalized, handleFinalize, handleUnlock,

    // Nilai
    gradeBook, nilaiMap,
    setNilai, nilaiToggle, setNilaiToggle, nilaiType, setNilaiType,

    // Step flow
    presensiStep, jurnalStep, nilaiStep,
    showBottomBar,

    // Status
    notice, setNotice, saving, saveAll,

    // B4-01: Dirty state
    isDirty,

    // Utility
    todayDate: formatLongDateID(todayISODate()),
  };
}

/* ============================================================ */
/*  Helper: Find assignment for session                          */
/* ============================================================ */

async function findAssignmentForSession(
  session: LessonSession,
  year: AcademicYear
) {
  const teacherAssignments = await listAssignments(year.id);
  return teacherAssignments.find(
    (a) =>
      a.teacherId === session.teacherId &&
      a.classId === session.classId &&
      a.subject === session.subject &&
      a.semester === session.semester &&
      !a.deletedAt
  );
}

/* ============================================================ */
/*  Helper: Save Nilai to GradeBook                             */
/* ============================================================ */

async function saveNilaiToGradeBook(
  year: AcademicYear,
  teacher: TeacherProfile,
  session: LessonSession,
  roster: ClassRoster | null,
  existingBook: GradeBook | null,
  nilaiMap: Map<string, number>
): Promise<void> {
  if (!roster || nilaiMap.size === 0) return;

  const baseEntries: GradeEntry[] = roster.students
    .sort((a, b) => a.number - b.number)
    .map((s) => {
      const nilai = nilaiMap.get(s.id) ?? null;
      const existingEntry = existingBook?.entries.find(
        (e) => e.studentId === s.id
      );

      if (existingEntry) {
        return {
          ...existingEntry,
          uh1: nilai ?? existingEntry.uh1,
        };
      }

      return {
        studentId: s.id,
        studentName: s.name,
        studentNumber: s.number,
        nis: s.nis,
        kd1: null, kd2: null, kd3: null, kd4: null, kd5: null, kd6: null,
        kd7: null, kd8: null, kd9: null, kd10: null,
        uh1: nilai,
        uh2: null, uh3: null, uh4: null, uh5: null, uh6: null,
        uh7: null, uh8: null, uh9: null, uh10: null,
        pts: null, pas: null, uts: null, uas: null,
        finalScore: null, averageKd: null,
        dailyScore: null, assignmentScore: null, summativeScore: null,
        remedialScore: null, averageScore: null,
        status: nilai !== null ? "complete" as const : "incomplete" as const,
      } as GradeEntry;
    });

  if (existingBook) {
    await updateGradeBook(existingBook.id, {
      entries: baseEntries,
      passingScore: existingBook.passingScore,
      gradeModel: existingBook.gradeModel ?? "uh",
      uhCount: existingBook.uhCount ?? 2,
      kdCount: existingBook.kdCount ?? 6,
      weightUH: existingBook.weightUH ?? 25,
      weightUTS: existingBook.weightUTS ?? 25,
      weightUAS: existingBook.weightUAS ?? 50,
    });
  } else {
    await saveGradeBook({
      academicYearId: year.id,
      teacherId: teacher.id,
      classId: session.classId,
      classLabel: session.classLabel,
      subject: session.subject,
      semester: session.semester,
      passingScore: 75,
      entries: baseEntries,
      status: "draft",
      gradeModel: "uh",
      uhCount: 2,
      kdCount: 6,
      weightUH: 25,
      weightUTS: 25,
      weightUAS: 50,
    });
  }
}
