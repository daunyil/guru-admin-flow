/**
 * TatapMukaMatrix — Landscape matriks Daftar Hadir Tatap Muka (1–40 Pertemuan).
 *
 * FORMAT-2: Daftar Hadir Tatap Muka (Guru Mata Pelajaran)
 * Format referensi: SMPN 8 Bantan — DAFTAR HADIR TATAP MUKA SISWA
 *   - LANDSCAPE orientasi
 *   - MONOKROM / INK-SAVER grayscale strategy:
 *     bg-gray-200 (header utama), bg-gray-100 (sub-header), white (data siswa)
 *     Kolom rekap S/I/A: border-l-2 separator dari pertemuan #40
 *   - Title: CENTER "DAFTAR HADIR TATAP MUKA SISWA/I SMPN 8 BANTAN"
 *   - Metadata: 2 baris terpisah (MATA PELAJARAN, KELAS/SEMESTER)
 *   - 4-row header (NAMA = 1 row, tanggal rowSpan=2):
 *     Row 1: NO(rs4) | "Pertemuan" | 1–40 | S(rs4) | I(rs4) | A(rs4) | Ket.(rs4)
 *     Row 2: (NO merged) | "Jumlah Jam" | 40 JP values | (S/I/A/Ket merged)
 *     Row 3: (NO merged) | "Tanggal Mengajar" | 40 vertical dates (rowSpan=2) | (S/I/A/Ket merged)
 *     Row 4: (NO merged) | "NAMA" | (date cells continue via rowSpan=2) | (S/I/A/Ket merged)
 *   - Body: NO | NAMA | 40 attendance | S | I | A | Ket
 *   - Rekap S/I/A: auto-counted from attendanceByStudent
 *   - Ket: auto-computed (Tuntas if attendance >= threshold%, Belum Tuntas if < threshold%, "-" if 0 meetings)
 *     Default threshold: 75% (configurable via attendanceThreshold prop, diset oleh dewan sekolah)
 *   - PTS/PAS removed — belongs in FORMAT-3 NilaiMatrix
 *   - Footer: Guru Bidang Studi TTD
 *
 * HEADER-REF-FIX-v2:
 *   - Sesuai format referensi SMPN 8 Bantan — 4-row header:
 *     Kolom NAMA berisi 4 sel vertikal (masing-masing 1 row):
 *     Row 1: "Pertemuan", Row 2: "Jumlah Jam", Row 3: "Tanggal Mengajar", Row 4: "NAMA"
 *   - NAMA = 1 row di baris ke-4.
 *   - Tanggal vertikal di Row 3 pakai rowSpan=2 agar turun ke Row 4
 *     (sebelah NAMA adalah bagian dari vertical date, bukan kosong).
 *   - NO. rowSpan=4, S/I/A/Ket rowSpan=4.
 *
 * PRINT-FIX-RC1:
 *   - Changed from Tailwind fixed widths to <colgroup> percentage widths
 *     for A4 landscape printable area.
 *   - table-layout:fixed + width:100% forces browser to distribute columns proportionally.
 *
 * DOMAIN-BOUNDARY: Module 1-harian, presentation component only.
 */

import type { TatapMukaAttendanceMatrix } from "./hooks/useSemesterAggregator";
import type { SchoolProfile } from "@guru-admin/domain";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Attendance mark: Hadir=blank, Sakit=S, Izin=I, Terlambat=T, Alpa=A */
function statusMark(status: "present" | "sick" | "excused" | "late" | "absent" | null): string {
  if (status === null) return "";
  if (status === "present") return "";
  if (status === "sick") return "S";
  if (status === "excused") return "I";
  if (status === "late") return "T";
  if (status === "absent") return "A";
  return "";
}

/** Format date to DD/MM (tanpa tahun, karena tahun ada di kop surat). */
function formatShortDate(dateISO: string | null): string {
  if (!dateISO) return "";
  const d = new Date(dateISO);
  const day = d.getDate();
  const month = d.getMonth() + 1;
  return `${day}/${month}`;
}

/**
 * Hitung jumlah kehadiran dengan status tertentu (Sakit/Izin/Alpa)
 * dari data attendanceByStudent di seluruh pertemuan.
 */
function countStatus(
  meetings: TatapMukaAttendanceMatrix["meetings"],
  studentId: string,
  targetStatus: "sick" | "excused" | "absent" | "present" | "late"
): number {
  let count = 0;
  for (const meeting of meetings) {
    const status = meeting.attendanceByStudent[studentId];
    if (status === targetStatus) count++;
  }
  return count;
}

/** Ket. otomatis: Tuntas jika kehadiran >= threshold%, Belum Tuntas jika < threshold%.
 *  Default threshold 75% (0.75), bisa diatur via attendanceThreshold prop.
 *  Threshold diset oleh dewan sekolah sesuai kebijakan masing-masing. */
