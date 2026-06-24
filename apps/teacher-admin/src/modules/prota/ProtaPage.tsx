/**
 * Modul M03 Prota — halaman /prota
 * Sumber: docs/SPRINT_2_DESIGN.md §4
 *
 * Filosofi: Prota adalah sumber kebenaran untuk materi, JP, dan tujuan pembelajaran.
 * KO (kokurikuler) hanya catatan struktur, BUKAN bagian dari validasi material.
 */

import { useEffect, useState } from "react";
import { Card, CardHeader, Input, Select, Textarea, Button, EmptyState, Badge } from "../../shared/ui";
import {
  listProtaProfiles,
  saveProtaProfile,
  saveProtaUnit,
  deleteProtaUnit,
  updateProtaProfile,
  setProtaProfileStatus,
  importProtaFromJSON,
} from "../../shared/db/prota-repo";
import { getActiveAcademicYear, getTeacherProfile } from "../../shared/db/profile-repo";
import type { ProtaProfile, ProtaUnit } from "@guru-admin/domain";
import { sumJP, validateJPTotal } from "@guru-admin/shared";
import { parseProtaExcelPaste, type ProtaExcelParseResult } from "@guru-admin/domain";

export function ProtaPage() {
  const [loading, setLoading] = useState(true);
  const [activeYearId, setActiveYearId] = useState<string | null>(null);
  const [activeYearLabel, setActiveYearLabel] = useState<string>("");
  const [profiles, setProfiles] = useState<ProtaProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function reload() {
    if (!activeYearId) return;
    const ps = await listProtaProfiles(activeYearId);
    setProfiles(ps);
    if (selectedId && !ps.find((p) => p.id === selectedId)) {
      setSelectedId(null);
    }
  }

  useEffect(() => {
    void (async () => {
      const year = await getActiveAcademicYear();
      if (year) {
        setActiveYearId(year.id);
        setActiveYearLabel(year.label);
        const ps = await listProtaProfiles(year.id);
        setProfiles(ps);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (error) setTimeout(() => setError(null), 5000);
    if (success) setTimeout(() => setSuccess(null), 3000);
  }, [error, success]);

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;

  if (!activeYearId) {
    return (
      <div className="space-y-4">
        <Header />
        <Card>
          <EmptyState
            title="Belum ada tahun pelajaran aktif"
            description="Buat tahun pelajaran aktif dulu di menu Profil."
          />
        </Card>
      </div>
    );
  }

  const selected = profiles.find((p) => p.id === selectedId);

  return (
    <div className="space-y-4">
      <Header yearLabel={activeYearLabel} count={profiles.length} />

      {error && <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-700">{error}</div>}
      {success && <div className="p-3 rounded-md bg-brand-50 border border-brand-200 text-sm text-brand-700">{success}</div>}

      <div className="flex gap-2 flex-wrap">
        <Button onClick={() => setShowNew(true)}>+ Buat Prota Baru</Button>
        <Button variant="secondary" onClick={() => setShowImport(true)}>Impor JSON</Button>
      </div>

      {showNew && (
        <NewProfileForm
          academicYearId={activeYearId}
          onClose={() => setShowNew(false)}
          onSaved={(p) => {
            setShowNew(false);
            setSelectedId(p.id);
            setSuccess(`Prota "${p.subject} - ${p.grade}" berhasil dibuat.`);
            void reload();
          }}
          onError={(msg) => setError(msg)}
        />
      )}

      {showImport && (
        <ImportModal
          academicYearId={activeYearId}
          onClose={() => setShowImport(false)}
          onImported={(p) => {
            setShowImport(false);
            setSelectedId(p.id);
            setSuccess(`Prota "${p.subject} - ${p.grade}" berhasil diimpor.`);
            void reload();
          }}
          onError={(errs) => setError(errs.join("; "))}
        />
      )}

      <Card>
        <CardHeader title="Daftar Prota" description={`${profiles.length} Prota untuk tahun pelajaran ${activeYearLabel}`} />
        {profiles.length === 0 ? (
          <EmptyState
            title="Belum ada Prota"
            description="Buat Prota baru manual atau impor dari JSON hasil AI."
          />
        ) : (
          <div className="space-y-2">
            {profiles.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`w-full text-left p-3 border rounded-md transition-colors ${
                  selectedId === p.id
                    ? "border-brand-400 bg-brand-50"
                    : "border-slate-200 hover:border-brand-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-slate-900">{p.subject} — Kelas {p.grade}</span>
                    <Badge variant={statusBadge(p.status)}>{statusLabel(p.status)}</Badge>
                  </div>
                  <span className="text-xs text-slate-500">
                    {p.units.length} unit · {sumJP(p.units)} JP
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      {selected && (
        <ProfileDetail
          profile={selected}
          onChanged={() => { void reload(); }}
          onError={(msg) => setError(msg)}
          onSuccess={(msg) => setSuccess(msg)}
        />
      )}
    </div>
  );
}

function Header({ yearLabel, count }: { yearLabel?: string; count?: number }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Program Tahunan (Prota)</h1>
      <p className="text-sm text-slate-500 mt-1">
        {yearLabel ? `Tahun pelajaran aktif: ${yearLabel} · ${count ?? 0} Prota` : "Sumber kebenaran untuk materi dan JP."}
      </p>
    </div>
  );
}

function statusBadge(status: ProtaProfile["status"]): "success" | "warning" | "error" | "neutral" {
  switch (status) {
    case "draft": return "neutral";
    case "ready_for_review": return "warning";
    case "final": return "success";
    case "revised": return "warning";
    case "locked": return "success";
  }
}

function statusLabel(status: ProtaProfile["status"]): string {
  switch (status) {
    case "draft": return "Draft";
    case "ready_for_review": return "Ready for Review";
    case "final": return "Final";
    case "revised": return "Revised";
    case "locked": return "Locked";
  }
}

/* ------------------------------------------------------------------ */
/*  New Profile Form                                                   */
/* ------------------------------------------------------------------ */

function NewProfileForm({
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
    <Card>
      <CardHeader title="Buat Prota Baru" description="Identitas dasar. Materi/units bisa ditambah setelah ini." />
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-3 gap-3">
          <Input label="Mapel" id="p-subject" required value={form.subject} onChange={(v) => set("subject", v)} placeholder="Pendidikan Pancasila" />
          <Select label="Kelas" id="p-grade" value={form.grade} onChange={(v) => set("grade", v)}
            options={[{value:"VII",label:"VII"},{value:"VIII",label:"VIII"},{value:"IX",label:"IX"}]} />
          <Select label="Fase" id="p-phase" value={form.phase} onChange={(v) => set("phase", v)}
            options={[{value:"D",label:"D (VII-IX)"}]} />
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
  );
}

/* ------------------------------------------------------------------ */
/*  Profile Detail (identity + units + validation + status)            */
/* ------------------------------------------------------------------ */

function ProfileDetail({
  profile,
  onChanged,
  onError,
  onSuccess,
}: {
  profile: ProtaProfile;
  onChanged: () => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}) {
  const [tab, setTab] = useState<"identity" | "units" | "status">("units");
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState<ProtaUnit | null>(null);

  const s1Units = profile.units.filter((u) => u.semester === 1);
  const s2Units = profile.units.filter((u) => u.semester === 2);
  const s1Validation = validateJPTotal(profile.semester1IntraJP, s1Units);
  const s2Validation = validateJPTotal(profile.semester2IntraJP, s2Units);

  return (
    <Card>
      <CardHeader
        title={`${profile.subject} — Kelas ${profile.grade}`}
        description={`Fase ${profile.phase} · ${profile.units.length} unit · Status: ${statusLabel(profile.status)}`}
      />

      <div className="flex gap-1 border-b border-slate-200 mb-4">
        <TabButton active={tab === "identity"} onClick={() => setTab("identity")}>Identitas</TabButton>
        <TabButton active={tab === "units"} onClick={() => setTab("units")}>Materi ({profile.units.length})</TabButton>
        <TabButton active={tab === "status"} onClick={() => setTab("status")}>Status Dokumen</TabButton>
      </div>

      {tab === "identity" && (
        <IdentityTab profile={profile} onChanged={onChanged} onError={onError} onSuccess={onSuccess} />
      )}

      {tab === "units" && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <SemesterBlock
              title="Semester 1"
              target={profile.semester1IntraJP}
              units={s1Units}
              validation={s1Validation}
              onAdd={() => { setEditingUnit(null); setShowUnitForm(true); }}
              onEdit={(u) => { setEditingUnit(u); setShowUnitForm(true); }}
              onDelete={async (u) => {
                if (confirm(`Hapus unit "${u.title}"?`)) {
                  await deleteProtaUnit(u.id);
                  onChanged();
                  onSuccess("Unit dihapus.");
                }
              }}
            />
            <SemesterBlock
              title="Semester 2"
              target={profile.semester2IntraJP}
              units={s2Units}
              validation={s2Validation}
              onAdd={() => { setEditingUnit(null); setShowUnitForm(true); }}
              onEdit={(u) => { setEditingUnit(u); setShowUnitForm(true); }}
              onDelete={async (u) => {
                if (confirm(`Hapus unit "${u.title}"?`)) {
                  await deleteProtaUnit(u.id);
                  onChanged();
                  onSuccess("Unit dihapus.");
                }
              }}
            />
          </div>

          {showUnitForm && (
            <UnitForm
              profile={profile}
              editing={editingUnit}
              onClose={() => { setShowUnitForm(false); setEditingUnit(null); }}
              onSaved={() => { setShowUnitForm(false); setEditingUnit(null); onChanged(); }}
              onError={onError}
            />
          )}
        </div>
      )}

      {tab === "status" && (
        <StatusTab profile={profile} onChanged={onChanged} onError={onError} onSuccess={onSuccess} />
      )}
    </Card>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}

function SemesterBlock({
  title,
  target,
  units,
  validation,
  onAdd,
  onEdit,
  onDelete,
}: {
  title: string;
  target: number;
  units: ProtaUnit[];
  validation: ReturnType<typeof validateJPTotal>;
  onAdd: () => void;
  onEdit: (u: ProtaUnit) => void;
  onDelete: (u: ProtaUnit) => void;
}) {
  return (
    <div className="border border-slate-200 rounded-md p-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-sm">{title}</h4>
        <Button variant="secondary" className="text-xs px-2 py-1" onClick={onAdd}>+ Tambah</Button>
      </div>
      <div className="text-xs mb-2">
        Subtotal: <strong>{validation.actual} JP</strong> / target {target} JP{" "}
        <Badge variant={validation.status === "valid" ? "success" : "warning"}>
          {validation.status === "valid" ? "✓ Tepat" : `⚠ ${validation.diff > 0 ? `Kurang ${validation.diff}` : `Lebih ${Math.abs(validation.diff)}`} JP`}
        </Badge>
      </div>
      {units.length === 0 ? (
        <p className="text-xs text-slate-400 italic">Belum ada unit.</p>
      ) : (
        <ul className="space-y-1">
          {units.map((u) => (
            <li key={u.id} className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded">
              <div className="flex-1 min-w-0">
                <span className="font-medium">{u.order}. {u.title}</span>
                <span className="text-slate-500 ml-2">({u.jp} JP)</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => onEdit(u)} className="text-brand-600 hover:underline">edit</button>
                <button onClick={() => onDelete(u)} className="text-rose-600 hover:underline">hapus</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function UnitForm({
  profile,
  editing,
  onClose,
  onSaved,
  onError,
}: {
  profile: ProtaProfile;
  editing: ProtaUnit | null;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    semester: editing?.semester ?? (1 as 1 | 2),
    title: editing?.title ?? "",
    jp: editing?.jp ?? 2,
    order: editing?.order ?? (profile.units.filter((u) => u.semester === (editing?.semester ?? 1)).length + 1),
    code: editing?.code ?? "",
    learningOutcome: editing?.learningOutcome ?? "",
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await saveProtaUnit(profile.id, {
        id: editing?.id,
        semester: form.semester,
        title: form.title,
        jp: form.jp,
        order: form.order,
        code: form.code || undefined,
        learningOutcome: form.learningOutcome || undefined,
      });
      onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Gagal menyimpan unit.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title={editing ? "Edit Unit" : "Tambah Unit"} />
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <Select label="Semester" id="u-sem" value={String(form.semester)} onChange={(v) => set("semester", Number(v) as 1 | 2)}
            options={[{value:"1",label:"Semester 1"},{value:"2",label:"Semester 2"}]} />
          <Input label="Urutan (order)" id="u-order" type="number" value={String(form.order)} onChange={(v) => set("order", Number(v) || 1)} />
        </div>
        <Input label="Judul Materi/TP" id="u-title" required value={form.title} onChange={(v) => set("title", v)} placeholder="Budaya Demokrasi" />
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="JP" id="u-jp" type="number" value={String(form.jp)} onChange={(v) => set("jp", Number(v) || 1)} hint="Bilangan bulat positif" />
          <Input label="Kode (opsional)" id="u-code" value={form.code} onChange={(v) => set("code", v)} placeholder="PP.7.1" />
        </div>
        <Textarea label="Tujuan Pembelajaran (opsional)" id="u-lo" value={form.learningOutcome} onChange={(v) => set("learningOutcome", v)} rows={3} />
        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Batal</Button>
        </div>
      </form>
    </Card>
  );
}

function IdentityTab({
  profile,
  onChanged,
  onError,
  onSuccess,
}: {
  profile: ProtaProfile;
  onChanged: () => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    subject: profile.subject,
    grade: profile.grade,
    phase: profile.phase,
    annualIntraJP: profile.annualIntraJP,
    semester1IntraJP: profile.semester1IntraJP,
    semester2IntraJP: profile.semester2IntraJP,
    annualCocurricularJP: profile.annualCocurricularJP ?? 0,
    semester1CocurricularJP: profile.semester1CocurricularJP ?? 0,
    semester2CocurricularJP: profile.semester2CocurricularJP ?? 0,
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function handleSave() {
    setSaving(true);
    try {
      await updateProtaProfile(profile.id, {
        subject: form.subject,
        grade: form.grade,
        phase: form.phase,
        annualIntraJP: form.annualIntraJP,
        semester1IntraJP: form.semester1IntraJP,
        semester2IntraJP: form.semester2IntraJP,
        annualCocurricularJP: form.annualCocurricularJP || undefined,
        semester1CocurricularJP: form.semester1CocurricularJP || undefined,
        semester2CocurricularJP: form.semester2CocurricularJP || undefined,
      });
      setEditing(false);
      onChanged();
      onSuccess("Identitas Prota disimpan.");
    } catch (e) {
      onError(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="space-y-3 text-sm">
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Mapel" value={profile.subject} />
          <Field label="Kelas" value={profile.grade} />
          <Field label="Fase" value={profile.phase} />
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Total JP Tahunan (intra)" value={`${profile.annualIntraJP} JP`} />
          <Field label="JP Semester 1 (intra)" value={`${profile.semester1IntraJP} JP`} />
          <Field label="JP Semester 2 (intra)" value={`${profile.semester2IntraJP} JP`} />
        </div>
        {profile.annualCocurricularJP !== undefined && (
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Total JP Tahunan (KO)" value={`${profile.annualCocurricularJP} JP`} />
            <Field label="JP Semester 1 (KO)" value={`${profile.semester1CocurricularJP ?? 0} JP`} />
            <Field label="JP Semester 2 (KO)" value={`${profile.semester2CocurricularJP ?? 0} JP`} />
          </div>
        )}
        <Button variant="secondary" onClick={() => setEditing(true)}>Edit Identitas</Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-3 gap-3">
        <Input label="Mapel" id="i-subject" value={form.subject} onChange={(v) => set("subject", v)} />
        <Select label="Kelas" id="i-grade" value={form.grade} onChange={(v) => set("grade", v)}
          options={[{value:"VII",label:"VII"},{value:"VIII",label:"VIII"},{value:"IX",label:"IX"}]} />
        <Select label="Fase" id="i-phase" value={form.phase} onChange={(v) => set("phase", v)}
          options={[{value:"D",label:"D"}]} />
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <Input label="Total JP Tahunan (intra)" id="i-annual" type="number" value={String(form.annualIntraJP)} onChange={(v) => set("annualIntraJP", Number(v) || 0)} />
        <Input label="JP Semester 1 (intra)" id="i-s1" type="number" value={String(form.semester1IntraJP)} onChange={(v) => set("semester1IntraJP", Number(v) || 0)} />
        <Input label="JP Semester 2 (intra)" id="i-s2" type="number" value={String(form.semester2IntraJP)} onChange={(v) => set("semester2IntraJP", Number(v) || 0)} />
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <Input label="Total JP Tahunan (KO)" id="i-ko-annual" type="number" value={String(form.annualCocurricularJP)} onChange={(v) => set("annualCocurricularJP", Number(v) || 0)} />
        <Input label="JP Semester 1 (KO)" id="i-ko-s1" type="number" value={String(form.semester1CocurricularJP)} onChange={(v) => set("semester1CocurricularJP", Number(v) || 0)} />
        <Input label="JP Semester 2 (KO)" id="i-ko-s2" type="number" value={String(form.semester2CocurricularJP)} onChange={(v) => set("semester2CocurricularJP", Number(v) || 0)} />
      </div>
      <p className="text-xs text-slate-500">
        ℹ KO hanya catatan struktur. Validasi material hanya pakai JP intrakurikuler.
      </p>
      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button>
        <Button variant="secondary" onClick={() => setEditing(false)} disabled={saving}>Batal</Button>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function StatusTab({
  profile,
  onChanged,
  onError,
  onSuccess,
}: {
  profile: ProtaProfile;
  onChanged: () => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}) {
  const s1Units = profile.units.filter((u) => u.semester === 1);
  const s2Units = profile.units.filter((u) => u.semester === 2);
  const s1Valid = validateJPTotal(profile.semester1IntraJP, s1Units).status === "valid";
  const s2Valid = validateJPTotal(profile.semester2IntraJP, s2Units).status === "valid";
  const allValid = s1Valid && s2Valid;

  async function transition(newStatus: ProtaProfile["status"]) {
    try {
      await setProtaProfileStatus(profile.id, newStatus);
      onChanged();
      onSuccess(`Status Prota diubah ke ${statusLabel(newStatus)}.`);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Gagal ubah status.");
    }
  }

  return (
    <div className="space-y-4 text-sm">
      <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
        <p className="font-medium mb-2">Validasi JP (untuk transisi ke Ready for Review):</p>
        <ul className="space-y-1 text-xs">
          <li>Semester 1: {s1Valid ? "✓" : "✗"} subtotal {sumJP(s1Units)} JP / target {profile.semester1IntraJP} JP</li>
          <li>Semester 2: {s2Valid ? "✓" : "✗"} subtotal {sumJP(s2Units)} JP / target {profile.semester2IntraJP} JP</li>
        </ul>
        {!allValid && profile.status === "draft" && (
          <p className="text-xs text-amber-600 mt-2">⚠ Validasi JP belum pass. Tidak bisa transisi ke Ready for Review.</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {profile.status === "draft" && (
          <Button
            disabled={!allValid}
            onClick={() => transition("ready_for_review")}
          >
            Tandai Ready for Review
          </Button>
        )}
        {profile.status === "ready_for_review" && (
          <>
            <Button variant="secondary" onClick={() => transition("draft")}>Kembali ke Draft</Button>
            <Button onClick={() => transition("final")}>Tandai Final</Button>
          </>
        )}
        {profile.status === "final" && (
          <>
            <Button variant="secondary" onClick={() => transition("revised")}>Buat Revisi</Button>
            <Button onClick={() => transition("locked")}>Lock Permanen</Button>
          </>
        )}
        {profile.status === "revised" && (
          <Button onClick={() => transition("final")}>Tandai Final Lagi</Button>
        )}
        {profile.status === "locked" && (
          <p className="text-xs text-slate-500 italic">Dokumen terkunci permanen. Tidak bisa diubah.</p>
        )}
      </div>

      {profile.status === "final" || profile.status === "locked" ? (
        <p className="text-xs text-slate-500">Dokumen sudah berstatus {statusLabel(profile.status)} (snapshot tersimpan).</p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Import Modal                                                       */
/* ------------------------------------------------------------------ */

function ImportModal({
  academicYearId,
  onClose,
  onImported,
  onError,
}: {
  academicYearId: string;
  onClose: () => void;
  onImported: (p: ProtaProfile) => void;
  onError: (errs: string[]) => void;
}) {
  const [mode, setMode] = useState<"json" | "excel">("json");
  const [jsonText, setJsonText] = useState("");
  const [excelText, setExcelText] = useState("");
  const [excelPreview, setExcelPreview] = useState<ProtaExcelParseResult | null>(null);
  const [excelMeta, setExcelMeta] = useState({
    subject: "",
    grade: "",
    phase: "",
    annualIntraJP: 0,
    semester1IntraJP: 0,
    semester2IntraJP: 0,
  });
  const [importing, setImporting] = useState(false);

  async function handleImport() {
    setImporting(true);
    try {
      const teacher = await getTeacherProfile();
      if (!teacher) {
        onError(["Profil guru belum diisi. Lengkapi di menu Profil dulu."]);
        setImporting(false);
        return;
      }

      if (mode === "json") {
        let parsed: unknown;
        try {
          parsed = JSON.parse(jsonText);
        } catch (e) {
          onError([`JSON tidak valid: ${e instanceof Error ? e.message : String(e)}`]);
          setImporting(false);
          return;
        }
        const result = await importProtaFromJSON(parsed, academicYearId, teacher.id);
        if (result.success && result.profile) {
          onImported(result.profile);
        } else {
          onError(result.errors);
        }
      } else {
        // Excel paste
        if (!excelPreview || excelPreview.units.length === 0) {
          onError(["Tidak ada unit valid untuk diimpor. Klik Preview dulu."]);
          setImporting(false);
          return;
        }
        if (!excelMeta.subject || !excelMeta.grade || !excelMeta.phase) {
          onError(["Subject, Grade, Phase wajib diisi untuk mode Excel paste."]);
          setImporting(false);
          return;
        }

        // P1-3: cek duplikat ProtaProfile (subject+grade+year sama).
        const existing = await listProtaProfiles(academicYearId);
        const duplicate = existing.find(
          (p) => p.subject === excelMeta.subject && p.grade === excelMeta.grade
        );
        if (duplicate) {
          onError([
            `Prota untuk ${excelMeta.subject} kelas ${excelMeta.grade} sudah ada (status: ${duplicate.status}). ` +
            `Hapus Prota yang lama dulu bila ingin import ulang, atau gunakan mode JSON (yang akan membuat profile baru terpisah).`,
          ]);
          setImporting(false);
          return;
        }

        // P1-4: validasi konsistensi JP (warning saja, tidak block).
        const jpInconsistency: string[] = [];
        if (
          excelMeta.annualIntraJP > 0 &&
          excelMeta.semester1IntraJP + excelMeta.semester2IntraJP !== excelMeta.annualIntraJP
        ) {
          jpInconsistency.push(
            `Warning: semester1 (${excelMeta.semester1IntraJP}) + semester2 (${excelMeta.semester2IntraJP}) ≠ annual (${excelMeta.annualIntraJP}).`
          );
        }

        // P0-2: konfirmasi sebelum apply.
        const ok = window.confirm(
          `Impor Prota ${excelMeta.subject} kelas ${excelMeta.grade} dengan ${excelPreview.units.length} unit? ` +
          (jpInconsistency.length > 0 ? jpInconsistency.join(" ") + " " : "") +
          `Lanjutkan?`
        );
        if (!ok) {
          setImporting(false);
          return;
        }

        // P0-3: pakai saveProtaProfile dengan units sekaligus (atomic transaction di repo).
        const profile = await saveProtaProfile({
          subject: excelMeta.subject,
          grade: excelMeta.grade,
          phase: excelMeta.phase,
          annualIntraJP: excelMeta.annualIntraJP,
          semester1IntraJP: excelMeta.semester1IntraJP,
          semester2IntraJP: excelMeta.semester2IntraJP,
          academicYearId,
          teacherId: teacher.id,
          units: excelPreview.units.map((u) => ({
            semester: u.semester,
            title: u.title,
            learningOutcome: u.learningOutcome,
            jp: u.jp,
            order: u.order,
            code: u.code,
          })),
          status: "draft",
          sourceYearId: null,
        });
        onImported(profile);
      }
    } finally {
      setImporting(false);
    }
  }

  function handleExcelPreview() {
    const result = parseProtaExcelPaste(excelText);
    setExcelPreview(result);
  }

  return (
    <Card>
      <CardHeader
        title="Impor Prota"
        description="Mode JSON (format guru-admin-flow/prota/v1) atau Excel paste. Prota baru akan dibuat dengan status draft."
      />
      <div className="space-y-3">
        <Select
          label="Mode Impor"
          id="prota-import-mode"
          value={mode}
          onChange={(v) => { setMode(v as "json" | "excel"); setExcelPreview(null); }}
          options={[
            { value: "json", label: "JSON (format guru-admin-flow/prota/v1)" },
            { value: "excel", label: "Excel Paste (tab/koma/semicolon)" },
          ]}
        />

        {mode === "json" ? (
          <Textarea
            label="JSON Prota"
            id="import-prota-json"
            value={jsonText}
            onChange={setJsonText}
            rows={12}
            placeholder={`{
  "$schema": "guru-admin-flow/prota/v1",
  "subject": "Pendidikan Pancasila",
  "grade": "VII",
  ...
}`}
          />
        ) : (
          <>
            <div className="grid sm:grid-cols-3 gap-3">
              <Input label="Subject" id="prota-excel-subject" value={excelMeta.subject} onChange={(v) => setExcelMeta({ ...excelMeta, subject: v })} />
              <Input label="Grade" id="prota-excel-grade" value={excelMeta.grade} onChange={(v) => setExcelMeta({ ...excelMeta, grade: v })} />
              <Input label="Phase" id="prota-excel-phase" value={excelMeta.phase} onChange={(v) => setExcelMeta({ ...excelMeta, phase: v })} />
              <Input label="Annual Intra JP" id="prota-excel-annual" type="number" value={String(excelMeta.annualIntraJP)} onChange={(v) => setExcelMeta({ ...excelMeta, annualIntraJP: Number(v) || 0 })} />
              <Input label="Sem 1 Intra JP" id="prota-excel-sem1" type="number" value={String(excelMeta.semester1IntraJP)} onChange={(v) => setExcelMeta({ ...excelMeta, semester1IntraJP: Number(v) || 0 })} />
              <Input label="Sem 2 Intra JP" id="prota-excel-sem2" type="number" value={String(excelMeta.semester2IntraJP)} onChange={(v) => setExcelMeta({ ...excelMeta, semester2IntraJP: Number(v) || 0 })} />
            </div>
            <Textarea
              label="Paste dari Excel (header: Semester, Materi, JP, Order, Code, Learning Outcome)"
              id="import-prota-excel"
              value={excelText}
              onChange={(v) => { setExcelText(v); setExcelPreview(null); }}
              rows={10}
              placeholder={"Semester\tMateri\tJP\tOrder\tCode\tLearning Outcome\n1\tBab 1: Norma\t2\t1\tM1\tMemahami norma\n2\tBab 3: Hukum\t2\t2\tM3\tMemahami hukum"}
            />
            <Button variant="secondary" className="text-sm" onClick={handleExcelPreview} disabled={!excelText.trim()}>
              Preview Parse
            </Button>
            {excelPreview && (
              <div className="p-3 bg-slate-50 rounded-md text-sm space-y-2">
                <p className="font-semibold text-emerald-700">
                  ✓ {excelPreview.units.length} unit siap diimpor
                  {excelPreview.skippedRows.length > 0 && (
                    <span className="text-amber-700"> · {excelPreview.skippedRows.length} baris di-skip</span>
                  )}
                </p>
                {excelPreview.skippedRows.length > 0 && (
                  <div className="max-h-32 overflow-y-auto text-xs text-rose-700">
                    <p className="font-semibold">Baris di-skip:</p>
                    {excelPreview.skippedRows.map((s, i) => (
                      <div key={i} className="p-1">Baris {s.lineNumber}: {s.reason}</div>
                    ))}
                  </div>
                )}
                {excelPreview.units.length > 0 && (
                  <div className="max-h-48 overflow-y-auto text-xs">
                    {excelPreview.units.map((u, i) => (
                      <div key={i} className="p-1 border-b border-slate-200">
                        S{u.semester} · <strong>{u.title}</strong> · {u.jp} JP · order {u.order}
                        {u.code && <span className="text-slate-500"> · {u.code}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleImport}
            disabled={
              importing ||
              (mode === "json" ? !jsonText.trim() : !excelPreview || excelPreview.units.length === 0)
            }
          >
            {importing ? "Mengimpor..." : "Impor Prota"}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={importing}>Batal</Button>
        </div>
      </div>
    </Card>
  );
}
