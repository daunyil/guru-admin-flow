/**
 * rekap-semester-docx-exporter.ts — DOCX exporter for Rekap Semester (3 formats).
 *
 * Sprint 6: Primary output for formal school administration documents.
 * Guru can download .docx, edit margins/font sizes in Word/WPS before printing.
 *
 * FORMAT-1: Absensi Kehadiran Bulanan (Wali Kelas & Guru Piket)
 *   - 31 kolom tanggal per bulan + rekap S | I | A | JLH
 *
 * FORMAT-2: Daftar Hadir Tatap Muka (Guru Mata Pelajaran)
 *   - 1–40 Pertemuan + Rekap S | I | A | Ket.
 *
 * FORMAT-3: Penilaian Pengetahuan (Guru Mata Pelajaran)
 *   - PA multi-level header (Ulangan + Tugas per KD, PTS, PAS, Ket.)
 *
 * Checklist (per user specification):
 *   1. A4 Landscape orientation, narrow margins (720 dxa = 0.5 inch)
 *   2. Matrix table with precise colSpan/rowSpan for multi-level headers
 *   3. cantSplit:true on data rows, tblHeader:true on header rows
 *   4. Ink-saver grayscale shading (#E5E7EB / #F3F4F6)
 *   5. Arial font (universal on all laptops)
 *   6. Borderless signature block table (2 columns, Kepala Sekolah + Guru)
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
  TableLayoutType,
} from "docx";

import type {
  MonthlyAttendanceMatrix,
  TatapMukaAttendanceMatrix,
  JurnalMatrix,
} from "../../modules/1-harian/rekap-semester/hooks/useSemesterAggregator";

import type { StudentGradeRecord, GradeBook } from "@guru-admin/domain";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";

/* ============================================================ */
/*  Types                                                        */
/* ============================================================ */

export type RekapDocxFormat = "absensi_bulanan" | "tatap_muka" | "nilai" | "jurnal_mengajar";

/** Common metadata shared across all 3 formats */
export type RekapDocxMeta = {
  schoolName: string;
  schoolVillage?: string;
  schoolDistrict?: string;
  yearLabel: string;
  classLabel: string;
  teacherName: string;
  /** For FORMAT-2 & FORMAT-3 only */
  subject?: string;
  semester?: 1 | 2;
  headmasterName?: string;
  headmasterNip?: string;
  teacherNip?: string;
};

export type AbsensiBulananDocxParams = {
  format: "absensi_bulanan";
  meta: RekapDocxMeta;
  matrix: MonthlyAttendanceMatrix;
  teacherRole?: string; // "Wali Kelas" or "Guru Piket"
};

export type TatapMukaDocxParams = {
  format: "tatap_muka";
  meta: RekapDocxMeta;
  matrix: TatapMukaAttendanceMatrix;
  attendanceThreshold?: number;
};

export type NilaiDocxParams = {
  format: "nilai";
  meta: RekapDocxMeta;
  records: StudentGradeRecord[];
  gradeBook: GradeBook | null;
};

export type JurnalDocxParams = {
  format: "jurnal_mengajar";
  meta: RekapDocxMeta;
  matrix: JurnalMatrix;
};

export type RekapSemesterDocxExportParams =
  | AbsensiBulananDocxParams
  | TatapMukaDocxParams
  | NilaiDocxParams
  | JurnalDocxParams;

export type RekapDocxExportResult = Blob;

/* ============================================================ */
/*  Constants — DOCX sizing                                      */
/* ============================================================ */

/** Narrow margins for landscape: 0.5 inch = 720 twips (dxa) */
const MARGIN_NARROW_DXA = 720;
const FONT_FAMILY = "Arial";
const FONT_SIZE_TITLE = 24; // 12pt
const FONT_SIZE_SUBTITLE = 18; // 9pt
const FONT_SIZE_META = 16; // 8pt
const FONT_SIZE_TABLE_HEADER = 16; // 8pt
const FONT_SIZE_TABLE_DATA = 14; // 7pt
const FONT_SIZE_TABLE_SMALL = 12; // 6pt (date columns, tiny cells)
const FONT_SIZE_SIGNATURE = 16; // 8pt
const FONT_SIZE_SIGNATURE_NAME = 18; // 9pt
const FONT_SIZE_SIGNATURE_NIP = 14; // 7pt

/** Ink-saver grayscale palette */
const SHADE_HEADER_MAIN = "E5E7EB"; // bg-gray-200 equivalent
const SHADE_HEADER_SUB = "F3F4F6"; // bg-gray-100 equivalent
const SHADE_DATA_REKAP = "F9FAFB"; // bg-gray-50 equivalent (rekap columns)
// SHADE_CADANGAN removed — not used in Rekap Semester

/** Border style for all table cells */
const CELL_BORDER = {
  top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
  left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
  right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
};

/** Thick left border (separator between date/perencanaan columns and rekap columns) */
const CELL_BORDER_REKAP_L = {
  top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
  left: { style: BorderStyle.SINGLE, size: 4, color: "000000" }, // thick separator
  right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
};

/** No border (for signature block) */
const NO_BORDER = {
  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};

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
    fontSize?: number;
    borders?: typeof CELL_BORDER;
    alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
  },
): TableCell {
  return makeTextCell(text, {
    ...options,
    shade: options?.shade ?? SHADE_HEADER_MAIN,
    bold: true,
    fontSize: options?.fontSize ?? FONT_SIZE_TABLE_HEADER,
    alignment: options?.alignment ?? AlignmentType.CENTER,
  });
}

/** Status mark: Hadir=blank, Sakit=S, Izin=I, Terlambat=T, Alpa=A */
function statusMarkDocx(status: "present" | "sick" | "excused" | "late" | "absent" | null): string {
  if (status === null) return "";
  if (status === "present") return "";
  if (status === "sick") return "S";
  if (status === "excused") return "I";
  if (status === "late") return "T";
  if (status === "absent") return "A";
  return "";
}

