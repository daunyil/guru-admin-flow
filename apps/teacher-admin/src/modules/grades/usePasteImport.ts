/**
 * usePasteImport — paste Excel state and handlers.
 */
import { useState } from "react";
import type { TeachingAssignment, ClassRoster, GradeEntry } from "@guru-admin/domain";
import { parseExcelPaste } from "@guru-admin/domain";
import type { PastePreviewResult } from "./grades-types";

interface UsePasteImportParams {
  selectedAssignment: () => TeachingAssignment | undefined;
  rosters: ClassRoster[];
  entries: GradeEntry[];
  setEntries: (entries: GradeEntry[]) => void;
  setDirty: (dirty: boolean) => void;
  setMessage: (msg: string | null) => void;
}

export function usePasteImport({
  selectedAssignment, rosters, entries, setEntries, setDirty, setMessage,
}: UsePasteImportParams) {
  const [pasteText, setPasteText] = useState("");
  const [pastePreview, setPastePreview] = useState<PastePreviewResult | null>(null);

  function handlePastePreview(text: string) {
    const assignment = selectedAssignment();
    if (!assignment) return;
    const roster = rosters.find((r) => r.classId === assignment.classId);
    if (!roster) return;

    const { matched, unmatched } = parseExcelPaste(text, roster.students);
    if (matched.length === 0) {
      setPastePreview(null);
      setMessage("Tidak ada siswa yang cocok. Pastikan format: No, Nama, KD1-KD6, PTS, PAS.");
      return;
    }

    setPastePreview({
      matched: matched.map((m) => ({
        studentName: m.rosterStudent.name,
        studentNumber: m.rosterStudent.number,
        scores: m.scores,
      })),
      unmatched,
    });
    setMessage(`Preview: ${matched.length} siswa cocok, ${unmatched.length} baris tidak cocok. Klik "Terapkan ke Nilai" untuk menyimpan.`);
  }

  function handleApplyPaste() {
    if (!pastePreview) return;
    if (pastePreview.unmatched.length > 0) {
      const ok = window.confirm(
        `${pastePreview.unmatched.length} baris tidak cocok dengan roster dan akan diabaikan. ` +
        `Lanjutkan apply ${pastePreview.matched.length} siswa yang cocok?`
      );
      if (!ok) return;
    }
    const next = [...entries];
    for (const { studentName, scores } of pastePreview.matched) {
      const idx = next.findIndex((e) => e.studentName === studentName);
      if (idx >= 0) {
        next[idx] = { ...next[idx], ...scores };
      }
    }
    setEntries(next);
    setDirty(true);
    setMessage(`${pastePreview.matched.length} siswa diterapkan ke nilai. Klik Simpan untuk menyimpan permanen.`);
    setPastePreview(null);
    setPasteText("");
  }

  return {
    pasteText, setPasteText,
    pastePreview, setPastePreview,
    handlePastePreview, handleApplyPaste,
  };
}
