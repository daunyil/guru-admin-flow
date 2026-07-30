/**
 * QuickAttendancePage shared types and constants.
 *
 * statusButtons has been REMOVED — use ATTENDANCE_STATUS_OPTIONS from
 * @shared/constants/attendance-status instead.
 * It provides .color (equivalent to old .active) + .short + .label + .textColor.
 */

import type { summarizeAttendance, AttendanceStatus } from "@guru-admin/domain";

/** Attendance status values — sourced from domain. */
export type Status = AttendanceStatus;

/** Sidebar mode: regular schedule vs make-up (susulan) vs free-form (manual). */
export type Mode = "jadwal" | "susulan" | "manual";

/** Info returned after a successful save, used for the toast notification. */
export type SaveInfo = {
  sessionId: string;
  subject: string;
  classLabel: string;
  date: string;
  summary: ReturnType<typeof summarizeAttendance>;
};

/**
 * @deprecated Use ATTENDANCE_STATUS_OPTIONS from @shared/constants/attendance-status instead.
 * This re-export is kept for backward compatibility during migration.
 */
export { ATTENDANCE_STATUS_OPTIONS as statusButtons } from "@shared/constants/attendance-status";
