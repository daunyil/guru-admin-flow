/**
 * AbsensiBulananMatrix — Landscape matriks absensi 31 kolom tanggal.
 *
 * FORMAT-1: Absensi Kehadiran Bulanan (Wali Kelas & Guru Piket)
 * Format referensi: SMPN 8 Bantan — ABSENSI KEHADIRAN SISWA
 *   - LANDSCAPE orientasi
 *   - MONOKROM / INK-SAVER grayscale (bg-gray-200 header, bg-gray-100 sub, white data)
 *   - Title: CENTER "ABSENSI KEHADIRAN BULANAN SISWA/I SMPN 8 BANTAN"
 *   - Metadata: 2 baris terpisah (KELAS, BULAN)
 *   - Multi-level header: TANGGAL (colspan=31) | REKAP (colspan=4)
 *   - Row 2: 1-31 | S | I | A | JLH (1-letter codes, S/I/A order, uniform)
 *   - NO, NAMA, NISN: rowspan=2
 *   - REKAP columns: border-l-2 separator on kolom S (thick left border dari tanggal)
 *   - Marking: H=Hadir(kosong), S=Sakit, I=Izin, T=Terlambat, A=Alpa (no colored bg)
 *   - Footer: Wali Kelas TTD
 *
 * PRINT-FIX-RC1:
 *   - Changed from Tailwind fixed widths (w-6/w-48) to <colgroup> percentage widths
 *     to ensure table fits within A4 landscape printable area.
 *   - table-layout:fixed + width:100% forces proportional column distribution.
 *   - Date columns use 2.2% each (31×2.2=68.2%), fixed columns wider.
 *
 * DOMAIN-BOUNDARY: Module 1-harian, presentation component only.
 */

import type { MonthlyAttendanceMatrix } from "./hooks/useSemesterAggregator";
import type { SchoolProfile } from "@guru-admin/domain";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function statusMark(status: "present" | "sick" | "excused" | "late" | "absent" | null): string {
  if (status === null) return ""; // No session (weekend/holiday)
  if (status === "present") return ""; // Hadir = kosong (format fisik)
  if (status === "sick") return "S";
  if (status === "excused") return "I";
  if (status === "late") return "T";
  if (status === "absent") return "A";
  return "";
}

/* ------------------------------------------------------------------ */
/*  Column width definitions — percentage for table-layout:fixed       */
/* ------------------------------------------------------------------ */

const COL_NO = "2.5%";
const COL_NAMA = "11%";  /* NAMA — student names */
const COL_NISN = "5.5%";
const COL_DATE = "2.4%";   /* 31 × 2.4% = 74.4% */
const COL_REKAP = "2.5%";  /* S, I, A — 3 × 2.5% = 7.5% */
const COL_JLH = "3.1%";    /* JLH */
/* Total: 2.5+11+5.5+74.4+7.5+3.1 = 100% */

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface AbsensiBulananMatrixProps {
  matrix: MonthlyAttendanceMatrix;
  school?: SchoolProfile;
  teacherName?: string;
  yearLabel?: string;
  classLabel?: string;
  teacherRole?: string; // "Wali Kelas" or "Guru Piket"
}

