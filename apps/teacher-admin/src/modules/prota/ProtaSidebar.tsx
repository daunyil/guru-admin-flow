/**
 * ProtaSidebar — sidebar panel for the WYSIWYG Prota view.
 *
 * Contains: Konteks, Ringkasan, Daftar Unit, and footer navigation.
 * Wrapped in `.doc-sidebar-scroll` for Select dropdown positioning fix.
 */

import { Button, Badge, Select } from "../../shared/ui";
import type { ProtaProfile } from "@guru-admin/domain";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** Return type of validateJPTotal from @guru-admin/shared */
export interface JPTotalValidation {
  status: "valid" | "needs_fix";
  actual: number;
  target: number;
  diff: number;
}

export interface ProtaSidebarProps {
  /** Sidebar visibility */
  showSidebar: boolean;
  onCloseSidebar: () => void;

  /** Semester context */
  docSemester: 1 | 2;
  onSemesterChange: (newSemester: 1 | 2) => void;

  /** Selected profile */
  selected: ProtaProfile;

  /** Pre-computed data */
  semUnits: ProtaProfile["units"];
  targetJP: number;
  validation: JPTotalValidation;

  /** Navigation */
  onBack: () => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ProtaSidebar({
  showSidebar,
  onCloseSidebar,
  docSemester,
  onSemesterChange,
  selected,
  semUnits,
  targetJP,
  validation,
  onBack,
}: ProtaSidebarProps) {
  return (
    <aside className={`doc-sidebar no-print ${!showSidebar ? "doc-sidebar-hidden" : ""}`}>
      <div className="doc-sidebar-scroll">
        <div className="doc-sidebar-header">
          <h2 className="text-sm font-bold text-slate-900">Program Tahunan</h2>
          <button
            type="button"
            className="doc-sidebar-close"
            onClick={onCloseSidebar}
            title="Tutup sidebar"
          >
            ✕
          </button>
        </div>

        {/* -- Konteks -- */}
        <div className="doc-sidebar-section">
          <h3 className="doc-sidebar-section-title">Konteks</h3>
          <Select
            label="Semester"
            id="prota-doc-sem"
            value={String(docSemester)}
            onChange={(v) => onSemesterChange(Number(v) as 1 | 2)}
            options={[
              { value: "1", label: "Semester 1 (Ganjil)" },
              { value: "2", label: "Semester 2 (Genap)" },
            ]}
          />
          <p className="text-xs text-slate-500 mt-1">
            {selected.subject} — Kelas {selected.grade} · Fase {selected.phase}
          </p>
        </div>

        {/* -- Ringkasan -- */}
        <div className="doc-sidebar-section">
          <h3 className="doc-sidebar-section-title">Ringkasan</h3>
          <dl className="doc-summary-dl">
            <div><dt>Target JP</dt><dd>{targetJP} JP</dd></div>
            <div><dt>Subtotal materi</dt><dd>{validation.actual} JP</dd></div>
            <div><dt>Selisih</dt><dd className={validation.status === "valid" ? "kme-effective-text" : "kme-ineffective-text"}>{validation.diff > 0 ? `Kurang ${validation.diff}` : validation.diff < 0 ? `Lebih ${Math.abs(validation.diff)}` : "✓ Tepat"}</dd></div>
            <div><dt>Jumlah unit</dt><dd>{semUnits.length}</dd></div>
          </dl>
        </div>

        {/* -- Daftar Unit -- */}
        <div className="doc-sidebar-section">
          <h3 className="doc-sidebar-section-title">Daftar Unit</h3>
          {semUnits.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Belum ada unit untuk semester ini.</p>
          ) : (
            <ul className="doc-sidebar-list">
              {semUnits.map((u) => (
                <li key={u.id} className="doc-sidebar-list-item">
                  <span className="doc-sidebar-list-title">{u.order}. {u.title}</span>
                  <Badge variant={u.jp > 0 ? "success" : "warning"}>{u.jp} JP</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* -- Footer -- */}
        <div className="doc-sidebar-section doc-sidebar-footer">
          <Button
            variant="secondary"
            onClick={onBack}
            className="w-full"
          >
            ← Kembali ke Daftar Prota
          </Button>
        </div>
      </div>
    </aside>
  );
}
