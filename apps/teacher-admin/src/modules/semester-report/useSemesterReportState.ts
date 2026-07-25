/**
 * useSemesterReportState — all state, effects, and handlers for SemesterReportPage.
 * Extracted from SemesterReportPage.tsx for maintainability.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  generateAndSaveSemesterReport,
  finalizeSemesterReport,
} from "../../shared/db/semester-report-repo";
import { listProtaProfiles } from "../../shared/db/prota-repo";
import { listAssignmentsByTeacher } from "../../shared/db/teaching-assignment-repo";
import { getActiveAcademicYear, getTeacherProfile, getSchoolProfile } from "../../shared/db/profile-repo";
import type {
  ProtaProfile,
  AcademicYear,
  SchoolProfile,
  TeacherProfile,
  SemesterReport,
  TeachingAssignment,
} from "@guru-admin/domain";
import { canFinalizeSemesterReport, type GenerateSemesterReportResult } from "@guru-admin/domain";
import { todayISODate } from "@guru-admin/shared";
import {
  saveSchoolDocument,
  updateSchoolDocumentData,
  updateSchoolDocumentLayout,
  setSchoolDocumentStatus,
  findSchoolDocumentByCompositeKey,
} from "../../shared/db/school-document-repo";
import type { SchoolDocOrientation, DocumentStatus } from "@guru-admin/domain";

/* ------------------------------------------------------------------ */
/*  useSemesterReportState                                            */
/* ------------------------------------------------------------------ */