/** Predikat huruf berdasarkan finalScore (standar SMP Indonesia). */
function predikat(finalScore: number | null): string {
  if (finalScore === null) return "";
  if (finalScore >= 90) return "A";
  if (finalScore >= 80) return "B";
  if (finalScore >= 70) return "C";
  return "D";
}

/** Attendance Ket. otomatis: Tuntas/Belum Tuntas */
function attendanceKetDocx(
  meetings: TatapMukaAttendanceMatrix["meetings"],
  studentId: string,
  threshold: number = 0.75,
): string {
  const total = meetings.length;
  if (total === 0) return "-";
  let hadir = 0;
  for (const m of meetings) {
    const s = m.attendanceByStudent[studentId];
    if (s === "present" || s === "late") hadir++;
  }
  return hadir / total >= threshold ? "Tuntas" : "Belum Tuntas";
}

function countStatusDocx(
  meetings: TatapMukaAttendanceMatrix["meetings"],
  studentId: string,
  target: "sick" | "excused" | "absent" | "present" | "late",
): number {
  let c = 0;
  for (const m of meetings) {
    if (m.attendanceByStudent[studentId] === target) c++;
  }
  return c;
}

function fmtScore(v: number | null | undefined): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

/* ============================================================ */
/*  FORMAT-1: Absensi Bulanan DOCX Builder                       */
/* ============================================================ */

function buildAbsensiBulananDocx(params: AbsensiBulananDocxParams): Document {
  const { meta, matrix, teacherRole = "Wali Kelas" } = params;
  const { monthName, year, daysInMonth, students } = matrix;

  /* ---- Title ---- */
  const titleParagraphs: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: `ABSENSI KEHADIRAN BULANAN SISWA/I ${meta.schoolName || "SMP NEGERI 8 BANTAN"}`,
          bold: true,
          font: FONT_FAMILY,
          size: FONT_SIZE_TITLE,
          allCaps: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: `TAHUN PELAJARAN ${meta.yearLabel || year}`,
          bold: true,
          font: FONT_FAMILY,
          size: FONT_SIZE_SUBTITLE,
          allCaps: true,
        }),
      ],
    }),
  ];

  /* ---- Metadata ---- */
  const metaParagraphs: Paragraph[] = [
    new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: `KELAS : ${meta.classLabel || ".........."}`,
          bold: true,
          font: FONT_FAMILY,
          size: FONT_SIZE_META,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: `BULAN : ${monthName}`,
          bold: true,
          font: FONT_FAMILY,
          size: FONT_SIZE_META,
        }),
      ],
    }),
  ];

  /* ---- Table header rows ---- */
  const headerRows: TableRow[] = [];

  // Row 1: Super-header
  // NO(rs2) | NAMA(rs2) | NISN(rs2) | TANGGAL(colspan=daysInMonth) | REKAP(colspan=4)
  const row1Cells: TableCell[] = [
    makeHeaderCell("NO.", { rowSpan: 2, shade: SHADE_HEADER_MAIN, width: 500 }),
    makeHeaderCell("NAMA", { rowSpan: 2, shade: SHADE_HEADER_MAIN, width: 3000, alignment: AlignmentType.LEFT }),
    makeHeaderCell("NISN", { rowSpan: 2, shade: SHADE_HEADER_MAIN, width: 1500, fontSize: FONT_SIZE_TABLE_SMALL }),
    makeHeaderCell("TANGGAL", { columnSpan: daysInMonth, shade: SHADE_HEADER_MAIN }),
    makeHeaderCell("REKAP", { columnSpan: 4, shade: SHADE_HEADER_MAIN, borders: CELL_BORDER_REKAP_L }),
  ];
  headerRows.push(new TableRow({ tableHeader: true, children: row1Cells }));

  // Row 2: Date numbers 1..daysInMonth + S | I | A | JLH
  const row2Cells: TableCell[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    row2Cells.push(makeHeaderCell(String(d), { shade: SHADE_HEADER_SUB, fontSize: FONT_SIZE_TABLE_SMALL, width: 450 }));
  }
  row2Cells.push(makeHeaderCell("S", { shade: SHADE_HEADER_MAIN, width: 500, borders: CELL_BORDER_REKAP_L, fontSize: FONT_SIZE_TABLE_SMALL }));
  row2Cells.push(makeHeaderCell("I", { shade: SHADE_HEADER_MAIN, width: 500, fontSize: FONT_SIZE_TABLE_SMALL }));
  row2Cells.push(makeHeaderCell("A", { shade: SHADE_HEADER_MAIN, width: 500, fontSize: FONT_SIZE_TABLE_SMALL }));
  row2Cells.push(makeHeaderCell("JLH", { shade: SHADE_HEADER_MAIN, width: 500, fontSize: FONT_SIZE_TABLE_SMALL }));
  headerRows.push(new TableRow({ tableHeader: true, children: row2Cells }));

  /* ---- Data rows ---- */
  const dataRows: TableRow[] = [];
  for (let idx = 0; idx < students.length; idx++) {
    const s = students[idx];
    const cells: TableCell[] = [];

    // NO
    cells.push(makeTextCell(String(idx + 1), { width: 500, fontSize: FONT_SIZE_TABLE_SMALL }));

    // NAMA
    cells.push(makeTextCell(s.studentName.toUpperCase(), { width: 3000, alignment: AlignmentType.LEFT, fontSize: FONT_SIZE_TABLE_SMALL }));

    // NISN
    cells.push(makeTextCell(s.nisn ?? "", { width: 1500, fontSize: FONT_SIZE_TABLE_SMALL }));

    // Date columns 1..daysInMonth — no colored bg (ink-saver)
    for (let d = 1; d <= daysInMonth; d++) {
      const status = s.statusByDate[d];
      cells.push(makeTextCell(statusMarkDocx(status), { width: 450, bold: true, fontSize: FONT_SIZE_TABLE_SMALL }));
    }

    // Rekap columns: S, I, A, JLH — border-l thick separator + light gray bg
    cells.push(makeTextCell(
      s.rekap.sakit > 0 ? String(s.rekap.sakit) : "",
      { width: 500, shade: SHADE_DATA_REKAP, borders: CELL_BORDER_REKAP_L, bold: true, fontSize: FONT_SIZE_TABLE_SMALL }
    ));
    cells.push(makeTextCell(
      s.rekap.izin > 0 ? String(s.rekap.izin) : "",
      { width: 500, shade: SHADE_DATA_REKAP, bold: true, fontSize: FONT_SIZE_TABLE_SMALL }
    ));
    cells.push(makeTextCell(
      s.rekap.alpa > 0 ? String(s.rekap.alpa) : "",
      { width: 500, shade: SHADE_DATA_REKAP, bold: true, fontSize: FONT_SIZE_TABLE_SMALL }
    ));
    cells.push(makeTextCell(
      s.rekap.jlh > 0 ? String(s.rekap.jlh) : "",
      { width: 500, shade: SHADE_DATA_REKAP, bold: true, fontSize: FONT_SIZE_TABLE_SMALL }
    ));

    dataRows.push(new TableRow({ cantSplit: true, children: cells }));
  }

  /* ---- Assemble matrix table ---- */
  const matrixTable = new Table({
    rows: [...headerRows, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
  });

  /* ---- Signature block (single role: Wali Kelas / Guru Piket) ---- */
  const placeDate = `${meta.schoolVillage || meta.schoolDistrict || "..........."}, ${formatLongDateID(todayISODate())}`;
  const signatureTable = buildSingleSignatureTable(
    teacherRole,
    meta.teacherName,
    meta.teacherNip,
    placeDate,
  );

  /* ---- Assemble full document ---- */
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: {
            orientation: PageOrientation.LANDSCAPE,
            width: 297 * 567,
            height: 210 * 567,
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
        ...metaParagraphs,
        matrixTable,
        new Paragraph({ spacing: { before: 200 }, children: [] }), // spacer before signature
        signatureTable,
      ],
    }],
  });

  return doc;
}

