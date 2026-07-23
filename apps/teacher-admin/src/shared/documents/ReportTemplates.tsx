import type { ReactNode } from "react";
import {
  DocumentHeader,
  DocumentIdentityTable,
  DocumentPage,
  DocumentSection,
  DocumentSignature,
  DocumentStatusBadge,
  DocumentSummaryCards,
  DocumentTable,
  DocumentTitle,
  type DocumentSummaryCard,
  type DocumentCell,
  type DocumentCellObject,
} from "./DocumentLayout";

export interface DocumentContext {
  schoolName?: string;
  schoolAddress?: string;
  schoolOffice?: string;
  institutionName?: string;
  logoUrl?: string;
  academicYear?: string;
  semester?: string | number;
  teacherName?: string;
  teacherNip?: string;
  subject?: string;
  classLabel?: string;
  phase?: string;
  headmasterName?: string;
  headmasterNip?: string;
  place?: string;
  dateLabel?: string;
}

export interface ReportTemplateProps<T> {
  data?: T;
  withPrintArea?: boolean;
}

export interface AdminPackageItem {
  name: string;
  group?: string;
  source?: "official" | "teacher" | "app";
  status?: "complete" | "incomplete" | "draft" | "missing";
  note?: string;
}

export interface AdminPackageReportData {
  context?: DocumentContext;
  items?: AdminPackageItem[];
  summary?: DocumentSummaryCard[];
}

export interface OfficialDocumentItem {
  no?: number | string;
  name: string;
  source?: string;
  year?: string;
  status?: string;
  note?: string;
}

export interface OfficialDocumentArchiveData {
  context?: DocumentContext;
  items?: OfficialDocumentItem[];
}

export interface EffectiveWeekRow {
  month: string;
  totalWeeks?: number | string;
  nonEffectiveWeeks?: number | string;
  effectiveWeeks?: number | string;
  activities?: string;
}

export interface EffectiveWeekDetailData {
  context?: DocumentContext;
  rows?: EffectiveWeekRow[];
  totalEffectiveWeeks?: number | string;
  totalEffectiveHours?: number | string;
  note?: string;
}

export interface SemesterReportRow {
  no?: number | string;
  component?: string;
  total?: number | string;
  note?: string;
}

export interface SemesterReportData {
  context?: DocumentContext;
  attendanceSummary?: SemesterReportRow[];
  journalSummary?: SemesterReportRow[];
  gradeSummary?: SemesterReportRow[];
  notes?: string[];
}

export interface AttendanceMeeting {
  label: string;
  date?: string;
}

export interface AttendanceStudentRow {
  no?: number | string;
  nis?: string;
  name: string;
  statuses?: Array<string | undefined>;
  summary?: { sick?: number; excused?: number; absent?: number };
}

export interface AttendanceReportData {
  context?: DocumentContext;
  meetings?: AttendanceMeeting[];
  students?: AttendanceStudentRow[];
}

export interface JournalReportRow {
  no?: number | string;
  date?: string;
  /** Jam pelajaran ke- (misal: "1-2" atau "3") */
  hourSlot?: string;
  classLabel?: string;
  subject?: string;
  material?: string;
  activity?: string;
  attendanceNote?: string;
  /** Rekap absensi harian singkat: { sick?: number; excused?: number; absent?: number } */
  attendanceSummary?: { sick?: number; excused?: number; absent?: number };
  reflection?: string;
  note?: string;
}

export interface JournalReportData {
  context?: DocumentContext;
  rows?: JournalReportRow[];
}

export interface GradeKdColumn {
  id: string;
  label: string;
}

export interface GradeReportRow {
  no?: number | string;
  nis?: string;
  name: string;
  /** SA-01: number | null preserves "explicitly empty" vs "not applicable" semantics. */
  kdScores?: Record<string, number | string | null | undefined>;
  /** Formatif TP scores (Kurikulum Merdeka). Falls back to first 4 kdScores if not provided. */
  tpScores?: Array<number | string | null | undefined>;
  ptsScore?: number | string | null;
  /** Sumatif Tengah Semester (Kurikulum Merdeka). Falls back to ptsScore. */
  stsScore?: number | string | null;
  pasScore?: number | string | null;
  /** Sumatif Akhir Semester (Kurikulum Merdeka). Falls back to pasScore. */
  sasScore?: number | string | null;
  finalScore?: number | string | null;
  /** Nilai Akhir (Kurikulum Merdeka). Falls back to finalScore. */
  naScore?: number | string | null;
  predicate?: string;
  /** Deskripsi Capaian Kompetensi (Kurikulum Merdeka). Falls back to note. */
  capaian?: string;
  note?: string;
}

export interface GradeReportData {
  context?: DocumentContext;
  kktp?: number | string;
  kdColumns?: GradeKdColumn[];
  rows?: GradeReportRow[];
}

export interface MasteryAnalysisRow {
  no?: number | string;
  nis?: string;
  name: string;
  kdMastery?: Record<string, number | string | undefined>;
  average?: number | string;
  masteryStatus?: string;
  followUp?: string;
}

export interface MasteryAnalysisData {
  context?: DocumentContext;
  kktp?: number | string;
  kdColumns?: GradeKdColumn[];
  rows?: MasteryAnalysisRow[];
}

export interface RemedialReportRow {
  no?: number | string;
  name: string;
  scoreBefore?: number | string;
  remedialActivity?: string;
  scoreAfter?: number | string;
  note?: string;
}

export interface RemedialReportData {
  context?: DocumentContext;
  kktp?: number | string;
  rows?: RemedialReportRow[];
  conclusion?: string;
}

export interface EnrichmentReportRow {
  no?: number | string;
  name: string;
  score?: number | string;
  enrichmentActivity?: string;
  product?: string;
  note?: string;
}

export interface EnrichmentReportData {
  context?: DocumentContext;
  threshold?: number | string;
  rows?: EnrichmentReportRow[];
  conclusion?: string;
}

export interface LKPDQuestion {
  no?: number | string;
  text: string;
  answerSpace?: string;
}

export interface LKPDActivity {
  title: string;
  instruction?: string;
  questions?: LKPDQuestion[];
}

/* ── Prota (Program Tahunan) data types ── */

export interface ProtaRow {
  semester?: number | string;
  atpNumber?: string;
  learningObjective?: string;
  allocationJp?: number | string;
}

export interface ProtaData {
  context?: DocumentContext;
  title?: string;
  rows?: ProtaRow[];
}

export interface LKPDData {
  context?: DocumentContext;
  title?: string;
  learningObjectives?: string[];
  studentIdentityFields?: string[];
  instructions?: string[];
  activities?: LKPDActivity[];
  assessmentNote?: string;
}

export interface PromesWeekColumn {
  month: string;
  week: string;
}

export interface PromesRow {
  objective?: string;
  material?: string;
  jp?: string | number;
  weekMarks?: Record<string, ReactNode>;
}