export function useSemesterReportState() {
  /* ---- State ---- */
  const [loading, setLoading] = useState(true);
  const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
  const [school, setSchool] = useState<SchoolProfile | undefined>();
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [assignments, setAssignments] = useState<TeachingAssignment[]>([]);
  const [protas, setProtas] = useState<ProtaProfile[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
  const [report, setReport] = useState<SemesterReport | null>(null);
  const [genResult, setGenResult] = useState<GenerateSemesterReportResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // WYSIWYG-DOC-FASE7
  const [showSidebar, setShowSidebar] = useState(
    typeof window !== "undefined" && window.innerWidth >= 1024
  );
  const [formatDokumen, setFormatDokumen] = useState<"portrait" | "landscape">("portrait");
  const [docId, setDocId] = useState<string | undefined>(undefined);
  const [docStatus, setDocStatus] = useState<DocumentStatus>("draft");
  const [docSemester, setDocSemester] = useState<1 | 2>(1);
  const ensuringRef = useRef(false);

  /* ---- Init ---- */
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
      if (year && tp) {
        const todayISO = todayISODate();
        const sem: 1 | 2 =
          year.semester2Start <= todayISO && todayISO <= year.semester2End ? 2 : 1;
        setDocSemester(sem);
        const [asgs, ps] = await Promise.all([
          listAssignmentsByTeacher(tp.id, year.id, sem),
          listProtaProfiles(year.id),
        ]);
        setAssignments(asgs);
        setProtas(ps);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!error && !success) return;
    const t = setTimeout(() => { setError(null); setSuccess(null); }, error ? 5000 : 3000);
    return () => clearTimeout(t);
  }, [error, success]);

  /* ---- Assignment selection ---- */
  const selectedAssignment = assignments.find((a) => a.id === selectedAssignmentId);

  // Auto-set semester from assignment
  useEffect(() => {
    if (selectedAssignment) {
      setDocSemester(selectedAssignment.semester);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssignmentId]);

  /* ---- ensureDoc (find-or-create schoolDocument) ---- */
  const ensureDoc = useCallback(async (asg: TeachingAssignment, semester: 1 | 2) => {
    if (!activeYear || !asg) return;
    if (ensuringRef.current) return;
    ensuringRef.current = true;
    try {
      const existing = await findSchoolDocumentByCompositeKey({
        docType: "rapor-semester",
        semester,
        tahunAjaran: activeYear.label,
        kodeMapel: asg.subject,
        kodeKelas: asg.classLabel,
        teacherId: asg.teacherId,
      });
      if (existing) {
        setDocId(existing.id);
        setDocStatus(existing.status);
        if (existing.orientation) setFormatDokumen(existing.orientation);
      } else {
        const doc = await saveSchoolDocument({
          docType: "rapor-semester",
          semester,
          tahunAjaran: activeYear.label,
          kodeMapel: asg.subject,
          kodeKelas: asg.classLabel,
          teacherId: asg.teacherId,
          academicYearId: activeYear.id,
          data: { semester, subject: asg.subject, classLabel: asg.classLabel },
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
  }, [activeYear]);

  // When selected assignment changes, ensure doc
  useEffect(() => {
    if (selectedAssignment) {
      void ensureDoc(selectedAssignment, docSemester);
    } else {
      setDocId(undefined);
      setDocStatus("draft");
      setReport(null);
      setGenResult(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssignmentId, activeYear?.id]);

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

  /* ---- Generate & Finalize ---- */
  async function handleGenerate() {
    if (!selectedAssignment) return;
    if (report) {
      const ok = window.confirm(
        "Susun ulang laporan akan mengganti data laporan yang sudah ada " +
        "dengan data terbaru. Lanjutkan?"
      );
      if (!ok) return;
    }
    setGenerating(true);
    setError(null);
    try {
      const matchingProta = protas.find(
        (p) => p.subject === selectedAssignment!.subject
      ) ?? null;
      const result = await generateAndSaveSemesterReport({
        academicYear: activeYear!,
        protaProfile: matchingProta,
        assignment: selectedAssignment!,
      });
      if (result.success && result.report && result.result) {
        setReport(result.report);
        setGenResult(result.result);
        setSuccess("Laporan di-generate.");
      } else {
        setError(result.errors.join("; ") || "Gagal generate laporan.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal generate.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleFinalize() {
    if (!report) return;
    setFinalizing(true);
    setError(null);
    try {
      const result = await finalizeSemesterReport(report.id);
      if (result.success && result.report) {
        setReport(result.report);
        if (docId) {
          await setSchoolDocumentStatus(docId, "final");
          setDocStatus("final");
        }
        setSuccess("Laporan difinalisasi (snapshot tersimpan).");
      } else {
        setError(result.errors.join("; "));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal finalize.");
    } finally {
      setFinalizing(false);
    }
  }

  const canFinalize = genResult ? canFinalizeSemesterReport(genResult).canFinalize : false;
  const finalizeReasons = genResult ? canFinalizeSemesterReport(genResult).reasons : [];

  /* ---- Auto-save data memo ---- */
  const docDataForAutoSave = useMemo(() => {
    if (!report || !selectedAssignment) return {};
    return {
      semester: docSemester,
      tahunAjaran: activeYear?.label ?? "",
      subject: selectedAssignment.subject,
      classLabel: selectedAssignment.classLabel,
      reportSnapshot: {
        totalPlannedSessions: report.totalPlannedSessions,
        totalDoneSessions: report.totalDoneSessions,
        totalContinuedSessions: report.totalContinuedSessions,
        totalCancelledSessions: report.totalCancelledSessions,
        totalCompletedUnits: report.totalCompletedUnits,
        totalPartialUnits: report.totalPartialUnits,
        totalNotStartedUnits: report.totalNotStartedUnits,
        totalPlannedUnits: report.totalPlannedUnits,
        totalPresent: report.totalPresent,
        totalSick: report.totalSick,
        totalExcused: report.totalExcused,
        totalAbsent: report.totalAbsent,
        journalsFinalized: report.journalsFinalized,
        journalsPending: report.journalsPending,
        status: report.status,
      },
    };
  }, [report, selectedAssignment, docSemester, activeYear?.label]);

  /* ---- Return all ---- */
  return {
    loading,
    activeYear,
    school,
    teacher,
    assignments,
    selectedAssignmentId,
    setSelectedAssignmentId,
    selectedAssignment,
    report,
    genResult,
    generating,
    finalizing,
    error,
    success,
    showSidebar,
    setShowSidebar,
    formatDokumen,
    docId,
    docStatus,
    docSemester,
    handleGenerate,
    handleFinalize,
    canFinalize,
    finalizeReasons,
    docDataForAutoSave,
    handleSaveDoc,
    handleSetFinal,
    handleOrientationChange,
  };
}
