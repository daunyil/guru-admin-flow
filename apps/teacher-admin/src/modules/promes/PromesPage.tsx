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

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardHeader, Input, Select, Button, EmptyState, Badge } from "../../shared/ui";
import { listProtaProfiles } from "../../shared/db/prota-repo";
import { listCalendarEvents } from "../../shared/db/calendar-repo";
import { getActiveAcademicYear, getSchoolProfile, getTeacherProfile } from "../../shared/db/profile-repo";
import { generatePromes, promesCalendarKindLabel } from "@guru-admin/domain";
import type { ProtaProfile, CalendarEvent, AcademicYear, PromesResult, PromesOptions, SchoolProfile, TeacherProfile, PromesWeek, UnitDistribution, KORow, PromesSummary } from "@guru-admin/domain";
// WYSIWYG-DOC-FASE2: DocumentPreview + schoolDocuments persistence
import { DocumentPreview } from "../../shared/documents";
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
  KO_MODE_LABELS_ID,
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

    void (async () => {
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

  /* ================================================================ */
  /*  WYSIWYG VIEW — result ada, DocumentPreview sebagai view utama   */
  /* ================================================================ */
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
                <Button onClick={handleGenerate} disabled={generating} className="flex-1">
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
      <Header yearLabel={activeYear.label} />

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
              <Button onClick={handleGenerate} disabled={generating}>
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

/** Shared identity table untuk portrait. */
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
        <tr><td>Tahun Pelajaran</td><td>{activeYearLabel}</td><td>Alokasi Waktu</td><td>{summary.effectiveWeeks > 0 ? Math.round(summary.intraCapacityJP / summary.effectiveWeeks) : 0} Jam/Minggu</td></tr>
        <tr><td>Total Minggu</td><td>{summary.totalWeeks} minggu</td><td>Minggu Efektif</td><td>{summary.effectiveWeeks} minggu</td></tr>
        <tr><td>Kapasitas Intrakurikuler</td><td>{summary.intraCapacityJP} JP</td><td>Cadangan</td><td>{summary.cadanganJP} JP</td></tr>
        <tr><td>Kokurikuler</td><td>{summary.koTotalJP} JP</td><td>Total</td><td>{summary.intraCapacityJP + summary.cadanganJP + summary.koTotalJP} JP</td></tr>
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

/* ============================================================ */
/*  PROMES-DUAL-FORMAT-02: 2 format dokumen (portrait + landscape)  */
/* ============================================================ */

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
              .filter((w) => !isPureCadanganWeek(w))
              .map((w) => <PromesDocWeekRow key={w.weekNumber} week={w} />)}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="text-center">JUMLAH</td>
              <td className="text-center">{summary.intraCapacityJP} JP</td>
              <td className="text-center">{summary.koTotalJP} JP</td>
              <td>Materi: {summary.distributedJP} JP</td>
              <td className="text-center">{summary.effectiveWeeks} mg efektif</td>
            </tr>
          </tfoot>
        </table>

        {summary.cadanganJP > 0 && (
          <div className="p-2 mt-2 bg-slate-50 border border-slate-300 rounded text-xs">
            <strong>Cadangan Akhir Semester: {summary.cadanganJP} JP</strong>
            <br />
            <span className="text-slate-600">Digunakan untuk kegiatan pembelajaran, penilaian, dan penyesuaian sesuai kebutuhan.</span>
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
            <b>Kokurikuler:</b> {koRows.length} × {koRows[0]?.jp ?? 0} JP = {summary.koTotalJP} JP.
          </p>
        )}

        {summary.cadanganJP > 0 && (
          <p style={{ fontSize: "10pt", marginTop: "4pt" }}>
            <b>Cadangan Akhir Semester:</b> {summary.cadanganJP} JP.
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

type PromesLandscapeRow = {
  key: string;
  tp: string;
  materi: string;
  jp: string;
  unit: UnitDistribution | null;
  isGroupStart?: boolean;
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

function buildPromesLandscapeRows(distribution: UnitDistribution[]): PromesLandscapeRow[] {
  if (distribution.length === 0) return [];

  const rows: PromesLandscapeRow[] = [];
  const groupSize = 4;

  distribution.forEach((unit, index) => {
    const groupNum = Math.floor(index / groupSize);
    const isFirstInGroup = index % groupSize === 0;
    const groupUnits = distribution.slice(groupNum * groupSize, Math.min((groupNum + 1) * groupSize, distribution.length));
    const groupJP = groupUnits.reduce((sum, u) => sum + u.totalJP, 0);

    rows.push({
      key: unit.unitId,
      tp: compactPromesMaterial(unit.title, 9),
      materi: isFirstInGroup ? `Bab ${groupNum + 1}` : "",
      jp: isFirstInGroup ? `${groupJP} JP` : "",
      unit,
      isGroupStart: isFirstInGroup,
    });
  });

  return rows;
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
 * Format Landscape (Matrix) — TP × bulan/minggu seperti contoh Promes sekolah.
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
  const matrixRows = buildPromesLandscapeRows(distribution);
  const visibleMatrixRows = matrixRows.length > 0 ? matrixRows : [{ key: "empty", tp: "Belum ada materi/TP yang terdistribusi.", materi: "", jp: "", unit: null }];
  const koMode = koRows[0]?.mode ?? "end_of_week";
  const koWeekNumbers = getKokurikulerWeekNumbers(weeks, koRows, koMode);
  const eventByWeekNumber = new Map<number, PromesLandscapeEventColumn | null>(
    weeks.map((week) => [week.weekNumber, getPromesLandscapeCalendarEvent(week)])
  );

  function isUnitInWeek(unit: UnitDistribution | null, weekNumber: number) {
    return !!unit && unit.weeks.includes(weekNumber);
  }

  function weekMeta(weekNumber: number) {
    return weeks.find((w) => w.weekNumber === weekNumber);
  }

  return (
    <div className="print-area">
      <div className="document-page document-landscape promes-landscape-page promes-one-page" id="promes-landscape-doc">
        <div className="promes-title">PROGRAM SEMESTER {semester === 1 ? "1" : "2"}</div>

        <div className="promes-identity-text promes-identity-split">
          <div>
            <p><strong>Tahun Pelajaran</strong> : {activeYearLabel || "-"}</p>
            <p><strong>Mata Pelajaran</strong> : {profile?.subject ?? "-"}</p>
            <p><strong>Satuan Pendidikan</strong> : {schoolName || "-"}</p>
          </div>
          <div>
            <p><strong>Kelas/Semester</strong> : {profile?.grade ?? "-"}/{semester === 1 ? "Ganjil" : "Genap"}</p>
            <p><strong>Alokasi Waktu</strong> : {summary.effectiveWeeks > 0 ? Math.round(summary.intraCapacityJP / summary.effectiveWeeks) : 0} Jam/Minggu</p>
            <p><strong>Kokurikuler</strong> : {KO_MODE_LABELS_ID[koMode]}</p>
          </div>
        </div>

        <div className="promes-weekly-summary">
          <table className="promes-keterangan-table" style={{ marginBottom: "4pt" }}>
            <tbody>
              <tr>
                <td style={{ textAlign: "left" }}>Total Minggu: {summary.totalWeeks}</td>
                <td style={{ textAlign: "left" }}>Minggu Efektif: {summary.effectiveWeeks}</td>
                <td style={{ textAlign: "left" }}>Kapasitas Intra: {summary.intraCapacityJP} JP</td>
                <td style={{ textAlign: "left" }}>Cadangan: {summary.cadanganJP} JP</td>
                <td style={{ textAlign: "left" }}>Kokurikuler: {summary.koTotalJP} JP</td>
              </tr>
            </tbody>
          </table>
        </div>

        <table className="promes-matrix-table promes-vertical-event-table">
          <thead>
            <tr>
              <th rowSpan={2} className="col-tp-merdeka">Tujuan Pembelajaran</th>
              <th rowSpan={2} className="col-materi-merdeka">Materi Pembelajaran</th>
              <th rowSpan={2} className="col-jp-merdeka">JP</th>
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
            {visibleMatrixRows.map((row, rowIndex) => (
              <tr key={row.key} className={`promes-learning-row ${row.isGroupStart ? "promes-group-start" : ""}`}>
                <td className="tp-cell">{row.tp}</td>
                <td className="materi-cell">{row.materi && <strong>{row.materi}</strong>}</td>
                <td className="text-center jp-cell">{row.jp}</td>
                {weekColumns.map((week) => {
                  const event = eventByWeekNumber.get(week.weekNumber) ?? null;
                  if (event) {
                    if (rowIndex > 0) return null;
                    return (
                      <td
                        key={`event-${week.weekNumber}`}
                        rowSpan={visibleMatrixRows.length}
                        className={`week-cell promes-event-cell ${promesEventClassName(event.kind)}`}
                        title={event.label}
                      >
                        {renderVerticalEventLabel(event)}
                      </td>
                    );
                  }

                  const isLearning = isUnitInWeek(row.unit, week.weekNumber);
                  return (
                    <td
                      key={`${row.key}-${week.weekNumber}`}
                      className={`week-cell ${isLearning ? "promes-event-learning promes-learning-mark" : ""}`}
                    >
                      {isLearning ? "✓" : ""}
                    </td>
                  );
                })}
              </tr>
            ))}

            <tr className="total-row promes-summary-row">
              <td><strong>Jumlah Jam Efektif</strong></td>
              <td className="text-center"><strong>{summary.intraCapacityJP} JP</strong></td>
              <td></td>
              {weekColumns.map((week) => {
                const meta = weekMeta(week.weekNumber);
                const event = eventByWeekNumber.get(week.weekNumber) ?? null;
                return (
                  <td key={`eff-${week.weekNumber}`} className={`week-cell ${event ? promesEventClassName(event.kind) : ""}`}>
                    {meta?.isEffective ? "✔" : ""}
                  </td>
                );
              })}
            </tr>

            <tr className="cadangan-row promes-summary-row">
              <td>Jumlah Jam Cadangan</td>
              <td className="text-center">{summary.cadanganJP > 0 ? `${summary.cadanganJP} JP` : "-"}</td>
              <td></td>
              {weekColumns.map((week) => {
                const event = eventByWeekNumber.get(week.weekNumber) ?? null;
                return <td key={`cad-${week.weekNumber}`} className={`week-cell ${event ? promesEventClassName(event.kind) : ""}`}></td>;
              })}
            </tr>

            <tr className="ko-row promes-summary-row">
              <td>{koMode === "end_of_semester" ? "Kokurikuler Blok Akhir Semester" : "Kokurikuler Per Minggu"}</td>
              <td className="text-center">{summary.koTotalJP > 0 ? `${summary.koTotalJP} JP` : "-"}</td>
              <td></td>
              {weekColumns.map((week) => {
                const isKO = koWeekNumbers.has(week.weekNumber);
                return (
                  <td key={`ko-${week.weekNumber}`} className={`week-cell ${isKO ? "promes-event-kokurikuler" : ""}`}>
                    {isKO ? "✔" : ""}
                  </td>
                );
              })}
            </tr>

            <tr className="total-row promes-summary-row">
              <td><strong>Jumlah Jam Total Semester {semester === 1 ? "Ganjil" : "Genap"}</strong></td>
              <td className="text-center"><strong>{summary.intraCapacityJP + summary.cadanganJP + summary.koTotalJP} JP</strong></td>
              <td></td>
              {weekColumns.map((week) => {
                const event = eventByWeekNumber.get(week.weekNumber) ?? null;
                return <td key={`tot-${week.weekNumber}`} className={`week-cell ${event ? promesEventClassName(event.kind) : ""}`}></td>;
              })}
            </tr>
          </tbody>
        </table>

        <div className="promes-legend-block">
          <strong>Keterangan</strong>
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

        <PromesDocSignature
          schoolRegency={schoolRegency}
          headmasterName={headmasterName}
          teacherName={teacherName}
        />
      </div>
    </div>
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

function PromesDocWeekRow({ week }: { week: PromesWeek }) {
  const dateStr = formatLongDateID(week.startDate).split(",")[1]?.trim() ?? week.startDate;

  const calLabel = week.calendarKind
    ? promesCalendarKindLabel(week.calendarKind) || week.blockReason || ""
    : "";

  let materiCell: React.ReactNode;
  if (week.assignedUnits.length > 0) {
    materiCell = week.assignedUnits.map((u, i) => (
      <span key={i}>{i > 0 && "; "}{u.title} ({u.jp} JP)</span>
    ));
  } else if (calLabel) {
    materiCell = <strong>{calLabel}</strong>;
  } else if (week.reservedForCadangan > 0) {
    materiCell = <em>(Cadangan — lihat catatan di bawah)</em>;
  } else if (week.isEffective) {
    materiCell = "(Kosong)";
  } else {
    materiCell = week.blockReason ?? "(Libur)";
  }

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
