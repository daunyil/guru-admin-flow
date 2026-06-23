/**
 * Pengayaan — program pengayaan otomatis dari GradeBook.
 *
 * GENERATOR-COMPLETION-RC1 Phase 3.
 *
 * Siswa dengan nilai akhir >= threshold (default 90) otomatis masuk pengayaan.
 * Filter by assignment 5-tuple (teacherId + subject + classId + semester).
 */

import { useEffect, useState } from "react";
import { Card, CardHeader, Input, Textarea, Button, EmptyState, Badge, Select, InfoCard, PrintExportButtons } from "../../shared/ui";
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

/** Preset aktivitas pengayaan untuk dropdown. */
const ENRICHMENT_PRESETS = [
  "Proyek mandiri",
  "Soal tantangan",
  "Presentasi singkat",
  "Tutor sebaya",
  "Rangkuman materi lanjutan",
];

/** Preset materi pengayaan untuk dropdown. */
const MATERIAL_PRESETS = [
  "Materi lanjutan dari bab berikutnya",
  "Pendalaman materi saat ini",
  "Proyek aplikasi materi",
  "Eksplorasi topik terkait",
];

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
  const [showDocument, setShowDocument] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Preset untuk Isi Otomatis Semua
  const [presetActivity, setPresetActivity] = useState("");
  const [presetMaterial, setPresetMaterial] = useState("");
  const [presetNote, setPresetNote] = useState("");

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
        const today = new Date();
        const todayISO = today.toISOString().slice(0, 10);
        const sem: 1 | 2 =
          y.semester2Start <= todayISO && todayISO <= y.semester2End ? 2 : 1;
        setAssignments(await listAssignmentsByTeacher(tp.id, y.id, sem));
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (message?.type === "error") setTimeout(() => setMessage(null), 5000);
    if (message?.type === "success") setTimeout(() => setMessage(null), 3000);
  }, [message]);

  function selectedAssignment(): TeachingAssignment | undefined {
    return assignments.find((a) => a.id === selectedAssignmentId);
  }

  async function loadProgram() {
    if (!year || !teacher) return;
    const assignment = selectedAssignment();
    if (!assignment) {
      setProgram(null);
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

  async function handleGenerate() {
    if (!year || !teacher) return;
    const assignment = selectedAssignment();
    if (!assignment) {
      setMessage({ type: "error", text: "Pilih Data Mengajar dulu." });
      return;
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

      const calculated = calculateGradeBookEntries(gb.entries, 75); // passingScore sementara untuk hitung finalScore
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
        text: `Program pengayaan dibuat. ${result.students.length} siswa di atas threshold ${threshold}.`,
      });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Gagal generate." });
    }
  }

  async function handleUpdateStudent(idx: number, patch: Partial<EnrichmentStudent>) {
    if (!program) return;
    const nextStudents = [...program.students];
    nextStudents[idx] = { ...nextStudents[idx], ...patch };
    const updated = await updateEnrichmentProgram(program.id, { students: nextStudents });
    if (updated) setProgram(updated);
  }

  async function handleSavePlan() {
    if (!program) return;
    const updated = await updateEnrichmentProgram(program.id, { plan, threshold });
    if (updated) {
      setProgram(updated);
      setMessage({ type: "success", text: "Rencana pengayaan tersimpan." });
    }
  }

  async function handleFinalize() {
    if (!program) return;
    const result = await finalizeEnrichmentProgram(program.id);
    if (result.success && result.program) {
      setProgram(result.program);
      setMessage({ type: "success", text: "Program pengayaan difinalkan." });
    } else {
      setMessage({ type: "error", text: result.errors.join(", ") });
    }
  }

  async function handleDelete() {
    if (!program) return;
    if (!confirm("Hapus program pengayaan ini?")) return;
    await deleteEnrichmentProgram(program.id);
    setProgram(null);
    setMessage({ type: "success", text: "Program pengayaan dihapus." });
  }

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;

  const assignment = selectedAssignment();

  return (
    <div className="space-y-4">
      <div className="page-header">
        <h1 className="text-2xl font-bold text-slate-900">Program Pengayaan</h1>
        <p className="text-sm text-slate-500 mt-1">
          {year ? `TP ${year.label}` : "Belum ada tahun aktif"} · Siswa nilai ≥ {DEFAULT_ENRICHMENT_THRESHOLD} otomatis masuk pengayaan.
        </p>
      </div>

      {message && (
        <div className={`info-banner-${message.type === "success" ? "success" : "error"}`}>
          {message.text}
        </div>
      )}

      <Card>
        <CardHeader title="1. Pilih Data Mengajar" description="Filter siswa dari GradeBook sesuai assignment." />
        {assignments.length === 0 ? (
          <EmptyState
            title="Belum ada Data Mengajar"
            description="Buka menu Data Mengajar untuk membuat assignment dulu."
            action={<Button variant="secondary" onClick={() => (window.location.hash = "#/assignments")}>Buka Data Mengajar</Button>}
          />
        ) : (
          <div className="space-y-3">
            <Select
              label="Data Mengajar"
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
                label="Threshold Pengayaan"
                id="enr-thr"
                type="number"
                value={String(threshold)}
                onChange={(v) => setThreshold(Number(v) || DEFAULT_ENRICHMENT_THRESHOLD)}
                hint={`Siswa dengan nilai >= ${threshold} masuk pengayaan.`}
              />
            )}
            {assignment && (
              <Button onClick={handleGenerate}>
                {program ? "Re-Generate dari Nilai Terbaru" : "Generate dari GradeBook"}
              </Button>
            )}
          </div>
        )}
      </Card>

      {program && (
        <>
          <Card>
            <CardHeader
              title="2. Daftar Siswa Pengayaan"
              description={`${program.students.length} siswa di atas threshold ${program.threshold}`}
            />
            {program.students.length === 0 ? (
              <EmptyState
                title="Tidak ada siswa pengayaan"
                description={`Belum ada siswa yang mencapai threshold ${program.threshold}.`}
              />
            ) : (
              <>
                {/* Isi Otomatis Semua — preset */}
                <div className="p-3 bg-slate-50 rounded-md mb-3 space-y-2">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Isi Otomatis Semua Siswa</p>
                  <div className="flex gap-2 flex-wrap items-end">
                    <Select
                      label=""
                      id="enr-preset-activity"
                      value={presetActivity}
                      onChange={setPresetActivity}
                      options={[
                        { value: "", label: "-- Pilih aktivitas --" },
                        ...ENRICHMENT_PRESETS.map((p) => ({ value: p, label: p })),
                      ]}
                    />
                    <Select
                      label=""
                      id="enr-preset-material"
                      value={presetMaterial}
                      onChange={setPresetMaterial}
                      options={[
                        { value: "", label: "-- Pilih materi --" },
                        ...MATERIAL_PRESETS.map((p) => ({ value: p, label: p })),
                      ]}
                    />
                    <Input
                      label=""
                      id="enr-preset-note"
                      value={presetNote}
                      onChange={setPresetNote}
                      placeholder="Catatan cepat (opsional)"
                    />
                    <Button
                      variant="secondary"
                      className="text-sm"
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
                        setMessage({ type: "success", text: "Preset diterapkan ke semua siswa. Masih bisa edit per siswa." });
                      }}
                      disabled={!presetActivity && !presetMaterial && !presetNote}
                    >
                      Terapkan ke Semua
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left">
                      <th className="py-2 px-2">No</th>
                      <th className="py-2 px-2">Nama</th>
                      <th className="py-2 px-2 w-20">Nilai</th>
                      <th className="py-2 px-2">Aktivitas Pengayaan</th>
                      <th className="py-2 px-2">Materi Lanjutan</th>
                      <th className="py-2 px-2">Catatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {program.students.map((s, i) => (
                      <tr key={s.studentId} className="border-b border-slate-100">
                        <td className="py-1.5 px-2">{s.studentNumber ?? i + 1}</td>
                        <td className="py-1.5 px-2 font-medium">{s.studentName}</td>
                        <td className="py-1.5 px-2">
                          <Badge variant="success">{s.finalScore}</Badge>
                        </td>
                        <td className="py-1.5 px-2">
                          <select
                            className="w-36 px-2 py-1 border border-slate-300 rounded text-sm"
                            value={s.activity ?? ""}
                            onChange={(e) => handleUpdateStudent(i, { activity: e.target.value })}
                          >
                            <option value="">-- Pilih --</option>
                            {ENRICHMENT_PRESETS.map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-1.5 px-2">
                          <select
                            className="w-36 px-2 py-1 border border-slate-300 rounded text-sm"
                            value={s.material ?? ""}
                            onChange={(e) => handleUpdateStudent(i, { material: e.target.value })}
                          >
                            <option value="">-- Pilih --</option>
                            {MATERIAL_PRESETS.map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            type="text"
                            className="w-32 px-2 py-1 border border-slate-300 rounded text-sm"
                            value={s.note ?? ""}
                            onChange={(e) => handleUpdateStudent(i, { note: e.target.value })}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </>
            )}
          </Card>

          <Card>
            <CardHeader title="3. Rencana Pengayaan Umum" />
            <div className="space-y-3">
              <Textarea
                label="Rencana Pengayaan"
                id="enr-plan"
                value={plan}
                onChange={setPlan}
                rows={4}
                placeholder="Bentuk pengayaan: proyek mandiri, materi lanjutan, presentasi, mentor sebaya..."
              />
              <div className="flex gap-2 flex-wrap">
                <Button onClick={handleSavePlan}>Simpan Rencana</Button>
                {program.status !== "final" && (
                  <Button onClick={handleFinalize}>Finalkan Program</Button>
                )}
                {program.status === "final" && (
                  <Badge variant="success">✓ Final</Badge>
                )}
                <Button variant="secondary" onClick={() => setShowDocument(!showDocument)}>
                  {showDocument ? "Mode Kerja" : "Mode Dokumen"}
                </Button>
                {showDocument && (
                  <PrintExportButtons filename={`pengayaan-${program.classLabel}-${program.subject}`.replace(/\s+/g, "-")} title="Program Pengayaan" schoolName={school?.name} />
                )}
                <Button variant="danger" onClick={handleDelete}>Hapus</Button>
              </div>
            </div>
          </Card>

          {showDocument && (
            <Card>
              <div className="print-area">
                <div className="document-page document-portrait">
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
                        <td>Threshold</td><td>≥ {program.threshold}</td>
                        <td>Tanggal</td><td>{formatLongDateID(todayISODate())}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="document-section-title">A. DAFTAR SISWA PENGAYAAN</div>
                  {program.students.length === 0 ? (
                    <div style={{ border: "1px solid #000", padding: "12pt", marginBottom: "12pt", textAlign: "center" }}>
                      <p style={{ fontStyle: "italic" }}>
                        Tidak terdapat siswa yang masuk program pengayaan pada periode ini
                        (belum ada siswa yang mencapai threshold ≥ {program.threshold}).
                      </p>
                    </div>
                  ) : (
                    <table className="document-table">
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
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
