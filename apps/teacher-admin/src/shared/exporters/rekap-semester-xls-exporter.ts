/**
 * rekap-semester-xls-exporter.ts — XLS exporter for all 4 Rekap Semester formats (ExcelJS).
 *
 * Sprint 7: XLS export replaces DOCX for all tabs — data-portability focus.
 * Teachers can edit, filter, recalculate in Excel.
 * Print (Ctrl+P) handles the formatted document with KOP + signatures.
 *
 * ExcelJS provides full styling support (borders, fills, fonts, alignment)
 * unlike SheetJS Community Edition which only exports plain data.
 *
 * FORMAT-1: Absensi Kehadiran Bulanan (Wali Kelas / Guru Piket) — LANDSCAPE
 * FORMAT-2: Daftar Hadir Tatap Muka (Guru Mata Pelajaran) — LANDSCAPE
 * FORMAT-3: Penilaian Pengetahuan (Guru Mata Pelajaran) — LANDSCAPE
 * FORMAT-4: Jurnal Mengajar (Guru Mata Pelajaran) — PORTRAIT
 *
 * DOMAIN-BOUNDARY: @shared/exporters, import dari @guru-admin/domain saja.
 */

import ExcelJS from "exceljs";

import type {
  MonthlyAttendanceMatrix,
  TatapMukaAttendanceMatrix,
  JurnalMatrix,
} from "@shared/db/rekap-types";

import type { StudentGradeRecord, GradeBook } from "@guru-admin/domain";

/* ============================================================ */
/*  Types                                                        */
/* ============================================================ */

export type RekapXlsMeta = {
  schoolName: string;
  schoolVillage?: string;
  schoolDistrict?: string;
  yearLabel: string;
  classLabel: string;
  teacherName: string;
  teacherNip?: string;
  subject?: string;
  semester?: 1 | 2;
  headmasterName?: string;
  headmasterNip?: string;
};

export type AbsensiBulananXlsParams = {
  format: "absensi_bulanan";
  meta: RekapXlsMeta;
  matrix: MonthlyAttendanceMatrix;
  teacherRole?: string;
};

export type TatapMukaXlsParams = {
  format: "tatap_muka";
  meta: RekapXlsMeta;
  matrix: TatapMukaAttendanceMatrix;
  attendanceThreshold?: number;
};

export type NilaiXlsParams = {
  format: "nilai";
  meta: RekapXlsMeta;
  records: StudentGradeRecord[];
  gradeBook: GradeBook | null;
};

export type JurnalXlsParams = {
  format: "jurnal_mengajar";
  meta: RekapXlsMeta;
  matrix: JurnalMatrix;
};

export type RekapXlsExportParams =
  | AbsensiBulananXlsParams
  | TatapMukaXlsParams
  | NilaiXlsParams
  | JurnalXlsParams;

/* ============================================================ */
/*  Helpers                                                      */
/* ============================================================ */

/** Convert 1-based column number to Excel letter (1→A, 26→Z, 27→AA, 46→AT) */
function colLetter(col: number): string {
  let result = "";
  while (col > 0) {
    col--; // shift to 0-based
    result = String.fromCharCode(65 + (col % 26)) + result;
    col = Math.floor(col / 26);
  }
  return result;
}

const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/** Format date to "Senin, 14/07/2025" */
function formatDayDate(dateISO: string | null): string {
  if (!dateISO) return "";
  const d = new Date(dateISO);
  const dayName = DAY_NAMES[d.getDay()];
  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  return `${dayName}, ${day}/${month}/${year}`;
}

/** Format date to DD/MM (short) */
function formatShortDate(dateISO: string): string {
  const d = new Date(dateISO);
  const day = d.getDate();
  const month = d.getMonth() + 1;
  return `${day}/${month}`;
}

/** Format absent students list: "Andi (S), Budi (I)" or "-" */
function formatAbsentStudents(students: Array<{ name: string; reason: string }>): string {
  if (students.length === 0) return "-";
  return students.map((s) => `${s.name} (${s.reason})`).join(", ");
}

/** Status mark: Hadir=blank, Sakit=S, Izin=I, Terlambat=T, Alpa=A */
function statusMark(status: "present" | "sick" | "excused" | "late" | "absent" | null): string {
  if (status === null) return "";
  if (status === "present") return "";
  if (status === "sick") return "S";
  if (status === "excused") return "I";
  if (status === "late") return "T";
  if (status === "absent") return "A";
  return "";
}

/** Predikat huruf berdasarkan finalScore */
function predikat(finalScore: number | null): string {
  if (finalScore === null) return "";
  if (finalScore >= 90) return "A";
  if (finalScore >= 80) return "B";
  if (finalScore >= 70) return "C";
  return "D";
}

/** Attendance Ket. otomatis */
function attendanceKet(
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

function countStatus(
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

/** Format long date in Indonesian: "28 Juli 2025" */
function formatLongDateID(dateISO: string): string {
  const MONTH_NAMES = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  const d = new Date(dateISO);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

/** Today's ISO date */
function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

/* ============================================================ */
/*  Style constants                                              */
/* ============================================================ */

const FONT_FAMILY = "Arial";
const FONT_SIZE_KOP_TITLE = 12;
const FONT_SIZE_KOP_SCHOOL = 11;
const FONT_SIZE_KOP_YEAR = 10;
const FONT_SIZE_META = 9;
const FONT_SIZE_HEADER = 8;
const FONT_SIZE_DATA = 8;
const FONT_SIZE_SIGN = 9;
const FONT_SIZE_SIGN_NIP = 8;

/** Header fill color — light gray */
const HEADER_FILL: ExcelJS.FillPattern = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF3F4F6" },
};

/** Header sub-fill — lighter gray */
const HEADER_SUB_FILL: ExcelJS.FillPattern = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF9FAFB" },
};

/** Rekap column fill — very light gray */
const REKAP_FILL: ExcelJS.FillPattern = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF9FAFB" },
};

