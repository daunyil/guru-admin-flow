/**
 * Modul M01 Profil: SchoolProfileForm sub-component.
 * Sumber: docs/PROJECT_CONVENTION.md §4.1 (M01)
 */

import { useEffect, useState } from "react";
import { Card, CardHeader, Input, Textarea, Button, } from "../../shared/ui";
import { getSchoolProfile, saveSchoolProfile } from "../../shared/db/profile-repo";
import { LoadingState } from "../../shared/ui";
import type { SchoolProfileFormFields } from "./profile-types";

export function SchoolProfileForm() {
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

  if (loading) return <LoadingState />;

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
        <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-700" role="status" aria-live="polite">
          {error}
        </div>
      )}
      {saved && (
        <div className="p-3 rounded-md bg-brand-50 border border-brand-200 text-sm text-brand-700" role="status" aria-live="polite">
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
