/**
 * PIKET-REDESIGN-V2: Modul Guru Piket — se-rapi KBM.
 *
 * Changes from V1:
 *   - Gradient header (indigo/blue) matching KBM's emerald gradient
 *   - max-w-4xl / md:max-w-6xl centered layout
 *   - Desktop responsive (md: breakpoints)
 *   - Consistent card styling: rounded-2xl border border-slate-200 shadow-sm
 *   - Professional tab bar with cleaner design
 *   - 44px touch targets everywhere
 *   - Less emoji, more professional
 *   - Date picker integrated into header
 *   - Status badge in header
 */

import { Card, Input, Button } from "@shared/ui";
import { LoadingState } from "@shared/ui";
import { useDailyDutyState } from "./useDailyDutyState";
import { CatatPelanggaranView } from "./CatatPelanggaranView";
import { DutyNotesTab } from "./DutyNotesTab";
import { AttendanceRecapCard } from "./AttendanceRecapCard";
import { BukuKedisiplinanBKTab } from "./BukuKedisiplinanBKTab";
import { PrintDutyReport } from "./PrintDutyReport";
import { ThresholdWarningModal } from "./ThresholdWarningModal";
import { LetterPreview } from "./LetterPreview";
import { LedgerDetailSheet } from "./LedgerDetailSheet";
import type { MainView } from "./types";

const mainTabs: Array<{ key: MainView; label: string; icon: string }> = [
  { key: "laporkan", label: "Laporkan", icon: "⚡" },
  { key: "catatan", label: "Catatan", icon: "📝" },
  { key: "riwayat", label: "Riwayat", icon: "📊" },
];

