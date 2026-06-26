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
import { getLessonSession } from "./lesson-session-repo";
import { findAssignment } from "./teaching-assignment-repo";
// SUPABASE-STABILITY-FIXPACK-01B: push parent cloud sebelum child journal
import {
  pushJournalToCloud,
  pushLessonSessionToCloud,
  pushTeachingAssignmentToCloud,
} from "../supabase/daily-bridge";
import { reportSyncError } from "../supabase/sync-store";

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
 * SUPABASE-STABILITY-FIXPACK-01B:
 * Push jurnal ke cloud dengan urutan parent → child:
 *   1. teaching_assignments
 *   2. lesson_sessions
 *   3. journal_entries
 *
 * Local save tetap sudah selesai sebelum fungsi ini dipanggil. Semua kegagalan
 * hanya console.warn dan tidak memblokir app lokal.
 */
async function pushJournalWithCloudParents(
  journal: TeachingJournal,
  sessionHint?: LessonSession
): Promise<void> {
  const session = sessionHint ?? await getLessonSession(journal.sessionId);
  if (!session) {
    reportSyncError("journal", "push", `Session lokal ${journal.sessionId} tidak ditemukan.`);
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
      `[Supabase Bridge] Push journal dibatalkan: data Guru & Mapel tidak ditemukan ` +
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

  const journalPush = await pushJournalToCloud(journal);
  if (!journalPush.success) {
    reportSyncError("journal", "push", journalPush.error);
  }
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
  void pushJournalWithCloudParents(journal, args.session).catch((e) => {
    reportSyncError("journal", "push", e instanceof Error ? e.message : String(e));
  });
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
  void pushJournalWithCloudParents(updated).catch((e) => {
    reportSyncError("journal", "push", e instanceof Error ? e.message : String(e));
  });
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
  void pushJournalWithCloudParents(resynced).catch((e) => {
    reportSyncError("journal", "push", e instanceof Error ? e.message : String(e));
  });
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
  void pushJournalWithCloudParents(result.journal).catch((e) => {
    reportSyncError("journal", "push", e instanceof Error ? e.message : String(e));
  });
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

/** Helper: init journal untuk sesi + auto-load roster + plannedUnit.
 *
 * PATCH-FLOW-RC2D: jangan auto-create absensi. Bila absensi belum ada,
 * return journal dengan totalStudents=0 + flag needsAttendance=true.
 * Caller wajib tampilkan CTA "Buat Absensi Dulu" bila needsAttendance=true.
 */
export async function initJournalForSessionFull(args: {
  session: LessonSession;
  roster: ClassRoster | null;
  plannedUnit?: ProtaUnit | null;
}): Promise<{ journal: TeachingJournal; needsAttendance: boolean } | undefined> {
  // Load attendance records untuk sesi ini (TANPA auto-create)
  const { getAttendanceBySession } = await import("./attendance-repo");
  const attendance = await getAttendanceBySession(args.session.id);
  const needsAttendance = attendance.length === 0 && args.roster !== null;

  // Bila belum ada attendance, generate journal dengan records kosong
  // (guru lihat CTA untuk buat absensi dulu)
  const attendanceRecords = attendance;

  const journal = await initJournalForSession({
    session: args.session,
    plannedUnit: args.plannedUnit,
    attendanceRecords,
  });
  if (!journal) return undefined;
  return { journal, needsAttendance };
}
