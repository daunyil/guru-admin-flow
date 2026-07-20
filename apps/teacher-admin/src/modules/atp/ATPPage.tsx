/**
 * Bank ATP/TP — Tujuan Pembelajaran per guru per mapel per kelas.
 *
 * APP-USABLE-RC1: pakai atp-entry-repo formal (Dexie schema resmi),
 * bukan db.table("atp_entries") dynamic.
 *
 * ATP/TP menyimpan: kelas, bab, elemen, CP, TP, profil Pelajar Pancasila,
 * kata kunci, alokasi JP. LKPD wajib pilih TP (lihat menu LKPD).
 * AI Prompt tetap ada sebagai generator prompt (guru salin manual).
 *
 * WYSIWYG-DOC-FASE5: ATP sebagai dokumen WYSIWYG.
 *   - Layout always-on: sidebar (kontrol) + DocumentPreview (dokumen).
 *   - Komponen ATPDocument merender tabel resmi TP di kanvas A4.
 *   - Auto-save ke schoolDocuments (docType: "atp").
 *   - Uses ensureDoc pattern from FASE3/FASE4 audit fixes.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardHeader, Input, Textarea, Button, EmptyState, Badge, Select, LoadingState } from "../../shared/ui";
import { getActiveAcademicYear, getTeacherProfile, getSchoolProfile } from "../../shared/db/profile-repo";
import {
  listATPEntries,
  saveATPEntry,
  updateATPEntry,
  deleteATPEntry,
} from "../../shared/db/atp-entry-repo";
import { listLKPDs } from "../../shared/db/lkpd-repo";
import type { AcademicYear, TeacherProfile, ATPEntry, LKPD } from "@guru-admin/domain";
import {
  atpEntryLabel,
  validateAtpImport,
  atpImportToEntries,
  parseAtpExcelPaste,
  atpPasteRowsToEntries,
  type AtpPasteMeta,
} from "@guru-admin/domain";
// WYSIWYG-DOC-FASE5
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
/*  Main Component                                                    */
/* ------------------------------------------------------------------ */

