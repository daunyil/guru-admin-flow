/**
 * JurnalMatrix — Rekap Jurnal Mengajar per semester (FORMAT-4).
 *
 * FORMAT-4: Jurnal Agenda Mengajar Guru (Guru Mata Pelajaran)
 * Format referensi: SMPN 8 Bantan — JURNAL AGENDA MENGAJAR GURU
 *   - LANDSCAPE orientasi, A4
 *   - MONOKROM / INK-SAVER grayscale strategy
 *   - 1 row per pertemuan (max 40)
 *   - Columns: NO | HARI/TANGGAL | JAM KE- | MATERI/TUJUAN PEMBELAJARAN | KEGIATAN PEMBELAJARAN | SISWA TIDAK HADIR | KETERANGAN
 *   - Date format: "Senin, 14/07/2025" (with day name)
 *   - JAM KE-: "1 - 2" (startPeriod to endPeriod)
 *   - SISWA TIDAK HADIR: "Andi (S)" — student name + reason code
 *   - KETERANGAN: Tuntas / Dilanjutkan / Tidak Terlaksana
 *   - Metadata: 2 columns (MATA PELAJARAN + KELAS/SEMESTER | NAMA GURU + NIP)
 *   - Dual signature: Kepala Sekolah + Guru Mata Pelajaran (with NIP)
 *
 * DOMAIN-BOUNDARY: Module 1-harian, presentation component only.
 */

import type { JurnalMatrix } from "./hooks/useSemesterAggregator";
import type { SchoolProfile } from "@guru-admin/domain";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/** Format date to "Senin, 14/07/2025" */
function formatDayDate(dateISO: string | null): string {
  if (!dateISO) return "";
  const d = new Date(dateISO);
  const dayName = DAY_NAMES[d.getDay()];
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  return `${dayName}, ${day}/${month}/${year}`;
}

/** Format absent students list: "Andi (S), Budi (I)" or "-" */
function formatAbsentStudents(students: Array<{ name: string; reason: string }>): string {
  if (students.length === 0) return "-";
  return students.map((s) => `${s.name} (${s.reason})`).join(", ");
}

/* ------------------------------------------------------------------ */
/*  Column width definitions — percentage for table-layout:fixed       */
/*  Total: 3 + 8 + 5 + 22 + 28 + 14 + 20 = 100%                     */
/* ------------------------------------------------------------------ */

const COL_NO = "3%";
const COL_TANGGAL = "8%";
const COL_JAM = "5%";
const COL_MATERI = "22%";
const COL_KEGIATAN = "28%";
const COL_TIDAK_HADIR = "14%";
const COL_KET = "20%";

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface JurnalMatrixProps {
  matrix: JurnalMatrix;
  school?: SchoolProfile;
  teacherName?: string;
  teacherNip?: string;
  headmasterName?: string;
  headmasterNip?: string;
  yearLabel?: string;
  classLabel?: string;
  subject?: string;
  semester?: 1 | 2;
}

