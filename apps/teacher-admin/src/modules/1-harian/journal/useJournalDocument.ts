/**
 * useJournalDocument — WYSIWYG-DOC-FASE9 document lifecycle hook.
 * Encapsulates doc persistence states and callbacks for schoolDocument (jurnal-semester).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AcademicYear, TeachingAssignment, TeachingJournal, SchoolDocOrientation, DocumentStatus } from "@guru-admin/domain";
import {
  saveSchoolDocument,
  updateSchoolDocumentData,
  updateSchoolDocumentLayout,
  setSchoolDocumentStatus,
  findSchoolDocumentByCompositeKey,
} from "@shared/db/school-document-repo";

interface UseJournalDocumentParams {
  year: AcademicYear | null;
  selectedAssignmentId: string;
  assignments: TeachingAssignment[];
  selectedSessionId: string | null;
  journals: TeachingJournal[];
  docSemester: 1 | 2;
}

export function useJournalDocument({
  year,
  selectedAssignmentId,
  assignments,
  selectedSessionId,
  journals,
  docSemester,
}: UseJournalDocumentParams) {
  const [formatDokumen, setFormatDokumen] = useState<"portrait" | "landscape">("portrait");
  const [docId, setDocId] = useState<string | undefined>(undefined);
  const [docStatus, setDocStatus] = useState<DocumentStatus>("draft");
  const ensuringRef = useRef(false);

  // ensureDoc (find-or-create schoolDocument)
  const ensureDoc = useCallback(async (asg: TeachingAssignment, semester: 1 | 2) => {
    if (!year || !asg) return;
    if (ensuringRef.current) return;
    ensuringRef.current = true;
    try {
      const existing = await findSchoolDocumentByCompositeKey({
        docType: "jurnal-semester",
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
          docType: "jurnal-semester",
          semester,
          tahunAjaran: year.label,
          kodeMapel: asg.subject,
          kodeKelas: asg.classLabel,
          teacherId: asg.teacherId,
          academicYearId: year.id,
          data: { semester, subject: asg.subject, classLabel: asg.classLabel },
          orientation: "portrait",
          status: "draft",
        });
        setDocId(doc.id);
        setDocStatus("draft");
        setFormatDokumen("portrait");
      }
    } catch (err) {
      console.error("[QuickJournal] Gagal ensureDoc:", err);
    } finally {
      ensuringRef.current = false;
    }
  }, [year]);

  // When assignment changes, ensure doc
  useEffect(() => {
    const asg = assignments.find((a) => a.id === selectedAssignmentId);
    if (asg && year) {
      const sem: 1 | 2 = asg.semester;
      void ensureDoc(asg, sem);
    } else {
      setDocId(undefined);
      setDocStatus("draft");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssignmentId, year?.id]);

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
    const asg = assignments.find((a) => a.id === selectedAssignmentId);
    if (!asg || !year) return {};
    return {
      semester: docSemester,
      tahunAjaran: year.label,
      subject: asg.subject,
      classLabel: asg.classLabel,
      selectedSessionId: selectedSessionId ?? "",
      journalStatus: journals.find((j) => j.sessionId === selectedSessionId)?.locked ? "final" : "draft",
    };
  }, [assignments, selectedAssignmentId, year, docSemester, selectedSessionId, journals]);

  return {
    formatDokumen,
    docId,
    docStatus,
    setDocId,
    setDocStatus,
    setFormatDokumen,
    handleSaveDoc,
    handleSetFinal,
    handleOrientationChange,
    docDataForAutoSave,
  };
}
