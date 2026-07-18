/**
 * Modul M02 Kalender — halaman /calendar
 * Sumber: docs/SPRINT_2_DESIGN.md §3
 *
 * WYSIWYG-DOC-FASE2: Kalender Minggu Efektif sebagai dokumen WYSIWYG.
 *   - Tombol "Cetak Minggu Efektif" membuka DocumentPreview + sidebar.
 *   - Komponen KalenderMEDocument merender tabel resmi di kanvas A4.
 *   - Auto-save ke schoolDocuments (docType: "kalender-minggu-efektif").
 *   - Mode CRUD (tambah/edit/import) tetap ada — user toggle antara CRUD dan WYSIWYG.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardHeader, Input, Select, Textarea, Button, EmptyState, Badge } from "../../shared/ui";
import {
  listCalendarEvents,
  saveCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  importCalendarFromJSON,
} from "../../shared/db/calendar-repo";
import { getActiveAcademicYear, getSchoolProfile } from "../../shared/db/profile-repo";
import type { CalendarEvent, CalendarEventType } from "@guru-admin/domain";
import {
  CALENDAR_EVENT_TYPES,
  CALENDAR_EVENT_TYPE_LABELS_ID,
  formatLongDateID,
} from "@guru-admin/shared";
// WYSIWYG-DOC-FASE2: DocumentPreview + schoolDocuments persistence
import { DocumentPreview } from "../../shared/documents";
import {
  saveSchoolDocument,
  updateSchoolDocumentData,
  updateSchoolDocumentLayout,
  setSchoolDocumentStatus,
  findSchoolDocumentByCompositeKey,
} from "../../shared/db/school-document-repo";
import type { SchoolDocOrientation, DocumentStatus } from "@guru-admin/domain";

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const MONTH_FULL_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

/** Semester months: Semester 1 = Jul–Dec, Semester 2 = Jan–Jun */
const SEMESTER_MONTHS: Record<1 | 2, number[]> = {
  1: [7, 8, 9, 10, 11, 12],
  2: [1, 2, 3, 4, 5, 6],
};

/* ------------------------------------------------------------------ */
/*  Week computation helpers                                          */
/* ------------------------------------------------------------------ */

interface CalendarWeek {
  /** 1-indexed week number within the semester. */
  weekNumber: number;
  /** ISO date string of Monday. */
  startDate: string;
  /** ISO date string of Sunday (or Saturday for school). */
  endDate: string;
  /** Whether this week has no blocking events (blocksLearning). */
  isEffective: boolean;
  /** Events that fall within this week. */
  events: CalendarEvent[];
  /** Human-readable label of blocking reason, if any. */
  blockReason: string;
}

/**
 * Build semester weeks from calendar events.
 * Iterates each week (Monday–Sunday) from semester start month to end month,
 * checks against calendar events for blocking.
 */
function buildSemesterWeeks(
  tahunAjaran: string,
  semester: 1 | 2,
  events: CalendarEvent[],
): CalendarWeek[] {
  const [startYearStr] = tahunAjaran.split("/");
  const startYear = Number(startYearStr);
  const months = SEMESTER_MONTHS[semester];

  // Determine the actual year for each month.
  // Semester 1: July–Dec of startYear. Semester 2: Jan–June of (startYear+1).
  const monthYear = (_month: number): number => {
    if (semester === 1) return startYear;
    return startYear + 1;
  };

  // First day of semester = first Monday on or after the 1st of the first month
  const firstMonth = months[0];
  const fy = monthYear(firstMonth);
  const firstDay = new Date(fy, firstMonth - 1, 1);
  // Find first Monday
  const firstMonday = new Date(firstDay);
  const dayOfWeek = firstMonday.getDay(); // 0=Sun
  const offsetToMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek;
  firstMonday.setDate(firstMonday.getDate() + offsetToMonday);

  // Last day of semester = last day of the last month
  const lastMonth = months[months.length - 1];
  const ly = monthYear(lastMonth);
  const lastDay = new Date(ly, lastMonth, 0); // day 0 of next month = last day

  const weeks: CalendarWeek[] = [];
  let current = new Date(firstMonday);
  let weekNum = 1;

  while (current <= lastDay) {
    const weekStart = new Date(current);
    const weekEnd = new Date(current);
    weekEnd.setDate(weekEnd.getDate() + 6); // Sunday

    const startISO = dateToISO(weekStart);
    const endISO = dateToISO(weekEnd);

    // Check events that overlap this week and block learning
    const weekEvents = events.filter((e) => {
      return e.startDate <= endISO && e.endDate >= startISO;
    });

    const blockingEvents = weekEvents.filter((e) => e.blocksLearning);
    const isEffective = blockingEvents.length === 0;
    const blockReason = !isEffective
      ? blockingEvents.map((e) => e.label).join("; ")
      : "";

    weeks.push({
      weekNumber: weekNum,
      startDate: startISO,
      endDate: endISO,
      isEffective,
      events: weekEvents,
      blockReason,
    });

    weekNum++;
    current.setDate(current.getDate() + 7);
  }

  return weeks;
}