/** Thin border for all table cells */
const THIN_BORDER: Partial<ExcelJS.Border> = {
  style: "thin",
  color: { argb: "FF000000" },
};

const ALL_BORDER: Partial<ExcelJS.Borders> = {
  top: THIN_BORDER as ExcelJS.Border,
  bottom: THIN_BORDER as ExcelJS.Border,
  left: THIN_BORDER as ExcelJS.Border,
  right: THIN_BORDER as ExcelJS.Border,
};

/* ============================================================ */
/*  Shared helpers                                               */
/* ============================================================ */

/** Style a header cell (bold, fill, center, border, wrapText) */
function styleHeaderCell(cell: ExcelJS.Cell, opts?: { align?: "left" | "center"; fill?: ExcelJS.FillPattern }) {
  cell.font = { name: FONT_FAMILY, size: FONT_SIZE_HEADER, bold: true };
  cell.fill = opts?.fill ?? HEADER_FILL;
  cell.alignment = { horizontal: opts?.align ?? "center", vertical: "middle", wrapText: true };
  cell.border = ALL_BORDER;
}

/** Style a data cell (border, font, wrapText) */
function styleDataCell(cell: ExcelJS.Cell, opts?: { align?: "left" | "center"; bold?: boolean; fill?: ExcelJS.FillPattern }) {
  cell.font = { name: FONT_FAMILY, size: FONT_SIZE_DATA, bold: opts?.bold ?? false };
  if (opts?.fill) cell.fill = opts.fill;
  cell.alignment = { horizontal: opts?.align ?? "center", vertical: "top", wrapText: true };
  cell.border = ALL_BORDER;
}

/** Add KOP header to a worksheet (merged title + school + year) */
function addKopHeader(worksheet: ExcelJS.Worksheet, title: string, schoolName: string, yearLabel: string, endCol: string) {
  const startRow = 1;
  worksheet.mergeCells(`A${startRow}:${endCol}${startRow}`);
  worksheet.mergeCells(`A${startRow + 1}:${endCol}${startRow + 1}`);
  worksheet.mergeCells(`A${startRow + 2}:${endCol}${startRow + 2}`);

  const cell1 = worksheet.getCell(`A${startRow}`);
  cell1.value = title;
  cell1.font = { name: FONT_FAMILY, size: FONT_SIZE_KOP_TITLE, bold: true };
  cell1.alignment = { horizontal: "center", vertical: "middle" };

  const cell2 = worksheet.getCell(`A${startRow + 1}`);
  cell2.value = schoolName.toUpperCase();
  cell2.font = { name: FONT_FAMILY, size: FONT_SIZE_KOP_SCHOOL, bold: true };
  cell2.alignment = { horizontal: "center", vertical: "middle" };

  const cell3 = worksheet.getCell(`A${startRow + 2}`);
  cell3.value = `TAHUN PELAJARAN ${yearLabel}`;
  cell3.font = { name: FONT_FAMILY, size: FONT_SIZE_KOP_YEAR, bold: true };
  cell3.alignment = { horizontal: "center", vertical: "middle" };

  return startRow + 3; // next blank row
}

/** Add dual signature block (Kepala Sekolah + Guru) — uses numeric column math for multi-letter column safety */
function addDualSignature(worksheet: ExcelJS.Worksheet, startRow: number, endColNum: number, meta: RekapXlsMeta) {
  const endCol = colLetter(endColNum);
  const placeDate = `${meta.schoolVillage || meta.schoolDistrict || "..........."}, ${formatLongDateID(todayISODate())}`;

  // Left signature: Kepala Sekolah
  worksheet.getCell(`A${startRow}`).value = "Mengetahui,";
  worksheet.getCell(`A${startRow + 1}`).value = `Kepala ${meta.schoolName || "SMPN 8 Bantan"}`;
  worksheet.getCell(`A${startRow + 5}`).value = meta.headmasterName || "........................";
  worksheet.getCell(`A${startRow + 6}`).value = `NIP. ${meta.headmasterNip || "........................"}`;

  // Right signature: Guru Mata Pelajaran — compute midCol numerically
  const midColNum = Math.ceil(endColNum / 2) + 1;
  const midCol = colLetter(midColNum);
  worksheet.getCell(`${midCol}${startRow}`).value = placeDate;
  worksheet.getCell(`${midCol}${startRow + 1}`).value = "Guru Mata Pelajaran";
  worksheet.getCell(`${midCol}${startRow + 5}`).value = meta.teacherName || "........................";
  worksheet.getCell(`${midCol}${startRow + 6}`).value = `NIP. ${meta.teacherNip || "........................"}`;

  // Merge cells for balanced layout — use numeric math
  const leftEndColNum = Math.floor(midColNum / 2);
  const leftEndCol = colLetter(leftEndColNum);
  const rightEndCol = endCol;

  worksheet.mergeCells(`A${startRow}:${leftEndCol}${startRow}`);
  worksheet.mergeCells(`A${startRow + 1}:${leftEndCol}${startRow + 1}`);
  worksheet.mergeCells(`A${startRow + 5}:${leftEndCol}${startRow + 5}`);
  worksheet.mergeCells(`A${startRow + 6}:${leftEndCol}${startRow + 6}`);

  worksheet.mergeCells(`${midCol}${startRow}:${rightEndCol}${startRow}`);
  worksheet.mergeCells(`${midCol}${startRow + 1}:${rightEndCol}${startRow + 1}`);
  worksheet.mergeCells(`${midCol}${startRow + 5}:${rightEndCol}${startRow + 5}`);
  worksheet.mergeCells(`${midCol}${startRow + 6}:${rightEndCol}${startRow + 6}`);

  // Style signature cells
  for (let i = startRow; i <= startRow + 6; i++) {
    const cellA = worksheet.getCell(`A${i}`);
    const cellM = worksheet.getCell(`${midCol}${i}`);

    cellA.alignment = { horizontal: "center" };
    cellM.alignment = { horizontal: "center" };

    const isBold = i === startRow + 1 || i === startRow + 5;
    cellA.font = { name: FONT_FAMILY, size: FONT_SIZE_SIGN, bold: isBold };
    cellM.font = { name: FONT_FAMILY, size: FONT_SIZE_SIGN, bold: isBold };

    if (i === startRow + 6) {
      cellA.font = { name: FONT_FAMILY, size: FONT_SIZE_SIGN_NIP };
      cellM.font = { name: FONT_FAMILY, size: FONT_SIZE_SIGN_NIP };
    }

    if (i === startRow + 5) {
      cellA.font = { ...cellA.font, underline: true };
      cellM.font = { ...cellM.font, underline: true };
    }
  }
}