export interface PromesSummaryRow {
  label: string;
  jp?: string | number;
  weekMarks?: Record<string, ReactNode>;
}

export interface PromesLegendItem {
  label: string;
  mark: ReactNode;
}

export interface PromesData {
  context?: DocumentContext;
  title?: string;
  allocationTime?: string;
  weekColumns?: PromesWeekColumn[];
  rows?: PromesRow[];
  summaries?: PromesSummaryRow[];
  legend?: PromesLegendItem[];
}

export interface QuestionGridRow {
  no?: number | string;
  competency?: string;
  material?: string;
  indicator?: string;
  cognitiveLevel?: string;
  questionForm?: string;
  questionNumbers?: string;
}

export interface QuestionGridData {
  context?: DocumentContext;
  assessmentTitle?: string;
  rows?: QuestionGridRow[];
}

export interface QuestionCardOption {
  label: string;
  text: string;
}

export interface QuestionCardItem {
  number?: number | string;
  competency?: string;
  material?: string;
  indicator?: string;
  cognitiveLevel?: string;
  questionForm?: string;
  questionText?: string;
  options?: QuestionCardOption[];
  answerKey?: string;
  scoringGuide?: string;
}

export interface QuestionCardData {
  context?: DocumentContext;
  assessmentTitle?: string;
  items?: QuestionCardItem[];
}

export interface ExamQuestion {
  number?: number | string;
  text: string;
  options?: QuestionCardOption[];
}

export interface ExamPaperData {
  context?: DocumentContext;
  title?: string;
  duration?: string;
  instructions?: string[];
  multipleChoice?: ExamQuestion[];
  essays?: ExamQuestion[];
}

/* ── Paket 2: Supplementary School Document data types ── */

/** Effective Weeks (Rincian Minggu Efektif) — Table 1 rows */
export interface EffectiveWeeksRow {
  month?: string;
  totalWeeks?: number | string;
  nonEffectiveWeeks?: number | string;
  effectiveWeeks?: number | string;
  activities?: string;
}

/** Effective Weeks — Table 2 allocation rows */
export interface EffectiveWeeksAllocationRow {
  component?: string;
  jpPerWeek?: number | string;
  totalWeeks?: number | string;
  totalJp?: number | string;
}

export interface EffectiveWeeksData {
  context?: DocumentContext;
  rows?: EffectiveWeeksRow[];
  allocations?: EffectiveWeeksAllocationRow[];
  totalEffectiveWeeks?: number | string;
  totalJp?: number | string;
}

/** KKTP Analysis — per element/TP row */
export interface KktpAnalysisRow {
  element?: string;
  learningObjective?: string;
  /** Which interval column this TP falls into (0-4). 0=0-60%, 1=61-70%, 2=71-80%, 3=81-100% */
  intervalIndex?: number;
  intervalMark?: string;
  actionOrRecommendation?: string;
}

export interface KktpAnalysisData {
  context?: DocumentContext;
  kktp?: number | string;
  rows?: KktpAnalysisRow[];
}

/** Remedial & Enrichment combined */
export interface RemedialEnrichmentRow {
  no?: number | string;
  name: string;
  initialScore?: number | string;
  unfinishedTp?: string;
  activityType?: "Remedial" | "Pengayaan";
  activity?: string;
  finalScore?: number | string;
  status?: "TUNTAS" | "BELUM TUNTAS";
  note?: string;
}

export interface RemedialEnrichmentData {
  context?: DocumentContext;
  kktp?: number | string;
  rows?: RemedialEnrichmentRow[];
  conclusion?: string;
}

/** ATP (Alur Tujuan Pembelajaran) */
export interface AtpReportRow {
  element?: string;
  learningOutcome?: string;
  learningObjective?: string;
  allocationJp?: number | string;
  pancasilaProfile?: string;
}

export interface AtpReportData {
  context?: DocumentContext;
  rows?: AtpReportRow[];
}

/** Assessment Grid (Kisi-Kisi Penulisan Soal) — new spec */
export interface AssessmentGridRow {
  no?: number | string;
  element?: string;
  material?: string;
  indicator?: string;
  questionForm?: string;
  cognitiveLevel?: string;
  questionNumbers?: string;
}

export interface AssessmentGridData {
  context?: DocumentContext;
  assessmentTitle?: string;
  rows?: AssessmentGridRow[];
}

function upper(value?: string, fallback = "Belum tersedia"): string {
  return value ? value.toUpperCase() : fallback;
}

/** Predikat otomatis: A (≥90), B (80–89), C (70–79), D (<70) */
function predikat(na: number | string | null | undefined): string {
  if (na === null || na === undefined) return "—";
  const num = typeof na === "string" ? parseFloat(na) : na;
  if (isNaN(num as number)) return "—";
  if (num >= 90) return "A";
  if (num >= 80) return "B";
  if (num >= 70) return "C";
  return "D";
}

/** Helper: parse numeric value, returns NaN for non-numbers */
function numVal(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return NaN;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return typeof n === "number" && !isNaN(n) ? n : NaN;
}

/** Helper: compute average of numeric values, skip NaN */
function avgVals(vals: number[]): number {
  const valid = vals.filter((v) => !isNaN(v));
  return valid.length > 0 ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0;
}

/** Format tanggal ke Bahasa Indonesia (misal: Senin, 14 Jul 2025).
 *  Accepts ISO date string (yyyy-mm-dd) or free-form string. */
function formatDateID(dateStr?: string): string {
  if (!dateStr) return "—";
  // Try parsing as ISO date
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agust", "Sep", "Okt", "Nov", "Des"];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }
  // Not ISO — return as-is
  return dateStr;
}

/** Format rekap absensi harian singkat (misal: S:1, I:0, A:0) */
function formatAbsSummary(summary?: { sick?: number; excused?: number; absent?: number }): string {
  if (!summary) return "—";
  return `S:${summary.sick ?? 0}, I:${summary.excused ?? 0}, A:${summary.absent ?? 0}`;
}

function formatPlaceDate(context?: DocumentContext): string {
  const place = context?.place || "................";
  const date = context?.dateLabel || "........................";
  return `${place}, ${date}`;
}

function makeIdentityRows(context?: DocumentContext, extraRows: Array<{ label: string; value?: ReactNode }> = []) {
  return [
    { label: "Nama Sekolah", value: context?.schoolName },
    { label: "Tahun Pelajaran", value: context?.academicYear },
    { label: "Nama Guru", value: context?.teacherName },
    { label: "Semester", value: context?.semester },
    { label: "Mata Pelajaran", value: context?.subject },
    { label: "Kelas", value: context?.classLabel },
    ...extraRows,
  ];
}

function ReportFrame({
  children,
  orientation = "portrait",
  withPrintArea = true,
}: {
  children: ReactNode;
  orientation?: "portrait" | "landscape";
  withPrintArea?: boolean;
}) {
  const page = <DocumentPage orientation={orientation}>{children}</DocumentPage>;
  return withPrintArea ? <div className="print-area">{page}</div> : page;
}

