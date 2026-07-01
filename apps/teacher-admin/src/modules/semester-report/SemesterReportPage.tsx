/**
 * Modul M08 Laporan Akhir Semester — halaman /semester-report
 * Sumber: docs/PROJECT_CONTRACT.md §4.1 (M08)
 *
 * APP-USABLE-RC1B: pilih Kelas dan Mapel (bukan Prota). Filter data by
 * assignment 5-tuple (teacherId + subject + classId + semester).
 *
 * Dua mode:
 *   - Mode Kerja: pilih Kelas dan Mapel, generate, lihat summary, finalize
 *   - Mode Dokumen: format Word/Excel-like, print CSS, tanda tangan
 */

import { useEffect, useState } from "react";
import { Card, CardHeader, Select, Button, EmptyState, Badge, InfoCard, PrintExportButtons } from "../../shared/ui";
import {
  generateAndSaveSemesterReport,
  finalizeSemesterReport,
} from "../../shared/db/semester-report-repo";
import { listProtaProfiles } from "../../shared/db/prota-repo";
import { listAssignmentsByTeacher } from "../../shared/db/teaching-assignment-repo";
import { getActiveAcademicYear, getTeacherProfile, getSchoolProfile } from "../../shared/db/profile-repo";
import type {
  ProtaProfile,
  AcademicYear,
  SchoolProfile,
  TeacherProfile,
  SemesterReport,
  TeachingAssignment,
} from "@guru-admin/domain";
import { canFinalizeSemesterReport, type GenerateSemesterReportResult } from "@guru-admin/domain";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";

