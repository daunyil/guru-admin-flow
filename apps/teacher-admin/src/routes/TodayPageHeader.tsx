/**
 * TodayPageHeader — the header section showing date, title, and context.
 */

import type { AcademicYear, SchoolProfile, TeacherProfile } from "@guru-admin/domain";

type TodayPageHeaderProps = {
  todayLabel: string;
  activeYear: AcademicYear | undefined;
  school: SchoolProfile | undefined;
  teacher: TeacherProfile | undefined;
};

export function TodayPageHeader({ todayLabel, activeYear, school, teacher }: TodayPageHeaderProps) {
  return (
    <div className="page-header">
      <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{todayLabel}</p>
      <h1 className="text-2xl font-bold text-slate-900 mt-1">Hari Ini</h1>
      {activeYear ? (
        <p className="text-sm text-slate-500 mt-1">
          {school?.name ?? "Sekolah"} · TP {activeYear.label} · {teacher?.name ?? "Guru"}
        </p>
      ) : (
        <p className="text-sm text-amber-600 mt-1">
          Belum ada tahun pelajaran aktif — buat dulu atau pakai data contoh
        </p>
      )}
    </div>
  );
}
