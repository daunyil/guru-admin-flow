/**
 * PATCH-04: Home Pending Work — meja kerja harian guru.
 * Sumber: docs/V0_6_2_PRODUCT_DECISIONS.md §2.4
 *
 * Tombol utama: Absen, Jurnal, Nilai, Dokumen, Backup
 * Pekerjaan tertunda: absen belum dibuat, jurnal belum dibuat, dll
 *
 * PATCH-FLOW-RC1:
 *   - Cek attendanceRecords dan teachingJournals secara terpisah.
 *   - Status "Belum absen" tidak lagi memakai jurnal sebagai indikator.
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
import { listJournals } from "../shared/db/journal-repo";
import { getAttendanceByTeacherDate } from "../shared/db/attendance-repo";
import { listAssignmentsByTeacher } from "../shared/db/teaching-assignment-repo";
import { seedSampleData } from "../shared/db/seed-sample-data";
import type {
  AcademicYear,
  SchoolProfile,
  TeacherProfile,
  LessonSession,
  TeachingJournal,
  AttendanceRecord,
  TeachingAssignment,
} from "@guru-admin/domain";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";

type PendingItem = {
  id: string;
  label: string;
  link: string;
  urgency: "high" | "medium" | "low";
};

export function TodayPage() {
  const [loading, setLoading] = useState(true);
  const [activeYear, setActiveYear] = useState<AcademicYear | undefined>();
  const [school, setSchool] = useState<SchoolProfile | undefined>();
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [todaySessions, setTodaySessions] = useState<LessonSession[]>([]);
  const [journals, setJournals] = useState<TeachingJournal[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [assignments, setAssignments] = useState<TeachingAssignment[]>([]);
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
        const [sessions, todayAtt] = await Promise.all([
          getLessonSessionsByDate(tp.id, today),
          getAttendanceByTeacherDate(tp.id, today),
        ]);
        setTodaySessions(sessions);
        setAttendanceRecords(todayAtt);

        if (year) {
          const allJournals = await listJournals(year.id);
          setJournals(allJournals);

          // PATCH-FLOW-RC2C: load assignments for context
          const today = new Date();
          const todayISO = today.toISOString().slice(0, 10);
          const sem: 1 | 2 =
            year.semester2Start <= todayISO && todayISO <= year.semester2End ? 2 : 1;
          setAssignments(await listAssignmentsByTeacher(tp.id, year.id, sem));
        }
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;

  const today = todayISODate();
  const todayLabel = formatLongDateID(today);

  // Calculate pending work
  const pendingItems: PendingItem[] = [];

  // Set sessionId yang sudah ada absensi hari ini
  const todayAttendanceSessionIds = new Set(
    attendanceRecords
      .filter((r) => r.date === today)
      .map((r) => r.sessionId)
  );

  // Set sessionId yang sudah ada jurnal hari ini
  const todayJournalSessionIds = new Set(
    journals.filter((j) => j.date === today).map((j) => j.sessionId)
  );

  // Cek sesi hari ini yang belum ada absensi atau belum ada jurnal
  const plannedSessions = todaySessions.filter((s) => s.status === "planned");
  for (const s of plannedSessions) {
    const hasAttendance = todayAttendanceSessionIds.has(s.id);
    const hasJournal = todayJournalSessionIds.has(s.id);
    if (!hasAttendance) {
      pendingItems.push({
        id: `absen-${s.id}`,
        label: `Absen ${s.classLabel} — ${s.subject} (${s.startTime})`,
        link: `/attendance?sessionId=${s.id}`,
        urgency: "high",
      });
    }
    if (!hasJournal) {
      pendingItems.push({
        id: `jurnal-${s.id}`,
        label: `Jurnal ${s.classLabel} — ${s.subject} (${s.startTime})`,
        link: `/journal?sessionId=${s.id}`,
        urgency: "high",
      });
    }
  }

  // Cek jurnal draft (belum final)
  const draftJournals = journals.filter((j) => j.status === "draft" && !j.locked);
  for (const j of draftJournals.slice(0, 5)) {
    pendingItems.push({
      id: `draft-${j.id}`,
      label: `Jurnal draft: ${j.classLabel} — ${j.date}`,
      link: `/journal`,
      urgency: "medium",
    });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
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
              <p className="text-sm text-amber-800 mt-1">Lengkapi profil sekolah dan guru di menu Profil.</p>
              <Link to="/profile"><Button variant="secondary" className="text-sm mt-2">Lengkapi Profil</Button></Link>
            </div>
          </div>
        </Card>
      )}

      {/* Bila belum ada tahun pelajaran */}
      {!activeYear ? (
        <Card>
          <EmptyState
            title="Belum ada tahun pelajaran aktif"
            description="Buat tahun pelajaran, gunakan wizard Tahun Baru, atau pakai data contoh."
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
                    if (result.success) setTimeout(() => window.location.reload(), 2000);
                  }}
                >
                  {seeding ? "Memuat..." : "Pakai Data Contoh"}
                </Button>
                <Link to="/new-year"><Button>Wizard Tahun Baru</Button></Link>
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
          {/* PATCH-FLOW-RC2C: warning bila belum ada Kelas dan Mapel */}
          {assignments.length === 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <div className="flex items-start gap-3">
                <span className="text-amber-600 text-xl">⚠</span>
                <div className="flex-1">
                  <p className="font-semibold text-amber-900">Belum ada Kelas dan Mapel</p>
                  <p className="text-sm text-amber-800 mt-1">
                    Buat Kelas dan Mapel dulu sebelum absen/jurnal/nilai. Assignment mengikat
                    guru+mapel+kelas+semester+tahun pelajaran supaya data tidak bercampur.
                  </p>
                  <Link to="/assignments">
                    <Button variant="secondary" className="text-sm mt-2">Buat Kelas dan Mapel</Button>
                  </Link>
                </div>
              </div>
            </Card>
          )}

          {/* Tombol utama — quick access grid */}
          <Card>
            <CardHeader title="Mulai Cepat" description="Akses cepat ke modul utama." />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <QuickLink to="/attendance" label="Absen" emoji="✅" />
              <QuickLink to="/journal" label="Jurnal" emoji="📖" />
              <QuickLink to="/grades" label="Nilai" emoji="📊" />
              <QuickLink to="/admin-package" label="Paket Dokumen" emoji="📁" />
              <QuickLink to="/auto-document" label="Auto Document" emoji="⚡" />
              <QuickLink to="/evaluation-docs" label="Perangkat Evaluasi" emoji="📝" />
              <QuickLink to="/rpp-bulk" label="RPP Ganti Identitas" emoji="🔄" />
              <QuickLink to="/backup" label="Backup" emoji="💾" />
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
                description="Tidak masalah. Anda bisa absen susulan atau buat jurnal manual."
                action={
                  <div className="flex gap-2">
                    {/* UX-STABILITY: Absen tidak punya mode manual lagi, ganti ke susulan */}
                    <Link to="/attendance?mode=susulan"><Button variant="secondary">Absen Susulan</Button></Link>
                    <Link to="/journal?mode=manual"><Button variant="secondary">Jurnal Manual</Button></Link>
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
                  );
                })}
              </div>
            )}
          </Card>

          {/* Pekerjaan Tertunda */}
          {pendingItems.length > 0 && (
            <Card>
              <CardHeader title="Belum Selesai" description={`${pendingItems.length} pekerjaan tertunda`} />
              <div className="space-y-2">
                {pendingItems.map((item) => (
                  <Link
                    key={item.id}
                    to={item.link}
                    className="flex items-center justify-between p-2 border border-slate-200 rounded-md hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${item.urgency === "high" ? "bg-rose-500" : "bg-amber-500"}`} />
                      <span className="text-sm">{item.label}</span>
                    </div>
                    <span className="text-xs text-slate-400">→</span>
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {/* Absen Manual + Jurnal Manual (selalu tampil) */}
          <Card>
            <CardHeader title="Tanpa Jadwal" description="Absen atau jurnal manual kapan saja." />
            <div className="flex gap-2">
              <Link to="/attendance?mode=susulan"><Button variant="secondary">Absen Susulan</Button></Link>
              <Link to="/journal?mode=manual"><Button variant="secondary">Jurnal Manual</Button></Link>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

/** Quick access card untuk dashboard. */
function QuickLink({ to, label, emoji }: { to: string; label: string; emoji: string }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-1 p-4 rounded-xl border border-slate-200 hover:border-brand-300 hover:bg-brand-50/50 transition-colors"
    >
      <span className="text-2xl">{emoji}</span>
      <span className="text-sm font-medium text-slate-700 text-center leading-tight">{label}</span>
    </Link>
  );
}