/* ============================================================ */
/*  FORMAT-2: Tatap Muka DOCX Builder                           */
/* ============================================================ */

function buildTatapMukaDocx(params: TatapMukaDocxParams): Document {
  const { meta, matrix, attendanceThreshold = 0.75 } = params;
  const { meetings, students } = matrix;
  const maxMeetings = 40;
  const semesterLabel = meta.semester === 1 ? "Ganjil" : "Genap";

  /* ---- Title ---- */
  const titleParagraphs: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: `DAFTAR HADIR TATAP MUKA SISWA/I ${meta.schoolName || "SMP NEGERI 8 BANTAN"}`,
          bold: true,
          font: FONT_FAMILY,
          size: FONT_SIZE_TITLE,
          allCaps: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: `TAHUN PELAJARAN ${meta.yearLabel || ".........."}`,
          bold: true,
          font: FONT_FAMILY,
          size: FONT_SIZE_SUBTITLE,
          allCaps: true,
        }),
      ],
    }),
  ];

  /* ---- Metadata ---- */
  const metaParagraphs: Paragraph[] = [
    new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: `MATA PELAJARAN : ${meta.subject || ".........."}`,
          bold: true,
          font: FONT_FAMILY,
          size: FONT_SIZE_META,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: `KELAS/SEMESTER : ${meta.classLabel || ".........."}/${semesterLabel}`,
          bold: true,
          font: FONT_FAMILY,
          size: FONT_SIZE_META,
        }),
      ],
    }),
  ];

  /* ---- 4-row header (HEADER-REF-FIX-v2) ---- */
  /* Sesuai format referensi SMPN 8 Bantan:
     Kolom NAMA berisi 4 sel vertikal (masing-masing 1 row):
     Row 1: "Pertemuan", Row 2: "Jumlah Jam", Row 3: "Tanggal Mengajar", Row 4: "NAMA"
     NAMA = 1 row di baris ke-4.
     Tanggal vertikal di Row 3 pakai rowSpan=2 agar turun ke Row 4
     (sebelah NAMA adalah bagian dari vertical date, bukan kosong).
     NO. rowSpan=4, S/I/A/Ket rowSpan=4.
     Column widths: NO(500) + NAMA(3000) + 40×(450) + S(500) + I(500) + A(500) + Ket(700) = 23000 */
  const headerRows: TableRow[] = [];

  // Row 1: NO(rs4) | "Pertemuan" | 1–40 meeting numbers | S(rs4) | I(rs4) | A(rs4) | Ket.(rs4)
  const row1Cells: TableCell[] = [
    makeHeaderCell("NO.", { rowSpan: 4, shade: SHADE_HEADER_MAIN, width: 500 }),
    makeHeaderCell("Pertemuan", { shade: SHADE_HEADER_MAIN, width: 3000, alignment: AlignmentType.LEFT }),
  ];
  for (let i = 1; i <= maxMeetings; i++) {
    row1Cells.push(makeHeaderCell(String(i), { shade: SHADE_HEADER_MAIN, fontSize: FONT_SIZE_TABLE_SMALL, width: 450 }));
  }
  row1Cells.push(makeHeaderCell("S", { rowSpan: 4, shade: SHADE_HEADER_MAIN, width: 500, borders: CELL_BORDER_REKAP_L, fontSize: FONT_SIZE_TABLE_SMALL }));
  row1Cells.push(makeHeaderCell("I", { rowSpan: 4, shade: SHADE_HEADER_MAIN, width: 500, fontSize: FONT_SIZE_TABLE_SMALL }));
  row1Cells.push(makeHeaderCell("A", { rowSpan: 4, shade: SHADE_HEADER_MAIN, width: 500, fontSize: FONT_SIZE_TABLE_SMALL }));
  row1Cells.push(makeHeaderCell("Ket.", { rowSpan: 4, shade: SHADE_HEADER_MAIN, width: 700, fontSize: FONT_SIZE_TABLE_SMALL }));
  headerRows.push(new TableRow({ tableHeader: true, children: row1Cells }));

  // Row 2: "Jumlah Jam" + JP per meeting
  const row2Cells: TableCell[] = [
    makeHeaderCell("Jumlah Jam", { shade: SHADE_HEADER_SUB, width: 3000, alignment: AlignmentType.LEFT }),
  ];
  for (let i = 0; i < maxMeetings; i++) {
    const meeting = meetings.find((m) => m.meetingNumber === i + 1);
    row2Cells.push(makeHeaderCell(meeting ? String(meeting.durationJP) : "", { shade: SHADE_HEADER_SUB, fontSize: FONT_SIZE_TABLE_SMALL, width: 450 }));
  }
  headerRows.push(new TableRow({ tableHeader: true, children: row2Cells }));

  // Row 3: "Tanggal Mengajar" + dates DD/MM (rowSpan=2 agar turun ke Row 4)
  const row3Cells: TableCell[] = [
    makeHeaderCell("Tanggal\nMengajar", { shade: SHADE_HEADER_MAIN, width: 3000, alignment: AlignmentType.LEFT }),
  ];
  for (let i = 0; i < maxMeetings; i++) {
    const meeting = meetings.find((m) => m.meetingNumber === i + 1);
    const dateStr = meeting ? formatShortDateDocx(meeting.dateISO) : "";
    row3Cells.push(makeHeaderCell(dateStr, { shade: SHADE_HEADER_SUB, fontSize: FONT_SIZE_TABLE_SMALL, width: 450, rowSpan: 2 }));
  }
  headerRows.push(new TableRow({ tableHeader: true, children: row3Cells }));

  // Row 4: "NAMA" — sebelahnya date cells lanjut dari rowSpan=2
  const row4Cells: TableCell[] = [
    makeHeaderCell("NAMA", { shade: SHADE_HEADER_MAIN, width: 3000, alignment: AlignmentType.LEFT }),
  ];
  // 40 date cells sudah di-cover oleh rowSpan=2 dari Row 3, jadi tidak perlu cell di sini
  headerRows.push(new TableRow({ tableHeader: true, children: row4Cells }));

  /* ---- Data rows ---- */
  const dataRows: TableRow[] = [];
  for (let idx = 0; idx < students.length; idx++) {
    const s = students[idx];
    const sakitCount = countStatusDocx(meetings, s.studentId, "sick");
    const izinCount = countStatusDocx(meetings, s.studentId, "excused");
    const alpaCount = countStatusDocx(meetings, s.studentId, "absent");

    const cells: TableCell[] = [];

    // NO
    cells.push(makeTextCell(String(idx + 1), { width: 500, fontSize: FONT_SIZE_TABLE_SMALL }));

    // NAMA
    cells.push(makeTextCell(s.studentName.toUpperCase(), { width: 3000, alignment: AlignmentType.LEFT, fontSize: FONT_SIZE_TABLE_SMALL }));

    // 40 attendance columns — no colored bg (ink-saver)
    for (let m = 1; m <= maxMeetings; m++) {
      const meeting = meetings.find((mt) => mt.meetingNumber === m);
      const status = meeting?.attendanceByStudent[s.studentId] ?? null;
      cells.push(makeTextCell(statusMarkDocx(status), { width: 450, bold: true, fontSize: FONT_SIZE_TABLE_SMALL }));
    }

    // Rekap S, I, A — border-l thick separator + light gray bg
    cells.push(makeTextCell(
      sakitCount > 0 ? String(sakitCount) : "",
      { width: 500, shade: SHADE_DATA_REKAP, borders: CELL_BORDER_REKAP_L, bold: true, fontSize: FONT_SIZE_TABLE_SMALL }
    ));
    cells.push(makeTextCell(
      izinCount > 0 ? String(izinCount) : "",
      { width: 500, shade: SHADE_DATA_REKAP, bold: true, fontSize: FONT_SIZE_TABLE_SMALL }
    ));
    cells.push(makeTextCell(
      alpaCount > 0 ? String(alpaCount) : "",
      { width: 500, shade: SHADE_DATA_REKAP, bold: true, fontSize: FONT_SIZE_TABLE_SMALL }
    ));

    // Ket. — auto-computed
    cells.push(makeTextCell(
      attendanceKetDocx(meetings, s.studentId, attendanceThreshold),
      { width: 700, fontSize: FONT_SIZE_TABLE_SMALL, bold: true }
    ));

    dataRows.push(new TableRow({ cantSplit: true, children: cells }));
  }

  /* ---- Assemble matrix table ---- */
  const matrixTable = new Table({
    rows: [...headerRows, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
  });

  /* ---- Signature block (Guru Bidang Studi) ---- */
  const placeDate = `${meta.schoolVillage || meta.schoolDistrict || "..........."}, ${formatLongDateID(todayISODate())}`;
  const signatureTable = buildDualSignatureTable(
    "Kepala Sekolah",
    meta.headmasterName || "........................",
    meta.headmasterNip || "........................",
    "Guru Mata Pelajaran",
    meta.teacherName || "........................",
    meta.teacherNip || "........................",
  );

  /* ---- Assemble full document ---- */
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: {
            orientation: PageOrientation.LANDSCAPE,
            width: 297 * 567,
            height: 210 * 567,
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
        ...metaParagraphs,
        matrixTable,
        new Paragraph({ spacing: { before: 200 }, children: [] }), // spacer
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { after: 60 },
          children: [new TextRun({ text: placeDate, font: FONT_FAMILY, size: FONT_SIZE_SIGNATURE })],
        }),
        signatureTable,
      ],
    }],
  });

  return doc;
}

