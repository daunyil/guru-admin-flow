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
import { Card, CardHeader, Input, Select, Button, EmptyState, Badge, PrintExportButtons } from "../../shared/ui";
import { listProtaProfiles } from "../../shared/db/prota-repo";
import { listCalendarEvents } from "../../shared/db/calendar-repo";
import { getActiveAcademicYear, getSchoolProfile, getTeacherProfile } from "../../shared/db/profile-repo";
import { generatePromes, promesCalendarKindLabel } from "@guru-admin/domain";
import type { ProtaProfile, CalendarEvent, AcademicYear, PromesResult, PromesOptions, SchoolProfile, TeacherProfile, PromesWeek, UnitDistribution, KORow, PromesSummary } from "@guru-admin/domain";
import {
  formatLongDateID,
  todayISODate,
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
  const [school, setSchool] = useState<SchoolProfile | undefined>();
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
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
  const [showDocument, setShowDocument] = useState(false);
  // PROMES-DUAL-FORMAT-02: pilihan format dokumen (portrait ringkas vs landscape matrix)
  const [formatDokumen, setFormatDokumen] = useState<"portrait" | "landscape">("portrait");

  useEffect(() => {
    void (async () => {
      const [year, sp, tp] = await Promise.all([
        getActiveAcademicYear(),
        getSchoolProfile(),
        getTeacherProfile(),
      ]);
      setActiveYear(year ?? null);
      setSchool(sp);
      setTeacher(tp);
      if (year) {
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

  // UX-PLAN-07: HAPUS auto-generate diam-diam. Guru harus klik "Susun Promes"
  // secara eksplisit. Sebelumnya useEffect ini auto-generate saat buka halaman,
  // yang membingungkan guru (data muncul tanpa aksi).
  // Sekarang: halaman buka kosong, guru pilih Prota + semester + klik "Susun Promes".

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
        <CardHeader title="Susun Promes" description="Promes = Prota + Kalender + options. Generate on-demand (tidak persist)." />

        {profiles.length === 0 ? (
          <EmptyState
            title="Belum ada Prota"
            description="Buat Prota dulu di menu Prota sebelum generate Promes. Promes butuh daftar materi yang akan didistribusi per minggu."
            action={<Button variant="secondary" onClick={() => (window.location.hash = "#/prota")}>Buka Prota</Button>}
          />
        ) : calendar.length === 0 ? (
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
                value={options.koMode ?? "daily_block"}
                onChange={(v) => setOptions({ ...options, koMode: v as PromesOptions["koMode"] })}
                options={KO_MODES.map((m) => ({ value: m, label: KO_MODE_LABELS_ID[m] }))}
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
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? "Menyusun..." : "Susun Promes"}
              </Button>
              {result && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    // FIXPACK-01 QA-P2-01: buka mode dokumen dulu (yang punya .print-area
                    // + .document-page.document-landscape), baru user klik Cetak di sana.
                    // Sebelumnya: window.print() langsung di mode kerja → print kosong.
                    setShowDocument(true);
                  }}
                >
                  Cetak Preview
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>

      {result && (
        <ResultView
          result={result}
          showDocument={showDocument}
          onToggleMode={() => setShowDocument(!showDocument)}
          formatDokumen={formatDokumen}
          onChangeFormat={setFormatDokumen}
          schoolName={school?.name ?? ""}
          schoolRegency={school?.regency ?? ""}
          headmasterName={school?.headmasterName ?? ""}
          teacherName={teacher?.name ?? ""}
          activeYearLabel={activeYear?.label ?? ""}
          profile={profiles.find((p) => p.id === selectedProfileId) ?? null}
          semester={semester}
        />
      )}
    </div>
  );
}

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

function ResultView({
  result,
  showDocument,
  onToggleMode,
  formatDokumen,
  onChangeFormat,
  schoolName,
  schoolRegency,
  headmasterName,
  teacherName,
  activeYearLabel,
  profile,
  semester,
}: {
  result: PromesResult;
  showDocument: boolean;
  onToggleMode: () => void;
  formatDokumen: "portrait" | "landscape";
  onChangeFormat: (f: "portrait" | "landscape") => void;
  schoolName: string;
  schoolRegency: string;
  headmasterName: string;
  teacherName: string;
  activeYearLabel: string;
  profile: ProtaProfile | null;
  semester: 1 | 2;
}) {
  const { summary, status, errors, warnings, weeks, distribution, koRows } = result;

  // ====== MODE DOKUMEN ======
  if (showDocument) {
    return (
      <div>
        <div className="print-toolbar">
          <Button variant="secondary" onClick={onToggleMode}>Mode Kerja</Button>
          {/* PROMES-DUAL-FORMAT-02: segmented control format dokumen */}
          <FormatToggle formatDokumen={formatDokumen} onChangeFormat={onChangeFormat} />
          <PrintExportButtons filename="promes" title="Program Semester" schoolName={schoolName} orientation={formatDokumen} />
        </div>
        {formatDokumen === "portrait" ? (
          <PromesPortraitDocument
            weeks={weeks}
            distribution={distribution}
            koRows={koRows}
            summary={summary}
            status={status}
            semester={semester}
            activeYearLabel={activeYearLabel}
            schoolName={schoolName}
            schoolRegency={schoolRegency}
            headmasterName={headmasterName}
            teacherName={teacherName}
            profile={profile}
          />
        ) : (
          <PromesLandscapeMatrixDocument
            weeks={weeks}
            distribution={distribution}
            koRows={koRows}
            summary={summary}
            status={status}
            semester={semester}
            activeYearLabel={activeYearLabel}
            schoolName={schoolName}
            schoolRegency={schoolRegency}
            headmasterName={headmasterName}
            teacherName={teacherName}
            profile={profile}
          />
        )}
      </div>
    );
  }

  // ====== MODE KERJA (dashboard-like) ======
  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            {status === "valid" ? (
              <Badge variant="success">✓ Valid ({summary.allocationStatus})</Badge>
            ) : (
              <Badge variant="warning">⚠ Perlu Perbaikan</Badge>
            )}
            <span className="text-xs text-slate-500">{summary.effectiveWeeks} dari {summary.totalWeeks} minggu efektif</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* PROMES-ORIENTATION-TOGGLE-02A: toggle format di Mode Kerja */}
            <FormatToggle formatDokumen={formatDokumen} onChangeFormat={onChangeFormat} />
            <Button variant="secondary" onClick={onToggleMode}>Mode Dokumen</Button>
          </div>
        </div>

        {errors.length > 0 && (
          <div className="info-banner-error mt-3">
            <p className="font-medium mb-1">Error:</p>
            <ul className="list-disc pl-5 space-y-0.5 text-xs">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
          </div>
        )}
        {warnings.length > 0 && (
          <div className="info-banner-warning mt-3">
            <p className="font-medium mb-1">Peringatan:</p>
            <ul className="list-disc pl-5 space-y-0.5 text-xs">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Ringkasan" />
        <div className="grid sm:grid-cols-2 gap-6 text-sm">
          <div>
            <h4 className="font-medium text-brand-800 mb-2">Intrakurikuler (Materi)</h4>
            <dl className="space-y-1 text-xs">
              <div className="flex justify-between"><dt>Total minggu:</dt><dd>{summary.totalWeeks}</dd></div>
              <div className="flex justify-between"><dt>Minggu efektif:</dt><dd>{summary.effectiveWeeks}</dd></div>
              <div className="flex justify-between"><dt>Kapasitas intra:</dt><dd>{summary.intraCapacityJP} JP</dd></div>
              <div className="flex justify-between"><dt>Cadangan:</dt><dd>{summary.cadanganJP} JP</dd></div>
              <div className="flex justify-between font-medium"><dt>Kapasitas materi:</dt><dd>{summary.materialCapacityJP} JP</dd></div>
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
            <p className="text-xs text-slate-500 mt-2">KO tidak mengurangi kapasitas materi. Solver KO urusan Smart Roster.</p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Distribusi Mingguan" />
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="py-2 px-2">Mg</th>
                <th className="py-2 px-2">Tanggal</th>
                <th className="py-2 px-2">Efektif</th>
                <th className="py-2 px-2">Intra</th>
                <th className="py-2 px-2">Materi / KO</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => <WeekRows key={w.weekNumber} week={w} />)}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader title="Status per Materi" />
        {distribution.length === 0 ? <p className="text-xs text-slate-400 italic">Tidak ada materi.</p> : (
          <ul className="space-y-1 text-sm">
            {distribution.map((d) => (
              <li key={d.unitId} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                <div>
                  <span className="font-medium">{d.title}</span>
                  <span className="text-slate-500 ml-2">({d.totalJP} JP)</span>
                </div>
                <div className="text-right">
                  <Badge variant={d.status === "fully_distributed" ? "success" : d.status === "partially_distributed" ? "warning" : "error"}>
                    {d.status === "fully_distributed" ? "✓ Penuh" : d.status === "partially_distributed" ? "⚠ Sebagian" : "✗ Tidak"}
                  </Badge>
                  <p className="text-xs text-slate-500 mt-0.5">{d.distributedJP}/{d.totalJP} JP · minggu {d.weeks.length > 0 ? d.weeks.join(", ") : "-"}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {koRows.length > 0 && (
        <Card>
          <CardHeader title="Row Kokurikuler (Catatan, Bukan Materi)" />
          <p className="text-xs text-slate-500 mb-2">
            {koRows.length} row KO × {koRows[0]?.jp} JP = {summary.koTotalJP} JP · Mode: {KO_MODE_LABELS_ID[koRows[0]?.mode ?? "daily_block"]}
          </p>
          <p className="text-xs text-slate-400 italic">Solver KO urusan Smart Roster / Waka Kurikulum.</p>
        </Card>
      )}
    </div>
  );
}

/* ============================================================ */
/*  PROMES-DUAL-FORMAT-02: 2 format dokumen (portrait + landscape)  */
/* ============================================================ */

/**
 * PROMES-ORIENTATION-TOGGLE-02A: Segmented control untuk pilih format dokumen.
 * Dipakai di Mode Kerja (sebelum masuk Mode Dokumen) DAN di toolbar Mode Dokumen.
 * Default: portrait (Vertikal).
 */
function FormatToggle({
  formatDokumen,
  onChangeFormat,
}: {
  formatDokumen: "portrait" | "landscape";
  onChangeFormat: (f: "portrait" | "landscape") => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 hidden sm:inline">Format:</span>
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
        <button
          type="button"
          onClick={() => onChangeFormat("portrait")}
          className={`px-3 py-1 text-xs rounded-md transition-colors ${formatDokumen === "portrait" ? "bg-white text-brand-700 font-semibold shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
        >
          Vertikal
        </button>
        <button
          type="button"
          onClick={() => onChangeFormat("landscape")}
          className={`px-3 py-1 text-xs rounded-md transition-colors ${formatDokumen === "landscape" ? "bg-white text-brand-700 font-semibold shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
        >
          Landscape
        </button>
      </div>
    </div>
  );
}

/** Shared identity table + signature block untuk kedua format. */
function PromesDocIdentity({ schoolName, profile, semester, activeYearLabel, summary }: {
  schoolName: string;
  profile: ProtaProfile | null;
  semester: 1 | 2;
  activeYearLabel: string;
  summary: PromesSummary;
}) {
  return (
    <table className="document-identity">
      <tbody>
        <tr><td>Satuan Pendidikan</td><td>{schoolName}</td><td>Kelas / Fase</td><td>{profile?.grade ?? "-"} / {profile?.phase ?? "-"}</td></tr>
        <tr><td>Mata Pelajaran</td><td>{profile?.subject ?? "-"}</td><td>Semester</td><td>{semester === 1 ? "Ganjil" : "Genap"}</td></tr>
        <tr><td>Tahun Pelajaran</td><td>{activeYearLabel}</td><td>Alokasi Waktu</td><td>{summary.intraCapacityJP} JP (Intrakurikuler) + {summary.koTotalJP} JP (Kokurikuler)</td></tr>
      </tbody>
    </table>
  );
}

/** Shared signature block. */
function PromesDocSignature({ schoolRegency, headmasterName, teacherName }: {
  schoolRegency: string;
  headmasterName: string;
  teacherName: string;
}) {
  return (
    <div className="signature-grid">
      <div>
        <p>Mengetahui,</p>
        <p>Kepala Sekolah</p>
        <div className="sig-space" />
        <p className="sig-name">{headmasterName || "(...........................)"}</p>
        <p>NIP. .....................</p>
      </div>
      <div>
        <p>{schoolRegency || "..........."}, {formatLongDateID(todayISODate())}</p>
        <p>Guru Mata Pelajaran</p>
        <div className="sig-space" />
        <p className="sig-name">{teacherName || "(...........................)"}</p>
        <p>NIP. .....................</p>
      </div>
    </div>
  );
}

/**
 * Format Vertikal (portrait) — daftar minggu per baris.
 * Format lama yang sudah ada sebelum PROMES-DUAL-FORMAT-02, sekarang dipisah jadi komponen.
 */
function PromesPortraitDocument({
  weeks, distribution, koRows, summary, status, semester, activeYearLabel,
  schoolName, schoolRegency, headmasterName, teacherName, profile,
}: {
  weeks: PromesWeek[];
  distribution: UnitDistribution[];
  koRows: KORow[];
  summary: PromesSummary;
  status: "valid" | "needs_fix";
  semester: 1 | 2;
  activeYearLabel: string;
  schoolName: string;
  schoolRegency: string;
  headmasterName: string;
  teacherName: string;
  profile: ProtaProfile | null;
}) {
  return (
    <div className="print-area">
      <div className="document-page document-portrait">
        <div className="document-title">PROGRAM SEMESTER {semester === 1 ? "GANJIL" : "GENAP"}</div>
        <div className="document-subtitle">Tahun Pelajaran {activeYearLabel}</div>
        <PromesDocIdentity schoolName={schoolName} profile={profile} semester={semester} activeYearLabel={activeYearLabel} summary={summary} />

        <div className="document-section-title">DISTRIBUSI MATERI PER MINGGU</div>
        <table className="document-table">
          <thead>
            <tr>
              <th style={{ width: "5%" }}>Mg</th>
              <th style={{ width: "12%" }}>Tanggal</th>
              <th style={{ width: "8%" }}>Intra JP</th>
              <th style={{ width: "8%" }}>KO JP</th>
              <th>Materi / Kegiatan</th>
              <th style={{ width: "10%" }}>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {weeks
              // PROMES-CALENDAR-ASSESSMENT-CADANGAN-03: skip pure-cadangan weeks
              // (reservedForCadangan > 0, no assignedUnits, no calendarKind).
              // Cadangan ditampilkan sebagai section terpisah tanpa tanggal.
              .filter((w) => !isPureCadanganWeek(w))
              .map((w) => <PromesDocWeekRow key={w.weekNumber} week={w} />)}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="text-center">JUMLAH</td>
              <td className="text-center">{summary.intraCapacityJP} JP</td>
              <td className="text-center">{summary.koTotalJP} JP</td>
              <td>Materi: {summary.distributedJP} JP / Cadangan: {summary.cadanganJP} JP</td>
              <td className="text-center">Total: {summary.totalWeeks} mg</td>
            </tr>
          </tfoot>
        </table>

        {/* PROMES-CALENDAR-ASSESSMENT-CADANGAN-03: Cadangan Akhir Semester tanpa tanggal */}
        {summary.cadanganJP > 0 && (
          <div className="p-2 mt-2 bg-slate-50 border border-slate-300 rounded text-xs">
            <strong>Cadangan Akhir Semester: {summary.cadanganJP} JP</strong>
            <br />
            <span className="text-slate-600">Tanggal: tidak ditentukan (fleksibel sesuai kebutuhan pembelajaran, asesmen, remedial, atau penyesuaian kegiatan sekolah).</span>
          </div>
        )}

        <div className="document-section-title">REKAP MATERI</div>
        <table className="document-table">
          <thead>
            <tr><th style={{ width: "5%" }}>No</th><th>Materi / TP</th><th style={{ width: "8%" }}>JP</th><th style={{ width: "15%" }}>Status</th></tr>
          </thead>
          <tbody>
            {distribution.map((d, i) => (
              <tr key={d.unitId}>
                <td className="text-center">{i + 1}</td>
                <td>{d.title}</td>
                <td className="text-center">{d.totalJP}</td>
                <td className="text-center">{d.status === "fully_distributed" ? "✓ Terdistribusi" : d.status === "partially_distributed" ? "⚠ Sebagian" : "✗ Belum"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {koRows.length > 0 && (
          <p style={{ fontSize: "10pt", marginTop: "6pt" }}>
            <b>Kokurikuler:</b> {koRows.length} × {koRows[0]?.jp ?? 0} JP = {summary.koTotalJP} JP ({KO_MODE_LABELS_ID[koRows[0]?.mode ?? "daily_block"]}). KO urusan koordinator/Smart Roster.
          </p>
        )}

        {status !== "valid" && (
          <p style={{ fontSize: "10pt", color: "#a00", marginTop: "6pt" }}>
            ⚠ Promes belum lengkap: {summary.undistributedJP} JP materi belum terdistribusi.
          </p>
        )}

        <PromesDocSignature schoolRegency={schoolRegency} headmasterName={headmasterName} teacherName={teacherName} />
      </div>
    </div>
  );
}

/** Nama bulan pendek Indonesia untuk header matrix landscape. */
const MONTH_SHORT_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** PROMES-LANDSCAPE-ONEPAGE-POLISH-02: Tipe untuk group bulan + subkolom minggu. */
type PromesMonthColumn = {
  month: number;
  label: string;
  weeks: Array<{
    weekNumber: number;
    label: string;
    startDate: string;
  }>;
};

/**
 * PROMES-LANDSCAPE-ONEPAGE-POLISH-02: Bangun group bulan → subkolom minggu.
 */
function buildPromesMonthGroups(weeks: PromesWeek[], semester: 1 | 2): PromesMonthColumn[] {
  const monthNumbers = semester === 1 ? [7, 8, 9, 10, 11, 12] : [1, 2, 3, 4, 5, 6];

  return monthNumbers
    .map((month) => {
      const monthWeeks = weeks
        .filter((week) => Number(week.startDate.slice(5, 7)) === month)
        .sort((a, b) => a.weekNumber - b.weekNumber);

      return {
        month,
        label: MONTH_SHORT_ID[month - 1],
        weeks: monthWeeks.map((week, index) => ({
          weekNumber: week.weekNumber,
          label: String(index + 1),
          startDate: week.startDate,
        })),
      };
    })
    .filter((group) => group.weeks.length > 0);
}

/**
 * PROMES-LANDSCAPE-ONEPAGE-POLISH-02: Compact materi untuk cetak 1 halaman.
 * - Hapus prefix "TP 1.2:" dll.
 * - Bila format "TP lengkap — Materi Singkat", ambil bagian setelah tanda pisah.
 * - Maksimal maxWords kata, sisanya dipotong dengan ellipsis.
 */
function compactPromesMaterial(text: string, maxWords = 7): string {
  const cleaned = (text || "-")
    .replace(/\s+/g, " ")
    .replace(/^tp\s*\d+(\.\d+)?\s*[:.\-–—]?\s*/i, "")
    .trim();

  if (!cleaned || cleaned === "-") return "-";

  // Jika guru memakai format: "TP lengkap — Materi Singkat"
  // maka cetak Promes mengambil bagian setelah tanda pisah.
  const parts = cleaned.split(/\s[–—-]\s/).map((p) => p.trim()).filter(Boolean);
  const candidate = parts.length > 1 ? parts[parts.length - 1] : cleaned;

  const words = candidate.split(" ").filter(Boolean);
  if (words.length <= maxWords) return candidate;

  return `${words.slice(0, maxWords).join(" ")}…`;
}

/**
 * Format Landscape (Matrix) — TP × bulan/minggu seperti contoh Promes sekolah.
 * PROMES-LANDSCAPE-ONEPAGE-POLISH-02: Versi compact untuk 1 halaman A4 landscape.
 * Materi dipendekkan via compactPromesMaterial. Layout compact, font kecil.
 */
function PromesLandscapeMatrixDocument({
  weeks,
  distribution,
  koRows,
  summary,
  status,
  semester,
  activeYearLabel,
  schoolName,
  schoolRegency,
  headmasterName,
  teacherName,
  profile,
}: {
  weeks: PromesWeek[];
  distribution: UnitDistribution[];
  koRows: KORow[];
  summary: PromesSummary;
  status: "valid" | "needs_fix";
  semester: 1 | 2;
  activeYearLabel: string;
  schoolName: string;
  schoolRegency: string;
  headmasterName: string;
  teacherName: string;
  profile: ProtaProfile | null;
}) {
  const monthGroups = buildPromesMonthGroups(weeks, semester);
  const weekColumns = monthGroups.flatMap((m) => m.weeks);

  function isUnitInWeek(unit: UnitDistribution, weekNumber: number) {
    return unit.weeks.includes(weekNumber);
  }

  function getCalendarLabel(weekNumber: number) {
    const week = weeks.find((w) => w.weekNumber === weekNumber);
    if (!week) return "";

    // PROMES-CALENDAR-ASSESSMENT-CADANGAN-03: gunakan calendarKind dari engine
    // (sudah dideteksi dari event kalender, bukan regex pada blockReason).
    if (week.calendarKind) {
      const kindLabel = promesCalendarKindLabel(week.calendarKind);
      if (kindLabel) return kindLabel === "Remedial" ? "Rem." : kindLabel;
      // "other" → tampilkan blockReason apa adanya (potong bila panjang)
      const label = week.blockReason ?? "";
      if (label) return label.length > 8 ? label.slice(0, 8) : label;
    }

    // Minggu non-efektif tanpa calendarKind → libur
    if (!week.isEffective) return "Libur";

    // PROMES-CALENDAR-ASSESSMENT-CADANGAN-03: JANGAN tampilkan "Cad." pada
    // minggu bertanggal. Cadangan ditampilkan sebagai catatan terpisah.
    return "";
  }

  return (
    <div className="print-area">
      <div className="document-page document-landscape promes-landscape-page promes-one-page" id="promes-landscape-doc">
        <div className="promes-title">PROGRAM SEMESTER {semester === 1 ? "GANJIL" : "GENAP"}</div>

        <table className="promes-identity-table">
          <tbody>
            <tr>
              <td>Satuan Pendidikan</td>
              <td>{schoolName || "-"}</td>
              <td>Kelas / Semester</td>
              <td>{profile?.grade ?? "-"} / {semester === 1 ? "Ganjil" : "Genap"}</td>
            </tr>
            <tr>
              <td>Mata Pelajaran</td>
              <td>{profile?.subject ?? "-"}</td>
              <td>Tahun Pelajaran</td>
              <td>{activeYearLabel || "-"}</td>
            </tr>
            <tr>
              <td>Alokasi Waktu</td>
              <td>{summary.intraCapacityJP} JP Intrakurikuler</td>
              <td>Kokurikuler</td>
              <td>{summary.koTotalJP} JP</td>
            </tr>
          </tbody>
        </table>

        <table className="promes-matrix-table">
          <thead>
            <tr>
              <th rowSpan={2} className="col-no">No</th>
              <th rowSpan={2} className="col-materi-wide">Materi / TP Ringkas</th>
              <th rowSpan={2} className="col-jp">JP</th>
              {monthGroups.map((group) => (
                <th key={group.month} colSpan={group.weeks.length} className="month-head">
                  {group.label}
                </th>
              ))}
            </tr>
            <tr>
              {weekColumns.map((week) => (
                <th key={`week-head-${week.weekNumber}`} className="week-head">
                  {week.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {distribution.length === 0 ? (
              <tr>
                <td colSpan={3 + weekColumns.length} className="empty-row">
                  Belum ada materi/TP yang terdistribusi.
                </td>
              </tr>
            ) : (
              distribution.map((unit, index) => (
                <tr key={unit.unitId}>
                  <td className="text-center">{index + 1}</td>
                  <td className="materi-cell">{compactPromesMaterial(unit.title, 7)}</td>
                  <td className="text-center">{unit.totalJP}</td>
                  {weekColumns.map((week) => (
                    <td key={`${unit.unitId}-${week.weekNumber}`} className="week-cell">
                      {isUnitInWeek(unit, week.weekNumber) ? "✓" : ""}
                    </td>
                  ))}
                </tr>
              ))
            )}

            <tr className="calendar-row">
              <td className="text-center">{distribution.length + 1}</td>
              <td>
                <strong>Kegiatan Kalender</strong>
                <br />
                <span>PTS/PAS/Remedial/Libur/P5</span>
              </td>
              <td className="text-center">-</td>
              {weekColumns.map((week) => (
                <td key={`cal-${week.weekNumber}`} className="calendar-cell">
                  {getCalendarLabel(week.weekNumber)}
                </td>
              ))}
            </tr>

            {koRows.length > 0 && (
              <tr className="ko-row">
                <td className="text-center">{distribution.length + 2}</td>
                <td>
                  <strong>Kokurikuler</strong>
                  <br />
                  <span>{KO_MODE_LABELS_ID[koRows[0]?.mode ?? "daily_block"]}</span>
                </td>
                <td className="text-center">{summary.koTotalJP}</td>
                {weekColumns.map((week) => {
                  const found = weeks.find((w) => w.weekNumber === week.weekNumber);
                  return (
                    <td key={`ko-${week.weekNumber}`} className="week-cell">
                      {found?.koJP ? "✓" : ""}
                    </td>
                  );
                })}
              </tr>
            )}

            <tr className="total-row">
              <td colSpan={2} className="text-center">Jumlah JP Intrakurikuler</td>
              <td className="text-center">{summary.intraCapacityJP}</td>
              {weekColumns.map((week) => {
                const found = weeks.find((w) => w.weekNumber === week.weekNumber);
                return (
                  <td key={`eff-${week.weekNumber}`} className="week-cell">
                    {found?.isEffective ? "✓" : ""}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>

        {status !== "valid" && (
          <p className="promes-warning">
            Promes belum lengkap: {summary.undistributedJP} JP materi belum terdistribusi.
          </p>
        )}

        <p className="promes-note">
          Keterangan: ✓ = minggu pelaksanaan. KO = Kokurikuler. Materi ditulis singkat agar muat 1 halaman.
          {summary.cadanganJP > 0 && ` Cadangan Akhir Semester: ${summary.cadanganJP} JP (tanggal fleksibel, tidak ditentukan).`}
        </p>

        <PromesDocSignature
          schoolRegency={schoolRegency}
          headmasterName={headmasterName}
          teacherName={teacherName}
        />
      </div>
    </div>
  );
}

/**
 * PROMES-CALENDAR-ASSESSMENT-CADANGAN-03: Cek apakah minggu HANYA cadangan
 * (reservedForCadangan > 0, tidak ada materi, tidak ada event kalender).
 * Minggu seperti ini TIDAK boleh dirender sebagai baris bertanggal.
 * Cadangan ditampilkan sebagai section terpisah "Cadangan Akhir Semester".
 *
 * APP-AUDIT-FIXPACK-02A: hapus syarat week.isEffective === false.
 * Minggu cadangan di-reserve dari minggu efektif (isEffective=true), jadi
 * syarat isEffective===false salah — cadangan tidak terfilter dan tetap
 * muncul sebagai baris bertanggal.
 */
function isPureCadanganWeek(week: PromesWeek): boolean {
  return (
    week.reservedForCadangan > 0 &&
    week.assignedUnits.length === 0 &&
    !week.calendarKind
  );
}

function PromesDocWeekRow({ week }: { week: PromesWeek }) {
  const dateStr = formatLongDateID(week.startDate).split(",")[1]?.trim() ?? week.startDate;

  // PROMES-CALENDAR-ASSESSMENT-CADANGAN-03: label untuk event kalender
  const calLabel = week.calendarKind
    ? promesCalendarKindLabel(week.calendarKind) || week.blockReason || ""
    : "";

  // Materi / Kegiatan column
  let materiCell: React.ReactNode;
  if (week.assignedUnits.length > 0) {
    materiCell = week.assignedUnits.map((u, i) => (
      <span key={i}>{i > 0 && "; "}{u.title} ({u.jp} JP)</span>
    ));
  } else if (calLabel) {
    // Minggu assessment/kegiatan kalender — tampilkan label event
    materiCell = <strong>{calLabel}</strong>;
  } else if (week.reservedForCadangan > 0) {
    // Pure cadangan — seharusnya sudah di-filter, tapi fallback
    materiCell = <em>(Cadangan — lihat catatan di bawah)</em>;
  } else if (week.isEffective) {
    materiCell = "(Kosong)";
  } else {
    materiCell = week.blockReason ?? "(Libur)";
  }

  // Keterangan column
  let keteranganCell: string;
  if (calLabel) {
    keteranganCell = calLabel;
  } else if (week.reservedForCadangan > 0 && week.assignedUnits.length === 0) {
    keteranganCell = "Cadangan";
  } else if (!week.isEffective) {
    keteranganCell = "Libur";
  } else {
    keteranganCell = "";
  }

  return (
    <tr style={{ background: week.isEffective ? "white" : "#f5f5f5" }}>
      <td className="text-center">{week.weekNumber}</td>
      <td>{dateStr}</td>
      <td className="text-center">{week.isEffective ? week.intraCapacityJP : "-"}</td>
      <td className="text-center">{week.isEffective ? week.koJP : "-"}</td>
      <td>{materiCell}</td>
      <td>{keteranganCell}</td>
    </tr>
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
