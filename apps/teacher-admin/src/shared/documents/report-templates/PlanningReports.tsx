import type { ReactNode } from "react";
import {
  DocumentHeader,
  DocumentTitle,
  DocumentIdentityTable,
  DocumentSection,
  DocumentTable,
} from "../DocumentLayout";
import type { DocumentCell, DocumentCellObject } from "../DocumentLayout";
import { ReportFrame, CommonHeader, CommonSignature } from "./ReportFrame";
import type {
  ReportTemplateProps,
  ProtaData,
  PromesData,
  PromesWeekColumn,
} from "./types";
import { upper, numVal, defaultPromesWeeks } from "./helpers";

/* ── ProtaReportDocument: Program Tahunan (A4 Portrait) ── */

export function ProtaReportDocument({ data, withPrintArea = true }: ReportTemplateProps<ProtaData>) {
  const rows = data?.rows ?? [];

  /* ── Separate rows by semester ── */
  const sem1 = rows.filter((r) => String(r.semester ?? 1) === "1");
  const sem2 = rows.filter((r) => String(r.semester ?? 2) === "2");

  /* ── Build merged rows with semester group headers ── */
  const mergedRows: DocumentCell[][] = [];

  if (sem1.length > 0) {
    mergedRows.push([
      { content: "Semester 1", colSpan: 5, align: 'center', className: 'promes-bab-cell' },
    ]);
    sem1.forEach((row, i) => {
      mergedRows.push([
        { content: i + 1, align: 'center' },
        { content: row.semester ?? "1", align: 'center' },
        { content: row.atpNumber || "—", align: 'left' },
        { content: row.learningObjective || "—", align: 'left' },
        { content: row.allocationJp ?? "—", align: 'center' },
      ] as DocumentCell[]);
    });
  }

  if (sem2.length > 0) {
    mergedRows.push([
      { content: "Semester 2", colSpan: 5, align: 'center', className: 'promes-bab-cell' },
    ]);
    sem2.forEach((row, i) => {
      mergedRows.push([
        { content: sem1.length + i + 1, align: 'center' },
        { content: row.semester ?? "2", align: 'center' },
        { content: row.atpNumber || "—", align: 'left' },
        { content: row.learningObjective || "—", align: 'left' },
        { content: row.allocationJp ?? "—", align: 'center' },
      ] as DocumentCell[]);
    });
  }

  /* ── Footer: Subtotal per semester + Total ── */
  const subtotalS1 = sem1.reduce((s, r) => { const n = numVal(r.allocationJp); return s + (isNaN(n) ? 0 : n); }, 0);
  const subtotalS2 = sem2.reduce((s, r) => { const n = numVal(r.allocationJp); return s + (isNaN(n) ? 0 : n); }, 0);
  const totalJp = subtotalS1 + subtotalS2;

  const footer: DocumentCell[][] = [
    [
      { content: `Subtotal JP Semester 1`, colSpan: 4, align: 'center' },
      { content: subtotalS1, align: 'center' },
    ],
    [
      { content: `Subtotal JP Semester 2`, colSpan: 4, align: 'center' },
      { content: subtotalS2, align: 'center' },
    ],
    [
      { content: "Total JP Keseluruhan", colSpan: 4, align: 'center' },
      { content: totalJp, align: 'center' },
    ],
  ];

  /* ── Headers: single-row, all leaf columns with width locking ── */
  const headers: DocumentCell[][] = [
    [
      { content: "NO", style: { width: '5%' }, align: 'center' },
      { content: "SEMESTER", style: { width: '10%' }, align: 'center' },
      { content: "NO. ATP / ELEMEN", style: { width: '15%' }, align: 'left' },
      { content: "TUJUAN PEMBELAJARAN / LINGKUP MATERI", style: { width: '55%' }, align: 'left' },
      { content: "ALOKASI WAKTU (JP)", style: { width: '15%' }, align: 'center' },
    ],
  ];

  return (
    <ReportFrame withPrintArea={withPrintArea}>
      <CommonHeader context={data?.context} title={upper(data?.title || "PROGRAM TAHUNAN")} subtitle="Rencana alokasi waktu pembelajaran selama 1 tahun ajaran" />
      <DocumentTable headers={headers} rows={mergedRows.length > 0 ? mergedRows : undefined} footer={footer} emptyText="Belum tersedia" />
      <CommonSignature context={data?.context} />
    </ReportFrame>
  );
}

