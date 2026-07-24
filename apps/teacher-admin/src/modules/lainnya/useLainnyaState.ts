import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AcademicYear,
  SchoolProfile,
  TeacherProfile,
  TeachingAssignment,
  SchoolDocOrientation,
  DocumentStatus,
} from "@guru-admin/domain";
import { todayISODate } from "@guru-admin/shared";
import { getActiveAcademicYear, getTeacherProfile, getSchoolProfile } from "../../shared/db/profile-repo";
import { listAssignmentsByTeacher } from "../../shared/db/teaching-assignment-repo";
import {
  saveSchoolDocument,
  updateSchoolDocumentData,
  updateSchoolDocumentLayout,
  setSchoolDocumentStatus,
  findSchoolDocumentByCompositeKey,
} from "../../shared/db/school-document-repo";

/* ------------------------------------------------------------------ */
/*  useLainnyaState — all state, effects, and handlers                 */
/* ------------------------------------------------------------------ */

export function useLainnyaState() {
  const [loading, setLoading] = useState(true);
  const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
  const [school, setSchool] = useState<SchoolProfile | undefined>();
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [assignments, setAssignments] = useState<TeachingAssignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
  const [docTitle, setDocTitle] = useState("");
  const [docContent, setDocContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // WYSIWYG-DOC-FASE11
  const [showSidebar, setShowSidebar] = useState(
    typeof window !== "undefined" && window.innerWidth >= 1024
  );
  const [formatDokumen, setFormatDokumen] = useState<"portrait" | "landscape">("portrait");
  const [docId, setDocId] = useState<string | undefined>(undefined);
  const [docStatus, setDocStatus] = useState<DocumentStatus>("draft");
  const [docSemester, setDocSemester] = useState<1 | 2>(1);
  const ensuringRef = useRef(false);

  /* ---------------------------------------------------------------- */
  /*  Init                                                            */
  /* ---------------------------------------------------------------- */

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
        const asgs = await listAssignmentsByTeacher(tp.id, year.id, sem);
        setAssignments(asgs);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!error && !success) return;
    const t = setTimeout(() => { setError(null); setSuccess(null); }, error ? 5000 : 3000);
    return () => clearTimeout(t);
  }, [error, success]);

  /* ---------------------------------------------------------------- */
  /*  Assignment selection                                            */
  /* ---------------------------------------------------------------- */

  const selectedAssignment = assignments.find((a) => a.id === selectedAssignmentId);

  // Auto-set semester from assignment
  useEffect(() => {
    if (selectedAssignment) {
      setDocSemester(selectedAssignment.semester);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssignmentId]);

  /* ---------------------------------------------------------------- */
  /*  ensureDoc (find-or-create schoolDocument)                       */
  /* ---------------------------------------------------------------- */

  const ensureDoc = useCallback(async (asg: TeachingAssignment, semester: 1 | 2) => {
    if (!activeYear || !asg) return;
    if (ensuringRef.current) return;
    ensuringRef.current = true;
    try {
      const existing = await findSchoolDocumentByCompositeKey({
        docType: "lainnya",
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
        // Restore saved title & content
        const data = existing.data as Record<string, unknown>;
        if (data?.title && typeof data.title === "string") setDocTitle(data.title);
        if (data?.content && typeof data.content === "string") setDocContent(data.content);
      } else {
        const doc = await saveSchoolDocument({
          docType: "lainnya",
          semester,
          tahunAjaran: activeYear.label,
          kodeMapel: asg.subject,
          kodeKelas: asg.classLabel,
          teacherId: asg.teacherId,
          academicYearId: activeYear.id,
          data: { semester, subject: asg.subject, classLabel: asg.classLabel, title: "", content: "" },
          orientation: "portrait",
          status: "draft",
        });
        setDocId(doc.id);
        setDocStatus("draft");
        setFormatDokumen("portrait");
        setDocTitle("");
        setDocContent("");
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
      setDocTitle("");
      setDocContent("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssignmentId, activeYear?.id]);

  /* ---------------------------------------------------------------- */
  /*  WYSIWYG callbacks                                               */
  /* ---------------------------------------------------------------- */

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

  /* ---------------------------------------------------------------- */
  /*  Auto-save data memo                                             */
  /* ---------------------------------------------------------------- */

  const docDataForAutoSave = useMemo(() => {
    if (!selectedAssignment) return {};
    return {
      semester: docSemester,
      tahunAjaran: activeYear?.label ?? "",
      subject: selectedAssignment.subject,
      classLabel: selectedAssignment.classLabel,
      title: docTitle,
      content: docContent,
    };
  }, [selectedAssignment, docSemester, activeYear?.label, docTitle, docContent]);

  return {
    // State
    loading,
    activeYear,
    school,
    teacher,
    assignments,
    selectedAssignmentId,
    setSelectedAssignmentId,
    docTitle,
    setDocTitle,
    docContent,
    setDocContent,
    error,
    success,
    showSidebar,
    setShowSidebar,
    formatDokumen,
    docId,
    docStatus,
    docSemester,
    // Derived
    selectedAssignment,
    docDataForAutoSave,
    // Handlers
    handleSaveDoc,
    handleSetFinal,
    handleOrientationChange,
  };
}
