/**
 * TodaySessionsCard — card displaying today's teaching sessions.
 *
 * UNIFIED KBM: All links now go to /kbm-hub (single entry point).
 * - /attendance?sessionId= → /kbm-hub?sessionId= (redirect handled by App.tsx)
 * - /journal?sessionId= → /kbm-hub?sessionId= (redirect handled by App.tsx)
 * - /kbm-kilat → /kbm-hub (redirect handled by App.tsx)
 */

import { Link } from "react-router-dom";
import { Card, CardHeader, Button, EmptyState, Badge } from "@shared/ui";
import type { LessonSession } from "@guru-admin/domain";

type TodaySessionsCardProps = {
  activeYear: unknown;
  todaySessions: LessonSession[];
  todayAttendanceSessionIds: Set<string>;
  todayJournalSessionIds: Set<string>;
};

export function TodaySessionsCard({
  activeYear,
  todaySessions,
  todayAttendanceSessionIds,
  todayJournalSessionIds,
}: TodaySessionsCardProps) {
  const description =
    activeYear && todaySessions.length > 0
      ? `${todaySessions.length} sesi`
      : activeYear
        ? "Tidak ada sesi"
        : "Butuh tahun pelajaran & jadwal";

  return (
    <Card>
      <CardHeader
        title="Sesi Mengajar Hari Ini"
        description={description}
      />
      {!activeYear ? (
        <EmptyState
          title="Belum ada sesi mengajar"
          description="Buat tahun pelajaran dan jadwal mengajar terlebih dahulu, maka sesi akan otomatis muncul di sini."
          action={
            <div className="flex gap-2">
              <Link to="/new-year"><Button variant="secondary">Buat Tahun Pelajaran</Button></Link>
              <Link to="/kbm-hub"><Button variant="secondary">KBM</Button></Link>
            </div>
          }
        />
      ) : todaySessions.length === 0 ? (
        <EmptyState
          title="Tidak ada jadwal mengajar hari ini"
          description="Tidak masalah. Gunakan KBM untuk mengisi sesi lain atau buat pertemuan tambahan."
          action={
            <div className="flex gap-2">
              <Link to="/kbm-hub"><Button>KBM</Button></Link>
            </div>
          }
        />
      ) : (
        <div className="space-y-2">
          {todaySessions.map((s) => {
            const hasAttendance = todayAttendanceSessionIds.has(s.id);
            const hasJournal = todayJournalSessionIds.has(s.id);
            const isManual = s.teachingScheduleId === "manual" || s.teachingScheduleId === "susulan";
            return (
              <div
                key={s.id}
                className={`p-3 border rounded-md ${
                  s.status === "cancelled" ? "border-rose-200 bg-rose-50" : "border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">
                        {isManual ? "Manual" : `${s.startTime}–${s.endTime} · Jam ${s.startPeriod}`}
                      </span>
                      {s.status === "planned" ? (
                        <>
                          {!hasAttendance && <Badge variant="warning">Belum absen</Badge>}
                          {hasAttendance && <Badge variant="success">✓ Absen</Badge>}
                          {!hasJournal && <Badge variant="warning">Belum jurnal</Badge>}
                          {hasJournal && <Badge variant="success">✓ Jurnal</Badge>}
                        </>
                      ) : (
                        <Badge variant="error">Batal</Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-900 mt-1">
                      {s.subject} — {s.classLabel}
                    </p>
                  </div>
                  {s.status === "planned" && (
                    <div className="flex flex-col gap-1 shrink-0">
                      <Link to={`/kbm-hub?sessionId=${s.id}`}>
                        <Button variant="secondary" className="text-xs px-3 py-1.5">KBM</Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
