/**
 * PromesLandscapeMatrixDocument — landscape matrix format
 * Renders a complex <table> with month groups, materi rows, event columns,
 * summary rows (Efektif, Cadangan, Kokurikuler, Total), legend, and signature.
 *
 * PROMES-CSS-BG-06: CSS Background Class approach for event columns
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
  compactPromesMaterial,
  compactPromesElemen,
  getPromesLandscapeCalendarEvent,
  promesEventClassName,
  PROMES_LEGEND_ITEMS,
  type PromesLandscapeEventColumn,
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
  const monthGroups = buildPromesMonthGroups(weeks, semester);
  const weekColumns = monthGroups.flatMap((m) => m.weeks);
  const eventByWeekNumber = new Map<number, PromesLandscapeEventColumn | null>(
    weeks.map((week) => [week.weekNumber, getPromesLandscapeCalendarEvent(week)])
  );

  /* ---- Build matrix data rows (materi rows only — KO is a summary row below) ---- */
  // PROMES-ELEMEN-TP-05: Elemen/TP column uses priority chain:
  //   learningOutcome (best — genuine TP text) → code (OK — element code like "TP 7.1") → compactPromesElemen(title) (fallback — abbreviated title)
  // Materi column always uses full title (compactPromesMaterial).
  const materiRows = distribution.length > 0
    ? distribution.map((unit, i) => ({
        key: unit.unitId,
        rowNum: i + 1,
        elemen: unit.learningOutcome
          ? compactPromesMaterial(unit.learningOutcome, 5)
          : unit.code
            ? unit.code
            : compactPromesElemen(unit.title, 3),
        materi: compactPromesMaterial(unit.title, 7),
        intraJP: unit.totalJP,
        totalJP: unit.totalJP,
        unitId: unit.unitId,
      }))
    : [{ key: "empty", rowNum: 1, elemen: "-", materi: "Belum ada materi terdistribusi", intraJP: 0, totalJP: 0, unitId: "" }];

  // Build lookup: unitId → weekNumber → JP assigned in that week
  const unitJPByWeek = new Map<string, Map<number, number>>();
  for (const w of weeks) {
    for (const au of w.assignedUnits) {
      if (!unitJPByWeek.has(au.unitId)) {
        unitJPByWeek.set(au.unitId, new Map());
      }
      unitJPByWeek.get(au.unitId)!.set(w.weekNumber, au.jp);
    }
  }

  function getUnitJPInWeek(unitId: string, weekNumber: number): number {
    return unitJPByWeek.get(unitId)?.get(weekNumber) ?? 0;
  }

  function weekMeta(weekNumber: number) {
    return weeks.find((w) => w.weekNumber === weekNumber);
  }

  /* Identity rows for DocumentIdentityTable */
  const identityRows = [
    { label: "Satuan Pendidikan", value: schoolName || "-" },
    { label: "Mata Pelajaran", value: profile?.subject ?? "-" },
    { label: "Kelas / Fase", value: `${profile?.grade ?? "-"} / ${profile?.phase ?? "-"}` },
    { label: "Semester", value: semester === 1 ? "Ganjil (1)" : "Genap (2)" },
    { label: "Tahun Pelajaran", value: activeYearLabel || "-" },
    { label: "Beban Belajar / Minggu", value: `${summary.effectiveWeeks > 0 ? Math.round((summary.intraCapacityJP + summary.koTotalJP) / summary.effectiveWeeks) : 0} JP (Intra ${summary.effectiveWeeks > 0 ? Math.round(summary.intraCapacityJP / summary.effectiveWeeks) : 0} + Koku ${summary.koTotalJP > 0 ? Math.round(summary.koTotalJP / summary.effectiveWeeks) : 0})` },
  ];

  return (
    <DocumentPage orientation="landscape" className="promes-landscape-page promes-one-page">
      <DocumentTitle title={`PROGRAM SEMESTER (PROMES)`} subtitle={`TAHUN AJARAN ${activeYearLabel || "..........."}`} />
      <DocumentIdentityTable rows={identityRows} columns={2} />

      {/* ---- Matrix Table (raw <table> for complex rowSpan) ---- */}
      <table
        className="promes-matrix-table promes-vertical-event-table"
        style={{
          fontFamily: "Arial, Helvetica, sans-serif",
          width: "100%",
          tableLayout: "fixed",
          borderCollapse: "collapse",
          boxSizing: "border-box",
        }}
      >
        <colgroup>
          <col style={{ width: '2.5%' }} />   {/* No */}
          <col style={{ width: '8%' }} />  {/* Elemen/TP */}
          <col style={{ width: '12%' }} />  {/* Materi Pokok */}
          <col style={{ width: '2.5%' }} />   {/* Intra JP */}
          <col style={{ width: '2.5%' }} />   {/* Koku JP */}
          <col style={{ width: '2.5%' }} />   {/* Total JP */}
          {weekColumns.map((week) => (
            <col key={`col-${week.weekNumber}`} style={{ width: `${((100 - 30) / weekColumns.length).toFixed(2)}%` }} />
          ))}
        </colgroup>
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
          {/* ---- Materi data rows (KO is now a summary row, NOT a data row) ---- */}
          {/* PROMES-CSS-BG-06: CSS Background Class approach for events:
              - First data row (rowIndex===0): show event badge with background
              - Other data rows: show just background color, no text
              - This creates a clean "column stripe" without repeated text */}
          {materiRows.map((row, rowIndex) => (
            <tr key={row.key} className="promes-learning-row">
              <td className="text-center no-cell">{row.rowNum}</td>
              <td className="elemen-cell">{row.elemen}</td>
              <td className="materi-cell">{row.materi}</td>
              <td className="text-center jp-cell">{row.intraJP > 0 ? `${row.intraJP}` : "-"}</td>
              <td className="text-center jp-cell koku-jp-cell">-</td>
              <td className="text-center jp-cell total-jp-cell"><strong>{row.totalJP}</strong></td>
              {weekColumns.map((week) => {
                const event = eventByWeekNumber.get(week.weekNumber) ?? null;
                if (event) {
                  // CSS Background Class: badge only in first data row, background only in others
                  const isFirstRow = rowIndex === 0;
                  return (
                    <td
                      key={`${row.key}-${week.weekNumber}`}
                      className={`week-cell ${isFirstRow ? "promes-event-cell" : ""} ${promesEventClassName(event.kind)}`}
                      title={event.label}
                    >
                      {isFirstRow ? <span className="promes-vertical-label">{event.label}</span> : ""}
                    </td>
                  );
                }
                // Materi row: show JP number instead of checkmark "v"
                const unitJP = getUnitJPInWeek(row.unitId, week.weekNumber);
                const isAssigned = unitJP > 0;
                return (
                  <td
                    key={`${row.key}-${week.weekNumber}`}
                    className={`week-cell ${isAssigned ? "promes-event-learning" : ""}`}
                  >
                    {isAssigned ? unitJP : ""}
                  </td>
                );
              })}
            </tr>
          ))}

          {/* ---- Summary rows (Efektif, Cadangan, Kokurikuler, Total) ---- */}
          {/* PROMES-CSS-BG-06: Summary rows show just background color for event weeks, no text */}
          <tr className="total-row promes-summary-row">
            <td colSpan={3}><strong>Jumlah Jam Efektif</strong></td>
            <td className="text-center jp-cell"><strong>{summary.intraCapacityJP}</strong></td>
            <td className="text-center jp-cell koku-jp-cell"><strong>{summary.koTotalJP}</strong></td>
            <td className="text-center jp-cell total-jp-cell"><strong>{summary.intraCapacityJP + summary.koTotalJP}</strong></td>
            {weekColumns.map((week) => {
              const meta = weekMeta(week.weekNumber);
              const event = eventByWeekNumber.get(week.weekNumber) ?? null;
              if (event) {
                // CSS Background Class: just background color, no text in summary rows
                return (
                  <td key={`eff-${week.weekNumber}`} className={`week-cell ${promesEventClassName(event.kind)}`}>
                  </td>
                );
              }
              return (
                <td key={`eff-${week.weekNumber}`} className="week-cell">
                  {meta?.isEffective ? meta.intraCapacityJP : ""}
                </td>
              );
            })}
          </tr>

          <tr className="cadangan-row promes-summary-row">
            <td colSpan={3}>Jumlah Jam Cadangan</td>
            <td className="text-center jp-cell">{summary.cadanganJP > 0 ? `${summary.cadanganJP}` : "-"}</td>
            <td className="text-center jp-cell koku-jp-cell">-</td>
            <td className="text-center jp-cell total-jp-cell">{summary.cadanganJP > 0 ? `${summary.cadanganJP}` : "-"}</td>
            {weekColumns.map((week) => {
              const meta = weekMeta(week.weekNumber);
              const event = eventByWeekNumber.get(week.weekNumber) ?? null;
              if (event) {
                // CSS Background Class: just background color, no text in summary rows
                return (
                  <td key={`cad-${week.weekNumber}`} className={`week-cell ${promesEventClassName(event.kind)}`}>
                  </td>
                );
              }
              return (
                <td key={`cad-${week.weekNumber}`} className="week-cell">
                  {(meta?.reservedForCadangan ?? 0) > 0 ? "C" : ""}
                </td>
              );
            })}
          </tr>

          {/* Kokurikuler as SUMMARY ROW (between Cadangan & Total) */}
          {summary.koTotalJP > 0 && (
            <tr className="promes-summary-row promes-koku-row">
              <td colSpan={3}><strong>Kokurikuler</strong></td>
              <td className="text-center jp-cell">-</td>
              <td className="text-center jp-cell koku-jp-cell"><strong>{summary.koTotalJP}</strong></td>
              <td className="text-center jp-cell total-jp-cell"><strong>{summary.koTotalJP}</strong></td>
              {weekColumns.map((week) => {
                const meta = weekMeta(week.weekNumber);
                const event = eventByWeekNumber.get(week.weekNumber) ?? null;
                if (event) {
                  // CSS Background Class: just background color, no text in summary rows
                  return (
                    <td key={`ko-${week.weekNumber}`} className={`week-cell ${promesEventClassName(event.kind)}`}>
                    </td>
                  );
                }
                return (
                  <td key={`ko-${week.weekNumber}`} className={`week-cell ${(meta?.koJP ?? 0) > 0 ? "promes-event-kokurikuler" : ""}`}>
                    {(meta?.koJP ?? 0) > 0 ? meta!.koJP : ""}
                  </td>
                );
              })}
            </tr>
          )}

          <tr className="total-row promes-summary-row">
            <td colSpan={3}><strong>Jumlah Jam Total Semester {semester === 1 ? "Ganjil" : "Genap"}</strong></td>
            <td className="text-center jp-cell"><strong>{summary.intraCapacityJP + summary.cadanganJP}</strong></td>
            <td className="text-center jp-cell koku-jp-cell"><strong>{summary.koTotalJP}</strong></td>
            <td className="text-center jp-cell total-jp-cell"><strong>{summary.intraCapacityJP + summary.cadanganJP + summary.koTotalJP}</strong></td>
            {weekColumns.map((week) => {
              const meta = weekMeta(week.weekNumber);
              const event = eventByWeekNumber.get(week.weekNumber) ?? null;
              if (event) {
                // CSS Background Class: just background color, no text in summary rows
                return (
                  <td key={`tot-${week.weekNumber}`} className={`week-cell ${promesEventClassName(event.kind)}`}>
                  </td>
                );
              }
              const totalWeekJP = (meta?.isEffective ? meta.intraCapacityJP : 0) + (meta?.koJP ?? 0) + (meta?.reservedForCadangan ?? 0);
              return (
                <td key={`tot-${week.weekNumber}`} className="week-cell">
                  {meta?.isEffective ? totalWeekJP : ""}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>

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
