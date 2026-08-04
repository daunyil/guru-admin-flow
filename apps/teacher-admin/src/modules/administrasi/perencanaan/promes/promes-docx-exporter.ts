/**
 * promes-docx-exporter.ts — DOCX exporter for Promes Merdeka (landscape)
 *
 * Sprint 6: Primary output for formal school administration documents.
 * Guru can download .docx, edit margins/font sizes in Word/WPS before printing.
 *
 * Checklist (per user specification):
 *   1. A4 Landscape orientation, narrow margins (720 dxa = 0.5 inch)
 *   2. Matrix table with precise colSpan/rowSpan for month + week headers
 *   3. cantSplit:true on data rows, tblHeader:true on header rows
 *   4. Ink-saver grayscale shading (neutral hex colors)
 *   5. Arial/Calibri font (universal on all laptops)
 *   6. Borderless signature block table (2 columns, Kepala + Guru)
 *
 * Reuses pure helpers from promes-helpers.tsx:
 *   - buildPromesMonthGroups, buildWeekLookup, buildMateriRows
 *   - resolveMerdekaWeekCell (returns { className, content, title })
 *   - classifyPromesWeek, detectMerdekaEventKind
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  PageOrientation,
  BorderStyle,
  ShadingType,
  VerticalMergeType,
  TableLayoutType,
} from "docx";

import {
  buildPromesMonthGroups,
  buildWeekLookup,
  buildMateriRows,
  type MerdekaEventDef,
  type PromesWeekLookup,
  type WeekCellContext,
} from "./promes-helpers";

import type {
  PromesWeek,
  UnitDistribution,
  PromesSummary,
  ProtaProfile,
  PromesOptions,
} from "@guru-admin/domain";

import { formatLongDateID, todayISODate } from "@guru-admin/shared";

/* ============================================================ */
/*  Types                                                        */
/* ============================================================ */

