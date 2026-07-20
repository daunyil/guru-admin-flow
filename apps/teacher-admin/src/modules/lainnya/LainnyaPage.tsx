/**
 * Dokumen Lainnya — generic WYSIWYG document editor for docType "lainnya".
 *
 * WYSIWYG-DOC-FASE11: Menyelesaikan cakupan SchoolDocType (11/11).
 *   - Layout always-on: sidebar (konteks, editor) + DocumentPreview (dokumen A4).
 *   - Sidebar: Konteks (pilih Kelas/Mapel), Judul & Isi, Ringkasan.
 *   - DocumentPreview: kanvas A4 portrait + auto-save + status badge.
 *   - Auto-save ke schoolDocuments (docType: "lainnya").
 *   - ensureDoc pattern: find-or-create saat assignment dipilih.
 *
 * Kegunaan: surat keterangan, catatan khusus, dokumen administrasi
 * lain yang tidak masuk kategori docType spesifik.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Input, Textarea, Select, Button, EmptyState, Badge, LoadingState } from "../../shared/ui";
import { listAssignmentsByTeacher } from "../../shared/db/teaching-assignment-repo";
import { getActiveAcademicYear, getTeacherProfile, getSchoolProfile } from "../../shared/db/profile-repo";
import type {
  AcademicYear,
  SchoolProfile,
  TeacherProfile,
  TeachingAssignment,
} from "@guru-admin/domain";
import { todayISODate } from "@guru-admin/shared";
// WYSIWYG-DOC-FASE11
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

export function LainnyaPage() {
  const [loading, setLoading] = useState(true);
  const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
  const [school, setSchool] = useState<SchoolProfile | undefined>();
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [assignments, setAssignments] = useState<TeachingAssignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
  const [docTitle, setDocTitle] = useState("");
  const [docContent, setDocContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // WYSIWYG-DOC-FASE11
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
        const asgs = await listAssignmentsByTeacher(tp.id, year.id, sem);
        setAssignments(asgs);
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
        docType: "lainnya",
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
        // Restore saved title & content
        const data = existing.data as Record<string, unknown>;
        if (data?.title && typeof data.title === "string") setDocTitle(data.title);
        if (data?.content && typeof data.content === "string") setDocContent(data.content);
      } else {
        const doc = await saveSchoolDocument({
          docType: "lainnya",
          semester,
          tahunAjaran: activeYear.label,
          kodeMapel: asg.subject,
          kodeKelas: asg.classLabel,
          teacherId: asg.teacherId,
          academicYearId: activeYear.id,
          data: { semester, subject: asg.subject, classLabel: asg.classLabel, title: "", content: "" },
          orientation: "portrait",
          status: "draft",
        });
        setDocId(doc.id);
        setDocStatus("draft");
        setFormatDokumen("portrait");
        setDocTitle("");
        setDocContent("");
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
      setDocTitle("");
      setDocContent("");
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
  /*  Auto-save data memo                                             */
  /* ---------------------------------------------------------------- */

  const docDataForAutoSave = useMemo(() => {
    if (!selectedAssignment) return {};
    return {
      semester: docSemester,
      tahunAjaran: activeYear?.label ?? "",
      subject: selectedAssignment.subject,
      classLabel: selectedAssignment.classLabel,
      title: docTitle,
      content: docContent,
    };
  }, [selectedAssignment, docSemester, activeYear?.label, docTitle, docContent]);

  /* ---------------------------------------------------------------- */
  /*  Render                                                          */
  /* ---------------------------------------------------------------- */

  if (loading) return <LoadingState />;

  if (!activeYear || !teacher) {
    return (
      <div className="space-y-4">
        <Header />
        <EmptyState title="Profil/tahun belum lengkap" description="Lengkapi profil guru + tahun pelajaran aktif dulu." />
      </div>
    );
  }

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
              <div><dt>Tahun</dt><dd>{activeYear.label}</dd></div>
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
        {error && <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-700 mb-3 no-print" role="status" aria-live="polite">{error}</div>}
        {success && <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 mb-3 no-print" role="status" aria-live="polite">{success}</div>}

        <DocumentPreview
          docId={docId}
          docType="lainnya"
          orientation={formatDokumen}
          status={docStatus}
          data={docDataForAutoSave}
          onSave={handleSaveDoc}
          onSetFinal={handleSetFinal}
          onOrientationChange={handleOrientationChange}
        >
          {!selectedAssignment ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-20">
              <p className="text-lg font-medium">Pilih Kelas dan Mapel</p>
              <p className="text-sm mt-1">Buka sidebar untuk memilih assignment.</p>
            </div>
          ) : (
            <LainnyaDocument
              title={docTitle}
              content={docContent}
              school={school}
              teacher={teacher}
              academicYear={activeYear}
              semester={docSemester}
              assignment={selectedAssignment}
            />
          )}
        </DocumentPreview>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Header (for non-WYSIWYG empty states)                             */
/* ------------------------------------------------------------------ */

function Header() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Dokumen Lainnya</h1>
      <p className="text-sm text-slate-500 mt-1">
        Buat dokumen administrasi lain yang tidak masuk kategori spesifik.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  LainnyaDocument — A4 formal layout for generic document           */
/* ------------------------------------------------------------------ */

function LainnyaDocument({
  title,
  content,
  school,
  teacher,
  academicYear,
  semester,
  assignment,
}: {
  title: string;
  content: string;
  school?: SchoolProfile;
  teacher: TeacherProfile;
  academicYear: AcademicYear;
  semester: 1 | 2;
  assignment: TeachingAssignment;
}) {
  return (
    <div className="document-page document-portrait">
      <div className="document-title">{title || "DOKUMEN LAINNYA"}</div>
      <div className="document-subtitle">{school?.name ?? "Sekolah"}</div>
      <div className="document-subtitle">Tahun Pelajaran {academicYear.label} — Semester {semester === 1 ? "Ganjil" : "Genap"}</div>

      <table className="document-identity">
        <tbody>
          <tr>
            <td>Mata Pelajaran</td><td>{assignment.subject}</td>
            <td>Kelas</td><td>{assignment.classLabel}</td>
          </tr>
          <tr>
            <td>Guru</td><td>{teacher.name}</td>
            <td>NIP</td><td>{teacher.nip ?? "-"}</td>
          </tr>
        </tbody>
      </table>

      {content ? (
        <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.8, marginTop: "12pt" }}>
          {content}
        </div>
      ) : (
        <div style={{ marginTop: "12pt", color: "#94a3b8", fontStyle: "italic" }}>
          (Belum ada isi dokumen. Isi di sidebar untuk mulai menulis.)
        </div>
      )}

      <div className="signature-grid" style={{ marginTop: "24pt" }}>
        <div>
          <p>Mengetahui,</p>
          <p>Kepala Sekolah</p>
          <div className="sig-space" />
          <p className="sig-name">{school?.headmasterName ?? "(...........................)"}</p>
          <p>NIP. {school?.headmasterNip ?? "-"}</p>
        </div>
        <div>
          <p>{school?.regency ?? "..........."}, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
          <p>Guru Mata Pelajaran</p>
          <div className="sig-space" />
          <p className="sig-name">{teacher.name}</p>
          <p>NIP. {teacher.nip ?? "-"}</p>
        </div>
      </div>
    </div>
  );
}
