/**
 * ATP Sidebar — Konteks, Ringkasan, Kelola TP sections.
 *
 * Wrapped in `.doc-sidebar-scroll` for Select dropdown positioning fix.
 */

import { Button, Badge, Select } from "../../shared/ui";
import type { AcademicYear, TeacherProfile, ATPEntry } from "@guru-admin/domain";
import { atpEntryLabel } from "@guru-admin/domain";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ATPSidebarProps {
  /** Sidebar visibility */
  showSidebar: boolean;
  onCloseSidebar: () => void;

  /** Profile */
  profileIncomplete: boolean;
  teacher: TeacherProfile | undefined;
  year: AcademicYear | null;

  /** Konteks — filter */
  filterSubject: string;
  onFilterSubjectChange: (v: string) => void;
  filterGrade: string;
  onFilterGradeChange: (v: string) => void;
  subjects: string[];
  grades: string[];

  /** Ringkasan */
  filteredEntries: ATPEntry[];
  groupedByBab: Record<string, ATPEntry[]>;
  totalEntries: number;
  docView: "atp-inline" | "atp-report";
  onDocViewChange: (v: "atp-inline" | "atp-report") => void;
  message: string | null;

  /** Kelola TP */
  onAddTP: () => void;
  onImportTP: () => void;
  onEditTP: (entry: ATPEntry) => void;
  onDeleteTP: (id: string) => void;
  onShowAIPrompt: (id: string | null) => void;
  showAIPromptId: string | null;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ATPSidebar(props: ATPSidebarProps) {
  const {
    showSidebar,
    onCloseSidebar,
    profileIncomplete,
    teacher,
    year,
    filterSubject,
    onFilterSubjectChange,
    filterGrade,
    onFilterGradeChange,
    subjects,
    grades,
    filteredEntries,
    groupedByBab,
    totalEntries,
    docView,
    onDocViewChange,
    message,
    onAddTP,
    onImportTP,
    onEditTP,
    onDeleteTP,
    onShowAIPrompt,
    showAIPromptId,
  } = props;

  return (
    <aside className={`doc-sidebar no-print ${!showSidebar ? "doc-sidebar-hidden" : ""}`}>
      <div className="doc-sidebar-scroll">
        <div className="doc-sidebar-header">
          <h2 className="text-sm font-bold text-slate-900">Bank TP (ATP)</h2>
          <button
            type="button"
            className="doc-sidebar-close"
            onClick={onCloseSidebar}
            title="Tutup sidebar"
          >
            ✕
          </button>
        </div>

        {/* Profile incomplete notice */}
        {profileIncomplete && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md mb-3">
            <p className="font-semibold text-amber-900">Profil/tahun belum lengkap</p>
            <p className="text-sm text-amber-800 mt-1">Lengkapi profil sekolah dan guru terlebih dahulu untuk menggunakan fitur Bank TP.</p>
          </div>
        )}

        {/* Konteks */}
        <div className="doc-sidebar-section">
          <h3 className="doc-sidebar-section-title">Konteks</h3>
          <Select
            label="Mapel"
            id="atp-filter-subject"
            value={filterSubject}
            onChange={(v) => { onFilterSubjectChange(v); onFilterGradeChange(""); }}
            options={[
              { value: "", label: "Semua Mapel" },
              ...subjects.map((s) => ({ value: s, label: s })),
            ]}
          />
          <Select
            label="Kelas"
            id="atp-filter-grade"
            value={filterGrade}
            onChange={(v) => onFilterGradeChange(v)}
            options={[
              { value: "", label: "Semua Kelas" },
              ...grades.map((g) => ({ value: g, label: g })),
            ]}
          />
          <p className="text-[10px] text-slate-400 mt-1">{teacher?.name ?? "..."} · {year?.label ?? "..."}</p>
        </div>

        {/* Ringkasan */}
        <div className="doc-sidebar-section">
          <h3 className="doc-sidebar-section-title">Ringkasan</h3>
          <dl className="doc-summary-dl">
            <div><dt>Total TP</dt><dd>{filteredEntries.length}</dd></div>
            <div><dt>Total JP</dt><dd>{filteredEntries.reduce((s, e) => s + e.alokasiJP, 0)}</dd></div>
            <div><dt>Jumlah Bab</dt><dd>{Object.keys(groupedByBab).length}</dd></div>
            <div><dt>Mapel</dt><dd>{filterSubject || "Semua"}</dd></div>
            <div><dt>Kelas</dt><dd>{filterGrade || "Semua"}</dd></div>
          </dl>
          <div className="mt-2">
            <label className="text-xs font-medium text-slate-500 block mb-1">Tampilan Dokumen</label>
            <div className="flex gap-1">
              <Button variant={docView === "atp-inline" ? "primary" : "secondary"} className="text-xs flex-1" onClick={() => onDocViewChange("atp-inline")}>ATP (Per Bab)</Button>
              <Button variant={docView === "atp-report" ? "primary" : "secondary"} className="text-xs flex-1" onClick={() => onDocViewChange("atp-report")}>ATP (Format Resmi)</Button>
            </div>
          </div>
        </div>

        {/* Kelola TP */}
        <div className="doc-sidebar-section">
          <h3 className="doc-sidebar-section-title">Kelola TP</h3>
          <div className="flex gap-2 flex-wrap mb-2">
            <Button
              className="text-xs px-2 py-1"
              onClick={onAddTP}
            >
              + Tambah
            </Button>
            <Button
              variant="secondary"
              className="text-xs px-2 py-1"
              onClick={onImportTP}
            >
              Impor
            </Button>
          </div>

          {message && (
            <div className="p-2 rounded bg-brand-50 border border-brand-200 text-xs text-brand-700 mb-2">{message}</div>
          )}

          {filteredEntries.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Belum ada TP untuk filter ini.</p>
          ) : (
            <ul className="space-y-1 max-h-[280px] overflow-y-auto">
              {filteredEntries.map((e) => (
                <li key={e.id} className="flex items-start justify-between p-1.5 border border-slate-100 rounded text-xs">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="font-medium text-slate-900 truncate">{atpEntryLabel(e)}</span>
                      <Badge variant={e.status === "final" ? "success" : "neutral"}>
                        {e.status === "final" ? "F" : "D"}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5 truncate">{e.tp}</p>
                    <p className="text-[10px] text-slate-400">{e.alokasiJP} JP · {e.elemen}</p>
                  </div>
                  <div className="flex gap-1 ml-1 shrink-0">
                    <button
                      type="button"
                      className="text-slate-400 hover:text-blue-600 text-xs"
                      onClick={() => onEditTP(e)}
                      title="Edit"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      className="text-slate-400 hover:text-rose-600 text-xs"
                      onClick={() => onDeleteTP(e.id)}
                      title="Hapus"
                    >
                      ✗
                    </button>
                    <button
                      type="button"
                      className="text-slate-400 hover:text-amber-600 text-xs"
                      onClick={() => onShowAIPrompt(showAIPromptId === e.id ? null : e.id)}
                      title="Prompt AI"
                    >
                      ✦
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="doc-sidebar-section doc-sidebar-footer">
          <p className="text-[10px] text-slate-400 text-center">
            Dokumen auto-save · {totalEntries} TP total
          </p>
        </div>
      </div>
    </aside>
  );
}
