/**
 * PATCH-03: Quick Journal — jurnal 10-30 detik.
 * Sumber: docs/V0_6_2_PRODUCT_DECISIONS.md §4
 *
 * PATCH-FLOW-RC2D:
 *   - Jurnal MEETING-FIRST dengan rekap total/sudah/belum sesuai Promes
 *     (via LessonSession yang sudah di-generate dari jadwal).
 *   - Tombol "Setujui & Simpan" memanggil finalizeJournal (locked=true).
 *   - Bila absensi belum ada, tampilkan CTA "Buat Absensi Dulu" —
 *     jangan auto-create absensi saat membuka jurnal.
 *   - Tombol terpisah: "Simpan Draft" (tanpa lock) vs "Setujui & Finalkan".
 *   - Window khusus Jurnal Susulan: daftar pertemuan belum jurnal dengan
 *     tombol "Buat Jurnal" per pertemuan.
 *
 * WYSIWYG-DOC-FASE9: Jurnal sebagai dokumen WYSIWYG.
 *   - Saat assignment dipilih → layout WYSIWYG: sidebar (kontrol) + DocumentPreview (dokumen).
 *   - Sidebar: konteks (assignment, tanggal, mode), rekap, daftar pertemuan, opsi darurat.
 *   - DocumentPreview: form editor (no-print) + formal journal document.
 *   - Auto-save ke schoolDocuments (docType: "jurnal-semester").
 *   - Uses ensureDoc pattern from FASE3 audit fixes.
 *   - Removed: showDocument toggle, PrintExportButtons (DocumentPreview handles printing).
 */

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, EmptyState, LoadingState } from "../../shared/ui";
import {
  getLessonSessionsByDate,
  findOrCreateManualSession,
  listLessonSessions,
} from "../../shared/db/lesson-session-repo";
import { findClassRoster } from "../../shared/db/class-roster-repo";
import {
  listJournals,
} from "../../shared/db/journal-repo";
import { getActiveAcademicYear, getTeacherProfile, getSchoolProfile } from "../../shared/db/profile-repo";
import { listAssignmentsByTeacher } from "../../shared/db/teaching-assignment-repo";
import type {
  LessonSession,
  TeachingJournal,
  AcademicYear,
  SchoolProfile,
  TeacherProfile,
  TeachingAssignment,
} from "@guru-admin/domain";
import {
  recapJournalsForAssignment,
  dateChangeRequiresConfirm,
} from "@guru-admin/domain";
import { todayISODate } from "@guru-admin/shared";

// WYSIWYG-DOC-FASE9
import { DocumentPreview } from "../../shared/documents";

// Extracted modules
import { JournalMode } from "./quickJournalTypes";
import { JournalSidebar } from "./JournalSidebar";
import { JournalUnfilledList } from "./JournalUnfilledList";
import { QuickJournalEditor } from "./QuickJournalEditor";
import { useJournalDocument } from "./useJournalDocument";

