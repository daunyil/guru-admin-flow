/**
 * useKbmJournal — Journal state and actions.
 *
 * Responsibilities (receives selectedSession as param):
 *   - journal, journalInput, realizationStatus, realizationReason
 *   - structuredNote, activeCategoryTab
 *   - jurnalStep, doneJurnal
 *   - autoNarasi
 *   - handleCopyPreviousJournal, toggleStructuredChip
 *   - Returns dirty state: isJournalDirty
 */

import { useMemo, useState } from "react";
import {
  getJournalBySession,
} from "@shared/db/journal-repo";
import { listLessonSessions } from "@shared/db/lesson-session-repo";
import {
  buildJournalNarrative,
  unpackStructuredNote,
} from "@guru-admin/domain";
import type {
  AcademicYear,
  JournalRealizationStatus,
  LessonSession,
  TeachingJournal,
} from "@guru-admin/domain";
import type { StructuredNoteCategory, StructuredNoteState, StepState } from "../types";
import type { StepState as StepStateLocal } from "@shared/ui/mobile/AccordionCard";

export interface UseKbmJournalReturn {
  journal: TeachingJournal | null;
  journalInput: { actualMaterialTitle: string; note: string };
  setJournalInput: React.Dispatch<React.SetStateAction<{ actualMaterialTitle: string; note: string }>>;
  realizationStatus: JournalRealizationStatus;
  setRealizationStatus: (status: JournalRealizationStatus) => void;
  realizationReason: string;
  setRealizationReason: (reason: string) => void;
  structuredNote: StructuredNoteState;
  setStructuredNote: React.Dispatch<React.SetStateAction<StructuredNoteState>>;
  activeCategoryTab: StructuredNoteCategory;
  setActiveCategoryTab: (tab: StructuredNoteCategory) => void;
  toggleStructuredChip: (category: StructuredNoteCategory, chip: string) => void;
  autoNarasi: string;
  jurnalStep: StepState;
  handleCopyPreviousJournal: () => Promise<void>;
  isJournalDirty: boolean;
}

export interface JournalSnapshot {
  journalInput: { actualMaterialTitle: string; note: string };
  structuredNote: StructuredNoteState;
  realizationStatus: JournalRealizationStatus;
  realizationReason: string;
}

export function useKbmJournal(
  _jurnalStep: StepStateLocal,
  _setJurnalStep: React.Dispatch<React.SetStateAction<StepStateLocal>>,
  /** Snapshot for dirty tracking — set externally after session load */
  savedSnapshot: JournalSnapshot | null,
  /** External notice setter */
  _setNotice: (notice: string | null) => void,
) {
  const [journal, setJournal] = useState<TeachingJournal | null>(null);
  const [journalInput, setJournalInput] = useState({
    actualMaterialTitle: "",
    note: "",
  });
  const [realizationStatus, setRealizationStatus] = useState<JournalRealizationStatus>("done");
  const [realizationReason, setRealizationReason] = useState("");
  const [structuredNote, setStructuredNote] = useState<StructuredNoteState>({
    activities: [] as string[],
    studentResponse: [] as string[],
    obstacle: [] as string[],
    followUp: [] as string[],
  });
  const [activeCategoryTab, setActiveCategoryTab] = useState<StructuredNoteCategory>("activities");

  /* ---- Computed: Auto-generated narasi ---- */

  const autoNarasi = useMemo(() => {
    const result = buildJournalNarrative({
      material: journalInput.actualMaterialTitle || undefined,
      activities: structuredNote.activities,
      studentResponse: structuredNote.studentResponse.join(", ") || undefined,
      obstacle: structuredNote.obstacle.join(", ") || undefined,
      followUp: structuredNote.followUp.join(", ") || undefined,
      freeNote: journalInput.note || undefined,
    });
    return [result.activityNarrative, result.noteNarrative, result.followUpNarrative]
      .filter(Boolean).join(" ");
  }, [journalInput.actualMaterialTitle, journalInput.note, structuredNote]);

  /* ---- Dirty tracking ---- */

  const isJournalDirty = useMemo(() => {
    if (!savedSnapshot) return false;
    if (journalInput.actualMaterialTitle !== savedSnapshot.journalInput.actualMaterialTitle) return true;
    if (journalInput.note !== savedSnapshot.journalInput.note) return true;
    if (structuredNote.activities.join() !== savedSnapshot.structuredNote.activities.join()) return true;
    if (structuredNote.studentResponse.join() !== savedSnapshot.structuredNote.studentResponse.join()) return true;
    if (structuredNote.obstacle.join() !== savedSnapshot.structuredNote.obstacle.join()) return true;
    if (structuredNote.followUp.join() !== savedSnapshot.structuredNote.followUp.join()) return true;
    if (realizationStatus !== savedSnapshot.realizationStatus) return true;
    if (realizationReason !== savedSnapshot.realizationReason) return true;
    return false;
  }, [journalInput, structuredNote, realizationStatus, realizationReason, savedSnapshot]);

  /* ---- Actions ---- */

  function toggleStructuredChip(category: StructuredNoteCategory, chip: string) {
    setStructuredNote((prev) => {
      const current = prev[category];
      const next = current.includes(chip) ? current.filter((c) => c !== chip) : [...current, chip];
      return { ...prev, [category]: next };
    });
  }

  return {
    journal, setJournal,
    journalInput, setJournalInput,
    realizationStatus, setRealizationStatus,
    realizationReason, setRealizationReason,
    structuredNote, setStructuredNote,
    activeCategoryTab, setActiveCategoryTab,
    toggleStructuredChip,
    autoNarasi,
    jurnalStep: _jurnalStep,
    isJournalDirty,
  };
}

