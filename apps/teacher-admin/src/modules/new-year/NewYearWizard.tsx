/**
 * Wizard "Buat Tahun Pelajaran Baru dari Tahun Lalu".
 * Sumber: docs/DATA_MODEL_DRAFT.md §13, docs/PROJECT_CONTRACT.md §7.5
 */

import { useEffect, useState } from "react";
import { Card, CardHeader, Input, Button, EmptyState, Badge } from "../../shared/ui";
import { AlertTriangle, Check } from "../../shared/layout/icons";
import {
  listAcademicYears,
  getSchoolProfile,
  getTeacherProfile,
  createNewYearFromPrevious,
} from "../../shared/db/profile-repo";
import type { AcademicYear, SchoolProfile, TeacherProfile } from "@guru-admin/domain";
import { formatLongDateID } from "@guru-admin/shared";

export function NewYearWizard() {
  const [loading, setLoading] = useState(true);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [school, setSchool] = useState<SchoolProfile | null>(null);
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [sourceYearId, setSourceYearId] = useState<string>("");
  const [newLabel, setNewLabel] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [s1Start, setS1Start] = useState("");
  const [s1End, setS1End] = useState("");
  const [s2Start, setS2Start] = useState("");
  const [s2End, setS2End] = useState("");

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ year: string; protaCount: number; scheduleCount: number } | null>(null);

  useEffect(() => {
    void (async () => {
      const [ys, sp, tp] = await Promise.all([
        listAcademicYears(),
        getSchoolProfile(),
        getTeacherProfile(),
      ]);
      setYears(ys.sort((a, b) => b.label.localeCompare(a.label)));
      setSchool(sp ?? null);
      setTeacher(tp ?? null);
      setLoading(false);
    })();
  }, []);

  function handleSelectSource(id: string) {
    setSourceYearId(id);
    const src = years.find((y) => y.id === id);
    if (src) {
      // Auto-suggest: label naik 1 tahun
      const [y1, y2] = src.label.split("/").map(Number);
      if (y1 && y2) {
        setNewLabel(`${y1 + 1}/${y2 + 1}`);
      }
    }
    setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    setResult(null);
    try {
      if (!sourceYearId) throw new Error("Pilih tahun sumber dulu.");
      const r = await createNewYearFromPrevious({
        sourceYearId,
        newLabel,
        newStartDate: startDate,
        newEndDate: endDate,
        newSemester1Start: s1Start,
        newSemester1End: s1End,
        newSemester2Start: s2Start,
        newSemester2End: s2End,
      });
      setResult({
        year: r.newYear.label,
        protaCount: r.newProtaProfiles.length,
        scheduleCount: r.newTeachingSchedules.length,
      });
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat tahun baru.");
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;

  // Precondition check
  if (!school || !teacher) {
    return (
      <div className="space-y-4">
        <Header />
        <Card>
          <EmptyState
            title="Profil sekolah & guru wajib diisi dulu"
            description="Sebelum membuat tahun pelajaran baru, lengkapi profil sekolah dan profil guru di menu Profil."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Header />

      {/* Stepper */}
      <div className="flex items-center gap-2 text-sm">
        <StepBadge n={1} active={step >= 1} done={step > 1} label="Pilih sumber" />
        <Separator />
        <StepBadge n={2} active={step >= 2} done={step > 2} label="Isi tanggal" />
        <Separator />
        <StepBadge n={3} active={step >= 3} done={false} label="Selesai" />
      </div>

      {error && (
        <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-700">
          {error}
        </div>
      )}

      {step === 1 && (
        <Card>
          <CardHeader
            title="Pilih Tahun Pelajaran Sumber"
            description="Profil, Prota, dan template akan disalin dari tahun ini. Realisasi (absensi, jurnal, laporan) tidak disalin."
          />
          {years.length === 0 ? (
            <EmptyState
              title="Belum ada tahun pelajaran sumber"
              description="Buat tahun pelajaran pertama secara manual di menu Profil sebelum bisa menggunakan wizard ini."
            />
          ) : (
            <div className="space-y-2">
              {years.map((y) => (
                <button
                  key={y.id}
                  onClick={() => handleSelectSource(y.id)}
                  className="w-full text-left p-3 border border-slate-200 rounded-md hover:border-brand-400 hover:bg-brand-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-900">{y.label}</span>
                      {y.active && <Badge variant="success">Aktif</Badge>}
                    </div>
                    <p className="text-xs text-slate-500">
                      {formatLongDateID(y.startDate)} — {formatLongDateID(y.endDate)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader
            title="Isi Tanggal Tahun Pelajaran Baru"
            description="Salinan profil & Prota dari tahun sumber akan dipasangkan ke tahun baru ini."
          />

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Label Tahun Pelajaran Baru"
              id="nyLabel"
              required
              value={newLabel}
              onChange={setNewLabel}
              placeholder="2026/2027"
              hint="Format: YYYY/YYYY"
            />

            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Mulai Tahun" id="nyStart" type="date" required value={startDate} onChange={setStartDate} />
              <Input label="Selesai Tahun" id="nyEnd" type="date" required value={endDate} onChange={setEndDate} />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Semester 1 Mulai" id="nyS1s" type="date" required value={s1Start} onChange={setS1Start} />
                <Input label="Semester 1 Selesai" id="nyS1e" type="date" required value={s1End} onChange={setS1End} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Semester 2 Mulai" id="nyS2s" type="date" required value={s2Start} onChange={setS2Start} />
                <Input label="Semester 2 Selesai" id="nyS2e" type="date" required value={s2End} onChange={setS2End} />
              </div>
            </div>

            <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800">
              <p className="font-semibold mb-1">Yang akan disalin:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Profil sekolah &amp; profil guru (single-row, id konstan)</li>
                <li>ProtaProfile + ProtaUnit (id baru, status draft)</li>
                <li>TeachingSchedule (id baru, source: manual — perlu dikonfirmasi ulang)</li>
              </ul>
              <p className="font-semibold mt-2 mb-1">Yang dikosongkan (tidak disalin):</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>CalendarEvent — wajib impor ulang dari JSON kalender baru</li>
                <li>LessonSession, AttendanceRecord, ClassRoster — realisasi</li>
                <li>TeachingJournal — realisasi</li>
                <li>SemesterReport — realisasi</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={creating}>
                {creating ? "Membuat..." : "Buat Tahun Baru"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setStep(1)} disabled={creating}>
                Kembali
              </Button>
            </div>
          </form>
        </Card>
      )}

      {step === 3 && result && (
        <Card>
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto rounded-full bg-brand-100 flex items-center justify-center text-brand-700 mb-3">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">
              Tahun pelajaran {result.year} berhasil dibuat &amp; diaktifkan
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {result.protaCount} Prota dan {result.scheduleCount} jadwal disalin dari tahun lama.
              Tahun lama sudah di-nonaktifkan.
            </p>
            <div className="mt-4 p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800 text-left">
              <p className="font-semibold flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-4 h-4" /> Tindakan berikutnya yang wajib:
              </p>
              <ol className="list-decimal pl-5 space-y-0.5">
                <li>Impor kalender pendidikan JSON untuk tahun baru ini (Sprint 2).</li>
                <li>Konfirmasi ulang jadwal mengajar (sumber: manual, perlu verifikasi).</li>
                <li>Cek Prota — status masih draft, perlu disesuaikan bila ada revisi kurikulum.</li>
                <li>Generate Promes dari Prota + Kalender + Jadwal (Sprint 2).</li>
              </ol>
            </div>
            <Button
              variant="secondary"
              className="mt-4"
              onClick={() => {
                setStep(1);
                setResult(null);
                setSourceYearId("");
                setNewLabel("");
                setStartDate("");
                setEndDate("");
                setS1Start("");
                setS1End("");
                setS2Start("");
                setS2End("");
              }}
            >
              Buat tahun baru lagi
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Buat Tahun Pelajaran Baru</h1>
      <p className="text-sm text-slate-500 mt-1">
        Salin profil, Prota, dan jadwal dari tahun sebelumnya. Kosongkan realisasi (absensi, jurnal, laporan).
      </p>
    </div>
  );
}

function StepBadge({ n, active, done, label }: { n: number; active: boolean; done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
          done
            ? "bg-brand-600 text-white"
            : active
            ? "bg-brand-100 text-brand-700 border-2 border-brand-600"
            : "bg-slate-100 text-slate-400"
        }`}
      >
        {done ? <Check className="w-3.5 h-3.5" /> : n}
      </div>
      <span className={active ? "text-slate-900 font-medium" : "text-slate-400"}>{label}</span>
    </div>
  );
}

function Separator() {
  return <div className="flex-1 h-px bg-slate-200" />;
}
