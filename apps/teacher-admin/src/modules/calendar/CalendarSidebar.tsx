/**
 * CalendarSidebar — sidebar component for Kalender Minggu Efektif WYSIWYG layout.
 * Contains Konteks (semester select), Ringkasan, Kelola Event (add/import/edit/delete),
 * Minggu Tidak Efektif list, and footer.
 * Includes `.doc-sidebar-scroll` wrapper for Select dropdown fix.
 * Extracted from CalendarPage.tsx.
 */

import { Select, Button, Badge } from "../../shared/ui";
import { deleteCalendarEvent } from "../../shared/db/calendar-repo";
import { CALENDAR_EVENT_TYPE_LABELS_ID, formatLongDateID } from "@guru-admin/shared";
import type { CalendarEvent } from "@guru-admin/domain";
import type { CalendarWeek } from "./calendarHelpers";
import { badgeForType } from "./calendarHelpers";

interface CalendarSidebarProps {
  showSidebar: boolean;
  setShowSidebar: (v: boolean) => void;
  docSemester: 1 | 2;
  onSemesterChange: (semester: 1 | 2) => void;
  activeYearLabel: string;
  totalWeeks: number;
  effectiveWeeks: number;
  semesterWeeks: CalendarWeek[];
  events: CalendarEvent[];
  onAddEvent: () => void;
  onEditEvent: (event: CalendarEvent) => void;
  onImport: () => void;
  onDeleteSuccess: (message: string) => void;
  onReload: () => void;
}

export function CalendarSidebar({
  showSidebar,
  setShowSidebar,
  docSemester,
  onSemesterChange,
  activeYearLabel,
  totalWeeks,
  effectiveWeeks,
  semesterWeeks,
  events,
  onAddEvent,
  onEditEvent,
  onImport,
  onDeleteSuccess,
  onReload,
}: CalendarSidebarProps) {
  return (
    <aside className={`doc-sidebar no-print ${!showSidebar ? "doc-sidebar-hidden" : ""}`}>
      <div className="doc-sidebar-header">
        <h2 className="text-sm font-bold text-slate-900">Kalender Minggu Efektif</h2>
        <button
          type="button"
          className="doc-sidebar-close"
          onClick={() => setShowSidebar(false)}
          title="Tutup sidebar"
        >
          ✕
        </button>
      </div>

      {/* -- doc-sidebar-scroll wrapper for Select dropdown fix -- */}
      <div className="doc-sidebar-scroll">

        {/* -- Konteks -- */}
        <div className="doc-sidebar-section">
          <h3 className="doc-sidebar-section-title">Konteks</h3>
          <Select
            label="Semester"
            id="kme-sem"
            value={String(docSemester)}
            onChange={(v) => onSemesterChange(Number(v) as 1 | 2)}
            options={[{ value: "1", label: "Semester 1 (Ganjil)" }, { value: "2", label: "Semester 2 (Genap)" }]}
          />
        </div>

        {/* -- Ringkasan -- */}
        <div className="doc-sidebar-section">
          <h3 className="doc-sidebar-section-title">Ringkasan</h3>
          <dl className="doc-summary-dl">
            <div><dt>Total minggu</dt><dd>{totalWeeks}</dd></div>
            <div><dt>Minggu efektif</dt><dd className="kme-effective-text">{effectiveWeeks}</dd></div>
            <div><dt>Minggu tidak efektif</dt><dd className="kme-ineffective-text">{totalWeeks - effectiveWeeks}</dd></div>
            <div><dt>Tahun ajaran</dt><dd>{activeYearLabel}</dd></div>
          </dl>
        </div>

        {/* -- Kelola Event -- */}
        <div className="doc-sidebar-section">
          <h3 className="doc-sidebar-section-title">Kelola Event</h3>
          <div className="flex gap-2 mb-2">
            <Button
              className="text-xs px-2 py-1 flex-1"
              onClick={onAddEvent}
            >
              + Tambah
            </Button>
            <Button
              variant="secondary"
              className="text-xs px-2 py-1 flex-1"
              onClick={onImport}
            >
              Impor
            </Button>
          </div>

          {events.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Belum ada event. Tambah manual atau impor dari JSON.</p>
          ) : (
            <ul className="doc-sidebar-list doc-sidebar-list-events">
              {events.map((e) => (
                <li key={e.id} className="doc-sidebar-list-item doc-sidebar-event-item">
                  <div className="doc-sidebar-event-row">
                    <span className="doc-sidebar-list-title font-medium">{e.label}</span>
                    <Badge variant={badgeForType(e.type)}>
                      {CALENDAR_EVENT_TYPE_LABELS_ID[e.type]}
                    </Badge>
                  </div>
                  <div className="doc-sidebar-event-meta">
                    <span className="doc-sidebar-event-dates">
                      {formatLongDateID(e.startDate)} — {formatLongDateID(e.endDate)}
                    </span>
                    <div className="doc-sidebar-event-actions">
                      <button
                        type="button"
                        className="doc-sidebar-action-btn doc-sidebar-action-edit"
                        onClick={() => onEditEvent(e)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="doc-sidebar-action-btn doc-sidebar-action-delete"
                        onClick={async () => {
                          if (window.confirm(`Hapus event "${e.label}"?`)) {
                            await deleteCalendarEvent(e.id);
                            onDeleteSuccess("Event dihapus.");
                            onReload();
                          }
                        }}
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* -- Event Penyebab (blocking) -- */}
        <div className="doc-sidebar-section">
          <h3 className="doc-sidebar-section-title">Minggu Tidak Efektif</h3>
          {semesterWeeks.filter((w) => !w.isEffective).length === 0 ? (
            <p className="text-xs text-slate-400 italic">Semua minggu efektif.</p>
          ) : (
            <ul className="doc-sidebar-list doc-sidebar-list-blocked">
              {semesterWeeks
                .filter((w) => !w.isEffective)
                .map((w) => (
                  <li key={w.weekNumber} className="doc-sidebar-list-item doc-sidebar-blocked-item">
                    <span className="kme-ineffective-text">Mg {w.weekNumber}</span>
                    <span className="doc-sidebar-list-title kme-ineffective-label" title={w.blockReason}>{w.blockReason}</span>
                  </li>
                ))}
            </ul>
          )}
        </div>

        {/* -- Footer -- */}
        <div className="doc-sidebar-section doc-sidebar-footer">
          <p className="doc-sidebar-footer-text">
            {events.length} event · TP {activeYearLabel}
          </p>
        </div>
      </div>
    </aside>
  );
}
