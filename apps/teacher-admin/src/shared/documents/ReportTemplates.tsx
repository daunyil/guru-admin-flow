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
  classLabel?: string;
  subject?: string;
  material?: string;
  activity?: string;
  attendanceNote?: string;
  reflection?: string;
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
  kdScores?: Record<string, number | string | undefined>;
  ptsScore?: number | string;
  pasScore?: number | string;
  finalScore?: number | string;
  predicate?: string;
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

function upper(value?: string, fallback = "Belum tersedia"): string {
  return value ? value.toUpperCase() : fallback;
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
          headers={[["No", "Kelompok", "Nama Dokumen", "Sumber", "Status", "Keterangan"]]}
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
        headers={[["No", "Nama Dokumen", "Sumber", "Tahun", "Status", "Keterangan"]]}
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
        headers={[["No", "Bulan", "Jumlah Minggu", "Minggu Tidak Efektif", "Minggu Efektif", "Kegiatan/Keterangan"]]}
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
  const meetings = data?.meetings ?? [];
  const students = data?.students ?? [];
  const activeMeetings = meetings.length > 0 ? meetings : [{ label: "1", date: "Belum tersedia" }];
  const totalColumns = 3 + activeMeetings.length + 3;

  return (
    <ReportFrame withPrintArea={withPrintArea} orientation="landscape">
      <CommonHeader context={data?.context} title="ABSENSI SISWA" subtitle="Kehadiran siswa pada kegiatan tatap muka" />
      <div className="document-table-wrap">
        <table className="document-table attendance-grid">
          <thead>
            <tr>
              <th rowSpan={3} className="w-no">No</th>
              <th rowSpan={3} className="w-nis">Nomor Induk</th>
              <th rowSpan={3} className="w-name">Nama Siswa</th>
              <th colSpan={activeMeetings.length}>Kehadiran Siswa Pada Kegiatan Tatap Muka</th>
              <th colSpan={3}>Jumlah</th>
            </tr>
            <tr>
              {activeMeetings.map((meeting, index) => <th key={`meeting-label-${index}`}>{meeting.label || index + 1}</th>)}
              <th>S</th><th>I</th><th>A</th>
            </tr>
            <tr>
              {activeMeetings.map((meeting, index) => <th key={`meeting-date-${index}`} className="date-cell">{meeting.date || "—"}</th>)}
              <th /><th /><th />
            </tr>
          </thead>
          <tbody>
            {students.length > 0 ? students.map((student, index) => (
              <tr key={`${student.name}-${index}`}>
                <td className="text-center">{student.no ?? index + 1}</td>
                <td className="text-center">{student.nis || "—"}</td>
                <td className="text-left">{student.name}</td>
                {activeMeetings.map((_, meetingIndex) => <td key={`status-${index}-${meetingIndex}`} className="text-center">{student.statuses?.[meetingIndex] || ""}</td>)}
                <td className="text-center">{student.summary?.sick ?? 0}</td>
                <td className="text-center">{student.summary?.excused ?? 0}</td>
                <td className="text-center">{student.summary?.absent ?? 0}</td>
              </tr>
            )) : <tr><td colSpan={totalColumns} className="text-center text-muted">Belum tersedia</td></tr>}
          </tbody>
        </table>
      </div>
      <CommonSignature context={data?.context} />
    </ReportFrame>
  );
}

export function JournalReportDocument({ data, withPrintArea = true }: ReportTemplateProps<JournalReportData>) {
  return (
    <ReportFrame withPrintArea={withPrintArea}>
      <CommonHeader context={data?.context} title="REKAP JURNAL MENGAJAR" subtitle="Catatan pelaksanaan kegiatan pembelajaran" />
      <DocumentTable
        headers={[["No", "Tanggal", "Kelas", "Mapel", "Materi", "Kegiatan Pembelajaran", "Catatan"]]}
        rows={(data?.rows ?? []).map((row, index) => [row.no ?? index + 1, row.date || "—", row.classLabel || data?.context?.classLabel || "—", row.subject || data?.context?.subject || "—", row.material || "—", row.activity || "—", row.reflection || row.attendanceNote || "—"])}
      />
      <CommonSignature context={data?.context} />
    </ReportFrame>
  );
}

