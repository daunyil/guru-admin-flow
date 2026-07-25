/**
 * useCbtImport — CBT import state and handlers.
 */
import { useState } from "react";
import type { TeachingAssignment, ClassRoster, GradeEntry, CbtImportTarget, CbtMatchPreview } from "@guru-admin/domain";
import { validateCbtImport, previewCbtMatch, applyCbtToEntries } from "@guru-admin/domain";

interface UseCbtImportParams {
  selectedAssignment: () => TeachingAssignment | undefined;
  rosters: ClassRoster[];
  entries: GradeEntry[];
  setEntries: (entries: GradeEntry[]) => void;
  setDirty: (dirty: boolean) => void;
  setMessage: (msg: string | null) => void;
}

export function useCbtImport({
  selectedAssignment, rosters, entries, setEntries, setDirty, setMessage,
}: UseCbtImportParams) {
  const [cbtJsonInput, setCbtJsonInput] = useState("");
  const [cbtTarget, setCbtTarget] = useState<CbtImportTarget>("kd1");
  const [cbtPreview, setCbtPreview] = useState<CbtMatchPreview | null>(null);
  const [showCbtImport, setShowCbtImport] = useState(false);
  const [cbtSourceWarning, setCbtSourceWarning] = useState<string | null>(null);

  function handleCbtPreview() {
    const assignment = selectedAssignment();
    if (!assignment) return;
    const roster = rosters.find((r) => r.classId === assignment.classId);
    if (!roster) return;
    try {
      const json = JSON.parse(cbtJsonInput);
      const validation = validateCbtImport(json);
      if (!validation.success) {
        setMessage(validation.errors.join("; "));
        setCbtPreview(null);
        setCbtSourceWarning(null);
        return;
      }
      const preview = previewCbtMatch(validation.data!, roster.students);
      setCbtPreview(preview);
      if (validation.data!.source !== "cbt") {
        setCbtSourceWarning(
          "Sumber JSON tidak ditandai sebagai \"cbt\". Pastikan format berasal dari sistem CBT."
        );
      } else {
        setCbtSourceWarning(null);
      }
      setMessage(`Preview: ${preview.summary.matched} cocok, ${preview.summary.unmatchedCbt} CBT tidak cocok, ${preview.summary.missingRoster} siswa roster belum ada nilai CBT.`);
    } catch (e) {
      setMessage("JSON tidak valid: " + (e instanceof Error ? e.message : String(e)));
      setCbtPreview(null);
      setCbtSourceWarning(null);
    }
  }

  function handleCbtApply() {
    if (!cbtPreview) return;
    if (cbtPreview.summary.missingRoster > 0) {
      const ok = window.confirm(
        `${cbtPreview.summary.missingRoster} siswa roster belum ada di data CBT. ` +
        `Nilai lama mereka tidak akan diubah. Lanjutkan?`
      );
      if (!ok) return;
    }
    const updated = applyCbtToEntries(entries, cbtPreview, cbtTarget);
    setEntries(updated);
    setDirty(true);
    setMessage(`Nilai CBT diterapkan ke kolom ${cbtTarget.toUpperCase()} (${cbtPreview.summary.matched} siswa). Klik Simpan.`);
    setShowCbtImport(false);
    setCbtPreview(null);
    setCbtJsonInput("");
    setCbtSourceWarning(null);
  }

  return {
    cbtJsonInput, setCbtJsonInput,
    cbtTarget, setCbtTarget,
    cbtPreview, setCbtPreview,
    showCbtImport, setShowCbtImport,
    cbtSourceWarning, setCbtSourceWarning,
    handleCbtPreview, handleCbtApply,
  };
}
