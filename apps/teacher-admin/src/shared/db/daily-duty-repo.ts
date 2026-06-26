/**
 * PIKET-HARIAN-MOBILE-01: Repository untuk modul Piket Harian.
 *
 * Terisolasi dari app utama. Tidak menulis ke attendanceRecords.
 * Hanya membaca attendanceRecords untuk rekap kehadiran (read-only).
 */

import { db } from "./schema";
import { createEntity, updateEntityFields, softDelete } from "./crud";
import { listClassRosters } from "./class-roster-repo";
import { nowTimestamp } from "@guru-admin/shared";
import {
  DEFAULT_DUTY_RULES,
  summarizeDutyRecords,
  type DutyRule,
  type DutyReport,
  type DutyRecord,
  type DutySummary,
  type ClassAttendanceSummary,
} from "@guru-admin/domain";


/* ------------------------------------------------------------------ */
/*  Duty Rules                                                         */
/* ------------------------------------------------------------------ */

export async function listDutyRules(): Promise<DutyRule[]> {
  const all = await db.dailyDutyRules.toArray();
  return all.filter((r) => !r.deletedAt && r.active) as DutyRule[];
}

export async function listAllDutyRules(): Promise<DutyRule[]> {
  const all = await db.dailyDutyRules.toArray();
  return all.filter((r) => !r.deletedAt) as DutyRule[];
}

export async function seedDefaultDutyRulesIfEmpty(): Promise<void> {
  const existing = await db.dailyDutyRules.count();
  if (existing > 0) return;
  for (const rule of DEFAULT_DUTY_RULES) {
    const entity = createEntity(rule) as DutyRule;
    await db.dailyDutyRules.put(entity);
  }
}

/* ------------------------------------------------------------------ */
/*  Duty Reports                                                       */
/* ------------------------------------------------------------------ */

export async function getDutyReportByDate(
  academicYearId: string,
  date: string
): Promise<DutyReport | undefined> {
  const all = await db.dailyDutyReports
    .where("academicYearId")
    .equals(academicYearId)
    .toArray();
  return all.find((r) => !r.deletedAt && r.date === date) as DutyReport | undefined;
}

export async function findOrCreateDutyReport(args: {
  academicYearId: string;
  date: string;
  dutyTeacherId: string;
  dutyTeacherName: string;
}): Promise<DutyReport> {
  const existing = await getDutyReportByDate(args.academicYearId, args.date);
  if (existing) return existing;
  const entity = createEntity({
    academicYearId: args.academicYearId,
    date: args.date,
    dutyTeacherId: args.dutyTeacherId,
    dutyTeacherName: args.dutyTeacherName,
    note: undefined,
    finalized: false,
    finalizedAt: null,
  }) as DutyReport;
  await db.dailyDutyReports.put(entity);
  return entity;
}

export async function updateDutyReportNote(reportId: string, note: string): Promise<void> {
  const existing = await db.dailyDutyReports.get(reportId);
  if (!existing) return;
  const updated = updateEntityFields(existing as DutyReport, { note }) as DutyReport;
  await db.dailyDutyReports.put(updated);
}

export async function finalizeDutyReport(reportId: string): Promise<void> {
  const existing = await db.dailyDutyReports.get(reportId);
  if (!existing) return;
  const updated = updateEntityFields(existing as DutyReport, {
    finalized: true,
    finalizedAt: nowTimestamp(),
  }) as DutyReport;
  await db.dailyDutyReports.put(updated);
}

export async function unlockDutyReport(reportId: string): Promise<void> {
  const existing = await db.dailyDutyReports.get(reportId);
  if (!existing) return;
  const updated = updateEntityFields(existing as DutyReport, {
    finalized: false,
    finalizedAt: null,
  }) as DutyReport;
  await db.dailyDutyReports.put(updated);
}

/* ------------------------------------------------------------------ */
/*  Duty Records                                                       */
/* ------------------------------------------------------------------ */

export async function addDutyRecord(args: {
  dutyReportId: string;
  academicYearId: string;
  date: string;
  studentId: string;
  studentName: string;
  studentNumber?: number;
  classId: string;
  classLabel: string;
  category: DutyRecord["category"];
  type: DutyRecord["type"];
  ruleId?: string;
  ruleLabel: string;
  points: number;
  note?: string;
  followUp?: string;
  recordedByTeacherId: string;
  recordedByTeacherName: string;
}): Promise<DutyRecord> {
  const entity = createEntity(args) as DutyRecord;
  await db.dailyDutyRecords.put(entity);
  return entity;
}

export async function updateDutyRecord(
  recordId: string,
  patch: Partial<DutyRecord>
): Promise<DutyRecord | undefined> {
  const existing = await db.dailyDutyRecords.get(recordId);
  if (!existing || existing.deletedAt) return undefined;
  const updated = updateEntityFields(existing as DutyRecord, patch) as DutyRecord;
  await db.dailyDutyRecords.put(updated);
  return updated;
}

export async function deleteDutyRecord(recordId: string): Promise<void> {
  const existing = await db.dailyDutyRecords.get(recordId);
  if (!existing) return;
  await db.dailyDutyRecords.put(softDelete(existing as DutyRecord) as DutyRecord);
}

export async function listDutyRecordsByDate(
  academicYearId: string,
  date: string
): Promise<DutyRecord[]> {
  const all = await db.dailyDutyRecords
    .where("academicYearId")
    .equals(academicYearId)
    .toArray();
  return all
    .filter((r) => !r.deletedAt && r.date === date)
    .sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? "")) as DutyRecord[];
}

export async function listDutyRecordsByStudent(
  academicYearId: string,
  studentId: string
): Promise<DutyRecord[]> {
  const all = await db.dailyDutyRecords
    .where("academicYearId")
    .equals(academicYearId)
    .toArray();
  return all
    .filter((r) => !r.deletedAt && r.studentId === studentId)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")) as DutyRecord[];
}

export function summarizeDuty(records: DutyRecord[]): DutySummary {
  return summarizeDutyRecords(records);
}

/* ------------------------------------------------------------------ */
/*  Attendance Summary (READ-ONLY)                                     */
/* ------------------------------------------------------------------ */

export async function getAttendanceSummaryForDate(args: {
  academicYearId: string;
  date: string;
}): Promise<ClassAttendanceSummary[]> {
  const rosters = await listClassRosters(args.academicYearId);
  const summaries: ClassAttendanceSummary[] = [];

  for (const roster of rosters) {
    if (!roster.students || roster.students.length === 0) continue;
    // Baca attendanceRecords untuk kelas ini di tanggal ini — READ ONLY
    const records = await db.attendanceRecords
      .where("classId")
      .equals(roster.classId)
      .toArray();
    const dayRecords = records.filter(
      (r) => !r.deletedAt && r.date === args.date
    );

    if (dayRecords.length === 0) {
      summaries.push({
        classId: roster.classId,
        classLabel: roster.classLabel,
        present: 0, sick: 0, excused: 0, absent: 0,
        total: roster.students.length,
        source: "empty",
      });
    } else {
      const present = dayRecords.filter((r) => r.status === "present").length;
      const sick = dayRecords.filter((r) => r.status === "sick").length;
      const excused = dayRecords.filter((r) => r.status === "excused").length;
      const absent = dayRecords.filter((r) => r.status === "absent").length;
      summaries.push({
        classId: roster.classId,
        classLabel: roster.classLabel,
        present, sick, excused, absent,
        total: roster.students.length,
        source: "attendance",
      });
    }
  }

  return summaries;
}