/** Add single signature block (Wali Kelas / Guru Piket) — right-aligned */
function addSingleSignature(worksheet: ExcelJS.Worksheet, startRow: number, endColNum: number, role: string, meta: RekapXlsMeta) {
  const endCol = colLetter(endColNum);
  const placeDate = `${meta.schoolVillage || meta.schoolDistrict || "..........."}, ${formatLongDateID(todayISODate())}`;

  worksheet.mergeCells(`A${startRow}:${endCol}${startRow}`);
  const dateCell = worksheet.getCell(`A${startRow}`);
  dateCell.value = placeDate;
  dateCell.font = { name: FONT_FAMILY, size: FONT_SIZE_SIGN };
  dateCell.alignment = { horizontal: "right" };

  worksheet.mergeCells(`A${startRow + 1}:${endCol}${startRow + 1}`);
  const roleCell = worksheet.getCell(`A${startRow + 1}`);
  roleCell.value = role;
  roleCell.font = { name: FONT_FAMILY, size: FONT_SIZE_SIGN, bold: true };
  roleCell.alignment = { horizontal: "center" };

  worksheet.mergeCells(`A${startRow + 5}:${endCol}${startRow + 5}`);
  const nameCell = worksheet.getCell(`A${startRow + 5}`);
  nameCell.value = meta.teacherName || "........................";
  nameCell.font = { name: FONT_FAMILY, size: FONT_SIZE_SIGN, bold: true, underline: true };
  nameCell.alignment = { horizontal: "center" };

  if (meta.teacherNip) {
    worksheet.mergeCells(`A${startRow + 6}:${endCol}${startRow + 6}`);
    const nipCell = worksheet.getCell(`A${startRow + 6}`);
    nipCell.value = `NIP. ${meta.teacherNip}`;
    nipCell.font = { name: FONT_FAMILY, size: FONT_SIZE_SIGN_NIP };
    nipCell.alignment = { horizontal: "center" };
  }
}

/** Download helper — create blob and trigger browser download */
function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

/* ============================================================ */
/*  FORMAT-1: Absensi Bulanan XLS                                */
/* ============================================================ */

