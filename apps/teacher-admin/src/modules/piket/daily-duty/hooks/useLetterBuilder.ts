/**
 * Sub-hook: Letter builder — manages ledger detail view and letter generation.
 *
 * FIX-RC1: handleBuildLetter accepts optional item param to avoid race condition
 */

import { useState } from "react";
import { todayISODate } from "@guru-admin/shared";
import { filterDutyRecordsByStudent } from "@guru-admin/domain";
import { buildPiketLetter, type PiketLetterDocument, type PiketLetterType } from "../piket-letter";
import type { DutyRecord, SchoolProfile, StudentDutyLedgerItem, TeacherProfile } from "@guru-admin/domain";

type NotifyFn = (type: "success" | "error" | "warning", text: string) => void;

interface UseLetterBuilderParams {
  school: SchoolProfile | undefined;
  teacher: TeacherProfile | undefined;
  ledgerRecords: DutyRecord[];
  notify: NotifyFn;
}

export function useLetterBuilder({
  school,
  teacher,
  ledgerRecords,
  notify,
}: UseLetterBuilderParams) {
  const [ledgerDetailStudent, setLedgerDetailStudent] = useState<StudentDutyLedgerItem | null>(null);
  const [ledgerDetailRecords, setLedgerDetailRecords] = useState<DutyRecord[]>([]);
  const [letterPreview, setLetterPreview] = useState<PiketLetterDocument | null>(null);

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

  /**
   * Build letter — if `item` is provided, use it directly (avoids race condition
   * when called right after handleOpenLedgerDetail). Otherwise, fall back to
   * the current `ledgerDetailStudent` state.
   */
  function handleBuildLetter(letterType: PiketLetterType, item?: StudentDutyLedgerItem) {
    const student = item ?? ledgerDetailStudent;
    const records = item
      ? filterDutyRecordsByStudent(ledgerRecords, item.studentId, item.classId)
      : ledgerDetailRecords;
    if (!student || records.length === 0) {
      notify("warning", "Data siswa atau riwayat belum tersedia.");
      return;
    }
    if (!school?.name) {
      notify("error", "Lengkapi profil sekolah terlebih dahulu.");
      return;
    }
    if (student.totalPoints < 25) {
      notify("warning", `Siswa ini berstatus "Aman" (${student.totalPoints} poin). Surat biasanya untuk siswa dengan poin >= 25.`);
    }
    const letter = buildPiketLetter({
      letterType,
      schoolName: school.name,
      schoolAddress: school.address,
      principalName: school.headmasterName,
      principalNip: school.headmasterNip,
      date: todayISODate(),
      place: school.regency || school.district || "",
      studentName: student.studentName,
      studentNumber: student.studentNumber,
      classLabel: student.classLabel,
      totalPoints: student.totalPoints,
      totalRecords: student.totalRecords,
      statusLabel: student.statusLabel,
      records,
      dutyTeacherName: teacher?.name ?? "-",
    });
    setLetterPreview(letter);
    // Also set the detail view so user can see the letter preview in context
    if (item) {
      setLedgerDetailStudent(item);
      setLedgerDetailRecords(records);
    }
  }

  return {
    ledgerDetailStudent,
    ledgerDetailRecords,
    letterPreview,
    setLetterPreview,
    handleOpenLedgerDetail,
    handleCloseLedgerDetail,
    handleBuildLetter,
  } as const;
}
