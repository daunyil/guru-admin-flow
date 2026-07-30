/**
 * Custom hook encapsulating all state, effects, handlers, and computed values
 * for the DailyDutyPage component.
 *
 * PIKET-UI-V2: Opsi B (Segmented Switcher)
 * - mainView: "catat" | "rekap"
 * - rekapSubTab: "presensi" | "catatan" | "poin" | "cetak"
 *
 * Bug fixes:
 * - P0-1/P0-2: try/catch/finally + error state + retry button
 * - P1-1: isSubmitting guard on async handlers
 * - P1-2: auto-reset selectedStudent & selectedRule when date changes
 * - P1-4: responsive grid (handled in PointLedgerTab)
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { getActiveAcademicYear, getSchoolProfile, getTeacherProfile } from "@shared/db/profile-repo";
import { listClassRosters } from "@shared/db/class-roster-repo";
import { todayISODate } from "@guru-admin/shared";
import {
  listDutyRules,
  seedDefaultDutyRulesIfEmpty,
  findOrCreateDutyReport,
  getDutyReportByDate,
  updateDutyReportNote,
  finalizeDutyReport,
  unlockDutyReport,
  addDutyRecord,
  deleteDutyRecord,
  listDutyRecordsByDate,
  listDutyRecordsByAcademicYear,
  getAttendanceDetailForDate,
  syncAlpaFromAttendance,
} from "@shared/db/daily-duty-repo";
import type {
  AcademicYear,
  ClassAttendanceDetail,
  ClassRoster,
  DutyRecord,
  DutyRule,
  SchoolProfile,
  StudentDutyLedgerItem,
  StudentSearchable,
  TeacherProfile,
} from "@guru-admin/domain";
import {
  buildStudentDutyLedger,
  filterDutyRecordsByStudent,
  searchDutyRules,
  searchStudents,
  summarizeDutyRecords,
  validateDutyRecordInput,
} from "@guru-admin/domain";
import { buildPiketLetter, type PiketLetterDocument, type PiketLetterType } from "./piket-letter";
import type { MainView, RekapSubTab } from "./types";

type MessageType = { type: "success" | "error" | "warning"; text: string } | null;

export function useDailyDutyState() {
  // ─── Core state ───
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [school, setSchool] = useState<SchoolProfile | undefined>();
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [date, setDate] = useState(todayISODate());

  // ─── UI-V2: Segmented Switcher state ───
  const [mainView, setMainView] = useState<MainView>("catat");
  const [rekapSubTab, setRekapSubTab] = useState<RekapSubTab>("presensi");

  // ─── Data state ───
  const [rules, setRules] = useState<DutyRule[]>([]);
  const [rosters, setRosters] = useState<ClassRoster[]>([]);
  const [records, setRecords] = useState<DutyRecord[]>([]);
  const [attendanceDetail, setAttendanceDetail] = useState<ClassAttendanceDetail[]>([]);
  const [reportNote, setReportNote] = useState("");
  const [reportFinalized, setReportFinalized] = useState(false);

  // ─── P0-1/P0-2: Error state + retry ───
  const [initError, setInitError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ─── P1-1: isSubmitting guard ───
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── Message (auto-dismiss) ───
  const [message, setMessage] = useState<MessageType>(null);

  function notify(type: "success" | "error" | "warning", text: string) {
    setMessage({ type, text });
  }

  // Auto-dismiss message setelah 4 detik
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(t);
  }, [message]);

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

  // ─── Ledger state ───
  const [ledgerRecords, setLedgerRecords] = useState<DutyRecord[]>([]);
  const [ledgerClassFilter, setLedgerClassFilter] = useState<string>("all");
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState<string>("all");
  const [ledgerStudentQuery, setLedgerStudentQuery] = useState("");
  const [ledgerDetailStudent, setLedgerDetailStudent] = useState<StudentDutyLedgerItem | null>(null);
  const [ledgerDetailRecords, setLedgerDetailRecords] = useState<DutyRecord[]>([]);
  const [letterPreview, setLetterPreview] = useState<PiketLetterDocument | null>(null);

  // ─── P1-2: Auto-reset selection saat tanggal berubah ───
  const prevDateRef = useState(todayISODate());
  useEffect(() => {
    if (prevDateRef[0] !== date) {
      prevDateRef[1](date);
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

  // ─── Effects ───
  useEffect(() => { void init(); }, []);

  useEffect(() => {
    if (year) void loadData();
  }, [date, year]);

  useEffect(() => {
    if (year) void loadLedgerData();
  }, [year]);

  // ─── P0-1/P0-2: init with try/catch/finally ───
  async function init() {
    setInitError(null);
    try {
      const [y, sp, tp] = await Promise.all([
        getActiveAcademicYear(),
        getSchoolProfile(),
        getTeacherProfile(),
      ]);
      setYear(y ?? null);
      setSchool(sp);
      setTeacher(tp);
      if (y) setRosters(await listClassRosters(y.id));
      await seedDefaultDutyRulesIfEmpty();
      setRules(await listDutyRules());
    } catch (e) {
      setInitError(e instanceof Error ? e.message : "Gagal memuat data awal. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  // ─── P0-1/P0-2: loadData with try/catch/finally ───
  async function loadData() {
    if (!year) return;
    setLoadError(null);
    try {
      const [recs, detail, report] = await Promise.all([
        listDutyRecordsByDate(year.id, date),
        getAttendanceDetailForDate({ academicYearId: year.id, date }),
        getDutyReportByDate(year.id, date),
      ]);
      setRecords(recs);
      setAttendanceDetail(detail);
      if (report) {
        setReportNote(report.note ?? "");
        setReportFinalized(report.finalized);
      } else {
        setReportNote("");
        setReportFinalized(false);
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Gagal memuat data tanggal ini.");
    }
  }

  // ─── P0-1/P0-2: loadLedgerData with try/catch/finally ───
  async function loadLedgerData() {
    if (!year) return;
    try {
      const all = await listDutyRecordsByAcademicYear(year.id);
      setLedgerRecords(all);
    } catch (e) {
      // Ledger error is non-blocking; just log it
      console.error("[Piket] loadLedgerData error:", e);
    }
  }

  async function refreshDutyData() {
    await Promise.all([loadData(), loadLedgerData()]);
  }

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

  const ledger = useMemo<StudentDutyLedgerItem[]>(() => buildStudentDutyLedger(ledgerRecords), [ledgerRecords]);

  const filteredLedger = useMemo<StudentDutyLedgerItem[]>(() => {
    let items = ledger;
    if (ledgerClassFilter !== "all") items = items.filter((i) => i.classId === ledgerClassFilter);
    if (ledgerStatusFilter !== "all") items = items.filter((i) => i.statusLabel === ledgerStatusFilter);
    if (ledgerStudentQuery.trim()) {
      const searchable = items.map((i) => ({
        id: i.studentId,
        name: i.studentName,
        number: i.studentNumber,
        classId: i.classId,
        classLabel: i.classLabel,
      }));
      const matchedIds = new Set(searchStudents(searchable, ledgerStudentQuery).map((s) => s.id));
      items = items.filter((i) => matchedIds.has(i.studentId));
    }
    return items;
  }, [ledger, ledgerClassFilter, ledgerStatusFilter, ledgerStudentQuery]);

  const summary = useMemo(() => summarizeDutyRecords(records), [records]);

  // ─── Computed: report status label & color ───
  const reportStatus = useMemo<{ label: string; color: string }>(() => {
    if (reportFinalized) return { label: "Lengkap", color: "emerald" };
    if (records.length > 0) return { label: "Draft", color: "amber" };
    return { label: "Belum diisi", color: "slate" };
  }, [reportFinalized, records.length]);

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
      // Reset student only (keep rule in batch mode)
      setSelectedStudent(null);
      if (!batchMode) {
        setSelectedRule(null);
      }
      setCatatan("");
      setTindakLanjut("");
      setStudentQuery("");
      await refreshDutyData();
    } catch (e) {
      notify("error", e instanceof Error ? e.message : "Gagal menyimpan catatan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  /** P1-1: handleDeleteRecord with isSubmitting guard */
  async function handleDeleteRecord(id: string) {
    if (isSubmitting) return;
    if (!window.confirm("Hapus catatan ini?")) return;
    setIsSubmitting(true);
    try {
      await deleteDutyRecord(id);
      notify("success", "Catatan dihapus.");
      await refreshDutyData();
    } catch (e) {
      notify("error", e instanceof Error ? e.message : "Gagal menghapus catatan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleFinalize() {
    if (!year || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const report = await getDutyReportByDate(year.id, date);
      if (!report) { notify("warning", "Belum ada laporan untuk difinalisasi."); return; }
      await finalizeDutyReport(report.id);
      setReportFinalized(true);
      notify("success", "Laporan piket difinalisasi.");
    } catch (e) {
      notify("error", e instanceof Error ? e.message : "Gagal finalisasi laporan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUnlock() {
    if (!year || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const report = await getDutyReportByDate(year.id, date);
      if (!report) { notify("warning", "Belum ada laporan untuk dibuka."); return; }
      await unlockDutyReport(report.id);
      setReportFinalized(false);
      notify("success", "Laporan dibuka untuk revisi.");
    } catch (e) {
      notify("error", e instanceof Error ? e.message : "Gagal membuka revisi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSyncAlpa() {
    if (!year || !teacher || isSubmitting) return;
    if (reportFinalized) { notify("warning", "Laporan sudah difinalisasi. Buka revisi dulu."); return; }
    const ok = window.confirm("Sinkron Alpa dari Absen? Siswa dengan status Alpa di absen utama akan dibuat catatan piket (10 poin). Catatan yang sudah ada tidak akan dobel.");
    if (!ok) return;
    setIsSubmitting(true);
    try {
      const result = await syncAlpaFromAttendance({
        academicYearId: year.id,
        date,
        dutyTeacherId: teacher.id,
        dutyTeacherName: teacher.name,
      });
      notify("success", `Sinkron Alpa: ${result.created} baru, ${result.skipped} sudah ada (skip).`);
      await refreshDutyData();
    } catch (e) {
      notify("error", e instanceof Error ? e.message : "Gagal sinkron Alpa dari absen.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSaveNote() {
    if (!year || isSubmitting) return;
    if (!teacher?.id) { notify("error", "Profil guru belum lengkap. Buka menu Profil."); return; }
    setIsSubmitting(true);
    try {
      const report = await findOrCreateDutyReport({
        academicYearId: year.id,
        date,
        dutyTeacherId: teacher.id,
        dutyTeacherName: teacher.name,
      });
      await updateDutyReportNote(report.id, reportNote);
      notify("success", "Catatan piket tersimpan.");
    } catch (e) {
      notify("error", e instanceof Error ? e.message : "Gagal menyimpan catatan umum.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOpenLedgerDetail(item: StudentDutyLedgerItem) {
    setLedgerDetailStudent(item);
    setLedgerDetailRecords(filterDutyRecordsByStudent(ledgerRecords, item.studentId, item.classId));
    setLetterPreview(null);
  }

  function handleCloseLedgerDetail() {
    setLedgerDetailStudent(null);
    setLedgerDetailRecords([]);
    setLetterPreview(null);
  }

  function handleBuildLetter(letterType: PiketLetterType) {
    if (!ledgerDetailStudent || ledgerDetailRecords.length === 0) {
      notify("warning", "Data siswa atau riwayat belum tersedia.");
      return;
    }
    if (!school?.name) {
      notify("error", "Lengkapi profil sekolah terlebih dahulu.");
      return;
    }
    if (ledgerDetailStudent.totalPoints < 25) {
      notify("warning", `Siswa ini berstatus "Aman" (${ledgerDetailStudent.totalPoints} poin). Surat biasanya untuk siswa dengan poin >= 25.`);
    }
    const letter = buildPiketLetter({
      letterType,
      schoolName: school.name,
      schoolAddress: school.address,
      principalName: school.headmasterName,
      principalNip: school.headmasterNip,
      date: todayISODate(),
      place: school.regency || school.district || "",
      studentName: ledgerDetailStudent.studentName,
      studentNumber: ledgerDetailStudent.studentNumber,
      classLabel: ledgerDetailStudent.classLabel,
      totalPoints: ledgerDetailStudent.totalPoints,
      totalRecords: ledgerDetailStudent.totalRecords,
      statusLabel: ledgerDetailStudent.statusLabel,
      records: ledgerDetailRecords,
      dutyTeacherName: teacher?.name ?? "-",
    });
    setLetterPreview(letter);
  }

  /** P0-1/P0-2: retry handler */
  const handleRetryInit = useCallback(() => { void init(); }, []);

  const handleRetryLoad = useCallback(() => { void loadData(); }, [date, year]);

  return {
    // Loading
    loading,
    initError,
    loadError,
    handleRetryInit,
    handleRetryLoad,
    // Core data
    year,
    school,
    teacher,
    date,
    setDate,
    // UI-V2: Segmented Switcher
    mainView,
    setMainView,
    rekapSubTab,
    setRekapSubTab,
    // Data
    rules,
    rosters,
    records,
    attendanceDetail,
    reportNote,
    setReportNote,
    reportFinalized,
    reportStatus,
    // Message
    message,
    notify,
    // P1-1: isSubmitting
    isSubmitting,
    // Catat tab
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
    // Batch Mode
    batchMode,
    setBatchMode,
    // Popular rules
    popularRules,
    handleSelectStudent,
    // Computed
    allStudents,
    filteredStudents,
    filteredRules,
    ledger,
    filteredLedger,
    summary,
    // Catat handlers
    handleCatat,
    // Notes tab handlers
    handleDeleteRecord,
    handleFinalize,
    handleUnlock,
    handleSyncAlpa,
    handleSaveNote,
    // Ledger state
    ledgerRecords,
    ledgerClassFilter,
    setLedgerClassFilter,
    ledgerStatusFilter,
    setLedgerStatusFilter,
    ledgerStudentQuery,
    setLedgerStudentQuery,
    ledgerDetailStudent,
    ledgerDetailRecords,
    letterPreview,
    setLetterPreview,
    // Ledger handlers
    handleOpenLedgerDetail,
    handleCloseLedgerDetail,
    handleBuildLetter,
  };
}
