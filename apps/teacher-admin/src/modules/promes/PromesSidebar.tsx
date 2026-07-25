/**
 * PromesSidebar — sidebar panel for WYSIWYG layout (when result exists).
 * Extracted from PromesPage.tsx lines 287-456.
 * Contains Konteks & Opsi, Ringkasan, Distribusi Materi, Errors/Warnings, Footer.
 */

import { Badge, Button, Input, Select } from "../../shared/ui";
import type {
  ProtaProfile,
  PromesResult,
  PromesOptions,
  SchoolDocOrientation,
} from "@guru-admin/domain";
import { updateSchoolDocumentLayout } from "../../shared/db/school-document-repo";
import {
  KO_PROMES_MODE_OPTIONS,
  PROMES_VARIASI_OPTIONS,
  type PromesVariasi,
} from "./usePromesState";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface PromesSidebarProps {
  /** Result data (must exist — sidebar only shown when result is non-null) */
  result: PromesResult;
  /** Prota profiles list */
  profiles: ProtaProfile[];
  selectedProfileId: string;
  setSelectedProfileId: (v: string) => void;
  semester: 1 | 2;
  setSemester: (v: 1 | 2) => void;
  options: PromesOptions;
  setOptions: (v: PromesOptions) => void;
  variasiDokumen: PromesVariasi;
  setVariasiDokumen: (v: PromesVariasi) => void;
  docId: string | undefined;
  generating: boolean;
  error: string | null;
  profileIncomplete: boolean;
  showSidebar: boolean;
  setShowSidebar: (v: boolean) => void;
  setResult: (v: PromesResult | null) => void;
  setError: (v: string | null) => void;
  handleGenerate: () => void;
}

