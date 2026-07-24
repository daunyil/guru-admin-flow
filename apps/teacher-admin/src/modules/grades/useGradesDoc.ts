/**
 * useGradesDoc — manages WYSIWYG document lifecycle (find-or-create, save, orientation).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { TeachingAssignment, SchoolDocOrientation, DocumentStatus } from "@guru-admin/domain";
import type { AcademicYear } from "@guru-admin/domain";
import {
  saveSchoolDocument,
  updateSchoolDocumentData,
  updateSchoolDocumentLayout,
  setSchoolDocumentStatus,
  findSchoolDocumentByCompositeKey,
} from "../../shared/db/school-document-repo";

interface UseGradesDocParams {
  year: AcademicYear | null;
  selectedAssignment: () => TeachingAssignment | undefined;
  selectedAssignmentId: string;
  docSemester: 1 | 2;
}

export function useGradesDoc({ year, selectedAssignment, selectedAssignmentId, docSemester }: UseGradesDocParams) {
  const [showSidebar, setShowSidebar] = useState(
    typeof window !== "undefined" && window.innerWidth >= 1024
  );
  const [formatDokumen, setFormatDokumen] = useState<"portrait" | "landscape">("landscape");
  const [docId, setDocId] = useState<string | undefined>(undefined);
  const [docStatus, setDocStatus] = useState<DocumentStatus>("draft");
  const ensuringRef = useRef(false);

  const ensureDoc = useCallback(async (asg: TeachingAssignment, semester: 1 | 2) => {
    if (!year || !asg) return;
    if (ensuringRef.current) return;
    ensuringRef.current = true;
    try {
      const existing = await findSchoolDocumentByCompositeKey({
        docType: "daftar-nilai",
        semester,
        tahunAjaran: year.label,
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
          docType: "daftar-nilai",
          semester,
          tahunAjaran: year.label,
          kodeMapel: asg.subject,
          kodeKelas: asg.classLabel,
          teacherId: asg.teacherId,
          academicYearId: year.id,
          data: { semester, subject: asg.subject, classLabel: asg.classLabel },
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
  }, [year]);

  useEffect(() => {
    const asg = selectedAssignment();
    if (asg) {
      void ensureDoc(asg, docSemester);
    } else {
      setDocId(undefined);
      setDocStatus("draft");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssignmentId, year?.id]);

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

  return {
    showSidebar, setShowSidebar,
    formatDokumen,
    docId, docStatus,
    ensureDoc,
    handleSaveDoc, handleSetFinal, handleOrientationChange,
  };
}
