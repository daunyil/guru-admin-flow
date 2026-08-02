/**
 * KbmHubPage — Unified KBM: Dashboard + Editor dalam 1 halaman.
 *
 * RESPONSIVE DESIGN:
 *   Mobile  (<768px): Single column, gradient header, bottom bar,
 *            compact cards, thumb-friendly 44px targets,
 *            numeric keypad for nilai, quick student filter
 *   Desktop (≥768px): Wider layout, side-by-side where possible,
 *            larger typography, no bottom bar (save button inline)
 *
 * FLOW SIMPLIFIED:
 *   - No lock/finalize/unlock — everything stays editable
 *   - After Presensi done → auto-open Jurnal, Presensi hidden
 *   - Small "Edit Presensi" link to reopen if needed
 *   - Save button saves everything (attendance + journal + nilai)
 *
 * MOBILE HP OPTIMIZED:
 *   - pb-28 bottom clearance (bebas tertimbun sticky bar)
 *   - inputMode="numeric" + auto-select on nilai inputs (numpad)
 *   - Quick filter: Semua / Tidak Hadir (1-tap verify absent)
 *   - Min 44px touch targets (thumb-zone friendly)
 *   - Defensive date parsing + aria-label on selects
 *
 * DOMAIN-BOUNDARY: Presentation component only. No DB calls directly.
 */

import { useEffect } from "react";
import { useKbmHub } from "./useKbmHub";
import { LoadingState, EmptyState, Toast, useToast } from "@shared/ui";
import { useDirtyGuard } from "@shared/hooks/useDirtyGuard";
import { MobileHeader } from "./components/MobileHeader";
import { DesktopHeader } from "./components/DesktopHeader";
import { DashboardView } from "./components/DashboardView";
import { EditorView } from "./components/EditorView";
import { StickySaveBar } from "./components/StickySaveBar";

/* ============================================================ */
/*  Component                                                    */
/* ============================================================ */

