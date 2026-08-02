/**
 * Sub-hook: Data layer — loads duty records, attendance detail, report state,
 * and ledger records. Provides computed values (ledger, filteredLedger, summary,
 * reportStatus) and filter state.
 *
 * P0-1/P0-2: try/catch/finally + error state + retry button
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getDutyReportByDate,
  listDutyRecordsByDate,
  listDutyRecordsByAcademicYear,
  getAttendanceDetailForDate,
} from "@shared/db/daily-duty-repo";
import {
  buildStudentDutyLedger,
  searchStudents,
  summarizeDutyRecords,
} from "@guru-admin/domain";
import type {
  AcademicYear,
  ClassAttendanceDetail,
  DutyRecord,
  StudentDutyLedgerItem,
} from "@guru-admin/domain";

interface UseDutyDataParams {
  year: AcademicYear | null;
  date: string;
}

export function useDutyData({ year, date }: UseDutyDataParams) {
  // ─── Data state ───
  const [records, setRecords] = useState<DutyRecord[]>([]);
  const [attendanceDetail, setAttendanceDetail] = useState<ClassAttendanceDetail[]>([]);
  const [reportNote, setReportNote] = useState("");
  const [reportFinalized, setReportFinalized] = useState(false);

  // ─── P0-1/P0-2: load error state ───
  const [loadError, setLoadError] = useState<string | null>(null);

  // ─── Ledger state ───
  const [ledgerRecords, setLedgerRecords] = useState<DutyRecord[]>([]);
  const [ledgerClassFilter, setLedgerClassFilter] = useState<string>("all");
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState<string>("all");
  const [ledgerStudentQuery, setLedgerStudentQuery] = useState("");

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

  // ─── Effects ───
  useEffect(() => {
    if (year) void loadData();
  }, [date, year]);

  useEffect(() => {
    if (year) void loadLedgerData();
  }, [year]);

  // ─── Computed values ───
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

  /** P0-1/P0-2: retry handler */
  const handleRetryLoad = useCallback(() => { void loadData(); }, [date, year]);

  return {
    records,
    attendanceDetail,
    reportNote,
    setReportNote,
    reportFinalized,
    setReportFinalized,
    loadError,
    loadData,
    loadLedgerData,
    refreshDutyData,
    handleRetryLoad,
    ledgerRecords,
    ledgerClassFilter,
    setLedgerClassFilter,
    ledgerStatusFilter,
    setLedgerStatusFilter,
    ledgerStudentQuery,
    setLedgerStudentQuery,
    ledger,
    filteredLedger,
    summary,
    reportStatus,
  } as const;
}
