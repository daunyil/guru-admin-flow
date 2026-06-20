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
        <div className="document-page document-portrait">
          <div className="document-title">LAPORAN AKHIR SEMESTER {report.semester === 1 ? "GANJIL" : "GENAP"}</div>
          <div className="document-subtitle">{school?.name ?? "Sekolah"} — {school?.address ?? ""}</div>
          <div className="document-subtitle">Tahun Pelajaran {academicYear.label}</div>

          <table className="document-identity">
            <tbody>
              <tr>
                <td>Mata Pelajaran</td><td>{report.subject}</td>
                <td>Kelas / Fase</td><td>{report.grade} / {report.phase}</td>
              </tr>
              <tr>
                <td>Guru</td><td>{teacher.name}</td>
                <td>NIP</td><td>{teacher.nip ?? "-"}</td>
              </tr>
            </tbody>
          </table>

          <div className="document-section-title">A. REKAP PERTEMUAN</div>
          <table className="document-table">
            <thead>
              <tr><th style={{ width: "5%" }}>No</th><th>Uraian</th><th style={{ width: "15%" }}>Jumlah</th></tr>
            </thead>
            <tbody>
              <tr><td className="text-center">1</td><td>Total Sesi Terjadwal</td><td className="text-center">{report.totalPlannedSessions}</td></tr>
              <tr><td className="text-center">2</td><td>Sesi Terlaksana (Selesai)</td><td className="text-center">{report.totalDoneSessions}</td></tr>
              <tr><td className="text-center">3</td><td>Sesi Dilanjutkan</td><td className="text-center">{report.totalContinuedSessions}</td></tr>
              <tr><td className="text-center">4</td><td>Sesi Tidak Terlaksana</td><td className="text-center">{report.totalCancelledSessions}</td></tr>
            </tbody>
          </table>

          <div className="document-section-title">B. REKAP MATERI</div>
          <table className="document-table">
            <thead>
              <tr><th style={{ width: "5%" }}>No</th><th>Status Materi</th><th style={{ width: "15%" }}>Jumlah</th></tr>
            </thead>
            <tbody>
              <tr><td className="text-center">1</td><td>Materi Selesai</td><td className="text-center">{report.totalCompletedUnits}</td></tr>
              <tr><td className="text-center">2</td><td>Materi Sebagian</td><td className="text-center">{report.totalPartialUnits}</td></tr>
              <tr><td className="text-center">3</td><td>Materi Belum Dimulai</td><td className="text-center">{report.totalNotStartedUnits}</td></tr>
              <tr><td className="text-center">4</td><td>Total Materi (Prota)</td><td className="text-center">{report.totalPlannedUnits}</td></tr>
            </tbody>
          </table>

          <div className="document-section-title">C. REKAP KEHADIRAN SISWA PER KELAS</div>
          <table className="document-table">
            <thead>
              <tr>
                <th>Kelas</th>
                <th>H</th><th>S</th><th>I</th><th>T</th><th>A</th>
                <th>Total Sesi</th>
              </tr>
            </thead>
            <tbody>
              {report.perClassAbsence.length === 0 ? (
                <tr><td colSpan={7} className="text-center">Tidak ada data</td></tr>
              ) : (
                report.perClassAbsence.map((c) => (
                  <tr key={c.classId}>
                    <td>{c.classLabel}</td>
                    <td className="text-center">{c.presentCount}</td>
                    <td className="text-center">{c.sickCount}</td>
                    <td className="text-center">{c.excusedCount}</td>
                    <td className="text-center">{c.absentCount}</td>
                    <td className="text-center">{c.absentCount}</td>
                    <td className="text-center">{c.totalSessions}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr>
                <td>TOTAL</td>
                <td className="text-center">{report.totalPresent}</td>
                <td className="text-center">{report.totalSick}</td>
                <td className="text-center">{report.totalExcused}</td>
                <td className="text-center">-</td>
                <td className="text-center">{report.totalAbsent}</td>
                <td className="text-center">{report.totalPlannedSessions}</td>
              </tr>
            </tfoot>
          </table>

          <div className="document-section-title">D. REKAP JURNAL</div>
          <table className="document-table">
            <thead>
              <tr><th>No</th><th>Uraian</th><th>Jumlah</th></tr>
            </thead>
            <tbody>
              <tr><td className="text-center">1</td><td>Jurnal Final</td><td className="text-center">{report.journalsFinalized}</td></tr>
              <tr><td className="text-center">2</td><td>Jurnal Draft/Pending</td><td className="text-center">{report.journalsPending}</td></tr>
            </tbody>
          </table>

          <div className="document-section-title">E. CATATAN</div>
          <div style={{ border: "1px solid #000", padding: "8pt", minHeight: "60pt", marginBottom: "12pt" }}>
            {report.teacherNotes || report.materialAdjustments || "(kosong)"}
          </div>

          <div className="signature-grid">
            <div>
              <p>Mengetahui,</p>
              <p>Kepala Sekolah</p>
              <div className="sig-space" />
              <p className="sig-name">{school?.headmasterName ?? "(...........................)"}</p>
              <p>NIP. {school?.headmasterNip ?? "-"}</p>
            </div>
            <div>
              <p>{school?.regency ?? "..........."}, {report.finalizedAt ? formatLongDateID(report.finalizedAt.split("T")[0]) : "..."}</p>
              <p>Guru Mata Pelajaran</p>
              <div className="sig-space" />
              <p className="sig-name">{teacher.name}</p>
              <p>NIP. {teacher.nip ?? "-"}</p>
            </div>
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
