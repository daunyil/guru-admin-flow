/**
 * PromesLandscapeKurikulumMerdekaDocument — DOCUMENT-CENTRIC FORMAL v5
 *
 * BLUEPRINT REDESIGN: Standar Dinas Pendidikan
 *   Replacing web dashboard style with formal government document layout.
 *
 * Key Changes from v4 → v5:
 *   1. KOP SURAT RESMI: Full letterhead with instansi hierarchy + double border line
 *   2. SERIF TYPOGRAPHY: Times New Roman / Georgia (replacing Arial sans-serif)
 *   3. THICK BORDERS: 1.5px-2px solid black borders (replacing 1px thin slate borders)
 *   4. PASTEL MUTED + KODE: Formal codes [M], [STS], [SAS] with subdued colors
 *   5. SINGLE ALOKASI WAKTU: One column "{totalJP} JP" (no Intra/Koku/Total sub-columns)
 *   6. STRICT JP CALCULATION: 3 JP/week (2 Intra + 1 P5), total semester = 56 JP
 *   7. NO VERTICAL TEXT: Event weeks = CSS bg color only, no vertical text/badges in data cells
 *   8. 25-WEEK DISTRIBUTION: Juli(4), Ags(4), Sep(5), Okt(4), Nov(4), Des(4)
 *   9. A4 LANDSCAPE NATIVE: Precise print margins 8-10mm
 *  10. SIGNATURE BLOCK: Kepala Sekolah & Guru Pengampu (formal tanda tangan)
 */

