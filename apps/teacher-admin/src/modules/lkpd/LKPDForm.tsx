import { useState } from "react";
import { Card, CardHeader, Input, Textarea, Button, Select } from "../../shared/ui";
import { InfoCard } from "../../shared/ui/ContextCard";
import type { LKPD, ATPEntry, ClassRoster } from "@guru-admin/domain";
import type { LKPDFormData } from "./types";

interface LKPDFormProps {
  editing: LKPD | null;
  atpEntries: ATPEntry[];
  rosters: ClassRoster[];
  defaultTeacherName: string;
  onSave: (data: LKPDFormData) => void;
  onCancel: () => void;
}

export function LKPDForm({
  editing,
  atpEntries,
  rosters,
  defaultTeacherName,
  onSave,
  onCancel,
}: LKPDFormProps) {
  const [selectedAtpId, setSelectedAtpId] = useState(editing?.atpEntryId ?? "");
  const [form, setForm] = useState({
    subject: editing?.subject ?? "",
    grade: editing?.grade ?? "",
    classId: editing?.classId ?? "",
    classLabel: editing?.classLabel ?? "",
    tp: editing?.tp ?? "",
    title: editing?.title ?? "",
    objective: editing?.objective ?? "",
    materials: editing?.materials ?? "",
    steps: editing?.steps ?? "",
    guidingQuestions: editing?.guidingQuestions ?? "",
    assessment: editing?.assessment ?? "",
    notes: editing?.notes ?? "",
  });

  function handleAtpPick(atpId: string) {
    setSelectedAtpId(atpId);
    const atp = atpEntries.find((a) => a.id === atpId);
    if (atp) {
      setForm((f) => ({
        ...f,
        subject: atp.subject,
        grade: atp.grade,
        tp: atp.tp,
      }));
    }
  }

  function handleRosterPick(rosterId: string) {
    const r = rosters.find((rr) => rr.id === rosterId);
    if (r) {
      setForm((f) => ({ ...f, classId: r.classId, classLabel: r.classLabel }));
    } else {
      setForm((f) => ({ ...f, classId: "", classLabel: "" }));
    }
  }

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function handleSubmit() {
    if (!selectedAtpId) {
      alert("Pilih TP dulu.");
      return;
    }
    if (!form.title || !form.objective || !form.steps) {
      alert("Judul, Tujuan, dan Langkah Kegiatan wajib diisi.");
      return;
    }
    onSave({
      ...form,
      atpEntryId: selectedAtpId,
      teacherName: defaultTeacherName,
    });
  }

  return (
    <Card>
      <CardHeader
        title={editing ? "Edit LKPD" : "Buat LKPD"}
        description="Wajib: pilih TP, judul, tujuan, langkah kegiatan."
      />
      <div className="space-y-3">
        <Select
          label="Pilih TP (dari Bank TP)"
          id="lkpd-atp"
          value={selectedAtpId}
          onChange={handleAtpPick}
          options={[
            { value: "", label: "-- Pilih TP --" },
            ...atpEntries.map((a) => ({
              value: a.id,
              label: `${a.subject} — ${a.grade} · ${a.tp.length > 50 ? a.tp.slice(0, 50) + "..." : a.tp}`,
            })),
          ]}
          required
        />

        {selectedAtpId && (
          <InfoCard
            entries={[
              { label: "Guru", value: defaultTeacherName },
              { label: "Mapel", value: form.subject || "-" },
              { label: "Kelas", value: form.classLabel || form.grade || "-" },
              { label: "Fase", value: atpEntries.find((a) => a.id === selectedAtpId)?.phase ?? "-" },
              { label: "Bab", value: atpEntries.find((a) => a.id === selectedAtpId)?.bab ?? "-" },
            ]}
          />
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Mapel" id="lkpd-subject" value={form.subject} onChange={(v) => set("subject", v)} />
          <Input label="Kelas (opsional)" id="lkpd-grade" value={form.grade} onChange={(v) => set("grade", v)} />
        </div>

        <Select
          label="Khusus Kelas (opsional)"
          id="lkpd-class"
          value={rosters.find((r) => r.classId === form.classId)?.id ?? ""}
          onChange={handleRosterPick}
          options={[
            { value: "", label: "-- Umum (semua kelas) --" },
            ...rosters.map((r) => ({ value: r.id, label: r.classLabel })),
          ]}
          hint="Pilih kelas bila LKPD ini khusus untuk 1 kelas."
        />

        <Textarea label="Tujuan Pembelajaran (TP)" id="lkpd-tp" value={form.tp} onChange={(v) => set("tp", v)} rows={2} />

        <Input
          label="Judul LKPD"
          id="lkpd-title"
          value={form.title}
          onChange={(v) => set("title", v)}
          placeholder="LKPD Norma dalam Masyarakat"
        />

        <Textarea
          label="Tujuan LKPD"
          id="lkpd-objective"
          value={form.objective}
          onChange={(v) => set("objective", v)}
          rows={2}
          placeholder="Peserta didik mampu mengidentifikasi norma yang berlaku di masyarakat..."
        />

        <Textarea
          label="Alat dan Bahan"
          id="lkpd-materials"
          value={form.materials}
          onChange={(v) => set("materials", v)}
          rows={2}
          placeholder="Buku teks, LKPD, pulpen, kertas..."
        />

        <Textarea
          label="Langkah Kegiatan"
          id="lkpd-steps"
          value={form.steps}
          onChange={(v) => set("steps", v)}
          rows={4}
          placeholder="1. Guru membuka dengan pertanyaan pemandu...&#10;2. Peserta didik berdiskusi...&#10;3. Presentasi..."
        />

        <Textarea
          label="Pertanyaan Pemandu"
          id="lkpd-guiding"
          value={form.guidingQuestions}
          onChange={(v) => set("guidingQuestions", v)}
          rows={3}
          placeholder="Apa yang dimaksud dengan norma? Mengapa norma penting?"
        />

        <Textarea
          label="Penilaian"
          id="lkpd-assessment"
          value={form.assessment}
          onChange={(v) => set("assessment", v)}
          rows={2}
          placeholder="Observasi partisipasi, hasil diskusi, presentasi..."
        />

        <Textarea
          label="Catatan (opsional)"
          id="lkpd-notes"
          value={form.notes}
          onChange={(v) => set("notes", v)}
          rows={2}
        />

        <div className="flex gap-2">
          <Button onClick={handleSubmit}>Simpan Draft</Button>
          <Button variant="secondary" onClick={onCancel}>Batal</Button>
        </div>
      </div>
    </Card>
  );
}