async function exportAbsensiBulananXls(params: AbsensiBulananXlsParams): Promise<Blob> {
  const { meta, matrix, teacherRole = "Wali Kelas" } = params;
  const { monthName, year, daysInMonth, students } = matrix;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Absensi Bulanan");

  worksheet.pageSetup = {
    paperSize: 9,
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.3, right: 0.3, top: 0.3, bottom: 0.3, header: 0.2, footer: 0.2 },
  };

  // Column definitions: NO | NAMA | NISN | 1..daysInMonth | S | I | A | JLH
  const totalCols = 3 + daysInMonth + 4;
  const endColLetter = colLetter(totalCols);

  // Set column widths
  const colWidths: Partial<ExcelJS.Column>[] = [
    { width: 5 },   // NO
    { width: 28 },  // NAMA
    { width: 14 },  // NISN
  ];
  for (let d = 1; d <= daysInMonth; d++) {
    colWidths.push({ width: 4.5 });
  }
  colWidths.push({ width: 5 }); // S
  colWidths.push({ width: 5 }); // I
  colWidths.push({ width: 5 }); // A
  colWidths.push({ width: 6 }); // JLH
  worksheet.columns = colWidths;

  // KOP header
  addKopHeader(worksheet, `ABSENSI KEHADIRAN BULANAN SISWA/I ${meta.schoolName || "SMP NEGERI 8 BANTAN"}`, meta.schoolName || "SMP NEGERI 8 BANTAN", meta.yearLabel || String(year), endColLetter);

  // Metadata
  const metaRow1 = worksheet.addRow([`KELAS : ${meta.classLabel || ".........."}`]);
  worksheet.mergeCells(`A${metaRow1.number}:${endColLetter}${metaRow1.number}`);
  metaRow1.getCell(1).font = { name: FONT_FAMILY, size: FONT_SIZE_META, bold: true };

  const metaRow2 = worksheet.addRow([`BULAN : ${monthName}`]);
  worksheet.mergeCells(`A${metaRow2.number}:${endColLetter}${metaRow2.number}`);
  metaRow2.getCell(1).font = { name: FONT_FAMILY, size: FONT_SIZE_META, bold: true };

  worksheet.addRow([]); // blank

  // HEADER-REF-FIX: Add both header rows FIRST, then merge, then set values.
  const headerRow1 = worksheet.addRow([]);
  const headerRow2 = worksheet.addRow([]);

  // --- Row 1 values: NO | NAMA | NISN | TANGGAL | REKAP ---
  headerRow1.getCell(1).value = "NO.";
  headerRow1.getCell(2).value = "NAMA";
  headerRow1.getCell(3).value = "NISN";
  headerRow1.getCell(4).value = "TANGGAL";
  headerRow1.getCell(4 + daysInMonth).value = "REKAP";

  // --- Row 2 values: date numbers + S | I | A | JLH ---
  for (let d = 1; d <= daysInMonth; d++) {
    headerRow2.getCell(3 + d).value = d;
  }
  const rekapLabels = ["S", "I", "A", "JLH"];
  for (let i = 0; i < 4; i++) {
    headerRow2.getCell(4 + daysInMonth + i).value = rekapLabels[i];
  }

  // --- Merge header row 1 (after both rows exist) ---
  worksheet.mergeCells(`A${headerRow1.number}:A${headerRow1.number + 1}`); // NO rowSpan 2
  worksheet.mergeCells(`B${headerRow1.number}:B${headerRow1.number + 1}`); // NAMA rowSpan 2
  worksheet.mergeCells(`C${headerRow1.number}:C${headerRow1.number + 1}`); // NISN rowSpan 2
  const tanggalEndCol = 3 + daysInMonth;
  const tanggalEndLetter = colLetter(tanggalEndCol);
  worksheet.mergeCells(`D${headerRow1.number}:${tanggalEndLetter}${headerRow1.number}`);
  const rekapStartCol = 4 + daysInMonth;
  const rekapStartLetter = colLetter(rekapStartCol);
  const rekapEndLetter = endColLetter;
  worksheet.mergeCells(`${rekapStartLetter}${headerRow1.number}:${rekapEndLetter}${headerRow1.number}`);

  // --- Style both header rows ---
  // NAMA in col 2 is left-aligned (matching DOCX reference)
  for (let c = 1; c <= totalCols; c++) {
    styleHeaderCell(headerRow1.getCell(c), { align: c === 2 ? "left" : "center" });
  }
  for (let c = 1; c <= totalCols; c++) {
    styleHeaderCell(headerRow2.getCell(c), { fill: HEADER_SUB_FILL });
  }

  // Data rows
  for (let idx = 0; idx < students.length; idx++) {
    const s = students[idx];
    const dataRow = worksheet.addRow([]);

    dataRow.getCell(1).value = idx + 1;
    dataRow.getCell(2).value = s.studentName.toUpperCase();
    dataRow.getCell(3).value = s.nisn ?? "";

    for (let d = 1; d <= daysInMonth; d++) {
      dataRow.getCell(3 + d).value = statusMark(s.statusByDate[d]);
    }

    dataRow.getCell(4 + daysInMonth).value = s.rekap.sakit > 0 ? s.rekap.sakit : "";
    dataRow.getCell(4 + daysInMonth + 1).value = s.rekap.izin > 0 ? s.rekap.izin : "";
    dataRow.getCell(4 + daysInMonth + 2).value = s.rekap.alpa > 0 ? s.rekap.alpa : "";
    dataRow.getCell(4 + daysInMonth + 3).value = s.rekap.jlh > 0 ? s.rekap.jlh : "";

    // Style data cells
    for (let c = 1; c <= totalCols; c++) {
      const isRekap = c >= 4 + daysInMonth;
      const isName = c === 2;
      styleDataCell(dataRow.getCell(c), {
        align: isName ? "left" : "center",
        bold: isRekap && dataRow.getCell(c).value !== "",
        fill: isRekap ? REKAP_FILL : undefined,
      });
    }
  }

  // Signature
  worksheet.addRow([]);
  const signRow = worksheet.lastRow!.number + 1;
  addSingleSignature(worksheet, signRow, totalCols, teacherRole, meta);

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

/* ============================================================ */
/*  FORMAT-2: Tatap Muka XLS                                     */
/* ============================================================ */

