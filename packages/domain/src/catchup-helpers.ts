/**
 * Catch-up window helpers — rekap pertemuan per assignment.
 *
 * PATCH-FLOW-RC2D: untuk window Absensi Susulan & Jurnal Susulan.
 *
 * Filosofi: "total pertemuan sesuai Promes" = jumlah LessonSession yang
 * sudah di-generate untuk assignment itu (karena LessonSession sudah
 * per minggu sesuai jadwal + kalender). Bila LessonSession belum di-generate,
 * total target = 0 dan guru harus generate dari menu Jadwal dulu.
 */

import type { LessonSession, AttendanceRecord, TeachingJournal, TeachingAssignment } from "./index";

export type MeetingStatus = "planned" | "done" | "cancelled" | "continued" | "rescheduled";

export type MeetingRecap = {
  total: number;
  done: number; // sudah absen / sudah jurnal
  pending: number; // belum absen / belum jurnal
  cancelled: number;
  pendingMeetings: LessonSession[]; // daftar pertemuan belum diisi
  doneMeetings: LessonSession[]; // daftar pertemuan sudah diisi
};

/**
 * Filter LessonSession untuk assignment tertentu (by classId + subject + teacherId).
 */
export function filterSessionsForAssignment(
  sessions: LessonSession[],
  assignment: TeachingAssignment
): LessonSession[] {
  return sessions.filter(
    (s) =>
      s.classId === assignment.classId &&
      s.subject === assignment.subject &&
      s.teacherId === assignment.teacherId &&
      !s.deletedAt
  );
}

/**
 * Rekap absensi per assignment.
 *
 * - total: jumlah LessonSession untuk assignment (planned + done + cancelled).
 * - done: jumlah session yang sudah ada AttendanceRecord.
 * - pending: total - done - cancelled (sesi planned yang belum absen).
 * - cancelled: jumlah session dengan status "cancelled".
 * - pendingMeetings: sorted ascending by date.
 */
export function recapAttendanceForAssignment(args: {
  sessions: LessonSession[];
  attendanceRecords: AttendanceRecord[];
  assignment: TeachingAssignment;
}): MeetingRecap {
  const assignmentSessions = filterSessionsForAssignment(args.sessions, args.assignment);
  const attendedSessionIds = new Set(
    args.attendanceRecords.map((r) => r.sessionId)
  );

  const pendingMeetings: LessonSession[] = [];
  const doneMeetings: LessonSession[] = [];
  let cancelled = 0;

  for (const s of assignmentSessions) {
    if (s.status === "cancelled") {
      cancelled++;
      continue;
    }
    if (attendedSessionIds.has(s.id)) {
      doneMeetings.push(s);
    } else {
      pendingMeetings.push(s);
    }
  }

  // Sort ascending by date, then by startPeriod
  const sortFn = (a: LessonSession, b: LessonSession) =>
    a.date.localeCompare(b.date) || a.startPeriod - b.startPeriod;
  pendingMeetings.sort(sortFn);
  doneMeetings.sort(sortFn);

  const done = doneMeetings.length;
  const total = assignmentSessions.length;
  const pending = pendingMeetings.length;

  return { total, done, pending, cancelled, pendingMeetings, doneMeetings };
}

/**
 * Rekap jurnal per assignment.
 */
export function recapJournalsForAssignment(args: {
  sessions: LessonSession[];
  journals: TeachingJournal[];
  assignment: TeachingAssignment;
}): MeetingRecap {
  const assignmentSessions = filterSessionsForAssignment(args.sessions, args.assignment);
  const journaledSessionIds = new Set(args.journals.map((j) => j.sessionId));

  const pendingMeetings: LessonSession[] = [];
  const doneMeetings: LessonSession[] = [];
  let cancelled = 0;

  for (const s of assignmentSessions) {
    if (s.status === "cancelled") {
      cancelled++;
      continue;
    }
    if (journaledSessionIds.has(s.id)) {
      doneMeetings.push(s);
    } else {
      pendingMeetings.push(s);
    }
  }

  const sortFn = (a: LessonSession, b: LessonSession) =>
    a.date.localeCompare(b.date) || a.startPeriod - b.startPeriod;
  pendingMeetings.sort(sortFn);
  doneMeetings.sort(sortFn);

  const done = doneMeetings.length;
  const total = assignmentSessions.length;
  const pending = pendingMeetings.length;

  return { total, done, pending, cancelled, pendingMeetings, doneMeetings };
}
