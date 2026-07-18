/**
 * DocumentPreview.tsx — kanvas A4 pembungkus WYSIWYG untuk dokumen sekolah.
 *
 * WYSIWYG-DOC-01: komponen inti infrastruktur WYSIWYG.
 *
 * Fitur:
 *   - Toolbar: format toggle (Vertikal/Matrix), status badge, tombol Final, tombol Cetak.
 *   - Auto-save via useAutoSave hook (debounce 1.5s, indikator "Menyimpan…/✓ Tersimpan").
 *   - Print pakai window.print() + @page A4 (bukan lib PDF).
 *   - Saat print: body* invisible, hanya .wysiwyg-canvas terlihat.
 *
 * Props:
 *   - docId          : ID dari tabel schoolDocuments (auto-save target).
 *   - docType        : jenis dokumen (untuk label).
 *   - orientation    : portrait / landscape.
 *   - status         : draft / review / final.
 *   - data           : data dokumen (Record<string, unknown>).
 *   - onSave         : callback simpan data.
 *   - onSetFinal     : callback set status ke final.
 *   - onOrientationChange: callback toggle orientation.
 *   - children       : konten yang dirender di dalam kanvas A4.
 */

import { type ReactNode, useCallback, useEffect } from "react";
import {
  useAutoSave,
  type AutoSaveStatus,
} from "../../shared/hooks/useAutoSave";
import type {
  SchoolDocType,
  SchoolDocOrientation,
  DocumentStatus,
} from "@guru-admin/domain";
import { SCHOOL_DOC_TYPE_LABELS } from "@guru-admin/domain";
import "./wysiwyg-canvas.css";

/* ------------------------------------------------------------------ */
/*  Status badge                                                      */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: DocumentStatus }) {
  const config: Record<DocumentStatus, { label: string; cls: string }> = {
    draft: { label: "Draft", cls: "badge-draft" },
    ready_for_review: { label: "Siap Dicek", cls: "badge-review" },
    final: { label: "Final", cls: "badge-final" },
    revised: { label: "Revisi", cls: "badge-review" },
    locked: { label: "Dikunci", cls: "badge-final" },
  };
  const { label, cls } = config[status] ?? config.draft;
  return <span className={`wysiwyg-badge ${cls}`}>{label}</span>;
}

/* ------------------------------------------------------------------ */
/*  Save indicator                                                    */
/* ------------------------------------------------------------------ */

function SaveIndicator({ status }: { status: AutoSaveStatus }) {
  const map: Record<AutoSaveStatus, { text: string; cls: string }> = {
    idle: { text: "", cls: "" },
    saving: { text: "Menyimpan…", cls: "save-saving" },
    saved: { text: "✓ Tersimpan", cls: "save-saved" },
    error: { text: "Gagal menyimpan", cls: "save-error" },
  };
  const { text, cls } = map[status];
  if (!text) return null;
  return <span className={`wysiwyg-save-indicator ${cls}`}>{text}</span>;
}

/* ------------------------------------------------------------------ */
/*  Props                                                             */
/* ------------------------------------------------------------------ */

export interface DocumentPreviewProps {
  /** ID dokumen dari tabel schoolDocuments. */
  docId: string | undefined;
  /** Jenis dokumen. */
  docType: SchoolDocType;
  /** Orientasi kertas. */
  orientation: SchoolDocOrientation;
  /** Status dokumen. */
  status: DocumentStatus;
  /** Data dokumen terkini. */
  data: Record<string, unknown>;
  /** Callback simpan data ke IndexedDB. */
  onSave: (id: string, data: Record<string, unknown>) => Promise<void>;
  /** Callback set status ke final. */
  onSetFinal?: (id: string) => Promise<void>;
  /** Callback toggle orientation. */
  onOrientationChange?: (orientation: SchoolDocOrientation) => void;
  /** Konten WYSIWYG di dalam kanvas A4. */
  children: ReactNode;
  /** Extra class untuk kanvas. */
  className?: string;
  /** Apakah toolbar ditampilkan. Default true. */
  showToolbar?: boolean;
  /** Apakah format toggle ditampilkan. Default true. */
  showFormatToggle?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function DocumentPreview({
  docId,
  docType,
  orientation,
  status,
  data,
  onSave,
  onSetFinal,
  onOrientationChange,
  children,
  className,
  showToolbar = true,
  showFormatToggle = true,
}: DocumentPreviewProps) {
  // Auto-save hook
  const { saveStatus, triggerSave } = useAutoSave({
    docId,
    getData: useCallback(() => data, [data]),
    onSave,
  });

  // Keyboard shortcut: Ctrl+S → save manual
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        void triggerSave();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [triggerSave]);

  // Print handler
  const handlePrint = useCallback(() => {
    void triggerSave().then(() => {
      window.print();
    });
  }, [triggerSave]);

  // Orientation toggle
  const handleToggleOrientation = useCallback(() => {
    const next: SchoolDocOrientation =
      orientation === "portrait" ? "landscape" : "portrait";
    onOrientationChange?.(next);
  }, [orientation, onOrientationChange]);

  // Final handler
  const handleFinal = useCallback(() => {
    if (!docId || !onSetFinal) return;
    if (confirm("Tandai dokumen ini sebagai Final? Setelah final, dokumen tidak bisa diedit.")) {
      void onSetFinal(docId);
    }
  }, [docId, onSetFinal]);

  const docLabel = SCHOOL_DOC_TYPE_LABELS[docType] ?? "Dokumen";

  const canvasClass = [
    "wysiwyg-canvas",
    orientation === "landscape" ? "wysiwyg-landscape" : "wysiwyg-portrait",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="wysiwyg-wrapper">
      {/* Toolbar */}
      {showToolbar && (
        <div className="wysiwyg-toolbar no-print">
          <div className="wysiwyg-toolbar-left">
            <span className="wysiwyg-doc-label">{docLabel}</span>
            <StatusBadge status={status} />
            <SaveIndicator status={saveStatus} />
          </div>
          <div className="wysiwyg-toolbar-right">
            {showFormatToggle && (
              <button
                type="button"
                className="wysiwyg-btn wysiwyg-btn-secondary"
                onClick={handleToggleOrientation}
                title={`Toggle ke ${orientation === "portrait" ? "Landscape" : "Portrait"}`}
              >
                {orientation === "portrait" ? "Vertikal" : "Matrix"}
              </button>
            )}
            {status !== "final" && onSetFinal && (
              <button
                type="button"
                className="wysiwyg-btn wysiwyg-btn-final"
                onClick={handleFinal}
              >
                Final
              </button>
            )}
            <button
              type="button"
              className="wysiwyg-btn wysiwyg-btn-primary"
              onClick={handlePrint}
            >
              Cetak
            </button>
          </div>
        </div>
      )}

      {/* A4 Canvas */}
      <div className="wysiwyg-canvas-area">
        <div className={canvasClass} data-doc-id={docId}>
          {children}
        </div>
      </div>
    </div>
  );
}
