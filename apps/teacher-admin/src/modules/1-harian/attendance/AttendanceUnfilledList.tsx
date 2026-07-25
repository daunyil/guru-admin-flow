/**
 * AttendanceUnfilledList — daftar sesi yang belum diisi absensi.
 */

import { formatLongDateID } from "@guru-admin/shared";
import type { LessonSession, TeachingAssignment } from "@guru-admin/domain";
import type { Mode } from "./quick-attendance-types";

interface AttendanceUnfilledListProps {
  mode: Mode;
  date: string;
  sessions: LessonSession[];
  allSessions: LessonSession[];
  todayDoneIds: Set<string>;
  doneIds: Set<string>;
  assignmentId: string;
  assignments: TeachingAssignment[];
  onPickSession: (sid: string) => void;
}

export function AttendanceUnfilledList({
  mode,
  date,
  sessions,
  allSessions,
  todayDoneIds,
  doneIds,
  assignmentId,
  assignments,
  onPickSession,
}: AttendanceUnfilledListProps) {
  // Mode Jadwal: tampilkan sesi hari ini
  if (mode === "jadwal") {
    const unfilled = sessions.filter((s) => !todayDoneIds.has(s.id) && s.status !== "cancelled");
    const filled = sessions.filter((s) => todayDoneIds.has(s.id));
    const cancelled = sessions.filter((s) => s.status === "cancelled");

    return (
      <div className="py-6 px-4">
        <h3 className="text-lg font-bold text-slate-900 mb-1">Daftar Absensi</h3>
        <p className="text-sm text-slate-500 mb-4">{formatLongDateID(date)} · {sessions.length} sesi</p>

        {/* Belum diisi */}
        {unfilled.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-rose-700 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Belum Diisi ({unfilled.length})
            </h4>
            <div className="space-y-2">
              {unfilled.map((s) => (
                <div key={s.id} className="p-3 border border-rose-200 bg-rose-50 rounded-lg flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{s.subject} — {s.classLabel}</p>
                    <p className="text-xs text-slate-500">{s.startTime}–{s.endTime} · Jam {s.startPeriod}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onPickSession(s.id)}
                    className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-md bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                  >
                    Isi Absen
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sudah diisi */}
        {filled.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Sudah Diisi ({filled.length})
            </h4>
            <div className="space-y-2">
              {filled.map((s) => (
                <div key={s.id} className="p-3 border border-emerald-200 bg-emerald-50 rounded-lg flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{s.subject} — {s.classLabel}</p>
                    <p className="text-xs text-slate-500">{s.startTime}–{s.endTime} · Jam {s.startPeriod}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onPickSession(s.id)}
                    className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-md border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                  >
                    Lihat
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Batal */}
        {cancelled.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-slate-500 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              Dibatalkan ({cancelled.length})
            </h4>
            <div className="space-y-2">
              {cancelled.map((s) => (
                <div key={s.id} className="p-3 border border-slate-200 bg-slate-50 rounded-lg opacity-60">
                  <p className="text-sm font-medium text-slate-500 truncate">{s.subject} — {s.classLabel}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {sessions.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            <p className="text-base font-medium">Tidak ada sesi di tanggal ini</p>
            <p className="text-sm mt-1">Coba pilih tanggal lain atau gunakan mode Susulan.</p>
          </div>
        )}
      </div>
    );
  }

  // Mode Susulan: tampilkan semua sesi per assignment
  if (!assignmentId) {
    return (
      <div className="py-10 px-4 text-center">
        <p className="text-lg font-medium text-slate-500">Pilih Kelas dan Mapel</p>
        <p className="text-sm text-slate-400 mt-1">Buka sidebar atau pilih kelas dan mapel untuk melihat daftar pertemuan.</p>
        {assignments.length === 0 && (
          <p className="text-sm text-amber-600 mt-3">Belum ada Kelas dan Mapel. Buat dulu di menu Kelas dan Mapel.</p>
        )}
      </div>
    );
  }

  if (allSessions.length === 0) {
    return (
      <div className="py-10 px-4 text-center">
        <p className="text-lg font-medium text-slate-500">Belum ada sesi</p>
        <p className="text-sm text-slate-400 mt-1">Buat jadwal mengajar terlebih dahulu agar sesi muncul di sini.</p>
      </div>
    );
  }

  const unfilled = allSessions.filter((s) => !doneIds.has(s.id));
  const filled = allSessions.filter((s) => doneIds.has(s.id));
  const asg = assignments.find((a) => a.id === assignmentId);

  return (
    <div className="py-6 px-4">
      <h3 className="text-lg font-bold text-slate-900 mb-1">
        Daftar Absensi {asg ? `${asg.classLabel} · ${asg.subject}` : ""}
      </h3>
      <p className="text-sm text-slate-500 mb-4">
        {filled.length} diisi · {unfilled.length} belum diisi · Total {allSessions.length} pertemuan
      </p>

      {/* Belum diisi — prioritas utama */}
      {unfilled.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-rose-700 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Belum Diisi ({unfilled.length})
          </h4>
          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {unfilled.map((s, i) => (
              <div key={s.id} className="p-2.5 border border-rose-200 bg-rose-50 rounded-lg flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    P{i + 1} · {formatLongDateID(s.date)}
                  </p>
                  <p className="text-xs text-slate-500">{s.subject} · {s.classLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onPickSession(s.id)}
                  className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-md bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                >
                  Isi Absen
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sudah diisi */}
      {filled.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Sudah Diisi ({filled.length})
          </h4>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {filled.map((s, i) => (
              <div key={s.id} className="p-2.5 border border-emerald-200 bg-emerald-50 rounded-lg flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    P{i + 1} · {formatLongDateID(s.date)}
                  </p>
                  <p className="text-xs text-slate-500">{s.subject} · {s.classLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onPickSession(s.id)}
                  className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-md border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                >
                  Lihat
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
