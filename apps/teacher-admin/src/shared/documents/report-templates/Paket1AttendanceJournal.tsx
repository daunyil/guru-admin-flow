import { DocumentTable } from "../DocumentLayout";
import type { DocumentCell, DocumentCellObject } from "../DocumentLayout";
import { ReportFrame, CommonHeader, CommonSignature } from "./ReportFrame";
import type {
  ReportTemplateProps,
  AttendanceReportData,
  JournalReportData,
} from "./types";
import { formatDateID, formatAbsSummary } from "./helpers";

export function AttendanceReportDocument({ data, withPrintArea = true }: ReportTemplateProps<AttendanceReportData>) {
  const TOTAL_MEETINGS = 18;
  const meetings = data?.meetings ?? [];
  const students = data?.students ?? [];
  const activeCount = Math.min(meetings.length > 0 ? meetings.length : TOTAL_MEETINGS, TOTAL_MEETINGS);
  const totalMeetingsHeld = activeCount;

  /* ── Header Row 1: rowSpan cells + colSpan groups ── */
  const row1: DocumentCell[] = [
    { content: "NO", rowSpan: 2, style: { width: '3%' }, align: 'center' },
    { content: "NIS/NISN", rowSpan: 2, style: { width: '9%' }, align: 'center' },
    { content: "NAMA SISWA", rowSpan: 2, style: { width: '20%' }, align: 'left' },
    { content: "PERTEMUAN KE-", colSpan: TOTAL_MEETINGS, align: 'center' },
    { content: "REKAP", colSpan: 4, align: 'center' },
    { content: "% HADIR", rowSpan: 2, style: { width: '6%' }, align: 'center' },
    { content: "KETERANGAN", rowSpan: 2, style: { width: '10%' }, align: 'left' },
  ];

  /* ── Header Row 2: leaf columns (1–18 + S I A H) ── */
  const row2: DocumentCell[] = [
    ...Array.from({ length: TOTAL_MEETINGS }, (_, i) =>
      ({ content: String(i + 1), style: { width: '2.2%' }, align: 'center' } as DocumentCellObject)
    ),
    { content: "S", style: { width: '2.5%' }, align: 'center' },
    { content: "I", style: { width: '2.5%' }, align: 'center' },
    { content: "A", style: { width: '2.5%' }, align: 'center' },
    { content: "H", style: { width: '2.5%' }, align: 'center' },
  ];

  const headers = [row1, row2];

  /* ── Data Rows with % Hadir calculation ── */
  const rows: DocumentCell[][] | undefined = students.length > 0
    ? students.map((student, index) => {
        const statuses = student.statuses ?? [];
        const sick = student.summary?.sick ?? 0;
        const excused = student.summary?.excused ?? 0;
        const absent = student.summary?.absent ?? 0;
        const hadir = Math.max(0, totalMeetingsHeld - sick - excused - absent);
        const pctHadir = totalMeetingsHeld > 0 ? Math.round((hadir / totalMeetingsHeld) * 100) : 0;

        return [
          { content: student.no ?? index + 1, align: 'center' },
          { content: student.nis || "—", align: 'center' },
          { content: student.name, align: 'left' },
          ...Array.from({ length: TOTAL_MEETINGS }, (_, mi) =>
            ({ content: statuses[mi] || "", align: 'center' } as DocumentCellObject)
          ),
          { content: sick, align: 'center' },
          { content: excused, align: 'center' },
          { content: absent, align: 'center' },
          { content: hadir, align: 'center' },
          { content: `${pctHadir}%`, align: 'center' },
          { content: "", align: 'left' },
        ] as DocumentCell[];
      })
    : undefined;

  /* ── Footer: Rata-rata Kelas ── */
  const totalSick   = students.reduce((s, st) => s + (st.summary?.sick ?? 0), 0);
  const totalExcused = students.reduce((s, st) => s + (st.summary?.excused ?? 0), 0);
  const totalAbsent  = students.reduce((s, st) => s + (st.summary?.absent ?? 0), 0);
  const totalHadir   = students.reduce((s, st) => {
    const h = Math.max(0, totalMeetingsHeld - (st.summary?.sick ?? 0) - (st.summary?.excused ?? 0) - (st.summary?.absent ?? 0));
    return s + h;
  }, 0);
  const avgSick    = students.length > 0 ? Math.round(totalSick / students.length) : 0;
  const avgExcused = students.length > 0 ? Math.round(totalExcused / students.length) : 0;
  const avgAbsent  = students.length > 0 ? Math.round(totalAbsent / students.length) : 0;
  const avgHadir   = students.length > 0 ? Math.round(totalHadir / students.length) : 0;
  const avgPct     = students.length > 0 && totalMeetingsHeld > 0
    ? Math.round((totalHadir / (students.length * totalMeetingsHeld)) * 100)
    : 0;

  const footer: DocumentCell[][] = [
    [
      { content: "Rata-rata Kelas", colSpan: 3, align: 'center' },
      ...Array.from({ length: TOTAL_MEETINGS }, () => ({ content: "", align: 'center' } as DocumentCellObject)),
      { content: avgSick, align: 'center' },
      { content: avgExcused, align: 'center' },
      { content: avgAbsent, align: 'center' },
      { content: avgHadir, align: 'center' },
      { content: `${avgPct}%`, align: 'center' },
      { content: "", align: 'left' },
    ],
  ];

  return (
    <ReportFrame withPrintArea={withPrintArea} orientation="landscape">
      <CommonHeader context={data?.context} title="DAFTAR HADIR SISWA" subtitle="Kehadiran siswa pada kegiatan tatap muka per pertemuan" />
      <DocumentTable compact headers={headers} rows={rows} footer={footer} emptyText="Belum tersedia" />
      <CommonSignature context={data?.context} />
    </ReportFrame>
  );
}

