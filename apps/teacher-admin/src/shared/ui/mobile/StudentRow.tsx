/**
 * StudentRow — Reusable student row with status selector buttons.
 *
 * Used by: KBM Kilat (Presensi step), MobileAttendancePage.
 * Replaces 2 inline implementations with unified styling.
 */

import { ATTENDANCE_STATUS_OPTIONS, INACTIVE_STATUS_BTN } from "@shared/constants/attendance-status";
import type { AttendanceStatus } from "@guru-admin/domain";

interface StudentRowProps {
  /** Display number (1-indexed) */
  number: number;
  /** Student name */
  name: string;
  /** Current status */
  status: AttendanceStatus;
  /** Called when a status button is clicked */
  onStatusChange: (status: AttendanceStatus) => void;
  /** Whether to show the "Terlambat" (T) option. Default: true */
  showLate?: boolean;
  /** Compact mode — smaller text for mobile */
  compact?: boolean;
}

export function StudentRow({
  number,
  name,
  status,
  onStatusChange,
  showLate = true,
  compact = false,
}: StudentRowProps) {
  const options = showLate
    ? ATTENDANCE_STATUS_OPTIONS
    : ATTENDANCE_STATUS_OPTIONS.filter((o) => o.value !== "late");

  return (
    <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200">
      <span
        className={`font-semibold text-slate-700 truncate ${
          compact ? "text-xs w-28" : "text-sm w-32"
        }`}
      >
        {number}. {name}
      </span>
      <div className="flex gap-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onStatusChange(opt.value)}
            className={`rounded-lg font-bold transition-all active:scale-95 ${
              compact ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm"
            } ${
              status === opt.value ? opt.color : INACTIVE_STATUS_BTN
            }`}
            aria-label={`${opt.label} ${name}`}
            aria-pressed={status === opt.value}
          >
            {opt.short}
          </button>
        ))}
      </div>
    </div>
  );
}