export function JurnalMatrix({
  matrix,
  school,
  teacherName,
  teacherNip,
  headmasterName,
  headmasterNip,
  yearLabel,
  classLabel,
  subject,
  semester,
}: JurnalMatrixProps) {
  const { rows } = matrix;
  const semesterLabel = semester === 1 ? "1 (Ganjil)" : "2 (Genap)";

  return (
    <div className="document-page document-landscape rekap-landscape-doc" id="rekap-jurnal-doc">

      {/* ── 1. KOP HEADER (CENTER) ── */}
      <div className="text-center mb-2">
        {school?.logo && (
          <img src={school.logo} alt="Logo" className="inline-block mb-1" style={{ maxHeight: 50 }} />
        )}
        <h1 className="text-sm font-bold uppercase tracking-wide">
          JURNAL AGENDA MENGAJAR GURU
        </h1>
        <h2 className="text-xs font-bold uppercase">
          {school?.name ?? "SMP NEGERI 8 BANTAN"}
        </h2>
        <p className="text-[10px] font-bold uppercase">
          TAHUN PELAJARAN {yearLabel ?? ".........."}
        </p>
      </div>

      {/* ── 2. METADATA — 2 KOLOM (kiri: mapel/kelas, kanan: guru/nip) ── */}
      <div className="mb-2 text-[10px] font-bold" style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ lineHeight: 1.6 }}>
          <div>MATA PELAJARAN : <span className="font-normal">{subject ?? ".........."}</span></div>
          <div>KELAS / SEMESTER : <span className="font-normal">{classLabel ?? ".........."} / {semesterLabel}</span></div>
        </div>
        <div style={{ lineHeight: 1.6, textAlign: "right" }}>
          <div>NAMA GURU : <span className="font-normal">{teacherName ?? ".........."}</span></div>
          <div>NIP : <span className="font-normal">{teacherNip ?? ".........."}</span></div>
        </div>
      </div>

      {/* ── 3. TABEL JURNAL (7 KOLOM REFERENSI) ── */}
      <div className="document-table-wrap rekap-table-wrap">
        <table
          className="rekap-matrix-table w-full border-collapse border border-black"
          style={{ tableLayout: "fixed", width: "100%" }}
        >
          {/* ── COLGROUP ── */}
          <colgroup>
            <col style={{ width: COL_NO }} />
            <col style={{ width: COL_TANGGAL }} />
            <col style={{ width: COL_JAM }} />
            <col style={{ width: COL_MATERI }} />
            <col style={{ width: COL_KEGIATAN }} />
            <col style={{ width: COL_TIDAK_HADIR }} />
            <col style={{ width: COL_KET }} />
          </colgroup>

          <thead>
            <tr className="bg-gray-200 border-b border-black">
              <th className="border border-black text-center font-bold text-[7px] py-1">NO.</th>
              <th className="border border-black text-center font-bold text-[7px]">HARI / TANGGAL</th>
              <th className="border border-black text-center font-bold text-[7px]">JAM KE-</th>
              <th className="border border-black text-center font-bold text-[7px]">MATERI / TUJUAN PEMBELAJARAN</th>
              <th className="border border-black text-center font-bold text-[7px]">KEGIATAN PEMBELAJARAN</th>
              <th className="border border-black text-center font-bold text-[7px]">SISWA TIDAK HADIR</th>
              <th className="border border-black text-center font-bold text-[7px]">KETERANGAN</th>
            </tr>
          </thead>

          {/* ── DATA ROWS — 1 row per pertemuan ── */}
          <tbody>
            {rows.map((row) => {
              const isNoJournal = !row.hasJournal;
              const isCancelled = row.realizationStatus === "cancelled";
              const rowClass = isNoJournal
                ? "border-b border-black bg-yellow-50"
                : isCancelled
                ? "border-b border-black bg-red-50"
                : "border-b border-black";

              // KEGIATAN PEMBELAJARAN: prefer actualMaterialTitle, fallback to note
              const kegiatan = row.actualMaterialTitle || row.note || "";

              // JAM KE-: "1 - 2" format
              const endPeriod = row.startPeriod + row.durationJP - 1;
              const jamKe = row.durationJP > 1
                ? `${row.startPeriod} - ${endPeriod}`
                : `${row.startPeriod}`;

              return (
                <tr key={row.sessionId} className={rowClass} style={{ height: "28px" }}>
                  {/* NO */}
                  <td className="border border-black text-center text-[8px] font-medium">
                    {row.meetingNumber}
                  </td>

                  {/* HARI / TANGGAL */}
                  <td className="border border-black text-center text-[8px]">
                    {formatDayDate(row.dateISO)}
                  </td>

                  {/* JAM KE- */}
                  <td className="border border-black text-center text-[8px]">
                    {jamKe}
                  </td>

                  {/* MATERI / TUJUAN PEMBELAJARAN */}
                  <td className="border border-black text-left px-1 text-[8px]" style={{ lineHeight: 1.35 }}>
                    {row.plannedMaterialTitle ?? ""}
                  </td>

                  {/* KEGIATAN PEMBELAJARAN */}
                  <td className="border border-black text-left px-1 text-[8px]" style={{ lineHeight: 1.35 }}>
                    {kegiatan}
                  </td>

                  {/* SISWA TIDAK HADIR */}
                  <td className="border border-black text-center text-[8px]">
                    {formatAbsentStudents(row.absentStudents)}
                  </td>

                  {/* KETERANGAN */}
                  <td className="border border-black text-left px-1 text-[8px]">
                    {row.keterangan ?? ""}
                  </td>
                </tr>
              );
            })}

            {/* ── Empty rows to fill up to 40 (template rows) ── */}
            {rows.length < 40 && Array.from({ length: 40 - rows.length }, (_, i) => (
              <tr key={`empty-${i}`} className="border-b border-black" style={{ height: "28px" }}>
                <td className="border border-black text-center text-[8px]">{rows.length + i + 1}</td>
                <td className="border border-black"></td>
                <td className="border border-black"></td>
                <td className="border border-black"></td>
                <td className="border border-black"></td>
                <td className="border border-black"></td>
                <td className="border border-black"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Dual Signature: Kepala Sekolah + Guru Mata Pelajaran ── */}
      <div style={{ marginTop: 15, display: "flex", justifyContent: "space-between" }}>
        <div className="signature-block" style={{ width: "250px", textAlign: "center" }}>
          <div className="text-[9px]">Mengetahui,</div>
          <div className="text-[9px] font-bold">Kepala {school?.name ?? "SMPN 8 Bantan"}</div>
          <div className="signature-space" />
          <div className="text-[9px] font-bold underline">{headmasterName ?? "........................"}</div>
          <div className="text-[8px]">NIP. {headmasterNip ?? "........................"}</div>
        </div>
        <div className="signature-block" style={{ width: "250px", textAlign: "center" }}>
          <div className="text-[9px]">{school?.village ?? school?.district ?? "............"}, .................... {yearLabel ?? ".........."}</div>
          <div className="text-[9px] font-bold">Guru Mata Pelajaran</div>
          <div className="signature-space" />
          <div className="text-[9px] font-bold underline">{teacherName ?? "........................"}</div>
          <div className="text-[8px]">NIP. {teacherNip ?? "........................"}</div>
        </div>
      </div>
    </div>
  );
}