function CommonHeader({
  context,
  title,
  subtitle,
  extraIdentityRows,
}: {
  context?: DocumentContext;
  title: string;
  subtitle?: string;
  extraIdentityRows?: Array<{ label: string; value?: ReactNode }>;
}) {
  return (
    <>
      <DocumentHeader
        schoolName={context?.schoolName}
        schoolAddress={context?.schoolAddress}
        schoolOffice={context?.schoolOffice}
        institutionName={context?.institutionName}
        logoUrl={context?.logoUrl}
      />
      <DocumentTitle title={title} subtitle={subtitle} />
      <DocumentIdentityTable rows={makeIdentityRows(context, extraIdentityRows)} />
    </>
  );
}

function CommonSignature({ context }: { context?: DocumentContext }) {
  return (
    <DocumentSignature
      left={{ role: "Mengetahui,\nKepala Sekolah", name: context?.headmasterName, nip: context?.headmasterNip }}
      right={{
        role: "Guru Mata Pelajaran",
        name: context?.teacherName,
        nip: context?.teacherNip,
        placeDate: formatPlaceDate(context),
      }}
    />
  );
}

function statusTone(status?: AdminPackageItem["status"]) {
  if (status === "complete") return "complete";
  if (status === "draft") return "warning";
  if (status === "missing") return "danger";
  return "incomplete";
}

function statusText(status?: AdminPackageItem["status"]) {
  if (status === "complete") return "Lengkap";
  if (status === "draft") return "Draft";
  if (status === "missing") return "Belum Ada";
  return "Belum Lengkap";
}

function defaultKdColumns(): GradeKdColumn[] {
  return [
    { id: "kd1", label: "KD 1" },
    { id: "kd2", label: "KD 2" },
    { id: "kd3", label: "KD 3" },
    { id: "kd4", label: "KD 4" },
    { id: "kd5", label: "KD 5" },
    { id: "kd6", label: "KD 6" },
  ];
}

function defaultPromesWeeks(): PromesWeekColumn[] {
  return [
    ...["1", "2", "3", "4", "5"].map((week) => ({ month: "Juli", week })),
    ...["1", "2", "3", "4"].map((week) => ({ month: "Agustus", week })),
    ...["1", "2", "3", "4"].map((week) => ({ month: "September", week })),
    ...["1", "2", "3", "4", "5"].map((week) => ({ month: "Oktober", week })),
    ...["1", "2", "3", "4"].map((week) => ({ month: "November", week })),
    ...["1", "2", "3", "4", "5"].map((week) => ({ month: "Desember", week })),
  ];
}

export function AdminPackageReport({ data, withPrintArea = true }: ReportTemplateProps<AdminPackageReportData>) {
  const items = data?.items ?? [];
  const completeCount = items.filter((item) => item.status === "complete").length;
  const summary = data?.summary ?? [
    { label: "Total Dokumen", value: items.length || "0" },
    { label: "Lengkap", value: completeCount },
    { label: "Belum Lengkap", value: Math.max(0, items.length - completeCount) },
    { label: "Status", value: items.length > 0 ? "Terverifikasi" : "Belum tersedia" },
  ];

  return (
    <ReportFrame withPrintArea={withPrintArea}>
      <CommonHeader context={data?.context} title="PAKET ADMINISTRASI GURU" subtitle="Daftar kelengkapan dokumen administrasi pembelajaran" />
      <DocumentSection title="Ringkasan Dokumen"><DocumentSummaryCards items={summary} /></DocumentSection>
      <DocumentSection title="Checklist Paket Administrasi">
        <DocumentTable
          headers={[[{ content: "No", style: { width: '24pt' } }, { content: "Kelompok", style: { width: '50pt' } }, { content: "Nama Dokumen" }, { content: "Sumber", style: { width: '50pt' } }, { content: "Status", style: { width: '50pt' } }, { content: "Keterangan", style: { width: '60pt' } }]]}
          rows={items.map((item, index) => [
            index + 1,
            item.group || "—",
            item.name,
            item.source === "official" ? "Dokumen Resmi" : item.source === "teacher" ? "Guru" : "Aplikasi",
            { content: <DocumentStatusBadge tone={statusTone(item.status)}>{statusText(item.status)}</DocumentStatusBadge>, align: "center" },
            item.note || "—",
          ])}
        />
      </DocumentSection>
      <CommonSignature context={data?.context} />
    </ReportFrame>
  );
}

export function OfficialDocumentArchiveReport({ data, withPrintArea = true }: ReportTemplateProps<OfficialDocumentArchiveData>) {
  return (
    <ReportFrame withPrintArea={withPrintArea}>
      <CommonHeader context={data?.context} title="ARSIP DOKUMEN RESMI" subtitle="Kalender pendidikan, CP resmi, ATP, dan prota resmi" />
      <DocumentTable
        headers={[[{ content: "No", style: { width: '24pt' } }, { content: "Nama Dokumen" }, { content: "Sumber", style: { width: '50pt' } }, { content: "Tahun", style: { width: '36pt' } }, { content: "Status", style: { width: '50pt' } }, { content: "Keterangan", style: { width: '60pt' } }]]}
        rows={(data?.items ?? []).map((item, index) => [
          item.no ?? index + 1,
          item.name,
          item.source || "—",
          item.year || data?.context?.academicYear || "—",
          item.status || "Tersimpan",
          item.note || "—",
        ])}
      />
      <CommonSignature context={data?.context} />
    </ReportFrame>
  );
}

export function EffectiveWeekDetailDocument({ data, withPrintArea = true }: ReportTemplateProps<EffectiveWeekDetailData>) {
  return (
    <ReportFrame withPrintArea={withPrintArea}>
      <CommonHeader context={data?.context} title="RINCIAN MINGGU EFEKTIF" subtitle="Berdasarkan kalender pendidikan dinas/sekolah yang diinput sebagai referensi" />
      <DocumentTable
        headers={[[{ content: "No", style: { width: '24pt' } }, { content: "Bulan", style: { width: '50pt' } }, { content: "Jumlah Minggu", style: { width: '36pt' } }, { content: "Minggu Tidak Efektif", style: { width: '36pt' } }, { content: "Minggu Efektif", style: { width: '36pt' } }, { content: "Kegiatan/Keterangan" }]]}
        rows={(data?.rows ?? []).map((row, index) => [
          index + 1,
          row.month,
          row.totalWeeks ?? "—",
          row.nonEffectiveWeeks ?? "—",
          row.effectiveWeeks ?? "—",
          row.activities || "—",
        ])}
      />
      <DocumentSection title="Rekapitulasi">
        <DocumentIdentityTable
          columns={1}
          rows={[
            { label: "Total Minggu Efektif", value: data?.totalEffectiveWeeks },
            { label: "Total Jam Efektif", value: data?.totalEffectiveHours },
            { label: "Catatan", value: data?.note || "Mengacu pada kalender pendidikan resmi." },
          ]}
        />
      </DocumentSection>
      <CommonSignature context={data?.context} />
    </ReportFrame>
  );
}

