/**
 * Modul M01 Profil: AcademicYearManager sub-component.
 * Sumber: docs/PROJECT_CONVENTION.md §4.1 (M01)
 */

import { useEffect, useState } from "react";
import { Card, CardHeader, Input, Button, EmptyState, Badge } from "../../shared/ui";
import {
  listAcademicYears,
  saveAcademicYear,
  setActiveAcademicYear,
} from "../../shared/db/profile-repo";
import type { AcademicYear } from "@guru-admin/domain";
import { formatLongDateID } from "@guru-admin/shared";
import { LoadingState } from "../../shared/ui";

export function AcademicYearManager() {
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

  if (loading) return <LoadingState />;

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
            <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-700" role="status" aria-live="polite">
              {error}
            </div>
          )}
          {saved && (
            <div className="p-3 rounded-md bg-brand-50 border border-brand-200 text-sm text-brand-700" role="status" aria-live="polite">
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
