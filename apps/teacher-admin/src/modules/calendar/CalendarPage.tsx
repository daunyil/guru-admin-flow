/**
 * Modul M02 Kalender — halaman /calendar
 * Sumber: docs/SPRINT_2_DESIGN.md §3
 *
 * WYSIWYG-DOC-FASE3: Kalender Minggu Efektif sebagai dokumen WYSIWYG.
 *   - Layout WYSIWYG selalu aktif: DocumentPreview + sidebar.
 *   - Sidebar berisi: konteks (semester), ringkasan, kelola event (tambah/edit/impor/hapus), event penyebab.
 *   - Komponen KalenderMEDocument merender tabel resmi di kanvas A4.
 *   - Auto-save ke schoolDocuments (docType: "kalender-minggu-efektif").
 *   - Tidak ada toggle mode — dokumen selalu terlihat (true WYSIWYG).
 *
 * AUDIT FIXES:
 *   A1: Replace two competing useEffects (load-existing + create-if-missing) with single
 *       ensureDoc() that atomically finds-or-creates. Avoids race condition / duplicate docs.
 *   A2: Load-existing useEffect no longer has docSemester in deps — instead, semester
 *       changes call handleSemesterChange() which explicitly resets docId and re-ensures.
 *   A3: Semester change resets docId first, so auto-save targets the correct doc.
 *   A5: Edit button stores the CalendarEvent directly (no more updateCalendarEvent hack).
 *   A7: Modal overlays close on ESC key.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmptyState, LoadingState } from "../../shared/ui";
import {
  listCalendarEvents,
} from "../../shared/db/calendar-repo";
import { getActiveAcademicYear, getSchoolProfile } from "../../shared/db/profile-repo";
import type { CalendarEvent } from "@guru-admin/domain";
// WYSIWYG-DOC-FASE3: DocumentPreview + schoolDocuments persistence
import { DocumentPreview } from "../../shared/documents";
import {
  saveSchoolDocument,
  updateSchoolDocumentData,
  updateSchoolDocumentLayout,
  setSchoolDocumentStatus,
  findSchoolDocumentByCompositeKey,
} from "../../shared/db/school-document-repo";
import type { SchoolDocOrientation, DocumentStatus } from "@guru-admin/domain";

/* -- Extracted modules -- */
import { buildSemesterWeeks } from "./calendarHelpers";
import { Header } from "./Header";
import { EventForm } from "./EventForm";
import { ImportModal } from "./ImportModal";
import { KalenderMEDocument } from "./KalenderMEDocument";
import { CalendarSidebar } from "./CalendarSidebar";

/* ------------------------------------------------------------------ */
/*  Main Component                                                    */
/* ------------------------------------------------------------------ */

