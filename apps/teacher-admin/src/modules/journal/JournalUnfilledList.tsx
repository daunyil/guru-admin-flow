/**
 * JournalUnfilledList — daftar sesi yang belum diisi jurnal.
 * Shows unfilled, draft, final, and cancelled sessions grouped by status.
 */

import type { LessonSession, TeachingJournal, TeachingAssignment } from "@guru-admin/domain";
import { formatLongDateID } from "@guru-admin/shared";
import { JournalMode } from "./quickJournalTypes";

export function JournalUnfilledList({
  hasAssignment,
  assignments,
  sessions,
  allAssignmentSessions,
  journals,
  date,
  mode,
  onSelectSession,
}: {
  hasAssignment: boolean;
  assignments: TeachingAssignment[];
  sessions: LessonSession[];
  allAssignmentSessions: LessonSession[];
  journals: TeachingJournal[];
  date: string;
  mode: JournalMode;
  onSelectSession: (sid: string) => void;
}) {
  // Tidak ada assignment dipilih
  if (!hasAssignment) {
    return (
      <div className="py-10 px-4 text-center">
        <p className="text-lg font-medium text-slate-500">Pilih Kelas dan Mapel</p>
        <p className="text-sm text-slate-400 mt-1">Buka sidebar atau pilih kelas dan mapel untuk melihat daftar jurnal.</p>
        {assignments.length === 0 && (
          <p className="text-sm text-amber-600 mt-3">Belum ada Kelas dan Mapel. Buat dulu di menu Kelas dan Mapel.</p>
        )}
      </div>
    );
  }

  // Mode pertemuan: tampilkan sesi hari ini
  if (mode === "pertemuan") {
    const journalSessionIds = new Set(journals.map((j) => j.sessionId));
    const unfilled = sessions.filter((s) => !journalSessionIds.has(s.id) && s.status !== "cancelled");
    const draftJournals = journals.filter((j) => !j.locked);
    const finalJournals = journals.filter((j) => j.locked);
    const cancelled = sessions.filter((s) => s.status === "cancelled");

    return (
      <div className="py-6 px-4">
        <h3 className="text-lg font-bold text-slate-900 mb-1">Daftar Jurnal</h3>
        <p className="text-sm text-slate-500 mb-4">{formatLongDateID(date)} · {sessions.length} sesi</p>

        {/* Perlu Finalisasi */}
        {draftJournals.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Perlu Finalisasi ({draftJournals.length})
            </h4>
            <div className="space-y-2">
              {draftJournals.map((j) => {
                return (
                  <div key={j.id} className="p-3 border border-amber-200 bg-amber-50 rounded-lg flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{j.subject} — {j.classLabel}</p>
                      <p className="text-xs text-slate-500">{formatLongDateID(j.date)} · Draft</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => j.sessionId && onSelectSession(j.sessionId)}
                      className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-md bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                    >
                      Finalisasi
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
                    onClick={() => onSelectSession(s.id)}
                    className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-md bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                  >
                    Isi Jurnal
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sudah final */}
        {finalJournals.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Sudah Final ({finalJournals.length})
            </h4>
            <div className="space-y-2">
              {finalJournals.map((j) => {
                return (
                  <div key={j.id} className="p-3 border border-emerald-200 bg-emerald-50 rounded-lg flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{j.subject} — {j.classLabel}</p>
                      <p className="text-xs text-slate-500">{formatLongDateID(j.date)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => j.sessionId && onSelectSession(j.sessionId)}
                      className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-md border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                    >
                      Lihat
                    </button>
                  </div>
                );
              })}
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

  // Mode susulan: tampilkan semua sesi assignment
  if (allAssignmentSessions.length === 0) {
    return (
      <div className="py-10 px-4 text-center">
        <p className="text-lg font-medium text-slate-500">Belum ada sesi</p>
        <p className="text-sm text-slate-400 mt-1">Buat jadwal mengajar terlebih dahulu agar sesi muncul di sini.</p>
      </div>
    );
  }

  const journalSessionIds = new Set(journals.map((j) => j.sessionId));
  const draftJournals = journals.filter((j) => !j.locked);
  const draftSessionIds = new Set(draftJournals.map((j) => j.sessionId));
  const finalSessionIds = new Set(journals.filter((j) => j.locked).map((j) => j.sessionId));

  const unfilled = allAssignmentSessions.filter((s) => !journalSessionIds.has(s.id));
  const needsFinal = allAssignmentSessions.filter((s) => draftSessionIds.has(s.id));
  const done = allAssignmentSessions.filter((s) => finalSessionIds.has(s.id));

  return (
    <div className="py-6 px-4">
      <h3 className="text-lg font-bold text-slate-900 mb-1">Daftar Jurnal</h3>
      <p className="text-sm text-slate-500 mb-4">
        {done.length} final · {needsFinal.length} draft · {unfilled.length} belum · Total {allAssignmentSessions.length} pertemuan
      </p>

      {/* Perlu Finalisasi */}
      {needsFinal.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Perlu Finalisasi ({needsFinal.length})
          </h4>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {needsFinal.map((s, i) => (
              <div key={s.id} className="p-2.5 border border-amber-200 bg-amber-50 rounded-lg flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">P{i + 1} · {formatLongDateID(s.date)}</p>
                  <p className="text-xs text-slate-500">{s.subject} · {s.classLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectSession(s.id)}
                  className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-md bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                >
                  Finalisasi
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
                  <p className="text-sm font-medium text-slate-900">P{i + 1} · {formatLongDateID(s.date)}</p>
                  <p className="text-xs text-slate-500">{s.subject} · {s.classLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectSession(s.id)}
                  className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-md bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                >
                  Isi Jurnal
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sudah final */}
      {done.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Sudah Final ({done.length})
          </h4>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {done.map((s, i) => (
              <div key={s.id} className="p-2.5 border border-emerald-200 bg-emerald-50 rounded-lg flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">P{i + 1} · {formatLongDateID(s.date)}</p>
                  <p className="text-xs text-slate-500">{s.subject} · {s.classLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectSession(s.id)}
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
