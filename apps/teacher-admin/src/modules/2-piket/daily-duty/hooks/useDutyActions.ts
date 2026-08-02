/**
 * Sub-hook: Duty actions — finalize, unlock, delete, sync alpa, save note.
 * Owns the isSubmitting guard state.
 *
 * P1-1: isSubmitting guard on async handlers
 */

import { useState } from "react";
import {
  deleteDutyRecord,
  getDutyReportByDate,
  finalizeDutyReport,
  unlockDutyReport,
  syncAlpaFromAttendance,
  findOrCreateDutyReport,
  updateDutyReportNote,
} from "@shared/db/daily-duty-repo";
import type { AcademicYear, TeacherProfile } from "@guru-admin/domain";

type NotifyFn = (type: "success" | "error" | "warning", text: string) => void;

interface UseDutyActionsParams {
  year: AcademicYear | null;
  date: string;
  teacher: TeacherProfile | undefined;
  reportFinalized: boolean;
  notify: NotifyFn;
  refreshDutyData: () => Promise<void>;
  reportNote: string;
  setReportFinalized: (v: boolean) => void;
}

export function useDutyActions({
  year,
  date,
  teacher,
  reportFinalized,
  notify,
  refreshDutyData,
  reportNote,
  setReportFinalized,
}: UseDutyActionsParams) {
  // ─── P1-1: isSubmitting guard ───
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  return {
    isSubmitting,
    setIsSubmitting,
    handleDeleteRecord,
    handleFinalize,
    handleUnlock,
    handleSyncAlpa,
    handleSaveNote,
  } as const;
}
