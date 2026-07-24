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
import { generatePromes } from "@guru-admin/domain";
import type { ProtaProfile, CalendarEvent, AcademicYear, PromesResult, PromesOptions, SchoolProfile, TeacherProfile } from "@guru-admin/domain";
import { PromesPortraitDocument } from "./PromesPortraitDocument";
import { PromesLandscapeKurikulumMerdekaDocument } from "./PromesMerdekaDocument";
import { PromesLandscapeMatrixDocument } from "./PromesLandscapeMatrixDocument";
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
  DEFAULT_INTRA_JP_PER_WEEK_PPKN,
  DEFAULT_KO_JP_PER_WEEK_PPKN,
  DEFAULT_CADANGAN_JP,
} from "@guru-admin/shared";

const KO_PROMES_MODE_OPTIONS: Array<{ value: NonNullable<PromesOptions["koMode"]>; label: string }> = [
  { value: "end_of_week", label: "Kokurikuler per minggu" },
  { value: "end_of_semester", label: "Kokurikuler blok akhir semester" },
];

/* PROMES-VARIASI-01: 3 variasi dokumen Promes */
type PromesVariasi = "ringkas" | "matrix" | "merdeka";

const PROMES_VARIASI_OPTIONS: Array<{ value: PromesVariasi; label: string; description: string }> = [
  { value: "ringkas", label: "Ringkas (Portrait)", description: "Daftar minggu per baris — format vertikal" },
  { value: "matrix", label: "Matrix JP (Landscape)", description: "Tabel JP per minggu — format landscape detail" },
  { value: "merdeka", label: "Kurikulum Merdeka (Landscape)", description: "Tabel KP/Kode TP + badge warna event — format Kurikulum Merdeka" },
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
  // PROMES-VARIASI-01: variasi dokumen (ringkas / matrix / merdeka)
  const [variasiDokumen, setVariasiDokumen] = useState<PromesVariasi>("matrix");
  // Derived orientation from variasi
  const formatDokumen: SchoolDocOrientation = variasiDokumen === "ringkas" ? "portrait" : "landscape";

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
          if (existing.data?.variasiDokumen) {
            setVariasiDokumen(existing.data.variasiDokumen as PromesVariasi);
          } else if (existing.data?.formatDokumen) {
            // Backward compat: map old orientation to variasi
            setVariasiDokumen(existing.data.formatDokumen === "portrait" ? "ringkas" : "matrix");
          } else if (existing.orientation) {
            setVariasiDokumen(existing.orientation === "portrait" ? "ringkas" : "matrix");
          }
          if (existing.data?.promesOptions) {
            setOptions(existing.data.promesOptions as PromesOptions);
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
          variasiDokumen,
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
      variasiDokumen,
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
    // Map orientation change to variasi
    setVariasiDokumen(orientation === "portrait" ? "ringkas" : "matrix");
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

            <div className="doc-sidebar-scroll">
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

              <Select
                label="Variasi Dokumen"
                id="ps-variasi"
                value={variasiDokumen}
                onChange={(v) => {
                  const newVariasi = v as PromesVariasi;
                  setVariasiDokumen(newVariasi);
                  // Auto-update orientation
                  const newOrientation: SchoolDocOrientation = newVariasi === "ringkas" ? "portrait" : "landscape";
                  if (docId) {
                    void updateSchoolDocumentLayout(docId, { orientation: newOrientation });
                  }
                }}
                options={PROMES_VARIASI_OPTIONS}
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
            </div>

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
            {variasiDokumen === "ringkas" ? (
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
            ) : variasiDokumen === "merdeka" ? (
              <PromesLandscapeKurikulumMerdekaDocument
                weeks={weeks}
                distribution={distribution}
                summary={summary}
                status={status}
                semester={semester}
                activeYearLabel={activeYear?.label ?? ""}
                schoolName={school?.name ?? ""}
                schoolRegency={school?.regency ?? ""}
                headmasterName={school?.headmasterName ?? ""}
                headmasterNip={school?.headmasterNip ?? ""}
                teacherName={teacher?.name ?? ""}
                teacherNip={teacher?.nip ?? ""}
                profile={currentProfile}
                options={options}
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

/* PromesDocWeekRow removed — logic now inline in PromesPortraitDocument distRows */
