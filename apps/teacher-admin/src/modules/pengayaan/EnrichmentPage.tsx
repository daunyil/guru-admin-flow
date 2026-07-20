/**
 * Pengayaan — program pengayaan otomatis dari GradeBook.
 *
 * GENERATOR-COMPLETION-RC1 Phase 3.
 * WYSIWYG-DOC-FASE6: Refactor ke layout WYSIWYG.
 *   - Layout always-on: sidebar (kontrol) + DocumentPreview (dokumen).
 *   - Hapus toggle Mode Kerja / Mode Dokumen (WYSIWYG = dokumen selalu terlihat).
 *   - Auto-save ke schoolDocuments (docType: "pengayaan").
 *   - Uses ensureDoc pattern from FASE3/FASE4 audit fixes.
 *   - Sidebar slide animation + Final button loading state (UX-POLISH-01).
 *
 * Siswa dengan nilai akhir >= threshold (default 90) otomatis masuk pengayaan.
 * Filter by assignment 5-tuple (teacherId + subject + classId + semester).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardHeader, Input, Textarea, Button, EmptyState, Badge, Select, InfoCard } from "../../shared/ui";
import { getActiveAcademicYear, getTeacherProfile, getSchoolProfile } from "../../shared/db/profile-repo";
import { listAssignmentsByTeacher } from "../../shared/db/teaching-assignment-repo";
import { findGradeBook } from "../../shared/db/gradebook-repo";
import {
  listEnrichmentPrograms,
  generateEnrichmentProgram,
  updateEnrichmentProgram,
  finalizeEnrichmentProgram,
  deleteEnrichmentProgram,
} from "../../shared/db/enrichment-repo";
// WYSIWYG-DOC-FASE6
import { DocumentPreview } from "../../shared/documents";
import {
  saveSchoolDocument,
  updateSchoolDocumentData,
  setSchoolDocumentStatus,
  findSchoolDocumentByCompositeKey,
} from "../../shared/db/school-document-repo";
import type { SchoolDocOrientation, DocumentStatus } from "@guru-admin/domain";
import type {
  AcademicYear,
  TeacherProfile,
  SchoolProfile,
  TeachingAssignment,
  EnrichmentProgram,
  EnrichmentStudent,
} from "@guru-admin/domain";
import {
  calculateGradeBookEntries,
  DEFAULT_ENRICHMENT_THRESHOLD,
} from "@guru-admin/domain";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";
import { LoadingState } from "../../shared/ui";

/** Preset aktivitas pengayaan untuk dropdown. */
const ENRICHMENT_PRESETS = [
  "Proyek mandiri",
  "Soal tantangan",
  "Presentasi singkat",
  "Tutor sebaya",
  "Rangkuman materi lanjutan",
  "Lainnya",
];

/** Preset materi pengayaan untuk dropdown. */
const MATERIAL_PRESETS = [
  "Pendalaman materi",
  "Pengembangan contoh kasus",
  "Tugas eksplorasi",
  "Latihan soal tingkat lanjut",
  "Produk sederhana",
];

const DEFAULT_ENRICHMENT_NOTE = "Siswa diberi tugas pengembangan untuk memperdalam pemahaman materi.";
const DEFAULT_ENRICHMENT_PLAN = `Program pengayaan diberikan kepada siswa yang telah mencapai atau melampaui target pembelajaran. Kegiatan pengayaan dilakukan melalui tugas lanjutan, proyek sederhana, soal tantangan, atau pendalaman materi agar siswa dapat mengembangkan pemahamannya secara lebih luas.`;

/* ------------------------------------------------------------------ */
/*  PengayaanDocument — renders inside A4 canvas                      */
/* ------------------------------------------------------------------ */