import {
  DocumentPage,
  DocumentSignature,
} from "@shared/documents";
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
  buildMateriRowsWithElements,
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
  /** KOP-01: Logo sekolah URL. If provided, renders <img> in kop surat; otherwise shows placeholder box. */
  logoUrl?: string;
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
  logoUrl,
}: PromesLandscapeKurikulumMerdekaDocumentProps) {
  /* ---- Pre-compute all shared data ---- */
  const monthGroups = buildPromesMonthGroups(weeks, semester);
  const weekColumns = monthGroups.flatMap((m) => m.weeks);
  const lookup = buildWeekLookup(weeks);
  const elementGroups = buildMateriRowsWithElements(distribution);

  /* ---- Collect unique merdeka events for legend ---- */
  const activeEvents = Array.from(new Set(
    weekColumns
      .map((w) => lookup.weekEventInfoByWeek.get(w.weekNumber)?.merdeka)
      .filter((e): e is MerdekaEventDef => e !== null && e !== undefined)
  ));

  /* ---- Calculate totals ---- */
  const totalJPAll = summary.intraCapacityJP + summary.koTotalJP;

  /* ---- Identity rows (2-column formal layout) ---- */
  const leftIdentity = [
    { label: "Satuan Pendidikan", value: schoolName || "-" },
    { label: "Kelas / Fase", value: `${profile?.grade ?? "-"} / ${profile?.phase ?? "-"}` },
    { label: "Target Kurikulum", value: "Kurikulum Merdeka" },
  ];
  const rightIdentity = [
    { label: "Mata Pelajaran", value: profile?.subject ?? "-" },
    { label: "Semester / Beban", value: `${semester === 1 ? "Ganjil (1)" : "Genap (2)"} / ${options.intraJpPerWeek + options.koJpPerWeek} JP (${options.intraJpPerWeek} Intra + ${options.koJpPerWeek} P5)` },
    { label: "Sistem P5", value: "Reguler Mingguan" },
  ];

  /* ---- Column width for week columns ---- */
  const fixedColWidthPercent = 28;
  const weekColWidthPercent = (100 - fixedColWidthPercent) / weekColumns.length;

  /* ---- Kop Surat hierarchy ---- */
  // The kop surat follows official Indonesian government document format:
  // Pemerintah Kabupaten/Provinsi → Dinas Pendidikan → Satuan Pendidikan
  // We derive regency from schoolRegency prop
  const kopInstansiPemerintah = `PEMERINTAH ${schoolRegency || "KABUPATEN/KOTA"}`;
  const kopDinasPendidikan = "DINAS PENDIDIKAN";
  const kopSatuanPendidikan = schoolName || "SATUAN PENDIDIKAN";

  /* ---- Layout order: Kop → Title → Identity → Table → Legend → Signature ---- */

  return (
    <DocumentPage orientation="landscape" className="promes-landscape-page promes-merdeka-page">

      {/* ===== 1. KOP SURAT RESMI (Standar Dinas Pendidikan) ===== */}
      <div className="promes-merdeka-kop-surat">
        {/* KOP-01/02: Logo box — conditional render: <img> if logoUrl provided, placeholder if not */}
        <div className="promes-merdeka-kop-logo-box">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo sekolah" className="promes-merdeka-kop-logo-img" />
          ) : (
            <div className="promes-merdeka-kop-logo-placeholder">LOGO</div>
          )}
        </div>
        <div className="promes-merdeka-kop-text">
          <div className="promes-merdeka-kop-line promes-merdeka-kop-instansi-1">{kopInstansiPemerintah}</div>
          <div className="promes-merdeka-kop-line promes-merdeka-kop-dinas">{kopDinasPendidikan}</div>
          <div className="promes-merdeka-kop-line promes-merdeka-kop-unit">{kopSatuanPendidikan}</div>
          <div className="promes-merdeka-kop-line promes-merdeka-kop-address">
            {schoolRegency || "Alamat belum tersedia"}
          </div>
        </div>
      </div>
      {/* Double border line — OUTSIDE flex parent so it spans full width */}
      <div className="promes-merdeka-kop-double-border" />

      {/* ===== 2. JUDUL DOKUMEN & TAHUN AJARAN ===== */}
      <div className="promes-merdeka-title-block-doc">
        <div className="promes-merdeka-title-main-doc">PROGRAM SEMESTER (PROMES)</div>
        <div className="promes-merdeka-title-sub-doc">KURIKULUM MERDEKA</div>
        <div className="promes-merdeka-title-year-doc">TAHUN AJARAN {activeYearLabel || "..........."}</div>
      </div>

      {/* ===== 3. TABEL IDENTITAS (2 Kolom Formal — tanpa border luar) ===== */}
      <table className="promes-merdeka-identity-table" style={{ fontFamily: "'Times New Roman', Georgia, serif" }}>
        <tbody>
          {leftIdentity.map((leftRow, i) => {
            const rightRow = rightIdentity[i];
            return (
              <tr key={`identity-${i}`}>
                <td className="promes-merdeka-idt-label">{leftRow.label}</td>
                <td className="promes-merdeka-idt-sep">:</td>
                <td className="promes-merdeka-idt-value">{leftRow.value}</td>
                <td className="promes-merdeka-idt-gap" />
                <td className="promes-merdeka-idt-label">{rightRow?.label ?? ""}</td>
                <td className="promes-merdeka-idt-sep">{rightRow ? ":" : ""}</td>
                <td className="promes-merdeka-idt-value">{rightRow?.value ?? ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ===== 4. TABEL UTAMA MATRIKS PROMES ===== */}
      {/* v5 FIX: overflow container prevents table breaking the document layout on narrow screens */}
      <div className="merdeka-table-container">
      <table className="merdeka-matrix-table" style={{ fontFamily: "'Times New Roman', Georgia, serif", width: "100%", tableLayout: "fixed", borderCollapse: "collapse", boxSizing: "border-box" }}>
        <colgroup>
          <col style={{ width: '7%' }} />   {/* Elemen */}
          <col style={{ width: '5%' }} />   {/* Kode TP */}
          <col style={{ width: '13%' }} />  {/* TP / Materi Pokok */}
          <col style={{ width: '3%' }} />   {/* Alokasi Waktu — SINGLE column */}
          {weekColumns.map((week) => (
            <col key={`col-${week.weekNumber}`} style={{ width: `${weekColWidthPercent.toFixed(2)}%` }} />
          ))}
        </colgroup>

        <thead>
          {/* Header Row 1: Solid dark (#1a1a2e) with white bold text */}
          <tr className="merdeka-header-row">
            <th rowSpan={2} className="merdeka-th merdeka-th-elemen">Elemen</th>
            <th rowSpan={2} className="merdeka-th merdeka-th-kode">Kode TP</th>
            <th rowSpan={2} className="merdeka-th merdeka-th-materi">TP / Materi Pokok</th>
            {/* SINGLE "Alokasi Waktu" column — no Intra/Koku/Total sub-columns */}
            <th rowSpan={2} className="merdeka-th merdeka-th-jp">Alokasi Waktu</th>
            {monthGroups.map((group) => (
              <th key={group.month} colSpan={group.weeks.length} className="merdeka-th merdeka-th-month">
                {group.label}
              </th>
            ))}
          </tr>
          {/* Header Row 2: Week numbers — slightly lighter dark */}
          <tr className="merdeka-subheader-row">
            {weekColumns.map((week) => (
              <th key={`week-head-${week.weekNumber}`} className="merdeka-th merdeka-th-week">
                {week.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {/* ---- Data rows with rowSpan for Elemen ---- */}
          {elementGroups.map((group) => (
            group.tps.map((tp, tpIdx) => {
              return (
                <tr key={tp.key} className={tpIdx % 2 === 0 ? "merdeka-data-row" : "merdeka-data-row merdeka-data-row-alt"}>
                  {/* ELEMEN column — rowSpan across all TP rows in this group */}
                  {tpIdx === 0 && (
                    <td rowSpan={group.tpCount} className="merdeka-td merdeka-td-elemen">
                      {group.namaElemen}
                    </td>
                  )}
                  {/* KODE TP column */}
                  <td className="merdeka-td merdeka-td-kode">{tp.kodeTP}</td>
                  {/* MATERI column */}
                  <td className="merdeka-td merdeka-td-materi">{tp.materi}</td>
                  {/* SINGLE Alokasi Waktu = "{totalJP} JP" */}
                  <td className="merdeka-td merdeka-td-jp">{tp.totalJP} JP</td>

                  {/* Schedule cells: NO badge, NO vertical text.
                      Event weeks = CSS background ONLY, content = null/empty.
                      Non-event weeks = numeric JP or "-" */}
                  {weekColumns.map((week) => {
                    const cell = resolveMerdekaWeekCell(lookup, week.weekNumber, "materi", tp.unitId);
                    return (
                      <td
                        key={`${tp.key}-${week.weekNumber}`}
                        className={cell.className}
                        title={cell.title}
                      >
                        {cell.content}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          ))}

          {/* ---- Cadangan row — colSpan=3 consistent with Total/Agenda rows ---- */}
          <tr className="merdeka-cadangan-row">
            <td colSpan={3} className="merdeka-td merdeka-td-label-cadangan">Jam Cadangan / Remedial / Pengayaan</td>
            <td className="merdeka-td merdeka-td-jp-cadangan">{summary.cadanganJP} JP</td>
            {weekColumns.map((week) => {
              const cell = resolveMerdekaWeekCell(lookup, week.weekNumber, "cadangan");
              return <td key={`cad-${week.weekNumber}`} className={cell.className}>{cell.content}</td>;
            })}
          </tr>

          {/* ---- Kokurikuler row (P5) — colSpan=3 consistent with Total/Agenda ---- */}
          {summary.koTotalJP > 0 && (
            <tr className="merdeka-koku-row">
              <td colSpan={3} className="merdeka-td merdeka-td-label-koku">Kokurikuler (Projek Penguatan Profil Pelajar Pancasila / P5)</td>
              <td className="merdeka-td merdeka-td-jp-koku">{summary.koTotalJP} JP</td>
              {weekColumns.map((week) => {
                const cell = resolveMerdekaWeekCell(lookup, week.weekNumber, "kokurikuler");
                return <td key={`ko-${week.weekNumber}`} className={cell.className}>{cell.content}</td>;
              })}
            </tr>
          )}

          {/* ---- Total row — STRICT sum: 3 JP/week on KBM, "-" on event weeks ---- */}
          <tr className="merdeka-total-row">
            <td colSpan={3} className="merdeka-td merdeka-td-total-label">
              JUMLAH JP PER MINGGU (INTRA {options.intraJpPerWeek} JP + P5 {options.koJpPerWeek} JP)
            </td>
            <td className="merdeka-td merdeka-td-jp-total">{totalJPAll} JP</td>
            {weekColumns.map((week) => {
              const cell = resolveMerdekaWeekCell(lookup, week.weekNumber, "total");
              return <td key={`tot-${week.weekNumber}`} className={cell.className}>{cell.content}</td>;
            })}
          </tr>

          {/* ---- Agenda Non-KBM row — BADGES ONLY HERE ---- */}
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
      </div>

      {/* ===== 5. KETERANGAN LEGENDA AGENDA NON-KBM (Di bawah tabel utama) ===== */}
      <div className="merdeka-legend-block">
        <div className="merdeka-legend-title">Keterangan Warna & Kode Agenda Sekolah:</div>
        <div className="merdeka-legend-grid">
          {activeEvents.map((ev) => (
            <div key={ev.key} className="merdeka-legend-item">
              <span className={`merdeka-badge ${ev.badgeClass}`}>{ev.label}</span>
              <span className="merdeka-legend-text">{ev.title}</span>
            </div>
          ))}
        </div>
      </div>

      {status !== "valid" && (
        <p className="promes-warning">
          Promes belum lengkap: {summary.undistributedJP} JP materi belum terdistribusi.
        </p>
      )}

      {/* ===== 6. BLOK TANDA TANGAN FORMAL ===== */}
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
