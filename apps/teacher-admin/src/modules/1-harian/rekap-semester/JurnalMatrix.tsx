/**
 * JurnalMatrix — Rekap Jurnal Mengajar per semester (FORMAT-4).
 *
 * FORMAT-4: Jurnal Agenda Mengajar Guru (Guru Mata Pelajaran)
 * Format referensi: SMPN 8 Bantan — JURNAL AGENDA MENGAJAR GURU
 *   - PORTRAIT orientasi, A4
 *   - 7 columns: NO | HARI/TANGGAL | JAM KE- | MATERI/TUJUAN PEMBELAJARAN | KEGIATAN PEMBELAJARAN | SISWA TIDAK HADIR | KETERANGAN
 *   - KOP: "JURNAL AGENDA MENGAJAR GURU" / school name / year
 *   - Metadata 2-column: MATA PELAJARAN + KELAS/SEMESTER (left) | NAMA GURU + NIP (right)
 *   - Date format: "Senin, 14/07/2025" (with day name)
 *   - JAM KE-: "1 - 2" (startPeriod to endPeriod)
 *   - SISWA TIDAK HADIR: "Andi (S)" — student name + reason code
 *   - KETERANGAN: Tuntas / Dilanjutkan / Tidak Terlaksana
 *   - Dual signature: Kepala Sekolah (left) + Guru Mata Pelajaran (right)
 *   - Empty template rows (rows 4–6 empty for manual fill)
 *   - Print: portrait A4, font 9pt screen / 8.5pt print
 *   - table-layout: fixed, border-collapse: collapse, td vertical-align: top
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
/*  NO & JAM KE- lebih lapang agar tidak terjepit                     */
/*  Normalized: 4.5% + 12% + 7.5% + 25% + 30% + 10% + 11% = 100%     */
/* ------------------------------------------------------------------ */

