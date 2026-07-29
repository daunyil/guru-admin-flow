/**
 * AttendanceStatusConfig — Single source of truth for attendance status options.
 *
 * Replaces 3 duplicate definitions:
 *   - quick-attendance-types.ts (bg-brand-600)
 *   - MobileAttendancePage.tsx (inline)
 *   - KbmKilatPage.tsx (inline)
 *
 * SIAKAD mapping: present→H, sick→S, excused→I, late→T, absent→A.
 */

import type { AttendanceStatus } from "@guru-admin/domain";

export type StatusOption = {
  value: AttendanceStatus;
  short: string;
  label: string;
  color: string;       // Tailwind classes for active button
  textColor: string;   // Tailwind classes for summary stat text
};

/**
 * Unified status options for all attendance UIs.
 *
 * Color scheme:
 *   H (Hadir)      → emerald (green)
 *   S (Sakit)       → amber
 *   I (Izin)        → blue
 *   T (Terlambat)   → orange (hidden in SIAKAD docs, shown in KBM Kilat)
 *   A (Alpa)        → rose (red)
 */
export const ATTENDANCE_STATUS_OPTIONS: StatusOption[] = [
  { value: "present",  short: "H", label: "Hadir",      color: "bg-emerald-600 text-white", textColor: "text-emerald-600" },
  { value: "sick",     short: "S", label: "Sakit",      color: "bg-amber-500 text-white",   textColor: "text-amber-600"   },
  { value: "excused",  short: "I", label: "Izin",       color: "bg-blue-500 text-white",    textColor: "text-blue-600"    },
  { value: "late",     short: "T", label: "Terlambat",   color: "bg-orange-500 text-white",  textColor: "text-orange-600"  },
  { value: "absent",   short: "A", label: "Alpa",       color: "bg-rose-600 text-white",    textColor: "text-rose-600"    },
];

/** Inactive button style (no status selected). */
export const INACTIVE_STATUS_BTN = "bg-slate-200 text-slate-600";

/**
 * SIAKAD-visible statuses only (no T/Terlambat).
 * Used in documents/print where "Terlambat" is not shown per V0_6_2_PRODUCT_DECISIONS §1.3.
 */
export const SIAKAD_VISIBLE_OPTIONS = ATTENDANCE_STATUS_OPTIONS.filter(
  (o) => o.value !== "late"
);
