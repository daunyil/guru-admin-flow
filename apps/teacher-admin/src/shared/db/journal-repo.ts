/**
 * Repository untuk TeachingJournal.
 * Sumber: docs/DATA_MODEL_DRAFT.md §9, docs/PROJECT_CONTRACT.md §8.3
 *
 * Filosofi: jurnal auto-fill dari sesi + Prota + absensi. Guru hanya edit catatan.
 */

import { db } from "./schema";
import { updateEntityFields, saveEntity, softDelete } from "./crud";
import type {
  TeachingJournal,
  LessonSession,
  ProtaUnit,
  AttendanceRecord,
  ClassRoster,
} from "@guru-admin/domain";
import {
  generateJournalFromSession,
  applyJournalInput,
  resyncJournalAttendance,
  finalizeJournal as finalizeJournalHelper,
} from "@guru-admin/domain";

/** Get TeachingJournal by sessionId (1:1 relationship). */
export async function getJournalBySession(sessionId: string): Promise<TeachingJournal | undefined> {
  const all = await db.teachingJournals
    .where("sessionId")
    .equals(sessionId)
    .toArray();
  return all.find((j) => !j.deletedAt) as TeachingJournal | undefined;
}

/** Get TeachingJournal by id. */
export async function getJournal(id: string): Promise<TeachingJournal | undefined> {
  const j = await db.teachingJournals.get(id);
  return j && !j.deletedAt ? (j as TeachingJournal) : undefined;
}

/** List TeachingJournal untuk academicYearId + semester. */
export async function listJournals(
  academicYearId: string,
  semester?: 1 | 2
): Promise<TeachingJournal[]> {
  const all = await db.teachingJournals
    .where("academicYearId")
    .equals(academicYearId)
    .toArray();
  return all
    .filter((j) => !j.deletedAt && (semester === undefined || j.semester === semester))
    .sort((a, b) => b.date.localeCompare(a.date)) as TeachingJournal[];
}

/**
 * Inisialisasi jurnal untuk sesi: bila belum ada, auto-generate dari sesi + Prota + absensi.
 * Bila sudah ada, return existing.
 */
export async function initJournalForSession(args: {
  session: LessonSession;
  plannedUnit?: ProtaUnit | null;
  attendanceRecords: AttendanceRecord[];
}): Promise<TeachingJournal> {
  const existing = await getJournalBySession(args.session.id);
  if (existing) return existing;

  const journal = generateJournalFromSession({
    session: args.session,
    plannedUnit: args.plannedUnit ?? null,
    attendanceRecords: args.attendanceRecords,
  });
  await saveEntity("teachingJournals", journal);
  return journal;
}

/** Update jurnal dengan input guru. */
export async function updateJournal(
  id: string,
  input: {
    realizationStatus?: TeachingJournal["realizationStatus"];
    actualMaterialTitle?: string;
    note?: string;
    followUp?: string;
  }
): Promise<TeachingJournal | undefined> {
  const existing = await getJournal(id);
  if (!existing) return undefined;
  if (existing.locked) {
    throw new Error("Jurnal terkunci (final). Tidak bisa diubah.");
  }
  const updated = applyJournalInput(existing, input);
  await saveEntity("teachingJournals", updated);
  return updated;
}

/** Re-sync journal dengan absensi terbaru. */
export async function resyncJournal(
  sessionId: string,
  attendanceRecords: AttendanceRecord[]
): Promise<TeachingJournal | undefined> {
  const existing = await getJournalBySession(sessionId);
  if (!existing) return undefined;
  if (existing.locked) return existing; // tidak re-sync bila locked
  const resynced = resyncJournalAttendance(existing, attendanceRecords);
  await saveEntity("teachingJournals", resynced);
  return resynced;
}

/** Finalize journal: set status "final", locked=true. */
export async function finalizeJournal(
  id: string
): Promise<{ success: boolean; journal?: TeachingJournal; errors: string[] }> {
  const existing = await getJournal(id);
  if (!existing) {
    return { success: false, errors: ["Jurnal tidak ditemukan"] };
  }
  const result = finalizeJournalHelper(existing);
  if (!result.success || !result.journal) {
    return { success: false, errors: result.errors };
  }
  await saveEntity("teachingJournals", result.journal);
  return { success: true, journal: result.journal, errors: [] };
}

/** Unlock journal (kembali ke draft). */
export async function unlockJournal(id: string): Promise<TeachingJournal | undefined> {
  const existing = await getJournal(id);
  if (!existing) return undefined;
  const updated = updateEntityFields(existing, {
    status: "draft",
    locked: false,
    finalizedAt: null,
  }) as TeachingJournal;
  await saveEntity("teachingJournals", updated);
  return updated;
}

/** Hapus jurnal (soft delete). */
export async function deleteJournal(id: string): Promise<void> {
  const existing = await getJournal(id);
  if (!existing) return;
  await saveEntity("teachingJournals", softDelete(existing as TeachingJournal) as TeachingJournal);
}

/** Helper: init journal untuk sesi + auto-load roster + attendance + plannedUnit. */
export async function initJournalForSessionFull(args: {
  session: LessonSession;
  roster: ClassRoster | null;
  plannedUnit?: ProtaUnit | null;
}): Promise<TeachingJournal | undefined> {
  // Load attendance records untuk sesi ini
  const { getAttendanceBySession } = await import("./attendance-repo");
  const attendance = await getAttendanceBySession(args.session.id);

  // Bila belum ada attendance, init dulu
  let attendanceRecords = attendance;
  if (attendance.length === 0 && args.roster) {
    const { initAttendanceForSession } = await import("./attendance-repo");
    attendanceRecords = await initAttendanceForSession({
      sessionId: args.session.id,
      date: args.session.date,
      roster: args.roster,
    });
  }

  return await initJournalForSession({
    session: args.session,
    plannedUnit: args.plannedUnit,
    attendanceRecords,
  });
}
