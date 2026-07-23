/**
 * Remedial — program remedial otomatis dari GradeBook.
 *
 * GENERATOR-COMPLETION-RC1 Phase 2.
 * WYSIWYG-DOC-FASE6: Refactor ke layout WYSIWYG.
 *   - Layout always-on: sidebar (kontrol) + DocumentPreview (dokumen).
 *   - Hapus toggle Mode Kerja / Mode Dokumen (WYSIWYG = dokumen selalu terlihat).
 *   - Auto-save ke schoolDocuments (docType: "remedial").
 *   - Uses ensureDoc pattern from FASE3/FASE4 audit fixes.
 *   - Sidebar slide animation + Final button loading state (UX-POLISH-01).
 *
 * Siswa dengan nilai akhir < KKTP otomatis masuk daftar remedial.
 * Filter by assignment 5-tuple (teacherId + subject + classId + semester).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardHeader, Input, Textarea, Button, EmptyState, Badge, Select } from "../../shared/ui";
import { InfoCard } from "../../shared/ui/ContextCard";
import { getActiveAcademicYear, getTeacherProfile, getSchoolProfile } from "../../shared/db/profile-repo";
import { listAssignmentsByTeacher } from "../../shared/db/teaching-assignment-repo";
import { findGradeBook } from "../../shared/db/gradebook-repo";
import {
  listRemedialPrograms,
  generateRemedialProgram,
  updateRemedialProgram,
  finalizeRemedialProgram,
  deleteRemedialProgram,
} from "../../shared/db/remedial-repo";
// WYSIWYG-DOC-FASE6
import { DocumentPreview, RemedialEnrichmentDocument } from "../../shared/documents";
import {
  saveSchoolDocument,
  updateSchoolDocumentData,
  updateSchoolDocumentLayout,
  setSchoolDocumentStatus,
  findSchoolDocumentByCompositeKey,
} from "../../shared/db/school-document-repo";
import type { SchoolDocOrientation, DocumentStatus } from "@guru-admin/domain";
import type {
  AcademicYear,
  TeacherProfile,
  SchoolProfile,
  TeachingAssignment,
  RemedialProgram,
  RemedialStudent,
} from "@guru-admin/domain";
import { calculateGradeBookEntries } from "@guru-admin/domain";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";
import { LoadingState } from "../../shared/ui";

/** Preset bentuk remedial untuk dropdown. */
const REMEDIAL_PRESETS = [
  "Pembelajaran ulang dan tugas perbaikan",
  "Tugas perbaikan",
  "Bimbingan individual",
  "Tutor sebaya",
  "Ulangan ulang",
  "Lainnya",
];

/** Preset jadwal remedial untuk dropdown. */
const SCHEDULE_PRESETS = [
  "Pertemuan berikutnya",
  "Di luar jam pelajaran",
  "Setelah KBM",
  "Sesuai kesepakatan guru dan siswa",
];

const DEFAULT_REMEDIAL_NOTE = "Siswa diberi tugas perbaikan untuk mencapai ketuntasan pembelajaran.";
const DEFAULT_REMEDIAL_PLAN = `Program remedial diberikan kepada siswa yang belum mencapai Ketuntasan Kompetensi Tujuan Pembelajaran (KKTP). Kegiatan remedial dilakukan melalui pembelajaran ulang, bimbingan individual, tugas perbaikan, atau tutor sebaya agar siswa dapat mencapai ketuntasan minimal.`;

/* ------------------------------------------------------------------ */
/*  RemedialDocument — renders inside A4 canvas                       */
/* ------------------------------------------------------------------ */

