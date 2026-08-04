/**
 * SemesterReportSidebar — sidebar panel for WYSIWYG layout.
 * Contains Konteks, Ringkasan, and Aksi sections.
 * Extracted from SemesterReportPage.tsx.
 */

import type { AcademicYear, GenerateSemesterReportResult, SemesterReport, TeachingAssignment } from "@guru-admin/domain";
import { Button, EmptyState, Badge, Select } from "@shared/ui";

/* ------------------------------------------------------------------ */
/*  SemesterReportSidebar                                              */
/* ------------------------------------------------------------------ */

interface SemesterReportSidebarProps {
  showSidebar: boolean;
  setShowSidebar: (v: boolean) => void;
  assignments: TeachingAssignment[];
  selectedAssignmentId: string;
  setSelectedAssignmentId: (v: string) => void;
  selectedAssignment: TeachingAssignment | undefined;
  docSemester: 1 | 2;
  activeYear: AcademicYear | null;
  genResult: GenerateSemesterReportResult | null;
  report: SemesterReport | null;
  generating: boolean;
  finalizing: boolean;
  canFinalize: boolean;
  finalizeReasons: string[];
  handleGenerate: () => void;
  handleFinalize: () => void;
}

export function SemesterReportSidebar({
  showSidebar,
  setShowSidebar,
  assignments,
  selectedAssignmentId,
  setSelectedAssignmentId,
  selectedAssignment,
  docSemester,
  activeYear,
  genResult,
  report,
  generating,
  finalizing,
  canFinalize,
  finalizeReasons,
  handleGenerate,
  handleFinalize,
}: SemesterReportSidebarProps) {
  return (
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
  );
}
