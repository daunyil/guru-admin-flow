/**
 * Repository untuk AttendanceRecord.
 * Sumber: docs/DATA_MODEL_DRAFT.md §8, docs/PROJECT_CONTRACT.md §8.2
 *
 * Filosofi: default semua hadir, guru hanya ubah yang tidak hadir.
 */

import { db } from "./schema";
import { updateEntityFields, saveEntity } from "./crud";
import type { AttendanceRecord, ClassRoster } from "@guru-admin/domain";
import {
  generateDefaultAttendance,
  applyAttendanceChanges,
  backfillNisInRecords,
} from "@guru-admin/domain";
import { getLessonSession } from "./lesson-session-repo";
import { findAssignment } from "./teaching-assignment-repo";
// SUPABASE-STABILITY-FIXPACK-01B: push parent cloud sebelum child attendance
import {
  pushAttendanceToCloud,
  pushLessonSessionToCloud,
  pushTeachingAssignmentToCloud,
} from "../supabase/daily-bridge";
import { reportSyncError } from "../supabase/sync-store";

/** Get AttendanceRecord[] untuk satu sesi. */
export async function getAttendanceBySession(sessionId: string): Promise<AttendanceRecord[]> {
  const all = await db.attendanceRecords
    .where("sessionId")
    .equals(sessionId)
    .toArray();
  return all
    .filter((r) => !r.deletedAt)
    .sort((a, b) => (a.studentNumber ?? 0) - (b.studentNumber ?? 0)) as AttendanceRecord[];
}

/** Get AttendanceRecord untuk sesi pada tanggal tertentu. */
export async function getAttendanceByDate(
  classId: string,
  dateISO: string
): Promise<AttendanceRecord[]> {
  const all = await db.attendanceRecords
    .where("classId")
    .equals(classId)
    .toArray();
  return all.filter((r) => !r.deletedAt && r.date === dateISO) as AttendanceRecord[];
}

/**
 * Get AttendanceRecord untuk satu tanggal (semua kelas/mapel).
 * Dipakai Home untuk cek "sudah absen belum" per tanggal.
 *
 * Parameter teacherId disimpan untuk konsistensi API (meskipun tidak dipakai
 * di filter — attendanceRecords tidak di-index by teacherId). Bila suatu saat
 * perlu filter per guru, implement dengan join ke lessonSessions.
 */
export async function getAttendanceByTeacherDate(
  _teacherId: string,
  dateISO: string
): Promise<AttendanceRecord[]> {
  void _teacherId;
  const all = await db.attendanceRecords.toArray();
  return all.filter(
    (r) => !r.deletedAt && r.date === dateISO
  ) as AttendanceRecord[];
}

/**
 * SUPABASE-STABILITY-FIXPACK-01B:
 * Push absen ke cloud dengan urutan parent → child:
 *   1. teaching_assignments
 *   2. lesson_sessions
 *   3. attendance_records
 *
 * Local save tetap sudah selesai sebelum fungsi ini dipanggil. Semua kegagalan
 * hanya console.warn dan tidak memblokir app lokal.
 */
async function pushAttendanceWithCloudParents(records: AttendanceRecord[]): Promise<void> {
  if (records.length === 0) return;

  const sessionId = records[0].sessionId;
  const session = await getLessonSession(sessionId);
  if (!session) {
    reportSyncError("attendance", "push", `Session lokal ${sessionId} tidak ditemukan.`);
    return;
  }

  const assignment = await findAssignment({
    academicYearId: session.academicYearId,
    semester: session.semester,
    teacherId: session.teacherId,
    subject: session.subject,
    classId: session.classId,
  });

  if (!assignment) {
    console.warn(
      `[Supabase Bridge] Push attendance dibatalkan: data Guru & Mapel tidak ditemukan ` +
      `untuk ${session.classLabel} · ${session.subject} · semester ${session.semester}.`
    );
    return;
  }

  const assignmentPush = await pushTeachingAssignmentToCloud(assignment);
  if (!assignmentPush.success) {
    reportSyncError("assignment", "push", assignmentPush.error);
    return;
  }

  const sessionPush = await pushLessonSessionToCloud(session, assignment.id);
  if (!sessionPush.success) {
    reportSyncError("session", "push", sessionPush.error);
    return;
  }

  const attendancePush = await pushAttendanceToCloud(records);
  if (!attendancePush.success) {
    reportSyncError("attendance", "push", attendancePush.error);
  }
}

