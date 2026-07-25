/**
 * usePromesState — custom hook for Promes module.
 * Extracted from PromesPage.tsx to follow project pattern (useRemedialState, useEnrichmentState).
 * Contains all state declarations, init effect, doc-restore effect, handlers, derived values.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AcademicYear,
  ProtaProfile,
  CalendarEvent,
  PromesResult,
  PromesOptions,
  SchoolProfile,
  TeacherProfile,
  SchoolDocOrientation,
  DocumentStatus,
} from "@guru-admin/domain";
import { generatePromes } from "@guru-admin/domain";
import {
  DEFAULT_INTRA_JP_PER_WEEK_PPKN,
  DEFAULT_KO_JP_PER_WEEK_PPKN,
  DEFAULT_CADANGAN_JP,
} from "@guru-admin/shared";
import { listProtaProfiles } from "../../shared/db/prota-repo";
import { listCalendarEvents } from "../../shared/db/calendar-repo";
import { getActiveAcademicYear, getSchoolProfile, getTeacherProfile } from "../../shared/db/profile-repo";
import {
  saveSchoolDocument,
  updateSchoolDocumentData,
  updateSchoolDocumentLayout,
  setSchoolDocumentStatus,
  findSchoolDocumentByCompositeKey,
} from "../../shared/db/school-document-repo";

/* ============================================================ */
/*  Constants                                                    */
/* ============================================================ */

export const KO_PROMES_MODE_OPTIONS: Array<{ value: NonNullable<PromesOptions["koMode"]>; label: string }> = [
  { value: "end_of_week", label: "Kokurikuler per minggu" },
  { value: "end_of_semester", label: "Kokurikuler blok akhir semester" },
];

/* PROMES-VARIASI-01: 3 variasi dokumen Promes */
export type PromesVariasi = "ringkas" | "matrix" | "merdeka";

export const PROMES_VARIASI_OPTIONS: Array<{ value: PromesVariasi; label: string; description: string }> = [
  { value: "ringkas", label: "Ringkas (Portrait)", description: "Daftar minggu per baris — format vertikal" },
  { value: "matrix", label: "Matrix JP (Landscape)", description: "Tabel JP per minggu — format landscape detail" },
  { value: "merdeka", label: "Kurikulum Merdeka (Landscape)", description: "Tabel KP/Kode TP + badge warna event — format Kurikulum Merdeka" },
];

/* ============================================================ */
/*  Hook                                                         */
/* ============================================================ */

export function usePromesState() {
  /* ---- State ---- */
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
  // v5 FIX: Track last landscape variasi (matrix or merdeka) so orientation toggle
  // doesn't lose merdeka when toggling landscape↔portrait.
  const lastLandscapeVariasiRef = useRef<PromesVariasi>("matrix");

  // WYSIWYG-DOC-FASE2: persistence state
  const [docId, setDocId] = useState<string | undefined>(undefined);
  const [docStatus, setDocStatus] = useState<DocumentStatus>("draft");
  const ensuringRef = useRef(false);

  /* ---- Init effect ---- */
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

  /* ---- Existing-doc-restore effect ---- */
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

  /* ---- handleGenerate ---- */
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

  /* ---- docDataForAutoSave memo ---- */
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

  /* ---- WYSIWYG-DOC-FASE2: callbacks ---- */
  const handleSaveDoc = useCallback(async (id: string, data: Record<string, unknown>) => {
    await updateSchoolDocumentData(id, data);
  }, []);

  const handleSetFinal = useCallback(async (id: string) => {
    await setSchoolDocumentStatus(id, "final");
    setDocStatus("final");
  }, []);

  // v5 FIX: Sync ref whenever variasi changes to a landscape variant
  useEffect(() => {
    if (variasiDokumen === "matrix" || variasiDokumen === "merdeka") {
      lastLandscapeVariasiRef.current = variasiDokumen;
    }
  }, [variasiDokumen]);

  const handleOrientationChange = useCallback((orientation: SchoolDocOrientation) => {
    // v5 FIX: 3-way mapping — portrait→ringkas, landscape→last landscape variasi
    // (preserves merdeka when toggling orientation via DocumentPreview toolbar).
    if (orientation === "portrait") {
      setVariasiDokumen("ringkas");
    } else {
      setVariasiDokumen(lastLandscapeVariasiRef.current);
    }
    if (docId) {
      void updateSchoolDocumentLayout(docId, { orientation });
    }
  }, [docId]);

  /* ---- Derived values ---- */
  const currentProfile = profiles.find((p) => p.id === selectedProfileId) ?? null;
  const profileIncomplete = !activeYear;

  return {
    // State
    loading,
    activeYear,
    profiles,
    calendar,
    school,
    teacher,
    selectedProfileId,
    setSelectedProfileId,
    semester,
    setSemester,
    options,
    setOptions,
    result,
    setResult,
    generating,
    error,
    setError,
    showSidebar,
    setShowSidebar,
    variasiDokumen,
    setVariasiDokumen,
    formatDokumen,
    docId,
    docStatus,
    // Derived
    currentProfile,
    profileIncomplete,
    docDataForAutoSave,
    // Handlers
    handleGenerate,
    handleSaveDoc,
    handleSetFinal,
    handleOrientationChange,
  };
}

export type UsePromesStateReturn = ReturnType<typeof usePromesState>;
