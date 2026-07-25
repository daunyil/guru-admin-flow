/**
 * TodayPageNotices — three conditional notice cards:
 *   1. Profile incomplete
 *   2. No active academic year (with seed data / wizard)
 *   3. No assignments yet
 */

import { Link } from "react-router-dom";
import { Card, Button } from "@shared/ui";
import type { AcademicYear, SchoolProfile, TeacherProfile, TeachingAssignment } from "@guru-admin/domain";

type TodayPageNoticesProps = {
  school: SchoolProfile | undefined;
  teacher: TeacherProfile | undefined;
  activeYear: AcademicYear | undefined;
  assignments: TeachingAssignment[];
  seeding: boolean;
  seedMsg: string | null;
  onSeedSampleData: () => void;
};

export function TodayPageNotices({
  school,
  teacher,
  activeYear,
  assignments,
  seeding,
  seedMsg,
  onSeedSampleData,
}: TodayPageNoticesProps) {
  return (
    <>
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
                  onClick={onSeedSampleData}
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
    </>
  );
}
