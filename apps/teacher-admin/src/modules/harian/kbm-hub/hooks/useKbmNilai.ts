/**
 * useKbmNilai — Nilai (grade) state and actions.
 *
 * Responsibilities (receives selectedSession and effectiveRecords as params):
 *   - gradeBook, nilaiMap, nilaiToggle, nilaiType
 *   - nilaiStep
 *   - setNilai, setNilaiToggle, setNilaiType
 *   - Returns dirty state: isNilaiDirty
 */

import { useMemo, useState } from "react";
import type { GradeBook } from "@guru-admin/domain";
import type { StepState } from "../types";
import type { StepState as StepStateLocal } from "@shared/ui/mobile/AccordionCard";

export interface UseKbmNilaiReturn {
  gradeBook: GradeBook | null;
  nilaiMap: Map<string, number>;
  nilaiToggle: boolean;
  nilaiType: string;
  nilaiStep: StepState;
  setNilai: (studentId: string, value: number | null) => void;
  setNilaiToggle: (toggle: boolean) => void;
  setNilaiType: (type: string) => void;
  setGradeBook: React.Dispatch<React.SetStateAction<GradeBook | null>>;
  setNilaiMap: React.Dispatch<React.SetStateAction<Map<string, number>>>;
  isNilaiDirty: boolean;
}

export function useKbmNilai(
  nilaiStep: StepStateLocal,
  /** Snapshot for dirty tracking — set externally after session load */
  savedNilaiMapSnapshot: Map<string, number> | null,
) {
  const [gradeBook, setGradeBook] = useState<GradeBook | null>(null);
  const [nilaiMap, setNilaiMap] = useState<Map<string, number>>(new Map());
  const [nilaiToggle, setNilaiToggle] = useState(false);
  const [nilaiType, setNilaiType] = useState<string>("uh1");

  /* ---- Dirty tracking ---- */

  const isNilaiDirty = useMemo(() => {
    if (!savedNilaiMapSnapshot) return false;
    if (nilaiMap.size !== savedNilaiMapSnapshot.size) return true;
    for (const [k, v] of nilaiMap) { if (savedNilaiMapSnapshot.get(k) !== v) return true; }
    return false;
  }, [nilaiMap, savedNilaiMapSnapshot]);

  /* ---- Actions ---- */

  function setNilai(studentId: string, value: number | null) {
    const next = new Map(nilaiMap);
    if (value !== null && value >= 0 && value <= 100) next.set(studentId, value);
    else next.delete(studentId);
    setNilaiMap(next);
  }

  return {
    gradeBook, setGradeBook,
    nilaiMap, setNilaiMap,
    nilaiToggle, setNilaiToggle,
    nilaiType, setNilaiType,
    nilaiStep,
    setNilai,
    isNilaiDirty,
  };
}
