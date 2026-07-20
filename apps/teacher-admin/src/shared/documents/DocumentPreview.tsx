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

import { Component, type ReactNode, useCallback, useEffect, type ErrorInfo } from "react";
import {
  useAutoSave,
  type AutoSaveStatus,
} from "../hooks/useAutoSave";
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
  /** Data dokumen terkini. Auto-save ter-trigger setiap kali reference ini berubah. */
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

/* ------------------------------------------------------------------ */
/*  Document Error Boundary                                           */
/* ------------------------------------------------------------------ */

type DocErrorBoundaryState = { hasError: boolean; error: Error | null };

class DocErrorBoundary extends Component<
  { children: ReactNode; docLabel: string },
  DocErrorBoundaryState
> {
  constructor(props: { children: ReactNode; docLabel: string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): DocErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[DocErrorBoundary] Dokumen crash:", error, info);
  }

  override render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="doc-error-fallback">
        <div className="doc-error-fallback-inner">
          <div className="doc-error-icon">⚠</div>
          <h3>Dokumen Gagal Dimuat</h3>
          <p>
            Terjadi kesalahan saat merender {this.props.docLabel}. Data Anda
            tetap aman di penyimpanan lokal.
          </p>
          <div className="doc-error-detail">
            {this.state.error?.message ?? "Unknown error"}
          </div>
          <div className="doc-error-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Coba Lagi
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => window.location.reload()}
            >
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      </div>
    );
  }
}

/* ------------------------------------------------------------------ */
/*  DocumentPreview                                                   */
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
  // Auto-save: panggil scheduleSave setiap kali data berubah.
  // scheduleSave debounce 1.5s — simpan hanya setelah user berhenti mengetik.
  const { saveStatus, triggerSave, scheduleSave } = useAutoSave({
    docId,
    getData: useCallback(() => data, [data]),
    onSave,
  });

  useEffect(() => {
    scheduleSave();
  }, [data, scheduleSave]);

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
    orientation === "landscape" ? "wysiwyg-landscape" : "",
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
        <DocErrorBoundary docLabel={docLabel}>
          <div className={canvasClass} data-doc-id={docId}>
            {children}
          </div>
        </DocErrorBoundary>
      </div>
    </div>
  );
}