export function AbsensiBulananMatrix({
  matrix,
  school,
  teacherName,
  yearLabel,
  classLabel,
  teacherRole = "Wali Kelas",
}: AbsensiBulananMatrixProps) {
  const { monthName, year, daysInMonth, students } = matrix;

  return (
    <div className="document-page document-landscape rekap-landscape-doc" id="rekap-absensi-doc">

      {/* ── 1. KOP JUDUL DOKUMEN (CENTER) ── */}
      <div className="text-center mb-2">
        {school?.logo && (
          <img src={school.logo} alt="Logo" className="inline-block mb-1" style={{ maxHeight: 50 }} />
        )}
        <h1 className="text-sm font-bold uppercase tracking-wide">
          ABSENSI KEHADIRAN BULANAN SISWA/I {school?.name ?? "SMP NEGERI 8 BANTAN"}
        </h1>
        <h2 className="text-xs font-bold uppercase">
          TAHUN PELAJARAN {yearLabel ?? year}
        </h2>
      </div>

      {/* ── 2. METADATA 2 BARIS TERPISAH ── */}
      <div className="mb-2 text-[10px] font-bold space-y-0.5">
        <div>KELAS : {classLabel ?? ".........."}</div>
        <div>BULAN : {monthName}</div>
      </div>

      {/* ── 3. TABEL MATRIKS (MONOKROM INK-SAVER) ── */}
      <div className="document-table-wrap rekap-table-wrap">
        <table
          className="rekap-matrix-table w-full border-collapse border border-black"
          style={{ tableLayout: "fixed", width: "100%" }}
        >
          {/* ── COLGROUP: percentage widths for table-layout:fixed ── */}
          <colgroup>
            <col style={{ width: COL_NO }} />
            <col style={{ width: COL_NAMA }} />
            <col style={{ width: COL_NISN }} />
            {Array.from({ length: daysInMonth }, (_, i) => (
              <col key={i + 1} style={{ width: COL_DATE }} />
            ))}
            <col style={{ width: COL_REKAP }} />
            <col style={{ width: COL_REKAP }} />
            <col style={{ width: COL_REKAP }} />
            <col style={{ width: COL_JLH }} />
          </colgroup>

          <thead>
            {/* ── Row 1: Super-header ── */}
            <tr className="bg-gray-200 border-b border-black">
              <th rowSpan={2} className="border border-black text-center align-middle font-bold px-0.5 bg-gray-200 text-[8px]">
                NO.
              </th>
              <th rowSpan={2} className="border border-black text-left px-1 align-middle font-bold text-[9px] bg-gray-200 whitespace-nowrap">
                NAMA
              </th>
              <th rowSpan={2} className="border border-black text-center align-middle font-bold text-[7px] bg-gray-200">
                NISN
              </th>
              <th colSpan={daysInMonth} className="border border-black text-center font-bold text-[8px]">
                TANGGAL
              </th>
              {/* REKAP — border-l-2 separator */}
              <th colSpan={4} className="border-y border-r border-l-2 border-black text-center font-bold text-[8px] bg-gray-200">
                REKAP
              </th>
            </tr>

            {/* ── Row 2: Date columns + rekap ── */}
            <tr className="bg-gray-100 border-b border-black">
              {Array.from({ length: daysInMonth }, (_, i) => (
                <th key={i + 1} className="border border-black text-center text-[7px] font-bold">
                  {i + 1}
                </th>
              ))}
              {/* Rekap columns: 1-letter codes S/I/A/JLH, border-l-2 on S */}
              <th className="border-y border-r border-l-2 border-black text-center text-[7px] font-bold bg-gray-200">S</th>
              <th className="border-y border-r border-black text-center text-[7px] font-bold bg-gray-200">I</th>
              <th className="border-y border-r border-black text-center text-[7px] font-bold bg-gray-200">A</th>
              <th className="border-y border-r border-black text-center text-[7px] font-bold bg-gray-200">JLH</th>
            </tr>
          </thead>

          <tbody>
            {students.map((student, idx) => (
              <tr key={student.studentId} className="border-b border-black" style={{ height: "16px" }}>
                {/* NO */}
                <td className="border border-black text-center font-medium text-[8px]">{idx + 1}</td>

                {/* NAMA */}
                <td className="border border-black text-left px-1 font-medium truncate text-[8px]" style={{ maxWidth: "12%" }}>
                  {student.studentName.toUpperCase()}
                </td>

                {/* NISN */}
                <td className="border border-black text-center text-[7px]">{student.nisn ?? ""}</td>

                {/* Date columns 1..daysInMonth — no colored bg (ink-saver) */}
                {Array.from({ length: daysInMonth }, (_, d) => {
                  const day = d + 1;
                  const status = student.statusByDate[day];
                  return (
                    <td key={day} className="border border-black text-center text-[8px] font-bold">
                      {statusMark(status)}
                    </td>
                  );
                })}

                {/* Rekap columns: S/I/A/JLH — border-l-2 on S */}
                <td className="border-y border-r border-l-2 border-black text-center text-[8px] font-bold bg-gray-50">
                  {student.rekap.sakit > 0 ? student.rekap.sakit : ""}
                </td>
                <td className="border-y border-r border-black text-center text-[8px] font-bold bg-gray-50">
                  {student.rekap.izin > 0 ? student.rekap.izin : ""}
                </td>
                <td className="border-y border-r border-black text-center text-[8px] font-bold bg-gray-50">
                  {student.rekap.alpa > 0 ? student.rekap.alpa : ""}
                </td>
                <td className="border-y border-r border-black text-center text-[8px] font-bold bg-gray-50">
                  {student.rekap.jlh > 0 ? student.rekap.jlh : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Footer/TTD ── */}
      <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
        <div className="signature-block" style={{ width: "180px" }}>
          <div className="signature-place-date text-[9px]">
            {school?.village ?? school?.district ?? "............"}, .................... {year}
          </div>
          <div className="signature-role text-[9px]">{teacherRole}</div>
          <div className="signature-space" />
          <div className="signature-name text-[9px]">{teacherName ?? "___________________"}</div>
        </div>
      </div>
    </div>
  );
}
