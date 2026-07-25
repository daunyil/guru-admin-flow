/**
 * EffectiveWeeksTab — Rincian Minggu Efektif section.
 */

import { Card, CardHeader, Input, Button, Badge } from "../../shared/ui";
import { PrintExportButtons } from "../../shared/ui/PrintExportButtons";
import { EffectiveWeeksDocument } from "../../shared/documents";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";
import type { AcademicYear, SchoolProfile, TeachingAssignment, EffectiveWeekItem } from "@guru-admin/domain";
import type { EvaluationDocsState } from "./useEvaluationDocsState";

interface EffectiveWeeksTabProps {
  jpPerWeek: number;
  setJpPerWeek: EvaluationDocsState["setJpPerWeek"];
  handleGenerateWeeks: EvaluationDocsState["handleGenerateWeeks"];
  effectiveWeeks: EffectiveWeekItem[];
  effectiveWeeksTotal: number;
  effectiveJPTotal: number;
  showDocument: boolean;
  setShowDocument: EvaluationDocsState["setShowDocument"];
  school: SchoolProfile | undefined;
  year: AcademicYear | null;
  assignment: TeachingAssignment | undefined;
}

export function EffectiveWeeksTab({
  jpPerWeek,
  setJpPerWeek,
  handleGenerateWeeks,
  effectiveWeeks,
  effectiveWeeksTotal,
  effectiveJPTotal,
  showDocument,
  setShowDocument,
  school,
  year,
  assignment,
}: EffectiveWeeksTabProps) {
  return (
    <Card>
      <CardHeader title="Rincian Minggu Efektif" description="Hitung dari Kalender Pendidikan dan hari tidak efektif." />
      <div className="flex gap-3 items-end">
        <Input label="JP per Minggu" id="ev-jp" type="number" value={String(jpPerWeek)} onChange={(v) => setJpPerWeek(Number(v) || 3)} hint="Default 3 JP/minggu." />
        <Button onClick={handleGenerateWeeks}>Hitung Minggu Efektif</Button>
      </div>
      {effectiveWeeks.length > 0 && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-2 bg-slate-50 rounded"><p className="text-xl font-bold">{effectiveWeeks.length}</p><p className="text-xs">Total Minggu</p></div>
            <div className="p-2 bg-brand-50 rounded"><p className="text-xl font-bold text-brand-700">{effectiveWeeksTotal}</p><p className="text-xs">Efektif</p></div>
            <div className="p-2 bg-amber-50 rounded"><p className="text-xl font-bold text-amber-700">{effectiveJPTotal}</p><p className="text-xs">JP Efektif</p></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="py-2 px-2">Minggu</th>
                  <th className="py-2 px-2">Tanggal</th>
                  <th className="py-2 px-2">Keterangan</th>
                  <th className="py-2 px-2 text-center">Efektif?</th>
                  <th className="py-2 px-2 text-center">Hari</th>
                  <th className="py-2 px-2 text-center">JP</th>
                </tr>
              </thead>
              <tbody>
                {effectiveWeeks.map((w) => (
                  <tr key={w.weekNumber} className="border-b border-slate-100">
                    <td className="py-1.5 px-2 font-medium">{w.weekNumber}</td>
                    <td className="py-1.5 px-2 text-xs">{w.startDate} - {w.endDate}</td>
                    <td className="py-1.5 px-2 text-xs">{w.description}{w.notes ? ` (${w.notes})` : ""}</td>
                    <td className="py-1.5 px-2 text-center">{w.isEffective ? <Badge variant="success">Ya</Badge> : <Badge variant="error">Tidak</Badge>}</td>
                    <td className="py-1.5 px-2 text-center">{w.effectiveDays}</td>
                    <td className="py-1.5 px-2 text-center">{w.effectiveJP}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowDocument(!showDocument)}>{showDocument ? "Mode Tabel" : "Cetak Dokumen"}</Button>
            {showDocument && (
              <PrintExportButtons filename="minggu-efektif" title="Rincian Minggu Efektif" schoolName={school?.name} />
            )}
          </div>
          {showDocument && (
            <EffectiveWeeksDocument
              withPrintArea={true}
              data={{
                context: {
                  schoolName: school?.name,
                  schoolAddress: school?.address,
                  schoolOffice: "Dinas Pendidikan",
                  institutionName: "",
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
                rows: effectiveWeeks.map((w) => ({
                  month: w.description || `Minggu ${w.weekNumber}`,
                  totalWeeks: w.isEffective ? 1 : 0,
                  nonEffectiveWeeks: w.isEffective ? 0 : 1,
                  effectiveWeeks: w.isEffective ? 1 : 0,
                  activities: w.notes || w.description || "",
                })),
                allocations: [{
                  component: `${assignment!.subject} — ${assignment!.classLabel}`,
                  jpPerWeek,
                  totalWeeks: effectiveWeeksTotal,
                  totalJp: effectiveJPTotal,
                }],
                totalEffectiveWeeks: effectiveWeeksTotal,
                totalJp: effectiveJPTotal,
              }}
            />
          )}
        </div>
      )}
    </Card>
  );
}