function PengayaanDocument({
  program,
  plan,
  school,
  teacher,
  year,
}: {
  program: EnrichmentProgram;
  plan: string;
  school: SchoolProfile | undefined;
  teacher: TeacherProfile | undefined;
  year: AcademicYear | null;
}) {
  return (
    <>
      <div className="document-title">PROGRAM PENGAYAAN</div>
      <div className="document-subtitle">{school?.name ?? "Sekolah"}</div>
      <div className="document-subtitle">Tahun Pelajaran {year?.label}</div>

      <table className="document-identity">
        <tbody>
          <tr>
            <td>Mata Pelajaran</td><td>{program.subject}</td>
            <td>Kelas</td><td>{program.classLabel}</td>
          </tr>
          <tr>
            <td>Guru</td><td>{program.teacherName ?? teacher?.name ?? "-"}</td>
            <td>Semester</td><td>{program.semester === 1 ? "Ganjil" : "Genap"}</td>
          </tr>
          <tr>
            <td>Threshold</td><td>&ge; {program.threshold}</td>
            <td>Tanggal</td><td>{formatLongDateID(todayISODate())}</td>
          </tr>
        </tbody>
      </table>

      <div className="document-section-title">A. DAFTAR SISWA PENGAYAAN</div>
      {program.students.length === 0 ? (
        <div style={{ border: "1px solid #000", padding: "12pt", marginBottom: "12pt", textAlign: "center" }}>
          <p style={{ fontStyle: "italic" }}>
            Tidak terdapat siswa yang masuk program pengayaan pada periode ini
            (belum ada siswa yang mencapai threshold &ge; {program.threshold}).
          </p>
        </div>
      ) : (
        <table className="document-table" style={{ fontSize: "9pt" }}>
          <thead>
            <tr>
              <th style={{ width: "5%" }}>No</th>
              <th>Nama Siswa</th>
              <th style={{ width: "10%" }}>Nilai</th>
              <th style={{ width: "25%" }}>Aktivitas</th>
              <th style={{ width: "25%" }}>Materi Lanjutan</th>
            </tr>
          </thead>
          <tbody>
            {program.students.map((s, i) => (
              <tr key={s.studentId}>
                <td className="text-center">{i + 1}</td>
                <td>{s.studentName}</td>
                <td className="text-center">{s.finalScore}</td>
                <td>{s.activity ?? "-"}</td>
                <td>{s.material ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {plan && (
        <>
          <div className="document-section-title">B. RENCANA PENGAYAAN</div>
          <div style={{ border: "1px solid #000", padding: "8pt", minHeight: "60pt", marginBottom: "12pt" }}>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{plan}</pre>
          </div>
        </>
      )}

      <div className="signature-grid">
        <div>
          <p>Mengetahui,</p>
          <p>Kepala Sekolah</p>
          <div className="sig-space" />
          <p className="sig-name">{school?.headmasterName ?? "(............)"}</p>
          <p>NIP. {school?.headmasterNip ?? "-"}</p>
        </div>
        <div>
          <p>{school?.regency ?? "..........."}, {formatLongDateID(todayISODate())}</p>
          <p>Guru Mata Pelajaran</p>
          <div className="sig-space" />
          <p className="sig-name">{program.teacherName ?? teacher?.name ?? "-"}</p>
          <p>NIP. {teacher?.nip ?? "-"}</p>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  EnrichmentPage                                                    */
/* ------------------------------------------------------------------ */

export function EnrichmentPage() {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [school, setSchool] = useState<SchoolProfile | undefined>();
  const [assignments, setAssignments] = useState<TeachingAssignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [program, setProgram] = useState<EnrichmentProgram | null>(null);
  const [threshold, setThreshold] = useState(DEFAULT_ENRICHMENT_THRESHOLD);
  const [plan, setPlan] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Preset untuk Isi Otomatis Semua
  const [presetActivity, setPresetActivity] = useState("");
  const [presetMaterial, setPresetMaterial] = useState("");
  const [presetNote, setPresetNote] = useState("");

  // WYSIWYG-DOC-FASE6: sidebar + document state
  const [showSidebar, setShowSidebar] = useState(
    typeof window !== "undefined" && window.innerWidth >= 1024
  );
  const [docId, setDocId] = useState<string | undefined>();
  const [docStatus, setDocStatus] = useState<DocumentStatus>("draft");
  const [formatDokumen, setFormatDokumen] = useState<SchoolDocOrientation>("portrait");

  const ensuringRef = useRef(false);

  // Auto-dismiss messages
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), message.type === "error" ? 5000 : 3000);
    return () => clearTimeout(t);
  }, [message]);

  // Load profile data
  useEffect(() => {
    void (async () => {
      const [y, tp, sp] = await Promise.all([
        getActiveAcademicYear(),
        getTeacherProfile(),
        getSchoolProfile(),
      ]);
      setYear(y ?? null);
      setTeacher(tp);
      setSchool(sp);
      if (y && tp) {
        const todayISO = todayISODate();
        const sem: 1 | 2 =
          y.semester2Start <= todayISO && todayISO <= y.semester2End ? 2 : 1;
        setAssignments(await listAssignmentsByTeacher(tp.id, y.id, sem));
      }
      setLoading(false);
    })();
  }, []);

  function selectedAssignment(): TeachingAssignment | undefined {
    return assignments.find((a) => a.id === selectedAssignmentId);
  }

  // Load program when assignment changes
  async function loadProgram() {
    if (!year || !teacher) return;
    const assignment = selectedAssignment();
    if (!assignment) {
      setProgram(null);
      setDocId(undefined);
      return;
    }
    const all = await listEnrichmentPrograms({ academicYearId: year.id, teacherId: teacher.id });
    const found = all.find(
      (p) =>
        p.subject === assignment.subject &&
        p.classId === assignment.classId &&
        p.semester === assignment.semester
    );
    if (found) {
      setProgram(found);
      setThreshold(found.threshold);
      setPlan(found.plan ?? "");
    } else {
      setProgram(null);
      setPlan("");
    }
  }

  useEffect(() => {
    void loadProgram();
  }, [selectedAssignmentId, year]);

  // WYSIWYG-DOC-FASE6: ensureDoc — find or create schoolDocument
  const ensureDoc = useCallback(async () => {
    if (!year || !teacher || !program) return;
    if (ensuringRef.current) return;
    ensuringRef.current = true;
    try {
      const existing = await findSchoolDocumentByCompositeKey({
        docType: "pengayaan",
        semester: program.semester,
        tahunAjaran: year.label,
        kodeMapel: program.subject,
        kodeKelas: program.classLabel,
        teacherId: teacher.id,
      });
      if (existing) {
        setDocId(existing.id);
        setDocStatus(existing.status);
        if (existing.orientation) setFormatDokumen(existing.orientation);
      } else {
        const doc = await saveSchoolDocument({
          docType: "pengayaan",
          semester: program.semester,
          tahunAjaran: year.label,
          kodeMapel: program.subject,
          kodeKelas: program.classLabel,
          teacherId: teacher.id,
          academicYearId: year.id,
          status: "draft",
        });
        setDocId(doc.id);
        setDocStatus("draft");
      }
    } finally {
      ensuringRef.current = false;
    }
  }, [year, teacher, program]);

  useEffect(() => {
    if (program) {
      void ensureDoc();
    } else {
      setDocId(undefined);
    }
  }, [program, ensureDoc]);

  // Auto-save data for DocumentPreview
  const docDataForAutoSave = useMemo<Record<string, unknown>>(() => {
    if (!program) return {};
    return {
      programId: program.id,
      subject: program.subject,
      classLabel: program.classLabel,
      semester: program.semester,
      threshold: program.threshold,
      students: program.students,
      plan,
      teacherName: program.teacherName ?? teacher?.name ?? "",
    };
  }, [program, plan, teacher]);

  const handleSaveDoc = useCallback(async (id: string, data: Record<string, unknown>) => {
    await updateSchoolDocumentData(id, data);
  }, []);

  const handleSetFinal = useCallback(async (id: string) => {
    await setSchoolDocumentStatus(id, "final");
    setDocStatus("final");
  }, []);

  const handleOrientationChange = useCallback((o: SchoolDocOrientation) => {
    setFormatDokumen(o);
  }, []);

  // Generate / re-generate program
  async function handleGenerate() {
    if (!year || !teacher) return;
    const assignment = selectedAssignment();
    if (!assignment) {
      setMessage({ type: "error", text: "Pilih Kelas dan Mapel dulu." });
      return;
    }
    if (program) {
      const ok = window.confirm(
        "Susun ulang dari nilai terbaru akan mengganti daftar siswa pengayaan " +
        "dengan data nilai terbaru. Edit manual yang sudah diisi akan dipertahankan " +
        "untuk siswa yang masih ada. Lanjutkan?"
      );
      if (!ok) return;
    }
    try {
      const gb = await findGradeBook({
        academicYearId: assignment.academicYearId,
        teacherId: assignment.teacherId,
        classId: assignment.classId,
        semester: assignment.semester,
        subject: assignment.subject,
      });
      if (!gb) {
        setMessage({
          type: "error",
          text: `Belum ada GradeBook untuk ${assignment.classLabel} · ${assignment.subject}. Isi nilai dulu di menu Nilai.`,
        });
        return;
      }

      const calculated = calculateGradeBookEntries(gb.entries, 75);
      const entriesForFilter = calculated.map((e) => ({
        studentId: e.studentId,
        studentName: e.studentName,
        studentNumber: e.studentNumber,
        nis: undefined as string | undefined,
        finalScore: (e.finalScore ?? null) as number | null,
      }));

      const result = await generateEnrichmentProgram({
        assignment,
        threshold,
        gradebookEntries: entriesForFilter,
        plan: plan || undefined,
      });
      setProgram(result);
      setMessage({
        type: "success",
        text: `Program pengayaan dibuat. ${result.students.length} siswa di atas batas nilai ${threshold}.`,
      });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Gagal generate." });
    }
  }

  async function handleUpdateStudent(idx: number, patch: Partial<EnrichmentStudent>) {
    if (!program) return;
    try {
      const nextStudents = [...program.students];
      nextStudents[idx] = { ...nextStudents[idx], ...patch };
      const updated = await updateEnrichmentProgram(program.id, { students: nextStudents });
      if (updated) setProgram(updated);
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Gagal memperbarui siswa." });
    }
  }

  async function handleSavePlan() {
    if (!program) return;
    try {
      const updated = await updateEnrichmentProgram(program.id, { plan, threshold });
      if (updated) {
        setProgram(updated);
        setMessage({ type: "success", text: "Rencana pengayaan tersimpan." });
      }
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Gagal menyimpan rencana." });
    }
  }

  async function handleFinalize() {
    if (!program) return;
    try {
      const result = await finalizeEnrichmentProgram(program.id);
      if (result.success && result.program) {
        setProgram(result.program);
        setMessage({ type: "success", text: "Program pengayaan difinalkan." });
      } else {
        setMessage({ type: "error", text: result.errors.join(", ") });
      }
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Gagal finalisasi program." });
    }
  }

  async function handleDelete() {
    if (!program) return;
    if (!window.confirm("Hapus program pengayaan ini?")) return;
    try {
      await deleteEnrichmentProgram(program.id);
      setProgram(null);
      setMessage({ type: "success", text: "Program pengayaan dihapus." });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Gagal menghapus program." });
    }
  }

  if (loading) return <LoadingState />;

  const assignment = selectedAssignment();

  /* ================================================================ */
  /*  NO PROGRAM YET — show assignment selector only                  */
  /* ================================================================ */
  if (!program) {
    return (
      <div className="space-y-4">
        <div className="page-header">
          <h1 className="text-2xl font-bold text-slate-900">Program Pengayaan</h1>
          <p className="text-sm text-slate-500 mt-1">
            {year ? `TP ${year.label}` : "Belum ada tahun aktif"} · Siswa nilai &ge; {DEFAULT_ENRICHMENT_THRESHOLD} otomatis masuk pengayaan.
          </p>
        </div>

        {message && (
          <div className={`info-banner-${message.type === "success" ? "success" : "error"}`}>
            {message.text}
          </div>
        )}

        <Card>
          <CardHeader title="Pilih Kelas dan Mapel" description="Filter siswa dari GradeBook sesuai assignment." />
          {assignments.length === 0 ? (
            <EmptyState
              title="Belum ada Kelas dan Mapel"
              description="Buka menu Kelas dan Mapel untuk membuat assignment dulu."
              action={<Button variant="secondary" onClick={() => (window.location.hash = "#/assignments")}>Buka Kelas dan Mapel</Button>}
            />
          ) : (
            <div className="space-y-3">
              <Select
                label="Kelas dan Mapel"
                id="enr-asg"
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
              {assignment && (
                <InfoCard
                  entries={[
                    { label: "Guru", value: assignment.teacherName },
                    { label: "Mapel", value: assignment.subject },
                    { label: "Kelas", value: assignment.classLabel },
                    { label: "Semester", value: String(assignment.semester) },
                    { label: "Tahun Pelajaran", value: year?.label ?? "-" },
                  ]}
                />
              )}
              {assignment && (
                <Input
                  label="Batas Nilai Pengayaan"
                  id="enr-thr"
                  type="number"
                  value={String(threshold)}
                  onChange={(v) => setThreshold(Number(v) || DEFAULT_ENRICHMENT_THRESHOLD)}
                  hint={`Siswa dengan nilai >= ${threshold} masuk pengayaan.`}
                />
              )}
              {assignment && (
                <Button onClick={handleGenerate}>
                  Susun dari Nilai
                </Button>
              )}
            </div>
          )}
        </Card>
      </div>
    );
  }

  /* ================================================================ */
  /*  WYSIWYG VIEW — sidebar + document always visible                */
  /* ================================================================ */
  return (
    <div className="doc-wysiwyg-layout">
      {/* Mobile backdrop */}
      <div
        className={`doc-sidebar-backdrop no-print ${!showSidebar ? "doc-backdrop-hidden" : ""}`}
        onClick={() => setShowSidebar(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside className={`doc-sidebar no-print ${!showSidebar ? "doc-sidebar-hidden" : ""}`}>
        <div className="doc-sidebar-header">
          <h2 className="text-sm font-bold text-slate-900">Program Pengayaan</h2>
          <button
            type="button"
            className="doc-sidebar-close"
            onClick={() => setShowSidebar(false)}
            title="Tutup sidebar"
          >
            ✕
          </button>
        </div>

        {/* Konteks */}
        <div className="doc-sidebar-section">
          <h3 className="doc-sidebar-section-title">Konteks</h3>
          <Select
            label="Kelas dan Mapel"
            id="enr-asg-wysiwyg"
            value={selectedAssignmentId}
            onChange={setSelectedAssignmentId}
            options={[
              { value: "", label: "-- Pilih --" },
              ...assignments.map((a) => ({
                value: a.id,
                label: `${a.classLabel} · ${a.subject}`,
              })),
            ]}
          />
          <Input
            label="Batas Nilai"
            id="enr-thr-wysiwyg"
            type="number"
            value={String(threshold)}
            onChange={(v) => setThreshold(Number(v) || DEFAULT_ENRICHMENT_THRESHOLD)}
          />
          <div className="flex gap-2 mt-2">
            <Button onClick={handleGenerate} className="flex-1 text-xs">
              {program ? "Susun Ulang" : "Susun dari Nilai"}
            </Button>
          </div>
        </div>

        {/* Ringkasan */}
        <div className="doc-sidebar-section">
          <h3 className="doc-sidebar-section-title">Ringkasan</h3>
          <dl className="doc-summary-dl">
            <div><dt>Siswa pengayaan</dt><dd>{program.students.length}</dd></div>
            <div><dt>Threshold</dt><dd>&ge; {program.threshold}</dd></div>
            <div><dt>Status</dt>
              <dd>
                {program.status === "final" ? (
                  <Badge variant="success">Final</Badge>
                ) : (
                  <Badge variant="neutral">Draft</Badge>
                )}
              </dd>
            </div>
            <div><dt>Mapel</dt><dd>{program.subject}</dd></div>
            <div><dt>Kelas</dt><dd>{program.classLabel}</dd></div>
          </dl>
        </div>

        {/* Isi Otomatis */}
        {program.students.length > 0 && (
          <div className="doc-sidebar-section">
            <h3 className="doc-sidebar-section-title">Isi Otomatis Semua</h3>
            <div className="space-y-2">
              <Select
                label="Aktivitas"
                id="enr-preset-activity"
                value={presetActivity}
                onChange={setPresetActivity}
                options={[
                  { value: "", label: "-- Pilih --" },
                  ...ENRICHMENT_PRESETS.map((p) => ({ value: p, label: p })),
                ]}
              />
              <Select
                label="Materi"
                id="enr-preset-material"
                value={presetMaterial}
                onChange={setPresetMaterial}
                options={[
                  { value: "", label: "-- Pilih --" },
                  ...MATERIAL_PRESETS.map((p) => ({ value: p, label: p })),
                ]}
              />
              <Input
                label="Catatan"
                id="enr-preset-note"
                value={presetNote}
                onChange={setPresetNote}
                placeholder="Catatan cepat (opsional)"
              />
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="text-xs flex-1"
                  onClick={async () => {
                    if (!program) return;
                    const updatedStudents = program.students.map((s) => ({
                      ...s,
                      activity: presetActivity || ENRICHMENT_PRESETS[0],
                      material: presetMaterial || MATERIAL_PRESETS[0],
                      note: presetNote || DEFAULT_ENRICHMENT_NOTE,
                    }));
                    const updated = await updateEnrichmentProgram(program.id, { students: updatedStudents, plan: plan || DEFAULT_ENRICHMENT_PLAN });
                    if (updated) {
                      setProgram(updated);
                      setPlan(DEFAULT_ENRICHMENT_PLAN);
                    }
                    setMessage({ type: "success", text: "Isi otomatis diterapkan." });
                  }}
                >
                  Isi Otomatis
                </Button>
                <Button
                  variant="secondary"
                  className="text-xs flex-1"
                  onClick={async () => {
                    if (!program) return;
                    const updatedStudents = program.students.map((s) => ({
                      ...s,
                      activity: presetActivity || s.activity,
                      material: presetMaterial || s.material,
                      note: presetNote || s.note,
                    }));
                    const updated = await updateEnrichmentProgram(program.id, { students: updatedStudents });
                    if (updated) setProgram(updated);
                    setMessage({ type: "success", text: "Preset diterapkan ke semua siswa." });
                  }}
                  disabled={!presetActivity && !presetMaterial && !presetNote}
                >
                  Terapkan
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Daftar Siswa */}
        {program.students.length > 0 && (
          <div className="doc-sidebar-section">
            <h3 className="doc-sidebar-section-title">Daftar Siswa ({program.students.length})</h3>
            <ul className="doc-sidebar-list">
              {program.students.map((s, i) => (
                <li key={s.studentId} className="doc-sidebar-list-item" style={{ flexDirection: "column", alignItems: "flex-start", gap: "4px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", width: "100%" }}>
                    <span className="doc-sidebar-list-title">{i + 1}. {s.studentName}</span>
                    <Badge variant="success">{s.finalScore}</Badge>
                  </div>
                  <select
                    className="w-full px-1.5 py-0.5 border border-slate-300 rounded text-xs"
                    value={s.activity ?? ""}
                    onChange={(e) => handleUpdateStudent(i, { activity: e.target.value })}
                  >
                    <option value="">-- Aktivitas --</option>
                    {ENRICHMENT_PRESETS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <select
                    className="w-full px-1.5 py-0.5 border border-slate-300 rounded text-xs"
                    value={s.material ?? ""}
                    onChange={(e) => handleUpdateStudent(i, { material: e.target.value })}
                  >
                    <option value="">-- Materi --</option>
                    {MATERIAL_PRESETS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Rencana */}
        <div className="doc-sidebar-section">
          <h3 className="doc-sidebar-section-title">Rencana Pengayaan</h3>
          <Textarea
            label=""
            id="enr-plan-wysiwyg"
            value={plan}
            onChange={setPlan}
            rows={3}
            placeholder="Rencana pengayaan..."
          />
          <div className="flex gap-2 mt-2">
            <Button onClick={handleSavePlan} className="flex-1 text-xs">Simpan</Button>
            {program.status !== "final" && (
              <Button onClick={handleFinalize} className="flex-1 text-xs" variant="secondary">Finalkan</Button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="doc-sidebar-section doc-sidebar-footer">
          <Button
            variant="danger"
            onClick={handleDelete}
            className="w-full text-xs"
          >
            Hapus Program
          </Button>
        </div>
      </aside>

      {/* Document Area */}
      <div className="doc-document-area">
        <DocumentPreview
          docId={docId}
          docType="pengayaan"
          orientation={formatDokumen}
          status={docStatus}
          data={docDataForAutoSave}
          onSave={handleSaveDoc}
          onSetFinal={handleSetFinal}
          onOrientationChange={handleOrientationChange}
          showFormatToggle={false}
        >
          <PengayaanDocument
            program={program}
            plan={plan}
            school={school}
            teacher={teacher}
            year={year}
          />
        </DocumentPreview>
      </div>

      {/* Sidebar toggle (when hidden) */}
      {!showSidebar && (
        <button
          type="button"
          className="doc-sidebar-toggle no-print"
          onClick={() => setShowSidebar(true)}
          title="Buka panel kontrol"
          aria-label="Buka panel kontrol"
          aria-expanded={showSidebar}
        >
          ☰
        </button>
      )}

      {/* Toast messages */}
      {message && <div className={`doc-toast doc-toast-${message.type === "success" ? "success" : "error"} no-print`} role="status" aria-live="polite">{message.text}</div>}
    </div>
  );
}
