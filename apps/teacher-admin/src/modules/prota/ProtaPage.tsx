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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardHeader, Input, Select, Textarea, Button, EmptyState, Badge } from "../../shared/ui";
import {
  listProtaProfiles,
  saveProtaProfile,
  importProtaFromJSON,
} from "../../shared/db/prota-repo";
import { getActiveAcademicYear, getTeacherProfile, getSchoolProfile } from "../../shared/db/profile-repo";
import type { ProtaProfile } from "@guru-admin/domain";
import { sumJP, validateJPTotal } from "@guru-admin/shared";
import { parseProtaExcelPaste, type ProtaExcelParseResult } from "@guru-admin/domain";
// WYSIWYG-DOC-FASE4
import { DocumentPreview } from "../../shared/documents";
import {
  saveSchoolDocument,
  updateSchoolDocumentData,
  updateSchoolDocumentLayout,
  setSchoolDocumentStatus,
  findSchoolDocumentByCompositeKey,
} from "../../shared/db/school-document-repo";
import type { SchoolDocOrientation, DocumentStatus } from "@guru-admin/domain";

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const MONTH_FULL_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

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
  const [formatDokumen, setFormatDokumen] = useState<"portrait" | "landscape">("portrait");
  const [docId, setDocId] = useState<string | undefined>(undefined);
  const [docStatus, setDocStatus] = useState<DocumentStatus>("draft");
  const [docSemester, setDocSemester] = useState<1 | 2>(1);
  const ensuringRef = useRef(false);

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

  // WYSIWYG-DOC-FASE4: ensureDoc (find-or-create schoolDocument)
  const ensureDoc = useCallback(async (profile: ProtaProfile, semester: 1 | 2) => {
    if (!activeYearId || !activeYearLabel || !profile) return;
    if (ensuringRef.current) return;
    ensuringRef.current = true;
    try {
      const existing = await findSchoolDocumentByCompositeKey({
        docType: "prota",
        semester,
        tahunAjaran: activeYearLabel,
        kodeMapel: profile.subject,
        kodeKelas: profile.grade,
        teacherId: profile.teacherId,
      });
      if (existing) {
        setDocId(existing.id);
        setDocStatus(existing.status);
        if (existing.orientation) setFormatDokumen(existing.orientation);
      } else {
        const doc = await saveSchoolDocument({
          docType: "prota",
          semester,
          tahunAjaran: activeYearLabel,
          kodeMapel: profile.subject,
          kodeKelas: profile.grade,
          teacherId: profile.teacherId,
          academicYearId: activeYearId,
          data: { semester, subject: profile.subject, grade: profile.grade, schoolName },
          orientation: "portrait",
          status: "draft",
        });
        setDocId(doc.id);
        setDocStatus("draft");
        setFormatDokumen("portrait");
      }
    } finally {
      ensuringRef.current = false;
    }
  }, [activeYearId, activeYearLabel, schoolName]);

  // When selected profile changes, ensure doc
  const selected = profiles.find((p) => p.id === selectedId) ?? null;
  useEffect(() => {
    if (selected) {
      void ensureDoc(selected, docSemester);
    } else {
      setDocId(undefined);
      setDocStatus("draft");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, activeYearId]);

  const handleSemesterChange = useCallback((newSemester: 1 | 2) => {
    setDocId(undefined);
    setDocStatus("draft");
    setDocSemester(newSemester);
    if (selected) void ensureDoc(selected, newSemester);
  }, [selected, ensureDoc]);

  // WYSIWYG callbacks
  const handleSaveDoc = useCallback(async (id: string, data: Record<string, unknown>) => {
    await updateSchoolDocumentData(id, data);
  }, []);

  const handleSetFinal = useCallback(async (id: string) => {
    await setSchoolDocumentStatus(id, "final");
    setDocStatus("final");
  }, []);

  const handleOrientationChange = useCallback((orientation: SchoolDocOrientation) => {
    setFormatDokumen(orientation);
    if (docId) void updateSchoolDocumentLayout(docId, { orientation });
  }, [docId]);

  // Auto-save data memo
  const docDataForAutoSave = useMemo(() => {
    if (!selected) return {};
    const semUnits = selected.units.filter((u) => u.semester === docSemester);
    return {
      semester: docSemester,
      tahunAjaran: activeYearLabel,
      subject: selected.subject,
      grade: selected.grade,
      schoolName,
      totalJP: sumJP(semUnits),
      unitCount: semUnits.length,
      unitsSnapshot: semUnits.map((u) => ({
        order: u.order,
        title: u.title,
        jp: u.jp,
        code: u.code,
        learningOutcome: u.learningOutcome,
      })),
    };
  }, [selected, docSemester, activeYearLabel, schoolName]);

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

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;

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
        {showSidebar && (
          <div
            className="doc-sidebar-backdrop no-print"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* ---------- SIDEBAR ---------- */}
        {showSidebar && (
          <aside className="doc-sidebar no-print">
            <div className="doc-sidebar-header">
              <h2 className="text-sm font-bold text-slate-900">Program Tahunan</h2>
              <button
                type="button"
                className="doc-sidebar-close"
                onClick={() => setShowSidebar(false)}
                title="Tutup sidebar"
              >
                ✕
              </button>
            </div>

            {/* -- Konteks -- */}
            <div className="doc-sidebar-section">
              <h3 className="doc-sidebar-section-title">Konteks</h3>
              <Select
                label="Semester"
                id="prota-doc-sem"
                value={String(docSemester)}
                onChange={(v) => handleSemesterChange(Number(v) as 1 | 2)}
                options={[{ value: "1", label: "Semester 1 (Ganjil)" }, { value: "2", label: "Semester 2 (Genap)" }]}
              />
              <p className="text-xs text-slate-500 mt-1">
                {selected.subject} — Kelas {selected.grade} · Fase {selected.phase}
              </p>
            </div>

            {/* -- Ringkasan -- */}
            <div className="doc-sidebar-section">
              <h3 className="doc-sidebar-section-title">Ringkasan</h3>
              <dl className="doc-summary-dl">
                <div><dt>Target JP</dt><dd>{targetJP} JP</dd></div>
                <div><dt>Subtotal materi</dt><dd>{validation.actual} JP</dd></div>
                <div><dt>Selisih</dt><dd className={validation.status === "valid" ? "kme-effective-text" : "kme-ineffective-text"}>{validation.diff > 0 ? `Kurang ${validation.diff}` : validation.diff < 0 ? `Lebih ${Math.abs(validation.diff)}` : "✓ Tepat"}</dd></div>
                <div><dt>Jumlah unit</dt><dd>{semUnits.length}</dd></div>
              </dl>
            </div>

            {/* -- Daftar Unit -- */}
            <div className="doc-sidebar-section">
              <h3 className="doc-sidebar-section-title">Daftar Unit</h3>
              {semUnits.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Belum ada unit untuk semester ini.</p>
              ) : (
                <ul className="doc-sidebar-list">
                  {semUnits.map((u) => (
                    <li key={u.id} className="doc-sidebar-list-item">
                      <span className="doc-sidebar-list-title">{u.order}. {u.title}</span>
                      <Badge variant={u.jp > 0 ? "success" : "warning"}>{u.jp} JP</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* -- Footer -- */}
            <div className="doc-sidebar-section doc-sidebar-footer">
              <Button
                variant="secondary"
                onClick={() => { setSelectedId(null); setDocId(undefined); }}
                className="w-full"
              >
                ← Kembali ke Daftar Prota
              </Button>
            </div>
          </aside>
        )}

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
          >
            ⚙
          </button>
        )}

        {/* Toast messages */}
        {error && <div className="doc-toast doc-toast-error no-print">{error}</div>}
        {success && <div className="doc-toast doc-toast-success no-print">{success}</div>}
      </div>
    );
  }

  /* ================================================================ */
  /*  LIST VIEW — daftar profile, belum pilih                         */
  /* ================================================================ */
  return (
    <div className="space-y-4">
      <Header yearLabel={activeYearLabel} count={profiles.length} />

      {error && <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-700">{error}</div>}
      {success && <div className="p-3 rounded-md bg-brand-50 border border-brand-200 text-sm text-brand-700">{success}</div>}

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

/* ============================================================ */
/*  Header                                                       */
/* ============================================================ */

function Header({ yearLabel, count }: { yearLabel?: string; count?: number }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Program Tahunan (Prota)</h1>
      <p className="text-sm text-slate-500 mt-1">
        {yearLabel ? `Tahun pelajaran aktif: ${yearLabel} · ${count ?? 0} Prota` : "Sumber kebenaran untuk materi dan JP."}
      </p>
    </div>
  );
}

function statusBadge(status: ProtaProfile["status"]): "success" | "warning" | "error" | "neutral" {
  switch (status) {
    case "draft": return "neutral";
    case "ready_for_review": return "warning";
    case "final": return "success";
    case "revised": return "warning";
    case "locked": return "success";
    default: return "neutral";
  }
}

function statusLabel(status: ProtaProfile["status"]): string {
  switch (status) {
    case "draft": return "Draf";
    case "ready_for_review": return "Siap Dicek";
    case "final": return "Final";
    case "revised": return "Perlu Revisi";
    case "locked": return "Dikunci";
    default: return status;
  }
}

/* ------------------------------------------------------------------ */
/*  New Profile Form                                                   */
/* ------------------------------------------------------------------ */

function NewProfileForm({
  academicYearId,
  onClose,
  onSaved,
  onError,
}: {
  academicYearId: string;
  onClose: () => void;
  onSaved: (p: ProtaProfile) => void;
  onError: (msg: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    subject: "",
    grade: "VII",
    phase: "D",
    annualIntraJP: 72,
    semester1IntraJP: 36,
    semester2IntraJP: 36,
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const teacher = await getTeacherProfile();
      if (!teacher) throw new Error("Profil guru belum diisi. Lengkapi di menu Profil.");
      const saved = await saveProtaProfile({
        academicYearId,
        teacherId: teacher.id,
        subject: form.subject,
        grade: form.grade,
        phase: form.phase,
        annualIntraJP: form.annualIntraJP,
        semester1IntraJP: form.semester1IntraJP,
        semester2IntraJP: form.semester2IntraJP,
        units: [],
        status: "draft",
        sourceYearId: null,
      });
      onSaved(saved);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Gagal membuat Prota.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="doc-overlay no-print" onClick={onClose}>
      <div className="doc-overlay-card" onClick={(e) => e.stopPropagation()}>
        <Card>
          <CardHeader title="Buat Prota Baru" description="Identitas dasar. Materi/units bisa ditambah setelah ini." />
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-3">
              <Input label="Mapel" id="p-subject" required value={form.subject} onChange={(v) => set("subject", v)} placeholder="Pendidikan Pancasila" />
              <Select label="Kelas" id="p-grade" value={form.grade} onChange={(v) => set("grade", v)}
                options={[{value:"VII",label:"VII"},{value:"VIII",label:"VIII"},{value:"IX",label:"IX"}]} />
              <Select label="Fase" id="p-phase" value={form.phase} onChange={(v) => set("phase", v)}
                options={[{value:"D",label:"D (VII-IX)"}]} />
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <Input label="Total JP Tahunan (intra)" id="p-annual" type="number" value={String(form.annualIntraJP)} onChange={(v) => set("annualIntraJP", Number(v) || 0)} />
              <Input label="JP Semester 1 (intra)" id="p-s1" type="number" value={String(form.semester1IntraJP)} onChange={(v) => set("semester1IntraJP", Number(v) || 0)} />
              <Input label="JP Semester 2 (intra)" id="p-s2" type="number" value={String(form.semester2IntraJP)} onChange={(v) => set("semester2IntraJP", Number(v) || 0)} />
            </div>
            <p className="text-xs text-slate-500">
              ℹ Untuk PPKn SMP: 72 JP intra + 36 JP KO = 108 JP total struktur. KO hanya catatan, tidak mempengaruhi validasi material.
            </p>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Buat Prota"}</Button>
              <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Batal</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Import Modal                                                       */
/* ------------------------------------------------------------------ */

function ImportModal({
  academicYearId,
  onClose,
  onImported,
  onError,
}: {
  academicYearId: string;
  onClose: () => void;
  onImported: (p: ProtaProfile) => void;
  onError: (errs: string[]) => void;
}) {
  const [mode, setMode] = useState<"json" | "excel">("json");
  const [jsonText, setJsonText] = useState("");
  const [excelText, setExcelText] = useState("");
  const [excelPreview, setExcelPreview] = useState<ProtaExcelParseResult | null>(null);
  const [excelMeta, setExcelMeta] = useState({
    subject: "",
    grade: "",
    phase: "",
    annualIntraJP: 0,
    semester1IntraJP: 0,
    semester2IntraJP: 0,
  });
  const [importing, setImporting] = useState(false);

  async function handleImport() {
    setImporting(true);
    try {
      const teacher = await getTeacherProfile();
      if (!teacher) {
        onError(["Profil guru belum diisi. Lengkapi di menu Profil dulu."]);
        setImporting(false);
        return;
      }

      if (mode === "json") {
        let parsed: unknown;
        try {
          parsed = JSON.parse(jsonText);
        } catch (e) {
          onError([`JSON tidak valid: ${e instanceof Error ? e.message : String(e)}`]);
          setImporting(false);
          return;
        }
        const result = await importProtaFromJSON(parsed, academicYearId, teacher.id);
        if (result.success && result.profile) {
          onImported(result.profile);
        } else {
          onError(result.errors);
        }
      } else {
        if (!excelPreview || excelPreview.units.length === 0) {
          onError(["Tidak ada unit valid untuk diimpor. Klik Preview dulu."]);
          setImporting(false);
          return;
        }
        if (!excelMeta.subject || !excelMeta.grade || !excelMeta.phase) {
          onError(["Subject, Grade, Phase wajib diisi untuk mode Excel paste."]);
          setImporting(false);
          return;
        }

        const existing = await listProtaProfiles(academicYearId);
        const duplicate = existing.find(
          (p) => p.subject === excelMeta.subject && p.grade === excelMeta.grade
        );
        if (duplicate) {
          onError([
            `Prota untuk ${excelMeta.subject} kelas ${excelMeta.grade} sudah ada (status: ${duplicate.status}). ` +
            `Hapus Prota yang lama dulu bila ingin import ulang, atau gunakan mode JSON (yang akan membuat profile baru terpisah).`,
          ]);
          setImporting(false);
          return;
        }

        const jpInconsistency: string[] = [];
        if (
          excelMeta.annualIntraJP > 0 &&
          excelMeta.semester1IntraJP + excelMeta.semester2IntraJP !== excelMeta.annualIntraJP
        ) {
          jpInconsistency.push(
            `Warning: semester1 (${excelMeta.semester1IntraJP}) + semester2 (${excelMeta.semester2IntraJP}) ≠ annual (${excelMeta.annualIntraJP}).`
          );
        }

        const ok = window.confirm(
          `Impor Prota ${excelMeta.subject} kelas ${excelMeta.grade} dengan ${excelPreview.units.length} unit? ` +
          (jpInconsistency.length > 0 ? jpInconsistency.join(" ") + " " : "") +
          `Lanjutkan?`
        );
        if (!ok) {
          setImporting(false);
          return;
        }

        const profile = await saveProtaProfile({
          subject: excelMeta.subject,
          grade: excelMeta.grade,
          phase: excelMeta.phase,
          annualIntraJP: excelMeta.annualIntraJP,
          semester1IntraJP: excelMeta.semester1IntraJP,
          semester2IntraJP: excelMeta.semester2IntraJP,
          academicYearId,
          teacherId: teacher.id,
          units: excelPreview.units.map((u) => ({
            semester: u.semester,
            title: u.title,
            learningOutcome: u.learningOutcome,
            jp: u.jp,
            order: u.order,
            code: u.code,
          })),
          status: "draft",
          sourceYearId: null,
        });
        onImported(profile);
      }
    } finally {
      setImporting(false);
    }
  }

  function handleExcelPreview() {
    const result = parseProtaExcelPaste(excelText);
    setExcelPreview(result);
  }

  return (
    <div className="doc-overlay no-print" onClick={onClose}>
      <div className="doc-overlay-card" onClick={(e) => e.stopPropagation()}>
        <Card>
          <CardHeader
            title="Impor Prota"
            description="Mode JSON (format guru-admin-flow/prota/v1) atau Excel paste. Prota baru akan dibuat dengan status draft."
          />
          <div className="space-y-3">
            <Select
              label="Mode Impor"
              id="prota-import-mode"
              value={mode}
              onChange={(v) => { setMode(v as "json" | "excel"); setExcelPreview(null); }}
              options={[
                { value: "json", label: "JSON (format guru-admin-flow/prota/v1)" },
                { value: "excel", label: "Excel Paste (tab/koma/semicolon)" },
              ]}
            />

            {mode === "json" ? (
              <Textarea
                label="JSON Prota"
                id="import-prota-json"
                value={jsonText}
                onChange={setJsonText}
                rows={12}
                placeholder={`{
  "$schema": "guru-admin-flow/prota/v1",
  "subject": "Pendidikan Pancasila",
  "grade": "VII",
  ...
}`}
              />
            ) : (
              <>
                <div className="grid sm:grid-cols-3 gap-3">
                  <Input label="Subject" id="prota-excel-subject" value={excelMeta.subject} onChange={(v) => setExcelMeta({ ...excelMeta, subject: v })} />
                  <Input label="Grade" id="prota-excel-grade" value={excelMeta.grade} onChange={(v) => setExcelMeta({ ...excelMeta, grade: v })} />
                  <Input label="Phase" id="prota-excel-phase" value={excelMeta.phase} onChange={(v) => setExcelMeta({ ...excelMeta, phase: v })} />
                  <Input label="Annual Intra JP" id="prota-excel-annual" type="number" value={String(excelMeta.annualIntraJP)} onChange={(v) => setExcelMeta({ ...excelMeta, annualIntraJP: Number(v) || 0 })} />
                  <Input label="Sem 1 Intra JP" id="prota-excel-sem1" type="number" value={String(excelMeta.semester1IntraJP)} onChange={(v) => setExcelMeta({ ...excelMeta, semester1IntraJP: Number(v) || 0 })} />
                  <Input label="Sem 2 Intra JP" id="prota-excel-sem2" type="number" value={String(excelMeta.semester2IntraJP)} onChange={(v) => setExcelMeta({ ...excelMeta, semester2IntraJP: Number(v) || 0 })} />
                </div>
                <Textarea
                  label="Paste dari Excel (header: Semester, Materi, JP, Order, Code, Learning Outcome)"
                  id="import-prota-excel"
                  value={excelText}
                  onChange={(v) => { setExcelText(v); setExcelPreview(null); }}
                  rows={10}
                  placeholder={"Semester\tMateri\tJP\tOrder\tCode\tLearning Outcome\n1\tBab 1: Norma\t2\t1\tM1\tMemahami norma\n2\tBab 3: Hukum\t2\t2\tM3\tMemahami hukum"}
                />
                <Button variant="secondary" className="text-sm" onClick={handleExcelPreview} disabled={!excelText.trim()}>
                  Preview Parse
                </Button>
                {excelPreview && (
                  <div className="p-3 bg-slate-50 rounded-md text-sm space-y-2">
                    <p className="font-semibold text-emerald-700">
                      ✓ {excelPreview.units.length} unit siap diimpor
                      {excelPreview.skippedRows.length > 0 && (
                        <span className="text-amber-700"> · {excelPreview.skippedRows.length} baris di-skip</span>
                      )}
                    </p>
                    {excelPreview.skippedRows.length > 0 && (
                      <div className="max-h-32 overflow-y-auto text-xs text-rose-700">
                        <p className="font-semibold">Baris di-skip:</p>
                        {excelPreview.skippedRows.map((s, i) => (
                          <div key={i} className="p-1">Baris {s.lineNumber}: {s.reason}</div>
                        ))}
                      </div>
                    )}
                    {excelPreview.units.length > 0 && (
                      <div className="max-h-48 overflow-y-auto text-xs">
                        {excelPreview.units.map((u, i) => (
                          <div key={i} className="p-1 border-b border-slate-200">
                            S{u.semester} · <strong>{u.title}</strong> · {u.jp} JP · order {u.order}
                            {u.code && <span className="text-slate-500"> · {u.code}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleImport}
                disabled={
                  importing ||
                  (mode === "json" ? !jsonText.trim() : !excelPreview || excelPreview.units.length === 0)
                }
              >
                {importing ? "Mengimpor..." : "Impor Prota"}
              </Button>
              <Button variant="secondary" onClick={onClose} disabled={importing}>Batal</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ============================================================ */
/*  Prota Document (A4 portrait)                                 */
/* ============================================================ */

function ProtaDocument({
  profile,
  semester,
  schoolName,
  tahunAjaran,
}: {
  profile: ProtaProfile;
  semester: 1 | 2;
  schoolName: string;
  tahunAjaran: string;
}) {
  const semUnits = profile.units.filter((u) => u.semester === semester);
  const targetJP = semester === 1 ? profile.semester1IntraJP : profile.semester2IntraJP;
  const subtotalJP = sumJP(semUnits);
  const koJP = semester === 1
    ? (profile.semester1CocurricularJP ?? 0)
    : (profile.semester2CocurricularJP ?? 0);
  const totalJP = subtotalJP + koJP;

  return (
    <div className="print-area">
      <div className="document-page document-portrait">
        <div className="document-title">PROGRAM TAHUNAN</div>
        <div className="document-subtitle">
          SEMESTER {semester === 1 ? "1 (GANJIL)" : "2 (GENAP)"} — TAHUN PELAJARAN {tahunAjaran}
        </div>

        {/* Identity table */}
        <table className="document-identity">
          <tbody>
            <tr>
              <td>Satuan Pendidikan</td>
              <td>{schoolName || "-"}</td>
              <td>Semester</td>
              <td>{semester === 1 ? "Ganjil" : "Genap"}</td>
            </tr>
            <tr>
              <td>Mata Pelajaran</td>
              <td>{profile.subject}</td>
              <td>Kelas / Fase</td>
              <td>{profile.grade} / {profile.phase}</td>
            </tr>
            <tr>
              <td>Tahun Pelajaran</td>
              <td>{tahunAjaran}</td>
              <td>Alokasi Waktu</td>
              <td>{subtotalJP} JP intra{koJP > 0 ? ` + ${koJP} JP KO` : ""}</td>
            </tr>
          </tbody>
        </table>

        {/* Main table: Unit Materi */}
        <div className="document-section-title">DAFTAR MATERI / TUJUAN PEMBELAJARAN</div>
        <table className="document-table prota-table">
          <thead>
            <tr>
              <th style={{ width: "6%" }}>No</th>
              <th style={{ width: "8%" }}>Kode</th>
              <th>Materi / Tujuan Pembelajaran</th>
              <th style={{ width: "10%" }}>JP</th>
            </tr>
          </thead>
          <tbody>
            {semUnits.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-slate-400 italic">Belum ada unit</td>
              </tr>
            ) : (
              semUnits.map((u) => (
                <tr key={u.id}>
                  <td className="text-center">{u.order}</td>
                  <td className="text-center">{u.code || "-"}</td>
                  <td>
                    <span className="font-medium">{u.title}</span>
                    {u.learningOutcome && (
                      <span className="prota-lo-text"><br />{u.learningOutcome}</span>
                    )}
                  </td>
                  <td className="text-center">{u.jp}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="text-right"><strong>Subtotal JP Intrakurikuler</strong></td>
              <td className="text-center"><strong>{subtotalJP}</strong></td>
            </tr>
            {koJP > 0 && (
              <tr>
                <td colSpan={3} className="text-right">JP Kokurikuler</td>
                <td className="text-center">{koJP}</td>
              </tr>
            )}
            {koJP > 0 && (
              <tr>
                <td colSpan={3} className="text-right"><strong>Total JP</strong></td>
                <td className="text-center"><strong>{totalJP}</strong></td>
              </tr>
            )}
            <tr>
              <td colSpan={3} className="text-right">Target JP Intrakurikuler</td>
              <td className="text-center">{targetJP}</td>
            </tr>
            <tr>
              <td colSpan={3} className="text-right">
                <strong>Selisih</strong>
              </td>
              <td className="text-center">
                <strong className={subtotalJP === targetJP ? "kme-effective-text" : "kme-ineffective-text"}>
                  {subtotalJP === targetJP ? "✓ Tepat" : `${subtotalJP > targetJP ? "Lebih" : "Kurang"} ${Math.abs(subtotalJP - targetJP)} JP`}
                </strong>
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Signature */}
        <div className="signature-grid" style={{ marginTop: "24pt" }}>
          <div>
            <p>Mengetahui,</p>
            <p>Kepala Sekolah</p>
            <div className="sig-space" />
            <p className="sig-name">(........................................)</p>
            <p>NIP. .....................</p>
          </div>
          <div>
            <p>..........., {MONTH_FULL_ID[new Date().getMonth()]} {new Date().getFullYear()}</p>
            <p>Guru Mata Pelajaran</p>
            <div className="sig-space" />
            <p className="sig-name">(........................................)</p>
            <p>NIP. .....................</p>
          </div>
        </div>
      </div>
    </div>
  );
}