export function SemesterReportDocument({ data, withPrintArea = true }: ReportTemplateProps<SemesterReportData>) {
  const notes = data?.notes ?? [];
  return (
    <ReportFrame withPrintArea={withPrintArea}>
      <CommonHeader context={data?.context} title="LAPORAN AKHIR SEMESTER" subtitle="Rekapitulasi kegiatan pembelajaran, kehadiran, jurnal, dan nilai" />
      <DocumentSection title="Rekap Kehadiran"><DocumentTable headers={[["No", "Komponen", "Jumlah", "Keterangan"]]} rows={(data?.attendanceSummary ?? []).map((row, index) => [row.no ?? index + 1, row.component, row.total, row.note || "—"])} /></DocumentSection>
      <DocumentSection title="Rekap Jurnal Mengajar"><DocumentTable headers={[["No", "Komponen", "Jumlah", "Keterangan"]]} rows={(data?.journalSummary ?? []).map((row, index) => [row.no ?? index + 1, row.component, row.total, row.note || "—"])} /></DocumentSection>
      <DocumentSection title="Rekap Nilai"><DocumentTable headers={[["No", "Komponen", "Jumlah", "Keterangan"]]} rows={(data?.gradeSummary ?? []).map((row, index) => [row.no ?? index + 1, row.component, row.total, row.note || "—"])} /></DocumentSection>
      <DocumentSection title="Catatan Guru">
        {notes.length > 0 ? <ol className="document-ordered-list">{notes.map((note, index) => <li key={`${note}-${index}`}>{note}</li>)}</ol> : <p className="document-empty-text">Belum tersedia</p>}
      </DocumentSection>
      <CommonSignature context={data?.context} />
    </ReportFrame>
  );
}

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

export function GradeReportDocument({ data, withPrintArea = true }: ReportTemplateProps<GradeReportData>) {
  const rows = data?.rows ?? [];
  const TOTAL_TP = 4;

  /* ── Resolve TP scores: prefer tpScores, fall back to kdScores ── */
  const resolveTp = (row: GradeReportRow): Array<number | string | null | undefined> => {
    if (row.tpScores && row.tpScores.length > 0) return row.tpScores.slice(0, TOTAL_TP);
    if (row.kdScores) {
      const kdCols = data?.kdColumns ?? defaultKdColumns();
      return kdCols.slice(0, TOTAL_TP).map((col) => row.kdScores?.[col.id]);
    }
    return [null, null, null, null];
  };

  /* ── Resolve STS/SAS/NA: prefer new fields, fall back to old ── */
  const sts  = (row: GradeReportRow) => row.stsScore ?? row.ptsScore ?? null;
  const sas  = (row: GradeReportRow) => row.sasScore ?? row.pasScore ?? null;
  const na   = (row: GradeReportRow) => row.naScore ?? row.finalScore ?? null;
  const desc = (row: GradeReportRow) => row.capaian ?? row.note ?? "";

  /* ── Header Row 1 ── */
  const row1: DocumentCell[] = [
    { content: "NO", rowSpan: 2, style: { width: '3%' }, align: 'center' },
    { content: "NIS/NISN", rowSpan: 2, style: { width: '9%' }, align: 'center' },
    { content: "NAMA SISWA", rowSpan: 2, style: { width: '22%' }, align: 'left' },
    { content: "FORMATIF (TP)", colSpan: TOTAL_TP, align: 'center' },
    { content: "SUMATIF", colSpan: 2, align: 'center' },
    { content: "NA", rowSpan: 2, style: { width: '5%' }, align: 'center' },
    { content: "PREDIKAT", rowSpan: 2, style: { width: '6%' }, align: 'center' },
    { content: "CAPAIAN KOMPETENSI / DESKRIPSI", rowSpan: 2, style: { width: '23%' }, align: 'left' },
  ];

  /* ── Header Row 2: leaf columns ── */
  const tpLabels = data?.kdColumns && data.kdColumns.length >= TOTAL_TP
    ? data.kdColumns.slice(0, TOTAL_TP).map((col) => col.label)
    : ["TP1", "TP2", "TP3", "TP4"];

  const row2: DocumentCell[] = [
    ...tpLabels.map((label) => ({ content: label, style: { width: '4.5%' }, align: 'center' } as DocumentCellObject)),
    { content: "STS", style: { width: '5%' }, align: 'center' },
    { content: "SAS", style: { width: '5%' }, align: 'center' },
  ];

  const headers = [row1, row2];

  /* ── Data Rows ── */
  const dataRows: DocumentCell[][] | undefined = rows.length > 0
    ? rows.map((row, index) => {
        const tpVals = resolveTp(row);
        const naVal  = na(row);
        const pred   = row.predicate || predikat(naVal);
        return [
          { content: row.no ?? index + 1, align: 'center' },
          { content: row.nis || "—", align: 'center' },
          { content: row.name, align: 'left' },
          ...tpVals.map((v) => ({ content: v ?? "—", align: 'center' } as DocumentCellObject)),
          { content: sts(row) ?? "—", align: 'center' },
          { content: sas(row) ?? "—", align: 'center' },
          { content: naVal ?? "—", align: 'center' },
          { content: pred, align: 'center' },
          { content: desc(row) || "—", align: 'left' },
        ] as DocumentCell[];
      })
    : undefined;

  /* ── Footer: Rata-rata Kelas ── */
  const avgTp = Array.from({ length: TOTAL_TP }, (_, ti) =>
    avgVals(rows.map((r) => numVal(resolveTp(r)[ti])))
  );
  const avgSTS = avgVals(rows.map((r) => numVal(sts(r))));
  const avgSAS = avgVals(rows.map((r) => numVal(sas(r))));
  const avgNA  = avgVals(rows.map((r) => numVal(na(r))));

  const footer: DocumentCell[][] = [
    [
      { content: "Rata-rata Kelas", colSpan: 3, align: 'center' },
      ...avgTp.map((v) => ({ content: v, align: 'center' } as DocumentCellObject)),
      { content: avgSTS, align: 'center' },
      { content: avgSAS, align: 'center' },
      { content: avgNA, align: 'center' },
      { content: predikat(avgNA), align: 'center' },
      { content: "", align: 'left' },
    ],
  ];

  return (
    <ReportFrame withPrintArea={withPrintArea} orientation="landscape">
      <CommonHeader
        context={data?.context}
        title="LAPORAN NILAI / ASESMEN"
        subtitle="Nilai Formatif (TP), Sumatif (STS & SAS), Nilai Akhir, Predikat, dan Deskripsi Capaian"
        extraIdentityRows={[{ label: "KKTP/KKM", value: data?.kktp }]}
      />
      <DocumentTable compact headers={headers} rows={dataRows} footer={footer} emptyText="Belum tersedia" />
      <CommonSignature context={data?.context} />
    </ReportFrame>
  );
}

