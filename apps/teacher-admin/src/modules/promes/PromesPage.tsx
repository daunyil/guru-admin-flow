/**
 * Modul M04 Promes — halaman /promes
 * Sumber: docs/SPRINT_2_DESIGN.md §5, §6
 *
 * WYSIWYG-DOC-FASE2: Refactor ke layout WYSIWYG.
 *   - Saat result ada → DocumentPreview sebagai view utama + sidebar kontrol.
 *   - Saat result belum → form biasa.
 *   - Hapus toggle Mode Kerja / Mode Dokumen (WYSIWYG = dokumen selalu terlihat).
 *
 * KRITIS (lihat §0 CRITICAL PROMES RULE):
 *   - Material capacity pakai INTRA JP (intraJpPerWeek), BUKAN total 3 JP
 *   - KO tampil sebagai row terpisah, koTotalJP TIDAK mengurangi materialCapacityJP
 *   - Cadangan dari INTRA capacity, tidak boleh membuat materialCapacityJP negatif
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, Input, Select, Button, EmptyState, Badge } from "../../shared/ui";
import { listProtaProfiles } from "../../shared/db/prota-repo";
import { listCalendarEvents } from "../../shared/db/calendar-repo";
import { getActiveAcademicYear, getSchoolProfile, getTeacherProfile } from "../../shared/db/profile-repo";
import { generatePromes, promesCalendarKindLabel } from "@guru-admin/domain";
import type { ProtaProfile, CalendarEvent, AcademicYear, PromesResult, PromesOptions, SchoolProfile, TeacherProfile, PromesWeek, UnitDistribution, KORow, PromesSummary } from "@guru-admin/domain";
// WYSIWYG-DOC-FASE2: DocumentPreview + schoolDocuments persistence
import { DocumentPreview } from "../../shared/documents";
import {
  DocumentPage,
  DocumentTitle,
  DocumentSection,
  DocumentTable,
  DocumentIdentityTable,
  DocumentSignature,
  type DocumentCell,
  type DocumentCellObject,
} from "../../shared/documents";
import {
  saveSchoolDocument,
  updateSchoolDocumentData,
  updateSchoolDocumentLayout,
  setSchoolDocumentStatus,
  findSchoolDocumentByCompositeKey,
} from "../../shared/db/school-document-repo";
import type { SchoolDocOrientation, DocumentStatus } from "@guru-admin/domain";
import { LoadingState } from "../../shared/ui";
import {
  formatLongDateID,
  todayISODate,
  DEFAULT_INTRA_JP_PER_WEEK_PPKN,
  DEFAULT_KO_JP_PER_WEEK_PPKN,
  DEFAULT_CADANGAN_JP,
} from "@guru-admin/shared";

const KO_PROMES_MODE_OPTIONS: Array<{ value: NonNullable<PromesOptions["koMode"]>; label: string }> = [
  { value: "end_of_week", label: "Kokurikuler per minggu" },
  { value: "end_of_semester", label: "Kokurikuler blok akhir semester" },
];

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
    koMode: "end_of_week",
  });
  const [result, setResult] = useState<PromesResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // WYSIWYG-DOC-FASE2: sidebar toggle (default open di desktop, closed di mobile)
  const [showSidebar, setShowSidebar] = useState(
    typeof window !== "undefined" && window.innerWidth >= 1024
  );
  // PROMES-DUAL-FORMAT-02: pilihan format dokumen (portrait ringkas vs landscape matrix)
  const [formatDokumen, setFormatDokumen] = useState<"portrait" | "landscape">("landscape");

  // WYSIWYG-DOC-FASE2: persistence state
  const [docId, setDocId] = useState<string | undefined>(undefined);
  const [docStatus, setDocStatus] = useState<DocumentStatus>("draft");
  const ensuringRef = useRef(false);

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

  // WYSIWYG-DOC-FASE2: try to load existing schoolDocument for this promes context
  useEffect(() => {
    if (!activeYear || !teacher || profiles.length === 0) return;
    const profile = profiles.find((p) => p.id === selectedProfileId);
    if (!profile) return;
    if (ensuringRef.current) return;
    ensuringRef.current = true;

    void (async () => {
      try {
        const existing = await findSchoolDocumentByCompositeKey({
          docType: "promes",
          semester,
          tahunAjaran: activeYear.label,
          kodeMapel: profile.subject,
          kodeKelas: profile.grade,
          teacherId: teacher.id,
        });
        if (existing) {
          setDocId(existing.id);
          setDocStatus(existing.status);
          // Restore saved data
          if (existing.data?.promesResult) {
            setResult(existing.data.promesResult as PromesResult);
          }
          if (existing.data?.formatDokumen) {
            setFormatDokumen(existing.data.formatDokumen as "portrait" | "landscape");
          }
          if (existing.data?.promesOptions) {
            setOptions(existing.data.promesOptions as PromesOptions);
          }
          if (existing.orientation) {
            setFormatDokumen(existing.orientation);
          }
        }
      } finally {
        ensuringRef.current = false;
      }
    })();
  }, [activeYear, teacher, selectedProfileId, semester, profiles]);

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

      // WYSIWYG-DOC-FASE2: persist to schoolDocuments
      try {
        const docData: Record<string, unknown> = {
          promesResult: r,
          promesOptions: options,
          selectedProfileId,
          semester,
          formatDokumen,
          schoolName: school?.name ?? "",
          schoolRegency: school?.regency ?? "",
          headmasterName: school?.headmasterName ?? "",
          teacherName: teacher?.name ?? "",
          activeYearLabel: activeYear?.label ?? "",
          profileSubject: profile.subject,
          profileGrade: profile.grade,
          profilePhase: profile.phase,
        };

        if (docId) {
          // Update existing
          await updateSchoolDocumentData(docId, docData);
        } else {
          // Create new
          const doc = await saveSchoolDocument({
            docType: "promes",
            semester,
            tahunAjaran: activeYear.label,
            kodeMapel: profile.subject,
            kodeKelas: profile.grade,
            teacherId: teacher?.id ?? "",
            academicYearId: activeYear.id,
            data: docData,
            orientation: formatDokumen,
            status: "draft",
          });
          setDocId(doc.id);
          setDocStatus("draft");
        }
      } catch (e) {
        console.error("Failed to save schoolDocument:", e);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal generate Promes.");
    } finally {
      setGenerating(false);
    }
  }

  // WYSIWYG-DOC-FASE2: auto-save data memo
  const docDataForAutoSave = useMemo(() => {
    if (!result) return {};
    const profile = profiles.find((p) => p.id === selectedProfileId);
    return {
      promesResult: result,
      promesOptions: options,
      selectedProfileId,
      semester,
      formatDokumen,
      schoolName: school?.name ?? "",
      schoolRegency: school?.regency ?? "",
      headmasterName: school?.headmasterName ?? "",
      teacherName: teacher?.name ?? "",
      activeYearLabel: activeYear?.label ?? "",
      profileSubject: profile?.subject ?? "",
      profileGrade: profile?.grade ?? "",
      profilePhase: profile?.phase ?? "",
    };
  }, [result, options, selectedProfileId, semester, formatDokumen, school, teacher, activeYear, profiles]);

  // WYSIWYG-DOC-FASE2: callbacks
  const handleSaveDoc = useCallback(async (id: string, data: Record<string, unknown>) => {
    await updateSchoolDocumentData(id, data);
  }, []);

  const handleSetFinal = useCallback(async (id: string) => {
    await setSchoolDocumentStatus(id, "final");
    setDocStatus("final");
  }, []);

  const handleOrientationChange = useCallback((orientation: SchoolDocOrientation) => {
    setFormatDokumen(orientation);
    if (docId) {
      void updateSchoolDocumentLayout(docId, { orientation });
    }
  }, [docId]);

  // Derived
  const currentProfile = profiles.find((p) => p.id === selectedProfileId) ?? null;

  if (loading) return <LoadingState />;

  /* ================================================================ */
  /*  ALWAYS-SHOW: Layout selalu tampil, notice bila profil belum lengkap */
  /* ================================================================ */
  const profileIncomplete = !activeYear;

  if (result) {
    const { summary, status, errors, warnings, weeks, distribution, koRows } = result;

    return (
      <div className="doc-wysiwyg-layout">
        {/* ---------- MOBILE BACKDROP ---------- */}
        <div
          className={`doc-sidebar-backdrop no-print ${!showSidebar ? "doc-backdrop-hidden" : ""}`}
          onClick={() => setShowSidebar(false)}
          aria-hidden="true"
        />

        {/* ---------- SIDEBAR ---------- */}
        <aside className={`doc-sidebar no-print ${!showSidebar ? "doc-sidebar-hidden" : ""}`}>
            <div className="doc-sidebar-header">
              <h2 className="text-sm font-bold text-slate-900">Program Semester</h2>
              <button
                type="button"
                className="doc-sidebar-close"
                onClick={() => setShowSidebar(false)}
                title="Tutup sidebar"
              >
                ✕
              </button>
            </div>

            {/* -- Kontrol -- */}
            <div className="doc-sidebar-section">
              <h3 className="doc-sidebar-section-title">Konteks & Opsi</h3>

              <Select
                label="Prota"
                id="ps-prota"
                value={selectedProfileId}
                onChange={setSelectedProfileId}
                options={profiles.map((p) => ({ value: p.id, label: `${p.subject} — ${p.grade}` }))}
              />

              <Select
                label="Semester"
                id="ps-sem"
                value={String(semester)}
                onChange={(v) => setSemester(Number(v) as 1 | 2)}
                options={[{ value: "1", label: "Semester 1" }, { value: "2", label: "Semester 2" }]}
              />

              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Intra JP"
                  id="ps-intra"
                  type="number"
                  value={String(options.intraJpPerWeek)}
                  onChange={(v) => setOptions({ ...options, intraJpPerWeek: Number(v) || 0 })}
                />
                <Input
                  label="KO JP"
                  id="ps-ko"
                  type="number"
                  value={String(options.koJpPerWeek)}
                  onChange={(v) => setOptions({ ...options, koJpPerWeek: Number(v) || 0 })}
                />
              </div>

              <Input
                label="Cadangan (JP)"
                id="ps-cad"
                type="number"
                value={String(options.cadanganJP)}
                onChange={(v) => setOptions({ ...options, cadanganJP: Number(v) || 0 })}
              />

              <Select
                label="Mode KO"
                id="ps-komode"
                value={options.koMode ?? "end_of_week"}
                onChange={(v) => setOptions({ ...options, koMode: v as PromesOptions["koMode"] })}
                options={KO_PROMES_MODE_OPTIONS}
              />

              <div className="flex gap-2 mt-2">
                <Button onClick={handleGenerate} disabled={generating || profileIncomplete} className="flex-1">
                  {generating ? "Menyusun..." : "Susun Ulang"}
                </Button>
              </div>

              {error && (
                <div className="p-2 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700 mt-2">
                  {error}
                </div>
              )}
            </div>

            {/* -- Status & Ringkasan -- */}
            <div className="doc-sidebar-section">
              <h3 className="doc-sidebar-section-title">Ringkasan</h3>

              <div className="flex items-center gap-2 mb-2">
                {status === "valid" ? (
                  <Badge variant="success">✓ Valid</Badge>
                ) : (
                  <Badge variant="warning">⚠ Perlu Perbaikan</Badge>
                )}
              </div>

              <dl className="doc-summary-dl">
                <div><dt>Minggu efektif</dt><dd>{summary.effectiveWeeks}/{summary.totalWeeks}</dd></div>
                <div><dt>Kapasitas intra</dt><dd>{summary.intraCapacityJP} JP</dd></div>
                <div><dt>Cadangan</dt><dd>{summary.cadanganJP} JP</dd></div>
                <div><dt>Materi terdistribusi</dt><dd>{summary.distributedJP}/{summary.totalUnitJP} JP</dd></div>
                <div><dt>Belum terdistribusi</dt><dd>{summary.undistributedJP} JP</dd></div>
                <div><dt>Kokurikuler</dt><dd>{summary.koTotalJP} JP</dd></div>
              </dl>
            </div>

            {/* -- Distribusi Materi -- */}
            <div className="doc-sidebar-section">
              <h3 className="doc-sidebar-section-title">Distribusi Materi</h3>
              {distribution.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Tidak ada materi.</p>
              ) : (
                <ul className="doc-sidebar-list">
                  {distribution.map((d) => (
                    <li key={d.unitId} className="doc-sidebar-list-item">
                      <span className="doc-sidebar-list-title">{d.title}</span>
                      <Badge variant={d.status === "fully_distributed" ? "success" : d.status === "partially_distributed" ? "warning" : "error"}>
                        {d.distributedJP}/{d.totalJP} JP
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* -- Warnings/Errors -- */}
            {errors.length > 0 && (
              <div className="doc-sidebar-section">
                <h3 className="doc-sidebar-section-title text-rose-700">Error</h3>
                <ul className="list-disc pl-4 space-y-0.5 text-xs text-rose-600">
                  {errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}
            {warnings.length > 0 && (
              <div className="doc-sidebar-section">
                <h3 className="doc-sidebar-section-title text-amber-700">Peringatan</h3>
                <ul className="list-disc pl-4 space-y-0.5 text-xs text-amber-600">
                  {warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}

            {/* -- Kembali ke Form -- */}
            <div className="doc-sidebar-section doc-sidebar-footer">
              <Button
                variant="secondary"
                onClick={() => {
                  setResult(null);
                  setError(null);
                }}
                className="w-full"
              >
                ← Kembali ke Form
              </Button>
            </div>
          </aside>

        {/* ---------- DOCUMENT AREA ---------- */}
        <div className="doc-document-area">
          <DocumentPreview
            docId={docId}
            docType="promes"
            orientation={formatDokumen}
            status={docStatus}
            data={docDataForAutoSave}
            onSave={handleSaveDoc}
            onSetFinal={handleSetFinal}
            onOrientationChange={handleOrientationChange}
          >
            {formatDokumen === "portrait" ? (
              <PromesPortraitDocument
                weeks={weeks}
                distribution={distribution}
                koRows={koRows}
                summary={summary}
                status={status}
                semester={semester}
                activeYearLabel={activeYear?.label ?? ""}
                schoolName={school?.name ?? ""}
                schoolRegency={school?.regency ?? ""}
                headmasterName={school?.headmasterName ?? ""}
                teacherName={teacher?.name ?? ""}
                profile={currentProfile}
              />
            ) : (
              <PromesLandscapeMatrixDocument
                weeks={weeks}
                distribution={distribution}
                koRows={koRows}
                summary={summary}
                status={status}
                semester={semester}
                activeYearLabel={activeYear?.label ?? ""}
                schoolName={school?.name ?? ""}
                schoolRegency={school?.regency ?? ""}
                headmasterName={school?.headmasterName ?? ""}
                teacherName={teacher?.name ?? ""}
                profile={currentProfile}
              />
            )}
          </DocumentPreview>
        </div>

        {/* ---------- SIDEBAR TOGGLE (when hidden) ---------- */}
        {!showSidebar && (
          <button
            type="button"
            className="doc-sidebar-toggle no-print"
            onClick={() => setShowSidebar(true)}
            title="Buka panel kontrol"
            aria-label="Buka panel kontrol"
            aria-expanded={showSidebar}
          >
            ☰
          </button>
        )}
      </div>
    );
  }

  /* ================================================================ */
  /*  FORM VIEW — belum ada result, tampilkan form susun Promes       */
  /* ================================================================ */
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

/* ============================================================ */
/*  Header                                                       */
/* ============================================================ */

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

/* ============================================================ */
/*  Shared document sub-components                               */
/* ============================================================ */

/* ARCH-01/QUAL-01/02 FIX: PromesDocIdentity & PromesDocSignature removed.
   Now using DocumentIdentityTable & DocumentSignature from shared documents. */

/* ============================================================ */
/*  PROMES-DUAL-FORMAT-02: 2 format dokumen (portrait + landscape)  */
/*  ARCH-01 FIX: Both components now use shared DocumentPage/       */
/*  DocumentTable/DocumentTitle/DocumentSection/DocumentSignature   */
/*  from DocumentLayout.tsx — no more raw HTML bypassing infra.     */
/* ============================================================ */

/**
 * Format Vertikal (portrait) — daftar minggu per baris.
 * Refactored to use shared DocumentPage, DocumentTable, DocumentTitle,
 * DocumentSection, DocumentIdentityTable, DocumentSignature.
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
  /* ARCH-01 FIX: Using shared DocumentPage/DocumentTable/DocumentTitle/DocumentSection
     instead of raw HTML with inline styles bypassing infrastructure. */

  /* Build week distribution rows as DocumentCell[] arrays */
  const distHeaders: DocumentCell[][] = [
    [
      { content: "Mg", style: { width: '5%' }, align: 'center' },
      { content: "Tanggal", style: { width: '12%' }, align: 'left' },
      { content: "Intra JP", style: { width: '8%' }, align: 'center' },
      { content: "KO JP", style: { width: '8%' }, align: 'center' },
      { content: "Materi / Kegiatan", align: 'left' },
      { content: "Keterangan", style: { width: '10%' }, align: 'left' },
    ],
  ];

  const distRows: DocumentCell[][] = weeks
    .filter((w) => !isPureCadanganWeek(w))
    .map((w): DocumentCell[] => {
      const dateStr = formatLongDateID(w.startDate).split(",")[1]?.trim() ?? w.startDate;
      const calLabel = w.calendarKind ? promesCalendarKindLabel(w.calendarKind) || w.blockReason || "" : "";
      let materiCell: React.ReactNode;
      if (w.assignedUnits.length > 0) {
        materiCell = <span>{w.assignedUnits.map((u, i) => <span key={i}>{i > 0 && "; "}{u.title} ({u.jp} JP)</span>)}</span>;
      } else if (calLabel) {
        materiCell = <span><strong>{calLabel}</strong></span>;
      } else if (w.reservedForCadangan > 0) {
        materiCell = <span><em>(Cadangan — lihat catatan di bawah)</em></span>;
      } else if (w.isEffective) {
        materiCell = "(Kosong)";
      } else {
        materiCell = w.blockReason ?? "(Libur)";
      }
      let keteranganCell: string;
      if (calLabel) { keteranganCell = calLabel; }
      else if (w.reservedForCadangan > 0 && w.assignedUnits.length === 0) { keteranganCell = "Cadangan"; }
      else if (!w.isEffective) { keteranganCell = "Libur"; }
      else { keteranganCell = ""; }
      return [
        { content: w.weekNumber, align: 'center' } as DocumentCellObject,
        { content: dateStr, align: 'left' } as DocumentCellObject,
        { content: w.isEffective ? w.intraCapacityJP : "-", align: 'center' } as DocumentCellObject,
        { content: w.isEffective ? w.koJP : "-", align: 'center' } as DocumentCellObject,
        { content: materiCell as React.ReactNode, align: 'left' } as DocumentCellObject,
        { content: keteranganCell, align: 'left' } as DocumentCellObject,
      ];
    });

  const distFooter: DocumentCell[][] = [
    [
      { content: "JUMLAH", colSpan: 2, align: 'center' },
      { content: `${summary.intraCapacityJP} JP`, align: 'center' },
      { content: `${summary.koTotalJP} JP`, align: 'center' },
      { content: `Materi: ${summary.distributedJP} JP`, align: 'left' },
      { content: `${summary.effectiveWeeks} mg efektif`, align: 'center' },
    ],
  ];

  /* Build rekap materi rows */
  const rekapHeaders: DocumentCell[][] = [
    [
      { content: "No", style: { width: '5%' }, align: 'center' },
      { content: "Materi / TP", align: 'left' },
      { content: "JP", style: { width: '8%' }, align: 'center' },
      { content: "Status", style: { width: '15%' }, align: 'center' },
    ],
  ];

  const rekapRows: DocumentCell[][] = distribution.map((d, i) => [
    { content: i + 1, align: 'center' },
    { content: d.title, align: 'left' },
    { content: d.totalJP, align: 'center' },
    { content: d.status === "fully_distributed" ? "Terdistribusi" : d.status === "partially_distributed" ? "Sebagian" : "Belum", align: 'center' },
  ]);

  /* Build identity rows */
  const identityRows = [
    { label: "Satuan Pendidikan", value: schoolName },
    { label: "Kelas / Fase", value: `${profile?.grade ?? "-"} / ${profile?.phase ?? "-"}` },
    { label: "Mata Pelajaran", value: profile?.subject ?? "-" },
    { label: "Semester", value: semester === 1 ? "Ganjil" : "Genap" },
    { label: "Tahun Pelajaran", value: activeYearLabel },
    { label: "Alokasi Waktu", value: `${summary.effectiveWeeks > 0 ? Math.round(summary.intraCapacityJP / summary.effectiveWeeks) : 0} Jam/Minggu` },
    { label: "Total Minggu", value: `${summary.totalWeeks} minggu` },
    { label: "Minggu Efektif", value: `${summary.effectiveWeeks} minggu` },
    { label: "Kapasitas Intrakurikuler", value: `${summary.intraCapacityJP} JP` },
    { label: "Cadangan", value: `${summary.cadanganJP} JP` },
    { label: "Kokurikuler", value: `${summary.koTotalJP} JP` },
    { label: "Total", value: `${summary.intraCapacityJP + summary.cadanganJP + summary.koTotalJP} JP` },
  ];

  return (
    <DocumentPage orientation="portrait">
      <DocumentTitle title={`PROGRAM SEMESTER ${semester === 1 ? "GANJIL" : "GENAP"}`} subtitle={`Tahun Pelajaran ${activeYearLabel}`} />
      <DocumentIdentityTable rows={identityRows} columns={2} />

      <DocumentSection title="DISTRIBUSI MATERI PER MINGGU">
        <DocumentTable headers={distHeaders} rows={distRows} footer={distFooter} />
      </DocumentSection>

      {summary.cadanganJP > 0 && (
        <div className="document-paragraph">
          <strong>Cadangan Akhir Semester: {summary.cadanganJP} JP</strong> — Digunakan untuk kegiatan pembelajaran, penilaian, dan penyesuaian sesuai kebutuhan.
        </div>
      )}

      <DocumentSection title="REKAP MATERI">
        <DocumentTable headers={rekapHeaders} rows={rekapRows} />
      </DocumentSection>

      {koRows.length > 0 && (
        <p className="document-paragraph">
          <b>Kokurikuler:</b> {koRows.length} × {koRows[0]?.jp ?? 0} JP = {summary.koTotalJP} JP.
        </p>
      )}

      {summary.cadanganJP > 0 && (
        <p className="document-paragraph">
          <b>Cadangan Akhir Semester:</b> {summary.cadanganJP} JP.
        </p>
      )}

      {status !== "valid" && (
        <p className="document-paragraph" style={{ color: "#a00" }}>
          Promes belum lengkap: {summary.undistributedJP} JP materi belum terdistribusi.
        </p>
      )}

      <DocumentSignature
        left={{ role: "Mengetahui,\nKepala Sekolah", name: headmasterName }}
        right={{ role: "Guru Mata Pelajaran", name: teacherName, placeDate: `${schoolRegency || "..........."}, ${formatLongDateID(todayISODate())}` }}
      />
    </DocumentPage>
  );
}

/* ============================================================ */
/*  Landscape matrix format helpers                              */
/* ============================================================ */

const MONTH_SHORT_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

type PromesMonthColumn = {
  month: number;
  label: string;
  weeks: Array<{
    weekNumber: number;
    label: string;
    startDate: string;
  }>;
};

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

function compactPromesMaterial(text: string, maxWords = 7): string {
  const cleaned = (text || "-")
    .replace(/\s+/g, " ")
    .replace(/^tp\s*\d+(\.\d+)?\s*[:.\-–—]?\s*/i, "")
    .trim();

  if (!cleaned || cleaned === "-") return "-";

  const parts = cleaned.split(/\s[–—-]\s/).map((p) => p.trim()).filter(Boolean);
  const candidate = parts.length > 1 ? parts[parts.length - 1] : cleaned;

  const words = candidate.split(" ").filter(Boolean);
  if (words.length <= maxWords) return candidate;

  return `${words.slice(0, maxWords).join(" ")}…`;
}

type PromesLandscapeEventKind = "learning" | "assessment" | "scopeAssessment" | "remedial" | "kokurikuler" | "holiday" | "other";

type PromesLandscapeEventColumn = {
  kind: PromesLandscapeEventKind;
  label: string;
};

const PROMES_LEGEND_ITEMS: Array<{ kind: PromesLandscapeEventKind; label: string }> = [
  { kind: "learning", label: "Kegiatan belajar mengajar" },
  { kind: "assessment", label: "Asesmen sumatif tengah dan akhir semester" },
  { kind: "scopeAssessment", label: "Asesmen sumatif lingkup materi" },
  { kind: "kokurikuler", label: "Kokurikuler" },
  { kind: "remedial", label: "Remedial" },
  { kind: "holiday", label: "Libur semester / hari libur" },
  { kind: "other", label: "Kegiatan sekolah khusus" },
];

function promesEventClassName(kind: PromesLandscapeEventKind): string {
  return `promes-event-${kind}`;
}

function compactEventLabel(label: string): string {
  const normalized = label.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (/libur/i.test(normalized) && normalized.length > 26) return normalized;
  if (normalized.length <= 34) return normalized;
  return `${normalized.slice(0, 31)}…`;
}

function getPromesLandscapeCalendarEvent(week: PromesWeek): PromesLandscapeEventColumn | null {
  const rawLabel = (week.blockReason || (week.calendarKind ? promesCalendarKindLabel(week.calendarKind) : "")).trim();
  const lower = rawLabel.toLowerCase();

  if (week.calendarKind === "libur") {
    return { kind: "holiday", label: compactEventLabel(rawLabel || "Libur") };
  }

  if (week.calendarKind === "pts" || week.calendarKind === "pas") {
    return { kind: "assessment", label: compactEventLabel(rawLabel || promesCalendarKindLabel(week.calendarKind)) };
  }

  if (week.calendarKind === "remedial") {
    return { kind: "remedial", label: compactEventLabel(rawLabel || "Remedial") };
  }

  if (week.calendarKind === "p5") {
    return { kind: "kokurikuler", label: "Kokurikuler" };
  }

  if (week.calendarKind === "other" && rawLabel) {
    if (/asesmen|sumatif|lingkup/.test(lower)) {
      return { kind: "scopeAssessment", label: compactEventLabel(rawLabel) };
    }
    return { kind: "other", label: compactEventLabel(rawLabel) };
  }

  return null;
}

function getKokurikulerWeekNumbers(weeks: PromesWeek[], koRows: KORow[], mode: NonNullable<PromesOptions["koMode"]>): Set<number> {
  const effectiveWeekNumbers = koRows.length > 0
    ? koRows.map((row) => row.weekNumber)
    : weeks.filter((week) => week.isEffective && week.koJP > 0).map((week) => week.weekNumber);

  if (mode === "end_of_semester") {
    const blockCount = Math.min(3, effectiveWeekNumbers.length);
    return new Set(effectiveWeekNumbers.slice(-blockCount));
  }

  return new Set(effectiveWeekNumbers);
}

function renderVerticalEventLabel(event: PromesLandscapeEventColumn) {
  return <span className="promes-vertical-label">{event.label}</span>;
}

/**
 * Format Landscape (Matrix) — sesuai referensi PromesWysiwyg.jsx.
 *
 * Struktur tabel: No | Elemen/TP | Materi Pokok | Intra JP | Koku JP | Total JP | minggu×bulan
 * - KO tampil sebagai row data di dalam matrix (bukan hanya summary)
 * - Calendar event pakai rowSpan = total data rows (materi + KO)
 * - Summary rows (Efektif, Cadangan, KO, Total) di bawah data rows
 *
 * ROWSPAN-01 FIX: Calendar event cell hanya dirender di baris pertama,
 * baris lain return null (BUKAN empty <td>) untuk menghindari phantom columns.
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
  const koMode = koRows[0]?.mode ?? "end_of_week";
  const koWeekNumbers = getKokurikulerWeekNumbers(weeks, koRows, koMode);
  const eventByWeekNumber = new Map<number, PromesLandscapeEventColumn | null>(
    weeks.map((week) => [week.weekNumber, getPromesLandscapeCalendarEvent(week)])
  );

  /* ---- Build matrix data rows (materi rows + KO row) ---- */
  // Materi rows: each UnitDistribution becomes one row
  const materiRows = distribution.length > 0
    ? distribution.map((unit, i) => ({
        key: unit.unitId,
        rowNum: i + 1,
        kind: "intra" as const,
        elemen: compactPromesMaterial(unit.title, 5),
        materi: compactPromesMaterial(unit.title, 7),
        intraJP: unit.totalJP,
        kokuJP: 0,
        totalJP: unit.totalJP,
        unit,
      }))
    : [{ key: "empty", rowNum: 1, kind: "intra" as const, elemen: "-", materi: "Belum ada materi terdistribusi", intraJP: 0, kokuJP: 0, totalJP: 0, unit: null as UnitDistribution | null }];

  // KO row: kokurikuler as a data row in the matrix
  const koRow = summary.koTotalJP > 0
    ? {
        key: "ko-row",
        rowNum: materiRows.length + 1,
        kind: "koku" as const,
        elemen: "Kokurikuler (P5)",
        materi: koMode === "end_of_semester" ? "Blok akhir semester" : `Per minggu (${koRows[0]?.jp ?? summary.koTotalJP / Math.max(1, summary.effectiveWeeks)} JP)`,
        intraJP: 0,
        kokuJP: summary.koTotalJP,
        totalJP: summary.koTotalJP,
        unit: null as UnitDistribution | null,
      }
    : null;

  // All data rows = materi + KO (rowSpan target for calendar events)
  const allDataRows = koRow ? [...materiRows, koRow] : materiRows;
  const dataRowCount = allDataRows.length;

  function isUnitInWeek(unit: UnitDistribution | null, weekNumber: number) {
    return !!unit && unit.weeks.includes(weekNumber);
  }

  function weekMeta(weekNumber: number) {
    return weeks.find((w) => w.weekNumber === weekNumber);
  }

  /* Identity rows for DocumentIdentityTable */
  const identityRows = [
    { label: "Satuan Pendidikan", value: schoolName || "-" },
    { label: "Mata Pelajaran", value: profile?.subject ?? "-" },
    { label: "Kelas / Fase", value: `${profile?.grade ?? "-"} / ${profile?.phase ?? "-"}` },
    { label: "Semester", value: semester === 1 ? "Ganjil (1)" : "Genap (2)" },
    { label: "Tahun Pelajaran", value: activeYearLabel || "-" },
    { label: "Beban Belajar / Minggu", value: `${summary.effectiveWeeks > 0 ? Math.round((summary.intraCapacityJP + summary.koTotalJP) / summary.effectiveWeeks) : 0} JP (Intra ${summary.effectiveWeeks > 0 ? Math.round(summary.intraCapacityJP / summary.effectiveWeeks) : 0} + Koku ${summary.koTotalJP > 0 ? Math.round(summary.koTotalJP / summary.effectiveWeeks) : 0})` },
  ];

  return (
    <DocumentPage orientation="landscape" className="promes-landscape-page promes-one-page">
      <DocumentTitle title={`PROGRAM SEMESTER (PROMES)`} subtitle={`TAHUN AJARAN ${activeYearLabel || "..........."}`} />
      <DocumentIdentityTable rows={identityRows} columns={2} />

      {/* ---- Matrix Table (raw <table> for complex rowSpan) ---- */}
      <table
        className="promes-matrix-table promes-vertical-event-table"
        style={{
          fontFamily: "Arial, Helvetica, sans-serif",
          width: "100%",
          tableLayout: "fixed",
          borderCollapse: "collapse",
          boxSizing: "border-box",
        }}
      >
        <colgroup>
          <col style={{ width: '2.5%' }} />   {/* No */}
          <col style={{ width: '8%' }} />  {/* Elemen/TP */}
          <col style={{ width: '12%' }} />  {/* Materi Pokok */}
          <col style={{ width: '2.5%' }} />   {/* Intra JP */}
          <col style={{ width: '2.5%' }} />   {/* Koku JP */}
          <col style={{ width: '2.5%' }} />   {/* Total JP */}
          {weekColumns.map((week) => (
            <col key={`col-${week.weekNumber}`} style={{ width: `${((100 - 30) / weekColumns.length).toFixed(2)}%` }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th rowSpan={2} className="col-no-merdeka">No</th>
            <th rowSpan={2} className="col-elemen-merdeka">Elemen / TP</th>
            <th rowSpan={2} className="col-materi-merdeka">ATP / Materi Pokok</th>
            <th colSpan={3} className="col-jp-group-merdeka">Alokasi Waktu (JP)</th>
            {monthGroups.map((group) => (
              <th key={group.month} colSpan={group.weeks.length} className="month-head">
                {group.label}
              </th>
            ))}
          </tr>
          <tr>
            <th className="col-intra-jp-merdeka">Intra</th>
            <th className="col-koku-jp-merdeka">Koku</th>
            <th className="col-total-jp-merdeka">Total</th>
            {weekColumns.map((week) => (
              <th key={`week-head-${week.weekNumber}`} className="week-head">
                {week.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {/* ---- Data rows (materi + KO) ---- */}
          {allDataRows.map((row, rowIndex) => (
            <tr key={row.key} className={`promes-learning-row ${row.kind === "koku" ? "promes-koku-row" : ""}`}>
              <td className="text-center no-cell">{row.rowNum}</td>
              <td className={`elemen-cell ${row.kind === "koku" ? "promes-event-kokurikuler" : ""}`}>
                {row.kind === "koku" ? <strong>{row.elemen}</strong> : row.elemen}
              </td>
              <td className="materi-cell">{row.kind === "koku" ? <strong>{row.materi}</strong> : row.materi}</td>
              <td className="text-center jp-cell">{row.intraJP > 0 ? `${row.intraJP}` : "-"}</td>
              <td className="text-center jp-cell koku-jp-cell">{row.kokuJP > 0 ? `${row.kokuJP}` : "-"}</td>
              <td className="text-center jp-cell total-jp-cell"><strong>{row.totalJP}</strong></td>
              {weekColumns.map((week) => {
                const event = eventByWeekNumber.get(week.weekNumber) ?? null;
                if (event) {
                  /* ROWSPAN-01 FIX: Only render on first data row; others return null.
                     Empty <td> creates phantom extra columns that break alignment. */
                  if (rowIndex > 0) return null;
                  return (
                    <td
                      key={`event-${week.weekNumber}`}
                      rowSpan={dataRowCount}
                      className={`week-cell promes-event-cell ${promesEventClassName(event.kind)}`}
                      title={event.label}
                    >
                      {renderVerticalEventLabel(event)}
                    </td>
                  );
                }
                // Materi row: show "v" if unit is assigned to this week
                if (row.kind === "intra") {
                  const isLearning = isUnitInWeek(row.unit, week.weekNumber);
                  return (
                    <td
                      key={`${row.key}-${week.weekNumber}`}
                      className={`week-cell ${isLearning ? "promes-event-learning promes-learning-mark" : ""}`}
                    >
                      {isLearning ? "v" : ""}
                    </td>
                  );
                }
                // KO row: show "v" if this week has KO allocation
                const isKO = koWeekNumbers.has(week.weekNumber);
                return (
                  <td
                    key={`ko-${week.weekNumber}`}
                    className={`week-cell ${isKO ? "promes-event-kokurikuler" : ""}`}
                  >
                    {isKO ? "v" : ""}
                  </td>
                );
              })}
            </tr>
          ))}

          {/* ---- Summary rows (Efektif, Cadangan, KO, Total) ---- */}
          <tr className="total-row promes-summary-row">
            <td colSpan={3}><strong>Jumlah Jam Efektif</strong></td>
            <td className="text-center jp-cell"><strong>{summary.intraCapacityJP}</strong></td>
            <td className="text-center jp-cell koku-jp-cell"><strong>{summary.koTotalJP}</strong></td>
            <td className="text-center jp-cell total-jp-cell"><strong>{summary.intraCapacityJP + summary.koTotalJP}</strong></td>
            {weekColumns.map((week) => {
              const meta = weekMeta(week.weekNumber);
              const event = eventByWeekNumber.get(week.weekNumber) ?? null;
              return (
                <td key={`eff-${week.weekNumber}`} className={`week-cell ${event ? promesEventClassName(event.kind) : ""}`}>
                  {meta?.isEffective ? "v" : ""}
                </td>
              );
            })}
          </tr>

          <tr className="cadangan-row promes-summary-row">
            <td colSpan={3}>Jumlah Jam Cadangan</td>
            <td className="text-center jp-cell">{summary.cadanganJP > 0 ? `${summary.cadanganJP}` : "-"}</td>
            <td className="text-center jp-cell koku-jp-cell">-</td>
            <td className="text-center jp-cell total-jp-cell">{summary.cadanganJP > 0 ? `${summary.cadanganJP}` : "-"}</td>
            {weekColumns.map((week) => {
              const meta = weekMeta(week.weekNumber);
              const event = eventByWeekNumber.get(week.weekNumber) ?? null;
              return (
                <td key={`cad-${week.weekNumber}`} className={`week-cell ${event ? promesEventClassName(event.kind) : ""}`}>
                  {(meta?.reservedForCadangan ?? 0) > 0 ? "C" : ""}
                </td>
              );
            })}
          </tr>

          <tr className="total-row promes-summary-row">
            <td colSpan={3}><strong>Jumlah Jam Total Semester {semester === 1 ? "Ganjil" : "Genap"}</strong></td>
            <td className="text-center jp-cell"><strong>{summary.intraCapacityJP + summary.cadanganJP}</strong></td>
            <td className="text-center jp-cell koku-jp-cell"><strong>{summary.koTotalJP}</strong></td>
            <td className="text-center jp-cell total-jp-cell"><strong>{summary.intraCapacityJP + summary.cadanganJP + summary.koTotalJP}</strong></td>
            {weekColumns.map((week) => {
              const event = eventByWeekNumber.get(week.weekNumber) ?? null;
              return <td key={`tot-${week.weekNumber}`} className={`week-cell ${event ? promesEventClassName(event.kind) : ""}`}></td>;
            })}
          </tr>
        </tbody>
      </table>

      <div className="promes-legend-block">
        <strong>Keterangan:</strong>
        <div className="promes-legend-grid">
          {PROMES_LEGEND_ITEMS.map((item) => (
            <div key={item.kind} className="promes-legend-item">
              <span className={`promes-legend-swatch ${promesEventClassName(item.kind)}`}></span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {status !== "valid" && (
        <p className="promes-warning">
          Promes belum lengkap: {summary.undistributedJP} JP materi belum terdistribusi.
        </p>
      )}

      <DocumentSignature
        left={{ role: "Mengetahui,\nKepala Sekolah", name: headmasterName }}
        right={{ role: "Guru Mata Pelajaran", name: teacherName, placeDate: `${schoolRegency || "..........."}, ${formatLongDateID(todayISODate())}` }}
      />
    </DocumentPage>
  );
}

/* ============================================================ */
/*  Helper: pure cadangan week check                             */
/* ============================================================ */

/**
 * Cek apakah minggu HANYA cadangan
 * (reservedForCadangan > 0, tidak ada materi, tidak ada event kalender).
 */
function isPureCadanganWeek(week: PromesWeek): boolean {
  return (
    week.reservedForCadangan > 0 &&
    week.assignedUnits.length === 0 &&
    !week.calendarKind
  );
}

/* PromesDocWeekRow removed — logic now inline in PromesPortraitDocument distRows */