/** Format Date to ISO date string (YYYY-MM-DD). */
function dateToISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

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

  // WYSIWYG-DOC-FASE2: document mode state
  const [showDocument, setShowDocument] = useState(false);
  const [docSemester, setDocSemester] = useState<1 | 2>(1);
  const [formatDokumen, setFormatDokumen] = useState<"portrait" | "landscape">("portrait");
  const [docId, setDocId] = useState<string | undefined>(undefined);
  const [docStatus, setDocStatus] = useState<DocumentStatus>("draft");

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

  // WYSIWYG-DOC-FASE2: try to load existing schoolDocument
  useEffect(() => {
    if (!activeYearId || !activeYearLabel) return;
    void (async () => {
      const existing = await findSchoolDocumentByCompositeKey({
        docType: "kalender-minggu-efektif",
        semester: docSemester,
        tahunAjaran: activeYearLabel,
        teacherId: "__system__", // Kalender is per-school, not per-teacher
      });
      if (existing) {
        setDocId(existing.id);
        setDocStatus(existing.status);
        if (existing.data?.semester) {
          setDocSemester(existing.data.semester as 1 | 2);
        }
        if (existing.orientation) {
          setFormatDokumen(existing.orientation);
        }
      }
    })();
  }, [activeYearId, activeYearLabel, docSemester]);

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

  // Create/save document when entering WYSIWYG mode
  const handleOpenDocument = useCallback(() => {
    if (!activeYearId || !activeYearLabel) return;
    void (async () => {
      const docData: Record<string, unknown> = {
        semester: docSemester,
        tahunAjaran: activeYearLabel,
        schoolName,
        totalWeeks,
        effectiveWeeks,
      };

      if (docId) {
        await updateSchoolDocumentData(docId, docData);
      } else {
        const doc = await saveSchoolDocument({
          docType: "kalender-minggu-efektif",
          semester: docSemester,
          tahunAjaran: activeYearLabel,
          teacherId: "__system__",
          academicYearId: activeYearId,
          data: docData,
          orientation: formatDokumen,
          status: "draft",
        });
        setDocId(doc.id);
        setDocStatus("draft");
      }
      setShowDocument(true);
    })();
  }, [activeYearId, activeYearLabel, docId, docSemester, schoolName, totalWeeks, effectiveWeeks, formatDokumen]);

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;

  if (!activeYearId) {
    return (
      <div className="space-y-4">
        <Header />
        <Card>
          <EmptyState
            title="Belum ada tahun pelajaran aktif"
            description="Buat tahun pelajaran aktif dulu di menu Profil sebelum mengelola kalender."
          />
        </Card>
      </div>
    );
  }

  /* ================================================================ */
  /*  WYSIWYG VIEW — Kalender Minggu Efektif Document                */
  /* ================================================================ */
  if (showDocument) {
    return (
      <div className="promes-wysiwyg-layout">
        {/* Sidebar */}
        <aside className="promes-sidebar no-print">
          <div className="promes-sidebar-header">
            <h2 className="text-sm font-bold text-slate-900">Kalender Minggu Efektif</h2>
            <button
              type="button"
              className="promes-sidebar-close"
              onClick={() => setShowDocument(false)}
              title="Kembali ke daftar event"
            >
              ✕
            </button>
          </div>

          <div className="promes-sidebar-section">
            <h3 className="promes-sidebar-section-title">Konteks</h3>
            <Select
              label="Semester"
              id="kme-sem"
              value={String(docSemester)}
              onChange={(v) => setDocSemester(Number(v) as 1 | 2)}
              options={[{ value: "1", label: "Semester 1 (Ganjil)" }, { value: "2", label: "Semester 2 (Genap)" }]}
            />
          </div>

          <div className="promes-sidebar-section">
            <h3 className="promes-sidebar-section-title">Ringkasan</h3>
            <dl className="promes-summary-dl">
              <div><dt>Total minggu</dt><dd>{totalWeeks}</dd></div>
              <div><dt>Minggu efektif</dt><dd className="text-green-700">{effectiveWeeks}</dd></div>
              <div><dt>Minggu tidak efektif</dt><dd className="text-rose-600">{totalWeeks - effectiveWeeks}</dd></div>
              <div><dt>Tahun ajaran</dt><dd>{activeYearLabel}</dd></div>
            </dl>
          </div>

          <div className="promes-sidebar-section">
            <h3 className="promes-sidebar-section-title">Event Penyebab</h3>
            {semesterWeeks.filter((w) => !w.isEffective).length === 0 ? (
              <p className="text-xs text-slate-400 italic">Tidak ada minggu yang diblokir.</p>
            ) : (
              <ul className="space-y-1 text-xs">
                {semesterWeeks
                  .filter((w) => !w.isEffective)
                  .map((w) => (
                    <li key={w.weekNumber} className="flex justify-between p-1.5 bg-rose-50 rounded">
                      <span>Minggu {w.weekNumber}</span>
                      <span className="text-rose-600 truncate ml-2 max-w-[150px]" title={w.blockReason}>{w.blockReason}</span>
                    </li>
                  ))}
              </ul>
            )}
          </div>

          <div className="promes-sidebar-section promes-sidebar-footer">
            <Button
              variant="secondary"
              onClick={() => setShowDocument(false)}
              className="w-full"
            >
              ← Kembali ke Daftar Event
            </Button>
          </div>
        </aside>

        {/* Document Area */}
        <div className="promes-document-area">
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
      </div>
    );
  }

  /* ================================================================ */
  /*  CRUD VIEW — daftar event, tambah, edit, impor                  */
  /* ================================================================ */
  return (
    <div className="space-y-4">
      <Header yearLabel={activeYearLabel} count={events.length} />

      {error && <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-700">{error}</div>}
      {success && <div className="p-3 rounded-md bg-brand-50 border border-brand-200 text-sm text-brand-700">{success}</div>}

      <div className="flex gap-2 flex-wrap">
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>+ Tambah Event</Button>
        <Button variant="secondary" onClick={() => setShowImport(true)}>Impor JSON</Button>
        {events.length > 0 && (
          <Button variant="secondary" onClick={handleOpenDocument}>
            Cetak Minggu Efektif
          </Button>
        )}
      </div>

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

      <Card>
        <CardHeader title="Daftar Event" description={`${events.length} event untuk tahun pelajaran ${activeYearLabel}`} />
        {events.length === 0 ? (
          <EmptyState
            title="Belum ada event kalender"
            description="Impor dari JSON hasil AI, atau tambah manual."
          />
        ) : (
          <div className="space-y-2">
            {events.map((e) => (
              <div key={e.id} className="flex items-start justify-between p-3 border border-slate-200 rounded-md">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-slate-900">{e.label}</span>
                    <Badge variant={badgeForType(e.type)}>{CALENDAR_EVENT_TYPE_LABELS_ID[e.type]}</Badge>
                    {e.blocksLearning && <Badge variant="warning">blocks KBM</Badge>}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {formatLongDateID(e.startDate)} — {formatLongDateID(e.endDate)}
                  </p>
                  {e.description && <p className="text-xs text-slate-600 mt-1">{e.description}</p>}
                  <p className="text-[10px] text-slate-400 mt-1">Sumber: {e.source === "ai_import" ? "Impor AI" : "Manual"}</p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="secondary"
                    className="text-xs px-2 py-1"
                    onClick={async () => {
                      const updated = await updateCalendarEvent(e.id, {});
                      if (updated) {
                        setEditing(updated);
                        setShowForm(true);
                      }
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    className="text-xs px-2 py-1"
                    onClick={async () => {
                      if (window.confirm(`Hapus event "${e.label}"?`)) {
                        await deleteCalendarEvent(e.id);
                        setSuccess("Event dihapus.");
                        void reload();
                      }
                    }}
                  >
                    Hapus
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ============================================================ */
/*  Header                                                       */
/* ============================================================ */

function Header({ yearLabel, count }: { yearLabel?: string; count?: number }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Kalender Pendidikan</h1>
      <p className="text-sm text-slate-500 mt-1">
        {yearLabel ? `Tahun pelajaran aktif: ${yearLabel} · ${count ?? 0} event` : "Impor JSON atau tambah manual."}
      </p>
    </div>
  );
}

/* ============================================================ */
/*  Helpers                                                      */
/* ============================================================ */

function badgeForType(type: CalendarEventType): "success" | "warning" | "error" | "neutral" {
  switch (type) {
    case "learning": return "success";
    case "assessment": return "warning";
    case "holiday": return "error";
    case "school_activity": return "neutral";
    case "remedial": return "warning";
    case "report": return "neutral";
    case "cocurricular": return "neutral";
  }
}

/* ============================================================ */
/*  Event Form                                                   */
/* ============================================================ */

function EventForm({
  academicYearId,
  editing,
  onClose,
  onSaved,
}: {
  academicYearId: string;
  editing: CalendarEvent | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    label: editing?.label ?? "",
    type: editing?.type ?? ("learning" as CalendarEventType),
    startDate: editing?.startDate ?? "",
    endDate: editing?.endDate ?? "",
    scope: "ALL",
    blocksLearning: editing?.blocksLearning ?? false,
    description: editing?.description ?? "",
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (form.startDate > form.endDate) {
        throw new Error("startDate wajib <= endDate");
      }
      const data = {
        academicYearId,
        startDate: form.startDate,
        endDate: form.endDate,
        type: form.type,
        label: form.label,
        description: form.description || undefined,
        scope: form.scope === "ALL" ? ("ALL" as const) : [form.scope],
        blocksLearning: form.type === "holiday" ? true : form.blocksLearning,
        source: "manual" as const,
      };
      if (editing) {
        await updateCalendarEvent(editing.id, data);
      } else {
        await saveCalendarEvent(data);
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan event.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title={editing ? "Edit Event" : "Tambah Event"} />
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Label" id="ev-label" required value={form.label} onChange={(v) => set("label", v)} />
        <Select
          label="Jenis"
          id="ev-type"
          value={form.type}
          onChange={(v) => set("type", v as CalendarEventType)}
          options={CALENDAR_EVENT_TYPES.map((t) => ({ value: t, label: CALENDAR_EVENT_TYPE_LABELS_ID[t] }))}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Mulai" id="ev-start" type="date" required value={form.startDate} onChange={(v) => set("startDate", v)} />
          <Input label="Selesai" id="ev-end" type="date" required value={form.endDate} onChange={(v) => set("endDate", v)} />
        </div>
        <Textarea label="Deskripsi (opsional)" id="ev-desc" value={form.description} onChange={(v) => set("description", v)} rows={2} />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.blocksLearning}
            onChange={(e) => set("blocksLearning", e.target.checked)}
            disabled={form.type === "holiday"}
          />
          <span>Blokir KBM (tidak ada pembelajaran di rentang ini)</span>
        </label>
        {form.type === "holiday" && (
          <p className="text-xs text-amber-600">Event tipe Libur wajib memblokir KBM (otomatis aktif).</p>
        )}
        {error && <div className="p-2 rounded bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>}
        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Batal</Button>
        </div>
      </form>
    </Card>
  );
}

/* ============================================================ */
/*  Import Modal                                                 */
/* ============================================================ */

function ImportModal({
  academicYearId,
  onClose,
  onImported,
  onError,
}: {
  academicYearId: string;
  onClose: () => void;
  onImported: (count: number) => void;
  onError: (errors: string[]) => void;
}) {
  const [jsonText, setJsonText] = useState("");
  const [importing, setImporting] = useState(false);

  async function handleImport() {
    setImporting(true);
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonText);
      } catch (e) {
        onError([`JSON tidak valid: ${e instanceof Error ? e.message : String(e)}`]);
        setImporting(false);
        return;
      }
      const result = await importCalendarFromJSON(parsed, academicYearId);
      if (result.success) {
        onImported(result.importedCount);
      } else {
        onError(result.errors);
      }
    } finally {
      setImporting(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Impor Kalender dari JSON"
        description="Tempel JSON hasil AI (format guru-admin-flow/calendar/v1). Event existing akan di-soft-delete dan diganti."
      />
      <Textarea
        label="JSON Kalender"
        id="import-json"
        value={jsonText}
        onChange={setJsonText}
        rows={12}
        placeholder={`{
  "$schema": "guru-admin-flow/calendar/v1",
  "academicYearLabel": "2025/2026",
  "events": [...]
}`}
      />
      <div className="mt-3 p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800">
        ⚠️ Impor akan <strong>mengganti</strong> semua event kalender existing untuk tahun pelajaran ini.
        Pastikan backup data lama bila perlu.
      </div>
      <div className="flex gap-2 mt-3">
        <Button onClick={handleImport} disabled={importing || !jsonText.trim()}>
          {importing ? "Mengimpor..." : "Impor & Ganti"}
        </Button>
        <Button variant="secondary" onClick={onClose} disabled={importing}>Batal</Button>
      </div>
    </Card>
  );
}

/* ============================================================ */
/*  Kalender Minggu Efektif Document (A4 portrait)               */
/* ============================================================ */

function KalenderMEDocument({
  semester,
  tahunAjaran,
  schoolName,
  weeks,
  effectiveWeeks,
  totalWeeks,
}: {
  semester: 1 | 2;
  tahunAjaran: string;
  schoolName: string;
  weeks: CalendarWeek[];
  effectiveWeeks: number;
  totalWeeks: number;
}) {
  const ineffectiveWeeks = totalWeeks - effectiveWeeks;

  return (
    <div className="print-area">
      <div className="document-page document-portrait">
        <div className="document-title">KALENDER MINGGU EFEKTIF</div>
        <div className="document-subtitle">
          SEMESTER {semester === 1 ? "1 (GANJIL)" : "2 (GENAP)"} — TAHUN PELAJARAN {tahunAjaran}
        </div>

        {/* Identity table */}
        <table className="document-identity">
          <tbody>
            <tr>
              <td>Satuan Pendidikan</td>
              <td>{schoolName || "-"}</td>
              <td>Semester</td>
              <td>{semester === 1 ? "Ganjil" : "Genap"}</td>
            </tr>
            <tr>
              <td>Tahun Pelajaran</td>
              <td>{tahunAjaran}</td>
              <td>Total Minggu</td>
              <td>{totalWeeks} minggu</td>
            </tr>
            <tr>
              <td>Minggu Efektif</td>
              <td className="kme-effective-text">{effectiveWeeks} minggu</td>
              <td>Minggu Tidak Efektif</td>
              <td className="kme-ineffective-text">{ineffectiveWeeks} minggu</td>
            </tr>
          </tbody>
        </table>

        {/* Main table */}
        <div className="document-section-title">RENCANA MINGGU EFEKTIF</div>
        <table className="document-table kme-table">
          <thead>
            <tr>
              <th style={{ width: "6%" }}>No</th>
              <th style={{ width: "16%" }}>Bulan</th>
              <th style={{ width: "18%" }}>Tanggal</th>
              <th style={{ width: "10%" }}>Efektif</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((w) => {
              const startD = new Date(w.startDate + "T00:00:00");
              const monthLabel = MONTH_FULL_ID[startD.getMonth()];
              const dateRange = `${formatLongDateID(w.startDate).split(",")[1]?.trim() ?? w.startDate} — ${formatLongDateID(w.endDate).split(",")[1]?.trim() ?? w.endDate}`;

              return (
                <tr
                  key={w.weekNumber}
                  className={w.isEffective ? "" : "kme-ineffective-row"}
                >
                  <td className="text-center">{w.weekNumber}</td>
                  <td>{monthLabel}</td>
                  <td>{dateRange}</td>
                  <td className="text-center">
                    {w.isEffective ? (
                      <span className="kme-effective-mark">✓</span>
                    ) : (
                      <span className="kme-ineffective-mark">✗</span>
                    )}
                  </td>
                  <td>
                    {w.isEffective ? (
                      <span className="kme-effective-label">Minggu efektif</span>
                    ) : (
                      <span className="kme-ineffective-label">{w.blockReason}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="text-center"><strong>JUMLAH</strong></td>
              <td className="text-center"><strong>{effectiveWeeks}/{totalWeeks}</strong></td>
              <td><strong>{effectiveWeeks} minggu efektif, {ineffectiveWeeks} tidak efektif</strong></td>
            </tr>
          </tfoot>
        </table>

        {/* Summary per month */}
        <div className="document-section-title" style={{ marginTop: "14pt" }}>REKAP PER BULAN</div>
        <table className="document-table kme-month-table">
          <thead>
            <tr>
              <th>Bulan</th>
              <th style={{ width: "20%" }}>Total Minggu</th>
              <th style={{ width: "20%" }}>Efektif</th>
              <th style={{ width: "20%" }}>Tidak Efektif</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const months = SEMESTER_MONTHS[semester];
              return months.map((month) => {
                const monthWeeks = weeks.filter((w) => {
                  const d = new Date(w.startDate + "T00:00:00");
                  return d.getMonth() + 1 === month;
                });
                if (monthWeeks.length === 0) return null;
                const eff = monthWeeks.filter((w) => w.isEffective).length;
                const ineff = monthWeeks.length - eff;
                return (
                  <tr key={month}>
                    <td>{MONTH_FULL_ID[month - 1]}</td>
                    <td className="text-center">{monthWeeks.length}</td>
                    <td className="text-center kme-effective-text">{eff}</td>
                    <td className="text-center kme-ineffective-text">{ineff}</td>
                  </tr>
                );
              });
            })()}
          </tbody>
          <tfoot>
            <tr>
              <td><strong>Total</strong></td>
              <td className="text-center"><strong>{totalWeeks}</strong></td>
              <td className="text-center kme-effective-text"><strong>{effectiveWeeks}</strong></td>
              <td className="text-center kme-ineffective-text"><strong>{ineffectiveWeeks}</strong></td>
            </tr>
          </tfoot>
        </table>

        {/* Signature */}
        <div className="signature-grid" style={{ marginTop: "24pt" }}>
          <div>
            <p>Mengetahui,</p>
            <p>Kepala Sekolah</p>
            <div className="sig-space" />
            <p className="sig-name">(........................................)</p>
            <p>NIP. .....................</p>
          </div>
          <div>
            <p>..........., {MONTH_FULL_ID[new Date().getMonth()]} {new Date().getFullYear()}</p>
            <p>Guru Mata Pelajaran</p>
            <div className="sig-space" />
            <p className="sig-name">(........................................)</p>
            <p>NIP. .....................</p>
          </div>
        </div>
      </div>
    </div>
  );
}