const COL_NO = "4.5%";
const COL_TANGGAL = "12%";
const COL_JAM = "7.5%";
const COL_MATERI = "25%";
const COL_KEGIATAN = "30%";
const COL_TIDAK_HADIR = "10%";
const COL_KET = "11%";

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
    <div className="document-page document-portrait rekap-jurnal-doc" id="rekap-jurnal-doc">

      {/* ── 1. KOP HEADER (CENTER) ── */}
      <div className="jurnal-kop-header">
        <h1 className="jurnal-kop-title">JURNAL AGENDA MENGAJAR GURU</h1>
        <h2 className="jurnal-kop-school">{school?.name ?? "SMP NEGERI 8 BANTAN"}</h2>
        <p className="jurnal-kop-year">TAHUN PELAJARAN {yearLabel ?? ".........."}</p>
      </div>

      {/* ── 2. METADATA — 2 KOLOM (kiri: mapel/kelas, kanan: guru/nip) ── */}
      <div className="jurnal-metadata-grid">
        <div className="jurnal-metadata-column">
          <div>MATA PELAJARAN : <span className="jurnal-metadata-value">{subject ?? ".........."}</span></div>
          <div>KELAS / SEMESTER : <span className="jurnal-metadata-value">{classLabel ?? ".........."} / {semesterLabel}</span></div>
        </div>
        <div className="jurnal-metadata-column" style={{ textAlign: "right" }}>
          <div>NAMA GURU : <span className="jurnal-metadata-value">{teacherName ?? ".........."}</span></div>
          <div>NIP : <span className="jurnal-metadata-value">{teacherNip ?? ".........."}</span></div>
        </div>
      </div>

      {/* ── 3. TABEL JURNAL (7 KOLOM) ── */}
      <table className="jurnal-table">
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
          <tr>
            <th>NO.</th>
            <th>HARI / TANGGAL</th>
            <th>JAM KE-</th>
            <th className="jurnal-th-left">MATERI / TUJUAN PEMBELAJARAN</th>
            <th className="jurnal-th-left">KEGIATAN PEMBELAJARAN</th>
            <th>SISWA TIDAK HADIR</th>
            <th className="jurnal-th-left">KET</th>
          </tr>
        </thead>

        {/* ── DATA ROWS — 1 row per pertemuan ── */}
        <tbody>
          {rows.map((row) => {
            const isNoJournal = !row.hasJournal;
            const isCancelled = row.realizationStatus === "cancelled";
            const rowClass = isNoJournal
              ? "jurnal-row-no-journal"
              : isCancelled
              ? "jurnal-row-cancelled"
              : "";

            // KEGIATAN PEMBELAJARAN: prefer actualMaterialTitle, fallback to note
            const kegiatan = row.actualMaterialTitle || row.note || "";

            // JAM KE-: "1 - 2" format
            const endPeriod = row.startPeriod + row.durationJP - 1;
            const jamKe = row.durationJP > 1
              ? `${row.startPeriod} - ${endPeriod}`
              : `${row.startPeriod}`;

            return (
              <tr key={row.sessionId} className={rowClass}>
                {/* NO */}
                <td className="jurnal-td-center">{row.meetingNumber}</td>

                {/* HARI / TANGGAL */}
                <td className="jurnal-td-center">{formatDayDate(row.dateISO)}</td>

                {/* JAM KE- */}
                <td className="jurnal-td-center jurnal-td-jam">{jamKe}</td>

                {/* MATERI / TUJUAN PEMBELAJARAN */}
                <td>{row.plannedMaterialTitle ?? ""}</td>

                {/* KEGIATAN PEMBELAJARAN */}
                <td>{kegiatan}</td>

                {/* SISWA TIDAK HADIR */}
                <td className="jurnal-td-center">{formatAbsentStudents(row.absentStudents)}</td>

                {/* KETERANGAN */}
                <td>{row.keterangan ?? ""}</td>
              </tr>
            );
          })}

          {/* ── Empty template rows (rows 4–6 for manual fill) ── */}
          {rows.length < 6 && Array.from({ length: 6 - rows.length }, (_, i) => (
            <tr key={`empty-${i}`}>
              <td className="jurnal-td-center">{rows.length + i + 1}</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── 4. BLOK TANDA TANGAN ── */}
      <div className="jurnal-signature-grid">
        <div className="jurnal-signature-box">
          <p>Mengetahui,</p>
          <p><strong>Kepala {school?.name ?? "SMPN 8 Bantan"}</strong></p>
          <div className="jurnal-signature-space"></div>
          <p className="jurnal-signature-name">{headmasterName ?? "........................"}</p>
          <p className="jurnal-signature-nip">NIP. {headmasterNip ?? "........................"}</p>
        </div>
        <div className="jurnal-signature-box">
          <p>{school?.village ?? school?.district ?? "............"}, ........................ {yearLabel ?? ".........."}</p>
          <p><strong>Guru Mata Pelajaran</strong></p>
          <div className="jurnal-signature-space"></div>
          <p className="jurnal-signature-name">{teacherName ?? "........................"}</p>
          <p className="jurnal-signature-nip">NIP. {teacherNip ?? "........................"}</p>
        </div>
      </div>

      {/* ── Scoped styles for JurnalMatrix (screen + print) ── */}
      <style>{`
        /* =========================================================
           SCREEN STYLES
           ========================================================= */

        .rekap-jurnal-doc {
          font-family: Arial, Helvetica, sans-serif;
          background: #ffffff;
          padding: 15mm 20mm;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          border-radius: 4px;
          color: #111827;
        }

        /* KOP Header */
        .jurnal-kop-header {
          text-align: center;
          margin-bottom: 20px;
          line-height: 1.3;
        }
        .jurnal-kop-title {
          font-size: 15pt;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .jurnal-kop-school {
          font-size: 13pt;
          font-weight: bold;
          text-transform: uppercase;
        }
        .jurnal-kop-year {
          font-size: 10pt;
          margin-top: 2px;
        }

        /* Metadata Grid */
        .jurnal-metadata-grid {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          font-size: 9.5pt;
          font-weight: bold;
        }
        .jurnal-metadata-column {
          line-height: 1.6;
        }
        .jurnal-metadata-value {
          font-weight: normal;
        }

        /* Table */
        .jurnal-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9pt;
          table-layout: fixed;
        }
        .jurnal-table th,
        .jurnal-table td {
          border: 1px solid #000000;
          padding: 6px 8px;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        /* JAM KE- column: nowrap agar "1 - 2" tidak terpisah baris */
        .jurnal-table td.jurnal-td-jam {
          white-space: nowrap;
        }
        .jurnal-table th {
          background-color: #f3f4f6;
          font-weight: bold;
          text-align: center;
          vertical-align: middle;
          text-transform: uppercase;
        }
        .jurnal-table td {
          vertical-align: top;
          line-height: 1.35;
        }
        .jurnal-th-left {
          text-align: left;
        }
        .jurnal-td-center {
          text-align: center;
        }

        /* Row highlights */
        .jurnal-row-no-journal {
          background-color: #fefce8;
        }
        .jurnal-row-cancelled {
          background-color: #fef2f2;
        }

        /* Signature Block */
        .jurnal-signature-grid {
          display: flex;
          justify-content: space-between;
          margin-top: 25px;
          font-size: 9.5pt;
        }
        .jurnal-signature-box {
          width: 250px;
          text-align: center;
          line-height: 1.4;
        }
        .jurnal-signature-space {
          height: 55px;
        }
        .jurnal-signature-name {
          text-decoration: underline;
          font-weight: bold;
        }
        .jurnal-signature-nip {
          font-size: 9pt;
        }

        /* =========================================================
           PRINT STYLES
           Note: @page portrait rule is set in RekapSemesterPage's
           printStyleTag — do NOT duplicate @page here to avoid conflicts.
           ========================================================= */
        @media print {
          .rekap-jurnal-doc {
            padding: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            width: 100% !important;
            min-height: auto !important;
            font-size: 9pt !important;
          }

          .jurnal-table th,
          .jurnal-table td {
            padding: 4px 6px !important;
            font-size: 8.5pt !important;
          }

          .jurnal-kop-title {
            font-size: 13pt !important;
          }
          .jurnal-kop-school {
            font-size: 11pt !important;
          }
          .jurnal-kop-year {
            font-size: 9pt !important;
          }

          .jurnal-metadata-grid {
            font-size: 8.5pt !important;
          }

          .jurnal-signature-grid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin-top: 18px !important;
            font-size: 8.5pt !important;
          }
          .jurnal-signature-nip {
            font-size: 8pt !important;
          }
          .jurnal-signature-space {
            height: 45px !important;
          }

          /* Remove row highlights for print (monochrome) */
          .jurnal-row-no-journal,
          .jurnal-row-cancelled {
            background-color: transparent !important;
          }
        }
      `}</style>
    </div>
  );
}
