/**
 * useEvaluationDocsState — all state management for EvaluationDocsPage orchestrator.
 *
 * Encapsulates useState, useEffect, handler functions, and derived values
 * so the page component only needs to call this hook and render.
 */

import { useEffect, useState } from "react";
import { getActiveAcademicYear, getTeacherProfile, getSchoolProfile } from "@shared/db/profile-repo";
import { listAssignmentsByTeacher } from "@shared/db/teaching-assignment-repo";
import { listATPEntries } from "@shared/db/atp-entry-repo";
import { listCalendarEvents } from "@shared/db/calendar-repo";
import {
  generateBlueprintPrompt,
  parseBlueprintAIJson,
  generateQuestionCardPrompt,
  parseQuestionCardAIJson,
  generateEffectiveWeeks,
  type AssessmentType,
  type ParseBlueprintResult,
  type ParseQuestionCardResult,
  type EffectiveWeekItem,
} from "@guru-admin/domain";
import { filterATPForAssignment } from "@guru-admin/domain";
import type { AcademicYear, TeacherProfile, SchoolProfile, TeachingAssignment, ATPEntry } from "@guru-admin/domain";
import { todayISODate } from "@guru-admin/shared";
import type { KktpAnalysisRow, AssessmentGridRow } from "@shared/documents";
import type { Tab } from "./evaluation-docs-types";

export type EvaluationDocsState = ReturnType<typeof useEvaluationDocsState>;