function attendanceKet(
  meetings: TatapMukaAttendanceMatrix["meetings"],
  studentId: string,
  threshold: number = 0.75
): string {
  const total = meetings.length;
  if (total === 0) return "-";
  const hadir = countStatus(meetings, studentId, "present") + countStatus(meetings, studentId, "late");
  const pct = hadir / total;
  return pct >= threshold ? "Tuntas" : "Belum Tuntas";
}

/* ------------------------------------------------------------------ */
/*  Column width definitions — percentage for table-layout:fixed       */
/*  HEADER-REF-FIX: No ROW_LABEL column. NAMA column wider.           */
/*  Total: 2.5 + 11 + 75 + 7.5 + 4 = 100%                           */
/* ------------------------------------------------------------------ */

const COL_NO = "2.5%";
const COL_NAMA = "11%";        /* "Jumlah Jam" / "Tanggal" / "NAMA" / student name */
const COL_MEETING = "1.875%";  /* 40 × 1.875% = 75% */
const COL_REKAP = "2.5%";     /* S, I, A each — 3 × 2.5% = 7.5% */
const COL_KET = "4%";          /* Total: 2.5 + 11 + 75 + 7.5 + 4 = 100% */

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface TatapMukaMatrixProps {
  matrix: TatapMukaAttendanceMatrix;
  school?: SchoolProfile;
  teacherName?: string;
  yearLabel?: string;
  classLabel?: string;
  subject?: string;
  semester?: 1 | 2;
  /** Threshold kehadiran untuk Ket. column. Default 0.75 (75%).
   *  Bisa diatur oleh dewan sekolah — misal 0.80 (80%), 0.70 (70%), dll. */
  attendanceThreshold?: number;
}

