/**
 * KalenderMEDocument — renders the official Kalender Minggu Efektif
 * table on an A4 portrait canvas.
 * Extracted from CalendarPage.tsx.
 */

import type { CalendarWeek } from "./calendarHelpers";
import { MONTH_FULL_ID, SEMESTER_MONTHS } from "./calendarHelpers";
import { formatLongDateID } from "@guru-admin/shared";

export function KalenderMEDocument({
  semester,
  tahunAjaran,
  schoolName,
  weeks,
  effectiveWeeks,
  totalWeeks,
}: {
  semester: 1 | 2;
  tahunAjaran: string;
  schoolName: string;
  weeks: CalendarWeek[];
  effectiveWeeks: number;
  totalWeeks: number;
}) {
  const ineffectiveWeeks = totalWeeks - effectiveWeeks;

  return (
    <div className="print-area">
      <div className="document-page document-portrait">
        <div className="document-title">KALENDER MINGGU EFEKTIF</div>
        <div className="document-subtitle">
          SEMESTER {semester === 1 ? "1 (GANJIL)" : "2 (GENAP)"} — TAHUN PELAJARAN {tahunAjaran}
        </div>

        {/* Identity table */}
        <table className="document-identity">
          <tbody>
            <tr>
              <td>Satuan Pendidikan</td>
              <td>{schoolName || "-"}</td>
              <td>Semester</td>
              <td>{semester === 1 ? "Ganjil" : "Genap"}</td>
            </tr>
            <tr>
              <td>Tahun Pelajaran</td>
              <td>{tahunAjaran}</td>
              <td>Total Minggu</td>
              <td>{totalWeeks} minggu</td>
            </tr>
            <tr>
              <td>Minggu Efektif</td>
              <td className="kme-effective-text">{effectiveWeeks} minggu</td>
              <td>Minggu Tidak Efektif</td>
              <td className="kme-ineffective-text">{ineffectiveWeeks} minggu</td>
            </tr>
          </tbody>
        </table>

        {/* Main table */}
        <div className="document-section-title">RENCANA MINGGU EFEKTIF</div>
        <table className="document-table kme-table">
          <thead>
            <tr>
              <th style={{ width: "6%" }}>No</th>
              <th style={{ width: "16%" }}>Bulan</th>
              <th style={{ width: "18%" }}>Tanggal</th>
              <th style={{ width: "10%" }}>Efektif</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((w) => {
              const startD = new Date(w.startDate + "T00:00:00");
              const monthLabel = MONTH_FULL_ID[startD.getMonth()];
              const dateRange = `${formatLongDateID(w.startDate).split(",")[1]?.trim() ?? w.startDate} — ${formatLongDateID(w.endDate).split(",")[1]?.trim() ?? w.endDate}`;

              return (
                <tr
                  key={w.weekNumber}
                  className={w.isEffective ? "" : "kme-ineffective-row"}
                >
                  <td className="text-center">{w.weekNumber}</td>
                  <td>{monthLabel}</td>
                  <td>{dateRange}</td>
                  <td className="text-center">
                    {w.isEffective ? (
                      <span className="kme-effective-mark">✓</span>
                    ) : (
                      <span className="kme-ineffective-mark">✗</span>
                    )}
                  </td>
                  <td>
                    {w.isEffective ? (
                      <span className="kme-effective-label">Minggu efektif</span>
                    ) : (
                      <span className="kme-ineffective-label">{w.blockReason}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="text-center"><strong>JUMLAH</strong></td>
              <td className="text-center"><strong>{effectiveWeeks}/{totalWeeks}</strong></td>
              <td><strong>{effectiveWeeks} minggu efektif, {ineffectiveWeeks} tidak efektif</strong></td>
            </tr>
          </tfoot>
        </table>

        {/* Summary per month */}
        <div className="document-section-title" style={{ marginTop: "14pt" }}>REKAP PER BULAN</div>
        <table className="document-table kme-month-table">
          <thead>
            <tr>
              <th>Bulan</th>
              <th style={{ width: "20%" }}>Total Minggu</th>
              <th style={{ width: "20%" }}>Efektif</th>
              <th style={{ width: "20%" }}>Tidak Efektif</th>
            </tr>
          </thead>
          <tbody>
            {SEMESTER_MONTHS[semester].map((month) => {
              const monthWeeks = weeks.filter((w) => {
                const d = new Date(w.startDate + "T00:00:00");
                return d.getMonth() + 1 === month;
              });
              if (monthWeeks.length === 0) return null;
              const eff = monthWeeks.filter((w) => w.isEffective).length;
              const ineff = monthWeeks.length - eff;
              return (
                <tr key={month}>
                  <td>{MONTH_FULL_ID[month - 1]}</td>
                  <td className="text-center">{monthWeeks.length}</td>
                  <td className="text-center kme-effective-text">{eff}</td>
                  <td className="text-center kme-ineffective-text">{ineff}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td><strong>Total</strong></td>
              <td className="text-center"><strong>{totalWeeks}</strong></td>
              <td className="text-center kme-effective-text"><strong>{effectiveWeeks}</strong></td>
              <td className="text-center kme-ineffective-text"><strong>{ineffectiveWeeks}</strong></td>
            </tr>
          </tfoot>
        </table>

        {/* Signature */}
        <div className="signature-grid" style={{ marginTop: "24pt" }}>
          <div>
            <p>Mengetahui,</p>
            <p>Kepala Sekolah</p>
            <div className="sig-space" />
            <p className="sig-name">(........................................)</p>
            <p>NIP. .....................</p>
          </div>
          <div>
            <p>..........., {MONTH_FULL_ID[new Date().getMonth()]} {new Date().getFullYear()}</p>
            <p>Guru Mata Pelajaran</p>
            <div className="sig-space" />
            <p className="sig-name">(........................................)</p>
            <p>NIP. .....................</p>
          </div>
        </div>
      </div>
    </div>
  );
}