export function JournalReportDocument({ data, withPrintArea = true }: ReportTemplateProps<JournalReportData>) {
  const rows = data?.rows ?? [];

  /* ── Headers: 7 kolom sesuai Master Prompt ── */
  const headers: DocumentCell[][] = [
    [
      { content: "NO", style: { width: '4%' }, align: 'center' },
      { content: "HARI / TGL", style: { width: '14%' }, align: 'center' },
      { content: "JAM KE-", style: { width: '7%' }, align: 'center' },
      { content: "KELAS", style: { width: '8%' }, align: 'center' },
      { content: "MATERI / TUJUAN PEMBELAJARAN", style: { width: '30%' }, align: 'left' },
      { content: "ABSENSI (S/I/A)", style: { width: '12%' }, align: 'center' },
      { content: "CATATAN / KET", style: { width: '25%' }, align: 'left' },
    ],
  ];

  /* ── Data Rows ── */
  const dataRows: DocumentCell[][] | undefined = rows.length > 0
    ? rows.map((row, index) => [
        { content: row.no ?? index + 1, align: 'center' },
        { content: formatDateID(row.date), align: 'center' },
        { content: row.hourSlot || "—", align: 'center' },
        { content: row.classLabel || data?.context?.classLabel || "—", align: 'center' },
        { content: row.material || row.activity || "—", align: 'left' },
        { content: formatAbsSummary(row.attendanceSummary) || row.attendanceNote || "—", align: 'center' },
        { content: row.note ?? row.reflection ?? "", align: 'left' },
      ] as DocumentCell[])
    : undefined;

  return (
    <ReportFrame withPrintArea={withPrintArea}>
      <CommonHeader context={data?.context} title="JURNAL AGENDA MENGAJAR" subtitle="Log catatan pelaksanaan KBM harian guru" />
      <DocumentTable headers={headers} rows={dataRows} emptyText="Belum tersedia" />
      <CommonSignature context={data?.context} />
    </ReportFrame>
  );
}
