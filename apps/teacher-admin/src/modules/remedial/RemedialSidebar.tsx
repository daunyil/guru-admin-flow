import type { RemedialProgram, TeachingAssignment } from "@guru-admin/domain";
import { Badge, Button, Input, Select, Textarea } from "@shared/ui";
import { updateRemedialProgram } from "@shared/db/remedial-repo";
import { REMEDIAL_PRESETS, SCHEDULE_PRESETS, DEFAULT_REMEDIAL_NOTE, DEFAULT_REMEDIAL_PLAN } from "./constants";

/* ------------------------------------------------------------------ */
/*  RemedialSidebar — sidebar panel for WYSIWYG layout                */
/* ------------------------------------------------------------------ */

interface RemedialSidebarProps {
  program: RemedialProgram;
  plan: string;
  setPlan: (v: string) => void;
  assignments: TeachingAssignment[];
  selectedAssignmentId: string;
  setSelectedAssignmentId: (v: string) => void;
  presetMethod: string;
  setPresetMethod: (v: string) => void;
  presetSchedule: string;
  setPresetSchedule: (v: string) => void;
  presetNote: string;
  setPresetNote: (v: string) => void;
  showSidebar: boolean;
  setShowSidebar: (v: boolean) => void;
  docView: "remedial" | "remedial-enrichment";
  setDocView: (v: "remedial" | "remedial-enrichment") => void;
  setProgram: (v: RemedialProgram) => void;
  setMessage: (v: { type: "success" | "error"; text: string } | null) => void;
  handleGenerate: () => void;
  handleUpdateStudent: (idx: number, patch: Partial<import("@guru-admin/domain").RemedialStudent>) => void;
  handleSavePlan: () => void;
  handleFinalize: () => void;
  handleDelete: () => void;
}

export function RemedialSidebar({
  program,
  plan,
  setPlan,
  assignments,
  selectedAssignmentId,
  setSelectedAssignmentId,
  presetMethod,
  setPresetMethod,
  presetSchedule,
  setPresetSchedule,
  presetNote,
  setPresetNote,
  showSidebar,
  setShowSidebar,
  docView,
  setDocView,
  setProgram,
  setMessage,
  handleGenerate,
  handleUpdateStudent,
  handleSavePlan,
  handleFinalize,
  handleDelete,
}: RemedialSidebarProps) {
  return (
    <aside className={`doc-sidebar no-print ${!showSidebar ? "doc-sidebar-hidden" : ""}`}>
      <div className="doc-sidebar-scroll">
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
      </div>
    </aside>
  );
}
