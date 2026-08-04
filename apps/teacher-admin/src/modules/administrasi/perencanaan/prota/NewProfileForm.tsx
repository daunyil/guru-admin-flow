/**
 * New Profile Form — modal dialog for creating a new Prota profile.
 */

import { useState } from "react";
import { Card, CardHeader, Input, Select, Button } from "@shared/ui";
import { saveProtaProfile } from "@shared/db/prota-repo";
import { getTeacherProfile } from "@shared/db/profile-repo";
import type { ProtaProfile } from "@guru-admin/domain";

export function NewProfileForm({
  academicYearId,
  onClose,
  onSaved,
  onError,
}: {
  academicYearId: string;
  onClose: () => void;
  onSaved: (p: ProtaProfile) => void;
  onError: (msg: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    subject: "",
    grade: "VII",
    phase: "D",
    annualIntraJP: 72,
    semester1IntraJP: 36,
    semester2IntraJP: 36,
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const teacher = await getTeacherProfile();
      if (!teacher) throw new Error("Profil guru belum diisi. Lengkapi di menu Profil.");
      const saved = await saveProtaProfile({
        academicYearId,
        teacherId: teacher.id,
        subject: form.subject,
        grade: form.grade,
        phase: form.phase,
        annualIntraJP: form.annualIntraJP,
        semester1IntraJP: form.semester1IntraJP,
        semester2IntraJP: form.semester2IntraJP,
        units: [],
        status: "draft",
        sourceYearId: null,
      });
      onSaved(saved);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Gagal membuat Prota.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="doc-overlay no-print" onClick={onClose} role="dialog" aria-modal="true" aria-label="Buat Prota Baru">
      <div className="doc-overlay-card" onClick={(e) => e.stopPropagation()}>
        <Card>
          <CardHeader title="Buat Prota Baru" description="Identitas dasar. Materi/units bisa ditambah setelah ini." />
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-3">
              <Input label="Mapel" id="p-subject" required value={form.subject} onChange={(v) => set("subject", v)} placeholder="Pendidikan Pancasila" />
              <Select label="Kelas" id="p-grade" value={form.grade} onChange={(v) => set("grade", v)}
                options={[{ value: "VII", label: "VII" }, { value: "VIII", label: "VIII" }, { value: "IX", label: "IX" }]} />
              <Select label="Fase" id="p-phase" value={form.phase} onChange={(v) => set("phase", v)}
                options={[{ value: "D", label: "D (VII-IX)" }]} />
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <Input label="Total JP Tahunan (intra)" id="p-annual" type="number" value={String(form.annualIntraJP)} onChange={(v) => set("annualIntraJP", Number(v) || 0)} />
              <Input label="JP Semester 1 (intra)" id="p-s1" type="number" value={String(form.semester1IntraJP)} onChange={(v) => set("semester1IntraJP", Number(v) || 0)} />
              <Input label="JP Semester 2 (intra)" id="p-s2" type="number" value={String(form.semester2IntraJP)} onChange={(v) => set("semester2IntraJP", Number(v) || 0)} />
            </div>
            <p className="text-xs text-slate-500">
              ℹ Untuk PPKn SMP: 72 JP intra + 36 JP KO = 108 JP total struktur. KO hanya catatan, tidak mempengaruhi validasi material.
            </p>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Buat Prota"}</Button>
              <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Batal</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