export function CalendarPage() {
  const [loading, setLoading] = useState(true);
  const [activeYearId, setActiveYearId] = useState<string | null>(null);
  const [activeYearLabel, setActiveYearLabel] = useState<string>("");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [schoolName, setSchoolName] = useState<string>("");
  const [showImport, setShowImport] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // WYSIWYG-DOC-FASE3: sidebar toggle (default open di desktop, closed di mobile)
  const [showSidebar, setShowSidebar] = useState(
    typeof window !== "undefined" && window.innerWidth >= 1024
  );
  const [docSemester, setDocSemester] = useState<1 | 2>(1);
  const [formatDokumen, setFormatDokumen] = useState<"portrait" | "landscape">("portrait");
  const [docId, setDocId] = useState<string | undefined>(undefined);
  const [docStatus, setDocStatus] = useState<DocumentStatus>("draft");

  // A1: guard to prevent concurrent ensureDoc calls
  const ensuringRef = useRef(false);

  async function reload() {
    if (!activeYearId) return;
    const evs = await listCalendarEvents(activeYearId);
    setEvents(evs);
  }

  useEffect(() => {
    void (async () => {
      const year = await getActiveAcademicYear();
      if (year) {
        setActiveYearId(year.id);
        setActiveYearLabel(year.label);
        const evs = await listCalendarEvents(year.id);
        setEvents(evs);
      }
      const sp = await getSchoolProfile();
      setSchoolName(sp?.name ?? "");
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!error && !success) return;
    const t = setTimeout(() => {
      setError(null);
      setSuccess(null);
    }, error ? 5000 : 3000);
    return () => clearTimeout(t);
  }, [error, success]);

  /* ---------------------------------------------------------------- */
  /*  A1+A2+A3: Single ensureDoc — find existing or create new.       */
  /*  Called on initial load and when semester changes.                */
  /* ---------------------------------------------------------------- */
  const ensureDoc = useCallback(async (semester: 1 | 2) => {
    if (!activeYearId || !activeYearLabel) return;
    if (ensuringRef.current) return; // prevent concurrent runs
    ensuringRef.current = true;

    try {
      // First, try to find existing document for this composite key
      const existing = await findSchoolDocumentByCompositeKey({
        docType: "kalender-minggu-efektif",
        semester,
        tahunAjaran: activeYearLabel,
        teacherId: "__system__",
      });

      if (existing) {
        setDocId(existing.id);
        setDocStatus(existing.status);
        if (existing.orientation) {
          setFormatDokumen(existing.orientation);
        }
      } else {
        // No existing doc — create one
        const doc = await saveSchoolDocument({
          docType: "kalender-minggu-efektif",
          semester,
          tahunAjaran: activeYearLabel,
          teacherId: "__system__",
          academicYearId: activeYearId,
          data: { semester, tahunAjaran: activeYearLabel, schoolName },
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
  }, [activeYearId, activeYearLabel, schoolName]);

  // Run ensureDoc once on initial data load
  useEffect(() => {
    if (!activeYearId || !activeYearLabel) return;
    void ensureDoc(docSemester);
  // eslint-disable-next-line react-hooks/exhaustive-deps — only on initial data availability
  }, [activeYearId, activeYearLabel]);

  // Build semester weeks for document
  const semesterWeeks = useMemo(() => {
    if (!activeYearLabel) return [];
    return buildSemesterWeeks(activeYearLabel, docSemester, events);
  }, [activeYearLabel, docSemester, events]);

  const effectiveWeeks = semesterWeeks.filter((w) => w.isEffective).length;
  const totalWeeks = semesterWeeks.length;

  // Auto-save data memo
  const docDataForAutoSave = useMemo(() => {
    if (semesterWeeks.length === 0) return {};
    return {
      semester: docSemester,
      tahunAjaran: activeYearLabel,
      schoolName,
      totalWeeks,
      effectiveWeeks,
      semesterWeeksSnapshot: semesterWeeks.map((w) => ({
        weekNumber: w.weekNumber,
        startDate: w.startDate,
        endDate: w.endDate,
        isEffective: w.isEffective,
        blockReason: w.blockReason,
      })),
    };
  }, [docSemester, activeYearLabel, schoolName, totalWeeks, effectiveWeeks, semesterWeeks]);

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
    if (docId) {
      void updateSchoolDocumentLayout(docId, { orientation });
    }
  }, [docId]);

  // A3: Semester change → reset docId and ensure new doc
  const handleSemesterChange = useCallback((newSemester: 1 | 2) => {
    setDocId(undefined); // A3: reset so auto-save won't write to wrong doc
    setDocStatus("draft");
    setDocSemester(newSemester);
    void ensureDoc(newSemester);
  }, [ensureDoc]);

  // A7: Close modals on ESC
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (showForm) { setShowForm(false); setEditing(null); }
        if (showImport) setShowImport(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showForm, showImport]);

  if (loading) return <LoadingState />;

  if (!activeYearId) {
    return (
      <div className="space-y-4">
        <Header />
        <EmptyState
          title="Belum ada tahun pelajaran aktif"
          description="Buat tahun pelajaran aktif dulu di menu Profil sebelum mengelola kalender."
        />
      </div>
    );
  }

  /* ================================================================ */
  /*  WYSIWYG VIEW — selalu aktif, sidebar + document                 */
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
      <CalendarSidebar
        showSidebar={showSidebar}
        setShowSidebar={setShowSidebar}
        docSemester={docSemester}
        onSemesterChange={handleSemesterChange}
        activeYearLabel={activeYearLabel}
        totalWeeks={totalWeeks}
        effectiveWeeks={effectiveWeeks}
        semesterWeeks={semesterWeeks}
        events={events}
        onAddEvent={() => { setEditing(null); setShowForm(true); }}
        onEditEvent={(e) => { setEditing(e); setShowForm(true); }}
        onImport={() => setShowImport(true)}
        onDeleteSuccess={(msg) => setSuccess(msg)}
        onReload={() => void reload()}
      />

      {/* ---------- DOCUMENT AREA ---------- */}
      <div className="doc-document-area">
        <DocumentPreview
          docId={docId}
          docType="kalender-minggu-efektif"
          orientation={formatDokumen}
          status={docStatus}
          data={docDataForAutoSave}
          onSave={handleSaveDoc}
          onSetFinal={handleSetFinal}
          onOrientationChange={handleOrientationChange}
          showFormatToggle={false}
        >
          <KalenderMEDocument
            semester={docSemester}
            tahunAjaran={activeYearLabel}
            schoolName={schoolName}
            weeks={semesterWeeks}
            effectiveWeeks={effectiveWeeks}
            totalWeeks={totalWeeks}
          />
        </DocumentPreview>
      </div>

      {/* ---------- SIDEBAR TOGGLE (when hidden) ---------- */}
      {!showSidebar && (
        <button
          type="button"
          className="doc-sidebar-toggle no-print"
          onClick={() => setShowSidebar(true)}
          title="Buka panel kontrol"
          aria-label="Buka panel kontrol"
          aria-expanded={showSidebar}
        >
          ☰
        </button>
      )}

      {/* ---------- OVERLAYS: EventForm & ImportModal ---------- */}
      {showForm && (
        <EventForm
          academicYearId={activeYearId}
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); void reload(); }}
        />
      )}

      {showImport && (
        <ImportModal
          academicYearId={activeYearId}
          onClose={() => setShowImport(false)}
          onImported={(count) => {
            setShowImport(false);
            setSuccess(`${count} event berhasil diimpor.`);
            void reload();
          }}
          onError={(errs) => {
            setError(errs.join("; "));
          }}
        />
      )}

      {/* Toast messages */}
      {error && (
        <div className="doc-toast doc-toast-error no-print" role="status" aria-live="polite">
          {error}
        </div>
      )}
      {success && (
        <div className="doc-toast doc-toast-success no-print" role="status" aria-live="polite">
          {success}
        </div>
      )}
    </div>
  );
}