export function GradeReportDocument({ data, withPrintArea = true }: ReportTemplateProps<GradeReportData>) {
  const kdColumns = data?.kdColumns && data.kdColumns.length > 0 ? data.kdColumns : defaultKdColumns();

  return (
    <ReportFrame withPrintArea={withPrintArea} orientation="landscape">
      <CommonHeader
        context={data?.context}
        title="DAFTAR NILAI PENGETAHUAN"
        subtitle="Nilai KD, PTS, PAS, nilai akhir, dan predikat"
        extraIdentityRows={[{ label: "KKTP/KKM", value: data?.kktp }]}
      />
      <DocumentTable
        className="grade-kd-table"
        headers={[
          [
            { content: "No", rowSpan: 2 },
            { content: "Nomor Induk", rowSpan: 2 },
            { content: "Nama Siswa", rowSpan: 2 },
            { content: "Ulangan Harian / KD", colSpan: kdColumns.length },
            { content: "PTS", rowSpan: 2 },
            { content: "PAS", rowSpan: 2 },
            { content: "Nilai Akhir", rowSpan: 2 },
            { content: "Predikat", rowSpan: 2 },
            { content: "Ket.", rowSpan: 2 },
          ],
          kdColumns.map((col) => col.label),
        ]}
        rows={(data?.rows ?? []).map((row, index) => [
          row.no ?? index + 1,
          row.nis || "—",
          row.name,
          ...kdColumns.map((col) => row.kdScores?.[col.id] ?? "—"),
          row.ptsScore ?? "—",
          row.pasScore ?? "—",
          row.finalScore ?? "—",
          row.predicate || "—",
          row.note || "—",
        ])}
      />
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
        headers={[["No", "Nomor Induk", "Nama Siswa", ...kdColumns.map((col) => col.label), "Rata-rata", "Ketuntasan", "Tindak Lanjut"]]}
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
        headers={[["No", "Nama Siswa", "Nilai Awal", "Bentuk Remedial", "Nilai Setelah Remedial", "Keterangan"]]}
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
        headers={[["No", "Nama Siswa", "Nilai", "Kegiatan Pengayaan", "Produk/Hasil", "Keterangan"]]}
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

export function PromesDocument({ data, withPrintArea = true }: ReportTemplateProps<PromesData>) {
  const weekColumns = data?.weekColumns && data.weekColumns.length > 0 ? data.weekColumns : defaultPromesWeeks();
  const monthGroups = weekColumns.reduce<Array<{ month: string; count: number }>>((groups, col) => {
    const last = groups[groups.length - 1];
    if (last && last.month === col.month) last.count += 1;
    else groups.push({ month: col.month, count: 1 });
    return groups;
  }, []);
  const rows = data?.rows ?? [];
  const summaries = data?.summaries ?? [];
  const legend = data?.legend ?? [
    { label: "Kegiatan belajar mengajar", mark: "✔" },
    { label: "Asesmen sumatif tengah dan akhir semester", mark: "PTS/PAS" },
    { label: "Proyek/Kokurikuler sekolah", mark: "KO" },
    { label: "Libur semester / hari besar", mark: "Libur" },
  ];

  const weekCell = (marks: Record<string, ReactNode> | undefined, col: PromesWeekColumn, index: number) => {
    const key = `${col.month}-${col.week}`;
    return marks?.[key] ?? marks?.[String(index + 1)] ?? "";
  };

  return (
    <ReportFrame withPrintArea={withPrintArea} orientation="landscape">
      <DocumentHeader schoolName={data?.context?.schoolName} schoolAddress={data?.context?.schoolAddress} schoolOffice={data?.context?.schoolOffice} institutionName={data?.context?.institutionName} logoUrl={data?.context?.logoUrl} />
      <DocumentTitle title={upper(data?.title || "PROGRAM SEMESTER")} />
      <table className="promes-top-identity">
        <tbody>
          <tr>
            <td>Tahun Pelajaran</td><td>:</td><td>{data?.context?.academicYear || "Belum tersedia"}</td>
            <td>Kelas/Semester</td><td>:</td><td>{data?.context?.classLabel || "Belum tersedia"} / {data?.context?.semester || "Belum tersedia"}</td>
          </tr>
          <tr>
            <td>Mata Pelajaran</td><td>:</td><td>{data?.context?.subject || "Belum tersedia"}</td>
            <td>Alokasi Waktu</td><td>:</td><td>{data?.allocationTime || "Belum tersedia"}</td>
          </tr>
        </tbody>
      </table>
      <div className="document-table-wrap">
        <table className="document-table promes-table">
          <thead>
            <tr>
              <th rowSpan={2} className="promes-objective-col">Tujuan Pembelajaran</th>
              <th rowSpan={2} className="promes-material-col">Materi Pembelajaran</th>
              <th rowSpan={2} className="w-jp">JP</th>
              {monthGroups.map((group) => <th key={group.month} colSpan={group.count}>{group.month}</th>)}
            </tr>
            <tr>
              {weekColumns.map((col, index) => <th key={`${col.month}-${col.week}-${index}`} className="promes-week-cell">{col.week}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? rows.map((row, rowIndex) => (
              <tr key={`promes-row-${rowIndex}`}>
                <td className="text-left">{row.objective || "—"}</td>
                <td className="text-left preserve-line">{row.material || "—"}</td>
                <td className="text-center">{row.jp || "—"}</td>
                {weekColumns.map((col, colIndex) => <td key={`promes-week-${rowIndex}-${colIndex}`} className="text-center">{weekCell(row.weekMarks, col, colIndex)}</td>)}
              </tr>
            )) : <tr><td colSpan={3 + weekColumns.length} className="text-center text-muted">Belum tersedia</td></tr>}
            {summaries.map((summary, summaryIndex) => (
              <tr key={`summary-${summaryIndex}`} className="promes-summary-row">
                <td colSpan={2} className="text-left">{summary.label}</td>
                <td className="text-center">{summary.jp || ""}</td>
                {weekColumns.map((col, colIndex) => <td key={`summary-week-${summaryIndex}-${colIndex}`} className="text-center">{weekCell(summary.weekMarks, col, colIndex)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <DocumentSection title="Keterangan">
        <div className="promes-legend">
          {legend.map((item, index) => <div key={`${item.label}-${index}`} className="promes-legend-item"><span className="promes-legend-mark">{item.mark}</span><span>{item.label}</span></div>)}
        </div>
      </DocumentSection>
      <CommonSignature context={data?.context} />
    </ReportFrame>
  );
}

export function QuestionGridDocument({ data, withPrintArea = true }: ReportTemplateProps<QuestionGridData>) {
  return (
    <ReportFrame withPrintArea={withPrintArea} orientation="landscape">
      <CommonHeader context={data?.context} title="KISI-KISI SOAL" subtitle={data?.assessmentTitle || "Penilaian / Sumatif"} />
      <DocumentTable
        className="question-grid-table"
        headers={[["No", "TP/KD", "Materi", "Indikator Soal", "Level Kognitif", "Bentuk Soal", "Nomor Soal"]]}
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
