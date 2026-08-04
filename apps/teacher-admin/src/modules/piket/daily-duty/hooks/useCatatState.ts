/**
 * Sub-hook: Catat (recording) tab state — manages student/rule selection,
 * search, batch mode, and the handleCatat submission handler.
 *
 * P1-1: isSubmitting guard on async handlers
 * P1-2: auto-reset selectedStudent & selectedRule when date changes
 * FIX-STALE: Read fresh ledgerRecords from DB instead of stale closure value
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { todayISODate } from "@guru-admin/shared";
import {
  findOrCreateDutyReport,
  addDutyRecord,
  listDutyRecordsByAcademicYear,
} from "@shared/db/daily-duty-repo";
import {
  validateDutyRecordInput,
  searchStudents,
  searchDutyRules,
  buildStudentDutyLedger,
} from "@guru-admin/domain";
import type {
  AcademicYear,
  ClassRoster,
  DutyRule,
  StudentSearchable,
  TeacherProfile,
} from "@guru-admin/domain";
import type { ThresholdWarning } from "../types";

type NotifyFn = (type: "success" | "error" | "warning", text: string) => void;

interface UseCatatStateParams {
  year: AcademicYear | null;
  teacher: TeacherProfile | undefined;
  date: string;
  rosters: ClassRoster[];
  rules: DutyRule[];
  isSubmitting: boolean;
  setIsSubmitting: (v: boolean) => void;
  refreshDutyData: () => Promise<void>;
  notify: NotifyFn;
}

export function useCatatState({
  year,
  teacher,
  date,
  rosters,
  rules,
  isSubmitting,
  setIsSubmitting,
  refreshDutyData,
  notify,
}: UseCatatStateParams) {
  // ─── Catat tab state ───
  const [catatClassFilter, setCatatClassFilter] = useState<string>("all");
  const [studentQuery, setStudentQuery] = useState("");
  const [ruleQuery, setRuleQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentSearchable | null>(null);
  const [selectedRule, setSelectedRule] = useState<DutyRule | null>(null);
  const [catatan, setCatatan] = useState("");
  const [tindakLanjut, setTindakLanjut] = useState("");

  // ─── Batch Mode (Kunci Aturan) ───
  const [batchMode, setBatchMode] = useState(false);

  // ─── Threshold Warning (muncul setelah simpan jika poin >= 50) ───
  const [thresholdWarning, setThresholdWarning] = useState<ThresholdWarning | null>(null);

  // ─── P1-2: Auto-reset selection saat tanggal berubah ───
  const prevDateRef = useRef(todayISODate());
  useEffect(() => {
    if (prevDateRef.current !== date) {
      prevDateRef.current = date;
      // Reset input draft saat tanggal berubah
      setSelectedStudent(null);
      if (!batchMode) {
        setSelectedRule(null);
      }
      setCatatan("");
      setTindakLanjut("");
      setStudentQuery("");
      setRuleQuery("");
    }
  }, [date, batchMode]);

  // ─── Computed values ───
  const allStudents = useMemo<StudentSearchable[]>(() => {
    const out: StudentSearchable[] = [];
    for (const r of rosters) {
      for (const s of r.students) {
        out.push({
          id: s.id,
          name: s.name,
          number: s.number,
          nis: s.nis,
          classId: r.classId,
          classLabel: r.classLabel,
        });
      }
    }
    return out;
  }, [rosters]);

  const filteredStudents = useMemo<StudentSearchable[]>(() => {
    const byClass = catatClassFilter === "all"
      ? allStudents
      : allStudents.filter((s) => s.classId === catatClassFilter);
    return searchStudents(byClass, studentQuery);
  }, [allStudents, catatClassFilter, studentQuery]);

  const filteredRules = useMemo<DutyRule[]>(() => searchDutyRules(rules, ruleQuery), [rules, ruleQuery]);

  // ─── Computed: popular rules for preset chips ───
  const popularRules = useMemo<DutyRule[]>(() => {
    const popularTypes: DutyRule["type"][] = ["late", "incomplete_uniform", "skipping_class"];
    const typeMap = new Map(rules.map((r) => [r.type, r]));
    return popularTypes.map((t) => typeMap.get(t)).filter((r): r is DutyRule => !!r);
  }, [rules]);

  // ─── Handlers ───

  /** Select a student — Flexi-Order: does NOT reset rule if batch mode is on */
  function handleSelectStudent(s: StudentSearchable) {
    setSelectedStudent(s);
    if (!batchMode) {
      // In non-batch mode, we keep the rule if it's already selected (flexi-order)
      // Reset catatan and tindakLanjut only
      setCatatan("");
      setTindakLanjut("");
    }
  }

  /** P1-1: handleCatat with isSubmitting guard */
  async function handleCatat() {
    if (!year || !teacher || isSubmitting) return;
    const validation = validateDutyRecordInput({ selectedStudent, selectedRule, note: catatan });
    if (!validation.ok) { notify("warning", validation.message); return; }

    setIsSubmitting(true);
    try {
      const report = await findOrCreateDutyReport({
        academicYearId: year.id,
        date,
        dutyTeacherId: teacher.id,
        dutyTeacherName: teacher.name,
      });
      if (report.finalized) { notify("warning", "Laporan sudah difinalisasi. Buka revisi dulu."); return; }

      await addDutyRecord({
        dutyReportId: report.id,
        academicYearId: year.id,
        date,
        studentId: selectedStudent!.id,
        studentName: selectedStudent!.name,
        studentNumber: selectedStudent!.number,
        classId: selectedStudent!.classId,
        classLabel: selectedStudent!.classLabel,
        category: selectedRule!.category,
        type: selectedRule!.type,
        ruleId: selectedRule!.id,
        ruleLabel: selectedRule!.label,
        points: selectedRule!.points,
        source: "manual",
        attendanceLinkType: null,
        note: catatan || undefined,
        followUp: tindakLanjut || undefined,
        recordedByTeacherId: teacher.id,
        recordedByTeacherName: teacher.name,
      });
      notify("success", `Catatan tersimpan: ${selectedStudent!.name} — ${selectedRule!.label} (${selectedRule!.points} poin).`);

      // Simpan info siswa sebelum reset untuk threshold check
      const savedStudentId = selectedStudent!.id;
      const savedClassId = selectedStudent!.classId;
      const savedStudentName = selectedStudent!.name;
      const savedClassLabel = selectedStudent!.classLabel;
      const savedPoints = selectedRule!.points;

      // Reset student only (keep rule in batch mode)
      setSelectedStudent(null);
      if (!batchMode) {
        setSelectedRule(null);
      }
      setCatatan("");
      setTindakLanjut("");
      setStudentQuery("");
      await refreshDutyData();

      // ─── THRESHOLD CHECK: cek apakah total poin siswa >= 50 ───
      // FIX-STALE: Read fresh ledgerRecords from DB instead of stale closure value.
      // After `await refreshDutyData()`, React may not have re-rendered yet,
      // so `ledgerRecords` in this closure is stale. Re-read directly.
      const freshLedgerRecords = await listDutyRecordsByAcademicYear(year.id);
      const updatedLedger = buildStudentDutyLedger(freshLedgerRecords);
      const studentInLedger = updatedLedger.find(
        (l) => l.studentId === savedStudentId && l.classId === savedClassId
      );
      if (studentInLedger && studentInLedger.totalPoints >= 50) {
        let thresholdLevel: ThresholdWarning["thresholdLevel"] = "sp1";
        if (studentInLedger.totalPoints >= 100) thresholdLevel = "sp3";
        else if (studentInLedger.totalPoints >= 75) thresholdLevel = "sp2";
        setThresholdWarning({
          studentName: savedStudentName,
          classLabel: savedClassLabel,
          newPoints: savedPoints,
          totalPoints: studentInLedger.totalPoints,
          thresholdLevel,
          studentId: savedStudentId,
          classId: savedClassId,
        });
      }
    } catch (e) {
      notify("error", e instanceof Error ? e.message : "Gagal menyimpan catatan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    catatClassFilter,
    setCatatClassFilter,
    studentQuery,
    setStudentQuery,
    ruleQuery,
    setRuleQuery,
    selectedStudent,
    setSelectedStudent,
    selectedRule,
    setSelectedRule,
    catatan,
    setCatatan,
    tindakLanjut,
    setTindakLanjut,
    batchMode,
    setBatchMode,
    allStudents,
    filteredStudents,
    filteredRules,
    popularRules,
    handleSelectStudent,
    handleCatat,
    thresholdWarning,
    setThresholdWarning,
  } as const;
}
