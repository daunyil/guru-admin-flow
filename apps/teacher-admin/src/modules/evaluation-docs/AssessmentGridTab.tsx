/**
 * AssessmentGridTab — Kisi-Kisi Penulisan Soal (Assessment Grid) section.
 */

import { Card, CardHeader, Input, Button, Select } from "@shared/ui";
import { PrintExportButtons } from "@shared/ui/PrintExportButtons";
import { AssessmentGridDocument } from "@shared/documents";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";
import type { AcademicYear, SchoolProfile, TeachingAssignment, ATPEntry } from "@guru-admin/domain";
import type { AssessmentGridRow } from "@shared/documents";
import type { EvaluationDocsState } from "./useEvaluationDocsState";

interface AssessmentGridTabProps {
  assessmentGridTitle: string;
  setAssessmentGridTitle: EvaluationDocsState["setAssessmentGridTitle"];
  filteredATP: ATPEntry[];
  selectedTpIds: Set<string>;
  toggleTp: EvaluationDocsState["toggleTp"];
  buildAssessmentGridRows: EvaluationDocsState["buildAssessmentGridRows"];
  assessmentGridRows: AssessmentGridRow[];
  setAssessmentGridRows: EvaluationDocsState["setAssessmentGridRows"];
  showDocument: boolean;
  setShowDocument: EvaluationDocsState["setShowDocument"];
  school: SchoolProfile | undefined;
  year: AcademicYear | null;
  assignment: TeachingAssignment | undefined;
}

export function AssessmentGridTab({
  assessmentGridTitle,
  setAssessmentGridTitle,
  filteredATP,
  selectedTpIds,
  toggleTp,
  buildAssessmentGridRows,
  assessmentGridRows,
  setAssessmentGridRows,
  showDocument,
  setShowDocument,
  school,
  year,
  assignment,
}: AssessmentGridTabProps) {
  return (
    <>
      <Card>
        <CardHeader title="Kisi-Kisi Penulisan Soal" description="Matriks pemetaan kisi-kisi penyusunan soal asesmen (STS/SAS)." />
        <div className="space-y-3">
          <Input label="Judul Asesmen" id="ev-grid-title" value={assessmentGridTitle} onChange={setAssessmentGridTitle} placeholder="Sumatif Akhir Semester (SAS) Ganjil 2025/2026" />
          <div>
            <p className="label">Pilih TP untuk kisi-kisi:</p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {filteredATP.length === 0 ? (
                <p className="text-sm text-slate-500">Belum ada TP untuk assignment ini.</p>
              ) : (
                filteredATP.map((tp) => (
                  <label key={tp.id} className="flex items-start gap-2 p-2 border border-slate-200 rounded cursor-pointer hover:bg-slate-50">
                    <input type="checkbox" checked={selectedTpIds.has(tp.id)} onChange={() => toggleTp(tp.id)} className="mt-1" />
                    <div className="text-sm">
                      <p className="font-medium">{tp.tp}</p>
                      <p className="text-xs text-slate-500">Bab {tp.bab ?? "-"} · {tp.elemen ?? "-"}</p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
          <Button onClick={buildAssessmentGridRows} disabled={selectedTpIds.size === 0}>
            Buat Kisi-Kisi dari TP
          </Button>
        </div>
      </Card>

      {assessmentGridRows.length > 0 && (
        <Card>
          <CardHeader title="Edit Detail Kisi-Kisi" description="Isi indikator soal, bentuk soal, level kognitif, dan nomor soal per baris." />
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="py-2 px-2">No</th><th className="py-2 px-2">Elemen</th><th className="py-2 px-2">Materi</th>
                  <th className="py-2 px-2">Indikator Soal</th><th className="py-2 px-2">Bentuk Soal</th>
                  <th className="py-2 px-2">Level</th><th className="py-2 px-2">No. Soal</th>
                </tr>
              </thead>
              <tbody>
                {assessmentGridRows.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-1.5 px-2 text-center">{row.no}</td>
                    <td className="py-1.5 px-2 text-xs">{row.element}</td>
                    <td className="py-1.5 px-2 text-xs">{row.material}</td>
                    <td className="py-1.5 px-2">
                      <Input label="Indikator" id={`grid-ind-${i}`} value={row.indicator ?? "—"} onChange={(v) => {
                        setAssessmentGridRows(prev => { const next = [...prev]; next[i] = { ...next[i], indicator: v }; return next; });
                      }} />
                    </td>
                    <td className="py-1.5 px-2">
                      <Select label="Bentuk" id={`grid-form-${i}`} value={row.questionForm ?? "—"} onChange={(v) => {
                        setAssessmentGridRows(prev => { const next = [...prev]; next[i] = { ...next[i], questionForm: v }; return next; });
                      }} options={[{value:"Pilihan Ganda",label:"Pilihan Ganda"},{value:"Esai",label:"Esai"},{value:"Uraian",label:"Uraian"},{value:"—",label:"—"}]} />
                    </td>
                    <td className="py-1.5 px-2">
                      <Select label="Level" id={`grid-level-${i}`} value={row.cognitiveLevel ?? "—"} onChange={(v) => {
                        setAssessmentGridRows(prev => { const next = [...prev]; next[i] = { ...next[i], cognitiveLevel: v }; return next; });
                      }} options={[{value:"C1",label:"C1 (Mengingat)"},{value:"C2",label:"C2 (Memahami)"},{value:"C3",label:"C3 (Menerapkan)"},{value:"C4",label:"C4 (Menganalisis)"},{value:"C5",label:"C5 (Mengevaluasi)"},{value:"C6",label:"C6 (Mencipta)"},{value:"L1",label:"L1"},{value:"L2",label:"L2"},{value:"L3",label:"L3"},{value:"—",label:"—"}]} />
                    </td>
                    <td className="py-1.5 px-2">
                      <Input label="No. Soal" id={`grid-num-${i}`} value={row.questionNumbers ?? "—"} onChange={(v) => {
                        setAssessmentGridRows(prev => { const next = [...prev]; next[i] = { ...next[i], questionNumbers: v }; return next; });
                      }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex gap-2">
            <Button variant="secondary" onClick={() => setShowDocument(!showDocument)}>
              {showDocument ? "Mode Edit" : "Cetak Dokumen"}
            </Button>
            {showDocument && (
              <PrintExportButtons filename="kisi-kisi-penulisan-soal" title="Kisi-Kisi Penulisan Soal" schoolName={school?.name} />
            )}
          </div>
        </Card>
      )}

      {showDocument && assessmentGridRows.length > 0 && (
        <AssessmentGridDocument
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
            assessmentTitle: assessmentGridTitle || `Asesmen ${assignment!.subject} ${assignment!.classLabel}`,
            rows: assessmentGridRows,
          }}
        />
      )}
    </>
  );
}
