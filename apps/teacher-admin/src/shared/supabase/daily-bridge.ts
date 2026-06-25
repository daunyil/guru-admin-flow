/**
 * SUPABASE-DAILY-INPUT-BRIDGE-RC1 + SUPABASE-STABILITY-FIXPACK-01
 *
 * Bridge untuk push/pull data harian (Absen + Jurnal) ke/dari Supabase.
 * Fallback ke lokal bila Supabase tidak dikonfigurasi (return null, tidak throw).
 *
 * Filosofi: local-first. App tetap jalan tanpa Supabase. Bila Supabase aktif:
 *   - Save lokal → push ke cloud (best-effort, tidak block save lokal)
 *   - Load: prioritaskan lokal, cloud sebagai backup/sync
 *
 * FIXPACK-01:
 *   - P0-2: pushLessonSessionToCloud dipanggil sebelum push attendance/journal
 *     supaya FK session_id terpenuhi.
 *   - P1-1: push gagal sekarang console.warn (bukan silent fallback).
 *   - P1-2: pull-to-local DINONAKTIFKAN sampai mapping lengkap.
 *
 * Schema cloud:
 *   - lesson_sessions (id, assignment_id, teacher_id, class_id, class_label,
 *      subject, session_date, start_period, duration_jp, status, created_at)
 *   - attendance_records (id, session_id, teacher_id, student_id, student_name,
 *      student_number, status, note, created_at, updated_at)
 *   - journal_entries (id, session_id, teacher_id, material, activity, note,
 *      locked, created_at, updated_at)
 */

import { supabase, isSupabaseConfigured, requireSupabase } from "./client";
import { getCurrentCloudAuthState, type CloudTeacherProfile } from "./auth";
import type { AttendanceRecord, TeachingJournal, LessonSession } from "@guru-admin/domain";

/** Hasil push ke cloud. */
export type PushResult =
  | { success: true; pushed: number }
  | { success: false; error: string; pushed: 0 };

/** Hasil pull dari cloud. */
export type PullResult<T> =
  | { success: true; data: T[] }
  | { success: false; error: string; data: [] };

/**
 * Cek apakah bridge aktif (Supabase configured + user signed in).
 */
export async function isBridgeActive(): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  const state = await getCurrentCloudAuthState();
  return !!(state.user && state.profile);
}

/** Dapatkan teacher_id cloud untuk user yang sedang login. */
async function getCloudTeacherId(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const state = await getCurrentCloudAuthState();
  return state.profile?.id ?? null;
}

/* ------------------------------------------------------------------ */
/*  Lesson Session Bridge (FIXPACK-01 P0-2)                            */
/* ------------------------------------------------------------------ */

/**
 * FIXPACK-01 P0-2: Push LessonSession lokal ke Supabase `lesson_sessions`.
 *
 * WAJIB dipanggil sebelum push attendance/journal, karena attendance_records
 * dan journal_entries punya FK session_id → lesson_sessions.id.
 * Tanpa ini, push attendance/jurnal akan ditolak Supabase (FK violation).
 *
 * Best-effort: bila gagal, return error tapi tidak throw.
 */
export async function pushLessonSessionToCloud(
  session: LessonSession
): Promise<PushResult> {
  if (!await isBridgeActive()) {
    return { success: true, pushed: 0 };
  }
  const teacherId = await getCloudTeacherId();
  if (!teacherId) {
    return { success: false, error: "Teacher ID cloud tidak ditemukan", pushed: 0 };
  }

  try {
    const sb = requireSupabase();
    // Mapping LessonSession lokal → lesson_sessions cloud.
    // Catatan: assignment_id cloud butuh FK ke teaching_assignments cloud.
    // Bila assignment lokal belum di-push ke cloud, ini akan gagal FK.
    // Untuk sekarang, kita coba upsert; bila FK gagal, return error jelas.
    const row = {
      id: session.id, // pakai id lokal (string uuid) sebagai id cloud
      assignment_id: session.teachingScheduleId ?? session.id, // fallback: pakai session id sendiri
      teacher_id: teacherId,
      class_id: session.classId,
      class_label: session.classLabel,
      subject: session.subject,
      session_date: session.date,
      start_period: session.startPeriod ?? 1,
      duration_jp: session.durationJP ?? 2,
      status: session.status ?? "planned",
    };

    const { error } = await sb
      .from("lesson_sessions")
      .upsert(row, { onConflict: "id" });

    if (error) {
      return { success: false, error: error.message, pushed: 0 };
    }
    return { success: true, pushed: 1 };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
      pushed: 0,
    };
  }
}

/**
 * FIXPACK-01 P0-2: Pastikan lesson_session ada di cloud sebelum push child.
 * Dipanggil oleh pushAttendanceToCloud dan pushJournalToCloud.
 * Best-effort: bila gagal, log warning tapi lanjut (child push akan fail dengan FK error jelas).
 */