export function DailyDutyPage() {
  const state = useDailyDutyState();

  // ─── Loading state ───
  if (state.loading) return <LoadingState />;

  // ─── Init error → show retry ───
  if (state.initError) {
    return (
      <div className="max-w-4xl mx-auto md:max-w-6xl space-y-4">
        <div className="bg-gradient-to-br from-indigo-700 via-blue-700 to-blue-800 text-white p-4 rounded-2xl shadow-lg">
          <h1 className="text-xl font-bold">Piket Hari Ini</h1>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="text-center py-8 space-y-3">
            <div className="text-4xl mb-2">😔</div>
            <h3 className="text-base font-bold text-slate-900">Gagal Memuat Data</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">{state.initError}</p>
            <Button onClick={state.handleRetryInit}>Coba Lagi</Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Status badge color mapping ───
  const statusColorMap: Record<string, string> = {
    emerald: "bg-white/15 backdrop-blur-sm text-white border border-white/20",
    amber: "bg-amber-100 text-amber-800",
    slate: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="max-w-4xl mx-auto md:max-w-6xl pb-28 md:pb-6">
      {/* ========== HEADER — MOBILE (Gradient) ========== */}
      <header className="md:hidden bg-gradient-to-br from-indigo-700 via-blue-700 to-blue-800 text-white p-4 rounded-2xl shadow-lg mb-3">
        <div className="flex justify-between items-center mb-3">
          <span className="bg-white/15 backdrop-blur-sm text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-white/20">
            PIKET
          </span>
          <span className="text-[11px] text-blue-200 font-medium">
            {state.year ? `TP ${state.year.label}` : ""}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-white truncate">Piket Hari Ini</h1>
            <p className="text-[11px] text-blue-200 truncate mt-0.5">
              {state.teacher?.name ?? "-"}
            </p>
          </div>
          <span className={`shrink-0 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${statusColorMap[state.reportStatus.color] ?? "bg-white/15 text-white"}`}>
            {state.reportStatus.label}
          </span>
        </div>
        {/* Date picker inside header */}
        <div className="mt-3">
          <input
            id="duty-date-mobile"
            type="date"
            value={state.date}
            onChange={(e) => state.setDate(e.target.value)}
            className="w-full bg-white/15 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/30 min-h-[44px]"
          />
        </div>
      </header>

      {/* ========== HEADER — DESKTOP (Clean white card) ========== */}
      <header className="hidden md:block bg-white border border-slate-200 rounded-xl shadow-sm mb-4 p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700">
                Piket
              </span>
              <h1 className="text-lg font-bold text-slate-900">Piket Hari Ini</h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {state.year ? `TP ${state.year.label}` : ""} · {state.teacher?.name ?? "-"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              id="duty-date-desktop"
              type="date"
              value={state.date}
              onChange={(e) => state.setDate(e.target.value)}
              className="input text-sm"
            />
            <span className={`shrink-0 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
              state.reportStatus.color === "emerald"
                ? "bg-emerald-100 text-emerald-700"
                : state.reportStatus.color === "amber"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-slate-100 text-slate-600"
            }`}>
              {state.reportStatus.label}
            </span>
          </div>
        </div>
      </header>

      {/* ========== MESSAGE BANNER ========== */}
      {state.message && (
        <div className={`mb-3 md:mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
          state.message.type === "success"
            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
            : state.message.type === "warning"
              ? "bg-amber-50 text-amber-800 border border-amber-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
        }`}>
          {state.message.text}
        </div>
      )}

      {/* ========== LOAD ERROR ========== */}
      {state.loadError && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 mb-3 md:mb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-amber-600 text-lg">⚠️</span>
              <p className="text-sm text-slate-700">{state.loadError}</p>
            </div>
            <Button variant="secondary" className="text-sm" onClick={state.handleRetryLoad}>Coba Lagi</Button>
          </div>
        </div>
      )}

      {/* ========== TAB BAR ========== */}
      <div className="flex bg-slate-100 rounded-xl p-1.5 gap-1.5 mb-3 md:mb-4">
        {mainTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => state.setMainView(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-sm font-bold transition-all duration-200 min-h-[44px] ${
              state.mainView === tab.key
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <span className="text-base">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ========== TAB 1: Laporkan Pelanggaran ========== */}
      {state.mainView === "laporkan" && (
        <CatatPelanggaranView
          catatClassFilter={state.catatClassFilter}
          setCatatClassFilter={state.setCatatClassFilter}
          studentQuery={state.studentQuery}
          setStudentQuery={state.setStudentQuery}
          ruleQuery={state.ruleQuery}
          setRuleQuery={state.setRuleQuery}
          selectedStudent={state.selectedStudent}
          handleSelectStudent={state.handleSelectStudent}
          selectedRule={state.selectedRule}
          setSelectedRule={state.setSelectedRule}
          catatan={state.catatan}
          setCatatan={state.setCatatan}
          tindakLanjut={state.tindakLanjut}
          setTindakLanjut={state.setTindakLanjut}
          reportFinalized={state.reportFinalized}
          rosters={state.rosters}
          filteredStudents={state.filteredStudents}
          filteredRules={state.filteredRules}
          handleCatat={state.handleCatat}
          isSubmitting={state.isSubmitting}
          batchMode={state.batchMode}
          setBatchMode={state.setBatchMode}
          popularRules={state.popularRules}
        />
      )}

      {/* ========== TAB 2: Catatan Hari Ini ========== */}
      {state.mainView === "catatan" && (
        <div className="space-y-3 md:space-y-4">
          <AttendanceRecapCard attendanceDetail={state.attendanceDetail} />
          <DutyNotesTab
            records={state.records}
            reportFinalized={state.reportFinalized}
            reportNote={state.reportNote}
            setReportNote={state.setReportNote}
            summary={state.summary}
            handleDeleteRecord={state.handleDeleteRecord}
            handleSaveNote={state.handleSaveNote}
            handleSyncAlpa={state.handleSyncAlpa}
            handleFinalize={state.handleFinalize}
            handleUnlock={state.handleUnlock}
            isSubmitting={state.isSubmitting}
          />
          <PrintDutyReport
            date={state.date}
            yearLabel={state.year?.label ?? ""}
            teacherName={state.teacher?.name ?? "-"}
            records={state.records}
            attendanceDetail={state.attendanceDetail}
            reportNote={state.reportNote}
            ledger={state.ledger}
          />
        </div>
      )}

      {/* ========== TAB 3: Riwayat Pelanggaran Siswa ========== */}
      {state.mainView === "riwayat" && (
        <BukuKedisiplinanBKTab
          records={state.records}
          ledger={state.ledger}
          rosters={state.rosters}
          handleBuildLetter={state.handleBuildLetter}
          handleOpenLedgerDetail={state.handleOpenLedgerDetail}
        />
      )}

      {/* ========== Threshold Warning Modal ========== */}
      {state.thresholdWarning && (
        <ThresholdWarningModal
          warning={state.thresholdWarning}
          onPrintSP={() => {
            const tw = state.thresholdWarning!;
            const item = state.ledger.find(
              (l) => l.studentId === tw.studentId && l.classId === tw.classId
            );
            if (item) {
              const letterType: "parent_summons" | "student_statement" =
                tw.thresholdLevel === "sp3" ? "student_statement" : "parent_summons";
              state.handleBuildLetter(letterType, item);
            }
            state.setThresholdWarning(null);
          }}
          onDismiss={() => state.setThresholdWarning(null)}
        />
      )}

      {/* ========== Letter Preview ========== */}
      {state.letterPreview && (
        <LetterPreview
          letter={state.letterPreview}
          onClose={state.handleCloseLedgerDetail}
        />
      )}

      {/* ========== Ledger Detail Sheet ========== */}
      {state.ledgerDetailStudent && !state.letterPreview && (
        <LedgerDetailSheet
          student={state.ledgerDetailStudent}
          records={state.ledgerDetailRecords}
          onClose={state.handleCloseLedgerDetail}
          onBuildLetter={state.handleBuildLetter}
        />
      )}
    </div>
  );
}
