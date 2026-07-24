/**
 * PROMES-VARIASI-01: Kurikulum Merdeka format
 *
 * PromesLandscapeKurikulumMerdekaDocument — landscape-oriented document that renders:
 *   - Color-coded event badges (MerdekaEventDef)
 *   - Kode TP + Elemen columns
 *   - Separate Cadangan / Kokurikuler / Total / Agenda rows
 *   - Signature block with NIP
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
  PromesSummary,
  ProtaProfile,
  PromesOptions,
} from "@guru-admin/domain";
import {
  buildPromesMonthGroups,
  compactPromesMaterial,
  compactPromesElemen,
  type MerdekaEventDef,
  detectMerdekaEventKind,
} from "./promes-helpers";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";

/* ---- Props type ---- */
export type PromesLandscapeKurikulumMerdekaDocumentProps = {
  weeks: PromesWeek[];
  distribution: UnitDistribution[];
  summary: PromesSummary;
  status: "valid" | "needs_fix";
  semester: 1 | 2;
  activeYearLabel: string;
  schoolName: string;
  schoolRegency: string;
  headmasterName: string;
  headmasterNip: string;
  teacherName: string;
  teacherNip: string;
  profile: ProtaProfile | null;
  options: PromesOptions;
};

export function PromesLandscapeKurikulumMerdekaDocument({
  weeks,
  distribution,
  summary,
  status,
  semester,
  activeYearLabel,
  schoolName,
  schoolRegency,
  headmasterName,
  headmasterNip,
  teacherName,
  teacherNip,
  profile,
  options,
}: PromesLandscapeKurikulumMerdekaDocumentProps) {
  const monthGroups = buildPromesMonthGroups(weeks, semester);
  const weekColumns = monthGroups.flatMap((m) => m.weeks);

  // Build event map: weekNumber → MerdekaEventDef
  const eventByWeekNumber = new Map<number, MerdekaEventDef | null>(
    weeks.map((week) => [week.weekNumber, detectMerdekaEventKind(week)])
  );

  // Collect unique events for legend (only ones that actually appear)
  const activeEvents = Array.from(new Set(
    weekColumns
      .map((w) => eventByWeekNumber.get(w.weekNumber))
      .filter((e): e is MerdekaEventDef => e !== null && e !== undefined)
  ));

  /* ---- Build materi rows ---- */
  const materiRows = distribution.length > 0
    ? distribution.map((unit, i) => ({
        key: unit.unitId,
        rowNum: i + 1,
        kodeTP: unit.code
          ? unit.code
          : unit.learningOutcome
            ? compactPromesMaterial(unit.learningOutcome, 3)
            : compactPromesElemen(unit.title, 3),
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
    : [{ key: "empty", rowNum: 1, kodeTP: "-", elemen: "-", materi: "Belum ada materi terdistribusi", intraJP: 0, totalJP: 0, unitId: "" }];

  // Build lookup: unitId → weekNumber → JP
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

  /* Identity rows */
  const identityRows = [
    { label: "Satuan Pendidikan", value: schoolName || "-" },
    { label: "Mata Pelajaran", value: profile?.subject ?? "-" },
    { label: "Kelas / Fase", value: `${profile?.grade ?? "-"} / ${profile?.phase ?? "-"}` },
    { label: "Semester / Beban", value: `${semester === 1 ? "Ganjil" : "Genap"} (${summary.effectiveWeeks > 0 ? Math.round((summary.intraCapacityJP + summary.koTotalJP) / summary.effectiveWeeks) : 0} JP/Minggu: Intra ${summary.effectiveWeeks > 0 ? Math.round(summary.intraCapacityJP / summary.effectiveWeeks) : 0} + Koku ${summary.koTotalJP > 0 ? Math.round(summary.koTotalJP / summary.effectiveWeeks) : 0})` },
    { label: "Target Kurikulum", value: "Kurikulum Merdeka" },
    { label: "Sistem P5", value: options.koMode === "end_of_week" ? `Reguler Mingguan (${options.koJpPerWeek} JP/Minggu)` : `Blok Akhir Semester (${summary.koTotalJP} JP)` },
    { label: "Tahun Pelajaran", value: activeYearLabel || "-" },
  ];

  /* Calculate totals */
  const totals = {
    intra: summary.distributedJP,
    cadangan: summary.cadanganJP,
    koku: summary.koTotalJP,
    total: summary.intraCapacityJP + summary.cadanganJP + summary.koTotalJP,
  };

  return (
    <DocumentPage orientation="landscape" className="promes-landscape-page promes-merdeka-page">
      <DocumentTitle title={`PROGRAM SEMESTER (PROMES) KURIKULUM MERDEKA`} subtitle={`TAHUN AJARAN ${activeYearLabel || "..........."}`} />
      <DocumentIdentityTable rows={identityRows} columns={2} />

      {/* ---- Legend Block ---- */}
      <div className="merdeka-legend-block">
        <div className="merdeka-legend-title">Keterangan Warna & Kode Agenda Sekolah:</div>
        <div className="merdeka-legend-grid">
          {activeEvents.map((ev) => (
            <div key={ev.key} className="merdeka-legend-item">
              <span className={`merdeka-badge ${ev.badgeClass}`}>{ev.label}</span>
              <span>{ev.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ---- Matrix Table ---- */}
      <table
        className="promes-matrix-table merdeka-matrix-table"
        style={{
          fontFamily: "Arial, Helvetica, sans-serif",
          width: "100%",
          tableLayout: "fixed",
          borderCollapse: "collapse",
          boxSizing: "border-box",
        }}
      >
        <colgroup>
          <col style={{ width: '6%' }} />   {/* Elemen */}
          <col style={{ width: '5%' }} />   {/* Kode TP */}
          <col style={{ width: '14%' }} />  {/* Materi Pokok */}
          <col style={{ width: '5%' }} />   {/* Alokasi JP */}
          {weekColumns.map((week) => (
            <col key={`col-${week.weekNumber}`} style={{ width: `${((100 - 30) / weekColumns.length).toFixed(2)}%` }} />
          ))}
        </colgroup>
        <thead>
          <tr className="merdeka-header-row">
            <th rowSpan={2} className="merdeka-th">Elemen</th>
            <th rowSpan={2} className="merdeka-th">Kode TP</th>
            <th rowSpan={2} className="merdeka-th merdeka-th-materi">TP / Materi Pokok</th>
            <th rowSpan={2} className="merdeka-th">Alokasi JP</th>
            {monthGroups.map((group) => (
              <th key={group.month} colSpan={group.weeks.length} className="merdeka-th merdeka-th-month">
                {group.label}
              </th>
            ))}
          </tr>
          <tr className="merdeka-subheader-row">
            {weekColumns.map((week) => (
              <th key={`week-head-${week.weekNumber}`} className="merdeka-th merdeka-th-week">
                {week.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {/* ---- Materi data rows ---- */}
          {materiRows.map((row, rowIndex) => (
            <tr key={row.key} className="merdeka-data-row">
              <td className="merdeka-td merdeka-td-elemen">{row.elemen}</td>
              <td className="merdeka-td merdeka-td-kode">{row.kodeTP}</td>
              <td className="merdeka-td merdeka-td-materi">{row.materi}</td>
              <td className="merdeka-td merdeka-td-jp">{row.totalJP} JP</td>
              {weekColumns.map((week) => {
                const event = eventByWeekNumber.get(week.weekNumber);
                if (event) {
                  const isFirstRow = rowIndex === 0;
                  return (
                    <td
                      key={`${row.key}-${week.weekNumber}`}
                      className={`merdeka-td ${event.colClass}`}
                      title={event.title}
                    >
                      {isFirstRow ? <span className={`merdeka-badge ${event.badgeClass}`}>{event.label}</span> : ""}
                    </td>
                  );
                }
                const unitJP = getUnitJPInWeek(row.unitId, week.weekNumber);
                return (
                  <td
                    key={`${row.key}-${week.weekNumber}`}
                    className="merdeka-td"
                  >
                    {unitJP > 0 ? unitJP : "-"}
                  </td>
                );
              })}
            </tr>
          ))}

          {/* ---- Cadangan row (amber) ---- */}
          <tr className="merdeka-cadangan-row">
            <td className="merdeka-td merdeka-td-label-cadangan">Cadangan</td>
            <td className="merdeka-td merdeka-td-cadangan">-</td>
            <td className="merdeka-td merdeka-td-materi-cadangan">Jam Cadangan / Remedial / Pengayaan</td>
            <td className="merdeka-td merdeka-td-jp-cadangan">{totals.cadangan} JP</td>
            {weekColumns.map((week) => {
              const meta = weekMeta(week.weekNumber);
              const event = eventByWeekNumber.get(week.weekNumber);
              if (event) {
                return <td key={`cad-${week.weekNumber}`} className={`merdeka-td ${event.colClass}`}></td>;
              }
              return (
                <td key={`cad-${week.weekNumber}`} className="merdeka-td merdeka-td-cadangan">
                  {(meta?.reservedForCadangan ?? 0) > 0 ? "C" : "-"}
                </td>
              );
            })}
          </tr>

          {/* ---- Kokurikuler row (emerald) ---- */}
          {summary.koTotalJP > 0 && (
            <tr className="merdeka-koku-row">
              <td className="merdeka-td merdeka-td-label-koku">Kokurikuler</td>
              <td className="merdeka-td merdeka-td-koku">P5</td>
              <td className="merdeka-td merdeka-td-materi-koku">
                Projek Penguatan Profil Pelajar Pancasila (P5) — {options.koMode === "end_of_week" ? "Sistem Reguler" : "Blok Akhir Semester"}
              </td>
              <td className="merdeka-td merdeka-td-jp-koku">{totals.koku} JP</td>
              {weekColumns.map((week) => {
                const meta = weekMeta(week.weekNumber);
                const event = eventByWeekNumber.get(week.weekNumber);
                if (event) {
                  return <td key={`ko-${week.weekNumber}`} className={`merdeka-td ${event.colClass}`}></td>;
                }
                return (
                  <td key={`ko-${week.weekNumber}`} className="merdeka-td merdeka-td-koku-val">
                    {(meta?.koJP ?? 0) > 0 ? meta!.koJP : "-"}
                  </td>
                );
              })}
            </tr>
          )}

          {/* ---- Total row ---- */}
          <tr className="merdeka-total-row">
            <td colSpan={3} className="merdeka-td merdeka-td-total-label">
              JUMLAH JAM TOTAL PER MINGGU (Intra {summary.effectiveWeeks > 0 ? Math.round(summary.intraCapacityJP / summary.effectiveWeeks) : 0} JP + Koku {summary.koTotalJP > 0 ? Math.round(summary.koTotalJP / summary.effectiveWeeks) : 0} JP)
            </td>
            <td className="merdeka-td merdeka-td-jp-total">{totals.total} JP</td>
            {weekColumns.map((week) => {
              const meta = weekMeta(week.weekNumber);
              const event = eventByWeekNumber.get(week.weekNumber);
              if (event) {
                return <td key={`tot-${week.weekNumber}`} className="merdeka-td merdeka-td-total-event">-</td>;
              }
              const totalWeekJP = (meta?.isEffective ? meta.intraCapacityJP : 0) + (meta?.koJP ?? 0) + (meta?.reservedForCadangan ?? 0);
              return (
                <td key={`tot-${week.weekNumber}`} className="merdeka-td merdeka-td-total-val">
                  {meta?.isEffective ? (totalWeekJP > 0 ? totalWeekJP : "-") : "-"}
                </td>
              );
            })}
          </tr>

          {/* ---- Agenda row (shows event badges for all weeks) ---- */}
          <tr className="merdeka-agenda-row">
            <td colSpan={3} className="merdeka-td merdeka-td-agenda-label">
              AGENDA NON-KBM / ASESMEN / LIBUR
            </td>
            <td className="merdeka-td merdeka-td-agenda-jp">-</td>
            {weekColumns.map((week) => {
              const event = eventByWeekNumber.get(week.weekNumber);
              if (event) {
                return (
                  <td key={`agenda-${week.weekNumber}`} className="merdeka-td merdeka-td-agenda-cell">
                    <span className={`merdeka-badge ${event.badgeClass}`}>{event.label}</span>
                  </td>
                );
              }
              return <td key={`agenda-${week.weekNumber}`} className="merdeka-td">-</td>;
            })}
          </tr>
        </tbody>
      </table>

      {status !== "valid" && (
        <p className="promes-warning">
          Promes belum lengkap: {summary.undistributedJP} JP materi belum terdistribusi.
        </p>
      )}

      <DocumentSignature
        left={{
          role: "Mengetahui,\nKepala Sekolah",
          name: headmasterName,
          nip: headmasterNip,
        }}
        right={{
          role: "Guru Mata Pelajaran",
          name: teacherName,
          nip: teacherNip,
          placeDate: `${schoolRegency || "..........."}, ${formatLongDateID(todayISODate())}`,
        }}
      />
    </DocumentPage>
  );
}
