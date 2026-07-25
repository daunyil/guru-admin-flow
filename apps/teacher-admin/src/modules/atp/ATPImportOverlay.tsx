/**
 * ATP Import Overlay — import TP from JSON or Excel paste.
 */

import { Card, CardHeader, Input, Textarea, Button, Select } from "../../shared/ui";
import {
  parseAtpExcelPaste,
  type AtpPasteMeta,
} from "@guru-admin/domain";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type ImportPreviewData =
  | { type: "json"; entries: Array<Record<string, unknown>>; errors: string[] }
  | { type: "excel"; rows: ReturnType<typeof parseAtpExcelPaste>["rows"]; skipped: ReturnType<typeof parseAtpExcelPaste>["skippedRows"] }
  | null;

export interface ATPImportOverlayProps {
  importMode: "json" | "excel";
  onImportModeChange: (v: "json" | "excel") => void;
  importJson: string;
  onImportJsonChange: (v: string) => void;
  importExcel: string;
  onImportExcelChange: (v: string) => void;
  importMeta: AtpPasteMeta;
  onImportMetaChange: (meta: AtpPasteMeta) => void;
  importPreview: ImportPreviewData;
  onPreview: () => void;
  onApply: () => void;
  onCancel: () => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ATPImportOverlay(props: ATPImportOverlayProps) {
  const {
    importMode,
    onImportModeChange,
    importJson,
    onImportJsonChange,
    importExcel,
    onImportExcelChange,
    importMeta,
    onImportMetaChange,
    importPreview,
    onPreview,
    onApply,
    onCancel,
  } = props;

  return (
    <div className="doc-overlay no-print" role="dialog" aria-modal="true" aria-label="Impor Bank TP">
      <Card className="overflow-y-auto">
        <CardHeader
          title="Impor Bank TP"
          description="Impor TP dari JSON (hasil AI) atau paste dari Excel."
        />
        <div className="space-y-3 p-4">
          <div className="flex gap-2 items-end">
            <Select
              label="Mode Impor"
              id="atp-import-mode"
              value={importMode}
              onChange={(v) => { onImportModeChange(v as "json" | "excel"); }}
              options={[
                { value: "json", label: "JSON (guru-admin-flow/atp/v1)" },
                { value: "excel", label: "Excel Paste" },
              ]}
            />
            {importMode === "excel" && (
              <>
                <Input label="Subject" id="atp-imp-subject" value={importMeta.subject} onChange={(v) => { onImportMetaChange({ ...importMeta, subject: v }); }} />
                <Input label="Grade" id="atp-imp-grade" value={importMeta.grade} onChange={(v) => { onImportMetaChange({ ...importMeta, grade: v }); }} />
                <Input label="Phase" id="atp-imp-phase" value={importMeta.phase} onChange={(v) => { onImportMetaChange({ ...importMeta, phase: v }); }} />
              </>
            )}
          </div>

          {importMode === "json" ? (
            <Textarea label="JSON Bank TP" id="atp-import-json" value={importJson} onChange={(v) => { onImportJsonChange(v); }} rows={8}
              placeholder={'{"$schema":"guru-admin-flow/atp/v1","subject":"PPKn","grade":"VII","phase":"D","entries":[{"bab":"1","elemen":"Norma","cp":"...","tp":"...","alokasiJP":2}]}'}
            />
          ) : (
            <Textarea label="Paste dari Excel" id="atp-import-excel" value={importExcel} onChange={(v) => { onImportExcelChange(v); }} rows={8}
              placeholder={"Bab\tElemen\tCP\tTP\tProfil Pelajar\tKata Kunci\tAlokasi JP\n1\tNorma\tMemahami norma\tMenjelaskan norma\tBernalar\tnorma\t2"}
            />
          )}

          <div className="flex gap-2">
            <Button variant="secondary" onClick={onPreview} disabled={importMode === "json" ? !importJson.trim() : !importExcel.trim()}>
              Preview Import
            </Button>
            {importPreview && (
              <Button onClick={onApply} disabled={
                (importPreview.type === "json" && importPreview.entries.length === 0) ||
                (importPreview.type === "excel" && importPreview.rows.length === 0)
              }>
                Impor {importPreview.type === "json" ? `${importPreview.entries.length} TP` : `${importPreview.rows.length} TP`}
              </Button>
            )}
            <Button variant="secondary" onClick={onCancel}>Batal</Button>
          </div>

          {importPreview && (
            <div className="p-3 bg-slate-50 rounded-md space-y-2">
              {importPreview.type === "json" ? (
                <>
                  {importPreview.errors.length > 0 ? (
                    <div className="p-2 bg-rose-100 rounded text-xs text-rose-800">
                      <p className="font-semibold">Error:</p>
                      <ul className="ml-4 list-disc">{importPreview.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-semibold text-emerald-700">✓ {importPreview.entries.length} TP siap diimpor</p>
                      <div className="mt-2 max-h-48 overflow-y-auto text-xs">
                        {importPreview.entries.map((e, i) => (
                          <div key={i} className="p-1 border-b border-slate-200">
                            <strong>{String(e.elemen ?? "")}</strong>: {String(e.tp ?? "").slice(0, 80)}{String(e.tp ?? "").length > 80 ? "..." : ""} ({String(e.alokasiJP ?? "?")} JP)
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-emerald-700">
                    ✓ {importPreview.rows.length} baris siap diimpor
                    {importPreview.skipped.length > 0 && <span className="text-amber-700"> · {importPreview.skipped.length} di-skip</span>}
                  </p>
                  {importPreview.skipped.length > 0 && (
                    <div className="mt-2 max-h-32 overflow-y-auto text-xs text-rose-700">
                      {importPreview.skipped.map((s, i) => <div key={i} className="p-1">Baris {s.lineNumber}: {s.reason}</div>)}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
