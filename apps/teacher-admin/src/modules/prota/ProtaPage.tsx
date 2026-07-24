/**
 * Modul M03 Prota — halaman /prota
 * Sumber: docs/SPRINT_2_DESIGN.md §4
 *
 * Filosofi: Prota adalah sumber kebenaran untuk materi, JP, dan tujuan pembelajaran.
 * KO (kokurikuler) hanya catatan struktur, BUKAN bagian dari validasi material.
 *
 * WYSIWYG-DOC-FASE4: Prota sebagai dokumen WYSIWYG.
 *   - Saat profile dipilih → layout WYSIWYG: sidebar (kontrol) + DocumentPreview (dokumen).
 *   - Saat belum pilih profile → daftar profile (CRUD list).
 *   - Komponen ProtaDocument merender tabel resmi di kanvas A4.
 *   - Auto-save ke schoolDocuments (docType: "prota").
 *   - Uses ensureDoc pattern from FASE3 audit fixes.
 */

import { useEffect, useState } from "react";
import { Card, CardHeader, Button, EmptyState, Badge, LoadingState } from "../../shared/ui";
import { listProtaProfiles } from "../../shared/db/prota-repo";
import { getActiveAcademicYear, getSchoolProfile } from "../../shared/db/profile-repo";
import type { ProtaProfile } from "@guru-admin/domain";
import { sumJP, validateJPTotal } from "@guru-admin/shared";
import { DocumentPreview } from "../../shared/documents";

// Sub-components
import { Header } from "./Header";
import { NewProfileForm } from "./NewProfileForm";
import { ImportModal } from "./ImportModal";
import { ProtaDocument } from "./ProtaDocument";
import { ProtaSidebar } from "./ProtaSidebar";
import { statusBadge, statusLabel } from "./prota-helpers";
import { useProtaDocState } from "./useProtaDocState";

/* ------------------------------------------------------------------ */
/*  Main Component                                                    */
/* ------------------------------------------------------------------ */

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

  // WYSIWYG-DOC-FASE4
  const [schoolName, setSchoolName] = useState<string>("");
  const [showSidebar, setShowSidebar] = useState(
    typeof window !== "undefined" && window.innerWidth >= 1024
  );

  const selected = profiles.find((p) => p.id === selectedId) ?? null;

  // Doc lifecycle hook
  const {
    docId,
    setDocId,
    docStatus,
    docSemester,
    setDocSemester,
    formatDokumen,
    handleSemesterChange,
    handleSaveDoc,
    handleSetFinal,
    handleOrientationChange,
    docDataForAutoSave,
  } = useProtaDocState(activeYearId, activeYearLabel, selected, schoolName);

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
      const sp = await getSchoolProfile();
      setSchoolName(sp?.name ?? "");
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!error && !success) return;
    const t = setTimeout(() => { setError(null); setSuccess(null); }, error ? 5000 : 3000);
    return () => clearTimeout(t);
  }, [error, success]);

  // ESC to close modals
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (showNew) setShowNew(false);
        if (showImport) setShowImport(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showNew, showImport]);

  if (loading) return <LoadingState />;

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

  /* ================================================================ */
  /*  WYSIWYG VIEW — profile dipilih, sidebar + document              */
  /* ================================================================ */
  if (selected) {
    const s1Units = selected.units.filter((u) => u.semester === 1);
    const s2Units = selected.units.filter((u) => u.semester === 2);
    const semUnits = docSemester === 1 ? s1Units : s2Units;
    const targetJP = docSemester === 1 ? selected.semester1IntraJP : selected.semester2IntraJP;
    const validation = validateJPTotal(targetJP, semUnits);

    return (
      <div className="doc-wysiwyg-layout">
        {/* ---------- MOBILE BACKDROP ---------- */}
        <div
          className={`doc-sidebar-backdrop no-print ${!showSidebar ? "doc-backdrop-hidden" : ""}`}
          onClick={() => setShowSidebar(false)}
          aria-hidden="true"
        />

        {/* ---------- SIDEBAR ---------- */}
        <ProtaSidebar
          showSidebar={showSidebar}
          onCloseSidebar={() => setShowSidebar(false)}
          docSemester={docSemester}
          onSemesterChange={handleSemesterChange}
          selected={selected}
          semUnits={semUnits}
          targetJP={targetJP}
          validation={validation}
          onBack={() => { setSelectedId(null); setDocId(undefined); }}
        />

        {/* ---------- DOCUMENT AREA ---------- */}
        <div className="doc-document-area">
          <DocumentPreview
            docId={docId}
            docType="prota"
            orientation={formatDokumen}
            status={docStatus}
            data={docDataForAutoSave}
            onSave={handleSaveDoc}
            onSetFinal={handleSetFinal}
            onOrientationChange={handleOrientationChange}
            showFormatToggle={false}
          >
            <ProtaDocument
              profile={selected}
              semester={docSemester}
              schoolName={schoolName}
              tahunAjaran={activeYearLabel}
            />
          </DocumentPreview>
        </div>

        {/* ---------- SIDEBAR TOGGLE ---------- */}
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

        {/* Toast messages */}
        {error && <div className="doc-toast doc-toast-error no-print" role="status" aria-live="polite">{error}</div>}
        {success && <div className="doc-toast doc-toast-success no-print" role="status" aria-live="polite">{success}</div>}
      </div>
    );
  }

  /* ================================================================ */
  /*  LIST VIEW — daftar profile, belum pilih                         */
  /* ================================================================ */
  return (
    <div className="space-y-4">
      <Header yearLabel={activeYearLabel} count={profiles.length} />

      {error && <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-700" role="status" aria-live="polite">{error}</div>}
      {success && <div className="p-3 rounded-md bg-brand-50 border border-brand-200 text-sm text-brand-700" role="status" aria-live="polite">{success}</div>}

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
              <div
                key={p.id}
                className={`w-full text-left p-3 border rounded-md transition-colors ${
                  selectedId === p.id
                    ? "border-brand-400 bg-brand-50"
                    : "border-slate-200 hover:border-brand-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-slate-900">{p.subject} — Kelas {p.grade}</span>
                    <Badge variant={statusBadge(p.status)}>{statusLabel(p.status)}</Badge>
                    <span className="text-xs text-slate-500 ml-2">
                      {p.units.length} unit · {sumJP(p.units)} JP
                    </span>
                  </div>
                  <Button
                    variant={selectedId === p.id ? "primary" : "secondary"}
                    className="text-xs px-3 py-1 shrink-0"
                    onClick={() => { setSelectedId(p.id); setDocSemester(1); }}
                  >
                    Buka
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