export function ATPPage() {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [entries, setEntries] = useState<ATPEntry[]>([]);
  const [_lkpds, setLkpds] = useState<LKPD[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ATPEntry | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showAIPrompt, setShowAIPrompt] = useState<string | null>(null);

  // IMPORT-BANK-TP-PROTA-RC1: import JSON + Excel paste
  const [showImport, setShowImport] = useState(false);
  const [importMode, setImportMode] = useState<"json" | "excel">("json");
  const [importJson, setImportJson] = useState("");
  const [importExcel, setImportExcel] = useState("");
  const [importMeta, setImportMeta] = useState<AtpPasteMeta>({
    subject: "",
    grade: "VII",
    phase: "D",
  });
  const [importPreview, setImportPreview] = useState<
    | { type: "json"; entries: Array<Record<string, unknown>>; errors: string[] }
    | { type: "excel"; rows: ReturnType<typeof parseAtpExcelPaste>["rows"]; skipped: ReturnType<typeof parseAtpExcelPaste>["skippedRows"] }
    | null
  >(null);

  // WYSIWYG-DOC-FASE5: document state
  const [schoolName, setSchoolName] = useState<string>("");
  const [showSidebar, setShowSidebar] = useState(() => window.innerWidth >= 1024);
  const [formatDokumen, setFormatDokumen] = useState<"portrait" | "landscape">("portrait");
  const [docId, setDocId] = useState<string | undefined>(undefined);
  const [docStatus, setDocStatus] = useState<DocumentStatus>("draft");
  const [filterSubject, setFilterSubject] = useState<string>("");
  const [filterGrade, setFilterGrade] = useState<string>("");
  const ensuringRef = useRef(false);

  async function reload() {
    if (!year || !teacher) return;
    const [atps, lks] = await Promise.all([
      listATPEntries({ academicYearId: year.id, teacherId: teacher.id }),
      listLKPDs({ academicYearId: year.id, teacherId: teacher.id }),
    ]);
    setEntries(atps);
    setLkpds(lks);
  }

  useEffect(() => {
    void (async () => {
      const [y, tp] = await Promise.all([getActiveAcademicYear(), getTeacherProfile()]);
      setYear(y ?? null);
      setTeacher(tp);
      if (y && tp) {
        const [atps, lks] = await Promise.all([
          listATPEntries({ academicYearId: y.id, teacherId: tp.id }),
          listLKPDs({ academicYearId: y.id, teacherId: tp.id }),
        ]);
        setEntries(atps);
        setLkpds(lks);
        // Set default filter from first subject
        if (tp.subjects?.[0]?.subject) {
          setFilterSubject(tp.subjects[0].subject);
        }
        if (tp.subjects?.[0]?.grades?.[0]) {
          setFilterGrade(tp.subjects[0].grades[0]);
        }
      }
      const sp = await getSchoolProfile();
      setSchoolName(sp?.name ?? "");
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 3000);
    return () => clearTimeout(t);
  }, [message]);

  // WYSIWYG-DOC-FASE5: ensureDoc
  const ensureDoc = useCallback(async (subject: string, grade: string) => {
    if (!year || !teacher || !subject || !grade) return;
    if (ensuringRef.current) return;
    ensuringRef.current = true;
    try {
      const existing = await findSchoolDocumentByCompositeKey({
        docType: "atp",
        semester: 1, // ATP is not semester-specific, use 1 as default
        tahunAjaran: year.label,
        kodeMapel: subject,
        kodeKelas: grade,
        teacherId: teacher.id,
      });
      if (existing) {
        setDocId(existing.id);
        setDocStatus(existing.status);
        if (existing.orientation) setFormatDokumen(existing.orientation);
      } else {
        const doc = await saveSchoolDocument({
          docType: "atp",
          semester: 1, // ATP is not semester-specific
          tahunAjaran: year.label,
          kodeMapel: subject,
          kodeKelas: grade,
          teacherId: teacher.id,
          academicYearId: year.id,
          data: { subject, grade, schoolName, teacherName: teacher.name },
          orientation: "landscape",
          status: "draft",
        });
        setDocId(doc.id);
        setDocStatus("draft");
        setFormatDokumen("landscape");
      }
    } finally {
      ensuringRef.current = false;
    }
  }, [year, teacher, schoolName]);

  // When filter changes, ensure doc
  useEffect(() => {
    if (filterSubject && filterGrade && teacher) {
      void ensureDoc(filterSubject, filterGrade);
    } else {
      setDocId(undefined);
      setDocStatus("draft");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterSubject, filterGrade, teacher?.id]);

  // Filtered entries for document
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (filterSubject && e.subject !== filterSubject) return false;
      if (filterGrade && e.grade !== filterGrade) return false;
      return true;
    });
  }, [entries, filterSubject, filterGrade]);

  // Group entries by bab for document rendering
  const groupedByBab = useMemo(() => {
    const groups: Record<string, ATPEntry[]> = {};
    for (const e of filteredEntries) {
      const key = e.bab || "Tanpa Bab";
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    }
    return groups;
  }, [filteredEntries]);

  // Unique subjects and grades for filter
  const subjects = useMemo(() => [...new Set(entries.map((e) => e.subject))], [entries]);
  const grades = useMemo(() => {
    const filtered = filterSubject
      ? entries.filter((e) => e.subject === filterSubject)
      : entries;
    return [...new Set(filtered.map((e) => e.grade))];
  }, [entries, filterSubject]);

  // Auto-save data memo
  const docDataForAutoSave = useMemo(() => {
    if (filteredEntries.length === 0) return {};
    return {
      subject: filterSubject,
      grade: filterGrade,
      tahunAjaran: year?.label ?? "",
      schoolName,
      teacherName: teacher?.name ?? "",
      totalTP: filteredEntries.length,
      totalJP: filteredEntries.reduce((sum, e) => sum + e.alokasiJP, 0),
      entriesSnapshot: filteredEntries.map((e) => ({
        bab: e.bab,
        elemen: e.elemen,
        cp: e.cp,
        tp: e.tp,
        profilPelajar: e.profilPelajar,
        kataKunci: e.kataKunci,
        alokasiJP: e.alokasiJP,
        status: e.status,
      })),
    };
  }, [filteredEntries, filterSubject, filterGrade, year?.label, schoolName, teacher?.name]);

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

  // CRUD handlers
  async function handleSave(data: Omit<ATPEntry, "id" | "createdAt" | "updatedAt" | "deletedAt" | "syncStatus" | "academicYearId" | "teacherId" | "status">) {
    if (!year || !teacher) return;
    try {
      if (editing) {
        await updateATPEntry(editing.id, data);
        setMessage("TP diperbarui.");
      } else {
        await saveATPEntry({
          ...data,
          academicYearId: year.id,
          teacherId: teacher.id,
          teacherName: teacher.name,
          status: "draft",
        });
        setMessage("TP ditambahkan.");
      }
      setShowForm(false);
      setEditing(null);
      void reload();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Gagal simpan.");
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Hapus TP ini? LKPD yang memakai TP ini tetap ada (TP-nya jadi snapshot).")) return;
    await deleteATPEntry(id);
    setMessage("TP dihapus.");
    void reload();
  }

  // IMPORT handlers (same as before)
  function handleImportPreview() {
    if (importMode === "json") {
      try {
        const json = JSON.parse(importJson);
        const v = validateAtpImport(json);
        if (!v.success) {
          setImportPreview({ type: "json", entries: [], errors: v.errors });
          return;
        }
        const entries = atpImportToEntries(v.data);
        setImportPreview({ type: "json", entries: entries as unknown as Array<Record<string, unknown>>, errors: [] });
      } catch (e) {
        setImportPreview({
          type: "json",
          entries: [],
          errors: [`JSON tidak valid: ${e instanceof Error ? e.message : String(e)}`],
        });
      }
    } else {
      if (!importMeta.subject || !importMeta.grade || !importMeta.phase) {
        setImportPreview({
          type: "excel",
          rows: [],
          skipped: [{ lineNumber: 0, raw: "", reason: "Subject, Grade, Phase wajib diisi untuk Excel paste." }],
        });
        return;
      }
      const result = parseAtpExcelPaste(importExcel);
      setImportPreview({ type: "excel", rows: result.rows, skipped: result.skippedRows });
    }
  }

  async function handleImportApply() {
    if (!year || !teacher || !importPreview) return;

    let entriesToImport: Array<{
      subject: string; grade: string; phase: string; bab?: string;
      elemen: string; cp: string; tp: string; profilPelajar?: string;
      kataKunci?: string; alokasiJP: number; classId?: string;
    }>;
    let teacherNameForImport = teacher.name;

    if (importPreview.type === "json") {
      const json = JSON.parse(importJson);
      const v = validateAtpImport(json);
      if (!v.success) {
        setMessage(`Import gagal: ${v.errors.join("; ")}`);
        return;
      }
      entriesToImport = atpImportToEntries(v.data);
      teacherNameForImport = v.data.teacherName ?? teacher.name;
    } else {
      entriesToImport = atpPasteRowsToEntries(importPreview.rows, importMeta);
    }

    if (entriesToImport.length === 0) {
      setMessage("Tidak ada TP untuk diimpor.");
      return;
    }

    const existingKey = (e: { subject: string; grade: string; tp: string }) =>
      `${e.subject}|${e.grade}|${e.tp}`;
    const existing = await listATPEntries({ academicYearId: year.id, teacherId: teacher.id });
    const dbKeys = new Set(existing.map(existingKey));
    const duplicates = entriesToImport.filter((e) => dbKeys.has(existingKey(e)));
    const newEntries = entriesToImport.filter((e) => !dbKeys.has(existingKey(e)));

    let importDuplicates = false;
    if (duplicates.length > 0) {
      const typed = window.prompt(
        `Ditemukan ${duplicates.length} TP duplikat.\n` +
        `Default: hanya ${newEntries.length} TP baru.\n\n` +
        `Untuk paksa impor duplikat, ketik: IMPOR DUPLIKAT`
      );
      if (typed === "IMPOR DUPLIKAT") {
        importDuplicates = true;
      } else if (typed === null) {
        setMessage("Import dibatalkan.");
        return;
      }
    }

    if (newEntries.length === 0 && !importDuplicates) {
      setMessage(`Semua ${duplicates.length} TP sudah ada (duplikat).`);
      setShowImport(false);
      setImportJson("");
      setImportExcel("");
      setImportPreview(null);
      return;
    }

    const ok = window.confirm(
      `Impor ${importDuplicates ? entriesToImport.length : newEntries.length} TP ke Bank TP?`
    );
    if (!ok) return;

    try {
      const toImport = importDuplicates ? entriesToImport : newEntries;
      let saved = 0;
      for (const e of toImport) {
        await saveATPEntry({
          ...e,
          academicYearId: year.id,
          teacherId: teacher.id,
          teacherName: teacherNameForImport,
          status: "draft",
        });
        saved++;
      }
      setMessage(`${saved} TP berhasil diimpor.`);
      setShowImport(false);
      setImportJson("");
      setImportExcel("");
      setImportPreview(null);
      void reload();
    } catch (e) {
      setMessage(`Gagal import: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  function generateAIPrompt(entry: ATPEntry, type: "lkpd" | "rpp" | "jurnal" | "remedial" | "pengayaan"): string {
    const base = `Sebagai guru ${entry.subject} kelas ${entry.grade} (Fase ${entry.phase}), buatkan ${type.toUpperCase()} untuk Tujuan Pembelajaran berikut:

Tujuan Pembelajaran: ${entry.tp}
Elemen: ${entry.elemen}
Capaian Pembelajaran: ${entry.cp}
Bab: ${entry.bab ?? "-"}
Profil Pelajar Pancasila: ${entry.profilPelajar ?? "-"}
Kata Kunci: ${entry.kataKunci ?? "-"}
Alokasi JP: ${entry.alokasiJP} JP

Format: sesuaikan dengan standar Kurikulum Merdeka untuk ${entry.grade}.`;

    if (type === "lkpd") return base + "\n\nLKPD harus memuat: tujuan, alat/bahan, langkah kegiatan, pertanyaan pemandu, penilaian.";
    if (type === "rpp") return base + "\n\nRPP/Modul Ajar harus memuat: identitas, kompetensi awal, tujuan, kegiatan pendahuluan-inti-penutup, asesmen.";
    if (type === "remedial") return base + "\n\nBuat program remedial sederhana untuk siswa yang belum mencapai TP ini.";
    if (type === "pengayaan") return base + "\n\nBuat program pengayaan untuk siswa yang sudah menguasai TP ini.";
    return base;
  }

  if (loading) return <LoadingState />;

  if (!year || !teacher) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Bank TP</h1>
        <Card>
          <EmptyState
            title="Belum siap"
            description="Buat tahun pelajaran aktif dan profil guru dulu di menu Profil."
          />
        </Card>
      </div>
    );
  }

  /* ================================================================ */
  /*  ALWAYS-ON WYSIWYG LAYOUT — sidebar + document                   */
  /* ================================================================ */
  return (
    <>
      <div className="doc-wysiwyg-layout">
        {/* Mobile backdrop */}
        <div
          className={`doc-sidebar-backdrop no-print ${!showSidebar ? "doc-backdrop-hidden" : ""}`}
          onClick={() => setShowSidebar(false)}
          aria-hidden="true"
        />

        {/* Sidebar toggle */}
        {!showSidebar && (
          <button
            type="button"
            className="doc-sidebar-toggle no-print"
            onClick={() => setShowSidebar(true)}
            title="Buka sidebar"
            aria-label="Buka panel kontrol"
            aria-expanded={showSidebar}
          >
            ☰
          </button>
        )}

        {/* Sidebar */}
        <aside className={`doc-sidebar no-print ${!showSidebar ? "doc-sidebar-hidden" : ""}`}>
            <div className="doc-sidebar-header">
              <h2 className="text-sm font-bold text-slate-900">Bank TP (ATP)</h2>
              <button
                type="button"
                className="doc-sidebar-close"
                onClick={() => setShowSidebar(false)}
                title="Tutup sidebar"
              >
                ✕
              </button>
            </div>

            {/* Konteks */}
            <div className="doc-sidebar-section">
              <h3 className="doc-sidebar-section-title">Konteks</h3>
              <Select
                label="Mapel"
                id="atp-filter-subject"
                value={filterSubject}
                onChange={(v) => { setFilterSubject(v); setFilterGrade(""); }}
                options={[
                  { value: "", label: "Semua Mapel" },
                  ...subjects.map((s) => ({ value: s, label: s })),
                ]}
              />
              <Select
                label="Kelas"
                id="atp-filter-grade"
                value={filterGrade}
                onChange={(v) => setFilterGrade(v)}
                options={[
                  { value: "", label: "Semua Kelas" },
                  ...grades.map((g) => ({ value: g, label: g })),
                ]}
              />
              <p className="text-[10px] text-slate-400 mt-1">{teacher.name} · {year.label}</p>
            </div>

            {/* Ringkasan */}
            <div className="doc-sidebar-section">
              <h3 className="doc-sidebar-section-title">Ringkasan</h3>
              <dl className="doc-summary-dl">
                <div><dt>Total TP</dt><dd>{filteredEntries.length}</dd></div>
                <div><dt>Total JP</dt><dd>{filteredEntries.reduce((s, e) => s + e.alokasiJP, 0)}</dd></div>
                <div><dt>Jumlah Bab</dt><dd>{Object.keys(groupedByBab).length}</dd></div>
                <div><dt>Mapel</dt><dd>{filterSubject || "Semua"}</dd></div>
                <div><dt>Kelas</dt><dd>{filterGrade || "Semua"}</dd></div>
              </dl>
            </div>

            {/* Kelola TP */}
            <div className="doc-sidebar-section">
              <h3 className="doc-sidebar-section-title">Kelola TP</h3>
              <div className="flex gap-2 flex-wrap mb-2">
                <Button
                  className="text-xs px-2 py-1"
                  onClick={() => { setEditing(null); setShowForm(true); }}
                >
                  + Tambah
                </Button>
                <Button
                  variant="secondary"
                  className="text-xs px-2 py-1"
                  onClick={() => setShowImport(true)}
                >
                  Impor
                </Button>
              </div>

              {message && (
                <div className="p-2 rounded bg-brand-50 border border-brand-200 text-xs text-brand-700 mb-2">{message}</div>
              )}

              {filteredEntries.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Belum ada TP untuk filter ini.</p>
              ) : (
                <ul className="space-y-1 max-h-[280px] overflow-y-auto">
                  {filteredEntries.map((e) => (
                    <li key={e.id} className="flex items-start justify-between p-1.5 border border-slate-100 rounded text-xs">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="font-medium text-slate-900 truncate">{atpEntryLabel(e)}</span>
                          <Badge variant={e.status === "final" ? "success" : "neutral"}>
                            {e.status === "final" ? "F" : "D"}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 truncate">{e.tp}</p>
                        <p className="text-[10px] text-slate-400">{e.alokasiJP} JP · {e.elemen}</p>
                      </div>
                      <div className="flex gap-1 ml-1 shrink-0">
                        <button
                          type="button"
                          className="text-slate-400 hover:text-blue-600 text-xs"
                          onClick={() => { setEditing(e); setShowForm(true); }}
                          title="Edit"
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          className="text-slate-400 hover:text-rose-600 text-xs"
                          onClick={() => handleDelete(e.id)}
                          title="Hapus"
                        >
                          ✗
                        </button>
                        <button
                          type="button"
                          className="text-slate-400 hover:text-amber-600 text-xs"
                          onClick={() => setShowAIPrompt(showAIPrompt === e.id ? null : e.id)}
                          title="Prompt AI"
                        >
                          ✦
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="doc-sidebar-section doc-sidebar-footer">
              <p className="text-[10px] text-slate-400 text-center">
                Dokumen auto-save · {entries.length} TP total
              </p>
            </div>
          </aside>

        {/* Document Area */}
        <div className="doc-document-area">
          <DocumentPreview
            docId={docId}
            docType="atp"
            orientation={formatDokumen}
            status={docStatus}
            data={docDataForAutoSave}
            onSave={handleSaveDoc}
            onSetFinal={handleSetFinal}
            onOrientationChange={handleOrientationChange}
            showFormatToggle={true}
          >
            <ATPDocument
              subject={filterSubject}
              grade={filterGrade}
              tahunAjaran={year.label}
              schoolName={schoolName}
              teacherName={teacher.name}
              entries={filteredEntries}
              groupedByBab={groupedByBab}
            />
          </DocumentPreview>
        </div>
      </div>

      {/* Overlay: ATP Form */}
      {showForm && (
        <ATPForm
          editing={editing}
          defaultSubject={filterSubject || (teacher?.subjects?.[0]?.subject ?? "")}
          defaultGrade={filterGrade || (teacher?.subjects?.[0]?.grades?.[0] ?? "VII")}
          defaultPhase={teacher?.subjects?.[0]?.phases?.[0] ?? "D"}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {/* Overlay: Import */}
      {showImport && (
        <div className="doc-overlay no-print" role="dialog" aria-modal="true" aria-label="Impor Bank TP">
        <Card className="overflow-y-auto">
          <CardHeader
            title="Impor Bank TP"
            description="Impor TP dari JSON (hasil AI) atau paste dari Excel."
          />
          <div className="space-y-3 p-4">
            <div className="flex gap-2 items-end">
              <Select
                label="Mode Impor"
                id="atp-import-mode"
                value={importMode}
                onChange={(v) => { setImportMode(v as "json" | "excel"); setImportPreview(null); }}
                options={[
                  { value: "json", label: "JSON (guru-admin-flow/atp/v1)" },
                  { value: "excel", label: "Excel Paste" },
                ]}
              />
              {importMode === "excel" && (
                <>
                  <Input label="Subject" id="atp-imp-subject" value={importMeta.subject} onChange={(v) => { setImportMeta({ ...importMeta, subject: v }); setImportPreview(null); }} />
                  <Input label="Grade" id="atp-imp-grade" value={importMeta.grade} onChange={(v) => { setImportMeta({ ...importMeta, grade: v }); setImportPreview(null); }} />
                  <Input label="Phase" id="atp-imp-phase" value={importMeta.phase} onChange={(v) => { setImportMeta({ ...importMeta, phase: v }); setImportPreview(null); }} />
                </>
              )}
            </div>

            {importMode === "json" ? (
              <Textarea label="JSON Bank TP" id="atp-import-json" value={importJson} onChange={(v) => { setImportJson(v); setImportPreview(null); }} rows={8}
                placeholder={'{"$schema":"guru-admin-flow/atp/v1","subject":"PPKn","grade":"VII","phase":"D","entries":[{"bab":"1","elemen":"Norma","cp":"...","tp":"...","alokasiJP":2}]}'}
              />
            ) : (
              <Textarea label="Paste dari Excel" id="atp-import-excel" value={importExcel} onChange={(v) => { setImportExcel(v); setImportPreview(null); }} rows={8}
                placeholder={"Bab\tElemen\tCP\tTP\tProfil Pelajar\tKata Kunci\tAlokasi JP\n1\tNorma\tMemahami norma\tMenjelaskan norma\tBernalar\tnorma\t2"}
              />
            )}

            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleImportPreview} disabled={importMode === "json" ? !importJson.trim() : !importExcel.trim()}>
                Preview Import
              </Button>
              {importPreview && (
                <Button onClick={handleImportApply} disabled={
                  (importPreview.type === "json" && importPreview.entries.length === 0) ||
                  (importPreview.type === "excel" && importPreview.rows.length === 0)
                }>
                  Impor {importPreview.type === "json" ? `${importPreview.entries.length} TP` : `${importPreview.rows.length} TP`}
                </Button>
              )}
              <Button variant="secondary" onClick={() => { setShowImport(false); setImportPreview(null); }}>Batal</Button>
            </div>

            {importPreview && (
              <div className="p-3 bg-slate-50 rounded-md space-y-2">
                {importPreview.type === "json" ? (
                  <>
                    {importPreview.errors.length > 0 ? (
                      <div className="p-2 bg-rose-100 rounded text-xs text-rose-800">
                        <p className="font-semibold">Error:</p>
                        <ul className="ml-4 list-disc">{importPreview.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-semibold text-emerald-700">✓ {importPreview.entries.length} TP siap diimpor</p>
                        <div className="mt-2 max-h-48 overflow-y-auto text-xs">
                          {importPreview.entries.map((e, i) => (
                            <div key={i} className="p-1 border-b border-slate-200">
                              <strong>{String(e.elemen ?? "")}</strong>: {String(e.tp ?? "").slice(0, 80)}{String(e.tp ?? "").length > 80 ? "..." : ""} ({String(e.alokasiJP ?? "?")} JP)
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-emerald-700">
                      ✓ {importPreview.rows.length} baris siap diimpor
                      {importPreview.skipped.length > 0 && <span className="text-amber-700"> · {importPreview.skipped.length} di-skip</span>}
                    </p>
                    {importPreview.skipped.length > 0 && (
                      <div className="mt-2 max-h-32 overflow-y-auto text-xs text-rose-700">
                        {importPreview.skipped.map((s, i) => <div key={i} className="p-1">Baris {s.lineNumber}: {s.reason}</div>)}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </Card>
        </div>
      )}

      {/* Overlay: AI Prompt */}
      {showAIPrompt && (
        <AIPromptOverlay
          entry={entries.find((e) => e.id === showAIPrompt) ?? null}
          onGenerate={generateAIPrompt}
          onCopy={(text) => { navigator.clipboard.writeText(text); setMessage("Prompt disalin."); }}
          onClose={() => setShowAIPrompt(null)}
        />
      )}
    </>
  );
}

/* ============================================================ */
/*  ATP Form                                                     */
/* ============================================================ */

function ATPForm({
  editing,
  defaultSubject,
  defaultGrade,
  defaultPhase,
  onSave,
  onCancel,
}: {
  editing: ATPEntry | null;
  defaultSubject: string;
  defaultGrade: string;
  defaultPhase: string;
  onSave: (data: Omit<ATPEntry, "id" | "createdAt" | "updatedAt" | "deletedAt" | "syncStatus" | "academicYearId" | "teacherId" | "status">) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    subject: editing?.subject ?? defaultSubject,
    grade: editing?.grade ?? defaultGrade,
    phase: editing?.phase ?? defaultPhase,
    bab: editing?.bab ?? "",
    elemen: editing?.elemen ?? "",
    cp: editing?.cp ?? "",
    tp: editing?.tp ?? "",
    profilPelajar: editing?.profilPelajar ?? "",
    kataKunci: editing?.kataKunci ?? "",
    alokasiJP: editing?.alokasiJP ?? 2,
    teacherName: editing?.teacherName ?? "",
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="doc-overlay no-print" onClick={onCancel} role="dialog" aria-modal="true" aria-label={editing ? "Edit TP" : "Tambah TP"}>
      <div className="doc-overlay-card" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <CardHeader title={editing ? "Edit TP" : "Tambah TP"} description="Wajib: Mapel, Kelas, Fase, Elemen, CP, TP, Alokasi JP." />
        <div className="space-y-3 p-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <Input label="Mapel" id="atp-subject" value={form.subject} onChange={(v) => set("subject", v)} />
            <Input label="Kelas" id="atp-grade" value={form.grade} onChange={(v) => set("grade", v)} placeholder="VII" />
            <Input label="Fase" id="atp-phase" value={form.phase} onChange={(v) => set("phase", v)} placeholder="D" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Bab" id="atp-bab" value={form.bab} onChange={(v) => set("bab", v)} placeholder="Bab 1" />
            <Input label="Elemen" id="atp-elemen" value={form.elemen} onChange={(v) => set("elemen", v)} />
          </div>
          <Textarea label="Capaian Pembelajaran (CP)" id="atp-cp" value={form.cp} onChange={(v) => set("cp", v)} rows={2} />
          <Textarea label="Tujuan Pembelajaran (TP)" id="atp-tp" value={form.tp} onChange={(v) => set("tp", v)} rows={3} />
          <Input label="Profil Pelajar Pancasila" id="atp-profil" value={form.profilPelajar} onChange={(v) => set("profilPelajar", v)} />
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Kata Kunci" id="atp-kk" value={form.kataKunci} onChange={(v) => set("kataKunci", v)} />
            <Input label="Alokasi JP" id="atp-jp" type="number" value={String(form.alokasiJP)} onChange={(v) => set("alokasiJP", Number(v) || 2)} />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => onSave(form)}>Simpan</Button>
            <Button variant="secondary" onClick={onCancel}>Batal</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================ */
/*  AI Prompt Overlay                                            */
/* ============================================================ */

const AI_PROMPT_TYPES = ["lkpd", "rpp", "jurnal", "remedial", "pengayaan"] as const;
type AIPromptType = (typeof AI_PROMPT_TYPES)[number];

function AIPromptOverlay({
  entry,
  onGenerate,
  onCopy,
  onClose,
}: {
  entry: ATPEntry | null;
  onGenerate: (entry: ATPEntry, type: AIPromptType) => string;
  onCopy: (text: string) => void;
  onClose: () => void;
}) {
  if (!entry) return null;

  return (
    <div
      className="doc-overlay no-print"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Prompt AI"
    >
      <div
        className="doc-overlay-card"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <CardHeader
          title="Prompt AI"
          description="Klik Salin lalu paste ke AI eksternal."
        />
        <div className="p-4 space-y-2">
          <div className="flex gap-2 flex-wrap">
            {AI_PROMPT_TYPES.map((type) => (
              <Button
                key={type}
                variant="secondary"
                className="text-xs px-2 py-1"
                onClick={() => {
                  const prompt = onGenerate(entry, type);
                  onCopy(prompt);
                }}
              >
                Salin {type.toUpperCase()}
              </Button>
            ))}
          </div>
          <p className="text-xs text-slate-400">
            Tidak ada API key. Tidak ada data dikirim. Guru paste manual ke AI.
          </p>
          <Button
            variant="secondary"
            onClick={onClose}
            className="w-full"
          >
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================ */
/*  ATP Document (A4 landscape — wide table)                     */
/* ============================================================ */

function ATPDocument({
  subject,
  grade,
  tahunAjaran,
  schoolName,
  teacherName,
  entries,
  groupedByBab,
}: {
  subject: string;
  grade: string;
  tahunAjaran: string;
  schoolName: string;
  teacherName: string;
  entries: ATPEntry[];
  groupedByBab: Record<string, ATPEntry[]>;
}) {
  const totalJP = entries.reduce((sum, e) => sum + e.alokasiJP, 0);

  return (
    <div className="print-area">
      <div className="document-page document-landscape">
        <div className="document-title">DAFTAR TUJUAN PEMBELAJARAN</div>
        <div className="document-subtitle">
          {subject || "SEMUA MAPEL"} — KELAS {grade || "..."} — TAHUN PELAJARAN {tahunAjaran}
        </div>

        {/* Identity */}
        <table className="document-identity">
          <tbody>
            <tr>
              <td>Satuan Pendidikan</td>
              <td>{schoolName || "-"}</td>
              <td>Mata Pelajaran</td>
              <td>{subject || "Semua"}</td>
            </tr>
            <tr>
              <td>Tahun Pelajaran</td>
              <td>{tahunAjaran}</td>
              <td>Kelas / Fase</td>
              <td>{grade || "Semua"}</td>
            </tr>
            <tr>
              <td>Guru Mata Pelajaran</td>
              <td>{teacherName || "-"}</td>
              <td>Total TP / JP</td>
              <td>{entries.length} TP / {totalJP} JP</td>
            </tr>
          </tbody>
        </table>

        {/* Main table grouped by Bab */}
        {Object.entries(groupedByBab).map(([bab, babEntries]) => (
          <div key={bab} style={{ marginTop: "12pt" }}>
            <div className="document-section-title">BAB {bab}</div>
            <table className="document-table" style={{ fontSize: "9pt" }}>
              <thead>
                <tr>
                  <th style={{ width: "5%" }}>No</th>
                  <th style={{ width: "15%" }}>Elemen</th>
                  <th style={{ width: "25%" }}>Capaian Pembelajaran</th>
                  <th style={{ width: "30%" }}>Tujuan Pembelajaran</th>
                  <th style={{ width: "12%" }}>Profil Pelajar</th>
                  <th style={{ width: "8%" }}>JP</th>
                  <th style={{ width: "5%" }}>St</th>
                </tr>
              </thead>
              <tbody>
                {babEntries.map((e, idx) => (
                  <tr key={e.id}>
                    <td className="text-center">{idx + 1}</td>
                    <td>{e.elemen}</td>
                    <td style={{ fontSize: "8.5pt" }}>{e.cp}</td>
                    <td style={{ fontWeight: 600 }}>{e.tp}</td>
                    <td style={{ fontSize: "8.5pt" }}>{e.profilPelajar || "-"}</td>
                    <td className="text-center">{e.alokasiJP}</td>
                    <td className="text-center" style={{ fontSize: "8pt" }}>
                      {e.status === "final" ? "✓" : "○"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} className="text-right"><strong>JP Bab {bab}</strong></td>
                  <td className="text-center"><strong>{babEntries.reduce((s, e) => s + e.alokasiJP, 0)}</strong></td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        ))}

        {entries.length === 0 && (
          <div style={{ textAlign: "center", marginTop: "40pt", color: "#94a3b8" }}>
            <p>Belum ada Tujuan Pembelajaran untuk filter ini.</p>
            <p style={{ fontSize: "9pt", marginTop: "4pt" }}>Tambah TP via sidebar atau impor dari JSON.</p>
          </div>
        )}

        {/* Grand total */}
        {entries.length > 0 && (
          <div style={{ marginTop: "12pt", fontSize: "10pt", fontWeight: 700 }}>
            Total: {entries.length} Tujuan Pembelajaran — {totalJP} Jam Pelajaran
          </div>
        )}

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
            <p>..........., ....................</p>
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
