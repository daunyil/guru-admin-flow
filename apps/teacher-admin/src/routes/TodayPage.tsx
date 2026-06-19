/**
 * Dashboard Hari Ini — halaman utama.
 * Sumber: docs/PROJECT_CONTRACT.md §8.1
 *
 * Sprint 1: placeholder. Tanpa jadwal/sesi (itu Sprint 3+).
 * Yang ditampilkan: status tahun pelajaran aktif + ringkasan profil.
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
import type { AcademicYear, SchoolProfile, TeacherProfile } from "@guru-admin/domain";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";

export function TodayPage() {
  const [loading, setLoading] = useState(true);
  const [activeYear, setActiveYear] = useState<AcademicYear | undefined>();
  const [school, setSchool] = useState<SchoolProfile | undefined>();
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();

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
                Data ini dipakai di semua dokumen.
              </p>
              <Link to="/profile" className="inline-block mt-2">
                <Button variant="secondary" className="text-sm">
                  Lengkapi Profil
                </Button>
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

          <Card>
            <CardHeader title="Sesi Mengajar Hari Ini" />
            <EmptyState
              title="Belum ada jadwal mengajar"
              description="Fitur input jadwal guru akan dibangun di Sprint 3. Saat ini, dashboard hanya menampilkan status tahun pelajaran aktif."
            />
          </Card>

          <Card>
            <CardHeader title="Belum Selesai" />
            <EmptyState
              title="Tidak ada pekerjaan tertunda"
              description="Daftar pekerjaan belum selesai (jurnal kosong, absensi belum sinkron, Promes perlu perbaikan) akan muncul di sini mulai Sprint 2+."
            />
          </Card>
        </>
      )}

      <Card>
        <CardHeader title="Status Sprint" description="Sprint 1 — Fondasi Aplikasi Lokal" />
        <ul className="text-sm space-y-2">
          <StatusItem done label="Profil sekolah, guru, tahun pelajaran tersimpan di IndexedDB" />
          <StatusItem done label="Backup/restore JSON dengan validasi schemaVersion" />
          <StatusItem done label="Wizard tahun baru (salin profil+Prota, kosongkan realisasi)" />
          <StatusItem done label="Schema domain Zod untuk 11 entitas inti" />
          <StatusItem done label="Unit test dasar untuk domain + shared" />
          <StatusItem label="Kalender pendidikan (Sprint 2)" />
          <StatusItem label="Prota editor lengkap (Sprint 2)" />
          <StatusItem label="Promes generator (Sprint 2)" />
          <StatusItem label="Jadwal guru + sesi mengajar (Sprint 3)" />
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