export function MasteryAnalysisDocument({ data, withPrintArea = true }: ReportTemplateProps<MasteryAnalysisData>) {
  const kdColumns = data?.kdColumns && data.kdColumns.length > 0 ? data.kdColumns : defaultKdColumns();

  return (
    <ReportFrame withPrintArea={withPrintArea} orientation="landscape">
      <CommonHeader
        context={data?.context}
        title="ANALISIS KETUNTASAN"
        subtitle="Analisis ketuntasan siswa per KD"
        extraIdentityRows={[{ label: "KKTP/KKM", value: data?.kktp }]}
      />
      <DocumentTable
        className="grade-kd-table"
        headers={[[{ content: "No", style: { width: '24pt' } }, { content: "Nomor Induk", style: { width: '48pt' } }, { content: "Nama Siswa", style: { width: '120pt' } }, ...kdColumns.map((col) => ({ content: col.label, style: { width: '28pt' } })), { content: "Rata-rata", style: { width: '40pt' } }, { content: "Ketuntasan", style: { width: '44pt' } }, { content: "Tindak Lanjut" }]]}
        rows={(data?.rows ?? []).map((row, index) => [
          row.no ?? index + 1,
          row.nis || "—",
          row.name,
          ...kdColumns.map((col) => row.kdMastery?.[col.id] ?? "—"),
          row.average ?? "—",
          row.masteryStatus || "—",
          row.followUp || "—",
        ])}
      />
      <CommonSignature context={data?.context} />
    </ReportFrame>
  );
}

export function RemedialReportDocument({ data, withPrintArea = true }: ReportTemplateProps<RemedialReportData>) {
  const rows = data?.rows ?? [];
  return (
    <ReportFrame withPrintArea={withPrintArea}>
      <CommonHeader context={data?.context} title="PROGRAM REMEDIAL" subtitle="Tindak lanjut bagi siswa yang belum mencapai KKTP" extraIdentityRows={[{ label: "KKTP", value: data?.kktp }]} />
      <DocumentTable
        headers={[[{ content: "No", style: { width: '24pt' } }, { content: "Nama Siswa", style: { width: '80pt' } }, { content: "Nilai Awal", style: { width: '36pt' } }, { content: "Bentuk Remedial" }, { content: "Nilai Setelah Remedial", style: { width: '36pt' } }, { content: "Keterangan", style: { width: '50pt' } }]]}
        rows={rows.map((row, index) => [row.no ?? index + 1, row.name, row.scoreBefore ?? "—", row.remedialActivity || "Pembelajaran ulang / tugas perbaikan", row.scoreAfter ?? "—", row.note || "—"])}
        emptyText="Tidak terdapat siswa yang mengikuti remedial karena seluruh siswa telah mencapai KKTP."
      />
      <DocumentSection title="Kesimpulan">
        <p className="document-paragraph">{data?.conclusion || (rows.length > 0 ? "Program remedial dilaksanakan untuk membantu siswa mencapai kompetensi yang ditetapkan." : "Tidak terdapat siswa yang memerlukan program remedial pada periode ini.")}</p>
      </DocumentSection>
      <CommonSignature context={data?.context} />
    </ReportFrame>
  );
}

export function EnrichmentReportDocument({ data, withPrintArea = true }: ReportTemplateProps<EnrichmentReportData>) {
  const rows = data?.rows ?? [];
  return (
    <ReportFrame withPrintArea={withPrintArea}>
      <CommonHeader context={data?.context} title="PROGRAM PENGAYAAN" subtitle="Tindak lanjut bagi siswa yang telah mencapai capaian tinggi" extraIdentityRows={[{ label: "Batas Pengayaan", value: data?.threshold }]} />
      <DocumentTable
        headers={[[{ content: "No", style: { width: '24pt' } }, { content: "Nama Siswa", style: { width: '80pt' } }, { content: "Nilai", style: { width: '36pt' } }, { content: "Kegiatan Pengayaan" }, { content: "Produk/Hasil", style: { width: '50pt' } }, { content: "Keterangan", style: { width: '50pt' } }]]}
        rows={rows.map((row, index) => [row.no ?? index + 1, row.name, row.score ?? "—", row.enrichmentActivity || "Tugas pengayaan / proyek mandiri", row.product || "—", row.note || "—"])}
        emptyText="Tidak terdapat siswa yang masuk program pengayaan pada periode ini."
      />
      <DocumentSection title="Kesimpulan">
        <p className="document-paragraph">{data?.conclusion || (rows.length > 0 ? "Program pengayaan diberikan untuk memperluas dan memperdalam penguasaan materi siswa." : "Program pengayaan belum dilaksanakan karena belum ada siswa yang memenuhi kriteria pengayaan.")}</p>
      </DocumentSection>
      <CommonSignature context={data?.context} />
    </ReportFrame>
  );
}

export function LKPDDocument({ data, withPrintArea = true }: ReportTemplateProps<LKPDData>) {
  const objectives = data?.learningObjectives ?? [];
  const instructions = data?.instructions ?? [];
  const activities = data?.activities ?? [];
  const identityFields = data?.studentIdentityFields ?? ["Nama", "Kelas", "No. Absen", "Kelompok"];

  return (
    <ReportFrame withPrintArea={withPrintArea}>
      <CommonHeader context={data?.context} title={upper(data?.title || "LEMBAR KERJA PESERTA DIDIK")} subtitle="LKPD Pembelajaran" />
      <DocumentSection title="Identitas Peserta Didik">
        <DocumentIdentityTable columns={1} rows={identityFields.map((field) => ({ label: field, value: "........................................" }))} />
      </DocumentSection>
      <DocumentSection title="Tujuan Pembelajaran">
        {objectives.length > 0 ? <ol className="document-ordered-list">{objectives.map((objective, index) => <li key={`${objective}-${index}`}>{objective}</li>)}</ol> : <p className="document-empty-text">Belum tersedia</p>}
      </DocumentSection>
      <DocumentSection title="Petunjuk Pengerjaan">
        {instructions.length > 0 ? <ol className="document-ordered-list">{instructions.map((instruction, index) => <li key={`${instruction}-${index}`}>{instruction}</li>)}</ol> : <p className="document-empty-text">Belum tersedia</p>}
      </DocumentSection>
      {activities.length > 0 ? activities.map((activity, activityIndex) => (
        <DocumentSection key={`${activity.title}-${activityIndex}`} title={`Kegiatan ${activityIndex + 1}: ${activity.title}`} subtitle={activity.instruction}>
          <DocumentTable headers={[["No", "Pertanyaan/Tugas", "Jawaban"]]} rows={(activity.questions ?? []).map((question, index) => [question.no ?? index + 1, question.text, question.answerSpace || "................................................................................................"])} />
        </DocumentSection>
      )) : <DocumentSection title="Kegiatan Pembelajaran"><p className="document-empty-text">Belum tersedia</p></DocumentSection>}
      <DocumentSection title="Catatan Penilaian">
        <p className="document-paragraph">{data?.assessmentNote || "Penilaian dilakukan berdasarkan kelengkapan jawaban, ketepatan konsep, kerja sama, dan kemampuan menyampaikan pendapat."}</p>
      </DocumentSection>
    </ReportFrame>
  );
}

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

