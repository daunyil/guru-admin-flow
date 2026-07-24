/**
 * GradeDocument — A4 formal table for grades (editable in canvas).
 */
import type { GradeEntry, TeachingAssignment } from "@guru-admin/domain";
import { getScoreColumns } from "./grades-utils";

interface GradeDocumentProps {
  calculated: GradeEntry[];
  kktp: string;
  assignment: TeachingAssignment;
  yearLabel: string;
  teacherName: string;
  editable?: boolean;
  onSetScore?: (idx: number, field: keyof GradeEntry, value: string) => void;
  gradeModel: "uh" | "kd";
  uhCount: number;
}

export function GradeDocument({
  calculated,
  kktp,
  assignment,
  yearLabel,
  teacherName,
  editable,
  onSetScore,
  gradeModel,
  uhCount,
}: GradeDocumentProps) {
  const scoreColumns = getScoreColumns(gradeModel, uhCount);
  return (
    <div className="document-page document-landscape" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '11pt', lineHeight: '1.25', width: '100%', boxSizing: 'border-box' }}>
      <div className="document-title">DAFTAR NILAI</div>
      <div className="document-subtitle">{yearLabel} — Semester {assignment.semester === 1 ? "Ganjil" : "Genap"}</div>
      <table className="document-identity" style={{ fontFamily: 'Arial, Helvetica, sans-serif', width: '100%', borderCollapse: 'collapse', boxSizing: 'border-box' }}>
        <tbody>
          <tr><td>Sekolah</td><td>{teacherName || "-"}</td><td>Mapel</td><td>{assignment.subject}</td></tr>
          <tr><td>Kelas</td><td>{assignment.classLabel}</td><td>KKTP</td><td>{kktp || "-"}</td></tr>
          <tr><td>Guru</td><td>{assignment.teacherName}</td><td>Semester</td><td>{assignment.semester === 1 ? "Ganjil" : "Genap"}</td></tr>
        </tbody>
      </table>
      <table className="document-table" style={{ fontFamily: 'Arial, Helvetica, sans-serif', width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', boxSizing: 'border-box', fontSize: '9pt' }}>
        <thead>
          <tr>
            <th style={{ width: "4%" }}>No</th>
            <th style={{ width: "20%" }}>Nama</th>
            {scoreColumns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
            <th style={{ width: "7%" }}>Akhir</th>
            <th style={{ width: "9%" }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {calculated.map((e, i) => (
            <tr key={e.studentId}>
              <td className="text-center">{i + 1}</td>
              <td>{e.studentName}</td>
              {scoreColumns.map((col) => (
                <td key={col.key} className="text-center">
                  {editable && onSetScore ? (
                    <input
                      type="number"
                      className="w-12 px-1 py-0.5 border border-slate-300 rounded text-sm text-center no-print"
                      value={(e[col.key] as number | null) ?? ""}
                      onChange={(ev) => onSetScore(i, col.key, ev.target.value)}
                      min={0} max={100}
                    />
                  ) : (
                    <span className="print-only">{(e[col.key] as number | null) ?? "-"}</span>
                  )}
                </td>
              ))}
              <td className="text-center font-bold">{e.finalScore ?? "-"}</td>
              <td className="text-center">
                {e.status === "complete" ? "Tuntas" : e.status === "remedial" ? "Remedial" : "Belum"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