export function useEvaluationDocsState() {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [, setTeacher] = useState<TeacherProfile | undefined>();
  const [school, setSchool] = useState<SchoolProfile | undefined>();
  const [assignments, setAssignments] = useState<TeachingAssignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [atpEntries, setAtpEntries] = useState<ATPEntry[]>([]);
  const [tab, setTab] = useState<Tab>("minggu-efektif");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Assessment plan form
  const [assessmentType, setAssessmentType] = useState<AssessmentType>("sumatif");
  const [title, setTitle] = useState("");
  const [selectedTpIds, setSelectedTpIds] = useState<Set<string>>(new Set());
  const [pgCount, setPgCount] = useState(5);
  const [essayCount, setEssayCount] = useState(2);
  const [jpPerWeek, setJpPerWeek] = useState(3);

  // Blueprint prompt + parse
  const [blueprintPrompt, setBlueprintPrompt] = useState("");
  const [blueprintJsonInput, setBlueprintJsonInput] = useState("");
  const [blueprintResult, setBlueprintResult] = useState<ParseBlueprintResult | null>(null);

  // Question card prompt + parse
  const [cardPrompt, setCardPrompt] = useState("");
  const [cardJsonInput, setCardJsonInput] = useState("");
  const [cardResult, setCardResult] = useState<ParseQuestionCardResult | null>(null);

  // Effective weeks
  const [effectiveWeeks, setEffectiveWeeks] = useState<EffectiveWeekItem[]>([]);

  // KKTP Analysis rows
  const [kktpRows, setKktpRows] = useState<KktpAnalysisRow[]>([]);
  const [kktpValue, setKktpValue] = useState(75);

  // Assessment Grid rows
  const [assessmentGridRows, setAssessmentGridRows] = useState<AssessmentGridRow[]>([]);
  const [assessmentGridTitle, setAssessmentGridTitle] = useState("");

  // Document mode
  const [showDocument, setShowDocument] = useState(false);

  // --- Initial data load ---
  useEffect(() => {
    void (async () => {
      const [y, tp, sp] = await Promise.all([getActiveAcademicYear(), getTeacherProfile(), getSchoolProfile()]);
      setYear(y ?? null);
      setTeacher(tp);
      setSchool(sp);
      if (y && tp) {
        const todayISO = todayISODate();
        const sem: 1 | 2 = y.semester2Start <= todayISO && todayISO <= y.semester2End ? 2 : 1;
        setAssignments(await listAssignmentsByTeacher(tp.id, y.id, sem));
        setAtpEntries(await listATPEntries({ academicYearId: y.id, teacherId: tp.id }));
      }
      setLoading(false);
    })();
  }, []);

  // --- Auto-clear message ---
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), message.type === "error" ? 5000 : 3000);
    return () => clearTimeout(t);
  }, [message]);

  // --- Derived values ---
  function selectedAssignment(): TeachingAssignment | undefined {
    return assignments.find((a) => a.id === selectedAssignmentId);
  }

  function filteredATP(): ATPEntry[] {
    const a = selectedAssignment();
    if (!a) return [];
    return filterATPForAssignment(atpEntries, a);
  }

  function toggleTp(tpId: string) {
    const next = new Set(selectedTpIds);
    if (next.has(tpId)) next.delete(tpId);
    else next.add(tpId);
    setSelectedTpIds(next);
  }

  const assignment = selectedAssignment();
  const effectiveWeeksTotal = effectiveWeeks.filter((w) => w.isEffective).length;
  const effectiveJPTotal = effectiveWeeks.reduce((sum, w) => sum + w.effectiveJP, 0);

  // --- Effective Weeks ---
  function handleGenerateWeeks() {
    if (!year) return;
    const a = selectedAssignment();
    if (!a) return;
    const semStart = a.semester === 1 ? year.semester1Start : year.semester2Start;
    const semEnd = a.semester === 1 ? year.semester1End : year.semester2End;
    void (async () => {
      const cal = await listCalendarEvents(year.id);
      const blocking = cal.filter((e) => e.blocksLearning).map((e) => ({ startDate: e.startDate, endDate: e.endDate, label: e.label }));
      const weeks = generateEffectiveWeeks({ semesterStart: semStart, semesterEnd: semEnd, blockingEvents: blocking, jpPerWeek });
      setEffectiveWeeks(weeks);
      setMessage({ type: "success", text: `${weeks.length} minggu dihitung. ${weeks.filter(w => w.isEffective).length} efektif.` });
    })();
  }

  // --- Blueprint Prompt ---
  function handleGenerateBlueprintPrompt() {
    const a = selectedAssignment();
    if (!a) return;
    const selectedTps = filteredATP().filter((t) => selectedTpIds.has(t.id)).map((t) => ({ id: t.id, tp: t.tp, material: t.bab }));
    if (selectedTps.length === 0) {
      setMessage({ type: "error", text: "Pilih minimal 1 TP." });
      return;
    }
    const prompt = generateBlueprintPrompt({
      subject: a.subject,
      classLabel: a.classLabel,
      semester: a.semester,
      assessmentType,
      title: title || `${assessmentType.toUpperCase()}`,
      multipleChoiceCount: pgCount,
      essayCount,
      tps: selectedTps,
    });
    setBlueprintPrompt(prompt);
    setMessage({ type: "success", text: "Prompt kisi-kisi dibuat. Copy lalu paste ke Claude." });
  }

  function handleParseBlueprint() {
    const a = selectedAssignment();
    if (!a) return;
    const result = parseBlueprintAIJson(blueprintJsonInput, Array.from(selectedTpIds), pgCount, essayCount);
    setBlueprintResult(result);
    if (result.success) {
      setMessage({ type: "success", text: `Kisi-kisi valid. ${result.blueprints!.length} kelompok soal.` });
    } else {
      setMessage({ type: "error", text: result.errors.join("; ") });
    }
  }

  // --- Question Card Prompt ---
  function handleGenerateCardPrompt() {
    const a = selectedAssignment();
    if (!a || !blueprintResult?.success) return;
    const prompt = generateQuestionCardPrompt({
      subject: a.subject,
      classLabel: a.classLabel,
      title: title || assessmentType.toUpperCase(),
      blueprints: blueprintResult.blueprints!,
    });
    setCardPrompt(prompt);
    setMessage({ type: "success", text: "Prompt kartu soal dibuat. Copy lalu paste ke Claude." });
  }

  function handleParseCard() {
    if (!blueprintResult?.success) return;
    const allNumbers = blueprintResult.blueprints!.flatMap((b) => b.questionNumbers);
    const pgNumbers = blueprintResult.blueprints!.filter((b) => b.questionType === "pg").flatMap((b) => b.questionNumbers);
    const essayNumbers = blueprintResult.blueprints!.filter((b) => b.questionType === "esai").flatMap((b) => b.questionNumbers);
    const result = parseQuestionCardAIJson(cardJsonInput, allNumbers, pgNumbers, essayNumbers);
    setCardResult(result);
    if (result.success) {
      setMessage({ type: "success", text: `Kartu soal valid. ${result.questions!.length} soal.` });
    } else {
      setMessage({ type: "error", text: result.errors.join("; ") });
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setMessage({ type: "success", text: "Disalin ke clipboard." });
  }

  // --- Build KKTP rows from selected TPs ---
  function buildKktpRows() {
    const rows = filteredATP().filter(t => selectedTpIds.has(t.id)).map(t => {
      const existing = kktpRows.find(r => r.learningObjective === t.tp);
      return existing ?? { element: t.elemen ?? "", learningObjective: t.tp, intervalIndex: undefined };
    });
    setKktpRows(rows);
    setMessage({ type: "success", text: `${rows.length} TP dimasukkan ke tabel KKTP.` });
  }

  // --- Build Assessment Grid rows from selected TPs ---
  function buildAssessmentGridRows() {
    const rows: AssessmentGridRow[] = filteredATP().filter(t => selectedTpIds.has(t.id)).map((t, i) => ({
      no: i + 1,
      element: t.elemen ?? "—",
      material: t.bab ?? "—",
      indicator: t.tp ?? "—",
      questionForm: "—",
      cognitiveLevel: "—",
      questionNumbers: "—",
    }));
    setAssessmentGridRows(rows);
    setMessage({ type: "success", text: `${rows.length} baris kisi-kisi dibuat. Isi detail per baris di tabel di bawah.` });
  }

  return {
    // Loading & data
    loading,
    year,
    school,
    assignments,
    selectedAssignmentId,
    setSelectedAssignmentId,
    assignment,
    atpEntries,
    filteredATP,

    // Tab & document mode
    tab,
    setTab,
    showDocument,
    setShowDocument,

    // Messages
    message,

    // Assessment plan form
    assessmentType,
    setAssessmentType,
    title,
    setTitle,
    selectedTpIds,
    toggleTp,
    pgCount,
    setPgCount,
    essayCount,
    setEssayCount,

    // Blueprint
    blueprintPrompt,
    blueprintJsonInput,
    setBlueprintJsonInput,
    blueprintResult,
    handleGenerateBlueprintPrompt,
    handleParseBlueprint,

    // Question card
    cardPrompt,
    cardJsonInput,
    setCardJsonInput,
    cardResult,
    handleGenerateCardPrompt,
    handleParseCard,

    // Effective weeks
    jpPerWeek,
    setJpPerWeek,
    effectiveWeeks,
    effectiveWeeksTotal,
    effectiveJPTotal,
    handleGenerateWeeks,

    // KKTP
    kktpRows,
    setKktpRows,
    kktpValue,
    setKktpValue,
    buildKktpRows,

    // Assessment grid
    assessmentGridRows,
    setAssessmentGridRows,
    assessmentGridTitle,
    setAssessmentGridTitle,
    buildAssessmentGridRows,

    // Utility
    copyToClipboard,
  };
}