export function QuestionGridDocument({ data, withPrintArea = true }: ReportTemplateProps<QuestionGridData>) {
  return (
    <ReportFrame withPrintArea={withPrintArea} orientation="landscape">
      <CommonHeader context={data?.context} title="KISI-KISI SOAL" subtitle={data?.assessmentTitle || "Penilaian / Sumatif"} />
      <DocumentTable
        className="question-grid-table"
        headers={[[{ content: "No", style: { width: '24pt' } }, { content: "TP/KD", style: { width: '60pt' } }, { content: "Materi", style: { width: '80pt' } }, { content: "Indikator Soal" }, { content: "Level Kognitif", style: { width: '60pt' } }, { content: "Bentuk Soal", style: { width: '60pt' } }, { content: "Nomor Soal", style: { width: '60pt' } }]]}
        rows={(data?.rows ?? []).map((row, index) => [
          row.no ?? index + 1,
          row.competency || "—",
          row.material || "—",
          row.indicator || "—",
          row.cognitiveLevel || "—",
          row.questionForm || "—",
          row.questionNumbers || "—",
        ])}
      />
      <CommonSignature context={data?.context} />
    </ReportFrame>
  );
}

export function QuestionCardDocument({ data, withPrintArea = true }: ReportTemplateProps<QuestionCardData>) {
  const items = data?.items ?? [];

  return (
    <ReportFrame withPrintArea={withPrintArea}>
      <CommonHeader context={data?.context} title="KARTU SOAL" subtitle={data?.assessmentTitle || "Penilaian / Sumatif"} />
      {items.length > 0 ? items.map((item, index) => (
        <DocumentSection key={`question-card-${index}`} title={`Kartu Soal Nomor ${item.number ?? index + 1}`} className="question-card">
          <DocumentIdentityTable
            columns={1}
            rows={[
              { label: "TP/KD", value: item.competency },
              { label: "Materi", value: item.material },
              { label: "Indikator Soal", value: item.indicator },
              { label: "Level Kognitif", value: item.cognitiveLevel },
              { label: "Bentuk Soal", value: item.questionForm },
              { label: "Kunci Jawaban", value: item.answerKey },
            ]}
          />
          <p className="document-paragraph"><strong>Butir Soal:</strong><br />{item.questionText || "Belum tersedia"}</p>
          {item.options && item.options.length > 0 ? (
            <ol className="question-options" type="A">
              {item.options.map((option) => <li key={option.label}>{option.text}</li>)}
            </ol>
          ) : null}
          <p className="document-paragraph"><strong>Pedoman Penskoran:</strong><br />{item.scoringGuide || "Belum tersedia"}</p>
        </DocumentSection>
      )) : <p className="document-empty-text">Belum tersedia</p>}
      <CommonSignature context={data?.context} />
    </ReportFrame>
  );
}

export function ExamPaperDocument({ data, withPrintArea = true }: ReportTemplateProps<ExamPaperData>) {
  const instructions = data?.instructions ?? [
    "Berdoalah sebelum mengerjakan soal.",
    "Tuliskan identitas dengan lengkap.",
    "Kerjakan soal dengan teliti dan jujur.",
  ];

  return (
    <ReportFrame withPrintArea={withPrintArea}>
      <DocumentHeader schoolName={data?.context?.schoolName} schoolAddress={data?.context?.schoolAddress} schoolOffice={data?.context?.schoolOffice} institutionName={data?.context?.institutionName} logoUrl={data?.context?.logoUrl} />
      <DocumentTitle title={upper(data?.title || "NASKAH SOAL")} subtitle={data?.duration ? `Waktu: ${data.duration}` : undefined} />
      <DocumentIdentityTable
        columns={1}
        rows={[
          { label: "Nama Siswa", value: "........................................" },
          { label: "Kelas", value: data?.context?.classLabel || "........................................" },
          { label: "Mata Pelajaran", value: data?.context?.subject },
          { label: "Tahun Pelajaran", value: data?.context?.academicYear },
        ]}
      />
      <DocumentSection title="Petunjuk Pengerjaan">
        <ol className="document-ordered-list">
          {instructions.map((instruction, index) => <li key={`${instruction}-${index}`}>{instruction}</li>)}
        </ol>
      </DocumentSection>
      <DocumentSection title="A. Pilihan Ganda">
        {(data?.multipleChoice ?? []).length > 0 ? (
          <ol className="exam-question-list">
            {(data?.multipleChoice ?? []).map((question, index) => (
              <li key={`pg-${index}`}>
                <div>{question.text}</div>
                {question.options && question.options.length > 0 ? (
                  <ol type="A">
                    {question.options.map((option) => <li key={option.label}>{option.text}</li>)}
                  </ol>
                ) : null}
              </li>
            ))}
          </ol>
        ) : <p className="document-empty-text">Belum tersedia</p>}
      </DocumentSection>
      <DocumentSection title="B. Esai">
        {(data?.essays ?? []).length > 0 ? (
          <ol className="exam-question-list">
            {(data?.essays ?? []).map((question, index) => <li key={`essay-${index}`}>{question.text}</li>)}
          </ol>
        ) : <p className="document-empty-text">Belum tersedia</p>}
      </DocumentSection>
    </ReportFrame>
  );
}

/* ════════════════════════════════════════════════════════════════════════════════
   PAKET 2: Supplementary School Document Components
   ════════════════════════════════════════════════════════════════════════════════ */

/* ── EffectiveWeeksDocument: Rincian Minggu Efektif (A4 Portrait) ── */

