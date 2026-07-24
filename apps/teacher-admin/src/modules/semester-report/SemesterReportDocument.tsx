/**
 * SemesterReportDocument — A4 formal layout for the semester report.
 * Extracted from SemesterReportPage.tsx.
 */

import type {
  SemesterReport,
  SchoolProfile,
  TeacherProfile,
  AcademicYear,
} from "@guru-admin/domain";
import { formatLongDateID } from "@guru-admin/shared";

/* ------------------------------------------------------------------ */
/*  SemesterReportDocument                                             */
/* ------------------------------------------------------------------ */

interface SemesterReportDocumentProps {
  report: SemesterReport;
  school?: SchoolProfile;
  teacher: TeacherProfile;
  academicYear: AcademicYear;
}

export function SemesterReportDocument({
  report,
  school,
  teacher,
  academicYear,
}: SemesterReportDocumentProps) {
  return (
    <div className="document-page document-portrait" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '11pt', lineHeight: '1.25', width: '100%', boxSizing: 'border-box' }}>
      <div className="document-title">LAPORAN AKHIR SEMESTER {report.semester === 1 ? "GANJIL" : "GENAP"}</div>
      <div className="document-subtitle">{school?.name ?? "Sekolah"} — {school?.address ?? ""}</div>
      <div className="document-subtitle">Tahun Pelajaran {academicYear.label}</div>

      <table className="document-identity" style={{ fontFamily: 'Arial, Helvetica, sans-serif', width: '100%', borderCollapse: 'collapse', boxSizing: 'border-box' }}>
        <tbody>
          <tr>
            <td>Mata Pelajaran</td><td>{report.subject}</td>
            <td>Kelas</td><td>{report.classLabel || report.grade} / Fase {report.phase}</td>
          </tr>
          <tr>
            <td>Guru</td><td>{teacher.name}</td>
            <td>NIP</td><td>{teacher.nip ?? "-"}</td>
          </tr>
        </tbody>
      </table>

      <div className="document-section-title">A. REKAP PERTEMUAN</div>
      <table className="document-table" style={{ fontFamily: 'Arial, Helvetica, sans-serif', width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', boxSizing: 'border-box' }}>
        <thead>
          <tr><th style={{ width: "5%" }}>No</th><th>Uraian</th><th style={{ width: "15%" }}>Jumlah</th></tr>
        </thead>
        <tbody>
          <tr><td className="text-center">1</td><td>Total Sesi Terjadwal</td><td className="text-center">{report.totalPlannedSessions}</td></tr>
          <tr><td className="text-center">2</td><td>Sesi Terlaksana (Selesai)</td><td className="text-center">{report.totalDoneSessions}</td></tr>
          <tr><td className="text-center">3</td><td>Sesi Dilanjutkan</td><td className="text-center">{report.totalContinuedSessions}</td></tr>
          <tr><td className="text-center">4</td><td>Sesi Tidak Terlaksana</td><td className="text-center">{report.totalCancelledSessions}</td></tr>
        </tbody>
      </table>

      <div className="document-section-title">B. REKAP MATERI</div>
      <table className="document-table" style={{ fontFamily: 'Arial, Helvetica, sans-serif', width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', boxSizing: 'border-box' }}>
        <thead>
          <tr><th style={{ width: "5%" }}>No</th><th>Status Materi</th><th style={{ width: "15%" }}>Jumlah</th></tr>
        </thead>
        <tbody>
          <tr><td className="text-center">1</td><td>Materi Selesai</td><td className="text-center">{report.totalCompletedUnits}</td></tr>
          <tr><td className="text-center">2</td><td>Materi Sebagian</td><td className="text-center">{report.totalPartialUnits}</td></tr>
          <tr><td className="text-center">3</td><td>Materi Belum Dimulai</td><td className="text-center">{report.totalNotStartedUnits}</td></tr>
          <tr><td className="text-center">4</td><td>Total Materi (Prota)</td><td className="text-center">{report.totalPlannedUnits}</td></tr>
        </tbody>
      </table>

      <div className="document-section-title">C. REKAP KEHADIRAN SISWA — KELAS {report.classLabel || report.grade}</div>
      <table className="document-table" style={{ fontFamily: 'Arial, Helvetica, sans-serif', width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', boxSizing: 'border-box' }}>
        <thead>
          <tr>
            <th>Kelas</th>
            <th>H</th><th>S</th><th>I</th><th>A</th>
            <th>Total Sesi</th>
          </tr>
        </thead>
        <tbody>
          {report.perClassAbsence.length === 0 ? (
            <tr><td colSpan={6} className="text-center">Tidak ada data</td></tr>
          ) : (
            report.perClassAbsence.map((c) => (
              <tr key={c.classId}>
                <td>{c.classLabel}</td>
                <td className="text-center">{c.presentCount}</td>
                <td className="text-center">{c.sickCount}</td>
                <td className="text-center">{c.excusedCount}</td>
                <td className="text-center">{c.absentCount}</td>
                <td className="text-center">{c.totalSessions}</td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr>
            <td>TOTAL</td>
            <td className="text-center">{report.totalPresent}</td>
            <td className="text-center">{report.totalSick}</td>
            <td className="text-center">{report.totalExcused}</td>
            <td className="text-center">{report.totalAbsent}</td>
            <td className="text-center">{report.totalPlannedSessions}</td>
          </tr>
        </tfoot>
      </table>

      <div className="document-section-title">D. REKAP JURNAL</div>
      <table className="document-table" style={{ fontFamily: 'Arial, Helvetica, sans-serif', width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', boxSizing: 'border-box' }}>
        <thead>
          <tr><th>No</th><th>Uraian</th><th>Jumlah</th></tr>
        </thead>
        <tbody>
          <tr><td className="text-center">1</td><td>Jurnal Final</td><td className="text-center">{report.journalsFinalized}</td></tr>
          <tr><td className="text-center">2</td><td>Jurnal Draft/Pending</td><td className="text-center">{report.journalsPending}</td></tr>
        </tbody>
      </table>

      <div className="document-section-title">E. CATATAN</div>
      <div style={{ border: "1px solid #000", padding: "8pt", minHeight: "60pt", marginBottom: "12pt" }}>
        {report.teacherNotes || report.materialAdjustments || "(kosong)"}
      </div>

      <div className="signature-grid">
        <div>
          <p>Mengetahui,</p>
          <p>Kepala Sekolah</p>
          <div className="sig-space" />
          <p className="sig-name">{school?.headmasterName ?? "(...........................)"}</p>
          <p>NIP. {school?.headmasterNip ?? "-"}</p>
        </div>
        <div>
          <p>{school?.regency ?? "..........."}, {report.finalizedAt ? formatLongDateID(report.finalizedAt.split("T")[0]) : "..."}</p>
          <p>Guru Mata Pelajaran</p>
          <div className="sig-space" />
          <p className="sig-name">{teacher.name}</p>
          <p>NIP. {teacher.nip ?? "-"}</p>
        </div>
      </div>
    </div>
  );
}
