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
  type ClassAttendanceDetail,
} from "@guru-admin/domain";

/**
 * PIKET-HARIAN-MOBILE-01B: Ranking status untuk laporan Piket.
 * absent > sick > excused > present
 * Status lain (mis. "late" jika ada di attendanceRecords) diabaikan.
 *
 * Bila siswa punya multiple records di hari yang sama, ambil status terberat,
 * BUKAN record terbaru.
 */
const STATUS_RANK: Record<string, number> = {
  absent: 4,
  sick: 3,
  excused: 2,
  present: 1,
};

/**
 * PIKET-HARIAN-MOBILE-01B: Pilih record dengan status terberat per studentId.
 * Bila ranking sama, ambil record terbaru (updatedAt) sebagai tiebreaker.
 */
function dedupByHeaviestStatus<T extends { studentId: string; status: string; updatedAt: string }>(
  records: T[]
): Map<string, T> {
  const byStudent = new Map<string, T>();
  for (const r of records) {
    const existing = byStudent.get(r.studentId);
    if (!existing) {
      byStudent.set(r.studentId, r);
      continue;
    }
    const rRank = STATUS_RANK[r.status] ?? 0;
    const eRank = STATUS_RANK[existing.status] ?? 0;
    if (rRank > eRank || (rRank === eRank && r.updatedAt > existing.updatedAt)) {
      byStudent.set(r.studentId, r);
    }
  }
  return byStudent;
}


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
  source?: DutyRecord["source"];
  attendanceLinkType?: DutyRecord["attendanceLinkType"];
  note?: string;
  followUp?: string;
  recordedByTeacherId: string;
  recordedByTeacherName: string;
}): Promise<DutyRecord> {
  const entity = createEntity({
    ...args,
    source: args.source ?? "manual",
    attendanceLinkType: args.attendanceLinkType ?? null,
  }) as DutyRecord;
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

    // PIKET-HARIAN-MOBILE-01B: dedup by studentId — ambil status TERBERAT (bukan terbaru)
    // Ranking: absent > sick > excused > present
    const byStudent = dedupByHeaviestStatus(dayRecords);

    if (byStudent.size === 0) {
      summaries.push({
        classId: roster.classId,
        classLabel: roster.classLabel,
        present: 0, sick: 0, excused: 0, absent: 0,
        total: roster.students.length,
        source: "empty",
      });
    } else {
      // PIKET-HARIAN-MOBILE-01A Fix 2: rekap hanya H/S/I/A (tidak ada kolom Terlambat)
      const present = Array.from(byStudent.values()).filter((r) => r.status === "present").length;
      const sick = Array.from(byStudent.values()).filter((r) => r.status === "sick").length;
      const excused = Array.from(byStudent.values()).filter((r) => r.status === "excused").length;
      const absent = Array.from(byStudent.values()).filter((r) => r.status === "absent").length;
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

/* ------------------------------------------------------------------ */
/*  Sync Alpa from Attendance (PIKET-HARIAN-MOBILE-01A Fix 3)         */
/* ------------------------------------------------------------------ */

/**
 * PIKET-HARIAN-MOBILE-01A Fix 3: Sinkron Alpa dari absen utama.
 *
 * Baca attendanceRecords untuk tanggal tertentu, cari siswa dengan status "absent",
 * buat DutyRecord dengan type "absent_without_notice", points 10, source "attendance",
 * attendanceLinkType "absent_auto".
 *
 * IDEMPOTENT: bila sudah ada DutyRecord dengan attendanceLinkType "absent_auto"
 * untuk siswa+tanggal yang sama, skip (tidak dobel).
 *
 * Return: jumlah record baru yang dibuat.
 */
export async function syncAlpaFromAttendance(args: {
  academicYearId: string;
  date: string;
  dutyTeacherId: string;
  dutyTeacherName: string;
}): Promise<{ created: number; skipped: number; total: number }> {
  const rosters = await listClassRosters(args.academicYearId);
  const report = await findOrCreateDutyReport({
    academicYearId: args.academicYearId,
    date: args.date,
    dutyTeacherId: args.dutyTeacherId,
    dutyTeacherName: args.dutyTeacherName,
  });

  // Cari existing absent_auto records untuk tanggal ini (idempotent check)
  const existingRecords = await listDutyRecordsByDate(args.academicYearId, args.date);
  const existingAbsentAutoStudentIds = new Set(
    existingRecords
      .filter((r) => r.attendanceLinkType === "absent_auto")
      .map((r) => r.studentId)
  );

  // Cari rule absent_without_notice
  const allRules = await listAllDutyRules();
  const absentRule = allRules.find((r) => r.type === "absent_without_notice");
  if (!absentRule) {
    return { created: 0, skipped: 0, total: 0 };
  }

  let created = 0;
  let skipped = 0;

  for (const roster of rosters) {
    if (!roster.students || roster.students.length === 0) continue;
    // READ-ONLY: baca attendanceRecords
    const records = await db.attendanceRecords
      .where("classId")
      .equals(roster.classId)
      .toArray();
    const dayRecords = records.filter(
      (r) => !r.deletedAt && r.date === args.date
    );

    // PIKET-HARIAN-MOBILE-01B: dedup by status terberat (bukan terbaru)
    // Jika siswa pernah absent lalu present, status terberat = absent → sync alpa tetap buat record
    const byStudent = dedupByHeaviestStatus(dayRecords);

    // Buat DutyRecord untuk siswa absent
    for (const [studentId, attRecord] of byStudent) {
      if (attRecord.status !== "absent") continue;
      if (existingAbsentAutoStudentIds.has(studentId)) {
        skipped++;
        continue;
      }
      const student = roster.students.find((s) => s.id === studentId);
      if (!student) continue;

      await addDutyRecord({
        dutyReportId: report.id,
        academicYearId: args.academicYearId,
        date: args.date,
        studentId,
        studentName: attRecord.studentName,
        studentNumber: attRecord.studentNumber,
        classId: roster.classId,
        classLabel: roster.classLabel,
        category: "attendance",
        type: "absent_without_notice",
        ruleId: absentRule.id,
        ruleLabel: absentRule.label,
        points: absentRule.points,
        source: "attendance",
        attendanceLinkType: "absent_auto",
        note: "Disinkron dari absen utama (alpa)",
        recordedByTeacherId: args.dutyTeacherId,
        recordedByTeacherName: args.dutyTeacherName,
      });
      created++;
    }
  }

  return { created, skipped, total: created + skipped };
}

/* ------------------------------------------------------------------ */
/*  Attendance Detail (PIKET-REPORT-APPSCRIPT-PARITY-02A)             */
/* ------------------------------------------------------------------ */

/**
 * PIKET-REPORT-APPSCRIPT-PARITY-02A: Detail rekap kehadiran per kelas.
 * Sama seperti getAttendanceSummaryForDate + nama siswa S/I/A.
 * Nama siswa Hadir TIDAK disertakan.
 *
 * READ-ONLY: tidak menulis ke attendanceRecords.
 */
export async function getAttendanceDetailForDate(args: {
  academicYearId: string;
  date: string;
}): Promise<ClassAttendanceDetail[]> {
  const rosters = await listClassRosters(args.academicYearId);
  const details: ClassAttendanceDetail[] = [];

  for (const roster of rosters) {
    if (!roster.students || roster.students.length === 0) continue;
    const records = await db.attendanceRecords
      .where("classId")
      .equals(roster.classId)
      .toArray();
    const dayRecords = records.filter(
      (r) => !r.deletedAt && r.date === args.date
    );

    const byStudent = dedupByHeaviestStatus(dayRecords);

    if (byStudent.size === 0) {
      details.push({
        classId: roster.classId,
        classLabel: roster.classLabel,
        present: 0, sick: 0, excused: 0, absent: 0,
        total: roster.students.length,
        source: "empty",
        sickStudents: [], excusedStudents: [], absentStudents: [],
      });
    } else {
      const values = Array.from(byStudent.values());
      const present = values.filter((r) => r.status === "present").length;
      const sickStudents = values.filter((r) => r.status === "sick").map((r) => r.studentName);
      const excusedStudents = values.filter((r) => r.status === "excused").map((r) => r.studentName);
      const absentStudents = values.filter((r) => r.status === "absent").map((r) => r.studentName);
      details.push({
        classId: roster.classId,
        classLabel: roster.classLabel,
        present,
        sick: sickStudents.length,
        excused: excusedStudents.length,
        absent: absentStudents.length,
        total: roster.students.length,
        source: "attendance",
        sickStudents, excusedStudents, absentStudents,
      });
    }
  }

  return details;
}
