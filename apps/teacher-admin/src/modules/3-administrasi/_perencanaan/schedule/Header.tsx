interface HeaderProps {
  yearLabel?: string;
  scheduleCount?: number;
  sessionCount?: number;
}

export function Header({ yearLabel, scheduleCount, sessionCount }: HeaderProps) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Jadwal Guru</h1>
      <p className="text-sm text-slate-500 mt-1">
        {yearLabel
          ? `Tahun pelajaran: ${yearLabel} · ${scheduleCount ?? 0} jadwal · ${sessionCount ?? 0} sesi`
          : "Input manual atau impor dari Smart Roster."}
      </p>
    </div>
  );
}
