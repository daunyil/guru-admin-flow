/**
 * Dashboard Hari Ini — halaman utama.
 * Sumber: docs/PROJECT_CONTRACT.md §8.1
 *
 * Sprint 3: dashboard fungsional — tampilkan sesi mengajar hari ini dari LessonSession.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, Button, EmptyState, Badge } from "../shared/ui";
import { Calendar, Plus, AlertTriangle } from "../shared/layout/icons";
import {
  getActiveAcademicYear,
  getSchoolProfile,
  getTeacherProfile,
} from "../shared/db/profile-repo";
import { getLessonSessionsByDate } from "../shared/db/lesson-session-repo";
import type { AcademicYear, SchoolProfile, TeacherProfile, LessonSession } from "@guru-admin/domain";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";

export function TodayPage() {
  const [loading, setLoading] = useState(true);
  const [activeYear, setActiveYear] = useState<AcademicYear | undefined>();
  const [school, setSchool] = useState<SchoolProfile | undefined>();
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [todaySessions, setTodaySessions] = useState<LessonSession[]>([]);

  useEffect(() => {
    void (async () => {
      const [year, sp, tp] = await Promise.all([
        getActiveAcademicYear(),
        getSchoolProfile(),
        getTeacherProfile(),
      ]);
      setActiveYear(year);
      setSchool(sp);
      setTeacher(tp);

      if (tp) {
        const today = todayISODate();
        const sessions = await getLessonSessionsByDate(tp.id, today);
        setTodaySessions(sessions);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;

  const today = todayISODate();
  const todayLabel = formatLongDateID(today);

  return (
    <div className="space-y-4">
      {/* Header hari ini */}
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{todayLabel}</p>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">Hari Ini</h1>
      </div>

      {/* Status profil */}
      {(!school || !teacher) && (
        <Card className="border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-amber-900">Profil belum lengkap</p>
              <p className="text-sm text-amber-800 mt-1">
                Lengkapi profil sekolah dan profil guru sebelum membuat tahun pelajaran baru.
              </p>
              <Link to="/profile" className="inline-block mt-2">
                <Button variant="secondary" className="text-sm">Lengkapi Profil</Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* Status tahun pelajaran */}
      {!activeYear ? (
        <Card>
          <CardHeader title="Tahun Pelajaran Aktif" />
          <EmptyState
            title="Belum ada tahun pelajaran aktif"
            description="Buat tahun pelajaran pertama secara manual, atau gunakan wizard Tahun Baru untuk menyalin dari tahun sebelumnya."
            action={
              <div className="flex gap-2 justify-center">
                <Link to="/new-year">
                  <Button>
                    <Plus className="w-4 h-4" />
                    Wizard Tahun Baru
                  </Button>
                </Link>
                <Link to="/profile">
                  <Button variant="secondary">Buat Manual</Button>
                </Link>
              </div>
            }
          />
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader title="Tahun Pelajaran Aktif" />
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-brand-600" />
                  <span className="text-xl font-bold text-slate-900">{activeYear.label}</span>
                  <Badge variant="success">Aktif</Badge>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {formatLongDateID(activeYear.startDate)} — {formatLongDateID(activeYear.endDate)}
                </p>
              </div>
            </div>
          </Card>

          {/* Sesi Mengajar Hari Ini — Sprint 3 fungsional */}
          <Card>
            <CardHeader
              title="Sesi Mengajar Hari Ini"
              description={todaySessions.length > 0 ? `${todaySessions.length} sesi` : "Tidak ada sesi"}
            />
            {todaySessions.length === 0 ? (
              <EmptyState
                title="Tidak ada sesi mengajar hari ini"
                description="Bisa jadi hari libur, atau jadwal belum di-generate. Buka menu Jadwal untuk generate sesi."
                action={
                  <Link to="/schedule">
                    <Button variant="secondary">Buka Jadwal</Button>
                  </Link>
                }
              />
            ) : (
              <div className="space-y-2">
                {todaySessions.map((s) => (
                  <div
                    key={s.id}
                    className={`p-3 border rounded-md ${
                      s.status === "cancelled"
                        ? "border-rose-200 bg-rose-50"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {s.startTime}–{s.endTime} · Jam ke {s.startPeriod}
                          </span>
                          <Badge variant={s.status === "planned" ? "success" : "error"}>
                            {s.status === "planned" ? "Planned" : "Cancelled"}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-slate-900 mt-1">
                          {s.subject} — {s.classLabel}
                        </p>
                        {s.plannedUnitId && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            Materi: ter-assign (lihat detail di menu Promes)
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Belum Selesai" />
            <EmptyState
              title="Belum ada tracking pekerjaan tertunda"
              description="Daftar pekerjaan belum selesai (jurnal kosong, absensi belum sinkron, Promes perlu perbaikan) akan muncul di sini mulai Sprint 4+."
            />
          </Card>
        </>
      )}

      <Card>
        <CardHeader title="Status Sprint" description="Sprint 3 — Jadwal Guru + Sesi Mengajar" />
        <ul className="text-sm space-y-2">
          <StatusItem done label="Profil sekolah, guru, tahun pelajaran tersimpan di IndexedDB" />
          <StatusItem done label="Backup/restore JSON dengan validasi schemaVersion" />
          <StatusItem done label="Wizard tahun baru (salin profil+Prota, kosongkan realisasi)" />
          <StatusItem done label="Schema domain Zod untuk 11 entitas inti" />
          <StatusItem done label="Kalender pendidikan: impor JSON + editor (Sprint 2)" />
          <StatusItem done label="Prota editor lengkap + validasi JP (Sprint 2)" />
          <StatusItem done label="Promes generator pure function + KO row terpisah (Sprint 2)" />
          <StatusItem done label="Jadwal guru: input manual + impor Smart Roster (Sprint 3)" />
          <StatusItem done label="Generator LessonSession dari jadwal + kalender (Sprint 3)" />
          <StatusItem done label="Dashboard hari ini fungsional (tampilkan sesi hari ini) (Sprint 3)" />
          <StatusItem label="Link ProtaUnit ke LessonSession via Promes-Lesson Linker (Sprint 3 partial — domain siap, UI di Sprint 4)" />
          <StatusItem label="Absensi HP + jurnal otomatis (Sprint 4)" />
          <StatusItem label="Laporan akhir semester (Sprint 5)" />
          <StatusItem label="Supabase sync (Sprint 6)" />
        </ul>
      </Card>
    </div>
  );
}

function StatusItem({ label, done = false }: { label: string; done?: boolean }) {
  return (
    <li className="flex items-start gap-2">
      <div
        className={`w-4 h-4 rounded-full mt-0.5 shrink-0 flex items-center justify-center text-[10px] ${
          done ? "bg-brand-600 text-white" : "border border-slate-300"
        }`}
      >
        {done ? "✓" : ""}
      </div>
      <span className={done ? "text-slate-700" : "text-slate-400"}>{label}</span>
    </li>
  );
}
