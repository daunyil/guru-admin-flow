/**
 * Modul M01 Profil: SchoolProfile + TeacherProfile + AcademicYear manager.
 * Sumber: docs/PROJECT_CONTRACT.md §4.1 (M01)
 */

import { useEffect, useState } from "react";
import { Card, CardHeader, Input, Select, Textarea, Button, EmptyState, Badge } from "../../shared/ui";
import {
  getSchoolProfile,
  getTeacherProfile,
  listAcademicYears,
  saveSchoolProfile,
  saveTeacherProfile,
  saveAcademicYear,
  setActiveAcademicYear,
} from "../../shared/db/profile-repo";
import type { TeacherProfile, AcademicYear } from "@guru-admin/domain";
import { formatLongDateID } from "@guru-admin/shared";

/** Field yang diedit di form SchoolProfile (semua string untuk konsistensi input). */
type SchoolProfileFormFields = {
  name: string;
  npsn: string;
  nss: string;
  address: string;
  village: string;
  district: string;
  regency: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
  website: string;
  headmasterName: string;
  headmasterNip: string;
  headmasterSignature: string;
  logo: string;
};

/** Field yang diedit di form TeacherProfile (optional → wajib string). */
type TeacherProfileFormFields = {
  name: string;
  nip: string;
  email: string;
  phone: string;
  employeeStatus: TeacherProfile["employeeStatus"];
  subjects: TeacherProfile["subjects"];
  homeroomClassId: string;
  signature: string;
  photo: string;
};

