import type { EnrichmentProgram, TeachingAssignment, EnrichmentStudent } from "@guru-admin/domain";
import { Badge, Button, Input, Select, Textarea } from "@shared/ui";
import { updateEnrichmentProgram } from "@shared/db/enrichment-repo";
import { ENRICHMENT_PRESETS, MATERIAL_PRESETS, DEFAULT_ENRICHMENT_NOTE, DEFAULT_ENRICHMENT_PLAN } from "./constants";

/* ------------------------------------------------------------------ */
/*  EnrichmentSidebar — sidebar panel for WYSIWYG layout               */
/* ------------------------------------------------------------------ */

interface EnrichmentSidebarProps {
  program: EnrichmentProgram;
  plan: string;
  setPlan: (v: string) => void;
  assignments: TeachingAssignment[];
  selectedAssignmentId: string;
  setSelectedAssignmentId: (v: string) => void;
  threshold: number;
  setThreshold: (v: number) => void;
  presetActivity: string;
  setPresetActivity: (v: string) => void;
  presetMaterial: string;
  setPresetMaterial: (v: string) => void;
  presetNote: string;
  setPresetNote: (v: string) => void;
  showSidebar: boolean;
  setShowSidebar: (v: boolean) => void;
  setProgram: (v: EnrichmentProgram) => void;
  setMessage: (v: { type: "success" | "error"; text: string } | null) => void;
  handleGenerate: () => void;
  handleUpdateStudent: (idx: number, patch: Partial<EnrichmentStudent>) => void;
  handleSavePlan: () => void;
  handleFinalize: () => void;
  handleDelete: () => void;
}

export function EnrichmentSidebar({
  program,
  plan,
  setPlan,
  assignments,
  selectedAssignmentId,
  setSelectedAssignmentId,
  threshold,
  setThreshold,
  presetActivity,
  setPresetActivity,
  presetMaterial,
  setPresetMaterial,
  presetNote,
  setPresetNote,
  showSidebar,
  setShowSidebar,
  setProgram,
  setMessage,
  handleGenerate,
  handleUpdateStudent,
  handleSavePlan,
  handleFinalize,
  handleDelete,
}: EnrichmentSidebarProps) {
  return (
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
          onChange={(v) => setThreshold(Number(v) || 90)}
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
  );
}