function RemedialDocument({
  program,
  plan,
  school,
  teacher,
  year,
}: {
  program: RemedialProgram;
  plan: string;
  school: SchoolProfile | undefined;
  teacher: TeacherProfile | undefined;
  year: AcademicYear | null;
}) {
  return (
    <>
      <div className="document-title">PROGRAM REMEDIAL</div>
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
            <td>KKTP</td><td>{program.kktp}</td>
            <td>Tanggal Pelaksanaan</td><td>{program.startDate ? formatLongDateID(program.startDate) : "-"}</td>
          </tr>
        </tbody>
      </table>

      <div className="document-section-title">A. DAFTAR SISWA REMEDIAL</div>
      {program.students.length === 0 ? (
        <div style={{ border: "1px solid #000", padding: "12pt", marginBottom: "12pt", textAlign: "center" }}>
          <p style={{ fontStyle: "italic" }}>
            Tidak terdapat siswa yang mengikuti remedial karena seluruh siswa telah mencapai KKTP ({program.kktp}).
          </p>
        </div>
      ) : (
        <table className="document-table" style={{ fontSize: "9pt" }}>
          <thead>
            <tr>
              <th style={{ width: "4%" }}>No</th>
              <th>Nama Siswa</th>
              <th style={{ width: "9%" }}>Nilai</th>
              <th style={{ width: "11%" }}>Nilai Remedial</th>
              <th style={{ width: "18%" }}>Bentuk</th>
              <th style={{ width: "14%" }}>Jadwal</th>
            </tr>
          </thead>
          <tbody>
            {program.students.map((s, i) => (
              <tr key={s.studentId}>
                <td className="text-center">{i + 1}</td>
                <td>{s.studentName}</td>
                <td className="text-center">{s.finalScore}</td>
                <td className="text-center">{s.remedialScore ?? "-"}</td>
                <td>{s.method ?? "-"}</td>
                <td>{s.schedule ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {plan && (
        <>
          <div className="document-section-title">B. RENCANA REMEDIAL</div>
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
          <p>{school?.regency ?? "..........."}, {formatLongDateID(program.startDate ?? todayISODate())}</p>
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
/*  RemedialPage                                                      */
/* ------------------------------------------------------------------ */

export function RemedialPage() {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [school, setSchool] = useState<SchoolProfile | undefined>();
  const [assignments, setAssignments] = useState<TeachingAssignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [program, setProgram] = useState<RemedialProgram | null>(null);
  const [plan, setPlan] = useState("");
  const [kktp, setKktp] = useState(75);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Preset untuk Isi Otomatis Semua
  const [presetMethod, setPresetMethod] = useState("");
  const [presetSchedule, setPresetSchedule] = useState("");
  const [presetNote, setPresetNote] = useState("");

  // WYSIWYG-DOC-FASE6: sidebar + document state
  const [showSidebar, setShowSidebar] = useState(
    typeof window !== "undefined" && window.innerWidth >= 1024
  );
  const [docId, setDocId] = useState<string | undefined>();
  const [docStatus, setDocStatus] = useState<DocumentStatus>("draft");
  const [formatDokumen, setFormatDokumen] = useState<SchoolDocOrientation>("portrait");
  const [docView, setDocView] = useState<"remedial" | "remedial-enrichment">("remedial");

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
    const all = await listRemedialPrograms({ academicYearId: year.id, teacherId: teacher.id });
    const found = all.find(
      (p) =>
        p.subject === assignment.subject &&
        p.classId === assignment.classId &&
        p.semester === assignment.semester
    );
    if (found) {
      setProgram(found);
      setPlan(found.plan ?? "");
      setKktp(found.kktp);
      setStartDate(found.startDate ?? "");
      setEndDate(found.endDate ?? "");
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
        docType: "remedial",
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
          docType: "remedial",
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
      kktp: program.kktp,
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
    if (docId) void updateSchoolDocumentLayout(docId, { orientation: o });
  }, [docId]);

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
        "Susun ulang dari nilai terbaru akan mengganti daftar siswa remedial " +
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

      const calculated = calculateGradeBookEntries(gb.entries, kktp);
      const entriesForFilter = calculated.map((e) => ({
        studentId: e.studentId,
        studentName: e.studentName,
        studentNumber: e.studentNumber,
        nis: undefined as string | undefined,
        finalScore: (e.finalScore ?? null) as number | null,
      }));

      const result = await generateRemedialProgram({
        assignment,
        kktp,
        gradebookEntries: entriesForFilter,
        plan: plan || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setProgram(result);
      setMessage({
        type: "success",
        text: `Program remedial dibuat. ${result.students.length} siswa di bawah KKTP.`,
      });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Gagal generate." });
    }
  }

  async function handleUpdateStudent(idx: number, patch: Partial<RemedialStudent>) {
    if (!program) return;
    try {
      const nextStudents = [...program.students];
      nextStudents[idx] = { ...nextStudents[idx], ...patch };
      const updated = await updateRemedialProgram(program.id, { students: nextStudents });
      if (updated) setProgram(updated);
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Gagal memperbarui siswa." });
    }
  }

  async function handleSavePlan() {
    if (!program) return;
    try {
      const updated = await updateRemedialProgram(program.id, { plan });
      if (updated) {
        setProgram(updated);
        setMessage({ type: "success", text: "Rencana remedial tersimpan." });
      }
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Gagal menyimpan rencana." });
    }
  }

  async function handleFinalize() {
    if (!program) return;
    try {
      const result = await finalizeRemedialProgram(program.id);
      if (result.success && result.program) {
        setProgram(result.program);
        setMessage({ type: "success", text: "Program remedial difinalkan." });
      } else {
        setMessage({ type: "error", text: result.errors.join(", ") });
      }
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Gagal finalisasi program." });
    }
  }

  async function handleDelete() {
    if (!program) return;
    if (!window.confirm("Hapus program remedial ini?")) return;
    try {
      await deleteRemedialProgram(program.id);
      setProgram(null);
      setMessage({ type: "success", text: "Program remedial dihapus." });
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
          <h1 className="text-2xl font-bold text-slate-900">Program Remedial</h1>
          <p className="text-sm text-slate-500 mt-1">
            {year ? `TP ${year.label}` : "Belum ada tahun aktif"} · Siswa nilai &lt; KKTP otomatis masuk remedial.
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
                id="rem-asg"
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
          <h2 className="text-sm font-bold text-slate-900">Program Remedial</h2>
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
            id="rem-asg-wysiwyg"
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
            <div><dt>Siswa remedial</dt><dd>{program.students.length}</dd></div>
            <div><dt>KKTP</dt><dd>{program.kktp}</dd></div>
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
          <div className="mt-2">
            <label className="text-xs font-medium text-slate-500 block mb-1">Tampilan Dokumen</label>
            <div className="flex gap-1">
              <Button variant={docView === "remedial" ? "primary" : "secondary"} className="text-xs flex-1" onClick={() => setDocView("remedial")}>Remedial</Button>
              <Button variant={docView === "remedial-enrichment" ? "primary" : "secondary"} className="text-xs flex-1" onClick={() => setDocView("remedial-enrichment")}>Remedial & Pengayaan</Button>
            </div>
          </div>
        </div>

        {/* Isi Otomatis */}
        {program.students.length > 0 && (
          <div className="doc-sidebar-section">
            <h3 className="doc-sidebar-section-title">Isi Otomatis Semua</h3>
            <div className="space-y-2">
              <Select
                label="Bentuk Remedial"
                id="rem-preset-method"
                value={presetMethod}
                onChange={setPresetMethod}
                options={[
                  { value: "", label: "-- Pilih --" },
                  ...REMEDIAL_PRESETS.map((p) => ({ value: p, label: p })),
                ]}
              />
              <Select
                label="Jadwal"
                id="rem-preset-schedule"
                value={presetSchedule}
                onChange={setPresetSchedule}
                options={[
                  { value: "", label: "-- Pilih --" },
                  ...SCHEDULE_PRESETS.map((p) => ({ value: p, label: p })),
                ]}
              />
              <Input
                label="Catatan"
                id="rem-preset-note"
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
                      method: presetMethod || REMEDIAL_PRESETS[0],
                      schedule: presetSchedule || SCHEDULE_PRESETS[0],
                      note: presetNote || DEFAULT_REMEDIAL_NOTE,
                    }));
                    const updated = await updateRemedialProgram(program.id, { students: updatedStudents, plan: plan || DEFAULT_REMEDIAL_PLAN });
                    if (updated) {
                      setProgram(updated);
                      setPlan(DEFAULT_REMEDIAL_PLAN);
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
                      method: presetMethod || s.method,
                      schedule: presetSchedule || s.schedule,
                      note: presetNote || s.note,
                    }));
                    const updated = await updateRemedialProgram(program.id, { students: updatedStudents });
                    if (updated) setProgram(updated);
                    setMessage({ type: "success", text: "Preset diterapkan ke semua siswa." });
                  }}
                  disabled={!presetMethod && !presetSchedule && !presetNote}
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
                    <Badge variant="error">{s.finalScore}</Badge>
                  </div>
                  <div style={{ display: "flex", gap: "4px", width: "100%" }}>
                    <input
                      type="number"
                      className="w-14 px-1 py-0.5 border border-slate-300 rounded text-xs"
                      value={s.remedialScore ?? ""}
                      onChange={(e) =>
                        handleUpdateStudent(i, {
                          remedialScore: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                      placeholder="Nilai"
                      min={0}
                      max={100}
                    />
                    <select
                      className="flex-1 px-1 py-0.5 border border-slate-300 rounded text-xs"
                      value={s.method ?? ""}
                      onChange={(e) => handleUpdateStudent(i, { method: e.target.value })}
                    >
                      <option value="">-- Bentuk --</option>
                      {REMEDIAL_PRESETS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <select
                    className="w-full px-1.5 py-0.5 border border-slate-300 rounded text-xs"
                    value={s.schedule ?? ""}
                    onChange={(e) => handleUpdateStudent(i, { schedule: e.target.value })}
                  >
                    <option value="">-- Jadwal --</option>
                    {SCHEDULE_PRESETS.map((sc) => (
                      <option key={sc} value={sc}>{sc}</option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Rencana */}
        <div className="doc-sidebar-section">
          <h3 className="doc-sidebar-section-title">Rencana Remedial</h3>
          <Textarea
            label=""
            id="rem-plan-wysiwyg"
            value={plan}
            onChange={setPlan}
            rows={3}
            placeholder="Rencana remedial..."
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
          docType="remedial"
          orientation={docView === "remedial-enrichment" ? "landscape" : formatDokumen}
          status={docStatus}
          data={docDataForAutoSave}
          onSave={handleSaveDoc}
          onSetFinal={handleSetFinal}
          onOrientationChange={docView === "remedial-enrichment" ? undefined : handleOrientationChange}
          showFormatToggle={docView !== "remedial-enrichment"}
        >
          {docView === "remedial-enrichment" ? (
            <RemedialEnrichmentDocument
              withPrintArea={false}
              data={{
                context: {
                  schoolName: school?.name,
                  schoolAddress: school?.address,
                  schoolOffice: "Dinas Pendidikan",
                  academicYear: year?.label,
                  semester: program.semester === 1 ? "Ganjil" : "Genap",
                  teacherName: program.teacherName ?? teacher?.name,
                  subject: program.subject,
                  classLabel: program.classLabel,
                  headmasterName: school?.headmasterName,
                  headmasterNip: school?.headmasterNip,
                  place: school?.regency ?? "",
                  dateLabel: formatLongDateID(program.startDate ?? todayISODate()),
                },
                kktp: program.kktp,
                rows: program.students.map((s, i) => ({
                  no: i + 1,
                  name: s.studentName,
                  initialScore: s.finalScore ?? "—",
                  unfinishedTp: s.tpToImprove ?? "—",
                  activityType: "Remedial" as const,
                  activity: s.method ?? "Pembelajaran ulang / tugas perbaikan",
                  finalScore: s.remedialScore ?? "—",
                  status: (s.remedialScore !== undefined && s.remedialScore !== null && Number(s.remedialScore) >= program.kktp) ? "TUNTAS" as const : "BELUM TUNTAS" as const,
                })),
              }}
            />
          ) : (
            <RemedialDocument
              program={program}
              plan={plan}
              school={school}
              teacher={teacher}
              year={year}
            />
          )}
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