/** Parameters for Promes Merdeka DOCX export — mirrors React component props. */
export type PromesMerdekaDocxExportParams = {
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

export type PromesDocxExportResult = Blob;

/* ============================================================ */
/*  Constants — DOCX sizing                                      */
/* ============================================================ */

/** Narrow margins for landscape Promes: 0.5 inch = 720 twips (dxa) */
const MARGIN_NARROW_DXA = 720;
const FONT_FAMILY = "Arial";
const FONT_SIZE_TABLE_HEADER = 16; // 8pt
const FONT_SIZE_TABLE_DATA = 14; // 7pt
const FONT_SIZE_TABLE_WEEK_HEAD = 12; // 6pt
const FONT_SIZE_IDENTITY = 18; // 9pt
const FONT_SIZE_TITLE = 24; // 12pt
const FONT_SIZE_SIGNATURE = 16; // 8pt
const FONT_SIZE_SIGNATURE_NAME = 18; // 9pt
const FONT_SIZE_SIGNATURE_NIP = 14; // 7pt

/** Ink-saver grayscale palette */
const SHADE_HEADER_MONTH = "E5E7EB"; // light gray (month header row)
const SHADE_HEADER_WEEK = "F3F4F6"; // lighter gray (week sub-header row)
const SHADE_DATA_ALT = "F9FAFB"; // very light gray (alternating data rows)
const SHADE_CADANGAN = "FEF3C7"; // amber tint for cadangan
const SHADE_KOKURIKULER = "DCFCE7"; // green tint for kokurikuler
const SHADE_TOTAL = "F3F4F6"; // gray for total row
const SHADE_EVENT_DEFAULT = "EFF6FF"; // blue tint (base event bg)

/** Merdeka event background colors for DOCX shading */
const MERDEKA_EVENT_SHADES: Record<string, string> = {
  mpls: "DBEAFE",
  hut: "FEF2F2",
  sts: "EDE9FE",
  sas: "EDE9FE",
  cm: "FEF9C3",
  rl: "FEF2F2",
  remedial: "FFF7ED",
  kokurikuler: "DCFCE7",
  holiday: "F3F4F6",
  other: "F0F9FF",
};

/** Merdeka event text labels for DOCX cells */
const MERDEKA_EVENT_LABELS: Record<string, string> = {
  mpls: "[M]",
  hut: "[H]",
  sts: "[STS]",
  sas: "[SAS]",
  cm: "[CM]",
  rl: "[R/L]",
  remedial: "[Rem]",
  kokurikuler: "[KO]",
  holiday: "[L]",
  other: "[*]",
};

/** Border style for all table cells */
const CELL_BORDER = {
  top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
  left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
  right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
};

/** No border (for signature block) — cast to CELL_BORDER type for TS compatibility */
const NO_BORDER = {
  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
} as unknown as typeof CELL_BORDER;

/* ============================================================ */
/*  Helper: cell shading from className                         */
/* ============================================================ */

/**
 * Map CSS className to DOCX shading hex color.
 * The resolveMerdekaWeekCell() returns CSS classes; we map them to
 * DOCX shading values for the equivalent visual result.
 */
// cellShadingFromClassName removed — DOCX uses resolveDocxWeekCell() directly
// which maps event keys to MERDEKA_EVENT_SHADES without CSS className intermediary.

/**
 * Resolve merdeka week cell content for DOCX (text-only, no React/HTML).
 * Reuses the same pure logic but extracts text content instead of React nodes.
 */
function resolveDocxWeekCell(
  lookup: PromesWeekLookup,
  weekNumber: number,
  context: WeekCellContext,
  unitId?: string,
  rowIndex?: number,
): { text: string; shade: string | undefined; bold: boolean } {
  const eventInfo = lookup.weekEventInfoByWeek.get(weekNumber);
  const merdekaEvent = eventInfo?.merdeka ?? null;
  const week = lookup.weekByNumber.get(weekNumber);
  const isFirstRow = rowIndex === 0;

  // Event weeks
  if (merdekaEvent) {
    const shade = MERDEKA_EVENT_SHADES[merdekaEvent.key] ?? SHADE_EVENT_DEFAULT;
    const label = MERDEKA_EVENT_LABELS[merdekaEvent.key] ?? "[?]";

    if (context === "materi") {
      return { text: isFirstRow ? label : "", shade, bold: false };
    }
    if (context === "agenda") {
      return { text: label, shade, bold: true };
    }
    if (context === "total") {
      return { text: "-", shade, bold: false };
    }
    return { text: "", shade, bold: false };
  }

  // Non-event weeks
  switch (context) {
    case "materi": {
      const unitJP = unitId ? lookup.unitJPByWeek.get(unitId)?.get(weekNumber) ?? 0 : 0;
      return { text: unitJP > 0 ? String(unitJP) : "-", shade: undefined, bold: false };
    }
    case "cadangan":
      return {
        text: (week?.reservedForCadangan ?? 0) > 0 ? String(week!.reservedForCadangan) : "-",
        shade: (week?.reservedForCadangan ?? 0) > 0 ? SHADE_CADANGAN : undefined,
        bold: false,
      };
    case "kokurikuler":
      return {
        text: (week?.koJP ?? 0) > 0 ? String(week!.koJP) : "-",
        shade: (week?.koJP ?? 0) > 0 ? SHADE_KOKURIKULER : undefined,
        bold: false,
      };
    case "total": {
      const totalWeekJP = (week?.isEffective ? week.intraCapacityJP : 0) + (week?.koJP ?? 0) + (week?.reservedForCadangan ?? 0);
      return {
        text: week?.isEffective ? (totalWeekJP > 0 ? String(totalWeekJP) : "-") : "-",
        shade: SHADE_TOTAL,
        bold: true,
      };
    }
    case "agenda":
      return { text: "-", shade: undefined, bold: false };
    default:
      return { text: "", shade: undefined, bold: false };
  }
}

/* ============================================================ */
/*  Cell factory helpers                                         */
/* ============================================================ */

function makeTextCell(
  text: string,
  options?: {
    width?: number;
    shade?: string;
    bold?: boolean;
    fontSize?: number;
    alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
    columnSpan?: number;
    rowSpan?: number;
    verticalMerge?: (typeof VerticalMergeType)[keyof typeof VerticalMergeType];
    borders?: typeof CELL_BORDER;
  },
): TableCell {
  const opts = options ?? {};
  return new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    shading: opts.shade
      ? { type: ShadingType.CLEAR, fill: opts.shade }
      : undefined,
    borders: opts.borders ?? CELL_BORDER,
    columnSpan: opts.columnSpan ?? 1,
    verticalMerge: opts.verticalMerge,
    children: [
      new Paragraph({
        alignment: opts.alignment ?? AlignmentType.CENTER,
        spacing: { before: 20, after: 20 },
        children: [
          new TextRun({
            text,
            bold: opts.bold ?? false,
            font: FONT_FAMILY,
            size: opts.fontSize ?? FONT_SIZE_TABLE_DATA,
          }),
        ],
      }),
    ],
  });
}