async function ensureLessonSessionInCloud(sessionId: string): Promise<void> {
  if (!await isBridgeActive()) return;

  try {
    // Cek apakah session sudah ada di cloud
    const sb = requireSupabase();
    const { data, error } = await sb
      .from("lesson_sessions")
      .select("id")
      .eq("id", sessionId)
      .maybeSingle();

    if (error) {
      console.warn(`[Supabase Bridge] Gagal cek lesson_session ${sessionId}: ${error.message}`);
      return;
    }

    if (!data) {
      // Session belum ada di cloud. Kita TIDAK bisa push di sini karena
      // butuh LessonSession object lengkap (bukan hanya id).
      // Solusi: repo yang panggil harus pushLessonSessionToCloud(session) dulu.
      console.warn(
        `[Supabase Bridge] lesson_session ${sessionId} belum ada di cloud. ` +
        `Push attendance/jurnal mungkin akan ditolak FK. ` +
        `Pastikan repo memanggil pushLessonSessionToCloud(session) sebelum push child.`
      );
    }
  } catch (e) {
    console.warn(`[Supabase Bridge] Error cek lesson_session: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/* ------------------------------------------------------------------ */
/*  Attendance Bridge                                                  */
/* ------------------------------------------------------------------ */

/**
 * Push array AttendanceRecord lokal ke Supabase `attendance_records`.
 * Best-effort: bila gagal, return error tapi tidak throw.
 * Bila Supabase tidak aktif, return success dengan pushed=0 (no-op).
 *
 * Mapping field lokal → cloud:
 *   - id (local uuid) → tidak dipakai (cloud generate uuid sendiri, atau
 *     upsert by session_id + student_id)
 *   - sessionId → session_id (cloud FK ke lesson_sessions)
 *   - studentId → student_id
 *   - status → status
 *   - note → note
 */
export async function pushAttendanceToCloud(
  records: AttendanceRecord[]
): Promise<PushResult> {
  if (!await isBridgeActive()) {
    return { success: true, pushed: 0 };
  }
  const teacherId = await getCloudTeacherId();
  if (!teacherId) {
    return { success: false, error: "Teacher ID cloud tidak ditemukan", pushed: 0 };
  }

  // FIXPACK-01 P0-2: pastikan lesson_session ada di cloud sebelum push attendance
  // (FK session_id → lesson_sessions.id)
  if (records.length > 0) {
    await ensureLessonSessionInCloud(records[0].sessionId);
  }

  try {
    const sb = requireSupabase();
    const rows = records.map((r) => ({
      session_id: r.sessionId,
      teacher_id: teacherId,
      student_id: r.studentId,
      student_name: r.studentName,
      student_number: r.studentNumber ?? null,
      status: r.status,
      note: r.note ?? null,
    }));

    // Upsert by (session_id, student_id) — bila sudah ada, update status/note.
    // Catatan: tabel cloud perlu unique constraint (session_id, student_id)
    // supaya upsert bekerja. Bila belum ada, insert akan dobel. Tapi RLS
    // membatasi per teacher, jadi konflik hanya untuk guru yang sama.
    const { error } = await sb
      .from("attendance_records")
      .upsert(rows, { onConflict: "session_id,student_id" });

    if (error) {
      return { success: false, error: error.message, pushed: 0 };
    }
    return { success: true, pushed: rows.length };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
      pushed: 0,
    };
  }
}

/**
 * Pull attendance records dari Supabase untuk session tertentu.
 * Dipakai untuk sync: bila data cloud lebih baru, update lokal.
 */
export async function pullAttendanceFromCloud(
  sessionId: string
): Promise<PullResult<AttendanceRecord>> {
  if (!await isBridgeActive()) {
    return { success: true, data: [] };
  }

  try {
    const sb = requireSupabase();
    const { data, error } = await sb
      .from("attendance_records")
      .select("*")
      .eq("session_id", sessionId);

    if (error) {
      return { success: false, error: error.message, data: [] };
    }
    if (!data) return { success: true, data: [] };

    // Map cloud → lokal (field name snake_case → camelCase)
    const records: AttendanceRecord[] = (data as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id ?? ""),
      sessionId: String(row.session_id ?? ""),
      studentId: String(row.student_id ?? ""),
      studentName: String(row.student_name ?? ""),
      studentNumber: row.student_number as number | undefined,
      classId: "", // tidak ada di cloud schema (diambil dari session)
      classLabel: "",
      date: "", // tidak ada di cloud (diambil dari session)
      status: String(row.status ?? "present") as AttendanceRecord["status"],
      note: row.note as string | undefined,
      createdAt: row.created_at ? String(row.created_at) : "",
      updatedAt: row.updated_at ? String(row.updated_at) : "",
      deletedAt: null,
      syncStatus: "synced" as const,
    }));

    return { success: true, data: records };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
      data: [],
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Journal Bridge                                                     */
/* ------------------------------------------------------------------ */

/**
 * Push TeachingJournal lokal ke Supabase `journal_entries`.
 * Best-effort: bila gagal, return error tapi tidak throw.
 *
 * Mapping field lokal → cloud:
 *   - sessionId → session_id
 *   - material/activity/note → material/activity/note
 *   - status "final" → locked = true; lainnya → locked = false
 */
export async function pushJournalToCloud(
  journal: TeachingJournal
): Promise<PushResult> {
  if (!await isBridgeActive()) {
    return { success: true, pushed: 0 };
  }
  const teacherId = await getCloudTeacherId();
  if (!teacherId) {
    return { success: false, error: "Teacher ID cloud tidak ditemukan", pushed: 0 };
  }

  // FIXPACK-01 P0-2: pastikan lesson_session ada di cloud sebelum push journal
  // (FK session_id → lesson_sessions.id)
  await ensureLessonSessionInCloud(journal.sessionId);

  try {
    const sb = requireSupabase();
    const row = {
      session_id: journal.sessionId,
      teacher_id: teacherId,
      material: journal.actualMaterialTitle ?? journal.plannedMaterialTitle ?? "",
      activity: journal.realizationStatus ?? "",
      note: journal.note ?? null,
      locked: journal.status === "final",
    };

    // Upsert by session_id (1 jurnal per sesi)
    const { error } = await sb
      .from("journal_entries")
      .upsert(row, { onConflict: "session_id" });

    if (error) {
      return { success: false, error: error.message, pushed: 0 };
    }
    return { success: true, pushed: 1 };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
      pushed: 0,
    };
  }
}

/**
 * Pull journal dari Supabase untuk session tertentu.
 */
export async function pullJournalFromCloud(
  sessionId: string
): Promise<PullResult<TeachingJournal>> {
  if (!await isBridgeActive()) {
    return { success: true, data: [] };
  }

  try {
    const sb = requireSupabase();
    const { data, error } = await sb
      .from("journal_entries")
      .select("*")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message, data: [] };
    }
    if (!data) return { success: true, data: [] };

    const row = data as Record<string, unknown>;
    const journal = {
      id: String(row.id ?? ""),
      sessionId: String(row.session_id ?? ""),
      teacherId: String(row.teacher_id ?? ""),
      teacherName: "",
      classId: "",
      classLabel: "",
      subject: "",
      date: "",
      semester: 1 as 1 | 2,
      plannedUnitId: null,
      plannedMaterialTitle: null,
      plannedLearningOutcome: null,
      presentCount: 0,
      sickCount: 0,
      excusedCount: 0,
      lateCount: 0,
      absentCount: 0,
      totalStudents: 0,
      actualMaterialTitle: String(row.material ?? ""),
      note: row.note as string | undefined,
      followUp: undefined,
      status: (row.locked ? "final" : "draft") as TeachingJournal["status"],
      realizationStatus: (row.activity ?? "done") as TeachingJournal["realizationStatus"],
      locked: Boolean(row.locked),
      createdAt: row.created_at ? String(row.created_at) : "",
      updatedAt: row.updated_at ? String(row.updated_at) : "",
      deletedAt: null,
      syncStatus: "synced" as const,
      academicYearId: "",
    } as TeachingJournal;

    return { success: true, data: [journal] };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
      data: [],
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Sync Helper                                                        */
/* ------------------------------------------------------------------ */

/**
 * Sync attendance: pull dari cloud, merge dengan lokal (cloud menang bila lebih baru).
 * Dipakai saat buka halaman Absen untuk dapat data terbaru.
 *
 * FIXPACK-01 P1-2: DINONAKTIFKAN sementara. pullAttendanceFromCloud mengisi
 * classId, classLabel, date sebagai string kosong (data tidak ada di cloud
 * attendance table). Bila dipakai overwrite lokal, data lokal bisa rusak.
 * Aktifkan kembali setelah mapping cloud → lokal lengkap (join lesson_sessions
 * untuk dapat classId/classLabel/date).
 *
 * Return: selalu null (disabled).
 */
export async function syncAttendanceFromCloud(
  sessionId: string
): Promise<AttendanceRecord[] | null> {
  void sessionId; // unused — function disabled
  console.warn("[Supabase Bridge] syncAttendanceFromCloud dinonaktifkan (FIXPACK-01 P1-2). Mapping cloud→lokal belum lengkap.");
  return null;
}

/**
 * Sync journal: pull dari cloud.
 *
 * FIXPACK-01 P1-2: DINONAKTIFKAN sementara. Alasan sama dengan attendance.
 */
export async function syncJournalFromCloud(
  sessionId: string
): Promise<TeachingJournal | null> {
  void sessionId; // unused — function disabled
  console.warn("[Supabase Bridge] syncJournalFromCloud dinonaktifkan (FIXPACK-01 P1-2). Mapping cloud→lokal belum lengkap.");
  return null;
}

/**
 * Get info bridge status untuk UI (tampilkan badge "Tersinkron" / "Offline").
 */
export async function getBridgeStatus(): Promise<{
  active: boolean;
  profile: CloudTeacherProfile | null;
}> {
  if (!await isBridgeActive()) {
    return { active: false, profile: null };
  }
  const state = await getCurrentCloudAuthState();
  return { active: true, profile: state.profile };
}
