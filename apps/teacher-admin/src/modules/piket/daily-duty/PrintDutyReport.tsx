import { useState } from "react";
import { PrintExportButtons } from "@shared/ui/PrintExportButtons";
import { formatLongDateID } from "@guru-admin/shared";
import { formatSIADetail } from "@guru-admin/domain";
import type { ClassAttendanceDetail, DutyRecord, StudentDutyLedgerItem } from "@guru-admin/domain";

export function PrintDutyReport({ date, yearLabel, teacherName, records, attendanceDetail, reportNote, ledger }: { date: string; yearLabel: string; teacherName: string; records: DutyRecord[]; attendanceDetail: ClassAttendanceDetail[]; reportNote: string; ledger: StudentDutyLedgerItem[] }) {
  const [showDocument, setShowDocument] = useState(false);
  const hasAnyData = records.length > 0 || attendanceDetail.length > 0 || ledger.length > 0;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-slate-50 px-4 py-2.5 md:py-3 border-b border-slate-100">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs md:text-sm font-bold text-slate-800 uppercase tracking-wider">Cetak Laporan Piket</h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowDocument(!showDocument)}
              className="bg-white text-slate-700 border border-slate-300 font-bold text-[10px] md:text-xs py-2 px-3 rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all min-h-[44px]"
            >
              {showDocument ? "Mode Kerja" : "Mode Dokumen"}
            </button>
            <PrintExportButtons filename={`laporan-piket-${date}`} title="Laporan Piket Harian" orientation="portrait" targetId="print-duty" disabled={!hasAnyData} />
          </div>
        </div>
      </div>
      {!hasAnyData && (
        <div className="p-3 bg-amber-50 border-t border-amber-200 text-xs text-amber-800">
          Belum ada data untuk tanggal ini. Tombol cetak disembunyikan sampai ada catatan atau rekap kehadiran.
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
    </div>
  );
}
