/**
 * NilaiMatrix — Landscape matriks nilai PA-split (Ulangan + Tugas per KD).
 *
 * Format referensi: SMPN 8 Bantan — PENILAIAN PENGETAHUAN SISWA
 *   - LANDSCAPE orientasi
 *   - 3-level header:
 *     Row 1: NO. | NAMA | PA (colspan=2*kdCount) | PTS | PAS | Ket.
 *     Row 2: Ulangan (colspan kdCount) | Tugas (colspan kdCount) | (PTS/PAS/Ket rowspan=2)
 *     Row 3: KD1..KDn | KD1..KDn
 *   - Footer: Guru Bidang Studi TTD
 *
 * DOMAIN-BOUNDARY: Module 1-harian, presentation component only.
 */

import type { StudentGradeRecord, SchoolProfile, GradeBook } from "@guru-admin/domain";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmtScore(v: number | null | undefined): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

function scoreCellClass(v: number | null | undefined): string {
  if (v === null || v === undefined) return "";
  if (v < 70) return "bg-rose-50 text-rose-700"; // Below KKTP
  if (v >= 90) return "bg-emerald-50 text-emerald-700"; // Excellent
  return "";
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface NilaiMatrixProps {
  records: StudentGradeRecord[];
  gradeBook: GradeBook | null;
  school?: SchoolProfile;
  teacherName?: string;
  yearLabel?: string;
  classLabel?: string;
  subject?: string;
  semester?: 1 | 2;
}

export function NilaiMatrix({
  records,
  gradeBook,
  school,
  teacherName,
  yearLabel,
  classLabel,
  subject,
  semester,
}: NilaiMatrixProps) {
  const kdCount = gradeBook?.kdCount ?? 6;
  const gradeModel = gradeBook?.gradeModel ?? "uh";
  const isPaSplit = gradeModel === "pa-split";
  // Determine KD labels
  const kdLabels = Array.from({ length: kdCount }, (_, i) => `KD${i + 1}`);

  // Determine sub-group label for non-PA header
  const ulanganLabel = isPaSplit ? "Penilaian Harian / Ulangan Harian" : (gradeModel === "kd" ? "Kompetensi Dasar (KD)" : "Ulangan Harian (UH)");

  // Semester label
  const semesterLabel = semester === 1 ? "Ganjil" : "Genap";

  return (
    <div className="document-page document-landscape" id="rekap-nilai-doc">
      {/* --- Kop Surat --- */}
      <div className="document-header with-border" style={{ marginBottom: 10 }}>
        {school?.logo && (
          <div className="document-logo-box">
            <img src={school.logo} alt="Logo" className="document-logo" />
          </div>
        )}
        <div className="document-title-block">
          <div className="document-title" style={{ fontSize: "12pt", textTransform: "uppercase" }}>
            PENILAIAN PENGETAHUAN SISWA/I {school?.name ?? "SMP NEGERI 8 BANTAN"}
          </div>
          <div style={{ fontSize: "10pt", fontWeight: 700, textAlign: "center" }}>
            TAHUN PELAJARAN {yearLabel ?? "2023/2024"}
          </div>
          <div style={{ fontSize: "10pt", marginTop: 4, display: "flex", gap: 24 }}>
            <span style={{ fontWeight: 700 }}>Mata Pelajaran : {subject ?? ".............."}</span>
            <span style={{ fontWeight: 700 }}>Kelas / Semester : {classLabel ?? ".........."} / {semesterLabel}</span>
          </div>
        </div>
      </div>

      {/* --- Matriks Nilai Tabel --- */}
      <div className="document-table-wrap">
        <table className="document-table document-table-compact">
          <thead>
            {/* Row 1: Super-header */}
            <tr>
              <th rowSpan={isPaSplit ? 3 : 2} style={{ width: "30px", minWidth: 30 }}>NO.</th>
              <th rowSpan={isPaSplit ? 3 : 2} style={{ width: "140px", minWidth: 100 }}>NAMA</th>
              {isPaSplit ? (
                <th colSpan={kdCount * 2} style={{ fontSize: "8pt" }}>Penilaian Harian (PA)</th>
              ) : (
                <th colSpan={kdCount} style={{ fontSize: "8pt" }}>{ulanganLabel}</th>
              )}
              <th rowSpan={isPaSplit ? 3 : 2} style={{ fontSize: "8pt" }}>PTS</th>
              <th rowSpan={isPaSplit ? 3 : 2} style={{ fontSize: "8pt" }}>PAS</th>
              <th rowSpan={isPaSplit ? 3 : 2} style={{ fontSize: "8pt" }}>Ket.</th>
            </tr>

            {isPaSplit && (
              /* Row 2: Sub-groups (PA-split only) */
              <tr>
                <th colSpan={kdCount} style={{ fontSize: "7pt" }}>Ulangan Harian</th>
                <th colSpan={kdCount} style={{ fontSize: "7pt" }}>Tugas / PR</th>
              </tr>
            )}

            {/* Row 3 (or Row 2 for non-PA): KD labels */}
            <tr>
              {isPaSplit ? (
                <>
                  {/* Ulangan KD columns */}
                  {kdLabels.map((kd) => (
                    <th key={`u-${kd}`} style={{ fontSize: "7pt", width: "24px", minWidth: 18 }}>{kd}</th>
                  ))}
                  {/* Tugas KD columns */}
                  {kdLabels.map((kd) => (
                    <th key={`t-${kd}`} style={{ fontSize: "7pt", width: "24px", minWidth: 18 }}>{kd}</th>
                  ))}
                </>
              ) : (
                kdLabels.map((kd) => (
                  <th key={kd} style={{ fontSize: "7pt", width: "24px", minWidth: 18 }}>{kd}</th>
                ))
              )}
            </tr>
          </thead>
          <tbody>
            {records.map((rec, idx) => (
              <tr key={rec.studentId}>
                <td>{idx + 1}</td>
                <td className="text-left" style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                  {rec.studentName.toUpperCase()}
                </td>
                {isPaSplit ? (
                  <>
                    {/* Ulangan KD scores */}
                    {kdLabels.map((_kd, kdIdx) => {
                      const kdNum = kdIdx + 1;
                      const val = rec.ulanganScores[kdNum];
                      return (
                        <td key={`u-${kdNum}`} className={scoreCellClass(val)} style={{ fontSize: "8pt" }}>
                          {fmtScore(val)}
                        </td>
                      );
                    })}
                    {/* Tugas KD scores */}
                    {kdLabels.map((_kd, kdIdx) => {
                      const kdNum = kdIdx + 1;
                      const val = rec.tugasScores[kdNum];
                      return (
                        <td key={`t-${kdNum}`} className={scoreCellClass(val)} style={{ fontSize: "8pt" }}>
                          {fmtScore(val)}
                        </td>
                      );
                    })}
                  </>
                ) : (
                  /* Non-PA: show final KD scores */
                  kdLabels.map((_kd, kdIdx) => {
                    const kdNum = kdIdx + 1;
                    const val = rec.finalKDScores[kdNum];
                    return (
                      <td key={kdNum} className={scoreCellClass(val)} style={{ fontSize: "8pt" }}>
                        {fmtScore(val)}
                      </td>
                    );
                  })
                )}
                {/* PTS */}
                <td className={scoreCellClass(rec.pts)} style={{ fontSize: "8pt" }}>{fmtScore(rec.pts)}</td>
                {/* PAS */}
                <td className={scoreCellClass(rec.pas)} style={{ fontSize: "8pt" }}>{fmtScore(rec.pas)}</td>
                {/* Ket. */}
                <td className="text-left" style={{ fontSize: "7pt" }}>{rec.ket}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- Footer/TTD --- */}
      <div className="signature-grid" style={{ marginTop: 16, gap: 48 }}>
        <div className="signature-block">
          <div className="signature-place-date">
            {school?.village ?? school?.district ?? "............"}, {yearLabel?.split("/")[0] ?? "........"}
          </div>
          <div className="signature-role">Guru Bidang Studi</div>
          <div className="signature-space" />
          <div className="signature-name">{teacherName ?? "___________________"}</div>
        </div>
      </div>
    </div>
  );
}
