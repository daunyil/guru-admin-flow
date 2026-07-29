/**
 * JurnalMatrix — Rekap Jurnal Mengajar per semester (FORMAT-4).
 *
 * FORMAT-4: Jurnal Mengajar (Guru Mata Pelajaran)
 * Format referensi: SMPN 8 Bantan — JURNAL MENGAJAR
 *   - LANDSCAPE orientasi
 *   - MONOKROM / INK-SAVER grayscale strategy
 *   - 1 row per pertemuan (max 40)
 *   - Columns: No | Tanggal | JP | Materi Rencana | Materi Aktual | Realisasi | H | S | I | A | T | Jlh | Catatan | Tindak Lanjut
 *   - Footer: Guru Bidang Studi TTD
 *
 * DOMAIN-BOUNDARY: Module 1-harian, presentation component only.
 */

import type { JurnalMatrix } from "./hooks/useSemesterAggregator";
import type { SchoolProfile } from "@guru-admin/domain";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Format date to DD/MM. */
function formatShortDate(dateISO: string | null): string {
  if (!dateISO) return "";
  const d = new Date(dateISO);
  const day = d.getDate();
  const month = d.getMonth() + 1;
  return `${day}/${month}`;
}

/** Realization status label. */
function realizationLabel(status: "done" | "continued" | "cancelled" | null): string {
  if (status === "done") return "Selesai";
  if (status === "continued") return "Dilanjutkan";
  if (status === "cancelled") return "Tidak Terlaksana";
  return "—";
}

/** Realization status badge color. */
function realizationBg(status: "done" | "continued" | "cancelled" | null): string {
  if (status === "done") return "bg-green-100 text-green-800";
  if (status === "continued") return "bg-yellow-100 text-yellow-800";
  if (status === "cancelled") return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-500";
}

/* ------------------------------------------------------------------ */
/*  Column width definitions                                           */
/*  Total: 3 + 5 + 2.5 + 12 + 12 + 6 + 2.5×5 + 3 + 12 + 12 ≈ 100% */
/* ------------------------------------------------------------------ */

const COL_NO = "3%";
const COL_TANGGAL = "5%";
const COL_JP = "2.5%";
const COL_MATERI_RENCANA = "12%";
const COL_MATERI_AKTUAL = "12%";
const COL_REALISASI = "6%";
const COL_KEHADIRAN = "2.5%"; /* H, S, I, A, T — 5 × 2.5% = 12.5% */
const COL_JLH = "3%";
const COL_CATATAN = "12%";
const COL_TINDAK_LANJUT = "12%";

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface JurnalMatrixProps {
  matrix: JurnalMatrix;
  school?: SchoolProfile;
  teacherName?: string;
  yearLabel?: string;
  classLabel?: string;
  subject?: string;
  semester?: 1 | 2;
}

