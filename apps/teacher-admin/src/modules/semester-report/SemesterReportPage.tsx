/**
 * Modul M08 Laporan Akhir Semester — halaman /semester-report
 * Sumber: docs/PROJECT_CONTRACT.md §4.1 (M08)
 *
 * WYSIWYG-DOC-FASE7: SemesterReport sebagai dokumen WYSIWYG.
 *   - Layout always-on: sidebar (kontrol) + DocumentPreview (dokumen A4).
 *   - Sidebar: Konteks (pilih Kelas/Mapel), Ringkasan, Finalisasi.
 *   - DocumentPreview: kanvas A4 portrait + auto-save + status badge.
 *   - Auto-save ke schoolDocuments (docType: "rapor-semester").
 *   - ensureDoc pattern: find-or-create saat assignment dipilih.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, Select, Button, EmptyState, Badge, LoadingState } from "../../shared/ui";
import { Link } from "react-router-dom";
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
// WYSIWYG-DOC-FASE7
import { DocumentPreview } from "../../shared/documents";
import {
  saveSchoolDocument,
  updateSchoolDocumentData,
  updateSchoolDocumentLayout,
  setSchoolDocumentStatus,
  findSchoolDocumentByCompositeKey,
} from "../../shared/db/school-document-repo";
import type { SchoolDocOrientation, DocumentStatus } from "@guru-admin/domain";

/* ------------------------------------------------------------------ */
/*  Main Component                                                    */
/* ------------------------------------------------------------------ */

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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // WYSIWYG-DOC-FASE7
  const [showSidebar, setShowSidebar] = useState(
    typeof window !== "undefined" && window.innerWidth >= 1024
  );
  const [formatDokumen, setFormatDokumen] = useState<"portrait" | "landscape">("portrait");
  const [docId, setDocId] = useState<string | undefined>(undefined);
  const [docStatus, setDocStatus] = useState<DocumentStatus>("draft");
  const [docSemester, setDocSemester] = useState<1 | 2>(1);
  const ensuringRef = useRef(false);

  /* ---------------------------------------------------------------- */
  /*  Init                                                            */
  /* ---------------------------------------------------------------- */

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
        setDocSemester(sem);
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
    if (!error && !success) return;
    const t = setTimeout(() => { setError(null); setSuccess(null); }, error ? 5000 : 3000);
    return () => clearTimeout(t);
  }, [error, success]);

  /* ---------------------------------------------------------------- */
  /*  Assignment selection                                            */
  /* ---------------------------------------------------------------- */

  const selectedAssignment = assignments.find((a) => a.id === selectedAssignmentId);

  // Auto-set semester from assignment
  useEffect(() => {
    if (selectedAssignment) {
      setDocSemester(selectedAssignment.semester);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssignmentId]);

  /* ---------------------------------------------------------------- */
  /*  ensureDoc (find-or-create schoolDocument)                       */
  /* ---------------------------------------------------------------- */

  const ensureDoc = useCallback(async (asg: TeachingAssignment, semester: 1 | 2) => {
    if (!activeYear || !asg) return;
    if (ensuringRef.current) return;
    ensuringRef.current = true;
    try {
      const existing = await findSchoolDocumentByCompositeKey({
        docType: "rapor-semester",
        semester,
        tahunAjaran: activeYear.label,
        kodeMapel: asg.subject,
        kodeKelas: asg.classLabel,
        teacherId: asg.teacherId,
      });
      if (existing) {
        setDocId(existing.id);
        setDocStatus(existing.status);
        if (existing.orientation) setFormatDokumen(existing.orientation);
      } else {
        const doc = await saveSchoolDocument({
          docType: "rapor-semester",
          semester,
          tahunAjaran: activeYear.label,
          kodeMapel: asg.subject,
          kodeKelas: asg.classLabel,
          teacherId: asg.teacherId,
          academicYearId: activeYear.id,
          data: { semester, subject: asg.subject, classLabel: asg.classLabel },
          orientation: "portrait",
          status: "draft",
        });
        setDocId(doc.id);
        setDocStatus("draft");
        setFormatDokumen("portrait");
      }
    } finally {
      ensuringRef.current = false;
    }
  }, [activeYear]);

  // When selected assignment changes, ensure doc
  useEffect(() => {
    if (selectedAssignment) {
      void ensureDoc(selectedAssignment, docSemester);
    } else {
      setDocId(undefined);
      setDocStatus("draft");
      setReport(null);
      setGenResult(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssignmentId, activeYear?.id]);

  /* ---------------------------------------------------------------- */
  /*  WYSIWYG callbacks                                               */
  /* ---------------------------------------------------------------- */

  const handleSaveDoc = useCallback(async (id: string, data: Record<string, unknown>) => {
    await updateSchoolDocumentData(id, data);
  }, []);

  const handleSetFinal = useCallback(async (id: string) => {
    await setSchoolDocumentStatus(id, "final");
    setDocStatus("final");
  }, []);

  const handleOrientationChange = useCallback((orientation: SchoolDocOrientation) => {
    setFormatDokumen(orientation);
    if (docId) void updateSchoolDocumentLayout(docId, { orientation });
  }, [docId]);

  /* ---------------------------------------------------------------- */
  /*  Generate & Finalize                                             */
  /* ---------------------------------------------------------------- */

  async function handleGenerate() {
    if (!selectedAssignment) return;
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
        if (docId) {
          await setSchoolDocumentStatus(docId, "final");
          setDocStatus("final");
        }
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

  /* ---------------------------------------------------------------- */
  /*  Auto-save data memo                                             */
  /* ---------------------------------------------------------------- */

  const docDataForAutoSave = useMemo(() => {
    if (!report || !selectedAssignment) return {};
    return {
      semester: docSemester,
      tahunAjaran: activeYear?.label ?? "",
      subject: selectedAssignment.subject,
      classLabel: selectedAssignment.classLabel,
      reportSnapshot: {
        totalPlannedSessions: report.totalPlannedSessions,
        totalDoneSessions: report.totalDoneSessions,
        totalContinuedSessions: report.totalContinuedSessions,
        totalCancelledSessions: report.totalCancelledSessions,
        totalCompletedUnits: report.totalCompletedUnits,
        totalPartialUnits: report.totalPartialUnits,
        totalNotStartedUnits: report.totalNotStartedUnits,
        totalPlannedUnits: report.totalPlannedUnits,
        totalPresent: report.totalPresent,
        totalSick: report.totalSick,
        totalExcused: report.totalExcused,
        totalAbsent: report.totalAbsent,
        journalsFinalized: report.journalsFinalized,
        journalsPending: report.journalsPending,
        status: report.status,
      },
    };
  }, [report, selectedAssignment, docSemester, activeYear?.label]);

  /* ---------------------------------------------------------------- */
  /*  Render                                                          */
  /* ---------------------------------------------------------------- */

  if (loading) return <LoadingState />;

  /* ================================================================ */
  /*  WYSIWYG VIEW — sidebar + document                                */
  /* ================================================================ */

  return (
    <div className="doc-wysiwyg-layout">
      {/* ---------- MOBILE BACKDROP ---------- */}
      <div
        className={`doc-sidebar-backdrop no-print ${!showSidebar ? "doc-backdrop-hidden" : ""}`}
        onClick={() => setShowSidebar(false)}
        aria-hidden="true"
      />

      {/* ---------- SIDEBAR ---------- */}
      <aside className={`doc-sidebar no-print ${!showSidebar ? "doc-sidebar-hidden" : ""}`}>
        <div className="doc-sidebar-header">
          <h2 className="text-sm font-bold text-slate-900">Laporan Akhir Semester</h2>
          <button
            type="button"
            className="doc-sidebar-close"
            onClick={() => setShowSidebar(false)}
            title="Tutup sidebar"
          >
            ✕
          </button>
        </div>

        {/* -- Konteks -- */}
        <div className="doc-sidebar-section">
          <h3 className="doc-sidebar-section-title">Konteks</h3>
          {assignments.length === 0 ? (
            <EmptyState
              title="Belum ada Kelas dan Mapel"
              description="Buka menu 'Kelas dan Mapel' untuk membuat assignment dulu."
              action={<Button variant="secondary" className="text-xs" onClick={() => (window.location.hash = "#/assignments")}>Buka Kelas dan Mapel</Button>}
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
            <dl className="doc-summary-dl mt-2">
              <div><dt>Semester</dt><dd>{docSemester === 1 ? "Ganjil" : "Genap"}</dd></div>
              <div><dt>Guru</dt><dd>{selectedAssignment.teacherName}</dd></div>
              <div><dt>Tahun</dt><dd>{activeYear?.label ?? "-"}</dd></div>
            </dl>
          )}
        </div>

        {/* -- Ringkasan -- */}
        {genResult && (
          <div className="doc-sidebar-section">
            <h3 className="doc-sidebar-section-title">Ringkasan</h3>
            <dl className="doc-summary-dl">
              <div><dt>Kelengkapan</dt><dd>{genResult.summary.completenessScore}%</dd></div>
              <div><dt>Total Sesi</dt><dd>{genResult.summary.totalSessions}</dd></div>
              <div><dt>Selesai</dt><dd className="kme-effective-text">{genResult.summary.doneSessions}</dd></div>
              <div><dt>Dilanjutkan</dt><dd className="text-amber-600">{genResult.summary.continuedSessions}</dd></div>
              <div><dt>Tidak Terlaksana</dt><dd className="kme-ineffective-text">{genResult.summary.cancelledSessions}</dd></div>
            </dl>
            {genResult.summary.completenessIssues.length > 0 && (
              <div className="mt-2 space-y-1">
                {genResult.summary.completenessIssues.map((issue, i) => (
                  <p key={i} className="text-xs text-amber-600">⚠ {issue}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* -- Generate & Finalisasi -- */}
        {selectedAssignment && (
          <div className="doc-sidebar-section">
            <h3 className="doc-sidebar-section-title">Aksi</h3>
            <div className="space-y-2">
              <Button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full"
              >
                {generating ? "Menyusun..." : report ? "Susun Ulang Laporan" : "Susun Laporan"}
              </Button>
              {report && (report.status === "final" || report.status === "locked") ? (
                <Badge variant="success">✓ Laporan sudah difinalisasi</Badge>
              ) : report && canFinalize ? (
                <Button
                  variant="secondary"
                  onClick={handleFinalize}
                  disabled={finalizing}
                  className="w-full"
                >
                  {finalizing ? "Memfinalisasi..." : "Finalisasi Laporan"}
                </Button>
              ) : report ? (
                <div className="space-y-1">
                  <p className="text-xs text-rose-600">Belum bisa finalize:</p>
                  <ul className="text-xs text-rose-600 list-disc pl-5">
                    {finalizeReasons.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </aside>

      {/* ---------- FLOATING SIDEBAR TOGGLE ---------- */}
      {!showSidebar && (
        <button
          type="button"
          className="doc-sidebar-toggle no-print"
          onClick={() => setShowSidebar(true)}
          title="Buka sidebar"
        >
          ☰
        </button>
      )}

      {/* ---------- DOCUMENT AREA ---------- */}
      <div className="doc-document-area">
        {(!activeYear || !teacher) && (
          <Card className="border-amber-200 bg-amber-50 mb-3 no-print">
            <div className="flex items-start gap-3">
              <span className="text-amber-600 text-xl">⚠</span>
              <div>
                <p className="font-semibold text-amber-900">Profil/tahun belum lengkap</p>
                <p className="text-sm text-amber-800 mt-1">Lengkapi profil dan tahun pelajaran terlebih dahulu.</p>
                <Link to="/profile"><Button variant="secondary" className="text-sm mt-2">Lengkapi Profil</Button></Link>
              </div>
            </div>
          </Card>
        )}
        {error && <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-700 mb-3 no-print" role="status" aria-live="polite">{error}</div>}
        {success && <div className="p-3 rounded-md bg-brand-50 border border-brand-200 text-sm text-brand-700 mb-3 no-print" role="status" aria-live="polite">{success}</div>}

        <DocumentPreview
          docId={docId}
          docType="rapor-semester"
          orientation={formatDokumen}
          status={docStatus}
          data={docDataForAutoSave}
          onSave={handleSaveDoc}
          onSetFinal={handleSetFinal}
          onOrientationChange={handleOrientationChange}
        >
          {/* If profile/year not set, show notice inside canvas */}
          {!activeYear || !teacher ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-20">
              <p className="text-lg font-medium">Profil/Tahun Belum Lengkap</p>
              <p className="text-sm mt-1">Lengkapi profil dan tahun pelajaran terlebih dahulu.</p>
            </div>
          ) : !selectedAssignment ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-20">
              <p className="text-lg font-medium">Pilih Kelas dan Mapel</p>
              <p className="text-sm mt-1">Buka sidebar untuk memilih assignment.</p>
            </div>
          ) : !report ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-20">
              <p className="text-lg font-medium">Laporan Belum Disusun</p>
              <p className="text-sm mt-1">Klik "Susun Laporan" di sidebar untuk generate.</p>
            </div>
          ) : (
            <SemesterReportDocument
              report={report}
              school={school}
              teacher={teacher!}
              academicYear={activeYear!}
            />
          )}
        </DocumentPreview>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SemesterReportDocument — A4 formal layout                         */
/* ------------------------------------------------------------------ */

function SemesterReportDocument({
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
    <div className="document-page document-portrait" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '11pt', lineHeight: '1.25', width: '100%', boxSizing: 'border-box' }}>
      <div className="document-title">LAPORAN AKHIR SEMESTER {report.semester === 1 ? "GANJIL" : "GENAP"}</div>
      <div className="document-subtitle">{school?.name ?? "Sekolah"} — {school?.address ?? ""}</div>
      <div className="document-subtitle">Tahun Pelajaran {academicYear.label}</div>

      <table className="document-identity" style={{ fontFamily: 'Arial, Helvetica, sans-serif', width: '100%', borderCollapse: 'collapse', boxSizing: 'border-box' }}>
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
      <table className="document-table" style={{ fontFamily: 'Arial, Helvetica, sans-serif', width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', boxSizing: 'border-box' }}>
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
      <table className="document-table" style={{ fontFamily: 'Arial, Helvetica, sans-serif', width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', boxSizing: 'border-box' }}>
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
      <table className="document-table" style={{ fontFamily: 'Arial, Helvetica, sans-serif', width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', boxSizing: 'border-box' }}>
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
      <table className="document-table" style={{ fontFamily: 'Arial, Helvetica, sans-serif', width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', boxSizing: 'border-box' }}>
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
  );
}