export function TatapMukaMatrix({
  matrix,
  school,
  teacherName,
  yearLabel,
  classLabel,
  subject,
  semester,
  attendanceThreshold = 0.75,
}: TatapMukaMatrixProps) {
  const { meetings, students } = matrix;
  const maxMeetings = 40;

  return (
    <div className="document-page document-landscape rekap-landscape-doc" id="rekap-tatapmuka-doc">

      {/* ── 1. KOP JUDUL DOKUMEN (CENTER) ── */}
      <div className="text-center mb-2">
        {school?.logo && (
          <img src={school.logo} alt="Logo" className="inline-block mb-1" style={{ maxHeight: 50 }} />
        )}
        <h1 className="text-sm font-bold uppercase tracking-wide">
          DAFTAR HADIR TATAP MUKA SISWA/I {school?.name ?? "SMP NEGERI 8 BANTAN"}
        </h1>
        <h2 className="text-xs font-bold uppercase">
          TAHUN PELAJARAN {yearLabel ?? ".........."}
        </h2>
      </div>

      {/* ── 2. METADATA 2 BARIS TERPISAH ── */}
      <div className="mb-2 text-[10px] font-bold space-y-0.5">
        <div>MATA PELAJARAN : {subject ?? ".........."}</div>
        <div>KELAS/SEMESTER : {classLabel ?? ".........."}/{semester ?? ".........."}</div>
      </div>

      {/* ── 3. TABEL MATRIKS (MONOKROM / INK-SAVER) ── */}
      <div className="document-table-wrap rekap-table-wrap">
        <table
          className="rekap-matrix-table w-full border-collapse border border-black"
          style={{ tableLayout: "fixed", width: "100%" }}
        >
          {/* ── COLGROUP: percentage widths for table-layout:fixed ── */}
          <colgroup>
            <col style={{ width: COL_NO }} />
            <col style={{ width: COL_NAMA }} />
            {Array.from({ length: maxMeetings }, (_, i) => (
              <col key={i} style={{ width: COL_MEETING }} />
            ))}
            <col style={{ width: COL_REKAP }} />
            <col style={{ width: COL_REKAP }} />
            <col style={{ width: COL_REKAP }} />
            <col style={{ width: COL_KET }} />
          </colgroup>

          <thead>
            {/* ── BARIS 1: "Pertemuan" + angka 1-40 — bg-gray-200 ── */}
            {/* HEADER-REF-FIX-v2: 4-row header.
                Row 1: "Pertemuan", Row 2: "Jumlah Jam", Row 3: "Tanggal Mengajar" (dates rs2), Row 4: "NAMA" */}
            <tr className="bg-gray-200 border-b border-black">
              <th rowSpan={4} className="border border-black text-center align-middle font-bold px-0.5 bg-gray-200 text-[8px]">
                NO.
              </th>
              <th className="border border-black text-left px-1 font-bold py-0.5 text-[7px]">
                Pertemuan
              </th>

              {/* 40 Kolom Pertemuan — angka 1-40 */}
              {Array.from({ length: maxMeetings }, (_, i) => (
                <th key={i} className="border border-black text-center text-[7px] font-bold">
                  {i + 1}
                </th>
              ))}

              {/* Kolom Rekapitulasi — batas garis kiri tebal (border-l-2) */}
              <th rowSpan={4} className="border-y border-r border-l-2 border-black text-center align-middle text-[7px] font-bold bg-gray-200">
                S
              </th>
              <th rowSpan={4} className="border-y border-r border-black text-center align-middle text-[7px] font-bold bg-gray-200">
                I
              </th>
              <th rowSpan={4} className="border-y border-r border-black text-center align-middle text-[7px] font-bold bg-gray-200">
                A
              </th>
              <th rowSpan={4} className="border border-black text-center align-middle text-[7px] font-bold bg-gray-200">
                Ket.
              </th>
            </tr>

            {/* ── BARIS 2: "Jumlah Jam" + 40 JP values — bg-gray-100 ── */}
            <tr className="bg-gray-100 border-b border-black">
              <th className="border border-black text-left px-1 font-bold py-0.5 text-[7px]">
                Jumlah Jam
              </th>

              {Array.from({ length: maxMeetings }, (_, i) => {
                const meeting = meetings.find((mt) => mt.meetingNumber === i + 1);
                return (
                  <th key={i} className="border border-black text-center text-[7px] font-normal">
                    {meeting ? meeting.durationJP : ""}
                  </th>
                );
              })}
            </tr>

            {/* ── BARIS 3: "Tanggal Mengajar" + 40 vertical dates (rowSpan=2) — bg-gray-100 ── */}
            <tr className="bg-gray-100 border-b border-black" style={{ height: "40px" }}>
              <th className="border border-black text-left px-1 align-middle font-bold text-[7px]">
                Tanggal<br/>Mengajar
              </th>

              {Array.from({ length: maxMeetings }, (_, i) => {
                const meeting = meetings.find((mt) => mt.meetingNumber === i + 1);
                const dateStr = meeting ? formatShortDate(meeting.dateISO) : "";
                return (
                  <th key={i} rowSpan={2} className="border border-black text-center align-middle p-0 bg-gray-100">
                    {dateStr ? (
                      <div className="[writing-mode:vertical-rl] rotate-180 text-[6px] font-mono leading-none mx-auto whitespace-nowrap">
                        {dateStr}
                      </div>
                    ) : ""}
                  </th>
                );
              })}
            </tr>

            {/* ── BARIS 4: "NAMA" — sebelahnya date cells lanjut dari rowSpan=2 ── */}
            <tr className="bg-gray-100 border-b border-black">
              <th className="border border-black text-left px-1 align-middle font-bold text-[7px]">
                NAMA
              </th>
              {/* 40 date cells sudah di-cover oleh rowSpan=2 dari Row 3,
                  jadi tidak perlu render cell di sini */}
            </tr>
          </thead>

          {/* ── BARIS DATA SISWA — WHITE/CLEAN (ink-saver) ── */}
          <tbody>
            {students.map((student, idx) => {
              const sakitCount = countStatus(meetings, student.studentId, "sick");
              const izinCount = countStatus(meetings, student.studentId, "excused");
              const alpaCount = countStatus(meetings, student.studentId, "absent");

              return (
                <tr key={student.studentId} className="border-b border-black" style={{ height: "16px" }}>
                  <td className="border border-black text-center font-medium text-[8px]">{idx + 1}</td>

                  <td className="border border-black text-left px-1 font-medium truncate text-[8px]" style={{ maxWidth: COL_NAMA }}>
                    {student.studentName.toUpperCase()}
                  </td>

                  {/* 40 Kolom Absensi H/S/I/A/T — no colored bg (ink-saver) */}
                  {Array.from({ length: maxMeetings }, (_, m) => {
                    const meetingNum = m + 1;
                    const meeting = meetings.find((mt) => mt.meetingNumber === meetingNum);
                    const status = meeting?.attendanceByStudent[student.studentId] ?? null;
                    return (
                      <td key={meetingNum} className="border border-black text-center text-[8px] font-bold">
                        {statusMark(status)}
                      </td>
                    );
                  })}

                  {/* Kolom Rekapitulasi S, I, A — border-l-2 separator + bg-gray-50 */}
                  <td className="border-y border-r border-l-2 border-black text-center text-[8px] font-bold bg-gray-50">
                    {sakitCount > 0 ? sakitCount : ""}
                  </td>
                  <td className="border-y border-r border-black text-center text-[8px] font-bold bg-gray-50">
                    {izinCount > 0 ? izinCount : ""}
                  </td>
                  <td className="border-y border-r border-black text-center text-[8px] font-bold bg-gray-50">
                    {alpaCount > 0 ? alpaCount : ""}
                  </td>

                  {/* Ket. — auto-computed: Tuntas if attendance >= threshold%, else Belum Tuntas */}
                  <td className="border border-black text-center text-[7px] font-semibold">
                    {attendanceKet(meetings, student.studentId, attendanceThreshold)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Footer/TTD: Guru Bidang Studi ── */}
      <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
        <div className="signature-block" style={{ width: "180px" }}>
          <div className="signature-place-date text-[9px]">
            {school?.village ?? school?.district ?? "............"}, .................... {yearLabel ?? ".........."}
          </div>
          <div className="signature-role text-[9px]">Guru Bidang Studi</div>
          <div className="signature-space" />
          <div className="signature-name text-[9px]">{teacherName ?? "___________________"}</div>
        </div>
      </div>
    </div>
  );
}