export function ProfilePage() {
  const [tab, setTab] = useState<"school" | "teacher" | "years">("school");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Profil</h1>
        <p className="text-sm text-slate-500 mt-1">
          Data master sekolah, guru, dan tahun pelajaran. Disimpan lokal di perangkat.
        </p>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        <TabButton active={tab === "school"} onClick={() => setTab("school")}>
          Sekolah
        </TabButton>
        <TabButton active={tab === "teacher"} onClick={() => setTab("teacher")}>
          Guru
        </TabButton>
        <TabButton active={tab === "years"} onClick={() => setTab("years")}>
          Tahun Pelajaran
        </TabButton>
      </div>

      {tab === "school" && <SchoolProfileForm />}
      {tab === "teacher" && <TeacherProfileForm />}
      {tab === "years" && <AcademicYearManager />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active
          ? "border-brand-600 text-brand-700"
          : "border-transparent text-slate-500 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  SchoolProfile form                                                */
/* ------------------------------------------------------------------ */

function SchoolProfileForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state — semua string kosong default. Optional fields di schema
  // di-normalize ke "" untuk konsistensi input.
  const [form, setForm] = useState<Record<keyof SchoolProfileFormFields, string>>({
    name: "",
    npsn: "",
    nss: "",
    address: "",
    village: "",
    district: "",
    regency: "",
    province: "",
    postalCode: "",
    phone: "",
    email: "",
    website: "",
    headmasterName: "",
    headmasterNip: "",
    headmasterSignature: "",
    logo: "",
  });

  useEffect(() => {
    void (async () => {
      const existing = await getSchoolProfile();
      if (existing) {
        setForm({
          name: existing.name ?? "",
          npsn: existing.npsn ?? "",
          nss: existing.nss ?? "",
          address: existing.address ?? "",
          village: existing.village ?? "",
          district: existing.district ?? "",
          regency: existing.regency ?? "",
          province: existing.province ?? "",
          postalCode: existing.postalCode ?? "",
          phone: existing.phone ?? "",
          email: existing.email ?? "",
          website: existing.website ?? "",
          headmasterName: existing.headmasterName ?? "",
          headmasterNip: existing.headmasterNip ?? "",
          headmasterSignature: existing.headmasterSignature ?? "",
          logo: existing.logo ?? "",
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
      await saveSchoolProfile({
        name: form.name,
        npsn: form.npsn,
        nss: form.nss || undefined,
        address: form.address,
        village: form.village,
        district: form.district,
        regency: form.regency,
        province: form.province,
        postalCode: form.postalCode || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        website: form.website || undefined,
        headmasterName: form.headmasterName,
        headmasterNip: form.headmasterNip || undefined,
        headmasterSignature: form.headmasterSignature || undefined,
        logo: form.logo || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan profil sekolah.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;

  const set = (key: keyof SchoolProfileFormFields, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card>
        <CardHeader title="Identitas Sekolah" description="Data master sekolah. Digunakan di semua dokumen." />
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Nama Sekolah" id="name" required value={form.name} onChange={(v) => set("name", v)} placeholder="SMPN 8 Bantan" />
          <Input label="NPSN" id="npsn" required value={form.npsn} onChange={(v) => set("npsn", v)} placeholder="8 digit numerik" hint="Nomor Pokok Sekolah Nasional, 8 digit." />
          <Input label="NSS" id="nss" value={form.nss} onChange={(v) => set("nss", v)} placeholder="Opsional" />
          <Input label="Kode Pos" id="postalCode" value={form.postalCode} onChange={(v) => set("postalCode", v)} />
          <Input label="Telepon" id="phone" value={form.phone} onChange={(v) => set("phone", v)} />
          <Input label="Email" id="email" type="email" value={form.email} onChange={(v) => set("email", v)} />
          <Input label="Website" id="website" value={form.website} onChange={(v) => set("website", v)} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Alamat" />
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Textarea label="Alamat Lengkap" id="address" required value={form.address} onChange={(v) => set("address", v)} rows={2} />
          </div>
          <Input label="Desa/Kelurahan" id="village" required value={form.village} onChange={(v) => set("village", v)} />
          <Input label="Kecamatan" id="district" required value={form.district} onChange={(v) => set("district", v)} />
          <Input label="Kabupaten/Kota" id="regency" required value={form.regency} onChange={(v) => set("regency", v)} />
          <Input label="Provinsi" id="province" required value={form.province} onChange={(v) => set("province", v)} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Kepala Sekolah" description="Berubah tiap tahun. Wajib diisi sebelum membuat dokumen resmi." />
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Nama Kepala Sekolah" id="headmasterName" required value={form.headmasterName} onChange={(v) => set("headmasterName", v)} />
          <Input label="NIP Kepala Sekolah" id="headmasterNip" value={form.headmasterNip} onChange={(v) => set("headmasterNip", v)} hint="18 digit numerik bila ada." />
        </div>
      </Card>

      {error && (
        <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-700">
          {error}
        </div>
      )}
      {saved && (
        <div className="p-3 rounded-md bg-brand-50 border border-brand-200 text-sm text-brand-700">
          Profil sekolah tersimpan di perangkat.
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Menyimpan..." : "Simpan Profil Sekolah"}
        </Button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  TeacherProfile form                                               */
/* ------------------------------------------------------------------ */

function TeacherProfileForm() {
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

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;

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
        <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-700">
          {error}
        </div>
      )}
      {saved && (
        <div className="p-3 rounded-md bg-brand-50 border border-brand-200 text-sm text-brand-700">
          Profil guru tersimpan di perangkat.
        </div>
      )}

      <Button type="submit" disabled={saving}>
        {saving ? "Menyimpan..." : "Simpan Profil Guru"}
      </Button>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  AcademicYear manager                                              */
/* ------------------------------------------------------------------ */

function AcademicYearManager() {
  const [loading, setLoading] = useState(true);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Form state
  const [label, setLabel] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [s1Start, setS1Start] = useState("");
  const [s1End, setS1End] = useState("");
  const [s2Start, setS2Start] = useState("");
  const [s2End, setS2End] = useState("");

  async function reload() {
    setLoading(true);
    const ys = await listAcademicYears();
    setYears(ys.sort((a, b) => b.label.localeCompare(a.label)));
    setLoading(false);
  }

  useEffect(() => {
    void reload();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await saveAcademicYear({
        label,
        startDate,
        endDate,
        semester1Start: s1Start,
        semester1End: s1End,
        semester2Start: s2Start,
        semester2End: s2End,
        active: true, // selalu aktifkan tahun baru
        sourceYearId: null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      // Reset form
      setLabel(""); setStartDate(""); setEndDate("");
      setS1Start(""); setS1End(""); setS2Start(""); setS2End("");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan tahun pelajaran.");
    } finally {
      setSaving(false);
    }
  }

  async function handleActivate(id: string) {
    await setActiveAcademicYear(id);
    await reload();
  }

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Tahun Pelajaran Aktif"
          description="Hanya satu tahun pelajaran yang dapat aktif. Tahun lama otomatis di-nonaktifkan."
        />
        {years.length === 0 ? (
          <EmptyState
            title="Belum ada tahun pelajaran"
            description="Buat tahun pelajaran pertama di bawah, atau gunakan wizard Tahun Baru untuk menyalin dari tahun lalu."
          />
        ) : (
          <div className="space-y-2">
            {years.map((y) => (
              <div
                key={y.id}
                className="flex items-center justify-between p-3 border border-slate-200 rounded-md"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{y.label}</span>
                    {y.active && <Badge variant="success">Aktif</Badge>}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatLongDateID(y.startDate)} — {formatLongDateID(y.endDate)}
                  </p>
                </div>
                {!y.active && (
                  <Button variant="secondary" onClick={() => handleActivate(y.id)}>
                    Aktifkan
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Buat Tahun Pelajaran Baru (Manual)" description="Untuk menyalin dari tahun lalu, gunakan menu Tahun Baru." />
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Label Tahun Pelajaran"
              id="ayLabel"
              required
              value={label}
              onChange={setLabel}
              placeholder="2025/2026"
              hint="Format: YYYY/YYYY"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Mulai" id="ayStart" type="date" required value={startDate} onChange={setStartDate} />
              <Input label="Selesai" id="ayEnd" type="date" required value={endDate} onChange={setEndDate} />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Semester 1 Mulai" id="s1s" type="date" required value={s1Start} onChange={setS1Start} />
              <Input label="Semester 1 Selesai" id="s1e" type="date" required value={s1End} onChange={setS1End} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Semester 2 Mulai" id="s2s" type="date" required value={s2Start} onChange={setS2Start} />
              <Input label="Semester 2 Selesai" id="s2e" type="date" required value={s2End} onChange={setS2End} />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-700">
              {error}
            </div>
          )}
          {saved && (
            <div className="p-3 rounded-md bg-brand-50 border border-brand-200 text-sm text-brand-700">
              Tahun pelajaran tersimpan &amp; diaktifkan.
            </div>
          )}

          <Button type="submit" disabled={saving}>
            {saving ? "Menyimpan..." : "Buat & Aktifkan"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
