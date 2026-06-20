/**
 * Modul M04 Promes — halaman /promes
 * Sumber: docs/SPRINT_2_DESIGN.md §5, §6
 *
 * KRITIS (lihat §0 CRITICAL PROMES RULE):
 *   - Material capacity pakai INTRA JP (intraJpPerWeek), BUKAN total 3 JP
 *   - KO tampil sebagai row terpisah, koTotalJP TIDAK mengurangi materialCapacityJP
 *   - Cadangan dari INTRA capacity, tidak boleh membuat materialCapacityJP negatif
 */

import { useEffect, useState } from "react";
import { Card, CardHeader, Input, Select, Button, EmptyState, Badge } from "../../shared/ui";
import { listProtaProfiles } from "../../shared/db/prota-repo";
import { listCalendarEvents } from "../../shared/db/calendar-repo";
import { getActiveAcademicYear } from "../../shared/db/profile-repo";
import { generatePromes } from "@guru-admin/domain";
import type { ProtaProfile, CalendarEvent, AcademicYear, PromesResult, PromesOptions } from "@guru-admin/domain";
import {
  formatLongDateID,
  DEFAULT_INTRA_JP_PER_WEEK_PPKN,
  DEFAULT_KO_JP_PER_WEEK_PPKN,
  DEFAULT_CADANGAN_JP,
  KO_MODES,
  KO_MODE_LABELS_ID,
} from "@guru-admin/shared";

