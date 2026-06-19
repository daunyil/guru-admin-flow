/**
 * Repository untuk AttendanceRecord.
 * Sumber: docs/DATA_MODEL_DRAFT.md §8, docs/PROJECT_CONTRACT.md §8.2
 *
 * Filosofi: default semua hadir, guru hanya ubah yang tidak hadir.
 */

import { db } from "./schema";
import { updateEntityFields, saveEntity } from "./crud";
import type { AttendanceRecord, ClassRoster } from "@guru-admin/domain";
import { generateDefaultAttendance, applyAttendanceChanges } from "@guru-admin/domain";

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
 * Inisialisasi absensi untuk sesi: bila belum ada records, generate default (semua hadir).
 * Bila sudah ada, return existing.
 */
export async function initAttendanceForSession(args: {
  sessionId: string;
  date: string;
  roster: ClassRoster | null;
}): Promise<AttendanceRecord[]> {
  const existing = await getAttendanceBySession(args.sessionId);
  if (existing.length > 0) return existing;

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
