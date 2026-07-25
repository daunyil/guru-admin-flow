/**
 * useProtaDocState — custom hook encapsulating the WYSIWYG doc lifecycle.
 *
 * Manages: docId, docStatus, docSemester, formatDokumen, ensuringRef,
 * ensureDoc, handleSaveDoc, handleSetFinal, handleOrientationChange,
 * handleSemesterChange, docDataForAutoSave.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ProtaProfile, SchoolDocOrientation, DocumentStatus } from "@guru-admin/domain";
import { sumJP } from "@guru-admin/shared";
import {
  saveSchoolDocument,
  updateSchoolDocumentData,
  updateSchoolDocumentLayout,
  setSchoolDocumentStatus,
  findSchoolDocumentByCompositeKey,
} from "@shared/db/school-document-repo";

export function useProtaDocState(
  activeYearId: string | null,
  activeYearLabel: string,
  selected: ProtaProfile | null,
  schoolName: string
) {
  const [formatDokumen, setFormatDokumen] = useState<"portrait" | "landscape">("portrait");
  const [docId, setDocId] = useState<string | undefined>(undefined);
  const [docStatus, setDocStatus] = useState<DocumentStatus>("draft");
  const [docSemester, setDocSemester] = useState<1 | 2>(1);
  const ensuringRef = useRef(false);

  /* ------------------------------------------------------------------ */
  /*  ensureDoc — find-or-create schoolDocument                         */
  /* ------------------------------------------------------------------ */

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

  /* ------------------------------------------------------------------ */
  /*  When selected profile changes, ensure doc                         */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    if (selected) {
      void ensureDoc(selected, docSemester);
    } else {
      setDocId(undefined);
      setDocStatus("draft");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, activeYearId]);

  /* ------------------------------------------------------------------ */
  /*  WYSIWYG callbacks                                                  */
  /* ------------------------------------------------------------------ */

  const handleSemesterChange = useCallback((newSemester: 1 | 2) => {
    setDocId(undefined);
    setDocStatus("draft");
    setDocSemester(newSemester);
    if (selected) void ensureDoc(selected, newSemester);
  }, [selected, ensureDoc]);

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

  /* ------------------------------------------------------------------ */
  /*  Auto-save data memo                                                */
  /* ------------------------------------------------------------------ */

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

  return {
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
  };
}