function makeHeaderCell(
  text: string,
  options?: {
    width?: number;
    shade?: string;
    columnSpan?: number;
    rowSpan?: number;
    verticalMerge?: (typeof VerticalMergeType)[keyof typeof VerticalMergeType];
    fontSize?: number;
  },
): TableCell {
  return makeTextCell(text, {
    ...options,
    shade: options?.shade ?? SHADE_HEADER_MONTH,
    bold: true,
    fontSize: options?.fontSize ?? FONT_SIZE_TABLE_HEADER,
    alignment: AlignmentType.CENTER,
  });
}

/* ============================================================ */
/*  Main Export Function                                         */
/* ============================================================ */

/**
 * Export Promes Merdeka as DOCX Blob.
 *
 * Creates an A4 Landscape document with:
 * 1. Title & identity section
 * 2. Legend block (event color codes)
 * 3. Matrix table (month headers with colSpan, week subheaders,
 *    materi rows, cadangan/koku/total/agenda rows)
 * 4. Signature block (borderless 2-column table)
 *
 * All pure data logic reused from promes-helpers.tsx.
 * Only the rendering layer is different (docx API vs React/HTML).
 */
export async function exportPromesMerdekaDocx(
  params: PromesMerdekaDocxExportParams,
): Promise<PromesDocxExportResult> {
  const {
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
  } = params;

  /* ---- Pre-compute shared data (same as React component) ---- */
  const monthGroups = buildPromesMonthGroups(weeks, semester);
  const weekColumns = monthGroups.flatMap((m) => m.weeks);
  const lookup = buildWeekLookup(weeks);
  const materiRows = buildMateriRows(distribution);

  /* ---- Collect unique merdeka events for legend ---- */
  const activeEvents = Array.from(new Set(
    weekColumns
      .map((w) => lookup.weekEventInfoByWeek.get(w.weekNumber)?.merdeka)
      .filter((e): e is MerdekaEventDef => e !== null && e !== undefined),
  ));

  /* ---- Identity data ---- */
  const intraPerWeek = summary.effectiveWeeks > 0
    ? Math.round(summary.intraCapacityJP / summary.effectiveWeeks) : 0;
  const kokuPerWeek = summary.koTotalJP > 0
    ? Math.round(summary.koTotalJP / summary.effectiveWeeks) : 0;
  const totalPerWeek = summary.effectiveWeeks > 0
    ? Math.round((summary.intraCapacityJP + summary.koTotalJP) / summary.effectiveWeeks) : 0;

  const totals = {
    intra: summary.distributedJP,
    cadangan: summary.cadanganJP,
    koku: summary.koTotalJP,
    total: summary.intraCapacityJP + summary.cadanganJP + summary.koTotalJP,
  };

  /* ---- Calculate column widths (DXA units) ---- */
  // A4 Landscape printable width = 297mm - margins
  // With narrow margins (0.5 inch each side), printable area ≈ 257mm
  // In DXA: 1mm ≈ 567 dxa, so 257mm ≈ 145,519 dxa
  // Fixed columns: Elemen(6%), Kode(5%), Materi(14%), JP(5%) = 30%
  // Week columns share remaining 70%
  const TOTAL_TABLE_DXA = 14550; // approximate for landscape narrow margins
  const FIXED_COL_DXA = Math.round(TOTAL_TABLE_DXA * 0.30);
  const ELEMEN_COL_DXA = Math.round(FIXED_COL_DXA * 0.20); // 6% of total
  const KODE_COL_DXA = Math.round(FIXED_COL_DXA * 0.17); // 5% of total
  const MATERI_COL_DXA = Math.round(FIXED_COL_DXA * 0.47); // 14% of total
  const JP_COL_DXA = Math.round(FIXED_COL_DXA * 0.17); // 5% of total
  const WEEK_COL_DXA = weekColumns.length > 0
    ? Math.round((TOTAL_TABLE_DXA - FIXED_COL_DXA) / weekColumns.length) : 300;

  /* ============================================================ */
  /*  Build Document Sections                                     */
  /* ============================================================ */

  /* ---- Section 1: Title ---- */
  const titleParagraphs: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: `PROGRAM SEMESTER (PROMES) KURIKULUM MERDEKA`,
          bold: true,
          font: FONT_FAMILY,
          size: FONT_SIZE_TITLE,
          allCaps: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `TAHUN AJARAN ${activeYearLabel || "..........."}`,
          bold: true,
          font: FONT_FAMILY,
          size: FONT_SIZE_IDENTITY,
        }),
      ],
    }),
  ];

  /* ---- Section 2: Identity Table ---- */
  const identityRowsData = [
    { label: "Satuan Pendidikan", value: schoolName || "-" },
    { label: "Mata Pelajaran", value: profile?.subject ?? "-" },
    { label: "Kelas / Fase", value: `${profile?.grade ?? "-"} / ${profile?.phase ?? "-"}` },
    { label: "Semester / Beban", value: `${semester === 1 ? "Ganjil" : "Genap"} (${totalPerWeek} JP/Minggu: Intra ${intraPerWeek} + Koku ${kokuPerWeek})` },
    { label: "Target Kurikulum", value: "Kurikulum Merdeka" },
    { label: "Sistem P5", value: options.koMode === "end_of_week" ? `Reguler Mingguan (${options.koJpPerWeek} JP/Minggu)` : `Blok Akhir Semester (${summary.koTotalJP} JP)` },
    { label: "Tahun Pelajaran", value: activeYearLabel || "-" },
  ];

  const identityTableRows = identityRowsData.map((row) =>
    new TableRow({
      children: [
        makeTextCell(row.label, {
          width: 2400,
          bold: true,
          fontSize: FONT_SIZE_IDENTITY,
          alignment: AlignmentType.LEFT,
          borders: NO_BORDER,
        }),
        makeTextCell(": " + row.value, {
          width: 7000,
          fontSize: FONT_SIZE_IDENTITY,
          alignment: AlignmentType.LEFT,
          borders: NO_BORDER,
        }),
      ],
    }),
  );

  const identityTable = new Table({
    rows: identityTableRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
  });

  /* ---- Section 3: Legend Block ---- */
  const legendParagraphs: Paragraph[] = [
    new Paragraph({
      spacing: { before: 200, after: 40 },
      children: [
        new TextRun({
          text: "Keterangan Warna & Kode Agenda Sekolah:",
          bold: true,
          font: FONT_FAMILY,
          size: FONT_SIZE_IDENTITY,
        }),
      ],
    }),
    ...activeEvents.map((ev) =>
      new Paragraph({
        spacing: { before: 20, after: 20 },
        children: [
          new TextRun({
            text: `${MERDEKA_EVENT_LABELS[ev.key] ?? ev.label} `,
            bold: true,
            font: FONT_FAMILY,
            size: FONT_SIZE_TABLE_DATA,
          }),
          new TextRun({
            text: `= ${ev.title}`,
            font: FONT_FAMILY,
            size: FONT_SIZE_TABLE_DATA,
          }),
        ],
      }),
    ),
  ];

  /* ============================================================ */
  /*  Section 4: Matrix Table (the big one)                       */
  /* ============================================================ */

  const matrixRows: TableRow[] = [];

  /* ---- Header Row 1: fixed columns + month headers (colSpan) ---- */
  const headerRow1Cells: TableCell[] = [
    makeHeaderCell("Elemen", { width: ELEMEN_COL_DXA, rowSpan: 2, verticalMerge: VerticalMergeType.RESTART }),
    makeHeaderCell("Kode TP", { width: KODE_COL_DXA, rowSpan: 2, verticalMerge: VerticalMergeType.RESTART }),
    makeHeaderCell("TP / Materi Pokok", { width: MATERI_COL_DXA, rowSpan: 2, verticalMerge: VerticalMergeType.RESTART }),
    makeHeaderCell("Alokasi JP", { width: JP_COL_DXA, rowSpan: 2, verticalMerge: VerticalMergeType.RESTART }),
    ...monthGroups.map((group) =>
      makeHeaderCell(group.label, {
        columnSpan: group.weeks.length,
        shade: SHADE_HEADER_MONTH,
        fontSize: FONT_SIZE_TABLE_HEADER,
      }),
    ),
  ];
  matrixRows.push(new TableRow({
    tableHeader: true,
    children: headerRow1Cells,
  }));

  /* ---- Header Row 2: week sub-headers (continues rowSpan from row 1) ---- */
  const headerRow2Cells: TableCell[] = [
    // Continuation cells for rowSpan=2 columns (RESTART was in row 1)
    makeTextCell("", { width: ELEMEN_COL_DXA, verticalMerge: VerticalMergeType.CONTINUE, borders: CELL_BORDER }),
    makeTextCell("", { width: KODE_COL_DXA, verticalMerge: VerticalMergeType.CONTINUE, borders: CELL_BORDER }),
    makeTextCell("", { width: MATERI_COL_DXA, verticalMerge: VerticalMergeType.CONTINUE, borders: CELL_BORDER }),
    makeTextCell("", { width: JP_COL_DXA, verticalMerge: VerticalMergeType.CONTINUE, borders: CELL_BORDER }),
    ...weekColumns.map((week) =>
      makeHeaderCell(week.label, {
        width: WEEK_COL_DXA,
        shade: SHADE_HEADER_WEEK,
        fontSize: FONT_SIZE_TABLE_WEEK_HEAD,
      }),
    ),
  ];
  matrixRows.push(new TableRow({
    tableHeader: true,
    children: headerRow2Cells,
  }));

  /* ---- Materi data rows ---- */
  materiRows.forEach((row, rowIndex) => {
    const altShade = rowIndex % 2 === 1 ? SHADE_DATA_ALT : undefined;
    const dataCells: TableCell[] = [
      makeTextCell(row.elemen, {
        width: ELEMEN_COL_DXA,
        shade: altShade,
        fontSize: FONT_SIZE_TABLE_DATA,
        alignment: AlignmentType.LEFT,
      }),
      makeTextCell(row.kodeTP, {
        width: KODE_COL_DXA,
        shade: altShade,
        fontSize: FONT_SIZE_TABLE_DATA,
        alignment: AlignmentType.CENTER,
      }),
      makeTextCell(row.materi, {
        width: MATERI_COL_DXA,
        shade: altShade,
        fontSize: FONT_SIZE_TABLE_DATA,
        alignment: AlignmentType.LEFT,
      }),
      makeTextCell(`${row.totalJP} JP`, {
        width: JP_COL_DXA,
        shade: altShade,
        fontSize: FONT_SIZE_TABLE_DATA,
        alignment: AlignmentType.CENTER,
      }),
      ...weekColumns.map((week) => {
        const cell = resolveDocxWeekCell(lookup, week.weekNumber, "materi", row.unitId, rowIndex);
        return makeTextCell(cell.text, {
          width: WEEK_COL_DXA,
          shade: cell.shade ?? altShade,
          bold: cell.bold,
          fontSize: cell.text ? FONT_SIZE_TABLE_DATA : FONT_SIZE_TABLE_DATA,
          alignment: AlignmentType.CENTER,
        });
      }),
    ];

    matrixRows.push(new TableRow({
      cantSplit: true,
      children: dataCells,
    }));
  });

  /* ---- Cadangan row ---- */
  const cadanganCells: TableCell[] = [
    makeTextCell("Cadangan", { width: ELEMEN_COL_DXA, shade: SHADE_CADANGAN, bold: true, fontSize: FONT_SIZE_TABLE_DATA, alignment: AlignmentType.LEFT, columnSpan: 2 }),
    makeTextCell("", { width: KODE_COL_DXA, shade: SHADE_CADANGAN, fontSize: FONT_SIZE_TABLE_DATA }), // merged, won't display
    makeTextCell("Jam Cadangan / Remedial / Pengayaan", { width: MATERI_COL_DXA, shade: SHADE_CADANGAN, fontSize: FONT_SIZE_TABLE_DATA, alignment: AlignmentType.LEFT }),
    makeTextCell(`${totals.cadangan} JP`, { width: JP_COL_DXA, shade: SHADE_CADANGAN, bold: true, fontSize: FONT_SIZE_TABLE_DATA, alignment: AlignmentType.CENTER }),
    ...weekColumns.map((week) => {
      const cell = resolveDocxWeekCell(lookup, week.weekNumber, "cadangan");
      return makeTextCell(cell.text, {
        width: WEEK_COL_DXA,
        shade: SHADE_CADANGAN,
        bold: cell.bold,
        fontSize: FONT_SIZE_TABLE_DATA,
        alignment: AlignmentType.CENTER,
      });
    }),
  ];
  matrixRows.push(new TableRow({ cantSplit: true, children: cadanganCells }));

  /* ---- Kokurikuler row ---- */
  if (summary.koTotalJP > 0) {
    const kokuCells: TableCell[] = [
      makeTextCell("Kokurikuler", { width: ELEMEN_COL_DXA, shade: SHADE_KOKURIKULER, bold: true, fontSize: FONT_SIZE_TABLE_DATA, alignment: AlignmentType.LEFT, columnSpan: 2 }),
      makeTextCell("", { width: KODE_COL_DXA, shade: SHADE_KOKURIKULER, fontSize: FONT_SIZE_TABLE_DATA }), // merged
      makeTextCell(`Projek Penguatan Profil Pelajar Pancasila (P5) — ${options.koMode === "end_of_week" ? "Sistem Reguler" : "Blok Akhir Semester"}`, {
        width: MATERI_COL_DXA, shade: SHADE_KOKURIKULER, fontSize: FONT_SIZE_TABLE_DATA, alignment: AlignmentType.LEFT,
      }),
      makeTextCell(`${totals.koku} JP`, { width: JP_COL_DXA, shade: SHADE_KOKURIKULER, bold: true, fontSize: FONT_SIZE_TABLE_DATA, alignment: AlignmentType.CENTER }),
      ...weekColumns.map((week) => {
        const cell = resolveDocxWeekCell(lookup, week.weekNumber, "kokurikuler");
        return makeTextCell(cell.text, {
          width: WEEK_COL_DXA,
          shade: SHADE_KOKURIKULER,
          bold: cell.bold,
          fontSize: FONT_SIZE_TABLE_DATA,
          alignment: AlignmentType.CENTER,
        });
      }),
    ];
    matrixRows.push(new TableRow({ cantSplit: true, children: kokuCells }));
  }

  /* ---- Total row ---- */
  const totalLabelColSpan = 3;
  const totalCells: TableCell[] = [
    makeTextCell(`JUMLAH JAM TOTAL PER MINGGU (Intra ${intraPerWeek} JP + Koku ${kokuPerWeek} JP)`, {
      columnSpan: totalLabelColSpan,
      shade: SHADE_TOTAL,
      bold: true,
      fontSize: FONT_SIZE_TABLE_DATA,
      alignment: AlignmentType.LEFT,
    }),
    // 2 empty cells consumed by columnSpan=3 (these won't be rendered but needed for cell count)
    makeTextCell("", { width: KODE_COL_DXA, shade: SHADE_TOTAL, fontSize: FONT_SIZE_TABLE_DATA }),
    makeTextCell("", { width: MATERI_COL_DXA, shade: SHADE_TOTAL, fontSize: FONT_SIZE_TABLE_DATA }),
    makeTextCell(`${totals.total} JP`, { width: JP_COL_DXA, shade: SHADE_TOTAL, bold: true, fontSize: FONT_SIZE_TABLE_DATA, alignment: AlignmentType.CENTER }),
    ...weekColumns.map((week) => {
      const cell = resolveDocxWeekCell(lookup, week.weekNumber, "total");
      return makeTextCell(cell.text, {
        width: WEEK_COL_DXA,
        shade: SHADE_TOTAL,
        bold: cell.bold,
        fontSize: FONT_SIZE_TABLE_DATA,
        alignment: AlignmentType.CENTER,
      });
    }),
  ];
  matrixRows.push(new TableRow({ cantSplit: true, children: totalCells }));

  /* ---- Agenda row ---- */
  const agendaCells: TableCell[] = [
    makeTextCell("AGENDA NON-KBM / ASESMEN / LIBUR", {
      columnSpan: totalLabelColSpan,
      bold: true,
      fontSize: FONT_SIZE_TABLE_DATA,
      alignment: AlignmentType.LEFT,
    }),
    makeTextCell("", { fontSize: FONT_SIZE_TABLE_DATA }),
    makeTextCell("", { fontSize: FONT_SIZE_TABLE_DATA }),
    makeTextCell("-", { width: JP_COL_DXA, fontSize: FONT_SIZE_TABLE_DATA, alignment: AlignmentType.CENTER }),
    ...weekColumns.map((week) => {
      const cell = resolveDocxWeekCell(lookup, week.weekNumber, "agenda");
      return makeTextCell(cell.text, {
        width: WEEK_COL_DXA,
        shade: cell.shade,
        bold: cell.bold,
        fontSize: FONT_SIZE_TABLE_DATA,
        alignment: AlignmentType.CENTER,
      });
    }),
  ];
  matrixRows.push(new TableRow({ cantSplit: true, children: agendaCells }));

  /* ---- Build the matrix table ---- */
  const matrixTable = new Table({
    rows: matrixRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
  });

  /* ============================================================ */
  /*  Section 5: Signature Block (borderless 2-column table)      */
  /* ============================================================ */

  const signatureTable = new Table({
    rows: [
      new TableRow({
        children: [
          makeTextCell(`Mengetahui,\nKepala Sekolah`, { borders: NO_BORDER, alignment: AlignmentType.CENTER, fontSize: FONT_SIZE_SIGNATURE }),
          makeTextCell(`Guru Mata Pelajaran`, { borders: NO_BORDER, alignment: AlignmentType.CENTER, fontSize: FONT_SIZE_SIGNATURE }),
        ],
      }),
      // Space for signature (4 empty lines)
      new TableRow({
        children: [
          makeTextCell("\n\n\n\n", { borders: NO_BORDER, fontSize: FONT_SIZE_SIGNATURE }),
          makeTextCell("\n\n\n\n", { borders: NO_BORDER, fontSize: FONT_SIZE_SIGNATURE }),
        ],
      }),
      new TableRow({
        children: [
          makeTextCell(headmasterName || "........................", { borders: NO_BORDER, bold: true, alignment: AlignmentType.CENTER, fontSize: FONT_SIZE_SIGNATURE_NAME }),
          makeTextCell(teacherName || "........................", { borders: NO_BORDER, bold: true, alignment: AlignmentType.CENTER, fontSize: FONT_SIZE_SIGNATURE_NAME }),
        ],
      }),
      new TableRow({
        children: [
          makeTextCell(`NIP. ${headmasterNip || "........................"}`, { borders: NO_BORDER, alignment: AlignmentType.CENTER, fontSize: FONT_SIZE_SIGNATURE_NIP }),
          makeTextCell(`NIP. ${teacherNip || "........................"}`, { borders: NO_BORDER, alignment: AlignmentType.CENTER, fontSize: FONT_SIZE_SIGNATURE_NIP }),
        ],
      }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
  });

  /* ---- Warning paragraph (if status !== "valid") ---- */
  const warningParagraphs: Paragraph[] = status !== "valid"
    ? [
      new Paragraph({
        spacing: { before: 100 },
        children: [
          new TextRun({
            text: `Promes belum lengkap: ${summary.undistributedJP} JP materi belum terdistribusi.`,
            bold: true,
            font: FONT_FAMILY,
            size: FONT_SIZE_IDENTITY,
            color: "991B1B",
          }),
        ],
      }),
    ]
    : [];

  /* ---- Place/date text under right signature ---- */
  const placeDate = `${schoolRegency || "..........."}, ${formatLongDateID(todayISODate())}`;

  /* ============================================================ */
  /*  Assemble the full Document                                   */
  /* ============================================================ */

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: {
            orientation: PageOrientation.LANDSCAPE,
            width: 297 * 567, // 297mm in DXA (1mm = 567 dxa approx)
            height: 210 * 567, // 210mm in DXA
          },
          margin: {
            top: MARGIN_NARROW_DXA,
            bottom: MARGIN_NARROW_DXA,
            left: MARGIN_NARROW_DXA,
            right: MARGIN_NARROW_DXA,
          },
        },
      },
      children: [
        ...titleParagraphs,
        identityTable,
        ...legendParagraphs,
        new Paragraph({ spacing: { before: 100 }, children: [] }), // spacer
        matrixTable,
        ...warningParagraphs,
        new Paragraph({ spacing: { before: 200 }, children: [] }), // spacer before signature
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: placeDate,
              font: FONT_FAMILY,
              size: FONT_SIZE_SIGNATURE,
            }),
          ],
        }),
        signatureTable,
      ],
    }],
  });

  /* ---- Pack and return Blob ---- */
  const blob = await Packer.toBlob(doc);
  return blob;
}

/* ============================================================ */
/*  Download helper (creates <a> element, triggers download)     */
/* ============================================================ */

// downloadDocxBlob moved to @shared/exporters/download-helpers.ts
