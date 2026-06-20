/**
 * Modul M08 Laporan Akhir Semester — halaman /semester-report
 * Sumber: docs/PROJECT_CONTRACT.md §4.1 (M08)
 *
 * Dua mode:
 *   - Mode Kerja: pilih mapel/semester, generate, lihat summary, finalize
 *   - Mode Dokumen: format Word/Excel-like, print CSS, tanda tangan
 */

import { useEffect, useState } from "react";
import { Card, CardHeader, Select, Button, EmptyState, Badge } from "../../shared/ui";
import {
  generateAndSaveSemesterReport,
  finalizeSemesterReport,
} from "../../shared/db/semester-report-repo";
import { listProtaProfiles } from "../../shared/db/prota-repo";
import { getActiveAcademicYear, getTeacherProfile, getSchoolProfile } from "../../shared/db/profile-repo";
import type {
  ProtaProfile,
  AcademicYear,
  SchoolProfile,
  TeacherProfile,
  SemesterReport,
} from "@guru-admin/domain";
import { canFinalizeSemesterReport, type GenerateSemesterReportResult } from "@guru-admin/domain";
import { formatLongDateID } from "@guru-admin/shared";

export function SemesterReportPage() {
  const [loading, setLoading] = useState(true);
  const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
  const [school, setSchool] = useState<SchoolProfile | undefined>();
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [profiles, setProfiles] = useState<ProtaProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [semester, setSemester] = useState<1 | 2>(1);
  const [report, setReport] = useState<SemesterReport | null>(null);
  const [genResult, setGenResult] = useState<GenerateSemesterReportResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [showDocument, setShowDocument] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [year, sp, tp] = await Promise.all([
        getActiveAcademicYear(),
        getSchoolProfile(),
        getTeacherProfile(),
      ]);
      setActiveYear(year ?? null);
      setSchool(sp);
      setTeacher(tp);
      if (year) {
        const ps = await listProtaProfiles(year.id);
        setProfiles(ps);
        if (ps.length > 0) setSelectedProfileId(ps[0].id);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (error) setTimeout(() => setError(null), 5000);
    if (success) setTimeout(() => setSuccess(null), 3000);
  }, [error, success]);

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;

  if (!activeYear || !teacher) {
    return (
      <div className="space-y-4">
        <Header />
        <Card><EmptyState title="Profil/tahun belum lengkap" description="Lengkapi profil guru + tahun pelajaran aktif dulu." /></Card>
      </div>
    );
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const profile = profiles.find((p) => p.id === selectedProfileId) ?? null;
      const result = await generateAndSaveSemesterReport({
        academicYear: activeYear!,
        protaProfile: profile,
        semester,
        teacherId: teacher!.id,
      });
      if (result.success && result.report && result.result) {
        setReport(result.report);
        setGenResult(result.result);
        setSuccess("Laporan di-generate.");
      } else {
        setError(result.errors.join("; ") || "Gagal generate laporan.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal generate.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleFinalize() {
    if (!report) return;
    setFinalizing(true);
    setError(null);
    try {
      const result = await finalizeSemesterReport(report.id);
      if (result.success && result.report) {
        setReport(result.report);
        setSuccess("Laporan difinalisasi (snapshot tersimpan).");
      } else {
        setError(result.errors.join("; "));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal finalize.");
    } finally {
      setFinalizing(false);
    }
  }

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId);
  const canFinalize = genResult ? canFinalizeSemesterReport(genResult).canFinalize : false;
  const finalizeReasons = genResult ? canFinalizeSemesterReport(genResult).reasons : [];

  return (
    <div className="space-y-4">
      <Header yearLabel={activeYear.label} />

      {error && <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-700">{error}</div>}
      {success && <div className="p-3 rounded-md bg-brand-50 border border-brand-200 text-sm text-brand-700">{success}</div>}

      <Card>
        <CardHeader title="Generate Laporan" description="Pilih Prota + semester, lalu generate dari data jurnal + absensi + sesi." />
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Select
              label="Prota (Mapel - Kelas)"
              id="sr-prota"
              value={selectedProfileId}
              onChange={setSelectedProfileId}
              options={profiles.map((p) => ({ value: p.id, label: `${p.subject} — ${p.grade}` }))}
            />
            <Select
              label="Semester"
              id="sr-sem"
              value={String(semester)}
              onChange={(v) => setSemester(Number(v) as 1 | 2)}
              options={[{value:"1",label:"Semester 1"},{value:"2",label:"Semester 2"}]}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleGenerate} disabled={generating || profiles.length === 0}>
              {generating ? "Generating..." : "Generate Laporan"}
            </Button>
            {report && (
              <Button variant="secondary" onClick={() => setShowDocument(!showDocument)}>
                {showDocument ? "Mode Kerja" : "Mode Dokumen"}
              </Button>
            )}
            {report && showDocument && (
              <Button variant="secondary" onClick={() => window.print()}>Cetak</Button>
            )}
          </div>
        </div>
      </Card>

      {report && genResult && !showDocument && (
        <ModeKerja
          report={report}
          result={genResult}
          canFinalize={canFinalize}
          finalizeReasons={finalizeReasons}
          onFinalize={handleFinalize}
          finalizing={finalizing}
        />
      )}

      {report && genResult && showDocument && (
        <ModeDokumen
          report={report}
          result={genResult}
          school={school}
          teacher={teacher}
          academicYear={activeYear}
          profile={selectedProfile}
        />
      )}
    </div>
  );
}

function Header({ yearLabel }: { yearLabel?: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Laporan Akhir Semester</h1>
      <p className="text-sm text-slate-500 mt-1">
        {yearLabel ? `Tahun pelajaran: ${yearLabel}` : "Rekap dari jurnal + absensi + sesi."}
      </p>
    </div>
  );
}

function ModeKerja({
  report,
  result,
  canFinalize,
  finalizeReasons,
  onFinalize,
  finalizing,
}: {
  report: SemesterReport;
  result: GenerateSemesterReportResult;
  canFinalize: boolean;
  finalizeReasons: string[];
  onFinalize: () => void;
  finalizing: boolean;
}) {
  const s = result.summary;
  return (
    <div className="space-y-4">
      {/* Completeness */}
      <Card>
        <CardHeader title="Kelengkapan" description={`Score: ${s.completenessScore}%`} />
        {s.completenessIssues.length === 0 ? (
          <Badge variant="success">✓ Semua lengkap</Badge>
        ) : (
          <ul className="space-y-1 text-sm">
            {s.completenessIssues.map((issue, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-amber-600">⚠</span>
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Rekap Sesi */}
      <Card>
        <CardHeader title="Rekap Sesi Mengajar" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-sm">
          <Stat label="Total Sesi" value={s.totalSessions} />
          <Stat label="Selesai" value={s.doneSessions} color="text-brand-700" />
          <Stat label="Dilanjutkan" value={s.continuedSessions} color="text-amber-700" />
          <Stat label="Tidak Terlaksana" value={s.cancelledSessions} color="text-rose-700" />
        </div>
      </Card>

      {/* Rekap Materi */}
      <Card>
        <CardHeader title="Rekap Materi" description={`${report.totalPlannedUnits} unit total`} />
        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          <Stat label="Selesai" value={s.unitsCompleted} color="text-brand-700" />
          <Stat label="Sebagian" value={s.unitsPartial} color="text-amber-700" />
          <Stat label="Belum" value={s.unitsNotStarted} color="text-rose-700" />
        </div>
      </Card>

      {/* Rekap Absensi */}
      <Card>
        <CardHeader title="Rekap Absensi" />
        <div className="grid grid-cols-4 gap-3 text-center text-sm">
          <Stat label="Hadir" value={report.totalPresent} color="text-brand-700" />
          <Stat label="Sakit" value={report.totalSick} color="text-amber-700" />
          <Stat label="Izin" value={report.totalExcused} />
          <Stat label="Alpa" value={report.totalAbsent} color="text-rose-700" />
        </div>
        {report.perClassAbsence.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-slate-500 mb-1">Per Kelas:</p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-1 px-2">Kelas</th>
                  <th className="text-center py-1 px-2">H</th>
                  <th className="text-center py-1 px-2">S</th>
                  <th className="text-center py-1 px-2">I</th>
                  <th className="text-center py-1 px-2">A</th>
                  <th className="text-center py-1 px-2">Sesi</th>
                </tr>
              </thead>
              <tbody>
                {report.perClassAbsence.map((c) => (
                  <tr key={c.classId} className="border-b border-slate-100">
                    <td className="py-1 px-2">{c.classLabel}</td>
                    <td className="text-center py-1 px-2">{c.presentCount}</td>
                    <td className="text-center py-1 px-2">{c.sickCount}</td>
                    <td className="text-center py-1 px-2">{c.excusedCount}</td>
                    <td className="text-center py-1 px-2">{c.absentCount}</td>
                    <td className="text-center py-1 px-2">{c.totalSessions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Rekap Jurnal */}
      <Card>
        <CardHeader title="Rekap Jurnal" />
        <div className="grid grid-cols-2 gap-3 text-center text-sm">
          <Stat label="Finalized" value={report.journalsFinalized} color="text-brand-700" />
          <Stat label="Pending" value={report.journalsPending} color="text-amber-700" />
        </div>
      </Card>

      {/* Finalize */}
      <Card>
        <CardHeader title="Finalisasi" />
        {report.status === "final" || report.status === "locked" ? (
          <Badge variant="success">✓ Laporan sudah difinalisasi (snapshot tersimpan)</Badge>
        ) : canFinalize ? (
          <Button onClick={onFinalize} disabled={finalizing}>
            {finalizing ? "Finalizing..." : "Finalisasi Laporan"}
          </Button>
        ) : (
          <div className="space-y-1">
            <p className="text-sm text-rose-600">Belum bisa finalize:</p>
            <ul className="text-xs text-rose-600 list-disc pl-5">
              {finalizeReasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
}

function ModeDokumen({
  report,
  school,
  teacher,
  academicYear,
}: {
  report: SemesterReport;
  result: GenerateSemesterReportResult;
  school?: SchoolProfile;
  teacher: TeacherProfile;
  academicYear: AcademicYear;
  profile?: ProtaProfile;
}) {
  return (
    <Card>
      <div className="print-area">
        {/* Header dokumen */}
        <div className="text-center mb-6 border-b-2 border-slate-400 pb-4">
          <h2 className="text-lg font-bold uppercase">{school?.name ?? "Sekolah"}</h2>
          <p className="text-sm">{school?.address ?? ""}</p>
          <h3 className="text-base font-bold uppercase mt-4">Laporan Akhir Semester {report.semester === 1 ? "Ganjil" : "Genap"}</h3>
          <p className="text-sm">Tahun Pelajaran {academicYear.label}</p>
        </div>

        {/* Identitas */}
        <table className="w-full text-sm border-collapse mb-4">
          <tbody>
            <tr>
              <td className="py-1 px-2 border border-slate-300 font-semibold w-1/4">Mata Pelajaran</td>
              <td className="py-1 px-2 border border-slate-300">{report.subject}</td>
              <td className="py-1 px-2 border border-slate-300 font-semibold w-1/4">Kelas / Fase</td>
              <td className="py-1 px-2 border border-slate-300">{report.grade} / {report.phase}</td>
            </tr>
            <tr>
              <td className="py-1 px-2 border border-slate-300 font-semibold">Guru</td>
              <td className="py-1 px-2 border border-slate-300">{teacher.name}</td>
              <td className="py-1 px-2 border border-slate-300 font-semibold">NIP</td>
              <td className="py-1 px-2 border border-slate-300">{teacher.nip ?? "-"}</td>
            </tr>
          </tbody>
        </table>

        {/* Rekap Pertemuan */}
        <h4 className="font-bold text-sm mb-2">A. Rekap Pertemuan</h4>
        <table className="w-full text-sm border-collapse mb-4">
          <thead>
            <tr className="bg-slate-100">
              <th className="py-1.5 px-2 border border-slate-300 text-left">No</th>
              <th className="py-1.5 px-2 border border-slate-300 text-left">Uraian</th>
              <th className="py-1.5 px-2 border border-slate-300 text-center">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className="py-1 px-2 border border-slate-300">1</td><td className="py-1 px-2 border border-slate-300">Total Sesi Terjadwal</td><td className="py-1 px-2 border border-slate-300 text-center">{report.totalPlannedSessions}</td></tr>
            <tr><td className="py-1 px-2 border border-slate-300">2</td><td className="py-1 px-2 border border-slate-300">Sesi Terlaksana (Selesai)</td><td className="py-1 px-2 border border-slate-300 text-center">{report.totalDoneSessions}</td></tr>
            <tr><td className="py-1 px-2 border border-slate-300">3</td><td className="py-1 px-2 border border-slate-300">Sesi Dilanjutkan</td><td className="py-1 px-2 border border-slate-300 text-center">{report.totalContinuedSessions}</td></tr>
            <tr><td className="py-1 px-2 border border-slate-300">4</td><td className="py-1 px-2 border border-slate-300">Sesi Tidak Terlaksana</td><td className="py-1 px-2 border border-slate-300 text-center">{report.totalCancelledSessions}</td></tr>
          </tbody>
        </table>

        {/* Rekap Materi */}
        <h4 className="font-bold text-sm mb-2">B. Rekap Materi</h4>
        <table className="w-full text-sm border-collapse mb-4">
          <thead>
            <tr className="bg-slate-100">
              <th className="py-1.5 px-2 border border-slate-300 text-left">No</th>
              <th className="py-1.5 px-2 border border-slate-300 text-left">Status Materi</th>
              <th className="py-1.5 px-2 border border-slate-300 text-center">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            <tr><td className="py-1 px-2 border border-slate-300">1</td><td className="py-1 px-2 border border-slate-300">Materi Selesai</td><td className="py-1 px-2 border border-slate-300 text-center">{report.totalCompletedUnits}</td></tr>
            <tr><td className="py-1 px-2 border border-slate-300">2</td><td className="py-1 px-2 border border-slate-300">Materi Sebagian</td><td className="py-1 px-2 border border-slate-300 text-center">{report.totalPartialUnits}</td></tr>
            <tr><td className="py-1 px-2 border border-slate-300">3</td><td className="py-1 px-2 border border-slate-300">Materi Belum Dimulai</td><td className="py-1 px-2 border border-slate-300 text-center">{report.totalNotStartedUnits}</td></tr>
            <tr><td className="py-1 px-2 border border-slate-300">4</td><td className="py-1 px-2 border border-slate-300">Total Materi (Prota)</td><td className="py-1 px-2 border border-slate-300 text-center">{report.totalPlannedUnits}</td></tr>
          </tbody>
        </table>

        {/* Rekap Absensi per Kelas */}
        <h4 className="font-bold text-sm mb-2">C. Rekap Kehadiran Siswa per Kelas</h4>
        <table className="w-full text-sm border-collapse mb-4">
          <thead>
            <tr className="bg-slate-100">
              <th className="py-1.5 px-2 border border-slate-300 text-left">Kelas</th>
              <th className="py-1.5 px-2 border border-slate-300 text-center">Hadir</th>
              <th className="py-1.5 px-2 border border-slate-300 text-center">Sakit</th>
              <th className="py-1.5 px-2 border border-slate-300 text-center">Izin</th>
              <th className="py-1.5 px-2 border border-slate-300 text-center">Alpa</th>
              <th className="py-1.5 px-2 border border-slate-300 text-center">Total Sesi</th>
            </tr>
          </thead>
          <tbody>
            {report.perClassAbsence.length === 0 ? (
              <tr><td colSpan={6} className="py-2 px-2 border border-slate-300 text-center text-slate-400">Tidak ada data</td></tr>
            ) : (
              report.perClassAbsence.map((c) => (
                <tr key={c.classId}>
                  <td className="py-1 px-2 border border-slate-300">{c.classLabel}</td>
                  <td className="py-1 px-2 border border-slate-300 text-center">{c.presentCount}</td>
                  <td className="py-1 px-2 border border-slate-300 text-center">{c.sickCount}</td>
                  <td className="py-1 px-2 border border-slate-300 text-center">{c.excusedCount}</td>
                  <td className="py-1 px-2 border border-slate-300 text-center">{c.absentCount}</td>
                  <td className="py-1 px-2 border border-slate-300 text-center">{c.totalSessions}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="font-bold bg-slate-50">
              <td className="py-1.5 px-2 border border-slate-300">Total</td>
              <td className="py-1.5 px-2 border border-slate-300 text-center">{report.totalPresent}</td>
              <td className="py-1.5 px-2 border border-slate-300 text-center">{report.totalSick}</td>
              <td className="py-1.5 px-2 border border-slate-300 text-center">{report.totalExcused}</td>
              <td className="py-1.5 px-2 border border-slate-300 text-center">{report.totalAbsent}</td>
              <td className="py-1.5 px-2 border border-slate-300 text-center">{report.totalPlannedSessions}</td>
            </tr>
          </tfoot>
        </table>

        {/* Catatan */}
        <h4 className="font-bold text-sm mb-2">D. Catatan</h4>
        <div className="border border-slate-300 p-3 min-h-[80px] text-sm mb-4">
          {report.teacherNotes || report.materialAdjustments || "(kosong)"}
        </div>

        {/* Tanda Tangan */}
        <div className="flex justify-between mt-12">
          <div className="text-center text-sm">
            <p>Mengetahui,</p>
            <p>Kepala Sekolah</p>
            <p className="mt-20 font-bold underline">{school?.headmasterName ?? "(...........................)"}</p>
            <p>NIP. {school?.headmasterNip ?? "-"}</p>
          </div>
          <div className="text-center text-sm">
            <p>{school?.regency ?? ""}, {report.finalizedAt ? formatLongDateID(report.finalizedAt.split("T")[0]) : "..."}</p>
            <p>Guru Mata Pelajaran</p>
            <p className="mt-20 font-bold underline">{teacher.name}</p>
            <p>NIP. {teacher.nip ?? "-"}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function Stat({ label, value, color = "" }: { label: string; value: number; color?: string }) {
  return (
    <div className="p-2 bg-slate-50 rounded">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
