/**
 * PromesLandscapeMatrixDocument — landscape matrix format
 *
 * REWRITE: Major simplification using shared helpers:
 *   - buildWeekLookup() instead of building Maps inline
 *   - buildMateriRows() instead of inline materi row construction
 *   - resolveLandscapeWeekCell() instead of 5+ different inline logic blocks
 *   - Clean JSX with consistent styling and premium print output
 *
 * Uses raw <table> because rowSpan/colSpan is genuinely needed for the
 * complex month group header. All other rendering is simplified.
 */

import {
  DocumentPage,
  DocumentTitle,
  DocumentIdentityTable,
  DocumentSignature,
} from "../../shared/documents";
import type {
  PromesWeek,
  UnitDistribution,
  KORow,
  PromesSummary,
  ProtaProfile,
} from "@guru-admin/domain";
import {
  buildPromesMonthGroups,
  buildWeekLookup,
  buildMateriRows,
  resolveLandscapeWeekCell,
  promesEventClassName,
  PROMES_LEGEND_ITEMS,
} from "./promes-helpers";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";

export interface PromesLandscapeMatrixDocumentProps {
  weeks: PromesWeek[];
  distribution: UnitDistribution[];
  koRows: KORow[];
  summary: PromesSummary;
  status: "valid" | "needs_fix";
  semester: 1 | 2;
  activeYearLabel: string;
  schoolName: string;
  schoolRegency: string;
  headmasterName: string;
  teacherName: string;
  profile: ProtaProfile | null;
}