export function PromesPage() {
  const [loading, setLoading] = useState(true);
  const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
  const [profiles, setProfiles] = useState<ProtaProfile[]>([]);
  const [calendar, setCalendar] = useState<CalendarEvent[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [semester, setSemester] = useState<1 | 2>(1);
  const [options, setOptions] = useState<PromesOptions>({
    intraJpPerWeek: DEFAULT_INTRA_JP_PER_WEEK_PPKN,
    koJpPerWeek: DEFAULT_KO_JP_PER_WEEK_PPKN,
    cadanganJP: DEFAULT_CADANGAN_JP,
    reserveFromEnd: true,
    koMode: "daily_block",
  });
  const [result, setResult] = useState<PromesResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const year = await getActiveAcademicYear();
      if (year) {
        setActiveYear(year);
        const [ps, cal] = await Promise.all([
          listProtaProfiles(year.id),
          listCalendarEvents(year.id),
        ]);
        setProfiles(ps);
        setCalendar(cal);
        if (ps.length > 0) setSelectedProfileId(ps[0].id);
      }
      setLoading(false);
    })();
  }, []);

  async function handleGenerate() {
    if (!activeYear) return;
    const profile = profiles.find((p) => p.id === selectedProfileId);
    if (!profile) {
      setError("Pilih Prota dulu.");
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const r = generatePromes({
        prota: profile,
        academicYear: activeYear,
        calendar,
        semester,
        options,
      });
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal generate Promes.");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;

  if (!activeYear) {
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

  return (
    <div className="space-y-4">
      <Header yearLabel={activeYear.label} />

      {error && <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-700">{error}</div>}

      <Card>
        <CardHeader title="Generate Promes" description="Promes = Prota + Kalender + options. Generate on-demand (tidak persist)." />

        {profiles.length === 0 ? (
          <EmptyState
            title="Belum ada Prota"
            description="Buat Prota dulu di menu Prota sebelum generate Promes."
          />
        ) : calendar.length === 0 ? (
          <EmptyState
            title="Belum ada event kalender"
            description="Impor kalender dulu di menu Kalender sebelum generate Promes."
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
                value={options.koMode ?? "daily_block"}
                onChange={(v) => setOptions({ ...options, koMode: v as PromesOptions["koMode"] })}
                options={KO_MODES.map((m) => ({ value: m, label: KO_MODE_LABELS_ID[m] }))}
              />
            </div>

            <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800">
              ⚠️ <strong>Aturan Promes (lihat §0 design doc):</strong> Material capacity = (minggu efektif × intra JP) − cadangan.
              KO tampil sebagai row terpisah, BUKAN mengurangi kapasitas materi. Cadangan dari INTRA, bukan total 3 JP.
            </div>

            <div className="flex gap-2">
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? "Generating..." : "Generate Promes"}
              </Button>
              {result && (
                <Button variant="secondary" onClick={() => window.print()}>
                  Cetak Preview
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>

      {result && <ResultView result={result} />}
    </div>
  );
}

function Header({ yearLabel }: { yearLabel?: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Program Semester (Promes)</h1>
      <p className="text-sm text-slate-500 mt-1">
        {yearLabel ? `Tahun pelajaran: ${yearLabel}` : "Generate dari Prota + Kalender."}
      </p>
    </div>
  );
}

function ResultView({ result }: { result: PromesResult }) {
  const { summary, status, errors, warnings, weeks, distribution, koRows } = result;

  return (
    <div className="space-y-4">
      {/* Status */}
      <Card>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium">Status:</span>
          {status === "valid" ? (
            <Badge variant="success">✓ Valid ({summary.allocationStatus})</Badge>
          ) : (
            <Badge variant="warning">⚠ Perlu Perbaikan</Badge>
          )}
          <span className="text-xs text-slate-500">
            {summary.effectiveWeeks} dari {summary.totalWeeks} minggu efektif
          </span>
        </div>

        {errors.length > 0 && (
          <div className="mt-3 p-3 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-700">
            <p className="font-medium mb-1">Error:</p>
            <ul className="list-disc pl-5 space-y-0.5 text-xs">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="mt-3 p-3 rounded-md bg-amber-50 border border-amber-200 text-sm text-amber-700">
            <p className="font-medium mb-1">Peringatan:</p>
            <ul className="list-disc pl-5 space-y-0.5 text-xs">
              {warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader title="Ringkasan" />
        <div className="grid sm:grid-cols-2 gap-6 text-sm">
          <div>
            <h4 className="font-medium text-brand-800 mb-2">Intrakurikuler (Materi)</h4>
            <dl className="space-y-1 text-xs">
              <div className="flex justify-between"><dt>Total minggu:</dt><dd>{summary.totalWeeks}</dd></div>
              <div className="flex justify-between"><dt>Minggu efektif:</dt><dd>{summary.effectiveWeeks}</dd></div>
              <div className="flex justify-between"><dt>Kapasitas intra:</dt><dd>{summary.intraCapacityJP} JP ({summary.effectiveWeeks} × {summary.effectiveWeeks > 0 ? summary.intraCapacityJP / summary.effectiveWeeks : 0} JP/minggu)</dd></div>
              <div className="flex justify-between"><dt>Cadangan:</dt><dd>{summary.cadanganJP} JP</dd></div>
              <div className="flex justify-between font-medium"><dt>Material capacity:</dt><dd>{summary.materialCapacityJP} JP</dd></div>
              <div className="flex justify-between"><dt>Materi (Prota):</dt><dd>{summary.totalUnitJP} JP</dd></div>
              <div className="flex justify-between"><dt>Terdistribusi:</dt><dd>{summary.distributedJP} JP</dd></div>
              <div className="flex justify-between"><dt>Belum terdistribusi:</dt><dd>{summary.undistributedJP} JP</dd></div>
            </dl>
          </div>
          <div>
            <h4 className="font-medium text-slate-700 mb-2">Kokurikuler (Row Terpisah)</h4>
            <dl className="space-y-1 text-xs">
              <div className="flex justify-between"><dt>Total KO:</dt><dd>{summary.koTotalJP} JP</dd></div>
              <div className="flex justify-between"><dt>Row KO:</dt><dd>{koRows.length} row</dd></div>
            </dl>
            <p className="text-xs text-slate-500 mt-2">
              ℹ KO TIDAK mengurangi materialCapacityJP. Solver KO urusan Smart Roster.
            </p>
          </div>
        </div>
      </Card>

      {/* Tabel Distribusi Mingguan */}
      <Card>
        <CardHeader title="Tabel Distribusi Mingguan" description="Setiap minggu efektif punya 2 row: Intra (materi/cadangan) + KO (catatan terpisah)." />
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="py-2 px-2">Mg</th>
                <th className="py-2 px-2">Tanggal</th>
                <th className="py-2 px-2">Efektif</th>
                <th className="py-2 px-2">Intra JP</th>
                <th className="py-2 px-2">Materi / KO</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => (
                <WeekRows key={w.weekNumber} week={w} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Status per Materi */}
      <Card>
        <CardHeader title="Status per Materi (Intra only)" />
        {distribution.length === 0 ? (
          <p className="text-xs text-slate-400 italic">Tidak ada materi.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {distribution.map((d) => (
              <li key={d.unitId} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                <div>
                  <span className="font-medium">{d.title}</span>
                  <span className="text-slate-500 ml-2">({d.totalJP} JP)</span>
                </div>
                <div className="text-right">
                  <Badge variant={
                    d.status === "fully_distributed" ? "success" :
                    d.status === "partially_distributed" ? "warning" : "error"
                  }>
                    {d.status === "fully_distributed" ? "✓ Penuh" :
                     d.status === "partially_distributed" ? "⚠ Sebagian" : "✗ Tidak"}
                  </Badge>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {d.distributedJP}/{d.totalJP} JP · minggu {d.weeks.length > 0 ? d.weeks.join(", ") : "-"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Row Kokurikuler */}
      {koRows.length > 0 && (
        <Card>
          <CardHeader title="Row Kokurikuler (Catatan, Bukan Materi)" />
          <p className="text-xs text-slate-500 mb-2">
            {koRows.length} row KO × {koRows[0]?.jp} JP = {summary.koTotalJP} JP total · Mode: {KO_MODE_LABELS_ID[koRows[0]?.mode ?? "daily_block"]}
          </p>
          <p className="text-xs text-slate-400 italic">
            ℹ Solver KO urusan Smart Roster / Waka Kurikulum. Guru Admin Flow hanya menampilkan alokasi.
          </p>
        </Card>
      )}
    </div>
  );
}

function WeekRows({ week }: { week: import("@guru-admin/domain").PromesWeek }) {
  const koRow = week.koJP > 0;
  return (
    <>
      <tr className={week.isEffective ? "bg-brand-50/30" : "bg-slate-100"}>
        <td className="py-1.5 px-2 align-top">{week.weekNumber}</td>
        <td className="py-1.5 px-2 align-top">
          {formatLongDateID(week.startDate).split(",")[1]?.trim()}
          <span className="text-slate-400"> - {formatLongDateID(week.endDate).split(",")[1]?.trim()}</span>
        </td>
        <td className="py-1.5 px-2 align-top">
          {week.isEffective ? "✓" : <span className="text-rose-600">✗</span>}
          {!week.isEffective && week.blockReason && (
            <span className="text-xs text-rose-500 ml-1">{week.blockReason}</span>
          )}
        </td>
        <td className="py-1.5 px-2 align-top">
          {week.isEffective ? (
            <span>
              {week.intraCapacityJP} JP
              {week.reservedForCadangan > 0 && (
                <span className="text-amber-600"> (−{week.reservedForCadangan} cad)</span>
              )}
            </span>
          ) : "—"}
        </td>
        <td className="py-1.5 px-2 align-top">
          {week.assignedUnits.length > 0 ? (
            <ul className="space-y-0.5">
              {week.assignedUnits.map((u, i) => (
                <li key={i}>
                  <span className="font-medium">{u.title}</span> ({u.jp} JP)
                </li>
              ))}
            </ul>
          ) : week.reservedForCadangan > 0 ? (
            <span className="text-amber-600 italic">(cadangan)</span>
          ) : week.isEffective ? (
            <span className="text-slate-400 italic">(kosong)</span>
          ) : (
            <span className="text-rose-500 italic">(libur)</span>
          )}
        </td>
      </tr>
      {koRow && (
        <tr className="bg-orange-50/30 border-t border-orange-100">
          <td className="py-1 px-2"></td>
          <td className="py-1 px-2 text-slate-500 italic" colSpan={2}></td>
          <td className="py-1 px-2 text-orange-700">{week.koJP} JP</td>
          <td className="py-1 px-2 text-orange-700 italic">
            KO: {KO_MODE_LABELS_ID["daily_block"]} (row terpisah, bukan materi)
          </td>
        </tr>
      )}
    </>
  );
}
