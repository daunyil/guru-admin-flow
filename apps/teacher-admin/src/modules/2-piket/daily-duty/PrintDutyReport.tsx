import { useState } from "react";
import { Card, Button } from "@shared/ui";
import { PrintExportButtons } from "@shared/ui/PrintExportButtons";
import { formatLongDateID } from "@guru-admin/shared";
import { formatSIADetail } from "@guru-admin/domain";
import type { ClassAttendanceDetail, DutyRecord, StudentDutyLedgerItem } from "@guru-admin/domain";

export function PrintDutyReport({ date, yearLabel, teacherName, records, attendanceDetail, reportNote, ledger }: { date: string; yearLabel: string; teacherName: string; records: DutyRecord[]; attendanceDetail: ClassAttendanceDetail[]; reportNote: string; ledger: StudentDutyLedgerItem[] }) {
  // PIKET-AUDIT-05C: Mode Dokumen toggle + disable print bila tidak ada data
  const [showDocument, setShowDocument] = useState(false);
  const hasAnyData = records.length > 0 || attendanceDetail.length > 0 || ledger.length > 0;
  return (
    <Card>
      <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
        <h3 className="text-sm font-bold text-slate-700">Cetak Laporan Piket</h3>
        <div className="flex gap-2">
          <Button variant="secondary" className="text-xs" onClick={() => setShowDocument(!showDocument)}>
            {showDocument ? "Mode Kerja" : "Mode Dokumen"}
          </Button>
          {/* PIKET-AUDIT-05D-MINOR: tombol cetak disembunyikan bila tidak ada data */}
          <PrintExportButtons filename={`laporan-piket-${date}`} title="Laporan Piket Harian" orientation="portrait" targetId="print-duty" disabled={!hasAnyData} />
        </div>
      </div>
      {!hasAnyData && (
        <div className="p-1.5 bg-amber-50 rounded text-xs text-amber-800 mb-2">
          ⚠ Belum ada data untuk tanggal ini. Tombol cetak disembunyikan sampai ada catatan, rekap kehadiran, atau ledger poin.
        </div>
      )}
      {/* LAYOUT-FULLWIDTH-RC1: Dokumen A4 tetap centered dengan max-w-3xl */}
      <div className="max-w-3xl mx-auto">
        <div className={`print-area ${showDocument ? "block" : "hidden print:block"}`} id="print-duty">
        <div className="document-page document-portrait">
          <div className="document-title">LAPORAN PIKET HARIAN</div>
          <div className="document-subtitle">{yearLabel} · {formatLongDateID(date)}</div>
          <table className="document-identity">
            <tbody>
              <tr><td>Tanggal</td><td>{formatLongDateID(date)}</td><td>Guru Piket</td><td>{teacherName}</td></tr>
              <tr><td>Tahun Pelajaran</td><td>{yearLabel || "-"}</td><td>Catatan</td><td>{records.length} kejadian</td></tr>
            </tbody>
          </table>
          <div className="document-section-title">A. REKAP KEHADIRAN</div>
          {attendanceDetail.length === 0 ? (
            <p style={{ fontSize: "10pt", marginTop: "4pt" }}>Belum ada data kehadiran untuk tanggal ini.</p>
          ) : (
            <table className="document-table">
              <thead><tr><th>No</th><th>Kelas</th><th>H</th><th>S</th><th>I</th><th>A</th><th>Daftar Siswa S/I/A</th></tr></thead>
              <tbody>
                {attendanceDetail.map((s, i) => (
                  <tr key={s.classId}>
                    <td className="text-center">{i + 1}</td><td>{s.classLabel}</td>
                    <td className="text-center">{s.source === "empty" ? "-" : s.present}</td>
                    <td className="text-center">{s.source === "empty" ? "-" : s.sick}</td>
                    <td className="text-center">{s.source === "empty" ? "-" : s.excused}</td>
                    <td className="text-center">{s.source === "empty" ? "-" : s.absent}</td>
                    <td>{s.source === "empty" ? "—" : formatSIADetail(s)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="document-section-title">B. CATATAN KEJADIAN / PELANGGARAN</div>
          {records.length === 0 ? (
            <p style={{ fontSize: "10pt", marginTop: "4pt" }}>Belum ada catatan pelanggaran untuk tanggal ini.</p>
          ) : (
            <table className="document-table">
              <thead><tr><th>No</th><th>Nama</th><th>Kelas</th><th>Jenis</th><th>Poin</th><th>Catatan</th></tr></thead>
              <tbody>
                {records.map((r, i) => (
                  <tr key={r.id}>
                    <td className="text-center">{i + 1}</td><td>{r.studentName}</td><td>{r.classLabel}</td>
                    <td>{r.ruleLabel}</td><td className="text-center">{r.points}</td><td>{r.note ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {reportNote && (<><div className="document-section-title">C. CATATAN UMUM</div><p style={{ fontSize: "10pt", marginTop: "4pt" }}>{reportNote}</p></>)}
          <div className="document-section-title">D. REKAP POIN SISWA</div>
          {ledger.length === 0 ? (
            <p style={{ fontSize: "10pt", marginTop: "4pt" }}>Belum ada catatan piket tahun ini.</p>
          ) : (
            <table className="document-table">
              <thead><tr><th>No</th><th>Nama Siswa</th><th>Kelas</th><th>Kejadian</th><th>Total Poin</th><th>Status</th></tr></thead>
              <tbody>
                {ledger.map((item, i) => (
                  <tr key={`${item.studentId}__${item.classId}`}>
                    <td className="text-center">{i + 1}</td><td>{item.studentName}</td>
                    <td className="text-center">{item.classLabel}</td>
                    <td className="text-center">{item.totalRecords}</td>
                    <td className="text-center">{item.totalPoints}</td>
                    <td>{item.statusLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="document-section-title">E. TANDA TANGAN</div>
          <div className="signature-grid"><div><p>Guru Piket</p><div className="sig-space" /><p className="sig-name">{teacherName}</p></div></div>
        </div>
      </div>
      </div>
    </Card>
  );
}
