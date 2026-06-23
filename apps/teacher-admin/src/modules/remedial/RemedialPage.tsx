/**
 * Remedial — program remedial otomatis dari GradeBook.
 *
 * GENERATOR-COMPLETION-RC1 Phase 2.
 *
 * Siswa dengan nilai akhir < KKTP otomatis masuk daftar remedial.
 * Filter by assignment 5-tuple (teacherId + subject + classId + semester).
 */

import { useEffect, useState } from "react";
import { Card, CardHeader, Input, Textarea, Button, EmptyState, Badge, Select, InfoCard, PrintExportButtons } from "../../shared/ui";
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

/** Preset bentuk remedial untuk dropdown. */
const REMEDIAL_PRESETS = [
  "Pembelajaran ulang dan tugas perbaikan",
  "Tugas perbaikan",
  "Bimbingan individual",
  "Tutor sebaya",
  "Ulangan ulang",
];

/** Preset jadwal remedial untuk dropdown. */
const SCHEDULE_PRESETS = [
  "Setelah jam pelajaran",
  "Jam istirahat",
  "Hari Sabtu",
  "Jadwal khusus",
];

export function RemedialPage() {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [school, setSchool] = useState<SchoolProfile | undefined>();
  const [assignments, setAssignments] = useState<TeachingAssignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [program, setProgram] = useState<RemedialProgram | null>(null);
  const [kktp, setKktp] = useState(75);
  const [plan, setPlan] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showDocument, setShowDocument] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Preset untuk Isi Otomatis Semua
  const [presetMethod, setPresetMethod] = useState("");
  const [presetSchedule, setPresetSchedule] = useState("");
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
    const all = await listRemedialPrograms({ academicYearId: year.id, teacherId: teacher.id });
    const found = all.find(
      (p) =>
        p.subject === assignment.subject &&
        p.classId === assignment.classId &&
        p.semester === assignment.semester
    );
    if (found) {
      setProgram(found);
      setKktp(found.kktp);
      setPlan(found.plan ?? "");
      setStartDate(found.startDate ?? "");
      setEndDate(found.endDate ?? "");
    } else {
      setProgram(null);
      setPlan("");
      setStartDate("");
      setEndDate("");
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
      // Load GradeBook untuk assignment
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

      // Calculate finalScore untuk semua entries
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
        text: `Program remedial dibuat. ${result.students.length} siswa di bawah KKTP ${kktp}.`,
      });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Gagal generate." });
    }
  }

  async function handleUpdateStudent(idx: number, patch: Partial<RemedialStudent>) {
    if (!program) return;
    const nextStudents = [...program.students];
    nextStudents[idx] = { ...nextStudents[idx], ...patch };
    const updated = await updateRemedialProgram(program.id, { students: nextStudents });
    if (updated) setProgram(updated);
  }

  async function handleSavePlan() {
    if (!program) return;
    const updated = await updateRemedialProgram(program.id, {
      plan,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      kktp,
    });
    if (updated) {
      setProgram(updated);
      setMessage({ type: "success", text: "Rencana remedial tersimpan." });
    }
  }

  async function handleFinalize() {
    if (!program) return;
    const result = await finalizeRemedialProgram(program.id);
    if (result.success && result.program) {
      setProgram(result.program);
      setMessage({ type: "success", text: "Program remedial difinalkan." });
    } else {
      setMessage({ type: "error", text: result.errors.join(", ") });
    }
  }

  async function handleDelete() {
    if (!program) return;
    if (!confirm("Hapus program remedial ini?")) return;
    await deleteRemedialProgram(program.id);
    setProgram(null);
    setMessage({ type: "success", text: "Program remedial dihapus." });
  }

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;

  const assignment = selectedAssignment();

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

      {/* Step 1: Pilih Data Mengajar */}
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
              <div className="grid sm:grid-cols-3 gap-3">
                <Input
                  label="KKTP"
                  id="rem-kktp"
                  type="number"
                  value={String(kktp)}
                  onChange={(v) => setKktp(Number(v) || 75)}
                  hint="Siswa dengan nilai < KKTP masuk remedial."
                />
                <Input label="Tanggal Mulai" id="rem-start" type="date" value={startDate} onChange={setStartDate} />
                <Input label="Tanggal Selesai" id="rem-end" type="date" value={endDate} onChange={setEndDate} />
              </div>
            )}
            {assignment && (
              <Button onClick={handleGenerate}>
                {program ? "Re-Generate dari Nilai Terbaru" : "Generate dari GradeBook"}
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Step 2: Daftar siswa + rencana */}
      {program && (
        <>
          <Card>
            <CardHeader
              title="2. Daftar Siswa Remedial"
              description={`${program.students.length} siswa di bawah KKTP ${program.kktp}`}
            />
            {program.students.length === 0 ? (
              <EmptyState
                title="Tidak ada siswa remedial 🎉"
                description={`Semua siswa sudah tuntas (nilai >= ${program.kktp}).`}
              />
            ) : (
              <>
                {/* Isi Otomatis Semua — preset */}
                <div className="p-3 bg-slate-50 rounded-md mb-3 space-y-2">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Isi Otomatis Semua Siswa</p>
                  <div className="flex gap-2 flex-wrap items-end">
                    <Select
                      label=""
                      id="rem-preset-method"
                      value={presetMethod}
                      onChange={setPresetMethod}
                      options={[
                        { value: "", label: "-- Pilih bentuk --" },
                        ...REMEDIAL_PRESETS.map((p) => ({ value: p, label: p })),
                      ]}
                    />
                    <Select
                      label=""
                      id="rem-preset-schedule"
                      value={presetSchedule}
                      onChange={setPresetSchedule}
                      options={[
                        { value: "", label: "-- Pilih jadwal --" },
                        ...SCHEDULE_PRESETS.map((s) => ({ value: s, label: s })),
                      ]}
                    />
                    <Input
                      label=""
                      id="rem-preset-note"
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
                          method: presetMethod || s.method,
                          schedule: presetSchedule || s.schedule,
                          note: presetNote || s.note,
                        }));
                        const updated = await updateRemedialProgram(program.id, { students: updatedStudents });
                        if (updated) setProgram(updated);
                        setMessage({ type: "success", text: "Preset diterapkan ke semua siswa. Masih bisa edit per siswa." });
                      }}
                      disabled={!presetMethod && !presetSchedule && !presetNote}
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
                      <th className="py-2 px-2 w-20">Nilai Remedial</th>
                      <th className="py-2 px-2">Bentuk Remedial</th>
                      <th className="py-2 px-2">Jadwal</th>
                      <th className="py-2 px-2">Catatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {program.students.map((s, i) => (
                      <tr key={s.studentId} className="border-b border-slate-100">
                        <td className="py-1.5 px-2">{s.studentNumber ?? i + 1}</td>
                        <td className="py-1.5 px-2 font-medium">{s.studentName}</td>
                        <td className="py-1.5 px-2">
                          <Badge variant="error">{s.finalScore}</Badge>
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            type="number"
                            className="w-16 px-2 py-1 border border-slate-300 rounded text-sm"
                            value={s.remedialScore ?? ""}
                            onChange={(e) =>
                              handleUpdateStudent(i, {
                                remedialScore: e.target.value === "" ? null : Number(e.target.value),
                              })
                            }
                            min={0}
                            max={100}
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <select
                            className="w-36 px-2 py-1 border border-slate-300 rounded text-sm"
                            value={s.method ?? ""}
                            onChange={(e) => handleUpdateStudent(i, { method: e.target.value })}
                          >
                            <option value="">-- Pilih --</option>
                            {REMEDIAL_PRESETS.map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-1.5 px-2">
                          <select
                            className="w-32 px-2 py-1 border border-slate-300 rounded text-sm"
                            value={s.schedule ?? ""}
                            onChange={(e) => handleUpdateStudent(i, { schedule: e.target.value })}
                          >
                            <option value="">-- Pilih --</option>
                            {SCHEDULE_PRESETS.map((sc) => (
                              <option key={sc} value={sc}>{sc}</option>
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
            <CardHeader title="3. Rencana Remedial Umum" />
            <div className="space-y-3">
              <Textarea
                label="Rencana Remedial"
                id="rem-plan"
                value={plan}
                onChange={setPlan}
                rows={4}
                placeholder="Bentuk remedial: tutor sebaya, pengulangan, tugas ulang, bimbingan individual..."
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
                  <PrintExportButtons filename={`remedial-${program.classLabel}-${program.subject}`.replace(/\s+/g, "-")} title="Program Remedial" schoolName={school?.name} />
                )}
                <Button variant="danger" onClick={handleDelete}>Hapus</Button>
              </div>
            </div>
          </Card>

          {showDocument && (
            <Card>
              <div className="print-area">
                <div className="document-page document-portrait">
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
                        <td>Tanggal</td><td>{formatLongDateID(todayISODate())}</td>
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
                    <table className="document-table">
                      <thead>
                        <tr>
                          <th style={{ width: "5%" }}>No</th>
                          <th>Nama Siswa</th>
                          <th style={{ width: "10%" }}>Nilai</th>
                          <th style={{ width: "12%" }}>Nilai Remedial</th>
                          <th style={{ width: "20%" }}>Bentuk</th>
                          <th style={{ width: "15%" }}>Jadwal</th>
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
