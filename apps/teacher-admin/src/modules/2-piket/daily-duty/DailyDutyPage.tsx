/**
 * PIKET-REDESIGN: Modul Guru Piket yang ramah dan mudah digunakan.
 *
 * 3 tab utama:
 *   - Laporkan  → Catat pelanggaran siswa (cepat, di lapangan)
 *   - Catatan   → Ringkasan hari ini + kehadiran + selesaikan laporan
 *   - Riwayat   → Riwayat pelanggaran siswa setahun + cetak surat
 *
 * Perubahan dari versi sebelumnya:
 *   - Bahasa lebih ramah dan tidak teknis
 *   - Layout lebih lega (space-y-5, padding besar)
 *   - 3 tab jelas tanpa sub-tab bertumpuk
 *   - Touch target lebih besar untuk mobile
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
      <div className="space-y-4">
        <div className="page-header">
          <h1 className="text-xl font-bold text-slate-900">Piket Hari Ini</h1>
        </div>
        <Card>
          <div className="text-center py-8 space-y-3">
            <div className="text-5xl">😔</div>
            <h3 className="text-base font-semibold text-slate-900">Gagal Memuat Data</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">{state.initError}</p>
            <Button onClick={state.handleRetryInit}>Coba Lagi</Button>
          </div>
        </Card>
      </div>
    );
  }

  // ─── Status badge color mapping ───
  const statusColorMap: Record<string, string> = {
    emerald: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-800",
    slate: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="space-y-5">
      {/* ─── Header (Friendly & Warm) ─── */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900 truncate">🛡️ Piket Hari Ini</h1>
          <p className="text-sm text-slate-500 truncate mt-0.5">
            {state.year ? `TP ${state.year.label}` : ""} · {state.teacher?.name ?? "-"}
          </p>
        </div>
        <span className={`shrink-0 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusColorMap[state.reportStatus.color] ?? "bg-slate-100 text-slate-600"}`}>
          {state.reportStatus.label}
        </span>
      </div>

      {/* ─── Message Banner ─── */}
      {state.message && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
          state.message.type === "success"
            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
            : state.message.type === "warning"
              ? "bg-amber-50 text-amber-800 border border-amber-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
        }`}>
          {state.message.text}
        </div>
      )}

      {/* ─── Load error → show retry ─── */}
      {state.loadError && (
        <Card>
          <div className="flex items-center justify-between gap-3 p-2">
            <div className="flex items-center gap-2">
              <span className="text-amber-600 text-lg">⚠️</span>
              <p className="text-sm text-slate-700">{state.loadError}</p>
            </div>
            <Button variant="secondary" className="text-sm" onClick={state.handleRetryLoad}>Coba Lagi</Button>
          </div>
        </Card>
      )}

      {/* ─── Date Picker ─── */}
      <Input label="📅 Tanggal Piket" id="duty-date" type="date" value={state.date} onChange={state.setDate} />

      {/* ─── Tab Bar (3 tabs, bigger touch targets) ─── */}
      <div className="flex bg-slate-100 rounded-xl p-1.5 gap-1.5">
        {mainTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => state.setMainView(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
              state.mainView === tab.key
                ? "bg-white text-brand-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <span className="text-base">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ─── TAB 1: Laporkan Pelanggaran ─── */}
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

      {/* ─── TAB 2: Catatan Hari Ini ─── */}
      {state.mainView === "catatan" && (
        <div className="space-y-5">
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

      {/* ─── TAB 3: Riwayat Pelanggaran Siswa ─── */}
      {state.mainView === "riwayat" && (
        <BukuKedisiplinanBKTab
          records={state.records}
          ledger={state.ledger}
          rosters={state.rosters}
          handleBuildLetter={state.handleBuildLetter}
          handleOpenLedgerDetail={state.handleOpenLedgerDetail}
        />
      )}

      {/* ─── Threshold Warning Modal ─── */}
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

      {/* ─── Letter Preview ─── */}
      {state.letterPreview && (
        <LetterPreview
          letter={state.letterPreview}
          onClose={state.handleCloseLedgerDetail}
        />
      )}

      {/* ─── Ledger Detail Sheet ─── */}
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