export function PromesDocument({ data, withPrintArea = true }: ReportTemplateProps<PromesData>) {
  const weekColumns = data?.weekColumns && data.weekColumns.length > 0 ? data.weekColumns : defaultPromesWeeks();
  const rows = data?.rows ?? [];
  const summaries = data?.summaries ?? [];
  const legend = data?.legend ?? [
    { label: "Kegiatan belajar mengajar", mark: "✔" },
    { label: "Asesmen sumatif tengah dan akhir semester", mark: "STS/SAS" },
    { label: "Proyek/Kokurikuler sekolah", mark: "KO" },
    { label: "Libur semester / hari besar", mark: "L" },
  ];

  /* ── Group weeks by month for header Row 1 colSpan ── */
  const monthGroups = weekColumns.reduce<Array<{ month: string; count: number }>>((groups, col) => {
    const last = groups[groups.length - 1];
    if (last && last.month === col.month) last.count += 1;
    else groups.push({ month: col.month, count: 1 });
    return groups;
  }, []);

  const weekCell = (marks: Record<string, ReactNode> | undefined, col: PromesWeekColumn, index: number) => {
    const key = `${col.month}-${col.week}`;
    return marks?.[key] ?? marks?.[String(index + 1)] ?? "";
  };

  /* ── Header Row 1: fixed columns + month colSpan groups + KET ── */
  const row1: DocumentCell[] = [
    { content: "NO", rowSpan: 2, style: { width: '3%' }, align: 'center' },
    { content: "NO. ATP / ELEMEN", rowSpan: 2, style: { width: '8%' }, align: 'left' },
    { content: "LINGKUP MATERI / TUJUAN PEMBELAJARAN", rowSpan: 2, style: { width: '22%' }, align: 'left' },
    { content: "ALOKASI (JP)", rowSpan: 2, style: { width: '5%' }, align: 'center' },
    ...monthGroups.map((g) => ({ content: g.month.toUpperCase(), colSpan: g.count, align: 'center' } as DocumentCellObject)),
    { content: "KET", rowSpan: 2, style: { width: '6%' }, align: 'left' },
  ];

  /* ── Header Row 2: individual week columns ── */
  const row2: DocumentCell[] = [
    ...weekColumns.map((col) =>
      ({ content: col.week, style: { width: '2%' }, align: 'center' } as DocumentCellObject)
    ),
  ];

  const headers = [row1, row2];

  /* ── Data Rows ── */
  const dataRows: DocumentCell[][] | undefined = rows.length > 0
    ? rows.map((row, rowIndex) => [
        { content: rowIndex + 1, align: 'center' },
        { content: row.objective || "—", align: 'left' },
        { content: row.material || "—", align: 'left', className: 'preserve-line' },
        { content: row.jp || "—", align: 'center' },
        ...weekColumns.map((col, colIndex) =>
          ({ content: weekCell(row.weekMarks, col, colIndex), align: 'center' } as DocumentCellObject)
        ),
        { content: "", align: 'left' },
      ] as DocumentCell[])
    : undefined;

  /* ── Footer: Total Alokasi JP Semester ── */
  const totalJp = rows.reduce((sum, r) => {
    const n = numVal(r.jp);
    return sum + (isNaN(n) ? 0 : n);
  }, 0);

  const summaryRows: DocumentCell[][] = summaries.map((summary) => [
    { content: summary.label, colSpan: 3, align: 'left' },
    { content: summary.jp ?? "", align: 'center' },
    ...weekColumns.map((col, colIndex) =>
      ({ content: weekCell(summary.weekMarks, col, colIndex), align: 'center' } as DocumentCellObject)
    ),
    { content: "", align: 'left' },
  ]);

  const footer: DocumentCell[][] = [
    ...summaryRows,
    [
      { content: "Total Alokasi JP Semester", colSpan: 3, align: 'center' },
      { content: totalJp, align: 'center' },
      ...weekColumns.map(() => ({ content: "", align: 'center' } as DocumentCellObject)),
      { content: "", align: 'left' },
    ],
  ];

  return (
    <ReportFrame withPrintArea={withPrintArea} orientation="landscape">
      <DocumentHeader schoolName={data?.context?.schoolName} schoolAddress={data?.context?.schoolAddress} schoolOffice={data?.context?.schoolOffice} institutionName={data?.context?.institutionName} logoUrl={data?.context?.logoUrl} />
      <DocumentTitle title={upper(data?.title || "PROGRAM SEMESTER")} />
      <DocumentIdentityTable rows={[
        { label: "Tahun Pelajaran", value: data?.context?.academicYear },
        { label: "Semester", value: data?.context?.semester },
        { label: "Mata Pelajaran", value: data?.context?.subject },
        { label: "Kelas", value: data?.context?.classLabel },
        { label: "Alokasi Waktu", value: data?.allocationTime },
      ]} />
      <DocumentTable compact headers={headers} rows={dataRows} footer={footer} emptyText="Belum tersedia" />
      <DocumentSection title="Keterangan">
        <div className="promes-legend">
          {legend.map((item, index) => <div key={`${item.label}-${index}`} className="promes-legend-item"><span className="promes-legend-mark">{item.mark}</span><span>{item.label}</span></div>)}
        </div>
      </DocumentSection>
      <CommonSignature context={data?.context} />
    </ReportFrame>
  );
}

/** NAME-01 FIX: Deprecated alias — prefer PromesDocument directly.
    @deprecated Use PromesDocument instead. This alias will be removed in a future release. */
export const PromesReportDocument = PromesDocument;
