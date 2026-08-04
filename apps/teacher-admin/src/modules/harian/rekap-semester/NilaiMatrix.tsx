/**
 * NilaiMatrix — Landscape matriks nilai PA-split (Ulangan + Tugas per KD).
 *
 * FORMAT-3: Penilaian Pengetahuan (Guru Mata Pelajaran)
 * Format referensi: SMPN 8 Bantan — PENILAIAN PENGETAHUAN SISWA
 *   - LANDSCAPE orientasi
 *   - MONOKROM / INK-SAVER grayscale (bg-gray-200 header, bg-gray-100 sub, white data)
 *   - Title: CENTER "PENILAIAN PENGETAHUAN SISWA/I SMPN 8 BANTAN"
 *   - Metadata: 2 baris terpisah (MATA PELAJARAN, KELAS/SEMESTER)
 *   - 3-level header (PA-split):
 *     Row 1: NO. | NAMA | PA(colspan=2*kdCount) | PTS | PAS | NA | Predikat
 *     Row 2: Ulangan(colspan kdCount) | Tugas(colspan kdCount)
 *     Row 3: KD1..KD10 | KD1..KD10
 *   - PTS/PAS: belongs in this format
 *   - Score cells: no colored bg (ink-saver), just the number
 *   - NA (Nilai Akhir): shows finalScore computed average
 *   - Predikat: A/B/C/D based on finalScore (>=90=A, >=80=B, >=70=C, <70=D)
 *   - Footer: Guru Bidang Studi TTD
 *
 * PRINT-FIX-RC1: Added colgroup + table-layout:fixed for consistent print sizing.
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

/** Predikat huruf berdasarkan finalScore (standar SMP Indonesia). */
function predikat(finalScore: number | null): string {
  if (finalScore === null) return "";
  if (finalScore >= 90) return "A";
  if (finalScore >= 80) return "B";
  if (finalScore >= 70) return "C";
  return "D";
}

/** Check apakah siswa punya sekurang-kurangnya satu nilai terisi. */
function hasAnyGrade(rec: StudentGradeRecord, kdCount: number, isPaSplit: boolean): boolean {
  if (rec.pts !== null && rec.pts !== undefined && rec.pts > 0) return true;
  if (rec.pas !== null && rec.pas !== undefined && rec.pas > 0) return true;
  if (rec.finalScore !== null && rec.finalScore !== undefined && rec.finalScore > 0) return true;
  for (let kd = 1; kd <= kdCount; kd++) {
    if (isPaSplit) {
      const u = rec.ulanganScores[kd];
      const t = rec.tugasScores[kd];
      if ((u !== null && u !== undefined && u > 0) || (t !== null && t !== undefined && t > 0)) return true;
    } else {
      const v = rec.finalKDScores[kd];
      if (v !== null && v !== undefined && v > 0) return true;
    }
  }
  return false;
}

/* ------------------------------------------------------------------ */
/*  Column widths — percentage for table-layout:fixed                  */
/* ------------------------------------------------------------------ */