export function PromesSidebar({
  result,
  profiles,
  selectedProfileId,
  setSelectedProfileId,
  semester,
  setSemester,
  options,
  setOptions,
  variasiDokumen,
  setVariasiDokumen,
  docId,
  generating,
  error,
  profileIncomplete,
  showSidebar,
  setShowSidebar,
  setResult,
  setError,
  handleGenerate,
}: PromesSidebarProps) {
  const { summary, status, errors, warnings, distribution } = result;

  return (
    <aside className={`doc-sidebar no-print ${!showSidebar ? "doc-sidebar-hidden" : ""}`}>
      <div className="doc-sidebar-header">
        <h2 className="text-sm font-bold text-slate-900">Program Semester</h2>
        <button
          type="button"
          className="doc-sidebar-close"
          onClick={() => setShowSidebar(false)}
          title="Tutup sidebar"
        >
          ✕
        </button>
      </div>

      <div className="doc-sidebar-scroll">
        {/* -- Konteks & Opsi -- */}
        <div className="doc-sidebar-section">
          <h3 className="doc-sidebar-section-title">Konteks & Opsi</h3>

          <Select
            label="Prota"
            id="ps-prota"
            value={selectedProfileId}
            onChange={setSelectedProfileId}
            options={profiles.map((p) => ({ value: p.id, label: `${p.subject} — ${p.grade}` }))}
          />

          <Select
            label="Semester"
            id="ps-sem"
            value={String(semester)}
            onChange={(v) => setSemester(Number(v) as 1 | 2)}
            options={[{ value: "1", label: "Semester 1" }, { value: "2", label: "Semester 2" }]}
          />

          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Intra JP"
              id="ps-intra"
              type="number"
              value={String(options.intraJpPerWeek)}
              onChange={(v) => setOptions({ ...options, intraJpPerWeek: Number(v) || 0 })}
            />
            <Input
              label="KO JP"
              id="ps-ko"
              type="number"
              value={String(options.koJpPerWeek)}
              onChange={(v) => setOptions({ ...options, koJpPerWeek: Number(v) || 0 })}
            />
          </div>

          <Input
            label="Cadangan (JP)"
            id="ps-cad"
            type="number"
            value={String(options.cadanganJP)}
            onChange={(v) => setOptions({ ...options, cadanganJP: Number(v) || 0 })}
          />

          <Select
            label="Mode KO"
            id="ps-komode"
            value={options.koMode ?? "end_of_week"}
            onChange={(v) => setOptions({ ...options, koMode: v as PromesOptions["koMode"] })}
            options={KO_PROMES_MODE_OPTIONS}
          />

          <Select
            label="Variasi Dokumen"
            id="ps-variasi"
            value={variasiDokumen}
            onChange={(v) => {
              const newVariasi = v as PromesVariasi;
              setVariasiDokumen(newVariasi);
              // Auto-update orientation
              const newOrientation: SchoolDocOrientation = newVariasi === "ringkas" ? "portrait" : "landscape";
              if (docId) {
                void updateSchoolDocumentLayout(docId, { orientation: newOrientation });
              }
            }}
            options={PROMES_VARIASI_OPTIONS}
          />

          <div className="flex gap-2 mt-2">
            <Button onClick={handleGenerate} disabled={generating || profileIncomplete} className="flex-1">
              {generating ? "Menyusun..." : "Susun Ulang"}
            </Button>
          </div>

          {error && (
            <div className="p-2 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700 mt-2">
              {error}
            </div>
          )}
        </div>

        {/* -- Ringkasan -- */}
        <div className="doc-sidebar-section">
          <h3 className="doc-sidebar-section-title">Ringkasan</h3>

          <div className="flex items-center gap-2 mb-2">
            {status === "valid" ? (
              <Badge variant="success">✓ Valid</Badge>
            ) : (
              <Badge variant="warning">⚠ Perlu Perbaikan</Badge>
            )}
          </div>

          <dl className="doc-summary-dl">
            <div><dt>Minggu efektif</dt><dd>{summary.effectiveWeeks}/{summary.totalWeeks}</dd></div>
            <div><dt>Kapasitas intra</dt><dd>{summary.intraCapacityJP} JP</dd></div>
            <div><dt>Cadangan</dt><dd>{summary.cadanganJP} JP</dd></div>
            <div><dt>Materi terdistribusi</dt><dd>{summary.distributedJP}/{summary.totalUnitJP} JP</dd></div>
            <div><dt>Belum terdistribusi</dt><dd>{summary.undistributedJP} JP</dd></div>
            <div><dt>Kokurikuler</dt><dd>{summary.koTotalJP} JP</dd></div>
          </dl>
        </div>

        {/* -- Distribusi Materi -- */}
        <div className="doc-sidebar-section">
          <h3 className="doc-sidebar-section-title">Distribusi Materi</h3>
          {distribution.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Tidak ada materi.</p>
          ) : (
            <ul className="doc-sidebar-list">
              {distribution.map((d) => (
                <li key={d.unitId} className="doc-sidebar-list-item">
                  <span className="doc-sidebar-list-title">{d.title}</span>
                  <Badge variant={d.status === "fully_distributed" ? "success" : d.status === "partially_distributed" ? "warning" : "error"}>
                    {d.distributedJP}/{d.totalJP} JP
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* -- Warnings/Errors -- */}
        {errors.length > 0 && (
          <div className="doc-sidebar-section">
            <h3 className="doc-sidebar-section-title text-rose-700">Error</h3>
            <ul className="list-disc pl-4 space-y-0.5 text-xs text-rose-600">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}
        {warnings.length > 0 && (
          <div className="doc-sidebar-section">
            <h3 className="doc-sidebar-section-title text-amber-700">Peringatan</h3>
            <ul className="list-disc pl-4 space-y-0.5 text-xs text-amber-600">
              {warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}
      </div>

      {/* -- Kembali ke Form -- */}
      <div className="doc-sidebar-section doc-sidebar-footer">
        <Button
          variant="secondary"
          onClick={() => {
            setResult(null);
            setError(null);
          }}
          className="w-full"
        >
          ← Kembali ke Form
        </Button>
      </div>
    </aside>
  );
}
