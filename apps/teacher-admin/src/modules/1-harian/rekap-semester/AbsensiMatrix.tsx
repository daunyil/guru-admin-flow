/**
 * AbsensiMatrix — Landscape matriks absensi 31 kolom tanggal.
 *
 * Format referensi: SMPN 8 Bantan — ABSENSI KEHADIRAN SISWA
 *   - LANDSCAPE orientasi
 *   - Multi-level header: TANGGAL (colspan=31) | KETERANGAN (colspan=4)
 *   - Row 2: 1-31 | ALPA SAKIT IZIN JLH
 *   - NO, NAMA, NISN: rowspan=2
 *   - Marking: H=Hadir(kosong), S=Sakit, I=Izin, T=Terlambat, A=Alpa
 *   - Footer: Wali Kelas TTD
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

function statusColorClass(status: "present" | "sick" | "excused" | "late" | "absent" | null): string {
  if (status === null) return ""; // no session — gray bg
  if (status === "present") return ""; // no highlight
  if (status === "sick") return "bg-blue-100 text-blue-700";
  if (status === "excused") return "bg-amber-50 text-amber-700";
  if (status === "late") return "bg-orange-50 text-orange-700";
  if (status === "absent") return "bg-rose-50 text-rose-700";
  return "";
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface AbsensiMatrixProps {
  matrix: MonthlyAttendanceMatrix;
  school?: SchoolProfile;
  teacherName?: string;
  yearLabel?: string;
  teacherRole?: string; // "Wali Kelas" or "Guru Bidang Studi"
}

export function AbsensiMatrix({
  matrix,
  school,
  teacherName,
  yearLabel,
  teacherRole = "Wali Kelas",
}: AbsensiMatrixProps) {
  const { monthName, year, daysInMonth, students } = matrix;

  return (
    <div className="document-page document-landscape" id="rekap-absensi-doc">
      {/* --- Kop Surat --- */}
      <div className="document-header with-border" style={{ marginBottom: 10 }}>
        {school?.logo && (
          <div className="document-logo-box">
            <img src={school.logo} alt="Logo" className="document-logo" />
          </div>
        )}
        <div className="document-title-block">
          <div className="document-title" style={{ fontSize: "12pt", textTransform: "uppercase" }}>
            ABSENSI KEHADIRAN SISWA/I {school?.name ?? "SMP NEGERI 8 BANTAN"}
          </div>
          <div style={{ fontSize: "10pt", fontWeight: 700, textAlign: "center" }}>
            TAHUN PELAJARAN {yearLabel ?? year}
          </div>
          <div style={{ fontSize: "10pt", marginTop: 4, display: "flex", gap: 24 }}>
            <span style={{ fontWeight: 700 }}>KELAS : {matrix.students[0]?.studentName ? "" : ""}</span>
            <span style={{ fontWeight: 700 }}>BULAN : {monthName}</span>
          </div>
        </div>
      </div>

      {/* --- Matriks Tabel --- */}
      <div className="document-table-wrap">
        <table className="document-table document-table-compact">
          <thead>
            {/* Row 1: Super-header */}
            <tr>
              <th rowSpan={2} style={{ width: "30px", minWidth: 30 }}>NO.</th>
              <th rowSpan={2} style={{ width: "140px", minWidth: 100 }}>NAMA</th>
              <th rowSpan={2} style={{ width: "70px", minWidth: 50 }}>NISN</th>
              <th colSpan={daysInMonth} style={{ fontSize: "8pt" }}>TANGGAL</th>
              <th colSpan={4} style={{ fontSize: "8pt" }}>KETERANGAN</th>
            </tr>
            {/* Row 2: Date columns + rekap */}
            <tr>
              {Array.from({ length: daysInMonth }, (_, i) => (
                <th key={i + 1} style={{ width: "22px", minWidth: 18, fontSize: "7pt" }}>{i + 1}</th>
              ))}
              <th style={{ fontSize: "7pt" }}>ALPA</th>
              <th style={{ fontSize: "7pt" }}>SAKIT</th>
              <th style={{ fontSize: "7pt" }}>IZIN</th>
              <th style={{ fontSize: "7pt" }}>JLH</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, idx) => (
              <tr key={student.studentId}>
                <td>{idx + 1}</td>
                <td className="text-left" style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                  {student.studentName.toUpperCase()}
                </td>
                <td style={{ fontSize: "7pt" }}>{student.nisn ?? ""}</td>
                {/* Date columns 1..daysInMonth */}
                {Array.from({ length: daysInMonth }, (_, d) => {
                  const day = d + 1;
                  const status = student.statusByDate[day];
                  const isNoSession = status === null;
                  return (
                    <td
                      key={day}
                      className={statusColorClass(status)}
                      style={{
                        fontSize: "7pt",
                        backgroundColor: isNoSession ? "#f9fafb" : undefined,
                        color: isNoSession ? "#9ca3af" : undefined,
                      }}
                    >
                      {statusMark(status)}
                    </td>
                  );
                })}
                {/* Rekap columns */}
                <td style={{ fontWeight: 700, fontSize: "8pt" }}>{student.rekap.alpa}</td>
                <td style={{ fontWeight: 700, fontSize: "8pt" }}>{student.rekap.sakit}</td>
                <td style={{ fontWeight: 700, fontSize: "8pt" }}>{student.rekap.izin}</td>
                <td style={{ fontWeight: 700, fontSize: "8pt" }}>{student.rekap.jlh}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- Footer/TTD --- */}
      <div className="signature-grid" style={{ marginTop: 16, gap: 48 }}>
        <div className="signature-block">
          <div className="signature-place-date">
            {school?.village ?? school?.district ?? "............"}, {year}
          </div>
          <div className="signature-role">{teacherRole}</div>
          <div className="signature-space" />
          <div className="signature-name">{teacherName ?? "___________________"}</div>
        </div>
      </div>
    </div>
  );
}