/** handleCopyPreviousJournal needs access to year/session/etc, so it's a standalone factory */
export function createCopyPreviousJournalHandler(
  yearRef: () => AcademicYear | null,
  selectedClassIdRef: () => string | null,
  selectedSubjectRef: () => string | null,
  selectedSessionRef: () => LessonSession | null,
  setJournalInput: React.Dispatch<React.SetStateAction<{ actualMaterialTitle: string; note: string }>>,
  setStructuredNote: React.Dispatch<React.SetStateAction<StructuredNoteState>>,
  setNotice: (notice: string | null) => void,
) {
  return async () => {
    const year = yearRef();
    const selectedClassId = selectedClassIdRef();
    const selectedSubject = selectedSubjectRef();
    const selectedSession = selectedSessionRef();
    if (!year || !selectedClassId || !selectedSubject || !selectedSession) return;
    try {
      const allSessions = await listLessonSessions(year.id);
      const relevant = allSessions
        .filter((s) => s.classId === selectedClassId && s.subject === selectedSubject && s.id !== selectedSession.id)
        .sort((a, b) => b.date.localeCompare(a.date));
      if (relevant.length === 0) { setNotice("Tidak ada jurnal sebelumnya."); return; }
      for (const prevSession of relevant) {
        const prevJournal = await getJournalBySession(prevSession.id);
        if (prevJournal && prevJournal.actualMaterialTitle) {
          setJournalInput((prev) => ({
            ...prev, actualMaterialTitle: prevJournal.actualMaterialTitle ?? prev.actualMaterialTitle,
          }));
          const unpacked = unpackStructuredNote(prevJournal.note);
          setStructuredNote((prev) => ({
            activities: unpacked.activities.length > 0 ? unpacked.activities : prev.activities,
            studentResponse: unpacked.studentResponse ? [unpacked.studentResponse] : prev.studentResponse,
            obstacle: unpacked.obstacle ? [unpacked.obstacle] : prev.obstacle,
            followUp: prevJournal.followUp ? [prevJournal.followUp] : prev.followUp,
          }));
          setNotice("Jurnal sebelumnya berhasil disalin!"); return;
        }
      }
      setNotice("Tidak ada jurnal sebelumnya yang berisi materi.");
    } catch (err) {
      console.error("[useKbmHub] Gagal salin jurnal:", err);
      setNotice("Gagal menyalin jurnal sebelumnya.");
    }
  };
}