/**
 * Inisialisasi absensi untuk sesi: bila belum ada records, generate default (semua hadir).
 * Bila sudah ada, return existing — dengan backfill NIS dari roster bila ada yang kosong.
 *
 * Side effect: bila existing records punya NIS kosong dan roster punya NIS,
 * records di-DB akan di-update (backfill) dan return versi yang sudah di-backfill.
 */
export async function initAttendanceForSession(args: {
  sessionId: string;
  date: string;
  roster: ClassRoster | null;
}): Promise<AttendanceRecord[]> {
  const existing = await getAttendanceBySession(args.sessionId);
  if (existing.length > 0) {
    // PATCH-FLOW-RC1 P1-6: backfill NIS bila ada yang kosong
    if (args.roster) {
      const { records: backfilled, changed } = backfillNisInRecords(existing, args.roster);
      if (changed) {
        const now = new Date().toISOString();
        await db.transaction("rw", db.attendanceRecords, async () => {
          for (const r of backfilled) {
            if (r.nis && existing.find((e) => e.id === r.id && !e.nis)) {
              await db.attendanceRecords.put({ ...r, updatedAt: now });
            }
          }
        });
        return backfilled;
      }
    }
    return existing;
  }

  if (!args.roster) return []; // tidak ada roster → tidak ada records

  // Generate default (semua hadir) dan simpan
  const records = generateDefaultAttendance({
    roster: args.roster,
    sessionId: args.sessionId,
    date: args.date,
  });
  await db.transaction("rw", db.attendanceRecords, async () => {
    for (const r of records) {
      await db.attendanceRecords.put(r);
    }
  });
  return records;
}

/**
 * Save default attendance records ke DB.
 * Dipakai saat user klik Simpan di mode manual/susulan (sebelumnya default
 * di-generate in-memory dan belum di-persist).
 */
export async function saveDefaultAttendance(
  records: AttendanceRecord[]
): Promise<void> {
  await db.transaction("rw", db.attendanceRecords, async () => {
    for (const r of records) {
      await db.attendanceRecords.put(r);
    }
  });
  void pushAttendanceWithCloudParents(records).catch((e) => {
    reportSyncError("attendance", "push", e instanceof Error ? e.message : String(e));
  });
}

/**
 * Update absensi dengan perubahan guru.
 * Hanya siswa yang diubah yang di-update di DB.
 */
export async function updateAttendance(
  sessionId: string,
  changes: Array<{ studentId: string; status: AttendanceRecord["status"]; note?: string }>
): Promise<AttendanceRecord[]> {
  const existing = await getAttendanceBySession(sessionId);
  if (existing.length === 0) return [];

  const updated = applyAttendanceChanges(existing, changes);

  // Simpan hanya yang berubah
  const changesMap = new Map(changes.map((c) => [c.studentId, c]));
  await db.transaction("rw", db.attendanceRecords, async () => {
    for (const r of updated) {
      if (changesMap.has(r.studentId)) {
        await db.attendanceRecords.put(r);
      }
    }
  });

  const changed = updated.filter((r) => changesMap.has(r.studentId));
  if (changed.length > 0) {
    void pushAttendanceWithCloudParents(changed).catch((e) => {
      reportSyncError("attendance", "push", e instanceof Error ? e.message : String(e));
    });
  }

  return updated;
}

/** Update single record. */
export async function updateAttendanceRecord(
  id: string,
  patch: Partial<AttendanceRecord>
): Promise<AttendanceRecord | undefined> {
  const existing = await db.attendanceRecords.get(id);
  if (!existing || existing.deletedAt) return undefined;
  const updated = updateEntityFields(existing as AttendanceRecord, patch) as AttendanceRecord;
  await saveEntity("attendanceRecords", updated);
  return updated;
}

/** Hapus semua absensi untuk sesi (sebelum re-init). */
export async function clearAttendanceForSession(sessionId: string): Promise<void> {
  const all = await db.attendanceRecords
    .where("sessionId")
    .equals(sessionId)
    .toArray();
  await db.transaction("rw", db.attendanceRecords, async () => {
    for (const r of all) {
      if (!r.deletedAt) {
        await db.attendanceRecords.delete(r.id); // hard delete absensi (bukan entitas bisnis kritis)
      }
    }
  });
}