async function exportTatapMukaXls(params: TatapMukaXlsParams): Promise<Blob> {
  const { meta, matrix, attendanceThreshold = 0.75 } = params;
  const { meetings, students } = matrix;
  const maxMeetings = 40;
  const semesterLabel = meta.semester === 1 ? "Ganjil" : "Genap";

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Daftar Hadir Tatap Muka");

  worksheet.pageSetup = {
    paperSize: 9,
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.2, right: 0.2, top: 0.3, bottom: 0.3, header: 0.2, footer: 0.2 },
  };

  // Columns: NO | NAMA | 1..40 | S | I | A | Ket
  const totalCols = 2 + maxMeetings + 4;
  const endColLetter = colLetter(totalCols);

  const colWidths: Partial<ExcelJS.Column>[] = [
    { width: 5 },   // NO
    { width: 28 },  // NAMA
  ];
  for (let i = 1; i <= maxMeetings; i++) {
    colWidths.push({ width: 4.5 });
  }
  colWidths.push({ width: 5 }); // S
  colWidths.push({ width: 5 }); // I
  colWidths.push({ width: 5 }); // A
  colWidths.push({ width: 10 }); // Ket
  worksheet.columns = colWidths;

  // KOP header
  addKopHeader(worksheet, `DAFTAR HADIR TATAP MUKA SISWA/I ${meta.schoolName || "SMP NEGERI 8 BANTAN"}`, meta.schoolName || "SMP NEGERI 8 BANTAN", meta.yearLabel || "..........", endColLetter);

  // Metadata
  const metaRow1 = worksheet.addRow([`MATA PELAJARAN : ${meta.subject || ".........."}`]);
  worksheet.mergeCells(`A${metaRow1.number}:${endColLetter}${metaRow1.number}`);
  metaRow1.getCell(1).font = { name: FONT_FAMILY, size: FONT_SIZE_META, bold: true };

  const metaRow2 = worksheet.addRow([`KELAS/SEMESTER : ${meta.classLabel || ".........."}/${semesterLabel}`]);
  worksheet.mergeCells(`A${metaRow2.number}:${endColLetter}${metaRow2.number}`);
  metaRow2.getCell(1).font = { name: FONT_FAMILY, size: FONT_SIZE_META, bold: true };

  worksheet.addRow([]); // blank

  // HEADER-REF-FIX: Add all 4 header rows FIRST, then merge, then set values.
  // This prevents ExcelJS from creating phantom empty rows when mergeCells
  // is called before the rows exist (which pushes subsequent addRow calls down).
  const headerRow1 = worksheet.addRow([]);
  const headerRow2 = worksheet.addRow([]);
  const headerRow3 = worksheet.addRow([]);
  const headerRow4 = worksheet.addRow([]);

  const h1r = headerRow1.number;
  const rekapStartCol2 = 3 + maxMeetings;
  const rekapStartLetter2 = colLetter(rekapStartCol2);

  // --- Row 1 values: NO | Pertemuan | 1..40 | S | I | A | Ket ---
  headerRow1.getCell(1).value = "NO.";
  headerRow1.getCell(2).value = "Pertemuan";
  for (let i = 1; i <= maxMeetings; i++) {
    headerRow1.getCell(2 + i).value = i;
  }
  headerRow1.getCell(rekapStartCol2).value = "S";
  headerRow1.getCell(rekapStartCol2 + 1).value = "I";
  headerRow1.getCell(rekapStartCol2 + 2).value = "A";
  headerRow1.getCell(rekapStartCol2 + 3).value = "Ket.";

  // --- Row 2 values: Jumlah Jam + JP per meeting ---
  headerRow2.getCell(2).value = "Jumlah Jam";
  for (let i = 0; i < maxMeetings; i++) {
    const meeting = meetings.find((m) => m.meetingNumber === i + 1);
    headerRow2.getCell(3 + i).value = meeting ? meeting.durationJP : "";
  }

  // --- Row 3 values: Tanggal Mengajar + vertical dates (rowSpan=2) ---
  // HEADER-REF-FIX-v2: Each date cell in Row 3 has rowSpan=2 so it extends into Row 4.
  // This matches the DOCX/HTML reference format where "NAMA" is in Row 4 col 2
  // and the date cells occupy the space next to NAMA in Row 4.
  headerRow3.getCell(2).value = "Tanggal\nMengajar";
  for (let i = 0; i < maxMeetings; i++) {
    const meeting = meetings.find((m) => m.meetingNumber === i + 1);
    headerRow3.getCell(3 + i).value = meeting ? formatShortDate(meeting.dateISO) : "";
  }

  // --- Row 4 values: NAMA (only col 2 — cols 3-42 are occupied by Row 3 date rowSpan) ---
  headerRow4.getCell(2).value = "NAMA";

  // --- Merge cells ---
  // NO rowSpan=4
  worksheet.mergeCells(`A${h1r}:A${h1r + 3}`);
  // S, I, A, Ket rowSpan=4
  worksheet.mergeCells(`${rekapStartLetter2}${h1r}:${rekapStartLetter2}${h1r + 3}`); // S
  worksheet.mergeCells(`${colLetter(rekapStartCol2 + 1)}${h1r}:${colLetter(rekapStartCol2 + 1)}${h1r + 3}`); // I
  worksheet.mergeCells(`${colLetter(rekapStartCol2 + 2)}${h1r}:${colLetter(rekapStartCol2 + 2)}${h1r + 3}`); // A
  worksheet.mergeCells(`${colLetter(rekapStartCol2 + 3)}${h1r}:${colLetter(rekapStartCol2 + 3)}${h1r + 3}`); // Ket

  // --- DATE ROWSPAN=2: Each date cell in Row 3 merges down into Row 4 ---
  // This is the key parity fix — matching DOCX/HTML where dates have rowSpan=2
  for (let i = 0; i < maxMeetings; i++) {
    const dateCol = colLetter(3 + i);
    worksheet.mergeCells(`${dateCol}${headerRow3.number}:${dateCol}${headerRow4.number}`);
  }

  // --- Style all 4 header rows ---
  // Row 1: main header (bg-gray-200)
  for (let c = 1; c <= totalCols; c++) {
    styleHeaderCell(headerRow1.getCell(c), { align: c === 2 ? "left" : "center" });
  }
  // Row 2: sub-header (bg-gray-100)
  for (let c = 1; c <= totalCols; c++) {
    styleHeaderCell(headerRow2.getCell(c), { fill: HEADER_SUB_FILL, align: c === 2 ? "left" : "center" });
  }
  // Row 3: main header (bg-gray-200), dates with rowSpan=2
  for (let c = 1; c <= totalCols; c++) {
    styleHeaderCell(headerRow3.getCell(c), { align: c === 2 ? "left" : "center" });
  }
  // Row 4: sub-header (bg-gray-100) — only NAMA in col 2, rest are merged via rowSpan
  for (let c = 1; c <= totalCols; c++) {
    styleHeaderCell(headerRow4.getCell(c), { fill: HEADER_SUB_FILL, align: c === 2 ? "left" : "center" });
  }

  // Data rows
  for (let idx = 0; idx < students.length; idx++) {
    const s = students[idx];
    const sakitCount = countStatus(meetings, s.studentId, "sick");
    const izinCount = countStatus(meetings, s.studentId, "excused");
    const alpaCount = countStatus(meetings, s.studentId, "absent");

    const dataRow = worksheet.addRow([]);
    dataRow.getCell(1).value = idx + 1;
    dataRow.getCell(2).value = s.studentName.toUpperCase();

    for (let m = 1; m <= maxMeetings; m++) {
      const meeting = meetings.find((mt) => mt.meetingNumber === m);
      const status = meeting?.attendanceByStudent[s.studentId] ?? null;
      dataRow.getCell(2 + m).value = statusMark(status);
    }

    dataRow.getCell(3 + maxMeetings).value = sakitCount > 0 ? sakitCount : "";
    dataRow.getCell(4 + maxMeetings).value = izinCount > 0 ? izinCount : "";
    dataRow.getCell(5 + maxMeetings).value = alpaCount > 0 ? alpaCount : "";
    dataRow.getCell(6 + maxMeetings).value = attendanceKet(meetings, s.studentId, attendanceThreshold);

    for (let c = 1; c <= totalCols; c++) {
      const isRekap = c >= 3 + maxMeetings;
      const isName = c === 2;
      const isKet = c === 6 + maxMeetings;
      styleDataCell(dataRow.getCell(c), {
        align: isName ? "left" : isKet ? "left" : "center",
        bold: isRekap && !isKet && dataRow.getCell(c).value !== "",
        fill: isRekap ? REKAP_FILL : undefined,
      });
    }
  }

  // Signature
  worksheet.addRow([]);
  const signRow = worksheet.lastRow!.number + 1;
  addDualSignature(worksheet, signRow, totalCols, meta);

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

