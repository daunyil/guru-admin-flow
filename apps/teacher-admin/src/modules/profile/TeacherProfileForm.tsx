/**
 * Modul M01 Profil: TeacherProfileForm sub-component.
 * Sumber: docs/PROJECT_CONVENTION.md §4.1 (M01)
 */

import { useEffect, useState } from "react";
import { Card, CardHeader, Input, Select, Button } from "../../shared/ui";
import { getTeacherProfile, saveTeacherProfile } from "../../shared/db/profile-repo";
import { LoadingState } from "../../shared/ui";
import type { TeacherProfile } from "@guru-admin/domain";
import type { TeacherProfileFormFields } from "./profile-types";

export function TeacherProfileForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<TeacherProfileFormFields>({
    name: "",
    nip: "",
    email: "",
    phone: "",
    employeeStatus: "pns",
    subjects: [{ subject: "", grades: [], phases: [] }],
    homeroomClassId: "",
    signature: "",
    photo: "",
  });

  useEffect(() => {
    void (async () => {
      const existing = await getTeacherProfile();
      if (existing) {
        setForm({
          name: existing.name,
          nip: existing.nip ?? "",
          email: existing.email ?? "",
          phone: existing.phone ?? "",
          employeeStatus: existing.employeeStatus,
          subjects: existing.subjects,
          homeroomClassId: existing.homeroomClassId ?? "",
          signature: existing.signature ?? "",
          photo: existing.photo ?? "",
        });
      }
      setLoading(false);
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await saveTeacherProfile({
        name: form.name,
        nip: form.nip || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        employeeStatus: form.employeeStatus,
        subjects: form.subjects,
        homeroomClassId: form.homeroomClassId || undefined,
        signature: form.signature || undefined,
        photo: form.photo || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan profil guru.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState />;

  const set = <K extends keyof TeacherProfileFormFields>(
    key: K,
    value: TeacherProfileFormFields[K]
  ) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardHeader title="Identitas Guru" description="Profil guru pemilik aplikasi. Single row di MVP v1." />
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Nama Lengkap" id="tName" required value={form.name} onChange={(v) => set("name", v)} placeholder="Dengan gelar" />
          <Input label="NIP" id="tNip" value={form.nip} onChange={(v) => set("nip", v)} hint="18 digit numerik bila ada." />
          <Input label="Email" id="tEmail" type="email" value={form.email} onChange={(v) => set("email", v)} />
          <Input label="Telepon" id="tPhone" value={form.phone} onChange={(v) => set("phone", v)} />
          <Select
            label="Status Kepegawaian"
            id="tStatus"
            value={form.employeeStatus}
            onChange={(v) => set("employeeStatus", v as TeacherProfile["employeeStatus"])}
            options={[
              { value: "pns", label: "PNS" },
              { value: "pppk", label: "PPPK" },
              { value: "honorer", label: "Honorer" },
              { value: "gtt", label: "GTT" },
              { value: "gty", label: "GTY" },
              { value: "other", label: "Lainnya" },
            ]}
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Mata Pelajaran yang Diajar" description="Minimal 1. Format grades & phases: pisahkan dengan koma." />
        <div className="space-y-3">
          {form.subjects.map((s, idx) => (
            <div key={idx} className="grid sm:grid-cols-3 gap-3 p-3 border border-slate-200 rounded-md">
              <Input
                label="Mapel"
                id={`subject-${idx}`}
                required
                value={s.subject}
                onChange={(v) => {
                  const next = [...form.subjects];
                  next[idx] = { ...next[idx], subject: v };
                  set("subjects", next);
                }}
                placeholder="Pendidikan Pancasila"
              />
              <Input
                label="Kelas"
                id={`grades-${idx}`}
                required
                value={s.grades.join(", ")}
                onChange={(v) => {
                  const next = [...form.subjects];
                  next[idx] = { ...next[idx], grades: v.split(",").map((g) => g.trim()).filter(Boolean) };
                  set("subjects", next);
                }}
                placeholder="VII, VIII"
              />
              <Input
                label="Fase"
                id={`phases-${idx}`}
                required
                value={s.phases.join(", ")}
                onChange={(v) => {
                  const next = [...form.subjects];
                  next[idx] = { ...next[idx], phases: v.split(",").map((g) => g.trim()).filter(Boolean) };
                  set("subjects", next);
                }}
                placeholder="D"
              />
            </div>
          ))}
          <Button
            variant="secondary"
            onClick={() =>
              set("subjects", [...form.subjects, { subject: "", grades: [], phases: [] }])
            }
          >
            + Tambah Mapel
          </Button>
        </div>
      </Card>

      {error && (
        <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-700" role="status" aria-live="polite">
          {error}
        </div>
      )}
      {saved && (
        <div className="p-3 rounded-md bg-brand-50 border border-brand-200 text-sm text-brand-700" role="status" aria-live="polite">
          Profil guru tersimpan di perangkat.
        </div>
      )}

      <Button type="submit" disabled={saving}>
        {saving ? "Menyimpan..." : "Simpan Profil Guru"}
      </Button>
    </form>
  );
}
