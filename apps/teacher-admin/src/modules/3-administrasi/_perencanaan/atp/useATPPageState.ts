/**
 * useATPPageState — all state management for the ATPPage orchestrator.
 *
 * Encapsulates useState, useEffect, useCallback, useMemo declarations
 * so the page component only needs to call this hook and render.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getActiveAcademicYear, getTeacherProfile, getSchoolProfile } from "@shared/db/profile-repo";
import {
  listATPEntries,
  saveATPEntry,
  updateATPEntry,
  deleteATPEntry,
} from "@shared/db/atp-entry-repo";
import { listLKPDs } from "@shared/db/lkpd-repo";
import type { AcademicYear, TeacherProfile, ATPEntry, LKPD, SchoolProfile } from "@guru-admin/domain";
import {
  validateAtpImport,
  atpImportToEntries,
  parseAtpExcelPaste,
  atpPasteRowsToEntries,
  type AtpPasteMeta,
} from "@guru-admin/domain";
import {
  saveSchoolDocument,
  updateSchoolDocumentData,
  updateSchoolDocumentLayout,
  setSchoolDocumentStatus,
  findSchoolDocumentByCompositeKey,
} from "@shared/db/school-document-repo";
import type { SchoolDocOrientation, DocumentStatus } from "@guru-admin/domain";
import { generateAIPrompt, existingKey } from "./atpUtils";
import type { ImportPreviewData } from "./ATPImportOverlay";

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useATPPageState() {
  /* ---- Core state ---- */
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [entries, setEntries] = useState<ATPEntry[]>([]);
  const [_lkpds, setLkpds] = useState<LKPD[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ATPEntry | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showAIPrompt, setShowAIPrompt] = useState<string | null>(null);

  /* ---- Import state ---- */
  const [showImport, setShowImport] = useState(false);
  const [importMode, setImportMode] = useState<"json" | "excel">("json");
  const [importJson, setImportJson] = useState("");
  const [importExcel, setImportExcel] = useState("");
  const [importMeta, setImportMeta] = useState<AtpPasteMeta>({
    subject: "",
    grade: "VII",
    phase: "D",
  });
  const [importPreview, setImportPreview] = useState<ImportPreviewData>(null);

  /* ---- WYSIWYG doc state ---- */
  const [schoolName, setSchoolName] = useState<string>("");
  const [school, setSchool] = useState<SchoolProfile | undefined>();
  const [showSidebar, setShowSidebar] = useState(() => window.innerWidth >= 1024);
  const [formatDokumen, setFormatDokumen] = useState<"portrait" | "landscape">("portrait");
  const [docView, setDocView] = useState<"atp-inline" | "atp-report">("atp-inline");
  const [docId, setDocId] = useState<string | undefined>(undefined);
  const [docStatus, setDocStatus] = useState<DocumentStatus>("draft");
  const [filterSubject, setFilterSubject] = useState<string>("");
  const [filterGrade, setFilterGrade] = useState<string>("");
  const ensuringRef = useRef(false);

  /* ---- Data loading ---- */
  async function reload() {
    if (!year || !teacher) return;
    const [atps, lks] = await Promise.all([
      listATPEntries({ academicYearId: year.id, teacherId: teacher.id }),
      listLKPDs({ academicYearId: year.id, teacherId: teacher.id }),
    ]);
    setEntries(atps);
    setLkpds(lks);
  }

  /* ---- Initial load ---- */
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
      setSchool(sp);
      setSchoolName(sp?.name ?? "");
      setLoading(false);
    })();
  }, []);

  /* ---- Auto-dismiss message ---- */
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 3000);
    return () => clearTimeout(t);
  }, [message]);

  /* ---- ensureDoc (WYSIWYG) ---- */
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

  /* ---- When filter changes, ensure doc ---- */
  useEffect(() => {
    if (filterSubject && filterGrade && teacher) {
      void ensureDoc(filterSubject, filterGrade);
    } else {
      setDocId(undefined);
      setDocStatus("draft");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterSubject, filterGrade, teacher?.id]);

  /* ---- Filtered entries for document ---- */
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (filterSubject && e.subject !== filterSubject) return false;
      if (filterGrade && e.grade !== filterGrade) return false;
      return true;
    });
  }, [entries, filterSubject, filterGrade]);

  /* ---- Group entries by bab for document rendering ---- */
  const groupedByBab = useMemo(() => {
    const groups: Record<string, ATPEntry[]> = {};
    for (const e of filteredEntries) {
      const key = e.bab || "Tanpa Bab";
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    }
    return groups;
  }, [filteredEntries]);

  /* ---- Unique subjects and grades for filter ---- */
  const subjects = useMemo(() => [...new Set(entries.map((e) => e.subject))], [entries]);
  const grades = useMemo(() => {
    const filtered = filterSubject
      ? entries.filter((e) => e.subject === filterSubject)
      : entries;
    return [...new Set(filtered.map((e) => e.grade))];
  }, [entries, filterSubject]);

  /* ---- Auto-save data memo ---- */
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

  /* ---- WYSIWYG callbacks ---- */
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

  /* ---- CRUD handlers ---- */
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

  /* ---- Import handlers ---- */
  function handleImportPreview() {
    if (importMode === "json") {
      try {
        const json = JSON.parse(importJson);
        const v = validateAtpImport(json);
        if (!v.success) {
          setImportPreview({ type: "json", entries: [], errors: v.errors });
          return;
        }
        const importEntries = atpImportToEntries(v.data);
        setImportPreview({ type: "json", entries: importEntries as unknown as Array<Record<string, unknown>>, errors: [] });
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

    const dbExisting = await listATPEntries({ academicYearId: year.id, teacherId: teacher.id });
    const dbKeys = new Set(dbExisting.map(existingKey));
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

  /* ---- Derived values ---- */
  const profileIncomplete = !year || !teacher;

  /* ---- Return everything the page needs ---- */
  return {
    // Core state
    loading,
    year,
    teacher,
    school,
    entries,
    profileIncomplete,

    // UI state
    showForm,
    setShowForm,
    editing,
    setEditing,
    message,
    setMessage,
    showAIPrompt,
    setShowAIPrompt,
    showSidebar,
    setShowSidebar,

    // Document state
    formatDokumen,
    docView,
    setDocView,
    docId,
    docStatus,
    schoolName,
    filterSubject,
    setFilterSubject,
    filterGrade,
    setFilterGrade,

    // Derived
    filteredEntries,
    groupedByBab,
    subjects,
    grades,
    docDataForAutoSave,

    // WYSIWYG handlers
    handleSaveDoc,
    handleSetFinal,
    handleOrientationChange,

    // CRUD handlers
    handleSave,
    handleDelete,

    // AI prompt
    generateAIPromptFn: generateAIPrompt,

    // Import state
    showImport,
    setShowImport,
    importMode,
    setImportMode,
    importJson,
    setImportJson,
    importExcel,
    setImportExcel,
    importMeta,
    setImportMeta,
    importPreview,
    setImportPreview,

    // Import handlers
    handleImportPreview,
    handleImportApply,
  };
}