/* ============================================================ */
/*  FORMAT-3: Nilai Pengetahuan XLS                              */
/* ============================================================ */

async function exportNilaiXls(params: NilaiXlsParams): Promise<Blob> {
  const { meta, records, gradeBook } = params;
  const kdCount = 10;
  const gradeModel = gradeBook?.gradeModel ?? "uh";
  const isPaSplit = gradeModel === "pa-split";
  const semesterLabel = meta.semester === 1 ? "Ganjil" : "Genap";

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Penilaian Pengetahuan");

  worksheet.pageSetup = {
    paperSize: 9,
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.2, right: 0.2, top: 0.3, bottom: 0.3, header: 0.2, footer: 0.2 },
  };

  // Columns: NO | NAMA | KD1..KD10 (or UH+Tugas if PA-split) | PTS | PAS | NA | Predikat
  const kdTotalCols = isPaSplit ? kdCount * 2 : kdCount;
  const totalCols = 2 + kdTotalCols + 4;
  const endColLetter = colLetter(totalCols);

  const colWidths: Partial<ExcelJS.Column>[] = [
    { width: 5 },   // NO
    { width: 28 },  // NAMA
  ];
  for (let i = 0; i < kdTotalCols; i++) {
    colWidths.push({ width: 6 });
  }
  colWidths.push({ width: 7 }); // PTS
  colWidths.push({ width: 7 }); // PAS
  colWidths.push({ width: 7 }); // NA
  colWidths.push({ width: 9 }); // Predikat
  worksheet.columns = colWidths;

  // KOP header
  addKopHeader(worksheet, `PENILAIAN PENGETAHUAN SISWA/I ${meta.schoolName || "SMP NEGERI 8 BANTAN"}`, meta.schoolName || "SMP NEGERI 8 BANTAN", meta.yearLabel || "..........", endColLetter);

  // Metadata
  const metaRow1 = worksheet.addRow([`MATA PELAJARAN : ${meta.subject || ".........."}`]);
  worksheet.mergeCells(`A${metaRow1.number}:${endColLetter}${metaRow1.number}`);
  metaRow1.getCell(1).font = { name: FONT_FAMILY, size: FONT_SIZE_META, bold: true };

  const metaRow2 = worksheet.addRow([`KELAS/SEMESTER : ${meta.classLabel || ".........."}/${semesterLabel}`]);
  worksheet.mergeCells(`A${metaRow2.number}:${endColLetter}${metaRow2.number}`);
  metaRow2.getCell(1).font = { name: FONT_FAMILY, size: FONT_SIZE_META, bold: true };

  worksheet.addRow([]); // blank

  // HEADER-REF-FIX: Add all header rows FIRST, then merge, then set values.
  const headerRowSpan = isPaSplit ? 3 : 2;
  const headerRows: ExcelJS.Row[] = [];
  for (let i = 0; i < headerRowSpan; i++) {
    headerRows.push(worksheet.addRow([]));
  }
  const headerRow1 = headerRows[0];
  const headerRow2 = headerRows[1];
  const headerRow3 = headerRows[2]; // undefined when !isPaSplit

  const ptsCol = 3 + kdTotalCols;
  const pasCol = ptsCol + 1;
  const naCol = pasCol + 1;
  const predikatCol = naCol + 1;

  // --- Row 1 values ---
  headerRow1.getCell(1).value = "NO.";
  headerRow1.getCell(2).value = "NAMA";
  if (isPaSplit) {
    headerRow1.getCell(3).value = "Penilaian Harian (PA)";
  } else {
    headerRow1.getCell(3).value = "Ulangan Harian (UH)";
  }
  headerRow1.getCell(ptsCol).value = "PTS";
  headerRow1.getCell(pasCol).value = "PAS";
  headerRow1.getCell(naCol).value = "NA";
  headerRow1.getCell(predikatCol).value = "Predikat";

  // --- Row 2 values ---
  if (isPaSplit) {
    headerRow2.getCell(3).value = "Ulangan Harian";
    headerRow2.getCell(3 + kdCount).value = "Tugas / PR";
  } else {
    for (let i = 0; i < kdCount; i++) {
      headerRow2.getCell(3 + i).value = `KD${i + 1}`;
    }
  }

  // --- Row 3 values (PA-split only) ---
  if (isPaSplit && headerRow3) {
    for (let i = 0; i < kdCount; i++) {
      headerRow3.getCell(3 + i).value = `KD${i + 1}`;
      headerRow3.getCell(3 + kdCount + i).value = `KD${i + 1}`;
    }
  }

  // --- Merge header cells (after all rows exist) ---
  const h1r = headerRow1.number;
  worksheet.mergeCells(`A${h1r}:A${h1r + headerRowSpan - 1}`);
  worksheet.mergeCells(`B${h1r}:B${h1r + headerRowSpan - 1}`);
  const kdStartLetter = colLetter(3); // C
  const kdEndLetter = colLetter(2 + kdTotalCols);
  worksheet.mergeCells(`${kdStartLetter}${h1r}:${kdEndLetter}${h1r}`);
  worksheet.mergeCells(`${colLetter(ptsCol)}${h1r}:${colLetter(ptsCol)}${h1r + headerRowSpan - 1}`);
  worksheet.mergeCells(`${colLetter(pasCol)}${h1r}:${colLetter(pasCol)}${h1r + headerRowSpan - 1}`);
  worksheet.mergeCells(`${colLetter(naCol)}${h1r}:${colLetter(naCol)}${h1r + headerRowSpan - 1}`);
  worksheet.mergeCells(`${colLetter(predikatCol)}${h1r}:${colLetter(predikatCol)}${h1r + headerRowSpan - 1}`);

  // PA-split sub-group merges in Row 2
  if (isPaSplit) {
    worksheet.mergeCells(`C${headerRow2.number}:${colLetter(2 + kdCount)}${headerRow2.number}`);
    worksheet.mergeCells(`${colLetter(2 + kdCount + 1)}${headerRow2.number}:${colLetter(2 + kdCount * 2)}${headerRow2.number}`);
  }

  // --- Style all header rows ---
  // NAMA in col 2 is left-aligned (matching DOCX reference)
  for (let c = 1; c <= totalCols; c++) {
    styleHeaderCell(headerRow1.getCell(c), { align: c === 2 ? "left" : "center" });
  }
  for (let c = 1; c <= totalCols; c++) {
    styleHeaderCell(headerRow2.getCell(c), { fill: HEADER_SUB_FILL });
  }
  if (isPaSplit && headerRow3) {
    for (let c = 1; c <= totalCols; c++) {
      styleHeaderCell(headerRow3.getCell(c), { fill: HEADER_SUB_FILL });
    }
  }

  // Data rows
  for (let idx = 0; idx < records.length; idx++) {
    const rec = records[idx];
    const dataRow = worksheet.addRow([]);

    dataRow.getCell(1).value = idx + 1;
    dataRow.getCell(2).value = rec.studentName.toUpperCase();

    if (isPaSplit) {
      for (let kdNum = 1; kdNum <= kdCount; kdNum++) {
        dataRow.getCell(2 + kdNum).value = fmtScore(rec.ulanganScores[kdNum]);
      }
      for (let kdNum = 1; kdNum <= kdCount; kdNum++) {
        dataRow.getCell(2 + kdCount + kdNum).value = fmtScore(rec.tugasScores[kdNum]);
      }
    } else {
      for (let kdNum = 1; kdNum <= kdCount; kdNum++) {
        dataRow.getCell(2 + kdNum).value = fmtScore(rec.finalKDScores[kdNum]);
      }
    }

    dataRow.getCell(ptsCol).value = fmtScore(rec.pts);
    dataRow.getCell(pasCol).value = fmtScore(rec.pas);
    dataRow.getCell(naCol).value = fmtScore(rec.finalScore);
    dataRow.getCell(predikatCol).value = predikat(rec.finalScore);

    for (let c = 1; c <= totalCols; c++) {
      const isRekap = c >= ptsCol;
      const isName = c === 2;
      styleDataCell(dataRow.getCell(c), {
        align: isName ? "left" : "center",
        bold: isRekap,
        fill: isRekap ? REKAP_FILL : undefined,
      });
    }
  }

  // Signature
  worksheet.addRow([]);
  const signRow = worksheet.lastRow!.number + 1;
  addDualSignature(worksheet, signRow, totalCols, meta);

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