/* ============================================================ */
/*  FORMAT-3: Nilai Pengetahuan DOCX Builder                    */
/* ============================================================ */

function buildNilaiDocx(params: NilaiDocxParams): Document {
  const { meta, records, gradeBook } = params;
  const kdCount = 10;
  const gradeModel = gradeBook?.gradeModel ?? "uh";
  const isPaSplit = gradeModel === "pa-split";
  const kdLabels = Array.from({ length: kdCount }, (_, i) => `KD${i + 1}`);
  const semesterLabel = meta.semester === 1 ? "Ganjil" : "Genap";

  /* ---- Title ---- */
  const titleParagraphs: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: `PENILAIAN PENGETAHUAN SISWA/I ${meta.schoolName || "SMP NEGERI 8 BANTAN"}`,
          bold: true,
          font: FONT_FAMILY,
          size: FONT_SIZE_TITLE,
          allCaps: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: `TAHUN PELAJARAN ${meta.yearLabel || "2023/2024"}`,
          bold: true,
          font: FONT_FAMILY,
          size: FONT_SIZE_SUBTITLE,
          allCaps: true,
        }),
      ],
    }),
  ];

  /* ---- Metadata ---- */
  const metaParagraphs: Paragraph[] = [
    new Paragraph({
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: `MATA PELAJARAN : ${meta.subject || ".........."}`,
          bold: true,
          font: FONT_FAMILY,
          size: FONT_SIZE_META,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: `KELAS/SEMESTER : ${meta.classLabel || ".........."}/${semesterLabel}`,
          bold: true,
          font: FONT_FAMILY,
          size: FONT_SIZE_META,
        }),
      ],
    }),
  ];

  /* ---- Table header rows ---- */
  const headerRows: TableRow[] = [];
  const headerRowSpan = isPaSplit ? 3 : 2;

  // Row 1: Super-header
  // NO(rs3/2) | NAMA(rs3/2) | PA/UH(colspan) | PTS(rs) | PAS(rs) | NA(rs) | Predikat(rs)
  const row1Cells: TableCell[] = [
    makeHeaderCell("NO.", { rowSpan: headerRowSpan, shade: SHADE_HEADER_MAIN, width: 500 }),
    makeHeaderCell("NAMA", { rowSpan: headerRowSpan, shade: SHADE_HEADER_MAIN, width: 3000, alignment: AlignmentType.LEFT }),
  ];

  if (isPaSplit) {
    row1Cells.push(makeHeaderCell("Penilaian Harian (PA)", { columnSpan: kdCount * 2, shade: SHADE_HEADER_MAIN }));
  } else {
    row1Cells.push(makeHeaderCell("Ulangan Harian (UH)", { columnSpan: kdCount, shade: SHADE_HEADER_MAIN }));
  }

  row1Cells.push(makeHeaderCell("PTS", { rowSpan: headerRowSpan, shade: SHADE_HEADER_MAIN, width: 700, borders: CELL_BORDER_REKAP_L, fontSize: FONT_SIZE_TABLE_SMALL }));
  row1Cells.push(makeHeaderCell("PAS", { rowSpan: headerRowSpan, shade: SHADE_HEADER_MAIN, width: 700, fontSize: FONT_SIZE_TABLE_SMALL }));
  row1Cells.push(makeHeaderCell("NA", { rowSpan: headerRowSpan, shade: SHADE_HEADER_MAIN, width: 600, fontSize: FONT_SIZE_TABLE_SMALL }));
  row1Cells.push(makeHeaderCell("Predikat", { rowSpan: headerRowSpan, shade: SHADE_HEADER_MAIN, width: 700, fontSize: FONT_SIZE_TABLE_SMALL }));
  headerRows.push(new TableRow({ tableHeader: true, children: row1Cells }));

  // Row 2: Sub-groups (PA-split only)
  if (isPaSplit) {
    const row2Cells: TableCell[] = [
      makeHeaderCell("Ulangan Harian", { columnSpan: kdCount, shade: SHADE_HEADER_SUB }),
      makeHeaderCell("Tugas / PR", { columnSpan: kdCount, shade: SHADE_HEADER_SUB }),
    ];
    headerRows.push(new TableRow({ tableHeader: true, children: row2Cells }));
  }

  // Row 3 (or Row 2 for non-PA): KD labels
  const kdRowCells: TableCell[] = [];
  if (isPaSplit) {
    for (const kd of kdLabels) {
      kdRowCells.push(makeHeaderCell(kd, { shade: SHADE_HEADER_SUB, fontSize: FONT_SIZE_TABLE_SMALL, width: 550 }));
    }
    for (const kd of kdLabels) {
      kdRowCells.push(makeHeaderCell(kd, { shade: SHADE_HEADER_SUB, fontSize: FONT_SIZE_TABLE_SMALL, width: 550 }));
    }
  } else {
    for (const kd of kdLabels) {
      kdRowCells.push(makeHeaderCell(kd, { shade: SHADE_HEADER_SUB, fontSize: FONT_SIZE_TABLE_SMALL, width: 550 }));
    }
  }
  headerRows.push(new TableRow({ tableHeader: true, children: kdRowCells }));

  /* ---- Data rows ---- */
  const dataRows: TableRow[] = [];
  for (let idx = 0; idx < records.length; idx++) {
    const rec = records[idx];
    const cells: TableCell[] = [];

    // NO
    cells.push(makeTextCell(String(idx + 1), { width: 500, fontSize: FONT_SIZE_TABLE_SMALL }));

    // NAMA
    cells.push(makeTextCell(rec.studentName.toUpperCase(), { width: 3000, alignment: AlignmentType.LEFT, fontSize: FONT_SIZE_TABLE_SMALL }));

    // KD scores
    if (isPaSplit) {
      for (let kdNum = 1; kdNum <= kdCount; kdNum++) {
        const val = rec.ulanganScores[kdNum];
        cells.push(makeTextCell(fmtScore(val), { width: 550, fontSize: FONT_SIZE_TABLE_SMALL }));
      }
      for (let kdNum = 1; kdNum <= kdCount; kdNum++) {
        const val = rec.tugasScores[kdNum];
        cells.push(makeTextCell(fmtScore(val), { width: 550, fontSize: FONT_SIZE_TABLE_SMALL }));
      }
    } else {
      for (let kdNum = 1; kdNum <= kdCount; kdNum++) {
        const val = rec.finalKDScores[kdNum];
        cells.push(makeTextCell(fmtScore(val), { width: 550, fontSize: FONT_SIZE_TABLE_SMALL }));
      }
    }

    // PTS — thick left border separator + light gray bg
    cells.push(makeTextCell(fmtScore(rec.pts), { width: 700, shade: SHADE_DATA_REKAP, borders: CELL_BORDER_REKAP_L, bold: true, fontSize: FONT_SIZE_TABLE_SMALL }));

    // PAS
    cells.push(makeTextCell(fmtScore(rec.pas), { width: 700, shade: SHADE_DATA_REKAP, bold: true, fontSize: FONT_SIZE_TABLE_SMALL }));

    // NA
    cells.push(makeTextCell(fmtScore(rec.finalScore), { width: 600, shade: SHADE_DATA_REKAP, bold: true, fontSize: FONT_SIZE_TABLE_SMALL }));

    // Predikat
    cells.push(makeTextCell(predikat(rec.finalScore), { width: 700, fontSize: FONT_SIZE_TABLE_SMALL, bold: true }));

    dataRows.push(new TableRow({ cantSplit: true, children: cells }));
  }

  /* ---- Assemble matrix table ---- */
  const matrixTable = new Table({
    rows: [...headerRows, ...dataRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
  });

  /* ---- Signature block (Guru Bidang Studi + Kepala Sekolah) ---- */
  const placeDate = `${meta.schoolVillage || meta.schoolDistrict || "..........."}, ${formatLongDateID(todayISODate())}`;
  const signatureTable = buildDualSignatureTable(
    "Kepala Sekolah",
    meta.headmasterName || "........................",
    meta.headmasterNip || "........................",
    "Guru Mata Pelajaran",
    meta.teacherName || "........................",
    meta.teacherNip || "........................",
  );

  /* ---- Assemble full document ---- */
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: {
            orientation: PageOrientation.LANDSCAPE,
            width: 297 * 567,
            height: 210 * 567,
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
        ...metaParagraphs,
        matrixTable,
        new Paragraph({ spacing: { before: 200 }, children: [] }), // spacer
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          spacing: { after: 60 },
          children: [new TextRun({ text: placeDate, font: FONT_FAMILY, size: FONT_SIZE_SIGNATURE })],
        }),
        signatureTable,
      ],
    }],
  });

  return doc;
}

