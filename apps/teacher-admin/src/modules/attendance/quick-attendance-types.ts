/**
 * QuickAttendancePage shared types and constants.
 */

import type { summarizeAttendance, AttendanceStatus } from "@guru-admin/domain";

/** Attendance status values — sourced from domain. */
export type Status = AttendanceStatus;

/** Sidebar mode: regular schedule vs make-up (susulan). */
export type Mode = "jadwal" | "susulan";

/** Info returned after a successful save, used for the toast notification. */
export type SaveInfo = {
  sessionId: string;
  subject: string;
  classLabel: string;
  date: string;
  summary: ReturnType<typeof summarizeAttendance>;
};

/** Status toggle buttons config for the attendance editor. */
export const statusButtons: Array<{ value: AttendanceStatus; short: string; active: string }> = [
  { value: "present", short: "H", active: "bg-brand-600 text-white" },
  { value: "sick", short: "S", active: "bg-amber-500 text-white" },
  { value: "excused", short: "I", active: "bg-slate-500 text-white" },
  { value: "late", short: "T", active: "bg-orange-500 text-white" },
  { value: "absent", short: "A", active: "bg-rose-600 text-white" },
];