/* ============================================================ */
/*  FORMAT-4: Jurnal Mengajar XLS                                */
/* ============================================================ */

async function exportJurnalXlsInternal(params: JurnalXlsParams): Promise<Blob> {
  const { meta, matrix } = params;
  const { rows } = matrix;
  const semesterLabel = meta.semester === 1 ? "1 (Ganjil)" : "2 (Genap)";

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Jurnal Mengajar");

  worksheet.pageSetup = {
    paperSize: 9,
    orientation: "portrait",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
  };

  worksheet.columns = [
    { key: "no", width: 6 },
    { key: "tanggal", width: 20 },
    { key: "jam", width: 10 },
    { key: "materi", width: 35 },
    { key: "kegiatan", width: 40 },
    { key: "tidakHadir", width: 22 },
    { key: "ket", width: 15 },
  ];

  // KOP header
  addKopHeader(worksheet, "JURNAL AGENDA MENGAJAR GURU", meta.schoolName || "SMP NEGERI 8 BANTAN", meta.yearLabel || "..........", "G");

  worksheet.addRow([]); // blank

  // Metadata
  const metaRow1 = worksheet.addRow([
    "MATA PELAJARAN", ":", meta.subject || "..........",
    "", "NAMA GURU", ":", meta.teacherName || "..........",
  ]);
  const metaRow2 = worksheet.addRow([
    "KELAS / SEMESTER", ":", `${meta.classLabel || ".........."} / ${semesterLabel}`,
    "", "NIP", ":", meta.teacherNip || "..........",
  ]);

  [metaRow1, metaRow2].forEach((row) => {
    row.getCell(1).font = { name: FONT_FAMILY, size: FONT_SIZE_META, bold: true };
    row.getCell(5).font = { name: FONT_FAMILY, size: FONT_SIZE_META, bold: true };
    row.getCell(3).font = { name: FONT_FAMILY, size: FONT_SIZE_META };
    row.getCell(7).font = { name: FONT_FAMILY, size: FONT_SIZE_META };
    row.getCell(2).font = { name: FONT_FAMILY, size: FONT_SIZE_META };
    row.getCell(6).font = { name: FONT_FAMILY, size: FONT_SIZE_META };
  });

  worksheet.addRow([]); // blank

  // Table header
  const headerRow = worksheet.addRow([
    "NO.", "HARI / TANGGAL", "JAM KE-",
    "MATERI / TUJUAN PEMBELAJARAN", "KEGIATAN PEMBELAJARAN",
    "SISWA TIDAK HADIR", "KET",
  ]);
  headerRow.eachCell((cell) => {
    cell.font = { name: FONT_FAMILY, size: FONT_SIZE_HEADER, bold: true };
    cell.fill = HEADER_FILL;
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = ALL_BORDER;
  });
  headerRow.height = 28;

  // Data rows
  rows.forEach((row) => {
    const endPeriod = row.startPeriod + row.durationJP - 1;
    const jamKe = row.durationJP > 1 ? `${row.startPeriod} - ${endPeriod}` : `${row.startPeriod}`;
    const kegiatan = row.actualMaterialTitle || row.note || "";

    const dataRow = worksheet.addRow([
      row.meetingNumber,
      formatDayDate(row.dateISO),
      jamKe,
      row.plannedMaterialTitle ?? "",
      kegiatan,
      formatAbsentStudents(row.absentStudents),
      row.keterangan ?? "",
    ]);

    dataRow.eachCell((cell, colNumber) => {
      cell.font = { name: FONT_FAMILY, size: FONT_SIZE_DATA };
      cell.border = ALL_BORDER;
      if (colNumber === 1 || colNumber === 2 || colNumber === 3 || colNumber === 6) {
        cell.alignment = { horizontal: "center", vertical: "top", wrapText: true };
      } else {
        cell.alignment = { horizontal: "left", vertical: "top", wrapText: true };
      }
    });
  });

  // Empty template rows (up to 6 minimum)
  const minRows = 6;
  if (rows.length < minRows) {
    for (let i = 0; i < minRows - rows.length; i++) {
      const emptyRow = worksheet.addRow([rows.length + i + 1, "", "", "", "", "", ""]);
      emptyRow.eachCell((cell, colNumber) => {
        cell.font = { name: FONT_FAMILY, size: FONT_SIZE_DATA };
        cell.border = ALL_BORDER;
        if (colNumber === 1) cell.alignment = { horizontal: "center" };
      });
    }
  }

  // Signature
  worksheet.addRow([]);
  const signRow = worksheet.lastRow!.number + 1;
  addDualSignature(worksheet, signRow, 7, meta);

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

/* ============================================================ */
/*  Unified export function                                      */
/* ============================================================ */

/**
 * Export any Rekap Semester format to styled XLSX.
 */
export async function exportRekapXls(params: RekapXlsExportParams): Promise<Blob> {
  if (params.format === "absensi_bulanan") return exportAbsensiBulananXls(params);
  if (params.format === "tatap_muka") return exportTatapMukaXls(params);
  if (params.format === "nilai") return exportNilaiXls(params);
  return exportJurnalXlsInternal(params);
}

/* ============================================================ */
/*  Download helpers (backward-compatible)                       */
/* ============================================================ */

/** Backward-compatible: Jurnal XLS export params */
export type JurnalXlsMeta = RekapXlsMeta;
export type JurnalXlsExportParams = JurnalXlsParams;

/** Download jurnal XLSX (backward-compatible) */
export async function downloadJurnalXls(params: JurnalXlsExportParams): Promise<void> {
  const blob = await exportJurnalXlsInternal(params);
  const { meta } = params;
  downloadBlob(blob, `Jurnal_Mengajar_${meta.classLabel || "semester"}_${meta.subject || "mapel"}.xlsx`);
}

/** Download any Rekap Semester XLSX */
export async function downloadRekapXls(params: RekapXlsExportParams): Promise<void> {
  const blob = await exportRekapXls(params);
  const { meta, format } = params;
  const formatLabels: Record<string, string> = {
    absensi_bulanan: "Absensi_Bulanan",
    tatap_muka: "Tatap_Muka",
    nilai: "Penilaian",
    jurnal_mengajar: "Jurnal_Mengajar",
  };
  downloadBlob(blob, `${formatLabels[format]}_${meta.classLabel || "semester"}_${meta.subject || "mapel"}.xlsx`);
}