export function SemesterReportPage() {
  const [loading, setLoading] = useState(true);
  const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
  const [school, setSchool] = useState<SchoolProfile | undefined>();
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [assignments, setAssignments] = useState<TeachingAssignment[]>([]);
  const [protas, setProtas] = useState<ProtaProfile[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
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
      if (year && tp) {
                const todayISO = todayISODate();
        const sem: 1 | 2 =
          year.semester2Start <= todayISO && todayISO <= year.semester2End ? 2 : 1;
        const [asgs, ps] = await Promise.all([
          listAssignmentsByTeacher(tp.id, year.id, sem),
          listProtaProfiles(year.id),
        ]);
        setAssignments(asgs);
        setProtas(ps);
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

  const selectedAssignment = assignments.find((a) => a.id === selectedAssignmentId);

  async function handleGenerate() {
    if (!selectedAssignment) return;
    // UX-DOC-10: confirm bila laporan sudah ada (Susun ulang akan overwrite)
    if (report) {
      const ok = window.confirm(
        "Susun ulang laporan akan mengganti data laporan yang sudah ada " +
        "dengan data terbaru. Lanjutkan?"
      );
      if (!ok) return;
    }
    setGenerating(true);
    setError(null);
    try {
      // Cari Prota yang cocok dengan subject+grade assignment (untuk materi)
      const matchingProta = protas.find(
        (p) => p.subject === selectedAssignment!.subject
      ) ?? null;

      const result = await generateAndSaveSemesterReport({
        academicYear: activeYear!,
        protaProfile: matchingProta,
        assignment: selectedAssignment!,
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

  const canFinalize = genResult ? canFinalizeSemesterReport(genResult).canFinalize : false;
  const finalizeReasons = genResult ? canFinalizeSemesterReport(genResult).reasons : [];

  return (
    <div className="space-y-4">
      <Header yearLabel={activeYear.label} />

      {error && <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-700">{error}</div>}
      {success && <div className="p-3 rounded-md bg-brand-50 border border-brand-200 text-sm text-brand-700">{success}</div>}

      <Card>
        <CardHeader
          title="Susun Laporan"
          description="Pilih Kelas dan Mapel. Laporan akan filter data sesuai assignment (guru + mapel + kelas + semester)."
        />
        <div className="space-y-3">
          {assignments.length === 0 ? (
            <EmptyState
              title="Belum ada Kelas dan Mapel"
              description="Buka menu 'Kelas dan Mapel' untuk membuat assignment dulu."
              action={<Button variant="secondary" onClick={() => (window.location.hash = "#/assignments")}>Buka Kelas dan Mapel</Button>}
            />
          ) : (
            <Select
              label="Kelas dan Mapel"
              id="sr-assignment"
              value={selectedAssignmentId}
              onChange={setSelectedAssignmentId}
              options={[
                { value: "", label: "-- Pilih --" },
                ...assignments.map((a) => ({
                  value: a.id,
                  label: `${a.classLabel} · ${a.subject} · ${a.teacherName}`,
                })),
              ]}
            />
          )}

          {selectedAssignment && (
            <InfoCard
              entries={[
                { label: "Guru", value: selectedAssignment.teacherName },
                { label: "Mapel", value: selectedAssignment.subject },
                { label: "Kelas", value: selectedAssignment.classLabel },
                { label: "Semester", value: String(selectedAssignment.semester) },
                { label: "Tahun Pelajaran", value: activeYear.label },
              ]}
            />
          )}

          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleGenerate} disabled={generating || !selectedAssignment}>
              {generating ? "Menyusun..." : "Susun Laporan"}
            </Button>
            {report && (
              <Button variant="secondary" onClick={() => setShowDocument(!showDocument)}>
                {showDocument ? "Mode Kerja" : "Mode Dokumen"}
              </Button>
            )}
            {report && showDocument && (
              <PrintExportButtons filename={`laporan-${report.classLabel || report.grade}-${report.subject}-${report.semester === 1 ? "ganjil" : "genap"}`.replace(/\s+/g, "-")} title="Laporan Akhir Semester" schoolName={school?.name} />
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
          school={school}
          teacher={teacher}
          academicYear={activeYear}
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
        {yearLabel ? `Tahun pelajaran: ${yearLabel}` : "Rekap dari jurnal + absensi + sesi per Kelas dan Mapel."}
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

      <Card>
        <CardHeader title="Rekap Sesi Mengajar" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-sm">
          <Stat label="Total Sesi" value={s.totalSessions} />
          <Stat label="Selesai" value={s.doneSessions} color="text-brand-700" />
          <Stat label="Dilanjutkan" value={s.continuedSessions} color="text-amber-700" />
          <Stat label="Tidak Terlaksana" value={s.cancelledSessions} color="text-rose-700" />
        </div>
      </Card>

      <Card>
        <CardHeader title="Rekap Materi" description={`${report.totalPlannedUnits} unit total`} />
        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          <Stat label="Selesai" value={s.unitsCompleted} color="text-brand-700" />
          <Stat label="Sebagian" value={s.unitsPartial} color="text-amber-700" />
          <Stat label="Belum" value={s.unitsNotStarted} color="text-rose-700" />
        </div>
      </Card>

      <Card>
        <CardHeader title="Rekap Absensi" description={`Kelas ${report.classLabel || "-"}`} />
        <div className="grid grid-cols-4 gap-3 text-center text-sm">
          <Stat label="Hadir" value={report.totalPresent} color="text-brand-700" />
          <Stat label="Sakit" value={report.totalSick} color="text-amber-700" />
          <Stat label="Izin" value={report.totalExcused} />
          <Stat label="Alpa" value={report.totalAbsent} color="text-rose-700" />
        </div>
      </Card>

      <Card>
        <CardHeader title="Rekap Jurnal" />
        <div className="grid grid-cols-2 gap-3 text-center text-sm">
          <Stat label="Final" value={report.journalsFinalized} color="text-brand-700" />
          <Stat label="Pending" value={report.journalsPending} color="text-amber-700" />
        </div>
      </Card>

      <Card>
        <CardHeader title="Finalisasi" />
        {report.status === "final" || report.status === "locked" ? (
          <Badge variant="success">✓ Laporan sudah difinalisasi (snapshot tersimpan)</Badge>
        ) : canFinalize ? (
          <Button onClick={onFinalize} disabled={finalizing}>
            {finalizing ? "Memfinalisasi..." : "Finalisasi Laporan"}
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
  school?: SchoolProfile;
  teacher: TeacherProfile;
  academicYear: AcademicYear;
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
                <td>Kelas</td><td>{report.classLabel || report.grade} / Fase {report.phase}</td>
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

          <div className="document-section-title">C. REKAP KEHADIRAN SISWA — KELAS {report.classLabel || report.grade}</div>
          <table className="document-table">
            <thead>
              <tr>
                <th>Kelas</th>
                <th>H</th><th>S</th><th>I</th><th>A</th>
                <th>Total Sesi</th>
              </tr>
            </thead>
            <tbody>
              {report.perClassAbsence.length === 0 ? (
                <tr><td colSpan={6} className="text-center">Tidak ada data</td></tr>
              ) : (
                report.perClassAbsence.map((c) => (
                  <tr key={c.classId}>
                    <td>{c.classLabel}</td>
                    <td className="text-center">{c.presentCount}</td>
                    <td className="text-center">{c.sickCount}</td>
                    <td className="text-center">{c.excusedCount}</td>
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
