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
 * WYSIWYG-DOC-FASE4: Jurnal sebagai dokumen WYSIWYG.
 *   - Saat assignment dipilih → layout WYSIWYG: sidebar (kontrol) + DocumentPreview (dokumen).
 *   - Sidebar: konteks (assignment, tanggal, mode), rekap, daftar pertemuan, opsi darurat.
 *   - DocumentPreview: form editor (no-print) + formal journal document.
 *   - Auto-save ke schoolDocuments (docType: "jurnal-semester").
 *   - Uses ensureDoc pattern from FASE3 audit fixes.
 *   - Removed: showDocument toggle, PrintExportButtons (DocumentPreview handles printing).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardHeader, Input, Textarea, Button, EmptyState, Badge, Select, ContextCard } from "../../shared/ui";
import {
  getLessonSessionsByDate,
  getLessonSession,
  findOrCreateManualSession,
  listLessonSessions,
} from "../../shared/db/lesson-session-repo";
import { findClassRoster } from "../../shared/db/class-roster-repo";
import {
  initJournalForSessionFull,
  updateJournal,
  finalizeJournal,
  unlockJournal,
  listJournals,
} from "../../shared/db/journal-repo";
import { listProtaProfiles } from "../../shared/db/prota-repo";
import { getActiveAcademicYear, getTeacherProfile, getSchoolProfile } from "../../shared/db/profile-repo";
import { listAssignmentsByTeacher } from "../../shared/db/teaching-assignment-repo";
import type {
  LessonSession,
  TeachingJournal,
  ProtaUnit,
  AcademicYear,
  SchoolProfile,
  TeacherProfile,
  TeachingAssignment,
} from "@guru-admin/domain";
import {
  assignmentShortLabel,
  recapJournalsForAssignment,
  buildContextInfo,
  buildJournalNarrative,
  canFinalizeJournal,
  dateChangeRequiresConfirm,
  packStructuredNote,
  unpackStructuredNote,
  JOURNAL_ACTIVITY_CHOICES,
  JOURNAL_RESPONSE_CHOICES,
  JOURNAL_OBSTACLE_CHOICES,
  JOURNAL_FOLLOWUP_CHOICES,
} from "@guru-admin/domain";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";
import { LoadingState } from "../../shared/ui";
// WYSIWYG-DOC-FASE4
import { DocumentPreview } from "../../shared/documents";
import {
  saveSchoolDocument,
  updateSchoolDocumentData,
  updateSchoolDocumentLayout,
  setSchoolDocumentStatus,
  findSchoolDocumentByCompositeKey,
} from "../../shared/db/school-document-repo";
import type { SchoolDocOrientation, DocumentStatus } from "@guru-admin/domain";

type RealizationStatus = TeachingJournal["realizationStatus"];
const REALIZATION_OPTIONS: Array<{ value: RealizationStatus; label: string }> = [
  { value: "done", label: "Selesai" },
  { value: "continued", label: "Dilanjutkan" },
  { value: "cancelled", label: "Tidak Terlaksana" },
];