export function PromesLandscapeMatrixDocument({
  weeks,
  distribution,
  summary,
  status,
  semester,
  activeYearLabel,
  schoolName,
  schoolRegency,
  headmasterName,
  teacherName,
  profile,
}: PromesLandscapeMatrixDocumentProps) {
  /* ---- Pre-compute all shared data (one pass, shared across all rendering) ---- */
  const monthGroups = buildPromesMonthGroups(weeks, semester);
  const weekColumns = monthGroups.flatMap((m) => m.weeks);
  const lookup = buildWeekLookup(weeks);
  const materiRows = buildMateriRows(distribution);

  /* ---- Identity rows ---- */
  const intraPerWeek = summary.effectiveWeeks > 0 ? Math.round(summary.intraCapacityJP / summary.effectiveWeeks) : 0;
  const kokuPerWeek = summary.koTotalJP > 0 ? Math.round(summary.koTotalJP / summary.effectiveWeeks) : 0;
  const totalPerWeek = summary.effectiveWeeks > 0 ? Math.round((summary.intraCapacityJP + summary.koTotalJP) / summary.effectiveWeeks) : 0;

  const identityRows = [
    { label: "Satuan Pendidikan", value: schoolName || "-" },
    { label: "Mata Pelajaran", value: profile?.subject ?? "-" },
    { label: "Kelas / Fase", value: `${profile?.grade ?? "-"} / ${profile?.phase ?? "-"}` },
    { label: "Semester", value: semester === 1 ? "Ganjil (1)" : "Genap (2)" },
    { label: "Tahun Pelajaran", value: activeYearLabel || "-" },
    { label: "Beban Belajar / Minggu", value: `${totalPerWeek} JP (Intra ${intraPerWeek} + Koku ${kokuPerWeek})` },
  ];

  /* ---- Column width for week columns ---- */
  const fixedColWidthPercent = 30; // No + Elemen + Materi + Intra + Koku + Total
  const weekColWidthPercent = (100 - fixedColWidthPercent) / weekColumns.length;

  return (
    <DocumentPage orientation="landscape" className="promes-landscape-page promes-one-page">
      <DocumentTitle title={`PROGRAM SEMESTER (PROMES)`} subtitle={`TAHUN AJARAN ${activeYearLabel || "..........."}`} />
      <DocumentIdentityTable rows={identityRows} columns={2} />

      {/* ---- Matrix Table (raw <table> for complex rowSpan/colSpan) ---- */}
      <table className="promes-matrix-table promes-vertical-event-table" style={{ fontFamily: "Arial, Helvetica, sans-serif", width: "100%", tableLayout: "fixed", borderCollapse: "collapse", boxSizing: "border-box" }}>
        <colgroup>
          <col style={{ width: '2.5%' }} />   {/* No */}
          <col style={{ width: '8%' }} />     {/* Elemen/TP */}
          <col style={{ width: '12%' }} />    {/* Materi Pokok */}
          <col style={{ width: '2.5%' }} />   {/* Intra JP */}
          <col style={{ width: '2.5%' }} />   {/* Koku JP */}
          <col style={{ width: '2.5%' }} />   {/* Total JP */}
          {weekColumns.map((week) => (
            <col key={`col-${week.weekNumber}`} style={{ width: `${weekColWidthPercent.toFixed(2)}%` }} />
          ))}
        </colgroup>

        {/* ---- Header rows ---- */}
        <thead>
          <tr>
            <th rowSpan={2} className="col-no-merdeka">No</th>
            <th rowSpan={2} className="col-elemen-merdeka">Elemen / TP</th>
            <th rowSpan={2} className="col-materi-merdeka">ATP / Materi Pokok</th>
            <th colSpan={3} className="col-jp-group-merdeka">Alokasi Waktu (JP)</th>
            {monthGroups.map((group) => (
              <th key={group.month} colSpan={group.weeks.length} className="month-head">
                {group.label}
              </th>
            ))}
          </tr>
          <tr>
            <th className="col-intra-jp-merdeka">Intra</th>
            <th className="col-koku-jp-merdeka">Koku</th>
            <th className="col-total-jp-merdeka">Total</th>
            {weekColumns.map((week) => (
              <th key={`week-head-${week.weekNumber}`} className="week-head">
                {week.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {/* ---- Materi data rows ---- */}
          {materiRows.map((row, rowIndex) => (
            <tr key={row.key} className="promes-learning-row">
              <td className="text-center no-cell">{row.rowNum}</td>
              <td className="elemen-cell">{row.elemen}</td>
              <td className="materi-cell">{row.materi}</td>
              <td className="text-center jp-cell">{row.intraJP > 0 ? `${row.intraJP}` : "-"}</td>
              <td className="text-center jp-cell koku-jp-cell">-</td>
              <td className="text-center jp-cell total-jp-cell"><strong>{row.totalJP}</strong></td>
              {weekColumns.map((week) => {
                const cell = resolveLandscapeWeekCell(lookup, week.weekNumber, "materi", row.unitId, rowIndex);
                return (
                  <td
                    key={`${row.key}-${week.weekNumber}`}
                    className={cell.className}
                    title={cell.title}
                  >
                    {cell.content}
                  </td>
                );
              })}
            </tr>
          ))}

          {/* ---- Summary: Jumlah Jam Efektif ---- */}
          <tr className="total-row promes-summary-row">
            <td colSpan={3}><strong>Jumlah Jam Efektif</strong></td>
            <td className="text-center jp-cell"><strong>{summary.intraCapacityJP}</strong></td>
            <td className="text-center jp-cell koku-jp-cell"><strong>{summary.koTotalJP}</strong></td>
            <td className="text-center jp-cell total-jp-cell"><strong>{summary.intraCapacityJP + summary.koTotalJP}</strong></td>
            {weekColumns.map((week) => {
              const cell = resolveLandscapeWeekCell(lookup, week.weekNumber, "effective");
              return <td key={`eff-${week.weekNumber}`} className={cell.className}>{cell.content}</td>;
            })}
          </tr>

          {/* ---- Summary: Jumlah Jam Cadangan ---- */}
          <tr className="cadangan-row promes-summary-row">
            <td colSpan={3}>Jumlah Jam Cadangan</td>
            <td className="text-center jp-cell">{summary.cadanganJP > 0 ? `${summary.cadanganJP}` : "-"}</td>
            <td className="text-center jp-cell koku-jp-cell">-</td>
            <td className="text-center jp-cell total-jp-cell">{summary.cadanganJP > 0 ? `${summary.cadanganJP}` : "-"}</td>
            {weekColumns.map((week) => {
              const cell = resolveLandscapeWeekCell(lookup, week.weekNumber, "cadangan");
              return <td key={`cad-${week.weekNumber}`} className={cell.className}>{cell.content}</td>;
            })}
          </tr>

          {/* ---- Summary: Kokurikuler (only if KO > 0) ---- */}
          {summary.koTotalJP > 0 && (
            <tr className="promes-summary-row promes-koku-row">
              <td colSpan={3}><strong>Kokurikuler</strong></td>
              <td className="text-center jp-cell">-</td>
              <td className="text-center jp-cell koku-jp-cell"><strong>{summary.koTotalJP}</strong></td>
              <td className="text-center jp-cell total-jp-cell"><strong>{summary.koTotalJP}</strong></td>
              {weekColumns.map((week) => {
                const cell = resolveLandscapeWeekCell(lookup, week.weekNumber, "kokurikuler");
                return <td key={`ko-${week.weekNumber}`} className={cell.className}>{cell.content}</td>;
              })}
            </tr>
          )}

          {/* ---- Summary: Jumlah Jam Total ---- */}
          <tr className="total-row promes-summary-row">
            <td colSpan={3}><strong>Jumlah Jam Total Semester {semester === 1 ? "Ganjil" : "Genap"}</strong></td>
            <td className="text-center jp-cell"><strong>{summary.intraCapacityJP + summary.cadanganJP}</strong></td>
            <td className="text-center jp-cell koku-jp-cell"><strong>{summary.koTotalJP}</strong></td>
            <td className="text-center jp-cell total-jp-cell"><strong>{summary.intraCapacityJP + summary.cadanganJP + summary.koTotalJP}</strong></td>
            {weekColumns.map((week) => {
              const cell = resolveLandscapeWeekCell(lookup, week.weekNumber, "total");
              return <td key={`tot-${week.weekNumber}`} className={cell.className}>{cell.content}</td>;
            })}
          </tr>
        </tbody>
      </table>

      {/* ---- Legend ---- */}
      <div className="promes-legend-block">
        <strong>Keterangan:</strong>
        <div className="promes-legend-grid">
          {PROMES_LEGEND_ITEMS.map((item) => (
            <div key={item.kind} className="promes-legend-item">
              <span className={`promes-legend-swatch ${promesEventClassName(item.kind)}`}></span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {status !== "valid" && (
        <p className="promes-warning">
          Promes belum lengkap: {summary.undistributedJP} JP materi belum terdistribusi.
        </p>
      )}

      <DocumentSignature
        left={{ role: "Mengetahui,\nKepala Sekolah", name: headmasterName }}
        right={{ role: "Guru Mata Pelajaran", name: teacherName, placeDate: `${schoolRegency || "..........."}, ${formatLongDateID(todayISODate())}` }}
      />
    </DocumentPage>
  );
}
