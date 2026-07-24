import type {
  AcademicYear,
  TeachingAssignment,
  DocumentStatus,
} from "@guru-admin/domain";
import { Button, Input, Textarea, Select, EmptyState, Badge } from "../../shared/ui";

/* ------------------------------------------------------------------ */
/*  LainnyaSidebar — sidebar panel for WYSIWYG layout                 */
/* ------------------------------------------------------------------ */

interface LainnyaSidebarProps {
  showSidebar: boolean;
  setShowSidebar: (v: boolean) => void;
  assignments: TeachingAssignment[];
  selectedAssignmentId: string;
  setSelectedAssignmentId: (v: string) => void;
  selectedAssignment: TeachingAssignment | undefined;
  activeYear: AcademicYear | null;
  docSemester: 1 | 2;
  docTitle: string;
  setDocTitle: (v: string) => void;
  docContent: string;
  setDocContent: (v: string) => void;
  docStatus: DocumentStatus;
}

export function LainnyaSidebar({
  showSidebar,
  setShowSidebar,
  assignments,
  selectedAssignmentId,
  setSelectedAssignmentId,
  selectedAssignment,
  activeYear,
  docSemester,
  docTitle,
  setDocTitle,
  docContent,
  setDocContent,
  docStatus,
}: LainnyaSidebarProps) {
  return (
    <aside className={`doc-sidebar no-print ${!showSidebar ? "doc-sidebar-hidden" : ""}`}>
      <div className="doc-sidebar-header">
        <h2 className="text-sm font-bold text-slate-900">Dokumen Lainnya</h2>
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
            id="ln-assignment"
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

      {/* -- Judul & Isi -- */}
      {selectedAssignment && (
        <div className="doc-sidebar-section">
          <h3 className="doc-sidebar-section-title">Dokumen</h3>
          <Input
            label="Judul Dokumen"
            id="ln-title"
            value={docTitle}
            onChange={setDocTitle}
            placeholder="Contoh: Surat Keterangan, Catatan Khusus..."
          />
          <div className="mt-2">
            <Textarea
              label="Isi Dokumen"
              id="ln-content"
              value={docContent}
              onChange={setDocContent}
              rows={8}
              placeholder="Tulis isi dokumen di sini..."
            />
          </div>
        </div>
      )}

      {/* -- Ringkasan -- */}
      {selectedAssignment && (
        <div className="doc-sidebar-section">
          <h3 className="doc-sidebar-section-title">Ringkasan</h3>
          <dl className="doc-summary-dl">
            <div><dt>Judul</dt><dd>{docTitle || "(belum diisi)"}</dd></div>
            <div><dt>Isi</dt><dd>{docContent ? `${docContent.length} karakter` : "(belum diisi)"}</dd></div>
            <div><dt>Status</dt><dd><Badge variant={docStatus === "final" ? "success" : "neutral"}>{docStatus === "final" ? "Final" : "Draft"}</Badge></dd></div>
          </dl>
        </div>
      )}
    </aside>
  );
}
