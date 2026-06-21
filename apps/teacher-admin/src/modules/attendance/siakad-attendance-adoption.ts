export const SIAKAD_ATTENDANCE_STATUS_LABELS = [
  { status: "present", short: "H", label: "Hadir" },
  { status: "sick", short: "S", label: "Sakit" },
  { status: "excused", short: "I", label: "Izin" },
  { status: "late", short: "T", label: "Terlambat" },
  { status: "absent", short: "A", label: "Alpa" },
] as const;
