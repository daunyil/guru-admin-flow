/**
 * Halaman Kelengkapan — cek semua modul sebelum finalisasi laporan.
 * Sumber: docs/PROJECT_CONTRACT.md §8.4
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, Button, Badge } from "../../shared/ui";
import { getActiveAcademicYear, getSchoolProfile, getTeacherProfile } from "../../shared/db/profile-repo";
import { listCalendarEvents } from "../../shared/db/calendar-repo";
import { listProtaProfiles } from "../../shared/db/prota-repo";
import { listTeachingSchedules } from "../../shared/db/teaching-schedule-repo";
import { listLessonSessions } from "../../shared/db/lesson-session-repo";
import { listJournals } from "../../shared/db/journal-repo";
import { listClassRosters } from "../../shared/db/class-roster-repo";

type CheckItem = {
  label: string;
  status: "ok" | "warning" | "missing";
  detail: string;
  link?: string;
};

export function CompletenessPage() {
  const [loading, setLoading] = useState(true);
  const [checks, setChecks] = useState<CheckItem[]>([]);

  useEffect(() => {
    void (async () => {
      const year = await getActiveAcademicYear();
      const school = await getSchoolProfile();
      const teacher = await getTeacherProfile();

      const items: CheckItem[] = [];

      // Profil
      items.push({
        label: "Profil Sekolah",
        status: school ? "ok" : "missing",
        detail: school ? `${school.name} · NPSN ${school.npsn}` : "Belum diisi",
        link: "/profile",
      });
      items.push({
        label: "Profil Guru",
        status: teacher ? "ok" : "missing",
        detail: teacher ? `${teacher.name} · ${teacher.subjects.length} mapel` : "Belum diisi",
        link: "/profile",
      });
      items.push({
        label: "Tahun Pelajaran Aktif",
        status: year ? "ok" : "missing",
        detail: year ? `${year.label} (${year.startDate} — ${year.endDate})` : "Belum ada tahun aktif",
        link: "/profile",
      });

      if (year) {
        // Kalender
        const calendar = await listCalendarEvents(year.id);
        const learningEvents = calendar.filter((e) => e.type === "learning");
        items.push({
          label: "Kalender Pendidikan",
          status: calendar.length === 0 ? "missing" : learningEvents.length === 0 ? "warning" : "ok",
          detail: `${calendar.length} event (${learningEvents.length} KBM, ${calendar.length - learningEvents.length} lainnya)`,
          link: "/calendar",
        });

        // Prota
        const protas = await listProtaProfiles(year.id);
        items.push({
          label: "Prota (Program Tahunan)",
          status: protas.length === 0 ? "missing" : "ok",
          detail: `${protas.length} Prota: ${protas.map((p) => `${p.subject}-${p.grade}`).join(", ") || "kosong"}`,
          link: "/prota",
        });

        // Jadwal
        const schedules = await listTeachingSchedules(year.id);
        items.push({
          label: "Jadwal Guru",
          status: schedules.length === 0 ? "missing" : "ok",
          detail: `${schedules.length} jadwal`,
          link: "/schedule",
        });

        // Sesi
        const sessions = await listLessonSessions(year.id);
        items.push({
          label: "Sesi Mengajar (LessonSession)",
          status: sessions.length === 0 ? "missing" : "ok",
          detail: `${sessions.length} sesi di-generate`,
          link: "/schedule",
        });

        // Roster
        const rosters = await listClassRosters(year.id);
        const totalStudents = rosters.reduce((sum, r) => sum + r.students.length, 0);
        items.push({
          label: "Daftar Siswa (Roster)",
          status: rosters.length === 0 ? "missing" : totalStudents === 0 ? "warning" : "ok",
          detail: `${rosters.length} kelas, ${totalStudents} siswa total`,
          link: "/roster",
        });

        // Jurnal
        const journals = await listJournals(year.id);
        const finalizedJournals = journals.filter((j) => j.status === "final" || j.locked).length;
        const pendingJournals = journals.length - finalizedJournals;
        items.push({
          label: "Jurnal Mengajar",
          status: journals.length === 0 ? "missing" : pendingJournals > 0 ? "warning" : "ok",
          detail: `${journals.length} jurnal (${finalizedJournals} final, ${pendingJournals} pending)`,
          link: "/journal",
        });
      }

      setChecks(items);
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="text-sm text-slate-500">Memuat kelengkapan...</p>;

  const okCount = checks.filter((c) => c.status === "ok").length;
  const warningCount = checks.filter((c) => c.status === "warning").length;
  const missingCount = checks.filter((c) => c.status === "missing").length;
  const totalScore = checks.length > 0 ? Math.round((okCount / checks.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Halaman Kelengkapan</h1>
        <p className="text-sm text-slate-500 mt-1">
          Cek semua modul sebelum finalisasi laporan akhir semester.
        </p>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Completeness Score</p>
            <p className="text-3xl font-bold text-slate-900">{totalScore}%</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="success">{okCount} OK</Badge>
            {warningCount > 0 && <Badge variant="warning">{warningCount} Warning</Badge>}
            {missingCount > 0 && <Badge variant="error">{missingCount} Missing</Badge>}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Checklist Kelengkapan" />
        <div className="space-y-2">
          {checks.map((item, i) => (
            <div
              key={i}
              className={`p-3 border rounded-md ${
                item.status === "ok"
                  ? "border-brand-200 bg-brand-50/50"
                  : item.status === "warning"
                  ? "border-amber-200 bg-amber-50/50"
                  : "border-rose-200 bg-rose-50/50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{item.label}</span>
                    <Badge variant={item.status === "ok" ? "success" : item.status === "warning" ? "warning" : "error"}>
                      {item.status === "ok" ? "✓ OK" : item.status === "warning" ? "⚠ Warning" : "✗ Missing"}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{item.detail}</p>
                </div>
                {item.link && (
                  <Link to={item.link}>
                    <Button variant="secondary" className="text-xs px-2 py-1">Buka</Button>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Status Finalisasi"
          description={missingCount === 0 && warningCount === 0 ? "Semua lengkap, siap finalisasi laporan." : "Selesaikan item missing/warning dulu."}
        />
        {missingCount === 0 && warningCount === 0 ? (
          <Link to="/semester-report">
            <Button>Buka Laporan Akhir Semester</Button>
          </Link>
        ) : (
          <p className="text-sm text-amber-600">
            Masih ada {missingCount} missing + {warningCount} warning. Selesaikan dulu sebelum finalisasi.
          </p>
        )}
      </Card>
    </div>
  );
}