const COL_NO = "2.5%";
const COL_NAMA = "12%";  /* NAMA — student names */
const COL_KD_PA = "3.6%";   /* 20 × 3.6% = 72% (PA-split) */
const COL_KD = "7.2%";      /* 10 × 7.2% = 72% (non-PA) */
const COL_PTS = "3%";
const COL_PAS = "3%";
const COL_NA = "3%";
const COL_PRED = "4.5%";
/* PA total: 2.5+12+72+3+3+3+4.5 = 100% */
/* Non-PA total: 2.5+12+72+3+3+3+4.5 = 100% */

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
  const kdCount = 10;
  const gradeModel = gradeBook?.gradeModel ?? "uh";
  const isPaSplit = gradeModel === "pa-split";
  const kdLabels = Array.from({ length: kdCount }, (_, i) => `KD${i + 1}`);
  const ulanganLabel = isPaSplit ? "Penilaian Harian / Ulangan Harian" : (gradeModel === "kd" ? "Kompetensi Dasar (KD)" : "Ulangan Harian (UH)");
  const semesterLabel = semester === 1 ? "Ganjil" : "Genap";

  return (
    <div className="document-page document-landscape rekap-landscape-doc" id="rekap-nilai-doc">

      {/* ── 1. KOP JUDUL DOKUMEN (CENTER) ── */}
      <div className="text-center mb-2">
        {school?.logo && (
          <img src={school.logo} alt="Logo" className="inline-block mb-1" style={{ maxHeight: 50 }} />
        )}
        <h1 className="text-sm font-bold uppercase tracking-wide">
          PENILAIAN PENGETAHUAN SISWA/I {school?.name ?? "SMP NEGERI 8 BANTAN"}
        </h1>
        <h2 className="text-xs font-bold uppercase">
          TAHUN PELAJARAN {yearLabel ?? ".........."}
        </h2>
      </div>

      {/* ── 2. METADATA 2 BARIS TERPISAH ── */}
      <div className="mb-2 text-[10px] font-bold space-y-0.5">
        <div>MATA PELAJARAN : {subject ?? ".........."}</div>
        <div>KELAS/SEMESTER : {classLabel ?? ".........."}/{semesterLabel}</div>
      </div>

      {/* ── 3. TABEL MATRIKS (MONOKROM INK-SAVER) ── */}
      <div className="document-table-wrap rekap-table-wrap">
        <table
          className="rekap-matrix-table w-full border-collapse border border-black"
          style={{ tableLayout: "fixed", width: "100%" }}
        >
          {/* ── COLGROUP: percentage widths ── */}
          <colgroup>
            <col style={{ width: COL_NO }} />
            <col style={{ width: COL_NAMA }} />
            {isPaSplit
              ? Array.from({ length: kdCount * 2 }, (_, i) => (
                  <col key={i} style={{ width: COL_KD_PA }} />
                ))
              : Array.from({ length: kdCount }, (_, i) => (
                  <col key={i} style={{ width: COL_KD }} />
                ))
            }
            <col style={{ width: COL_PTS }} />
            <col style={{ width: COL_PAS }} />
            <col style={{ width: COL_NA }} />
            <col style={{ width: COL_PRED }} />
          </colgroup>

          <thead>
            {/* ── Row 1: Super-header ── */}
            <tr className="bg-gray-200 border-b border-black">
              <th rowSpan={isPaSplit ? 3 : 2} className="header-summary border border-black text-center align-top font-bold px-0.5 bg-gray-200 text-[8px]">
                NO.
              </th>
              <th rowSpan={isPaSplit ? 3 : 2} className="header-summary border border-black text-left px-1 align-top font-bold text-[9px] bg-gray-200">
                NAMA
              </th>

              {isPaSplit ? (
                <th colSpan={kdCount * 2} className="border border-black text-center font-bold text-[8px]">
                  Penilaian Harian (PA)
                </th>
              ) : (
                <th colSpan={kdCount} className="border border-black text-center font-bold text-[8px]">
                  {ulanganLabel}
                </th>
              )}

              <th rowSpan={isPaSplit ? 3 : 2} className="header-summary border-y border-r border-l-2 border-black text-center align-top text-[7px] font-bold bg-gray-200">
                PTS
              </th>
              <th rowSpan={isPaSplit ? 3 : 2} className="header-summary border-y border-r border-black text-center align-top text-[7px] font-bold bg-gray-200">
                PAS
              </th>
              <th rowSpan={isPaSplit ? 3 : 2} className="header-summary border-y border-r border-black text-center align-top text-[7px] font-bold bg-gray-200">
                NA
              </th>
              <th rowSpan={isPaSplit ? 3 : 2} className="header-summary border border-black text-center align-top text-[8px] font-bold bg-gray-200">
                Predikat
              </th>
            </tr>

            {isPaSplit && (
              /* ── Row 2: Sub-groups (PA-split only) ── */
              <tr className="bg-gray-100 border-b border-black">
                <th colSpan={kdCount} className="border border-black text-center font-bold text-[8px]">
                  Ulangan Harian
                </th>
                <th colSpan={kdCount} className="border border-black text-center font-bold text-[8px]">
                  Tugas / PR
                </th>
              </tr>
            )}

            {/* ── Row 3 (or Row 2 for non-PA): KD labels ── */}
            <tr className="bg-gray-100 border-b border-black">
              {isPaSplit ? (
                <>
                  {kdLabels.map((kd) => (
                    <th key={`u-${kd}`} className="border border-black text-center text-[7px] font-bold">{kd}</th>
                  ))}
                  {kdLabels.map((kd) => (
                    <th key={`t-${kd}`} className="border border-black text-center text-[7px] font-bold">{kd}</th>
                  ))}
                </>
              ) : (
                kdLabels.map((kd) => (
                  <th key={kd} className="border border-black text-center text-[7px] font-bold">{kd}</th>
                ))
              )}
            </tr>
          </thead>

          <tbody>
            {records.map((rec, idx) => (
              <tr key={rec.studentId} className="border-b border-black" style={{ height: "16px" }}>
                {/* NO */}
                <td className="border border-black text-center font-medium text-[8px]">{idx + 1}</td>

                {/* NAMA */}
                <td className="border border-black text-left px-1 font-medium truncate text-[8px]" style={{ maxWidth: "12%" }}>
                  {rec.studentName.toUpperCase()}
                </td>

                {/* KD scores — no colored bg (ink-saver) */}
                {isPaSplit ? (
                  <>
                    {kdLabels.map((_kd, kdIdx) => {
                      const kdNum = kdIdx + 1;
                      const val = rec.ulanganScores[kdNum];
                      return (
                        <td key={`u-${kdNum}`} className="border border-black text-center text-[8px]">
                          {fmtScore(val)}
                        </td>
                      );
                    })}
                    {kdLabels.map((_kd, kdIdx) => {
                      const kdNum = kdIdx + 1;
                      const val = rec.tugasScores[kdNum];
                      return (
                        <td key={`t-${kdNum}`} className="border border-black text-center text-[8px]">
                          {fmtScore(val)}
                        </td>
                      );
                    })}
                  </>
                ) : (
                  kdLabels.map((_kd, kdIdx) => {
                    const kdNum = kdIdx + 1;
                    const val = rec.finalKDScores[kdNum];
                    return (
                      <td key={kdNum} className="border border-black text-center text-[8px]">
                        {fmtScore(val)}
                      </td>
                    );
                  })
                )}

                {/* PTS — border-l-2 separator */}
                <td className="border-y border-r border-l-2 border-black text-center text-[8px] font-bold bg-gray-50">
                  {fmtScore(rec.pts)}
                </td>

                {/* PAS */}
                <td className="border-y border-r border-black text-center text-[8px] font-bold bg-gray-50">
                  {fmtScore(rec.pas)}
                </td>

                {/* NA (Nilai Akhir / Rata-rata) */}
                <td className="border-y border-r border-black text-center text-[8px] font-bold bg-gray-50">
                  {fmtScore(rec.finalScore)}
                </td>

                {/* Predikat — A/B/C/D based on finalScore, "-" if no grades */}
                <td className="border border-black text-center text-[8px] font-semibold">
                  {hasAnyGrade(rec, kdCount, isPaSplit)
                    ? predikat(rec.finalScore)
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Footer/TTD: Dual 2-column signature (FORMAT-3 acuan) ── */}
      {/* Kepala Sekolah (kiri) + Guru Mata Pelajaran (kanan) */}
      <div style={{ marginTop: 10 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
          <span className="signature-place-date text-[9px]">
            {school?.village ?? school?.district ?? "............"}, .................... {yearLabel?.split("/")[0] ?? "........"}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 40 }}>
          {/* Kolom Kiri: Mengetahui, Kepala Sekolah */}
          <div className="signature-block" style={{ width: "180px" }}>
            <div className="signature-role text-[9px]">Mengetahui,</div>
            <div className="signature-role text-[9px] font-bold">Kepala Sekolah</div>
            <div className="signature-space" />
            <div className="signature-name text-[9px] font-bold">{school?.headmasterName ?? "___________________"}</div>
            <div className="signature-nip text-[7px]">NIP. {school?.headmasterNip ?? "........"}</div>
          </div>
          {/* Kolom Kanan: Guru Mata Pelajaran */}
          <div className="signature-block" style={{ width: "180px" }}>
            <div className="signature-role text-[9px] font-bold">Guru Mata Pelajaran</div>
            <div className="signature-space" />
            <div className="signature-name text-[9px] font-bold">{teacherName ?? "___________________"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
