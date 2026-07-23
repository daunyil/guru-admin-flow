/**
 * PATCH-04: Home Pending Work — meja kerja harian guru.
 * Sumber: docs/V0_6_2_PRODUCT_DECISIONS.md §2.4
 *
 * UX-LIST-REDESIGN:
 *   - Modul tidak lagi berserakan sebagai grid emoji, tapi daftar rapi
 *     dengan kategori, status (Belum diisi / Draft / Perlu Finalisasi / Lengkap),
 *     dan tombol Buka/Edit per baris.
 *   - Absensi & Jurnal menampilkan list sesi yang belum diisi langsung
 *     di halaman utama, bukan tersembunyi di sidebar.
 *
 * UX-FIX-ALWAYS-SHOW: Semua modul SELALU ditampilkan meski data belum ada.
 * Yang kosong diberi keterangan, bukan disembunyikan.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, Button, EmptyState, Badge } from "../shared/ui";
import {
  getActiveAcademicYear,
  getSchoolProfile,
  getTeacherProfile,
} from "../shared/db/profile-repo";
import { getLessonSessionsByDate, listLessonSessions } from "../shared/db/lesson-session-repo";
import { listJournals } from "../shared/db/journal-repo";
import { getAttendanceByTeacherDate, countSessionsWithAttendance } from "../shared/db/attendance-repo";
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

/* ================================================================== */
/*  Module Registry — satu sumber kebenaran untuk daftar modul          */
/* ================================================================== */

type ModuleStatus = "lengkap" | "draft" | "perlu_finalisasi" | "belum_diisi";

type ModuleEntry = {
  id: string;
  label: string;
  to: string;
  category: string;
  status: ModuleStatus;
  statusLabel: string;
};

/* ================================================================== */
/*  Pending Item                                                       */
/* ================================================================== */

type PendingItem = {
  id: string;
  label: string;
  link: string;
  urgency: "high" | "medium" | "low";
};

