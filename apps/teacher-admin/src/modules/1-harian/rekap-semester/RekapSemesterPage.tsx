/**
 * Rekap Semester — Placeholder untuk Sprint 4.
 *
 * Fitur yang akan dibangun:
 * 1. Matriks Absensi Bulanan (landscape, 31 kolom tanggal, rekap ALPA/SAKIT/IZIN/JLH)
 *    Format referensi: SMPN 8 Bantan — ABSENSI KEHADIRAN SISWA
 * 2. Rekap Nilai Semester (landscape, PA header multi-level, Ulangan/Tugas per KD + PTS + PAS)
 *    Format referensi: SMPN 8 Bantan — PENILAIAN PENGETAHUAN SISWA
 *
 * DOMAIN-BOUNDARY: Modul 1-harian, import dari @shared/ saja.
 */

import { Card, CardHeader } from "@shared/ui";

export function RekapSemesterPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Rekap Semester</h1>
        <span className="px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 text-xs font-medium">
          Sprint 4
        </span>
      </div>

      <p className="text-slate-500 text-sm max-w-xl">
        Matriks rekap bulanan absensi dan rekap nilai per semester.
        Format cetak landscape sesuai format sekolah (kop surat, NISN, rekap kolom).
      </p>

      {/* Placeholder cards — Sprint 4 akan implementasi */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-brand-200 bg-brand-50/30">
          <CardHeader
            title="Rekap Absensi"
            description="Matriks 31 kolom tanggal per bulan · Rekap ALPA/SAKIT/IZIN/JLH · Landscape cetak"
          />
          <div className="flex items-center justify-center py-12 text-brand-400">
            <div className="text-center">
              <p className="text-sm font-medium">Belum tersedia</p>
              <p className="text-xs mt-1">Akan dibangun di Sprint 4</p>
            </div>
          </div>
        </Card>

        <Card className="border-slate-200 bg-slate-50/30">
          <CardHeader
            title="Rekap Nilai"
            description="PA (Ulangan + Tugas per KD) · PTS · PAS · Landscape cetak · Kop surat"
          />
          <div className="flex items-center justify-center py-12 text-slate-400">
            <div className="text-center">
              <p className="text-sm font-medium">Belum tersedia</p>
              <p className="text-xs mt-1">Akan dibangun di Sprint 4</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
