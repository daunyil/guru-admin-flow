import type { ReactNode } from "react";
import type { DocumentSummaryCard } from "../DocumentLayout";

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
