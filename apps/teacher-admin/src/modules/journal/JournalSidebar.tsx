/**
 * JournalSidebar — sidebar component for QuickJournal WYSIWYG layout.
 * Contains context, mode, recap, session list, emergency options, and footer.
 * Includes `.doc-sidebar-scroll` wrapper for Select dropdown fix (same pattern as PromesPage).
 */

import { Input, Button, Badge, Select } from "@shared/ui";
import { ContextCard } from "@shared/ui/ContextCard";
import type { AcademicYear, LessonSession, TeachingAssignment, TeachingJournal } from "@guru-admin/domain";
import { assignmentShortLabel, buildContextInfo } from "@guru-admin/domain";
import { formatLongDateID } from "@guru-admin/shared";
import type { JournalMode } from "./quickJournalTypes";

interface RecapResult {
  total: number;
  done: number;
  pending: number;
  cancelled: number;
  doneMeetings: LessonSession[];
  pendingMeetings: LessonSession[];
}

interface JournalSidebarProps {
  showSidebar: boolean;
  setShowSidebar: (v: boolean) => void;
  assignment: TeachingAssignment | undefined;
  year: AcademicYear | null;
  selectedAssignmentId: string;
  assignments: TeachingAssignment[];
  onAssignmentChange: (newId: string) => void;
  date: string;
  onDateChange: (newDate: string) => void;
  mode: JournalMode;
  setMode: (m: JournalMode) => void;
  showEmergencyOptions: boolean;
  setShowEmergencyOptions: (v: boolean) => void;
  recap: RecapResult | null;
  sessions: LessonSession[];
  selectedSessionId: string | null;
  setSelectedSessionId: (sid: string | null) => void;
  journals: TeachingJournal[];
  allAssignmentSessions: LessonSession[];
  setDate: (d: string) => void;
  onStartManualJournal: () => void;
  onReset: () => void;
}

export function JournalSidebar({
  showSidebar,
  setShowSidebar,
  assignment,
  year,
  selectedAssignmentId,
  assignments,
  onAssignmentChange,
  date,
  onDateChange,
  mode,
  setMode,
  showEmergencyOptions,
  setShowEmergencyOptions,
  recap,
  sessions,
  selectedSessionId,
  setSelectedSessionId,
  journals,
  allAssignmentSessions,
  setDate,
  onStartManualJournal,
  onReset,
}: JournalSidebarProps) {
  return (
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

      {/* -- doc-sidebar-scroll wrapper for Select dropdown fix -- */}
      <div className="doc-sidebar-scroll">
        {/* -- Konteks -- */}
        <div className="doc-sidebar-section">
          <h3 className="doc-sidebar-section-title">Konteks</h3>
          {!assignment && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md mb-3">
              <p className="font-semibold text-amber-900">Pilih Kelas dan Mapel</p>
              <p className="text-sm text-amber-800 mt-1">Pilih assignment terlebih dahulu untuk mulai mengisi jurnal mengajar.</p>
            </div>
          )}
          <Select
            label="Kelas dan Mapel"
            id="jrn-assignment-wys"
            value={selectedAssignmentId}
            onChange={onAssignmentChange}
            options={[
              { value: "", label: "-- Pilih --" },
              ...assignments.map((a) => ({
                value: a.id,
                label: `${a.classLabel} · ${a.subject}`,
              })),
            ]}
          />
          {assignment && year && <ContextCard info={buildContextInfo({ assignment, academicYear: year })} />}
          <div className="mt-2">
            <Input label="Tanggal" id="jrn-date-wys" type="date" value={date} onChange={onDateChange} />
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
        <div className="doc-sidebar-section">
          <h3 className="doc-sidebar-section-title">Rekap</h3>
          {recap ? (
            <dl className="doc-summary-dl">
              <div><dt>Total Pertemuan</dt><dd>{recap.total}</dd></div>
              <div><dt>Sudah Jurnal</dt><dd className="kme-effective-text">{recap.done}</dd></div>
              <div><dt>Belum Jurnal</dt><dd className="kme-ineffective-text">{recap.pending}</dd></div>
              <div><dt>Batal</dt><dd>{recap.cancelled}</dd></div>
            </dl>
          ) : (
            <p className="text-xs text-slate-400 italic">Pilih Kelas dan Mapel untuk melihat rekap.</p>
          )}
        </div>

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
        {mode === "susulan" && (
          <div className="doc-sidebar-section">
            <h3 className="doc-sidebar-section-title">
              Jurnal Susulan
              {recap && <span className="font-normal text-slate-400 ml-1">({recap.pending} belum)</span>}
            </h3>
            {!recap ? (
              <p className="text-xs text-slate-400 italic">Pilih Kelas dan Mapel untuk melihat jurnal susulan.</p>
            ) : allAssignmentSessions.length === 0 ? (
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
            {!assignment ? (
              <p className="text-xs text-slate-400 italic">Pilih Kelas dan Mapel terlebih dahulu.</p>
            ) : (
              <>
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
              </>
            )}
          </div>
        )}

        {/* -- Mode Manual CTA -- */}
        {mode === "manual" && (
          <div className="doc-sidebar-section">
            <h3 className="doc-sidebar-section-title">Jurnal Darurat</h3>
            {!assignment ? (
              <p className="text-xs text-slate-400 italic">Pilih Kelas dan Mapel terlebih dahulu untuk membuat jurnal darurat.</p>
            ) : (
              <>
                <p className="text-xs text-amber-800 mb-2">
                  {assignmentShortLabel(assignment)} · {formatLongDateID(date)}
                </p>
                <Button onClick={onStartManualJournal} className="text-xs w-full">
                  Mulai Jurnal Darurat
                </Button>
                <p className="text-[10px] text-slate-400 mt-1">
                  Sesi manual yang sudah ada akan dipakai ulang.
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* -- Footer -- */}
      <div className="doc-sidebar-section doc-sidebar-footer">
        <Button
          variant="secondary"
          onClick={onReset}
          className="w-full"
        >
          ← Kembali
        </Button>
      </div>
    </aside>
  );
}
