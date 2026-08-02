/**
 * AttendanceRecapCard — Rekap kehadiran siswa hari ini (read-only).
 *
 * V2: Consistent card styling, MiniStat-style, better badge layout.
 */

import { Card, CardHeader, Badge, EmptyState } from "@shared/ui";
import type { ClassAttendanceDetail } from "@guru-admin/domain";

interface AttendanceRecapCardProps {
  attendanceDetail: ClassAttendanceDetail[];
}

export function AttendanceRecapCard({ attendanceDetail }: AttendanceRecapCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-slate-50 px-4 py-2.5 md:py-3 border-b border-slate-100">
        <h3 className="text-xs md:text-sm font-bold text-slate-800 uppercase tracking-wider">Kehadiran Kelas Hari Ini</h3>
        <p className="text-[10px] md:text-xs text-slate-500 mt-0.5">Dari absen utama (hanya lihat)</p>
      </div>
      {attendanceDetail.length === 0 ? (
        <div className="p-6">
          <EmptyState title="Belum ada data" description="Belum ada data absen untuk hari ini." />
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {attendanceDetail.map((s) => (
            <div key={s.classId} className="p-3 md:p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs md:text-sm text-slate-900">{s.classLabel}</span>
                {s.source === "empty" ? (
                  <span className="text-[10px] md:text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                    Belum diisi
                  </span>
                ) : (
                  <div className="flex gap-1.5">
                    <span className="text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">H {s.present}</span>
                    <span className="text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">S {s.sick}</span>
                    <span className="text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">I {s.excused}</span>
                    <span className="text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">A {s.absent}</span>
                  </div>
                )}
              </div>
              {s.source === "attendance" && (s.sick > 0 || s.excused > 0 || s.absent > 0) && (
                <div className="text-[10px] md:text-xs text-slate-600 space-y-0.5 mt-1">
                  {s.sickStudents.length > 0 && <p>Sakit: {s.sickStudents.join(", ")}</p>}
                  {s.excusedStudents.length > 0 && <p>Izin: {s.excusedStudents.join(", ")}</p>}
                  {s.absentStudents.length > 0 && <p>Alpa: {s.absentStudents.join(", ")}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
