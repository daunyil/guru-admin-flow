/**
 * PromesFormView — form view when result is null.
 * Extracted from PromesPage.tsx lines 541-650.
 * Contains Header, profile incomplete warning, error banner, Card with form inputs,
 * empty states (no prota, no calendar), and rules info.
 */

import { Link } from "react-router-dom";
import { Card, CardHeader, Input, Select, Button, EmptyState } from "../../shared/ui";
import type {
  ProtaProfile,
  PromesOptions,
  AcademicYear,
} from "@guru-admin/domain";
import {
  KO_PROMES_MODE_OPTIONS,
} from "./usePromesState";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface PromesFormViewProps {
  activeYear: AcademicYear | null;
  profiles: ProtaProfile[];
  selectedProfileId: string;
  setSelectedProfileId: (v: string) => void;
  semester: 1 | 2;
  setSemester: (v: 1 | 2) => void;
  options: PromesOptions;
  setOptions: (v: PromesOptions) => void;
  generating: boolean;
  error: string | null;
  profileIncomplete: boolean;
  handleGenerate: () => void;
  calendarLength: number;
}

/* ------------------------------------------------------------------ */
/*  Header sub-component                                               */
/* ------------------------------------------------------------------ */

function Header({ yearLabel }: { yearLabel?: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Program Semester (Promes)</h1>
      <p className="text-sm text-slate-500 mt-1">
        {yearLabel ? `Tahun pelajaran: ${yearLabel}` : "Susun dari Prota + Kalender."}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PromesFormView                                                     */
/* ------------------------------------------------------------------ */

export function PromesFormView({
  activeYear,
  profiles,
  selectedProfileId,
  setSelectedProfileId,
  semester,
  setSemester,
  options,
  setOptions,
  generating,
  error,
  profileIncomplete,
  handleGenerate,
  calendarLength,
}: PromesFormViewProps) {
  return (
    <div className="space-y-4">
      <Header yearLabel={activeYear?.label ?? ""} />

      {profileIncomplete && (
        <Card className="border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <span className="text-amber-600 text-xl">⚠</span>
            <div>
              <p className="font-semibold text-amber-900">Belum ada tahun pelajaran aktif</p>
              <p className="text-sm text-amber-800 mt-1">Buat tahun pelajaran aktif dulu atau gunakan data contoh agar fitur Promes bisa dipakai.</p>
              <Link to="/profile"><Button variant="secondary" className="text-sm mt-2">Lengkapi Profil</Button></Link>
            </div>
          </div>
        </Card>
      )}

      {error && <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-700" role="status" aria-live="polite">{error}</div>}

      <Card>
        <CardHeader title="Susun Promes" description="Promes = Prota + Kalender + options. Generate on-demand (tidak persist)." />

        {profiles.length === 0 ? (
          <EmptyState
            title="Belum ada Prota"
            description="Buat Prota dulu di menu Prota sebelum generate Promes. Promes butuh daftar materi yang akan didistribusi per minggu."
            action={<Button variant="secondary" onClick={() => (window.location.hash = "#/prota")}>Buka Prota</Button>}
          />
        ) : calendarLength === 0 ? (
          <EmptyState
            title="Belum ada event kalender"
            description="Impor kalender dulu di menu Kalender sebelum generate Promes. Promes butuh kalender untuk menghitung minggu efektif."
            action={<Button variant="secondary" onClick={() => (window.location.hash = "#/calendar")}>Buka Kalender</Button>}
          />
        ) : (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <Select
                label="Prota (Mapel - Kelas)"
                id="pp-prota"
                value={selectedProfileId}
                onChange={setSelectedProfileId}
                options={profiles.map((p) => ({ value: p.id, label: `${p.subject} — ${p.grade}` }))}
              />
              <Select
                label="Semester"
                id="pp-sem"
                value={String(semester)}
                onChange={(v) => setSemester(Number(v) as 1 | 2)}
                options={[{value:"1",label:"Semester 1"},{value:"2",label:"Semester 2"}]}
              />
            </div>

            <div className="grid sm:grid-cols-4 gap-3">
              <Input
                label="Intra JP/Minggu"
                id="pp-intra"
                type="number"
                value={String(options.intraJpPerWeek)}
                onChange={(v) => setOptions({ ...options, intraJpPerWeek: Number(v) || 0 })}
                hint="PPKn: 2 (materi)"
              />
              <Input
                label="KO JP/Minggu"
                id="pp-ko"
                type="number"
                value={String(options.koJpPerWeek)}
                onChange={(v) => setOptions({ ...options, koJpPerWeek: Number(v) || 0 })}
                hint="PPKn: 1 (row terpisah)"
              />
              <Input
                label="Cadangan (JP)"
                id="pp-cad"
                type="number"
                value={String(options.cadanganJP)}
                onChange={(v) => setOptions({ ...options, cadanganJP: Number(v) || 0 })}
                hint="Dari intra, bukan total"
              />
              <Select
                label="Mode KO"
                id="pp-komode"
                value={options.koMode ?? "end_of_week"}
                onChange={(v) => setOptions({ ...options, koMode: v as PromesOptions["koMode"] })}
                options={KO_PROMES_MODE_OPTIONS}
                hint="Pilih KO per minggu atau diblok di akhir semester"
              />
            </div>

            <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800">
              ⚠️ <strong>Aturan Promes (lihat §0 design doc):</strong> Material capacity = (minggu efektif × intra JP) − cadangan.
              KO tampil sebagai row terpisah, BUKAN mengurangi kapasitas materi. Cadangan dari INTRA, bukan total 3 JP.
            </div>

            {/* PROMES-LANDSCAPE-ONEPAGE-POLISH-02: aturan materi singkat untuk cetak 1 halaman */}
            <div className="p-3 rounded-md bg-sky-50 border border-sky-200 text-xs text-sky-800">
              <strong>Aturan materi Promes:</strong> untuk cetak landscape 1 halaman, isi materi sebaiknya singkat,
              maksimal 3–7 kata. Contoh: <em>Keanekaragaman dalam Bhinneka Tunggal Ika</em>.
              TP lengkap tetap disimpan di ATP/Prota.
            </div>

            <div className="flex gap-2">
              <Button onClick={handleGenerate} disabled={generating || profileIncomplete}>
                {generating ? "Menyusun..." : "Susun Promes"}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