export function KbmHubPage() {
  const kbm = useKbmHub();
  const toast = useToast();

  /* ---- Bridge: notice → toast ---- */
  useEffect(() => {
    if (!kbm.notice) return;
    const isSuccess = kbm.notice.toLowerCase().includes("berhasil");
    toast.show(kbm.notice, { variant: isSuccess ? "success" : "error", duration: 4000 });
    kbm.setNotice(null);
  }, [kbm.notice, kbm.setNotice, toast]);

  /* ---- 1a: Unsaved changes guard — B4-01: use shared hook ---- */
  useDirtyGuard(kbm.isDirty, { message: "Data KBM belum disimpan. Yakin ingin keluar?" });

  /* ---- Render ---- */
  if (kbm.loading) return <LoadingState />;
  if (!kbm.year) return <EmptyState title="Belum ada tahun pelajaran aktif" />;

  // Cascading selector props (shared between mobile & desktop headers)
  const selectorProps = {
    selectedClassId: kbm.selectedClassId,
    selectedSubject: kbm.selectedSubject,
    selectedSessionId: kbm.selectedSessionId,
    classOptions: kbm.classOptions,
    subjectOptions: kbm.subjectOptions,
    filteredSessions: kbm.filteredSessions,
    setSelectedClassId: kbm.setSelectedClassId,
    setSelectedSubject: kbm.setSelectedSubject,
    setSelectedSessionId: kbm.setSelectedSessionId,
    handlePertemuanTambahan: kbm.handlePertemuanTambahan,
    isDirty: kbm.isDirty,
  };

  return (
    <div className="max-w-4xl mx-auto md:max-w-6xl pb-28 md:pb-6">
      {/* ========== HEADER — RESPONSIVE ========== */}
      <header className="md:hidden bg-gradient-to-br from-emerald-700 via-teal-700 to-teal-800 text-white p-4 rounded-2xl shadow-lg mb-3">
        <MobileHeader
          todayDate={kbm.todayDate}
          {...selectorProps}
        />
      </header>

      <header className="hidden md:block bg-white border border-slate-200 rounded-xl shadow-sm mb-4 p-5">
        <DesktopHeader
          todayDate={kbm.todayDate}
          {...selectorProps}
        />
      </header>

      {/* Toast notification */}
      {toast.toast && (
        <Toast toast={toast.toast} onDismiss={toast.dismiss} />
      )}

      {/* No assignments */}
      {kbm.classOptions.length === 0 && !kbm.loading && (
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5 text-center shadow-sm">
          <p className="text-base font-bold text-amber-800 mb-1">Belum Ada Kelas Mengajar</p>
          <p className="text-xs text-amber-600 mb-3">
            Tambahkan kelas dan mata pelajaran terlebih dahulu.
          </p>
          <button
            onClick={() => window.location.hash = "#/assignments"}
            className="bg-amber-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl active:scale-[0.98] transition-transform min-h-[44px]"
          >
            Ke Penugasan Mengajar
          </button>
        </div>
      )}

      {/* Has sessions but no session selected → show dashboard */}
      {kbm.selectedSubject && kbm.hasNoSessions && !kbm.selectedSession && (
        <div className="bg-blue-50 rounded-2xl border border-blue-200 p-5 text-center shadow-sm">
          <div className="text-3xl mb-2">📝</div>
          <p className="text-sm font-bold text-blue-800 mb-1">Belum Ada Sesi untuk Kelas & Mapel Ini</p>
          <p className="text-xs text-blue-600 mb-4">
            Anda bisa langsung membuat sesi baru tanpa jadwal.
          </p>
          <button
            onClick={kbm.handlePertemuanTambahan}
            className="w-full md:w-auto bg-blue-600 text-white text-sm font-bold py-3 px-6 rounded-xl active:scale-[0.98] transition-transform shadow-sm flex items-center justify-center gap-2 mx-auto min-h-[44px]"
          >
            <span className="text-base">🚀</span>
            MULAI KBM SESI INI
          </button>
        </div>
      )}

      {/* ========== DASHBOARD: Day Progress + Session Cards ========== */}
      {!kbm.isReadyToStart && kbm.daySummary.total > 0 && (
        <DashboardView
          dashboardClassGroups={kbm.dashboardClassGroups}
          daySummary={kbm.daySummary}
          progressPercent={kbm.progressPercent}
          selectDashboardSession={kbm.selectDashboardSession}
        />
      )}

      {/* 5c: Dashboard empty state — has assignments but no sessions today */}
      {!kbm.isReadyToStart && kbm.daySummary.total === 0 && kbm.classOptions.length > 0 && (
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 text-center shadow-sm">
          <div className="text-4xl mb-3">📅</div>
          <p className="text-sm font-bold text-slate-800 mb-1">Tidak Ada Jadwal Hari Ini</p>
          <p className="text-xs text-slate-500 mb-4">
            Pilih kelas & mapel di atas, lalu buat sesi KBM baru.
          </p>
          <p className="text-[10px] text-slate-400">
            💡 Tip: Gunakan tombol "Pertemuan Tambahan" untuk mengajar di luar jadwal
          </p>
        </div>
      )}

      {/* ========== EDITOR: Session Selected ========== */}
      {kbm.isReadyToStart && kbm.selectedSession && (
        <EditorView
          selectedSession={kbm.selectedSession}
          selectedSessionId={kbm.selectedSessionId}
          filteredSessions={kbm.filteredSessions}
          backToDashboard={kbm.backToDashboard}
          isDirty={kbm.isDirty}
          presensiStep={kbm.presensiStep}
          jurnalStep={kbm.jurnalStep}
          nilaiStep={kbm.nilaiStep}
          reopenPresensi={kbm.reopenPresensi}
          effectiveRecords={kbm.effectiveRecords}
          changes={kbm.changes}
          summary={kbm.summary}
          noteMap={kbm.noteMap}
          setStatus={kbm.setStatus}
          setAllPresent={kbm.setAllPresent}
          setStudentNote={kbm.setStudentNote}
          donePresensi={kbm.donePresensi}
          undoLastStatus={kbm.undoLastStatus}
          absentList={kbm.absentList}
          journal={kbm.journal}
          journalInput={kbm.journalInput}
          setJournalInput={kbm.setJournalInput}
          realizationStatus={kbm.realizationStatus}
          setRealizationStatus={kbm.setRealizationStatus}
          realizationReason={kbm.realizationReason}
          setRealizationReason={kbm.setRealizationReason}
          structuredNote={kbm.structuredNote}
          toggleStructuredChip={kbm.toggleStructuredChip}
          activeCategoryTab={kbm.activeCategoryTab}
          setActiveCategoryTab={kbm.setActiveCategoryTab}
          autoNarasi={kbm.autoNarasi}
          handleCopyPreviousJournal={kbm.handleCopyPreviousJournal}
          nilaiToggle={kbm.nilaiToggle}
          setNilaiToggle={kbm.setNilaiToggle}
          nilaiType={kbm.nilaiType}
          setNilaiType={kbm.setNilaiType}
          nilaiMap={kbm.nilaiMap}
          setNilai={kbm.setNilai}
          saving={kbm.saving}
          justSaved={kbm.justSaved}
          saveAll={kbm.saveAll}
        />
      )}

      {/* ========== STICKY BOTTOM: SIMPAN (MOBILE ONLY) ========== */}
      {kbm.isReadyToStart && kbm.selectedSession && (
        <StickySaveBar
          saveAll={kbm.saveAll}
          saving={kbm.saving}
          justSaved={kbm.justSaved}
        />
      )}
    </div>
  );
}