export function JurnalMatrix({
  matrix,
  school,
  teacherName,
  yearLabel,
  classLabel,
  subject,
  semester,
}: JurnalMatrixProps) {
  const { rows } = matrix;
  const semesterLabel = semester === 1 ? "Ganjil" : "Genap";

  return (
    <div className="document-page document-landscape rekap-landscape-doc" id="rekap-jurnal-doc">

      {/* ── 1. KOP JUDUL DOKUMEN (CENTER) ── */}
      <div className="text-center mb-2">
        {school?.logo && (
          <img src={school.logo} alt="Logo" className="inline-block mb-1" style={{ maxHeight: 50 }} />
        )}
        <h1 className="text-sm font-bold uppercase tracking-wide">
          JURNAL MENGAJAR {school?.name ?? "SMP NEGERI 8 BANTAN"}
        </h1>
        <h2 className="text-xs font-bold uppercase">
          TAHUN PELAJARAN {yearLabel ?? ".........."}
        </h2>
      </div>

      {/* ── 2. METADATA 2 BARIS TERPISAH ── */}
      <div className="mb-2 text-[10px] font-bold space-y-0.5">
        <div>MATA PELAJARAN : {subject ?? ".........."}</div>
        <div>KELAS/SEMESTER : {classLabel ?? ".........."}/{semesterLabel ?? ".........."}</div>
      </div>

      {/* ── 3. TABEL JURNAL (MONOKROM / INK-SAVER) ── */}
      <div className="document-table-wrap rekap-table-wrap">
        <table
          className="rekap-matrix-table w-full border-collapse border border-black"
          style={{ tableLayout: "fixed", width: "100%" }}
        >
          {/* ── COLGROUP ── */}
          <colgroup>
            <col style={{ width: COL_NO }} />
            <col style={{ width: COL_TANGGAL }} />
            <col style={{ width: COL_JP }} />
            <col style={{ width: COL_MATERI_RENCANA }} />
            <col style={{ width: COL_MATERI_AKTUAL }} />
            <col style={{ width: COL_REALISASI }} />
            <col style={{ width: COL_KEHADIRAN }} />
            <col style={{ width: COL_KEHADIRAN }} />
            <col style={{ width: COL_KEHADIRAN }} />
            <col style={{ width: COL_KEHADIRAN }} />
            <col style={{ width: COL_KEHADIRAN }} />
            <col style={{ width: COL_JLH }} />
            <col style={{ width: COL_CATATAN }} />
            <col style={{ width: COL_TINDAK_LANJUT }} />
          </colgroup>

          <thead>
            {/* ── Single-row header ── */}
            <tr className="bg-gray-200 border-b border-black">
              <th className="border border-black text-center font-bold text-[7px] py-1">NO.</th>
              <th className="border border-black text-center font-bold text-[7px]">Tanggal</th>
              <th className="border border-black text-center font-bold text-[7px]">JP</th>
              <th className="border border-black text-center font-bold text-[7px]">Materi Rencana</th>
              <th className="border border-black text-center font-bold text-[7px]">Materi Aktual</th>
              <th className="border border-black text-center font-bold text-[7px]">Realisasi</th>
              <th className="border border-black text-center font-bold text-[7px]">H</th>
              <th className="border border-black text-center font-bold text-[7px]">S</th>
              <th className="border border-black text-center font-bold text-[7px]">I</th>
              <th className="border border-black text-center font-bold text-[7px]">A</th>
              <th className="border border-black text-center font-bold text-[7px]">T</th>
              <th className="border border-black text-center font-bold text-[7px]">Jlh</th>
              <th className="border border-black text-center font-bold text-[7px]">Catatan</th>
              <th className="border border-black text-center font-bold text-[7px]">Tindak Lanjut</th>
            </tr>
          </thead>

          {/* ── DATA ROWS — 1 row per pertemuan ── */}
          <tbody>
            {rows.map((row) => {
              const isNoJournal = !row.hasJournal;
              const rowClass = isNoJournal
                ? "border-b border-black bg-yellow-50"
                : row.realizationStatus === "cancelled"
                ? "border-b border-black bg-red-50"
                : "border-b border-black";

              return (
                <tr key={row.sessionId} className={rowClass} style={{ height: "22px" }}>
                  {/* NO */}
                  <td className="border border-black text-center text-[8px] font-medium">
                    {row.meetingNumber}
                  </td>

                  {/* Tanggal */}
                  <td className="border border-black text-center text-[8px]">
                    {formatShortDate(row.dateISO)}
                  </td>

                  {/* JP */}
                  <td className="border border-black text-center text-[8px] font-bold">
                    {row.durationJP}
                  </td>

                  {/* Materi Rencana */}
                  <td className="border border-black text-left px-1 text-[8px] truncate">
                    {row.plannedMaterialTitle ?? "—"}
                  </td>

                  {/* Materi Aktual */}
                  <td className="border border-black text-left px-1 text-[8px] truncate">
                    {row.actualMaterialTitle ?? "—"}
                  </td>

                  {/* Realisasi */}
                  <td className="border border-black text-center text-[7px]">
                    <span className={`inline-block px-1 rounded text-[6px] font-bold ${realizationBg(row.realizationStatus)}`}>
                      {realizationLabel(row.realizationStatus)}
                    </span>
                  </td>

                  {/* Kehadiran: H, S, I, A, T */}
                  <td className="border border-black text-center text-[8px] font-bold">
                    {row.presentCount > 0 ? row.presentCount : ""}
                  </td>
                  <td className="border border-black text-center text-[8px] font-bold">
                    {row.sickCount > 0 ? row.sickCount : ""}
                  </td>
                  <td className="border border-black text-center text-[8px] font-bold">
                    {row.excusedCount > 0 ? row.excusedCount : ""}
                  </td>
                  <td className="border border-black text-center text-[8px] font-bold">
                    {row.absentCount > 0 ? row.absentCount : ""}
                  </td>
                  <td className="border border-black text-center text-[8px] font-bold">
                    {row.lateCount > 0 ? row.lateCount : ""}
                  </td>

                  {/* Jlh */}
                  <td className="border border-black text-center text-[8px] font-bold bg-gray-50">
                    {row.totalStudents > 0 ? row.totalStudents : ""}
                  </td>

                  {/* Catatan */}
                  <td className="border border-black text-left px-1 text-[8px] truncate">
                    {row.note ?? ""}
                  </td>

                  {/* Tindak Lanjut */}
                  <td className="border border-black text-left px-1 text-[8px] truncate">
                    {row.followUp ?? ""}
                  </td>
                </tr>
              );
            })}

            {/* ── REKAP BARIS ── */}
            {rows.length > 0 && (
              <tr className="bg-gray-200 border-b border-black font-bold" style={{ height: "20px" }}>
                <td colSpan={2} className="border border-black text-center text-[8px]">JUMLAH</td>
                <td className="border border-black text-center text-[8px]">
                  {rows.reduce((sum, r) => sum + r.durationJP, 0)}
                </td>
                <td colSpan={3} className="border border-black text-center text-[8px]"></td>
                <td className="border border-black text-center text-[8px]">
                  {rows.reduce((sum, r) => sum + r.presentCount, 0) || ""}
                </td>
                <td className="border border-black text-center text-[8px]">
                  {rows.reduce((sum, r) => sum + r.sickCount, 0) || ""}
                </td>
                <td className="border border-black text-center text-[8px]">
                  {rows.reduce((sum, r) => sum + r.excusedCount, 0) || ""}
                </td>
                <td className="border border-black text-center text-[8px]">
                  {rows.reduce((sum, r) => sum + r.absentCount, 0) || ""}
                </td>
                <td className="border border-black text-center text-[8px]">
                  {rows.reduce((sum, r) => sum + r.lateCount, 0) || ""}
                </td>
                <td className="border border-black text-center text-[8px]">
                  {rows.reduce((sum, r) => sum + r.totalStudents, 0) || ""}
                </td>
                <td colSpan={2} className="border border-black text-center text-[8px]"></td>
              </tr>
            )}

            {/* ── STATUS REKAP ── */}
            {rows.length > 0 && (
              <tr className="bg-gray-100 border-b border-black text-[8px]" style={{ height: "20px" }}>
                <td colSpan={6} className="border border-black text-left px-1 font-bold">
                  Realisasi: {rows.filter((r) => r.realizationStatus === "done").length} Selesai / {rows.filter((r) => r.realizationStatus === "continued").length} Dilanjutkan / {rows.filter((r) => r.realizationStatus === "cancelled").length} Tidak Terlaksana / {rows.filter((r) => !r.hasJournal).length} Belum Jurnal
                </td>
                <td colSpan={8} className="border border-black text-left px-1 font-bold">
                  Jurnal: {rows.filter((r) => r.journalStatus === "final").length} Final / {rows.filter((r) => r.journalStatus === "draft").length} Draft / {rows.filter((r) => !r.hasJournal).length} Belum
                </td>
              </tr>
            )}
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