type JournalMode = "pertemuan" | "manual" | "susulan";

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

  // WYSIWYG-DOC-FASE4
  const [showSidebar, setShowSidebar] = useState(
    typeof window !== "undefined" && window.innerWidth >= 1024
  );
  const [formatDokumen, setFormatDokumen] = useState<"portrait" | "landscape">("portrait");
  const [docId, setDocId] = useState<string | undefined>(undefined);
  const [docStatus, setDocStatus] = useState<DocumentStatus>("draft");
  const [docSemester, setDocSemester] = useState<1 | 2>(1);
  const ensuringRef = useRef(false);

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
      const [y, sp, tp] = await Promise.all([getActiveAcademicYear(), getSchoolProfile(), getTeacherProfile()]);
      setActiveYear(y ?? null);
      setSchool(sp);
      setTeacher(tp);
      if (y && tp) {
        const todayISO = todayISODate();
        const sem: 1 | 2 =
          y.semester2Start <= todayISO && todayISO <= y.semester2End ? 2 : 1;
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
      setLoading(false);
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

  // WYSIWYG-DOC-FASE4: ensureDoc (find-or-create schoolDocument)
  const ensureDoc = useCallback(async (asg: TeachingAssignment, semester: 1 | 2) => {
    if (!year || !asg) return;
    if (ensuringRef.current) return;
    ensuringRef.current = true;
    try {
      const existing = await findSchoolDocumentByCompositeKey({
        docType: "jurnal-semester",
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
          docType: "jurnal-semester",
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
    } finally {
      ensuringRef.current = false;
    }
  }, [year]);

  // When assignment changes, ensure doc
  useEffect(() => {
    const asg = assignments.find((a) => a.id === selectedAssignmentId);
    if (asg && year) {
      const sem: 1 | 2 = asg.semester;
      setDocSemester(sem);
      void ensureDoc(asg, sem);
    } else {
      setDocId(undefined);
      setDocStatus("draft");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssignmentId, assignments, year?.id, ensureDoc]);

  // WYSIWYG callbacks
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

  // Auto-save data memo
  const docDataForAutoSave = useMemo(() => {
    const asg = assignments.find((a) => a.id === selectedAssignmentId);
    if (!asg || !year) return {};
    return {
      semester: docSemester,
      tahunAjaran: year.label,
      subject: asg.subject,
      classLabel: asg.classLabel,
      selectedSessionId: selectedSessionId ?? "",
      journalStatus: journals.find((j) => j.sessionId === selectedSessionId)?.locked ? "final" : "draft",
    };
  }, [assignments, selectedAssignmentId, year, docSemester, selectedSessionId, journals]);

  if (loading) return <LoadingState />;

  const assignment = selectedAssignment();
  const recap = assignment
    ? recapJournalsForAssignment({
        sessions: allAssignmentSessions,
        journals,
        assignment,
      })
    : null;

  /* ================================================================ */
  /*  No assignment selected — show assignment picker                  */
  /* ================================================================ */
  if (!assignment) {
    return (
      <div className="space-y-4">
        <div className="page-header">
          <h1 className="text-2xl font-bold text-slate-900">Jurnal Mengajar</h1>
          <p className="text-sm text-slate-500 mt-1">
            {year ? `TP ${year.label}` : ""} · {formatLongDateID(date)}
          </p>
        </div>

        {message && (
          <div className={`info-banner-${message.type === "success" ? "success" : "error"}`}>
            {message.text}
          </div>
        )}

        <Card>
          <CardHeader
            title="Pilih Kelas dan Mapel"
            description="Pilih paket mengajar. Mapel+kelas+guru otomatis terikat."
          />
          {assignments.length === 0 ? (
            <EmptyState
              title="Belum ada Kelas dan Mapel"
              description="Buka menu 'Kelas dan Mapel' untuk membuat assignment dulu."
              action={<Button variant="secondary" onClick={() => (window.location.hash = "#/assignments")}>Buka Kelas dan Mapel</Button>}
            />
          ) : (
            <Select
              label="Kelas dan Mapel"
              id="jrn-assignment"
              value={selectedAssignmentId}
              onChange={handleAssignmentChange}
              options={[
                { value: "", label: "-- Pilih --" },
                ...assignments.map((a) => ({
                  value: a.id,
                  label: `${a.classLabel} · ${a.subject} · ${a.teacherName}`,
                })),
              ]}
            />
          )}
        </Card>
      </div>
    );
  }

  /* ================================================================ */
  /*  WYSIWYG VIEW — assignment selected, sidebar + document           */
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
      <aside className={`doc-sidebar no-print ${!showSidebar ? "doc-sidebar-hidden" : ""}`}>
        <div className="doc-sidebar-header">
          <h2 className="text-sm font-bold text-slate-900">Jurnal Mengajar</h2>
          <button
            type="button"
            className="doc-sidebar-close"
            onClick={() => setShowSidebar(false)}
            title="Tutup sidebar"
          >
            ✕
          </button>
        </div>

        {/* -- Konteks -- */}
        <div className="doc-sidebar-section">
          <h3 className="doc-sidebar-section-title">Konteks</h3>
          <Select
            label="Kelas dan Mapel"
            id="jrn-assignment-wys"
            value={selectedAssignmentId}
            onChange={handleAssignmentChange}
            options={[
              { value: "", label: "-- Pilih --" },
              ...assignments.map((a) => ({
                value: a.id,
                label: `${a.classLabel} · ${a.subject}`,
              })),
            ]}
          />
          {year && <ContextCard info={buildContextInfo({ assignment, academicYear: year })} />}
          <div className="mt-2">
            <Input label="Tanggal" id="jrn-date-wys" type="date" value={date} onChange={handleDateChange} />
          </div>
        </div>

        {/* -- Mode -- */}
        <div className="doc-sidebar-section">
          <h3 className="doc-sidebar-section-title">Mode</h3>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={mode === "pertemuan" ? "primary" : "secondary"}
              onClick={() => setMode("pertemuan")}
              className="text-xs flex-1"
            >
              Hari Ini
            </Button>
            <Button
              variant={mode === "susulan" ? "primary" : "secondary"}
              onClick={() => setMode("susulan")}
              className="text-xs flex-1"
            >
              Susulan
            </Button>
            <Button
              variant={showEmergencyOptions ? "danger" : "secondary"}
              onClick={() => setShowEmergencyOptions(!showEmergencyOptions)}
              className="text-xs"
            >
              {showEmergencyOptions ? "▲" : "▼"} Opsi
            </Button>
          </div>
        </div>

        {/* -- Rekap jurnal -- */}
        {recap && (
          <div className="doc-sidebar-section">
            <h3 className="doc-sidebar-section-title">Rekap</h3>
            <dl className="doc-summary-dl">
              <div><dt>Total Pertemuan</dt><dd>{recap.total}</dd></div>
              <div><dt>Sudah Jurnal</dt><dd className="kme-effective-text">{recap.done}</dd></div>
              <div><dt>Belum Jurnal</dt><dd className="kme-ineffective-text">{recap.pending}</dd></div>
              <div><dt>Batal</dt><dd>{recap.cancelled}</dd></div>
            </dl>
          </div>
        )}

        {/* -- Daftar Pertemuan: Mode Hari Ini -- */}
        {mode === "pertemuan" && (
          <div className="doc-sidebar-section">
            <h3 className="doc-sidebar-section-title">
              Pertemuan Hari Ini
              <span className="font-normal text-slate-400 ml-1">({sessions.length})</span>
            </h3>
            {sessions.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Tidak ada sesi di tanggal ini.</p>
            ) : (
              <ul className="doc-sidebar-list">
                {sessions.map((s) => {
                  const hasJournal = journals.some((j) => j.sessionId === s.id);
                  const isManual = s.teachingScheduleId === "manual" || s.teachingScheduleId === "susulan";
                  const isActive = selectedSessionId === s.id;
                  return (
                    <li
                      key={s.id}
                      className={`doc-sidebar-list-item cursor-pointer ${
                        isActive ? "bg-brand-50 border-brand-200" : ""
                      } ${s.status === "cancelled" ? "opacity-50" : ""}`}
                      onClick={() => setSelectedSessionId(s.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === "Enter") setSelectedSessionId(s.id); }}
                    >
                      <span className="doc-sidebar-list-title">
                        {isManual ? "Manual" : `Jam ${s.startPeriod}`}
                        {!isManual && <span className="text-slate-400"> · {s.startTime}–{s.endTime}</span>}
                      </span>
                      {isActive ? (
                        <Badge variant="success">Aktif</Badge>
                      ) : hasJournal ? (
                        <Badge variant="success">✓</Badge>
                      ) : s.status === "cancelled" ? (
                        <Badge variant="error">Batal</Badge>
                      ) : (
                        <Badge variant="warning">Belum</Badge>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* -- Daftar Pertemuan: Mode Susulan -- */}
        {mode === "susulan" && recap && (
          <div className="doc-sidebar-section">
            <h3 className="doc-sidebar-section-title">
              Jurnal Susulan
              <span className="font-normal text-slate-400 ml-1">({recap.pending} belum)</span>
            </h3>
            {allAssignmentSessions.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Belum ada pertemuan.</p>
            ) : (
              <ul className="doc-sidebar-list" style={{ maxHeight: 320 }}>
                {[...recap.doneMeetings, ...recap.pendingMeetings]
                  .sort((a, b) => a.date.localeCompare(b.date) || a.startPeriod - b.startPeriod)
                  .map((s, i) => {
                    const done = recap.doneMeetings.some((d) => d.id === s.id);
                    const isActive = selectedSessionId === s.id;
                    return (
                      <li
                        key={s.id}
                        className={`doc-sidebar-list-item cursor-pointer ${
                          isActive ? "bg-brand-50 border-brand-200" : ""
                        } ${done ? "" : "bg-rose-50"}`}
                        onClick={() => {
                          setDate(s.date);
                          setSelectedSessionId(s.id);
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { setDate(s.date); setSelectedSessionId(s.id); }
                        }}
                      >
                        <span className="doc-sidebar-list-title">
                          P{i + 1} · {formatLongDateID(s.date)}
                        </span>
                        {isActive ? (
                          <Badge variant="success">Aktif</Badge>
                        ) : done ? (
                          <Badge variant="success">✓</Badge>
                        ) : (
                          <Badge variant="error">Susulan</Badge>
                        )}
                      </li>
                    );
                  })}
              </ul>
            )}
          </div>
        )}

        {/* -- Opsi Darurat -- */}
        {showEmergencyOptions && (
          <div className="doc-sidebar-section">
            <h3 className="doc-sidebar-section-title">Opsi Darurat</h3>
            <p className="text-xs text-amber-800 mb-2">
              Hanya untuk kondisi darurat bila sesi tidak tersedia di jadwal.
            </p>
            <Button
              variant={mode === "manual" ? "primary" : "secondary"}
              onClick={() => setMode("manual")}
              className="text-xs w-full"
            >
              Buat Jurnal di Luar Jadwal
            </Button>
          </div>
        )}

        {/* -- Mode Manual CTA -- */}
        {mode === "manual" && (
          <div className="doc-sidebar-section">
            <h3 className="doc-sidebar-section-title">Jurnal Darurat</h3>
            <p className="text-xs text-amber-800 mb-2">
              {assignmentShortLabel(assignment)} · {formatLongDateID(date)}
            </p>
            <Button onClick={handleStartManualJournal} className="text-xs w-full">
              Mulai Jurnal Darurat
            </Button>
            <p className="text-[10px] text-slate-400 mt-1">
              Sesi manual yang sudah ada akan dipakai ulang.
            </p>
          </div>
        )}

        {/* -- Footer -- */}
        <div className="doc-sidebar-section doc-sidebar-footer">
          <Button
            variant="secondary"
            onClick={() => {
              setSelectedAssignmentId("");
              setSelectedSessionId(null);
              setDocId(undefined);
              setDocStatus("draft");
            }}
            className="w-full"
          >
            ← Kembali
          </Button>
        </div>
      </aside>

      {/* ---------- DOCUMENT AREA ---------- */}
      <div className="doc-document-area">
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
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
              <div style={{ textAlign: "center", color: "#94a3b8" }}>
                <p style={{ fontSize: "2rem", marginBottom: 8 }}>📝</p>
                <p style={{ fontWeight: 600 }}>Pilih Pertemuan</p>
                <p style={{ fontSize: "0.8rem", marginTop: 4 }}>
                  Pilih sesi di sidebar untuk mulai mengisi jurnal.
                </p>
              </div>
            </div>
          )}
        </DocumentPreview>
      </div>

      {/* ---------- SIDEBAR TOGGLE ---------- */}
      {!showSidebar && (
        <button
          type="button"
          className="doc-sidebar-toggle no-print"
          onClick={() => setShowSidebar(true)}
          title="Buka sidebar"
          aria-label="Buka sidebar"
          aria-expanded={showSidebar}
        >
          ☰
        </button>
      )}

      {/* Toast messages */}
      {message && (
        <div className={`doc-toast doc-toast-${message.type === "success" ? "success" : "error"} no-print`} role="status" aria-live="polite">
          {message.text}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  QuickJournalEditor — sub-component for editing a single session    */
/*  WYSIWYG-DOC-FASE4: no showDocument toggle, no PrintExportButtons   */
/* ================================================================== */

function QuickJournalEditor({
  sessionId,
  academicYearId,
  schoolName,
  teacherName,
  onSaved,
  onError,
}: {
  sessionId: string;
  academicYearId: string;
  schoolName: string;
  teacherName: string;
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<LessonSession | null>(null);
  const [journal, setJournal] = useState<TeachingJournal | null>(null);
  const [needsAttendance, setNeedsAttendance] = useState(false);

  // JOURNAL-REVIEW-NARRATIVE-03 §4: review state
  const [reviewOpened, setReviewOpened] = useState(false);

  // Realization + material + followUp (existing schema fields)
  const [realizationStatus, setRealizationStatus] = useState<RealizationStatus>("done");
  const [actualMaterialTitle, setActualMaterialTitle] = useState("");
  const [followUp, setFollowUp] = useState("");

  // JOURNAL-REVIEW-NARRATIVE-03 §5: structured input (stored as JSON in `note`)
  const [activities, setActivities] = useState<string[]>([]);
  const [studentResponse, setStudentResponse] = useState("");
  const [obstacle, setObstacle] = useState("");
  const [freeNote, setFreeNote] = useState("");

  const [availableUnits, setAvailableUnits] = useState<ProtaUnit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");

  // Helper: reset reviewOpened saat input berubah (spec §4: "Jika isi jurnal berubah setelah review, reviewOpened kembali false.")
  function invalidateReview() {
    setReviewOpened(false);
  }

  // Wrapped setters that invalidate review
  function setActualMaterial(v: string) { setActualMaterialTitle(v); invalidateReview(); }
  function setActivitiesList(v: string[]) { setActivities(v); invalidateReview(); }
  function setResponse(v: string) { setStudentResponse(v); invalidateReview(); }
  function setObstacleVal(v: string) { setObstacle(v); invalidateReview(); }
  function setFreeNoteVal(v: string) { setFreeNote(v); invalidateReview(); }
  function setFollowUpVal(v: string) { setFollowUp(v); invalidateReview(); }
  function setRealization(v: RealizationStatus) { setRealizationStatus(v); invalidateReview(); }

  useEffect(() => {
    void (async () => {
      const sess = await getLessonSession(sessionId);
      if (!sess) { onError("Sesi tidak ditemukan"); setLoading(false); return; }
      setSession(sess);

      const roster = academicYearId ? await findClassRoster(academicYearId, sess.classId) : null;

      if (academicYearId) {
        const ps = await listProtaProfiles(academicYearId);
        const matchingProta = ps.find((p) => p.subject === sess.subject);
        if (matchingProta) {
          const units = matchingProta.units.filter((u) => u.semester === sess.semester);
          setAvailableUnits(units);
        }
      }

      // PATCH-FLOW-RC2D: jangan auto-create absensi
      const result = await initJournalForSessionFull({
        session: sess,
        roster: roster ?? null,
        plannedUnit: null,
      });
      if (result) {
        setJournal(result.journal);
        setNeedsAttendance(result.needsAttendance);
        setRealizationStatus(result.journal.realizationStatus);
        setActualMaterialTitle(result.journal.actualMaterialTitle ?? "");
        setFollowUp(result.journal.followUp ?? "");
        // JOURNAL-REVIEW-NARRATIVE-03: unpack structured note
        const structured = unpackStructuredNote(result.journal.note);
        setActivities(structured.activities);
        setStudentResponse(structured.studentResponse);
        setObstacle(structured.obstacle);
        setFreeNote(structured.freeNote);
        if (result.journal.plannedUnitId) setSelectedUnitId(result.journal.plannedUnitId);
        // Review dimulai tertutup. Bila jurnal sudah final, anggap review sudah dilakukan.
        setReviewOpened(result.journal.locked);
      }
      setLoading(false);
    })();
  // RELEASE-FIXPACK-P1-P2-01: tambah academicYearId ke deps untuk hindari stale closure
  }, [sessionId, academicYearId]);

  // JOURNAL-REVIEW-NARRATIVE-03 §6: build narrative on-the-fly for preview/print
  const narrative = useMemo(
    () => buildJournalNarrative({
      material: actualMaterialTitle || journal?.plannedMaterialTitle || "",
      activities,
      studentResponse,
      obstacle,
      followUp,
      freeNote,
    }),
    [actualMaterialTitle, journal, activities, studentResponse, obstacle, followUp, freeNote],
  );

  // JOURNAL-REVIEW-NARRATIVE-03 §4: tombol final aktif hanya bila canFinalizeJournal.ok
  const finalizeCheck = canFinalizeJournal({
    material: actualMaterialTitle || journal?.plannedMaterialTitle || "",
    activities,
    reviewOpened,
  });

  async function handleSaveDraft() {
    if (!journal) return;
    try {
      const structuredNote = packStructuredNote({ activities, studentResponse, obstacle, freeNote });
      const updated = await updateJournal(journal.id, {
        realizationStatus,
        actualMaterialTitle: actualMaterialTitle || undefined,
        note: structuredNote,
        followUp: followUp || undefined,
      });
      if (updated) {
        setJournal(updated);
        onSaved("Draft jurnal tersimpan.");
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : "Gagal menyimpan.");
    }
  }

  // JOURNAL-REVIEW-NARRATIVE-03: Setujui & Finalkan = review + finalize
  async function handleApproveAndFinalize() {
    if (!journal) return;
    // Spec §4: validasi final wajib review dibuka
    if (!finalizeCheck.ok) {
      // RELEASE-FIXPACK-P1-P2-01: jangan panggil onError dengan string kosong.
      // Hanya panggil onError bila ada pesan error yang jelas.
      onError(finalizeCheck.message);
      return;
    }
    try {
      const structuredNote = packStructuredNote({ activities, studentResponse, obstacle, freeNote });
      // Simpan input dulu
      const updated = await updateJournal(journal.id, {
        realizationStatus,
        actualMaterialTitle: actualMaterialTitle || undefined,
        note: structuredNote,
        followUp: followUp || undefined,
      });
      if (!updated) {
        onError("Gagal menyimpan input.");
        return;
      }
      // Lalu finalize (lock)
      const result = await finalizeJournal(updated.id);
      if (result.success && result.journal) {
        setJournal(result.journal);
        onSaved("Jurnal disetujui & difinalkan (terkunci).");
      } else {
        onError(result.errors.join(", ") || "Gagal finalisasi jurnal.");
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : "Gagal finalisasi.");
    }
  }

  async function handleUnlock() {
    if (!journal) return;
    try {
      const unlocked = await unlockJournal(journal.id);
      if (unlocked) {
        setJournal(unlocked);
        setReviewOpened(false); // reset review saat buka revisi
        onSaved("Jurnal dibuka kembali (draft).");
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : "Gagal unlock.");
    }
  }

  async function handleCopyPrevious() {
    if (!session || !journal) return;
    try {
      const allJournals = await listJournals(session.academicYearId, session.semester);
      const prev = allJournals
        .filter(
          (j) =>
            j.classId === session.classId &&
            j.subject === session.subject &&
            j.date < session.date
        )
        .sort((a, b) => b.date.localeCompare(a.date))[0];

      if (prev) {
        setActualMaterialTitle(prev.actualMaterialTitle ?? prev.plannedMaterialTitle ?? "");
        const structured = unpackStructuredNote(prev.note);
        setActivities(structured.activities);
        setStudentResponse(structured.studentResponse);
        setObstacle(structured.obstacle);
        setFreeNote(structured.freeNote);
        setFollowUp(prev.followUp ?? "");
        setRealizationStatus(prev.realizationStatus);
        invalidateReview();
        onSaved("Disalin dari jurnal sebelumnya. Buka review lalu Setujui & Finalkan.");
      } else {
        onError("Tidak ada jurnal sebelumnya untuk kelas+mapel ini.");
      }
    } catch (e) {
      void e;
      onError("Gagal salin jurnal sebelumnya.");
    }
  }

  function handleUnitChange(unitId: string) {
    setSelectedUnitId(unitId);
    const unit = availableUnits.find((u) => u.id === unitId);
    if (unit) {
      setActualMaterial(unit.title);
    }
  }

  // Toggle activity chip
  function toggleActivity(activity: string) {
    if (activities.includes(activity)) {
      setActivitiesList(activities.filter((a) => a !== activity));
    } else {
      setActivitiesList([...activities, activity]);
    }
  }

  if (loading) return <LoadingState message="Memuat jurnal..." />;
  if (!session || !journal) return null;

  const isLocked = journal.locked;
  const isManualSession = session.teachingScheduleId === "manual" || session.teachingScheduleId === "susulan";
  const effectiveMaterial = actualMaterialTitle || journal.plannedMaterialTitle || "";

  return (
    <>
      {/* ========== FORM SECTION (no-print) ========== */}
      <div className="no-print" style={{ marginBottom: "1rem" }}>
        {/* Header badges */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
          <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Jurnal — {session.classLabel}</span>
          <Badge variant={isLocked ? "success" : "neutral"}>{isLocked ? "Final" : "Draft"}</Badge>
          {reviewOpened && !isLocked && <Badge variant="success">✓ Review dibuka</Badge>}
          {journal.totalStudents > 0 && (
            <Badge variant="neutral">
              H:{journal.presentCount} S:{journal.sickCount} I:{journal.excusedCount} A:{journal.absentCount}
            </Badge>
          )}
        </div>

        {/* PATCH-FLOW-RC2D: warning bila belum ada absensi */}
        {needsAttendance && !isLocked && (
          <div style={{ padding: 12, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, marginBottom: 12 }}>
            <p style={{ fontWeight: 600, color: "#92400e", fontSize: "0.85rem" }}>Belum ada absensi untuk sesi ini</p>
            <p style={{ fontSize: "0.75rem", color: "#92400e", marginTop: 4 }}>
              Jurnal tidak akan punya data kehadiran. Buat absensi dulu di menu Absen, atau lanjut simpan draft tanpa data kehadiran.
            </p>
            <Button
              variant="secondary"
              className="text-xs mt-2"
              onClick={() => (window.location.hash = `/attendance?sessionId=${session.id}`)}
            >
              Buat Absensi Dulu
            </Button>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {!isLocked ? (
            <>
              <Button
                onClick={handleApproveAndFinalize}
                disabled={!finalizeCheck.ok}
                className="bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ✓ Setujui & Finalkan
              </Button>
              <Button variant="secondary" onClick={handleSaveDraft}>
                Simpan Draft
              </Button>
              <Button
                variant={reviewOpened ? "primary" : "secondary"}
                onClick={() => setReviewOpened(true)}
              >
                {reviewOpened ? "✓ Review Dibuka" : "Lihat Review"}
              </Button>
              <Button variant="secondary" onClick={handleCopyPrevious}>
                Salin Sebelumnya
              </Button>
            </>
          ) : (
            <>
              <Badge variant="success">Jurnal Final (terkunci)</Badge>
              <Button variant="secondary" onClick={handleUnlock}>
                Buka Kembali
              </Button>
            </>
          )}
        </div>

        {/* Validasi hint */}
        {!isLocked && !finalizeCheck.ok && (
          <div style={{ padding: 8, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 4, fontSize: "0.75rem", color: "#92400e", marginBottom: 12 }}>
            ⚠ {finalizeCheck.message}
          </div>
        )}

        {/* Form inputs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Auto-fill info */}
          <div style={{ padding: 10, background: "#f8fafc", borderRadius: 6, fontSize: "0.8rem" }}>
            <p style={{ fontSize: "0.65rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
              Auto-fill (dari assignment + sesi + Prota + absensi)
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: "0.75rem" }}>
              <div><span style={{ color: "#94a3b8" }}>Guru:</span> <strong>{teacherName}</strong></div>
              <div><span style={{ color: "#94a3b8" }}>Mapel:</span> <strong>{journal.subject}</strong></div>
              <div><span style={{ color: "#94a3b8" }}>Kelas:</span> <strong>{journal.classLabel}</strong></div>
              <div><span style={{ color: "#94a3b8" }}>Tanggal:</span> <strong>{formatLongDateID(journal.date)}</strong></div>
              <div><span style={{ color: "#94a3b8" }}>Materi (Promes):</span> <strong>{journal.plannedMaterialTitle ?? "-"}</strong></div>
              <div><span style={{ color: "#94a3b8" }}>TP:</span> <strong>{journal.plannedLearningOutcome ?? "-"}</strong></div>
            </div>
          </div>

          {availableUnits.length > 0 && (
            <Select
              label="Ganti Materi (dari Prota)"
              id="jrn-unit"
              value={selectedUnitId}
              onChange={handleUnitChange}
              options={[
                { value: "", label: "-- Pakai materi Promes --" },
                ...availableUnits.map((u) => ({ value: u.id, label: `${u.title} (${u.jp} JP)` })),
              ]}
            />
          )}

          <Input
            label="Materi / Pokok Bahasan"
            id="jrn-material"
            value={actualMaterialTitle}
            onChange={setActualMaterial}
            placeholder={journal.plannedMaterialTitle ?? "Tulis materi"}
          />

          {/* JOURNAL-REVIEW-NARRATIVE-03 §5: Kegiatan Pembelajaran (chip quick choices) */}
          <div>
            <label className="label">Kegiatan Pembelajaran</label>
            <div className="flex gap-2 flex-wrap">
              {JOURNAL_ACTIVITY_CHOICES.map((kegiatan) => (
                <button
                  key={kegiatan}
                  type="button"
                  disabled={isLocked}
                  onClick={() => toggleActivity(kegiatan)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                    activities.includes(kegiatan)
                      ? "border-brand-500 bg-brand-100 text-brand-800"
                      : "border-brand-300 text-brand-700 bg-brand-50 hover:bg-brand-100"
                  } ${isLocked ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {kegiatan}
                </button>
              ))}
            </div>
            {activities.length > 0 && (
              <p className="text-xs text-slate-500 mt-2">
                Terpilih: {activities.join(", ")}
              </p>
            )}
          </div>

          <Select
            label="Realisasi"
            id="jrn-real"
            value={realizationStatus}
            onChange={(v) => setRealization(v as RealizationStatus)}
            options={REALIZATION_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
          />

          {/* JOURNAL-REVIEW-NARRATIVE-03 §5: Respons Siswa (chip quick choices) */}
          <div>
            <label className="label">Respons Siswa</label>
            <div className="flex gap-2 flex-wrap">
              {JOURNAL_RESPONSE_CHOICES.map((resp) => (
                <button
                  key={resp}
                  type="button"
                  disabled={isLocked}
                  onClick={() => setResponse(studentResponse === resp ? "" : resp)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                    studentResponse === resp
                      ? "border-emerald-500 bg-emerald-100 text-emerald-800"
                      : "border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                  } ${isLocked ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {resp}
                </button>
              ))}
            </div>
          </div>

          {/* JOURNAL-REVIEW-NARRATIVE-03 §5: Kendala / Catatan (chip quick choices) */}
          <div>
            <label className="label">Kendala / Catatan</label>
            <div className="flex gap-2 flex-wrap">
              {JOURNAL_OBSTACLE_CHOICES.map((obs) => (
                <button
                  key={obs}
                  type="button"
                  disabled={isLocked}
                  onClick={() => setObstacleVal(obstacle === obs ? "" : obs)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                    obstacle === obs
                      ? "border-amber-500 bg-amber-100 text-amber-800"
                      : "border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100"
                  } ${isLocked ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {obs}
                </button>
              ))}
            </div>
          </div>

          {/* JOURNAL-REVIEW-NARRATIVE-03 §5: Catatan tambahan bebas */}
          <Textarea
            label="Catatan Tambahan (opsional)"
            id="jrn-freenote"
            value={freeNote}
            onChange={setFreeNoteVal}
            rows={2}
            placeholder="Catatan tambahan dari guru..."
          />

          {/* JOURNAL-REVIEW-NARRATIVE-03 §5: Tindak Lanjut (chip quick choices) */}
          <div>
            <label className="label">Tindak Lanjut</label>
            <div className="flex gap-2 flex-wrap">
              {JOURNAL_FOLLOWUP_CHOICES.map((fu) => (
                <button
                  key={fu}
                  type="button"
                  disabled={isLocked}
                  onClick={() => setFollowUpVal(followUp === fu ? "" : fu)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                    followUp === fu
                      ? "border-sky-500 bg-sky-100 text-sky-800"
                      : "border-sky-300 text-sky-700 bg-sky-50 hover:bg-sky-100"
                  } ${isLocked ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {fu}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ========== DOCUMENT SECTION (always visible, printed) ========== */}
      <div className="document-page document-portrait">
        <div className="document-title">JURNAL MENGAJAR</div>
        <div className="document-subtitle">{schoolName}</div>
        <table className="document-identity">
          <tbody>
            <tr>
              <td>Mata Pelajaran</td><td>{journal.subject}</td>
              <td>Kelas</td><td>{journal.classLabel}</td>
            </tr>
            <tr>
              <td>Guru</td><td>{teacherName}</td>
              <td>Tanggal</td><td>{formatLongDateID(journal.date)}</td>
            </tr>
            <tr>
              <td>Jam ke</td><td>{isManualSession ? "Darurat" : `${session.startPeriod} (${session.startTime}–${session.endTime})`}</td>
              <td>Realisasi</td><td>{REALIZATION_OPTIONS.find((s) => s.value === realizationStatus)?.label}</td>
            </tr>
          </tbody>
        </table>
        <table className="document-table">
          <tbody>
            <tr><td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Materi</td><td>{effectiveMaterial || "-"}</td></tr>
            <tr><td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Tujuan Pembelajaran</td><td>{journal.plannedLearningOutcome ?? "-"}</td></tr>
            <tr><td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Kehadiran</td><td>H: {journal.presentCount} · S: {journal.sickCount} · I: {journal.excusedCount} · A: {journal.absentCount} · Total: {journal.totalStudents}</td></tr>
            {/* JOURNAL-REVIEW-NARRATIVE-03 §8: pakai narrative */}
            <tr><td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Kegiatan Pembelajaran</td><td>{narrative.activityNarrative}</td></tr>
            <tr><td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Catatan / Respons Siswa</td><td>{narrative.noteNarrative}</td></tr>
            <tr><td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Tindak Lanjut</td><td>{narrative.followUpNarrative}</td></tr>
          </tbody>
        </table>
        <div className="signature-grid">
          <div>
            <p>{schoolName.split(" ").slice(-2).join(" ")}, {formatLongDateID(journal.date)}</p>
            <p>Guru Mata Pelajaran</p>
            <div className="sig-space" />
            <p className="sig-name">{teacherName}</p>
          </div>
        </div>
      </div>
    </>
  );
}