export function EffectiveWeeksDocument({ data, withPrintArea = true }: ReportTemplateProps<EffectiveWeeksData>) {
  const rows = data?.rows ?? [];
  const allocations = data?.allocations ?? [];

  /* ── Table 1: Perhitungan Minggu Efektif per Bulan ── */
  const table1Headers: DocumentCell[][] = [
    [
      { content: "NO", style: { width: '5%' }, align: 'center' },
      { content: "BULAN", style: { width: '25%' }, align: 'left' },
      { content: "JML MINGGU", style: { width: '20%' }, align: 'center' },
      { content: "MINGGU TDK EFEKTIF", style: { width: '25%' }, align: 'center' },
      { content: "MINGGU EFEKTIF", style: { width: '25%' }, align: 'center' },
    ],
  ];

  const totalWeeksSum = rows.reduce((s, r) => s + (numVal(r.totalWeeks) || 0), 0);
  const nonEffSum = rows.reduce((s, r) => s + (numVal(r.nonEffectiveWeeks) || 0), 0);
  const effSum = rows.reduce((s, r) => s + (numVal(r.effectiveWeeks) || 0), 0);

  const table1Footer: DocumentCell[][] = [
    [
      { content: "TOTAL", colSpan: 2, align: 'center' },
      { content: totalWeeksSum, align: 'center' },
      { content: nonEffSum, align: 'center' },
      { content: effSum, align: 'center' },
    ],
  ];

  const table1Rows: DocumentCell[][] | undefined = rows.length > 0
    ? rows.map((row, i) => [
        { content: i + 1, align: 'center' },
        { content: row.month || "—", align: 'left' },
        { content: row.totalWeeks ?? "—", align: 'center' },
        { content: row.nonEffectiveWeeks ?? "—", align: 'center' },
        { content: row.effectiveWeeks ?? "—", align: 'center' },
      ] as DocumentCell[])
    : undefined;

  /* ── Table 2: Distribusi Alokasi Jam Pelajaran ── */
  const table2Headers: DocumentCell[][] = [
    [
      { content: "NO", style: { width: '5%' }, align: 'center' },
      { content: "KOMPONEN", style: { width: '35%' }, align: 'left' },
      { content: "JP PER MINGGU", style: { width: '20%' }, align: 'center' },
      { content: "TOTAL MINGGU EFEKTIF", style: { width: '20%' }, align: 'center' },
      { content: "TOTAL JP", style: { width: '20%' }, align: 'center' },
    ],
  ];

  const allocJpTotal = allocations.reduce((s, r) => s + (numVal(r.totalJp) || 0), 0);

  const table2Footer: DocumentCell[][] = [
    [
      { content: "TOTAL JP SEMESTER", colSpan: 4, align: 'center' },
      { content: data?.totalJp ?? allocJpTotal, align: 'center' },
    ],
  ];

  const table2Rows: DocumentCell[][] | undefined = allocations.length > 0
    ? allocations.map((alloc, i) => [
        { content: i + 1, align: 'center' },
        { content: alloc.component || "—", align: 'left' },
        { content: alloc.jpPerWeek ?? "—", align: 'center' },
        { content: alloc.totalWeeks ?? data?.totalEffectiveWeeks ?? "—", align: 'center' },
        { content: alloc.totalJp ?? "—", align: 'center' },
      ] as DocumentCell[])
    : undefined;

  return (
    <ReportFrame withPrintArea={withPrintArea}>
      <CommonHeader
        context={data?.context}
        title="RINCIAN MINGGU EFEKTIF"
        subtitle="Penghitungan alokasi jam pelajaran efektif berdasarkan kalender pendidikan"
      />
      <DocumentSection title="A. Perhitungan Jumlah Minggu Efektif per Bulan">
        <DocumentTable
          headers={table1Headers}
          rows={table1Rows}
          footer={table1Footer}
          emptyText="Belum tersedia"
        />
      </DocumentSection>
      <DocumentSection title="B. Distribusi Alokasi Jam Pelajaran" subtitle="Total JP = Minggu Efektif × JP per Minggu">
        <DocumentTable
          headers={table2Headers}
          rows={table2Rows}
          footer={table2Footer}
          emptyText="Belum tersedia"
        />
      </DocumentSection>
      <CommonSignature context={data?.context} />
    </ReportFrame>
  );
}

/* ── KktpAnalysisDocument: Analisis KKTP / Kriteria Ketuntasan (A4 Landscape) ── */

export function KktpAnalysisDocument({ data, withPrintArea = true }: ReportTemplateProps<KktpAnalysisData>) {
  const rows = data?.rows ?? [];

  const intervalLabels = ["0–60%", "61–70%", "71–80%", "81–100%"];
  const intervalDescriptions = ["Perlu Bimbingan", "Cukup", "Baik", "Sangat Baik"];

  /* ── Header Row 1: rowSpan + colSpan groups ── */
  const row1: DocumentCell[] = [
    { content: "NO", rowSpan: 2, style: { width: '4%' }, align: 'center' },
    { content: "ELEMEN", rowSpan: 2, style: { width: '16%' }, align: 'left' },
    { content: "TUJUAN PEMBELAJARAN (TP)", rowSpan: 2, style: { width: '30%' }, align: 'left' },
    { content: "INTERVAL KRITERIA KETERCAPAIAN", colSpan: 4, align: 'center' },
    { content: "KET / AKSI REKOMENDASI", rowSpan: 2, style: { width: '22%' }, align: 'left' },
  ];

  /* ── Header Row 2: interval columns with descriptions ── */
  const row2: DocumentCell[] = intervalLabels.map((label, i) =>
    ({ content: `${label}\n${intervalDescriptions[i]}`, style: { width: '7%' }, align: 'center' } as DocumentCellObject)
  );

  const headers = [row1, row2];

  /* ── Data Rows: checkmark in matching interval column ── */
  const dataRows: DocumentCell[][] | undefined = rows.length > 0
    ? rows.map((row, index) => {
        const intervalIdx = row.intervalIndex ?? -1;
        const mark = row.intervalMark ?? "✓";
        return [
          { content: index + 1, align: 'center' },
          { content: row.element || "—", align: 'left' },
          { content: row.learningObjective || "—", align: 'left' },
          ...intervalLabels.map((_, i) =>
            ({ content: i === intervalIdx ? mark : "", align: 'center' } as DocumentCellObject)
          ),
          { content: row.actionOrRecommendation || "", align: 'left' },
        ] as DocumentCell[];
      })
    : undefined;

  return (
    <ReportFrame withPrintArea={withPrintArea} orientation="landscape">
      <CommonHeader
        context={data?.context}
        title="ANALISIS KKTP"
        subtitle="Kriteria Ketuntasan Tujuan Pembelajaran — pemetaan interval nilai/rubrik"
        extraIdentityRows={[{ label: "KKTP/KKM", value: data?.kktp }]}
      />
      <DocumentTable compact headers={headers} rows={dataRows} emptyText="Belum tersedia" />
      <CommonSignature context={data?.context} />
    </ReportFrame>
  );
}

/* ── RemedialEnrichmentDocument: Laporan Remedial & Pengayaan (A4 Landscape) ── */