/* ============================================================ */
/*  Signature Block Helpers                                       */
/* ============================================================ */

/**
 * Dual signature block: Kepala Sekolah (left) + Guru (right).
 * Borderless 2-column table, aligned to page width.
 */
function buildDualSignatureTable(
  headRole: string,
  headName: string,
  headNip: string,
  rightRole: string,
  rightName: string,
  rightNip: string,
): Table {
  const NB = NO_BORDER as unknown as typeof CELL_BORDER; // Cast through unknown for TS struct compat
  return new Table({
    rows: [
      // Role labels
      new TableRow({
        children: [
          makeTextCell(`Mengetahui,\n${headRole}`, { borders: NB, alignment: AlignmentType.CENTER, fontSize: FONT_SIZE_SIGNATURE }),
          makeTextCell(rightRole, { borders: NB, alignment: AlignmentType.CENTER, fontSize: FONT_SIZE_SIGNATURE }),
        ],
      }),
      // Space for signature (4 empty lines)
      new TableRow({
        children: [
          makeTextCell("\n\n\n\n", { borders: NB, fontSize: FONT_SIZE_SIGNATURE }),
          makeTextCell("\n\n\n\n", { borders: NB, fontSize: FONT_SIZE_SIGNATURE }),
        ],
      }),
      // Name
      new TableRow({
        children: [
          makeTextCell(headName, { borders: NB, bold: true, alignment: AlignmentType.CENTER, fontSize: FONT_SIZE_SIGNATURE_NAME }),
          makeTextCell(rightName, { borders: NB, bold: true, alignment: AlignmentType.CENTER, fontSize: FONT_SIZE_SIGNATURE_NAME }),
        ],
      }),
      // NIP
      new TableRow({
        children: [
          makeTextCell(`NIP. ${headNip}`, { borders: NB, alignment: AlignmentType.CENTER, fontSize: FONT_SIZE_SIGNATURE_NIP }),
          makeTextCell(`NIP. ${rightNip}`, { borders: NB, alignment: AlignmentType.CENTER, fontSize: FONT_SIZE_SIGNATURE_NIP }),
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
}

/**
 * Single signature block: one role (Wali Kelas / Guru Piket).
 * Right-aligned, 1-column borderless layout.
 */
function buildSingleSignatureTable(
  role: string,
  name: string,
  nip: string | undefined,
  placeDate: string,
): Table {
  const NB = NO_BORDER as unknown as typeof CELL_BORDER;
  return new Table({
    rows: [
      new TableRow({
        children: [
          makeTextCell(placeDate, { borders: NB, alignment: AlignmentType.RIGHT, fontSize: FONT_SIZE_SIGNATURE }),
        ],
      }),
      new TableRow({
        children: [
          makeTextCell(role, { borders: NB, alignment: AlignmentType.CENTER, fontSize: FONT_SIZE_SIGNATURE }),
        ],
      }),
      new TableRow({
        children: [
          makeTextCell("\n\n\n\n", { borders: NB, fontSize: FONT_SIZE_SIGNATURE }),
        ],
      }),
      new TableRow({
        children: [
          makeTextCell(name || "........................", { borders: NB, bold: true, alignment: AlignmentType.CENTER, fontSize: FONT_SIZE_SIGNATURE_NAME }),
        ],
      }),
      ...(nip ? [
        new TableRow({
          children: [
            makeTextCell(`NIP. ${nip}`, { borders: NB, alignment: AlignmentType.CENTER, fontSize: FONT_SIZE_SIGNATURE_NIP }),
          ],
        }),
      ] : []),
    ],
    width: { size: 50, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
  });
}

/** Format date to DD/MM (tanpa tahun). */
function formatShortDateDocx(dateISO: string): string {
  const d = new Date(dateISO);
  const day = d.getDate();
  const month = d.getMonth() + 1;
  return `${day}/${month}`;
}

/* ============================================================ */
/*  Main export function                                          */
/* ============================================================ */

/**
 * Export Rekap Semester data to DOCX Blob.
 * Dispatches to the correct format builder based on params.format.
 */
export async function exportRekapSemesterDocx(
  params: RekapSemesterDocxExportParams,
): Promise<RekapDocxExportResult> {
  const doc =
    params.format === "absensi_bulanan"
      ? buildAbsensiBulananDocx(params)
    : params.format === "tatap_muka"
      ? buildTatapMukaDocx(params)
    : params.format === "jurnal_mengajar"
      ? buildJurnalDocx(params)
    : /* params.format === "nilai" */
      buildNilaiDocx(params);

  const blob = await Packer.toBlob(doc);
  return blob;
}

/* ============================================================ */
/*  FORMAT-4: Jurnal Mengajar DOCX Builder                       */
/* ============================================================ */

/** Day names for Indonesian date formatting */
const DAY_NAMES_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/** Format date to "Senin, 14/07/2025" for DOCX */
function formatDayDateDocx(dateISO: string | null): string {
  if (!dateISO) return "";
  const d = new Date(dateISO);
  const dayName = DAY_NAMES_ID[d.getDay()];
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  return `${dayName}, ${day}/${month}/${year}`;
}

/** Format absent students list: "Andi (S), Budi (I)" or "-" */
function formatAbsentDocx(students: Array<{ name: string; reason: string }>): string {
  if (students.length === 0) return "-";
  return students.map((s) => `${s.name} (${s.reason})`).join(", ");
}

function buildJurnalDocx(params: JurnalDocxParams): Document {
  const { meta, matrix } = params;
  const { rows } = matrix;
  const semesterLabel = meta.semester === 1 ? "1 (Ganjil)" : "2 (Genap)";

  // Portrait A4 margins — slightly wider for portrait
  const MARGIN_PORTRAIT_DXA = 1080; // ~0.75 inch

  /* ---- Title ---- */
  const titleParagraphs: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: "JURNAL AGENDA MENGAJAR GURU",
          bold: true,
          font: FONT_FAMILY,
          size: FONT_SIZE_TITLE,
          allCaps: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [
        new TextRun({
          text: meta.schoolName || "SMP NEGERI 8 BANTAN",
          bold: true,
          font: FONT_FAMILY,
          size: FONT_SIZE_SUBTITLE,
          allCaps: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: `TAHUN PELAJARAN ${meta.yearLabel || ".........."}`,
          bold: true,
          font: FONT_FAMILY,
          size: FONT_SIZE_SUBTITLE,
          allCaps: true,
        }),
      ],
    }),
  ];

  /* ---- Metadata — 2 column grid ---- */
  const metaTable = new Table({
    rows: [
      new TableRow({
        children: [
          // Left column: MATA PELAJARAN + KELAS/SEMESTER
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: NO_BORDER as unknown as typeof CELL_BORDER,
            children: [
              new Paragraph({
                spacing: { after: 40 },
                children: [
                  new TextRun({ text: "MATA PELAJARAN : ", bold: true, font: FONT_FAMILY, size: FONT_SIZE_META }),
                  new TextRun({ text: meta.subject || "..........", font: FONT_FAMILY, size: FONT_SIZE_META }),
                ],
              }),
              new Paragraph({
                spacing: { after: 40 },
                children: [
                  new TextRun({ text: "KELAS / SEMESTER : ", bold: true, font: FONT_FAMILY, size: FONT_SIZE_META }),
                  new TextRun({ text: `${meta.classLabel || ".........."} / ${semesterLabel}`, font: FONT_FAMILY, size: FONT_SIZE_META }),
                ],
              }),
            ],
          }),
          // Right column: NAMA GURU + NIP
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: NO_BORDER as unknown as typeof CELL_BORDER,
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 40 },
                children: [
                  new TextRun({ text: "NAMA GURU : ", bold: true, font: FONT_FAMILY, size: FONT_SIZE_META }),
                  new TextRun({ text: meta.teacherName || "..........", font: FONT_FAMILY, size: FONT_SIZE_META }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 40 },
                children: [
                  new TextRun({ text: "NIP : ", bold: true, font: FONT_FAMILY, size: FONT_SIZE_META }),
                  new TextRun({ text: meta.teacherNip || "..........", font: FONT_FAMILY, size: FONT_SIZE_META }),
                ],
              }),
            ],
          }),
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

  /* ---- Table: 7 columns (portrait) ---- */
  // Column widths as percentages (matching JurnalMatrix.tsx)
  const COL_W_NO = 4.5;
  const COL_W_TANGGAL = 12;
  const COL_W_JAM = 7.5;
  const COL_W_MATERI = 25;
  const COL_W_KEGIATAN = 30;
  const COL_W_TIDAK_HADIR = 10;
  const COL_W_KET = 11;

  // Header row
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      makeHeaderCell("NO.", { width: COL_W_NO, shade: SHADE_HEADER_MAIN }),
      makeHeaderCell("HARI / TANGGAL", { width: COL_W_TANGGAL, shade: SHADE_HEADER_MAIN }),
      makeHeaderCell("JAM KE-", { width: COL_W_JAM, shade: SHADE_HEADER_MAIN }),
      makeHeaderCell("MATERI / TUJUAN PEMBELAJARAN", { width: COL_W_MATERI, shade: SHADE_HEADER_MAIN, alignment: AlignmentType.LEFT }),
      makeHeaderCell("KEGIATAN PEMBELAJARAN", { width: COL_W_KEGIATAN, shade: SHADE_HEADER_MAIN, alignment: AlignmentType.LEFT }),
      makeHeaderCell("SISWA TIDAK HADIR", { width: COL_W_TIDAK_HADIR, shade: SHADE_HEADER_MAIN }),
      makeHeaderCell("KETERANGAN", { width: COL_W_KET, shade: SHADE_HEADER_MAIN, alignment: AlignmentType.LEFT }),
    ],
  });

  // Data rows
  const dataRows = rows.map((row) => {
    const endPeriod = row.startPeriod + row.durationJP - 1;
    const jamKe = row.durationJP > 1 ? `${row.startPeriod} - ${endPeriod}` : `${row.startPeriod}`;
    const kegiatan = row.actualMaterialTitle || row.note || "";

    return new TableRow({
      children: [
        makeTextCell(String(row.meetingNumber), { width: COL_W_NO, fontSize: FONT_SIZE_TABLE_DATA }),
        makeTextCell(formatDayDateDocx(row.dateISO), { width: COL_W_TANGGAL, fontSize: FONT_SIZE_TABLE_DATA }),
        makeTextCell(jamKe, { width: COL_W_JAM, fontSize: FONT_SIZE_TABLE_DATA }),
        makeTextCell(row.plannedMaterialTitle ?? "", { width: COL_W_MATERI, fontSize: FONT_SIZE_TABLE_DATA, alignment: AlignmentType.LEFT }),
        makeTextCell(kegiatan, { width: COL_W_KEGIATAN, fontSize: FONT_SIZE_TABLE_DATA, alignment: AlignmentType.LEFT }),
        makeTextCell(formatAbsentDocx(row.absentStudents), { width: COL_W_TIDAK_HADIR, fontSize: FONT_SIZE_TABLE_DATA }),
        makeTextCell(row.keterangan ?? "", { width: COL_W_KET, fontSize: FONT_SIZE_TABLE_DATA, alignment: AlignmentType.LEFT }),
      ],
    });
  });

  // Empty template rows (up to 6 minimum rows)
  const emptyRows = rows.length < 6
    ? Array.from({ length: 6 - rows.length }, (_, i) =>
        new TableRow({
          children: [
            makeTextCell(String(rows.length + i + 1), { width: COL_W_NO, fontSize: FONT_SIZE_TABLE_DATA }),
            makeTextCell("", { width: COL_W_TANGGAL, fontSize: FONT_SIZE_TABLE_DATA }),
            makeTextCell("", { width: COL_W_JAM, fontSize: FONT_SIZE_TABLE_DATA }),
            makeTextCell("", { width: COL_W_MATERI, fontSize: FONT_SIZE_TABLE_DATA, alignment: AlignmentType.LEFT }),
            makeTextCell("", { width: COL_W_KEGIATAN, fontSize: FONT_SIZE_TABLE_DATA, alignment: AlignmentType.LEFT }),
            makeTextCell("", { width: COL_W_TIDAK_HADIR, fontSize: FONT_SIZE_TABLE_DATA }),
            makeTextCell("", { width: COL_W_KET, fontSize: FONT_SIZE_TABLE_DATA, alignment: AlignmentType.LEFT }),
          ],
        })
      )
    : [];

  const jurnalTable = new Table({
    rows: [headerRow, ...dataRows, ...emptyRows],
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    },
  });

  /* ---- Signature block ---- */
  const signatureTable = buildDualSignatureTable(
    `Kepala ${meta.schoolName || "SMPN 8 Bantan"}`,
    meta.headmasterName || "........................",
    meta.headmasterNip || "........................",
    "Guru Mata Pelajaran",
    meta.teacherName || "........................",
    meta.teacherNip || "........................",
  );

  return new Document({
    sections: [{
      properties: {
        page: {
          size: {
            width: 11906, // A4 Portrait width in twips
            height: 16838, // A4 Portrait height in twips
          },
          margin: {
            top: MARGIN_PORTRAIT_DXA,
            bottom: MARGIN_PORTRAIT_DXA,
            left: MARGIN_PORTRAIT_DXA,
            right: MARGIN_PORTRAIT_DXA,
          },
        },
      },
      children: [
        ...titleParagraphs,
        metaTable,
        new Paragraph({ spacing: { after: 80 } }),
        jurnalTable,
        new Paragraph({ spacing: { after: 200 } }),
        signatureTable,
      ],
    }],
  });
}

/* ============================================================ */
/*  Download helper (re-export from promes-docx-exporter)        */
/* ============================================================ */

// downloadDocxBlob is already exported from promes-docx-exporter.ts
// and barrel-exported from index.ts — no need to duplicate here.
