/**
 * Orchestrator: composes all sub-hooks into the unified useDailyDutyState interface.
 *
 * PIKET-REDESIGN: 3 tab utama — Laporkan, Catatan, Riwayat.
 *   - mainView: "laporkan" | "catatan" | "riwayat"
 *   - No more rekapSubTab (sub-tabs eliminated)
 *
 * Bug fixes preserved:
 * - P0-1/P0-2: try/catch/finally + error state + retry button
 * - P1-1: isSubmitting guard on async handlers
 * - P1-2: auto-reset selectedStudent & selectedRule when date changes
 * - FIX-RC1: handleBuildLetter accepts optional item param to avoid race condition
 * - FIX-STALE: Read fresh ledgerRecords from DB instead of stale closure value
 */

import { useEffect, useState } from "react";
import { useDutyInit } from "./useDutyInit";
import { useDutyData } from "./useDutyData";
import { useCatatState } from "./useCatatState";
import { useLetterBuilder } from "./useLetterBuilder";
import { useDutyActions } from "./useDutyActions";
import type { MainView } from "../types";

type MessageType = { type: "success" | "error" | "warning"; text: string } | null;

export function useDailyDutyState() {
  // ─── UI: 3 tab utama ───
  const [mainView, setMainView] = useState<MainView>("laporkan");

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

  // ─── Sub-hooks ───
  const init = useDutyInit();

  const data = useDutyData({
    year: init.year,
    date: init.date,
  });

  const actions = useDutyActions({
    year: init.year,
    date: init.date,
    teacher: init.teacher,
    reportFinalized: data.reportFinalized,
    notify,
    refreshDutyData: data.refreshDutyData,
    reportNote: data.reportNote,
    setReportFinalized: data.setReportFinalized,
  });

  const catat = useCatatState({
    year: init.year,
    teacher: init.teacher,
    date: init.date,
    rosters: init.rosters,
    rules: init.rules,
    isSubmitting: actions.isSubmitting,
    setIsSubmitting: actions.setIsSubmitting,
    refreshDutyData: data.refreshDutyData,
    notify,
  });

  const letter = useLetterBuilder({
    school: init.school,
    teacher: init.teacher,
    ledgerRecords: data.ledgerRecords,
    notify,
  });

  return {
    // Loading
    loading: init.loading,
    initError: init.initError,
    loadError: data.loadError,
    handleRetryInit: init.handleRetryInit,
    handleRetryLoad: data.handleRetryLoad,
    // Core data
    year: init.year,
    school: init.school,
    teacher: init.teacher,
    date: init.date,
    setDate: init.setDate,
    // UI: 3 tab
    mainView,
    setMainView,
    // Data
    rules: init.rules,
    rosters: init.rosters,
    records: data.records,
    attendanceDetail: data.attendanceDetail,
    reportNote: data.reportNote,
    setReportNote: data.setReportNote,
    reportFinalized: data.reportFinalized,
    reportStatus: data.reportStatus,
    // Message
    message,
    notify,
    // P1-1: isSubmitting
    isSubmitting: actions.isSubmitting,
    // Catat tab
    catatClassFilter: catat.catatClassFilter,
    setCatatClassFilter: catat.setCatatClassFilter,
    studentQuery: catat.studentQuery,
    setStudentQuery: catat.setStudentQuery,
    ruleQuery: catat.ruleQuery,
    setRuleQuery: catat.setRuleQuery,
    selectedStudent: catat.selectedStudent,
    setSelectedStudent: catat.setSelectedStudent,
    selectedRule: catat.selectedRule,
    setSelectedRule: catat.setSelectedRule,
    catatan: catat.catatan,
    setCatatan: catat.setCatatan,
    tindakLanjut: catat.tindakLanjut,
    setTindakLanjut: catat.setTindakLanjut,
    // Batch Mode
    batchMode: catat.batchMode,
    setBatchMode: catat.setBatchMode,
    // Popular rules
    popularRules: catat.popularRules,
    handleSelectStudent: catat.handleSelectStudent,
    // Computed
    allStudents: catat.allStudents,
    filteredStudents: catat.filteredStudents,
    filteredRules: catat.filteredRules,
    ledger: data.ledger,
    filteredLedger: data.filteredLedger,
    summary: data.summary,
    // Catat handlers
    handleCatat: catat.handleCatat,
    // Notes tab handlers
    handleDeleteRecord: actions.handleDeleteRecord,
    handleFinalize: actions.handleFinalize,
    handleUnlock: actions.handleUnlock,
    handleSyncAlpa: actions.handleSyncAlpa,
    handleSaveNote: actions.handleSaveNote,
    // Ledger state
    ledgerRecords: data.ledgerRecords,
    ledgerClassFilter: data.ledgerClassFilter,
    setLedgerClassFilter: data.setLedgerClassFilter,
    ledgerStatusFilter: data.ledgerStatusFilter,
    setLedgerStatusFilter: data.setLedgerStatusFilter,
    ledgerStudentQuery: data.ledgerStudentQuery,
    setLedgerStudentQuery: data.setLedgerStudentQuery,
    ledgerDetailStudent: letter.ledgerDetailStudent,
    ledgerDetailRecords: letter.ledgerDetailRecords,
    letterPreview: letter.letterPreview,
    setLetterPreview: letter.setLetterPreview,
    // Threshold warning
    thresholdWarning: catat.thresholdWarning,
    setThresholdWarning: catat.setThresholdWarning,
    // Ledger handlers
    handleOpenLedgerDetail: letter.handleOpenLedgerDetail,
    handleCloseLedgerDetail: letter.handleCloseLedgerDetail,
    handleBuildLetter: letter.handleBuildLetter,
  };
}