export function RemedialEnrichmentDocument({ data, withPrintArea = true }: ReportTemplateProps<RemedialEnrichmentData>) {
  const rows = data?.rows ?? [];

  /* ── Headers: single-row, percentage widths ── */
  const headers: DocumentCell[][] = [
    [
      { content: "NO", style: { width: '4%' }, align: 'center' },
      { content: "NAMA SISWA", style: { width: '20%' }, align: 'left' },
      { content: "NILAI AWAL", style: { width: '8%' }, align: 'center' },
      { content: "TP / KD BELUM TUNTAS", style: { width: '22%' }, align: 'left' },
      { content: "BENTUK KEGIATAN (REMEDIAL / PENGAYAAN)", style: { width: '26%' }, align: 'left' },
      { content: "NILAI AKHIR", style: { width: '8%' }, align: 'center' },
      { content: "KET", style: { width: '12%' }, align: 'center' },
    ],
  ];

  /* ── Data Rows ── */
  const dataRows: DocumentCell[][] | undefined = rows.length > 0
    ? rows.map((row, index) => {
        const isTuntas = row.status === "TUNTAS";
        const statusBadge = (
          <DocumentStatusBadge tone={isTuntas ? "complete" : "danger"}>
            {row.status || "—"}
          </DocumentStatusBadge>
        );
        return [
          { content: row.no ?? index + 1, align: 'center' },
          { content: row.name, align: 'left' },
          { content: row.initialScore ?? "—", align: 'center' },
          { content: row.unfinishedTp || "—", align: 'left' },
          { content: row.activity || (row.activityType === "Pengayaan" ? "Tugas pengayaan / proyek mandiri" : "Pembelajaran ulang / tugas perbaikan"), align: 'left' },
          { content: row.finalScore ?? "—", align: 'center' },
          { content: statusBadge, align: 'center' },
        ] as DocumentCell[];
      })
    : undefined;

  return (
    <ReportFrame withPrintArea={withPrintArea} orientation="landscape">
      <CommonHeader
        context={data?.context}
        title="LAPORAN REMEDIAL & PENGAYAAN"
        subtitle="Catatan pelaksanaan program perbaikan (remedial) dan pengayaan bagi siswa"
        extraIdentityRows={[{ label: "KKTP/KKM", value: data?.kktp }]}
      />
      <DocumentTable headers={headers} rows={dataRows} emptyText="Belum tersedia" />
      {data?.conclusion ? (
        <DocumentSection title="Kesimpulan">
          <p className="document-paragraph">{data.conclusion}</p>
        </DocumentSection>
      ) : rows.length > 0 ? (
        <DocumentSection title="Kesimpulan">
          <p className="document-paragraph">
            Program remedial dan pengayaan dilaksanakan untuk membantu siswa mencapai kompetensi
            yang ditetapkan serta memperluas penguasaan materi bagi siswa yang telah tuntas.
          </p>
        </DocumentSection>
      ) : null}
      <CommonSignature context={data?.context} />
    </ReportFrame>
  );
}

/* ── AtpReportDocument: Alur Tujuan Pembelajaran / ATP (A4 Landscape) ── */

export function AtpReportDocument({ data, withPrintArea = true }: ReportTemplateProps<AtpReportData>) {
  const rows = data?.rows ?? [];

  /* ── Headers: single-row, percentage widths ── */
  const headers: DocumentCell[][] = [
    [
      { content: "NO", style: { width: '4%' }, align: 'center' },
      { content: "ELEMEN", style: { width: '15%' }, align: 'left' },
      { content: "CAPAIAN PEMBELAJARAN (CP)", style: { width: '25%' }, align: 'left' },
      { content: "TUJUAN PEMBELAJARAN (TP)", style: { width: '30%' }, align: 'left' },
      { content: "ALOKASI (JP)", style: { width: '6%' }, align: 'center' },
      { content: "PROFIL PELAJAR PANCASILA", style: { width: '20%' }, align: 'left' },
    ],
  ];

  /* ── Data Rows ── */
  const dataRows: DocumentCell[][] | undefined = rows.length > 0
    ? rows.map((row, index) => [
        { content: index + 1, align: 'center' },
        { content: row.element || "—", align: 'left' },
        { content: row.learningOutcome || "—", align: 'left' },
        { content: row.learningObjective || "—", align: 'left', className: 'preserve-line' },
        { content: row.allocationJp ?? "—", align: 'center' },
        { content: row.pancasilaProfile || "—", align: 'left' },
      ] as DocumentCell[])
    : undefined;

  /* ── Footer: Total Jam Pelajaran ATP ── */
  const totalJp = rows.reduce((sum, r) => {
    const n = numVal(r.allocationJp);
    return sum + (isNaN(n) ? 0 : n);
  }, 0);

  const footer: DocumentCell[][] = [
    [
      { content: "Total Jam Pelajaran ATP", colSpan: 4, align: 'center' },
      { content: totalJp, align: 'center' },
      { content: "", align: 'left' },
    ],
  ];

  return (
    <ReportFrame withPrintArea={withPrintArea} orientation="landscape">
      <CommonHeader
        context={data?.context}
        title="ALUR TUJUAN PEMBELAJARAN (ATP)"
        subtitle="Peta alur materi pembelajaran Kurikulum Merdeka per semester"
      />
      <DocumentTable headers={headers} rows={dataRows} footer={footer} emptyText="Belum tersedia" />
      <CommonSignature context={data?.context} />
    </ReportFrame>
  );
}

/* ── AssessmentGridDocument: Kisi-Kisi Penulisan Soal (A4 Landscape) ── */

export function AssessmentGridDocument({ data, withPrintArea = true }: ReportTemplateProps<AssessmentGridData>) {
  const rows = data?.rows ?? [];

  /* ── Headers: single-row, percentage widths ── */
  const headers: DocumentCell[][] = [
    [
      { content: "NO", style: { width: '4%' }, align: 'center' },
      { content: "CAPAIAN / ELEMEN", style: { width: '18%' }, align: 'left' },
      { content: "MATERI", style: { width: '20%' }, align: 'left' },
      { content: "INDIKATOR SOAL", style: { width: '32%' }, align: 'left' },
      { content: "BENTUK SOAL", style: { width: '10%' }, align: 'center' },
      { content: "LEVEL", style: { width: '8%' }, align: 'center' },
      { content: "NO. SOAL", style: { width: '8%' }, align: 'center' },
    ],
  ];

  /* ── Data Rows ── */
  const dataRows: DocumentCell[][] | undefined = rows.length > 0
    ? rows.map((row, index) => [
        { content: row.no ?? index + 1, align: 'center' },
        { content: row.element || "—", align: 'left' },
        { content: row.material || "—", align: 'left' },
        { content: row.indicator || "—", align: 'left' },
        { content: row.questionForm || "—", align: 'center' },
        { content: row.cognitiveLevel || "—", align: 'center' },
        { content: row.questionNumbers || "—", align: 'center' },
      ] as DocumentCell[])
    : undefined;

  return (
    <ReportFrame withPrintArea={withPrintArea} orientation="landscape">
      <CommonHeader
        context={data?.context}
        title="KISI-KISI PENULISAN SOAL"
        subtitle={data?.assessmentTitle || "Asesmen Sumatif Tengah Semester (STS) / Akhir Semester (SAS)"}
      />
      <DocumentTable headers={headers} rows={dataRows} emptyText="Belum tersedia" />
      <CommonSignature context={data?.context} />
    </ReportFrame>
  );
}