/* ================================================================== */
/*  TodayPage                                                          */
/* ================================================================== */

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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Untuk menghitung status absensi & jurnal per assignment
  const [attSessionCounts, setAttSessionCounts] = useState<Record<string, { done: number; total: number }>>({});
  const [jrnSessionCounts, setJrnSessionCounts] = useState<Record<string, { done: number; total: number; drafts: number }>>({});

  useEffect(() => {
    void (async () => {
      try {
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

            const sem: 1 | 2 =
              year.semester2Start <= today && today <= year.semester2End ? 2 : 1;
            const asgList = await listAssignmentsByTeacher(tp.id, year.id, sem);
            setAssignments(asgList);

            // Hitung status absensi & jurnal per assignment
            const allSessions = await listLessonSessions(year.id, sem);
            const attCounts: Record<string, { done: number; total: number }> = {};
            const jrnCounts: Record<string, { done: number; total: number; drafts: number }> = {};

            for (const asg of asgList) {
              const asgSessions = allSessions.filter(
                (s) => s.classId === asg.classId && s.subject === asg.subject && s.teacherId === asg.teacherId && !s.deletedAt
              );
              const asgSessionIds = asgSessions.map((s) => s.id);

              // Absensi: hitung sesi yang sudah ada attendance
              const doneCount = await countSessionsWithAttendance(asgSessionIds);
              attCounts[asg.id] = { done: doneCount, total: asgSessions.length };

              // Jurnal: cek journal records
              const asgJournals = allJournals.filter(
                (j) => j.classId === asg.classId && j.subject === asg.subject && j.teacherId === asg.teacherId
              );
              const doneJournals = asgJournals.filter((j) => j.locked);
              const draftJournals = asgJournals.filter((j) => !j.locked);
              jrnCounts[asg.id] = { done: doneJournals.length, total: asgSessions.length, drafts: draftJournals.length };
            }

            setAttSessionCounts(attCounts);
            setJrnSessionCounts(jrnCounts);
          }
        }
      } catch (err) {
        console.error("[TodayPage] Gagal memuat data:", err);
        setErrorMsg(err instanceof Error ? err.message : "Gagal memuat data. Coba muat ulang halaman.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;

  if (errorMsg) {
    return (
      <Card className="border-rose-200 bg-rose-50">
        <div className="flex items-start gap-3">
          <span className="text-rose-600 text-xl">⚠</span>
          <div>
            <p className="font-semibold text-rose-900">Gagal Memuat Data</p>
            <p className="text-sm text-rose-800 mt-1">{errorMsg}</p>
            <Button
              variant="secondary"
              className="text-sm mt-3"
              onClick={() => { setErrorMsg(null); setLoading(true); window.location.reload(); }}
            >
              Muat Ulang
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  const today = todayISODate();
  const todayLabel = formatLongDateID(today);

  // Calculate pending work
  const pendingItems: PendingItem[] = [];

  const todayAttendanceSessionIds = new Set(
    attendanceRecords.filter((r) => r.date === today).map((r) => r.sessionId)
  );

  const todayJournalSessionIds = new Set(
    journals.filter((j) => j.date === today).map((j) => j.sessionId)
  );

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

  const draftJournals = journals.filter((j) => j.status === "draft" && !j.locked);
  for (const j of draftJournals.slice(0, 5)) {
    pendingItems.push({
      id: `draft-${j.id}`,
      label: `Jurnal draft: ${j.classLabel} — ${j.date}`,
      link: `/journal`,
      urgency: "medium",
    });
  }

  // Build module list with statuses
  const moduleList: ModuleEntry[] = [
    // === TUGAS HARIAN ===
    ...assignments.map((a) => {
      const attInfo = attSessionCounts[a.id] ?? { done: 0, total: 0 };
      const jrnInfo = jrnSessionCounts[a.id] ?? { done: 0, total: 0, drafts: 0 };

      // Absensi status
      let attStatus: ModuleStatus = "belum_diisi";
      let attLabel = "Belum diisi";
      if (attInfo.total > 0 && attInfo.done >= attInfo.total) {
        attStatus = "lengkap";
        attLabel = `${attInfo.done}/${attInfo.total} Lengkap`;
      } else if (attInfo.done > 0) {
        attStatus = "draft";
        attLabel = `${attInfo.done}/${attInfo.total} Diisi`;
      } else if (attInfo.total > 0) {
        attLabel = `${attInfo.total} belum diisi`;
      }

      // Jurnal status
      let jrnStatus: ModuleStatus = "belum_diisi";
      let jrnLabel = "Belum diisi";
      if (jrnInfo.total > 0 && jrnInfo.done >= jrnInfo.total) {
        jrnStatus = "lengkap";
        jrnLabel = `${jrnInfo.done}/${jrnInfo.total} Lengkap`;
      } else if (jrnInfo.done > 0 || jrnInfo.drafts > 0) {
        if (jrnInfo.drafts > 0 && jrnInfo.done < jrnInfo.total) {
          jrnStatus = "perlu_finalisasi";
          jrnLabel = `${jrnInfo.drafts} draft, ${jrnInfo.done}/${jrnInfo.total} final`;
        } else {
          jrnStatus = "draft";
          jrnLabel = `${jrnInfo.done}/${jrnInfo.total} Final`;
        }
      } else if (jrnInfo.total > 0) {
        jrnLabel = `${jrnInfo.total} belum diisi`;
      }

      return [
        {
          id: `absen-${a.id}`,
          label: `Absen ${a.classLabel} · ${a.subject}`,
          to: `/attendance?mode=susulan`,
          category: "Tugas Harian",
          status: attStatus,
          statusLabel: attLabel,
        },
        {
          id: `jurnal-${a.id}`,
          label: `Jurnal ${a.classLabel} · ${a.subject}`,
          to: `/journal?mode=susulan`,
          category: "Tugas Harian",
          status: jrnStatus,
          statusLabel: jrnLabel,
        },
        {
          id: `nilai-${a.id}`,
          label: `Nilai ${a.classLabel} · ${a.subject}`,
          to: `/grades`,
          category: "Tugas Harian",
          status: "belum_diisi" as ModuleStatus,
          statusLabel: "Buka untuk cek",
        },
      ] as ModuleEntry[];
    }).flat(),

    // === DATA DASAR ===
    {
      id: "profile",
      label: "Profil Sekolah & Guru",
      to: "/profile",
      category: "Data Dasar",
      status: school && teacher ? "lengkap" : "belum_diisi",
      statusLabel: school && teacher ? "Lengkap" : "Belum diisi",
    },
    {
      id: "new-year",
      label: "Tahun Pelajaran",
      to: "/new-year",
      category: "Data Dasar",
      status: activeYear ? "lengkap" : "belum_diisi",
      statusLabel: activeYear ? "Lengkap" : "Belum diisi",
    },
    {
      id: "assignments",
      label: "Kelas dan Mapel",
      to: "/assignments",
      category: "Data Dasar",
      status: assignments.length > 0 ? "lengkap" : "belum_diisi",
      statusLabel: assignments.length > 0 ? `${assignments.length} kelas` : "Belum diisi",
    },
    {
      id: "roster",
      label: "Daftar Siswa",
      to: "/roster",
      category: "Data Dasar",
      status: "belum_diisi",
      statusLabel: "Buka untuk cek",
    },
    {
      id: "calendar",
      label: "Kalender Pendidikan",
      to: "/calendar",
      category: "Data Dasar",
      status: "belum_diisi",
      statusLabel: "Buka untuk cek",
    },
    {
      id: "schedule",
      label: "Jadwal Mengajar",
      to: "/schedule",
      category: "Data Dasar",
      status: "belum_diisi",
      statusLabel: "Buka untuk cek",
    },

    // === PERENCANAAN ===
    {
      id: "prota",
      label: "Program Tahunan (Prota)",
      to: "/prota",
      category: "Perencanaan",
      status: "belum_diisi",
      statusLabel: "Buka untuk cek",
    },
    {
      id: "promes",
      label: "Program Semester (Promes)",
      to: "/promes",
      category: "Perencanaan",
      status: "belum_diisi",
      statusLabel: "Buka untuk cek",
    },
    {
      id: "atp",
      label: "Bank TP / ATP",
      to: "/atp",
      category: "Perencanaan",
      status: "belum_diisi",
      statusLabel: "Buka untuk cek",
    },
    {
      id: "rpp",
      label: "RPP / Modul Ajar",
      to: "/rpp",
      category: "Perencanaan",
      status: "belum_diisi",
      statusLabel: "Buka untuk cek",
    },
    {
      id: "lkpd",
      label: "LKPD",
      to: "/lkpd",
      category: "Perencanaan",
      status: "belum_diisi",
      statusLabel: "Buka untuk cek",
    },

    // === PENILAIAN ===
    {
      id: "evaluation-docs",
      label: "Perangkat Penilaian",
      to: "/evaluation-docs",
      category: "Penilaian",
      status: "belum_diisi",
      statusLabel: "Buka untuk cek",
    },
    {
      id: "remedial",
      label: "Program Remedial",
      to: "/remedial",
      category: "Penilaian",
      status: "belum_diisi",
      statusLabel: "Buka untuk cek",
    },
    {
      id: "pengayaan",
      label: "Program Pengayaan",
      to: "/pengayaan",
      category: "Penilaian",
      status: "belum_diisi",
      statusLabel: "Buka untuk cek",
    },

    // === DOKUMEN & LAPORAN ===
    {
      id: "admin-package",
      label: "Paket Dokumen",
      to: "/admin-package",
      category: "Dokumen & Laporan",
      status: "belum_diisi",
      statusLabel: "Buka untuk cek",
    },
    {
      id: "auto-document",
      label: "Auto Document",
      to: "/auto-document",
      category: "Dokumen & Laporan",
      status: "belum_diisi",
      statusLabel: "Buka untuk cek",
    },
    {
      id: "report-center",
      label: "Pusat Laporan",
      to: "/report-center",
      category: "Dokumen & Laporan",
      status: "belum_diisi",
      statusLabel: "Buka untuk cek",
    },
    {
      id: "semester-report",
      label: "Laporan Semester",
      to: "/semester-report",
      category: "Dokumen & Laporan",
      status: "belum_diisi",
      statusLabel: "Buka untuk cek",
    },
    {
      id: "completeness",
      label: "Cek Kelengkapan",
      to: "/completeness",
      category: "Dokumen & Laporan",
      status: "belum_diisi",
      statusLabel: "Buka untuk cek",
    },
    {
      id: "rpp-bulk",
      label: "RPP Ganti Identitas",
      to: "/rpp-bulk",
      category: "Dokumen & Laporan",
      status: "belum_diisi",
      statusLabel: "Buka untuk cek",
    },

    // === UTILITAS ===
    {
      id: "backup",
      label: "Backup / Restore",
      to: "/backup",
      category: "Utilitas",
      status: "belum_diisi",
      statusLabel: "Buka untuk cek",
    },
  ];

  // Group modules by category
  const categories = Array.from(new Set(moduleList.map((m) => m.category)));
  const modulesByCategory = categories.map((cat) => ({
    category: cat,
    modules: moduleList.filter((m) => m.category === cat),
  }));

  return (
    <div className="space-y-4">
      {/* Header */}
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

      {/* Bila belum ada profil — notice */}
      {(!school || !teacher) && (
        <Card className="border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <span className="text-amber-600 text-xl">⚠</span>
            <div>
              <p className="font-semibold text-amber-900">Profil belum lengkap</p>
              <p className="text-sm text-amber-800 mt-1">Lengkapi profil sekolah dan guru agar data administrasi terisi otomatis.</p>
              <Link to="/profile"><Button variant="secondary" className="text-sm mt-2">Lengkapi Profil</Button></Link>
            </div>
          </div>
        </Card>
      )}

      {/* Bila belum ada tahun pelajaran — notice */}
      {!activeYear && (
        <Card className="border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <span className="text-amber-600 text-xl">⚠</span>
            <div className="flex-1">
              <p className="font-semibold text-amber-900">Belum ada tahun pelajaran aktif</p>
              <p className="text-sm text-amber-800 mt-1">
                Buat tahun pelajaran baru, gunakan wizard, atau pakai data contoh agar semua modul bisa dipakai.
              </p>
              <div className="flex gap-2 mt-3 flex-wrap">
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
              {seedMsg && (
                <div className={`mt-3 p-3 rounded-md text-sm ${seedMsg.includes("berhasil") ? "info-banner-success" : "info-banner-error"}`}>
                  {seedMsg}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Bila belum ada Kelas dan Mapel */}
      {activeYear && assignments.length === 0 && (
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

      {/* ====== SELALU TAMPIL: Sesi Mengajar Hari Ini ====== */}
      <Card>
        <CardHeader
          title="Sesi Mengajar Hari Ini"
          description={activeYear && todaySessions.length > 0 ? `${todaySessions.length} sesi` : activeYear ? "Tidak ada sesi" : "Butuh tahun pelajaran & jadwal"}
        />
        {!activeYear ? (
          <EmptyState
            title="Belum ada sesi mengajar"
            description="Buat tahun pelajaran dan jadwal mengajar terlebih dahulu, maka sesi akan otomatis muncul di sini."
            action={
              <div className="flex gap-2">
                <Link to="/new-year"><Button variant="secondary">Buat Tahun Pelajaran</Button></Link>
                <Link to="/attendance?mode=susulan"><Button variant="secondary">Absen Susulan</Button></Link>
                <Link to="/journal?mode=manual"><Button variant="secondary">Jurnal Manual</Button></Link>
              </div>
            }
          />
        ) : todaySessions.length === 0 ? (
          <EmptyState
            title="Tidak ada jadwal mengajar hari ini"
            description="Tidak masalah. Anda bisa absen susulan atau buat jurnal manual kapan saja."
            action={
              <div className="flex gap-2">
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

      {/* ====== SELALU TAMPIL: Pekerjaan Tertunda ====== */}
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

      {/* ====== SELALU TAMPIL: Daftar Modul Rapi ====== */}
      {modulesByCategory.map(({ category, modules }) => (
        <Card key={category}>
          <CardHeader
            title={category}
            description={`${modules.length} modul`}
          />
          <div className="divide-y divide-slate-100">
            {modules.map((m) => (
              <ModuleRow key={m.id} entry={m} />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ================================================================== */
/*  ModuleRow — satu baris modul dengan status + tombol Buka           */
/* ================================================================== */

function ModuleRow({ entry }: { entry: ModuleEntry }) {
  const statusConfig: Record<ModuleStatus, { bg: string; text: string; icon: string }> = {
    lengkap: { bg: "bg-emerald-100", text: "text-emerald-800", icon: "✓" },
    draft: { bg: "bg-blue-100", text: "text-blue-800", icon: "◐" },
    perlu_finalisasi: { bg: "bg-amber-100", text: "text-amber-800", icon: "⚠" },
    belum_diisi: { bg: "bg-slate-100", text: "text-slate-600", icon: "○" },
  };
  const cfg = statusConfig[entry.status];

  return (
    <div className="flex items-center gap-3 py-2.5 px-1 group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-900 truncate">{entry.label}</span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
            <span className="text-[10px]">{cfg.icon}</span>
            {entry.statusLabel}
          </span>
        </div>
      </div>
      <Link
        to={entry.to}
        className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-md border border-brand-200 text-brand-700 bg-brand-50 hover:bg-brand-100 transition-colors"
      >
        {entry.status === "belum_diisi" ? "Isi" : entry.status === "perlu_finalisasi" ? "Finalisasi" : "Buka"}
      </Link>
    </div>
  );
}
