import { useState } from "react";
import { Card, CardHeader, Input, Select, Button } from "../../shared/ui";
import { getTeacherProfile } from "../../shared/db/profile-repo";
import {
  saveTeachingSchedule,
  updateTeachingSchedule,
} from "../../shared/db/teaching-schedule-repo";
import type { TeachingSchedule } from "@guru-admin/domain";
import { DAY_LABELS_ID } from "@guru-admin/shared";

interface ScheduleFormProps {
  academicYearId: string;
  semester: 1 | 2;
  editing: TeachingSchedule | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ScheduleForm({
  academicYearId,
  semester,
  editing,
  onClose,
  onSaved,
}: ScheduleFormProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    subject: editing?.subject ?? "",
    classId: editing?.classId ?? "",
    classLabel: editing?.classLabel ?? "",
    dayOfWeek: editing?.dayOfWeek ?? 1,
    startPeriod: editing?.startPeriod ?? 1,
    durationJP: editing?.durationJP ?? 2,
    startTime: editing?.startTime ?? "07:00",
    endTime: editing?.endTime ?? "08:20",
    notes: editing?.notes ?? "",
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const teacher = await getTeacherProfile();
      if (!teacher) throw new Error("Profil guru belum diisi.");
      if (form.startTime >= form.endTime) throw new Error("startTime wajib < endTime");
      const data = {
        academicYearId,
        teacherId: teacher.id,
        subject: form.subject,
        classId: form.classId || form.classLabel,
        classLabel: form.classLabel,
        dayOfWeek: Number(form.dayOfWeek),
        startPeriod: Number(form.startPeriod),
        durationJP: Number(form.durationJP),
        startTime: form.startTime,
        endTime: form.endTime,
        semester,
        source: "manual" as const,
        notes: form.notes || undefined,
      };
      if (editing) {
        await updateTeachingSchedule(editing.id, data);
      } else {
        await saveTeachingSchedule(data);
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan jadwal.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title={editing ? "Edit Jadwal" : "Tambah Jadwal"} />
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Mapel" id="sc-subject" required value={form.subject} onChange={(v) => set("subject", v)} placeholder="Pendidikan Pancasila" />
          <Input label="Kelas (label)" id="sc-class" required value={form.classLabel} onChange={(v) => set("classLabel", v)} placeholder="VII A" />
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <Select label="Hari" id="sc-day" value={String(form.dayOfWeek)} onChange={(v) => set("dayOfWeek", Number(v))}
            options={[1,2,3,4,5,6,7].map((d) => ({ value: String(d), label: DAY_LABELS_ID[d] }))} />
          <Input label="Jam ke (mulai)" id="sc-period" type="number" value={String(form.startPeriod)} onChange={(v) => set("startPeriod", Number(v))} />
          <Input label="Durasi (JP)" id="sc-dur" type="number" value={String(form.durationJP)} onChange={(v) => set("durationJP", Number(v))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Mulai (HH:mm)" id="sc-start" value={form.startTime} onChange={(v) => set("startTime", v)} placeholder="07:00" />
          <Input label="Selesai (HH:mm)" id="sc-end" value={form.endTime} onChange={(v) => set("endTime", v)} placeholder="08:20" />
        </div>
        <Input label="Catatan (opsional)" id="sc-notes" value={form.notes} onChange={(v) => set("notes", v)} />
        {error && <div className="p-2 rounded bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>}
        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Batal</Button>
        </div>
      </form>
    </Card>
  );
}
