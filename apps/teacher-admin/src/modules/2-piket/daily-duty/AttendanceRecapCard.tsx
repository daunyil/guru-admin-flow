/**
 * AttendanceRecapCard — Rekap kehadiran siswa hari ini (read-only).
 *
 * PIKET-REDESIGN: Bahasa lebih ramah, layout lebih lega.
 */

import { Card, CardHeader, Badge, EmptyState } from "@shared/ui";
import type { ClassAttendanceDetail } from "@guru-admin/domain";

interface AttendanceRecapCardProps {
  attendanceDetail: ClassAttendanceDetail[];
}

export function AttendanceRecapCard({ attendanceDetail }: AttendanceRecapCardProps) {
  return (
    <Card>
      <CardHeader
        title="🏫 Kehadiran Kelas Hari Ini"
        description="Dari absen utama (hanya lihat)"
      />
      {attendanceDetail.length === 0 ? (
        <EmptyState title="Belum ada data" description="Belum ada data absen untuk hari ini." />
      ) : (
        <div className="space-y-3">
          {attendanceDetail.map((s) => (
            <div key={s.classId} className="p-3 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm text-slate-900">{s.classLabel}</span>
                {s.source === "empty" ? (
                  <Badge variant="warning">Absen belum diisi</Badge>
                ) : (
                  <div className="flex gap-2 text-xs">
                    <Badge variant="success">Hadir {s.present}</Badge>
                    <Badge variant="warning">Sakit {s.sick}</Badge>
                    <Badge variant="neutral">Izin {s.excused}</Badge>
                    <Badge variant="error">Alpa {s.absent}</Badge>
                  </div>
                )}
              </div>
              {s.source === "attendance" && (s.sick > 0 || s.excused > 0 || s.absent > 0) && (
                <div className="text-sm text-slate-600 space-y-1">
                  {s.sickStudents.length > 0 && <p>Sakit: {s.sickStudents.join(", ")}</p>}
                  {s.excusedStudents.length > 0 && <p>Izin: {s.excusedStudents.join(", ")}</p>}
                  {s.absentStudents.length > 0 && <p>Alpa: {s.absentStudents.join(", ")}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
