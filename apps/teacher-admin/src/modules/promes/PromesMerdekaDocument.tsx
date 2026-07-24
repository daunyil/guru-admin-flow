/**
 * PromesLandscapeKurikulumMerdekaDocument — Kurikulum Merdeka format
 *
 * REWRITE: Simplified using shared helpers:
 *   - buildWeekLookup() instead of building Maps inline
 *   - buildMateriRows() instead of inline materi row construction
 *   - resolveMerdekaWeekCell() instead of scattered badge/background logic
 *   - classifyPromesWeek() for unified event classification
 *
 * Premium styling: Official Kurikulum Merdeka document look with
 * clean header, elegant badge system, and professional print output.
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
  buildWeekLookup,
  buildMateriRows,
  resolveMerdekaWeekCell,
  type MerdekaEventDef,
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
  /* ---- Pre-compute all shared data ---- */
  const monthGroups = buildPromesMonthGroups(weeks, semester);
  const weekColumns = monthGroups.flatMap((m) => m.weeks);
  const lookup = buildWeekLookup(weeks);
  const materiRows = buildMateriRows(distribution);

  /* ---- Collect unique merdeka events for legend ---- */
  const activeEvents = Array.from(new Set(
    weekColumns
      .map((w) => lookup.weekEventInfoByWeek.get(w.weekNumber)?.merdeka)
      .filter((e): e is MerdekaEventDef => e !== null && e !== undefined)
  ));

  /* ---- Identity rows ---- */
  const intraPerWeek = summary.effectiveWeeks > 0 ? Math.round(summary.intraCapacityJP / summary.effectiveWeeks) : 0;
  const kokuPerWeek = summary.koTotalJP > 0 ? Math.round(summary.koTotalJP / summary.effectiveWeeks) : 0;
  const totalPerWeek = summary.effectiveWeeks > 0 ? Math.round((summary.intraCapacityJP + summary.koTotalJP) / summary.effectiveWeeks) : 0;

  const identityRows = [
    { label: "Satuan Pendidikan", value: schoolName || "-" },
    { label: "Mata Pelajaran", value: profile?.subject ?? "-" },
    { label: "Kelas / Fase", value: `${profile?.grade ?? "-"} / ${profile?.phase ?? "-"}` },
    { label: "Semester / Beban", value: `${semester === 1 ? "Ganjil" : "Genap"} (${totalPerWeek} JP/Minggu: Intra ${intraPerWeek} + Koku ${kokuPerWeek})` },
    { label: "Target Kurikulum", value: "Kurikulum Merdeka" },
    { label: "Sistem P5", value: options.koMode === "end_of_week" ? `Reguler Mingguan (${options.koJpPerWeek} JP/Minggu)` : `Blok Akhir Semester (${summary.koTotalJP} JP)` },
    { label: "Tahun Pelajaran", value: activeYearLabel || "-" },
  ];

  /* ---- Calculate totals ---- */
  const totals = {
    intra: summary.distributedJP,
    cadangan: summary.cadanganJP,
    koku: summary.koTotalJP,
    total: summary.intraCapacityJP + summary.cadanganJP + summary.koTotalJP,
  };

  /* ---- Column width for week columns ---- */
  const fixedColWidthPercent = 30;
  const weekColWidthPercent = (100 - fixedColWidthPercent) / weekColumns.length;

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
      <table className="promes-matrix-table merdeka-matrix-table" style={{ fontFamily: "Arial, Helvetica, sans-serif", width: "100%", tableLayout: "fixed", borderCollapse: "collapse", boxSizing: "border-box" }}>
        <colgroup>
          <col style={{ width: '6%' }} />   {/* Elemen */}
          <col style={{ width: '5%' }} />   {/* Kode TP */}
          <col style={{ width: '14%' }} />  {/* Materi Pokok */}
          <col style={{ width: '5%' }} />   {/* Alokasi JP */}
          {weekColumns.map((week) => (
            <col key={`col-${week.weekNumber}`} style={{ width: `${weekColWidthPercent.toFixed(2)}%` }} />
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
                const cell = resolveMerdekaWeekCell(lookup, week.weekNumber, "materi", row.unitId, rowIndex);
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

          {/* ---- Cadangan row (amber) ---- */}
          <tr className="merdeka-cadangan-row">
            <td className="merdeka-td merdeka-td-label-cadangan">Cadangan</td>
            <td className="merdeka-td merdeka-td-cadangan">-</td>
            <td className="merdeka-td merdeka-td-materi-cadangan">Jam Cadangan / Remedial / Pengayaan</td>
            <td className="merdeka-td merdeka-td-jp-cadangan">{totals.cadangan} JP</td>
            {weekColumns.map((week) => {
              const cell = resolveMerdekaWeekCell(lookup, week.weekNumber, "cadangan");
              return <td key={`cad-${week.weekNumber}`} className={cell.className}>{cell.content}</td>;
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
                const cell = resolveMerdekaWeekCell(lookup, week.weekNumber, "kokurikuler");
                return <td key={`ko-${week.weekNumber}`} className={cell.className}>{cell.content}</td>;
              })}
            </tr>
          )}

          {/* ---- Total row ---- */}
          <tr className="merdeka-total-row">
            <td colSpan={3} className="merdeka-td merdeka-td-total-label">
              JUMLAH JAM TOTAL PER MINGGU (Intra {intraPerWeek} JP + Koku {kokuPerWeek} JP)
            </td>
            <td className="merdeka-td merdeka-td-jp-total">{totals.total} JP</td>
            {weekColumns.map((week) => {
              const cell = resolveMerdekaWeekCell(lookup, week.weekNumber, "total");
              return <td key={`tot-${week.weekNumber}`} className={cell.className}>{cell.content}</td>;
            })}
          </tr>

          {/* ---- Agenda row (shows event badges for all weeks) ---- */}
          <tr className="merdeka-agenda-row">
            <td colSpan={3} className="merdeka-td merdeka-td-agenda-label">
              AGENDA NON-KBM / ASESMEN / LIBUR
            </td>
            <td className="merdeka-td merdeka-td-agenda-jp">-</td>
            {weekColumns.map((week) => {
              const cell = resolveMerdekaWeekCell(lookup, week.weekNumber, "agenda");
              return <td key={`agenda-${week.weekNumber}`} className={cell.className}>{cell.content}</td>;
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
