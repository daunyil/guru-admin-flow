/**
 * Dashboard Hari Ini — Meja Kerja Guru.
 * Sumber: docs/PROJECT_CONTRACT.md §8.1
 *
 * Sprint 6B: rewrite sebagai halaman kerja harian, bukan status teknis.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, Button, EmptyState, Badge } from "../shared/ui";
import {
  getActiveAcademicYear,
  getSchoolProfile,
  getTeacherProfile,
} from "../shared/db/profile-repo";
import { getLessonSessionsByDate } from "../shared/db/lesson-session-repo";
import { seedSampleData } from "../shared/db/seed-sample-data";
import type { AcademicYear, SchoolProfile, TeacherProfile, LessonSession } from "@guru-admin/domain";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";

export function TodayPage() {
  const [loading, setLoading] = useState(true);
  const [activeYear, setActiveYear] = useState<AcademicYear | undefined>();
  const [school, setSchool] = useState<SchoolProfile | undefined>();
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [todaySessions, setTodaySessions] = useState<LessonSession[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);

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
      {/* Header kecil */}
      <div className="page-header">
        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{todayLabel}</p>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">Hari Ini</h1>
        {activeYear && (
          <p className="text-sm text-slate-500 mt-1">
            {school?.name ?? "Sekolah"} · TP {activeYear.label} · {teacher?.name ?? "Guru"}
          </p>
        )}
      </div>

      {/* Bila belum ada profil */}
      {(!school || !teacher) && (
        <Card className="border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <span className="text-amber-600 text-xl">⚠</span>
            <div>
              <p className="font-semibold text-amber-900">Profil belum lengkap</p>
              <p className="text-sm text-amber-800 mt-1">
                Lengkapi profil sekolah dan profil guru di menu Profil.
              </p>
              <Link to="/profile" className="inline-block mt-2">
                <Button variant="secondary" className="text-sm">Lengkapi Profil</Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* Bila belum ada tahun pelajaran */}
      {!activeYear ? (
        <Card>
          <EmptyState
            title="Belum ada tahun pelajaran aktif"
            description="Buat tahun pelajaran, gunakan wizard Tahun Baru, atau pakai data contoh SMPN 8 Bantan untuk uji coba cepat."
            action={
              <div className="flex gap-2 justify-center flex-wrap">
                <Button
                  variant="secondary"
                  disabled={seeding}
                  onClick={async () => {
                    setSeeding(true);
                    const result = await seedSampleData();
                    setSeedMsg(result.message);
                    setSeeding(false);
                    if (result.success) {
                      setTimeout(() => window.location.reload(), 2000);
                    }
                  }}
                >
                  {seeding ? "Memuat..." : "Pakai Data Contoh"}
                </Button>
                <Link to="/new-year">
                  <Button>Wizard Tahun Baru</Button>
                </Link>
              </div>
            }
          />
          {seedMsg && (
            <div className={`mt-3 p-3 rounded-md text-sm ${seedMsg.includes("berhasil") ? "info-banner-success" : "info-banner-error"}`}>
              {seedMsg}
            </div>
          )}
        </Card>
      ) : (
        <>
          {/* Mulai Cepat */}
          <Card>
            <CardHeader title="Mulai Cepat" />
            <div className="flex gap-2 flex-wrap">
              <Link to="/attendance">
                <Button variant="secondary">Absen Hari Ini</Button>
              </Link>
              <Link to="/journal">
                <Button variant="secondary">Jurnal Hari Ini</Button>
              </Link>
              <Link to="/semester-report">
                <Button variant="secondary">Laporan Semester</Button>
              </Link>
              <Link to="/completeness">
                <Button variant="secondary">Cek Kelengkapan</Button>
              </Link>
            </div>
          </Card>

          {/* Sesi Mengajar Hari Ini */}
          <Card>
            <CardHeader
              title="Sesi Mengajar Hari Ini"
              description={todaySessions.length > 0 ? `${todaySessions.length} sesi` : "Tidak ada sesi"}
            />
            {todaySessions.length === 0 ? (
              <EmptyState
                title="Tidak ada jadwal mengajar hari ini"
                description="Bisa jadi hari libur atau jadwal belum dibuat. Buka menu Jadwal untuk membuat jadwal."
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
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {s.startTime}–{s.endTime} · Jam ke {s.startPeriod}
                          </span>
                          {s.status === "planned" ? (
                            <Badge variant="success">Tersedia</Badge>
                          ) : (
                            <Badge variant="error">Dibatalkan</Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium text-slate-900 mt-1">
                          {s.subject} — {s.classLabel}
                        </p>
                      </div>
                      {s.status === "planned" && (
                        <div className="flex flex-col gap-1 shrink-0">
                          <Link to={`/attendance?sessionId=${s.id}`}>
                            <Button variant="secondary" className="text-xs px-3 py-1.5">Absen</Button>
                          </Link>
                          <Link to={`/journal?sessionId=${s.id}`}>
                            <Button className="text-xs px-3 py-1.5">Jurnal</Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Belum Selesai */}
          <Card>
            <CardHeader title="Belum Selesai" />
            <EmptyState
              title="Tidak ada pekerjaan tertunda"
              description="Daftar pekerjaan belum selesai akan muncul di sini."
            />
          </Card>
        </>
      )}
    </div>
  );
}