export function QuickJournalPage() {
  const [loading, setLoading] = useState(true);
  const [year, setActiveYear] = useState<AcademicYear | null>(null);
  const [school, setSchool] = useState<SchoolProfile | undefined>();
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [assignments, setAssignments] = useState<TeachingAssignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [date, setDate] = useState(todayISODate());
  const [sessions, setSessions] = useState<LessonSession[]>([]);
  const [allAssignmentSessions, setAllAssignmentSessions] = useState<LessonSession[]>([]);
  const [journals, setJournals] = useState<TeachingJournal[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [mode, setMode] = useState<JournalMode>("pertemuan");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [searchParams] = useSearchParams();
  // JOURNAL-REVIEW-NARRATIVE-03: Opsi Lainnya / Darurat (Jurnal Manual)
  const [showEmergencyOptions, setShowEmergencyOptions] = useState(false);

  // UX-DAILY-04: ref untuk auto-scroll ke editor jurnal
  const editorRef = useRef<HTMLDivElement | null>(null);

  // WYSIWYG-DOC-FASE9 sidebar visibility
  const [showSidebar, setShowSidebar] = useState(
    typeof window !== "undefined" && window.innerWidth >= 1024
  );
  const [docSemester, setDocSemester] = useState<1 | 2>(1);

  // WYSIWYG-DOC-FASE9 document lifecycle hook
  const {
    formatDokumen,
    docId,
    docStatus,
    setDocId,
    setDocStatus,
    handleSaveDoc,
    handleSetFinal,
    handleOrientationChange,
    docDataForAutoSave,
  } = useJournalDocument({
    year,
    selectedAssignmentId,
    assignments,
    selectedSessionId,
    journals,
    docSemester,
  });

  // JOURNAL-REVIEW-NARRATIVE-03 §9: Date Guard — bungkus setDate dengan konfirmasi
  function handleDateChange(newDate: string) {
    if (newDate === date) return;
    const hasActiveDraft = !!selectedSessionId;
    if (dateChangeRequiresConfirm({ hasActiveDraft, isFinal: false })) {
      const ok = window.confirm(
        "Mengganti tanggal akan menutup draft jurnal yang sedang diisi. Lanjutkan?"
      );
      if (!ok) return;
      // Tutup draft yang sedang aktif
      setSelectedSessionId(null);
    }
    setDate(newDate);
  }

  // UX-DAILY-04: clear selectedSessionId saat ganti assignment
  function handleAssignmentChange(newId: string) {
    if (selectedSessionId) {
      const ok = window.confirm(
        "Ganti Kelas dan Mapel akan menutup jurnal yang sedang diisi. Lanjutkan?"
      );
      if (!ok) return;
    }
    setSelectedAssignmentId(newId);
    setSelectedSessionId(null);
  }

  // UX-DAILY-03: auto-scroll ke editor saat selectedSessionId berubah
  useEffect(() => {
    if (selectedSessionId && editorRef.current) {
      editorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedSessionId]);

  useEffect(() => {
    void (async () => {
      try {
        const [y, sp, tp] = await Promise.all([getActiveAcademicYear(), getSchoolProfile(), getTeacherProfile()]);
        setActiveYear(y ?? null);
        setSchool(sp);
        setTeacher(tp);
        if (y && tp) {
          const todayISO = todayISODate();
          const sem: 1 | 2 =
            y.semester2Start <= todayISO && todayISO <= y.semester2End ? 2 : 1;
          setDocSemester(sem);
          setAssignments(await listAssignmentsByTeacher(tp.id, y.id, sem));
        }
        const urlSessionId = searchParams.get("sessionId");
        if (urlSessionId) setSelectedSessionId(urlSessionId);
        // UX-DAILY-06: baca ?mode=manual dari URL (dari tombol Today "Jurnal Manual")
        const urlMode = searchParams.get("mode");
        if (urlMode === "manual") {
          setMode("manual");
        } else if (urlMode === "susulan") {
          setMode("susulan");
        }
      } catch (err) {
        console.error("[QuickJournal] Gagal init:", err);
        setMessage({ type: "error", text: "Gagal memuat data. Coba muat ulang." });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!message) return;
    // RELEASE-FIXPACK-P1-P2-01: cleanup setTimeout untuk hindari race condition
    const t = setTimeout(() => setMessage(null), message.type === "error" ? 5000 : 3000);
    return () => clearTimeout(t);
  }, [message]);

  function selectedAssignment(): TeachingAssignment | undefined {
    return assignments.find((a) => a.id === selectedAssignmentId);
  }

  async function loadAssignmentData() {
    if (!year || !teacher) return;
    const assignment = selectedAssignment();
    if (!assignment) {
      setSessions([]);
      setAllAssignmentSessions([]);
      setJournals([]);
      return;
    }
    try {
      const allToday = await getLessonSessionsByDate(teacher.id, date);
      const todayForAssignment = allToday.filter(
        (s) => s.classId === assignment.classId && s.subject === assignment.subject
      );
      setSessions(todayForAssignment);

      const allSessions = await listLessonSessions(year.id, assignment.semester);
      const assignmentSessions = allSessions.filter(
        (s) =>
          s.classId === assignment.classId &&
          s.subject === assignment.subject &&
          s.teacherId === assignment.teacherId &&
          !s.deletedAt
      );
      setAllAssignmentSessions(assignmentSessions);

      const allJournals = await listJournals(year.id, assignment.semester);
      const assignmentJournals = allJournals.filter(
        (j) =>
          j.classId === assignment.classId &&
          j.subject === assignment.subject &&
          j.teacherId === assignment.teacherId
      );
      setJournals(assignmentJournals);
    } catch (err) {
      console.error("[QuickJournal] Gagal memuat data assignment:", err);
      setMessage({ type: "error", text: "Gagal memuat data jurnal." });
    }
  }

  useEffect(() => {
    void loadAssignmentData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssignmentId, date, year]);

  async function handleStartManualJournal() {
    if (!year || !teacher) return;
    const assignment = selectedAssignment();
    if (!assignment) {
      setMessage({ type: "error", text: "Pilih Kelas dan Mapel dulu." });
      return;
    }
    const roster = await findClassRoster(year.id, assignment.classId);
    if (!roster) {
      setMessage({ type: "error", text: `Belum ada roster untuk kelas ${assignment.classLabel}.` });
      return;
    }
    try {
      const { session } = await findOrCreateManualSession({
        mode: "manual",
        academicYear: year,
        teacherId: teacher.id,
        roster,
        subject: assignment.subject,
        date,
      });
      setSelectedSessionId(session.id);
      await loadAssignmentData();
      setMessage({ type: "success", text: "Sesi jurnal manual dibuat. Isi jurnal di bawah." });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Gagal membuat sesi." });
    }
  }

  // Sidebar reset handler
  function handleSidebarReset() {
    setSelectedAssignmentId("");
    setSelectedSessionId(null);
    setDocId(undefined);
    setDocStatus("draft");
  }

  if (loading) return <LoadingState />;

  if (!year) {
    return (
      <Card>
        <EmptyState
          title="Belum ada tahun pelajaran aktif"
          description="Buat tahun pelajaran baru atau gunakan data contoh terlebih dahulu."
        />
      </Card>
    );
  }

  const assignment = selectedAssignment();
  const recap = assignment
    ? recapJournalsForAssignment({
        sessions: allAssignmentSessions,
        journals,
        assignment,
      })
    : null;

  /* ================================================================ */
  /*  WYSIWYG VIEW — always sidebar + document, with hints when empty  */
  /* ================================================================ */

  return (
    <div className="doc-wysiwyg-layout">
      {/* ---------- MOBILE BACKDROP ---------- */}
      <div
        className={`doc-sidebar-backdrop no-print ${!showSidebar ? "doc-backdrop-hidden" : ""}`}
        onClick={() => setShowSidebar(false)}
        aria-hidden="true"
      />

      {/* ---------- SIDEBAR ---------- */}
      <JournalSidebar
        showSidebar={showSidebar}
        setShowSidebar={setShowSidebar}
        assignment={assignment}
        year={year}
        selectedAssignmentId={selectedAssignmentId}
        assignments={assignments}
        onAssignmentChange={handleAssignmentChange}
        date={date}
        onDateChange={handleDateChange}
        mode={mode}
        setMode={setMode}
        showEmergencyOptions={showEmergencyOptions}
        setShowEmergencyOptions={setShowEmergencyOptions}
        recap={recap}
        sessions={sessions}
        selectedSessionId={selectedSessionId}
        setSelectedSessionId={setSelectedSessionId}
        journals={journals}
        allAssignmentSessions={allAssignmentSessions}
        setDate={setDate}
        onStartManualJournal={handleStartManualJournal}
        onReset={handleSidebarReset}
      />

      {/* ---------- FLOATING SIDEBAR TOGGLE ---------- */}
      {!showSidebar && (
        <button
          type="button"
          className="doc-sidebar-toggle no-print"
          onClick={() => setShowSidebar(true)}
          title="Buka sidebar"
        >
          ☰
        </button>
      )}

      {/* ---------- DOCUMENT AREA ---------- */}
      <div className="doc-document-area">
        {message && (
          <div className={`p-3 rounded-md mb-3 no-print ${message.type === "success" ? "bg-emerald-50 border border-emerald-200 text-sm text-emerald-700" : "bg-rose-50 border border-rose-200 text-sm text-rose-700"}`} role="status" aria-live="polite">
            {message.text}
          </div>
        )}

        <DocumentPreview
          docId={docId}
          docType="jurnal-semester"
          orientation={formatDokumen}
          status={docStatus}
          data={docDataForAutoSave}
          onSave={handleSaveDoc}
          onSetFinal={handleSetFinal}
          onOrientationChange={handleOrientationChange}
        >
          {selectedSessionId ? (
            <QuickJournalEditor
              sessionId={selectedSessionId}
              academicYearId={year?.id ?? ""}
              schoolName={school?.name ?? ""}
              teacherName={assignment?.teacherName ?? teacher?.name ?? ""}
              onSaved={(msg) => {
                setMessage({ type: "success", text: msg });
                void loadAssignmentData();
                // UX-DAILY-03: clear selection setelah simpan di mode susulan
                if (mode === "susulan") setSelectedSessionId(null);
              }}
              onError={(msg) => setMessage({ type: "error", text: msg })}
            />
          ) : !assignment ? (
            <JournalUnfilledList
              hasAssignment={false}
              assignments={assignments}
              sessions={sessions}
              allAssignmentSessions={allAssignmentSessions}
              journals={journals}
              date={date}
              mode={mode}
              onSelectSession={(sid) => setSelectedSessionId(sid)}
            />
          ) : (
            <JournalUnfilledList
              hasAssignment={true}
              assignments={assignments}
              sessions={sessions}
              allAssignmentSessions={allAssignmentSessions}
              journals={journals}
              date={date}
              mode={mode}
              onSelectSession={(sid) => setSelectedSessionId(sid)}
            />
          )}
        </DocumentPreview>
      </div>
    </div>
  );
}
