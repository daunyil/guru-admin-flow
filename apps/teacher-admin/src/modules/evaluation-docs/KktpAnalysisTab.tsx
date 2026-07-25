/**
 * KktpAnalysisTab — Analisis KKTP section.
 */

import { Card, CardHeader, Input, Button, Select } from "@shared/ui";
import { PrintExportButtons } from "@shared/ui/PrintExportButtons";
import { KktpAnalysisDocument } from "@shared/documents";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";
import type { AcademicYear, SchoolProfile, TeachingAssignment, ATPEntry } from "@guru-admin/domain";
import type { KktpAnalysisRow } from "@shared/documents";
import type { EvaluationDocsState } from "./useEvaluationDocsState";

interface KktpAnalysisTabProps {
  filteredATP: ATPEntry[];
  selectedTpIds: Set<string>;
  toggleTp: EvaluationDocsState["toggleTp"];
  kktpValue: number;
  setKktpValue: EvaluationDocsState["setKktpValue"];
  kktpRows: KktpAnalysisRow[];
  setKktpRows: EvaluationDocsState["setKktpRows"];
  buildKktpRows: EvaluationDocsState["buildKktpRows"];
  showDocument: boolean;
  setShowDocument: EvaluationDocsState["setShowDocument"];
  school: SchoolProfile | undefined;
  year: AcademicYear | null;
  assignment: TeachingAssignment | undefined;
}

export function KktpAnalysisTab({
  filteredATP,
  selectedTpIds,
  toggleTp,
  kktpValue,
  setKktpValue,
  kktpRows,
  setKktpRows,
  buildKktpRows,
  showDocument,
  setShowDocument,
  school,
  year,
  assignment,
}: KktpAnalysisTabProps) {
  return (
    <>
      <Card>
        <CardHeader title="Analisis KKTP" description="Pemetaan kriteria ketercapaian tujuan pembelajaran berdasarkan interval nilai/rubrik." />
        <div className="space-y-3">
          <Input label="KKTP / KKM" id="ev-kktp" type="number" value={String(kktpValue)} onChange={(v) => setKktpValue(Number(v) || 75)} hint="Nilai batas ketuntasan (default 75)." />
          <div>
            <p className="label">Pilih TP & tentukan interval ketercapaian:</p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {filteredATP.length === 0 ? (
                <p className="text-sm text-slate-500">Belum ada TP untuk assignment ini.</p>
              ) : (
                filteredATP.map((tp) => (
                  <label key={tp.id} className="flex items-center gap-2 p-2 border border-slate-200 rounded">
                    <input type="checkbox" checked={selectedTpIds.has(tp.id)} onChange={() => toggleTp(tp.id)} className="mt-0.5" />
                    <div className="flex-1 text-sm">
                      <span className="font-medium">{tp.tp}</span>
                      <span className="text-xs text-slate-500 ml-2">Elemen: {tp.elemen ?? "-"}</span>
                    </div>
                    <Select
                      label=""
                      id={`interval-${tp.id}`}
                      value={String(kktpRows.find(r => r.learningObjective === tp.tp)?.intervalIndex ?? -1)}
                      onChange={(v) => {
                        const idx = Number(v);
                        setKktpRows(prev => {
                          const existing = prev.findIndex(r => r.learningObjective === tp.tp);
                          if (existing >= 0) {
                            const next = [...prev];
                            next[existing] = { ...next[existing], intervalIndex: idx >= 0 ? idx : undefined };
                            return next;
                          }
                          return [...prev, { element: tp.elemen ?? "", learningObjective: tp.tp, intervalIndex: idx >= 0 ? idx : undefined }];
                        });
                      }}
                      options={[
                        { value: "-1", label: "— belum ditentukan —" },
                        { value: "0", label: "0–60% (Perlu Bimbingan)" },
                        { value: "1", label: "61–70% (Cukup)" },
                        { value: "2", label: "71–80% (Baik)" },
                        { value: "3", label: "81–100% (Sangat Baik)" },
                      ]}
                    />
                  </label>
                ))
              )}
            </div>
          </div>
          <Button onClick={buildKktpRows} disabled={selectedTpIds.size === 0}>
            Buat Tabel KKTP
          </Button>
        </div>
      </Card>

      {kktpRows.length > 0 && (
        <>
          <Card>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setShowDocument(!showDocument)}>
                {showDocument ? "Mode Input" : "Cetak Dokumen"}
              </Button>
              {showDocument && (
                <PrintExportButtons filename="analisis-kktp" title="Analisis KKTP" schoolName={school?.name} />
              )}
            </div>
          </Card>
          {showDocument && (
            <KktpAnalysisDocument
              withPrintArea={true}
              data={{
                context: {
                  schoolName: school?.name,
                  schoolAddress: school?.address,
                  schoolOffice: "Dinas Pendidikan",
                  academicYear: year?.label,
                  semester: assignment!.semester === 1 ? "Ganjil" : "Genap",
                  teacherName: assignment!.teacherName,
                  subject: assignment!.subject,
                  classLabel: assignment!.classLabel,
                  headmasterName: school?.headmasterName,
                  headmasterNip: school?.headmasterNip,
                  place: school?.regency ?? "",
                  dateLabel: formatLongDateID(todayISODate()),
                },
                kktp: kktpValue,
                rows: kktpRows,
              }}
            />
          )}
        </>
      )}
    </>
  );
}
