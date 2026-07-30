/**
 * PIKET-HARIAN-V2: Opsi B (Segmented Switcher)
 * Mobile-first. Dua mode utama:
 *   - Catat Pelanggaran (lapangan, express)
 *   - Rekap & Laporan (meja, administrasi)
 *
 * Bug fixes baked in:
 *   - P0-1/P0-2: Error state + retry button
 *   - P1-1: isSubmitting guard
 *   - P1-2: auto-reset selection on date change
 *   - P1-4: responsive grid (in PointLedgerTab)
 */

import { Card, Input, Button } from "@shared/ui";
import { LoadingState } from "@shared/ui";
import { useDailyDutyState } from "./useDailyDutyState";
import type { RekapSubTab } from "./types";
import { CatatPelanggaranView } from "./CatatPelanggaranView";
import { AttendanceRecapCard } from "./AttendanceRecapCard";
import { DutyNotesTab } from "./DutyNotesTab";
import { PointLedgerTab } from "./PointLedgerTab";
import { PrintDutyReport } from "./PrintDutyReport";

const rekapSubTabs: Array<{ key: RekapSubTab; label: string; icon: string }> = [
  { key: "presensi", label: "Rekap Presensi", icon: "🏫" },
  { key: "catatan", label: "Daftar Catatan", icon: "📝" },
  { key: "poin", label: "Ledger Poin", icon: "🏆" },
  { key: "cetak", label: "Cetak & Surat", icon: "🖨️" },
];

export function DailyDutyPage() {
  const state = useDailyDutyState();

  // ─── P0-1: Init error → show retry ───
  if (state.loading) return <LoadingState />;
  if (state.initError) {
    return (
      <div className="space-y-4">
        <div className="page-header">
          <h1 className="text-2xl font-bold text-slate-900">Piket Harian</h1>
        </div>
        <Card>
          <div className="text-center py-8 space-y-4">
            <div className="text-4xl">⚠️</div>
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
    <div className="space-y-4">
      {/* ─── Header ─── */}
      <div className="page-header">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">📋 Piket Harian</h1>
            <p className="text-sm text-slate-500 mt-1">
              {state.year ? `TP ${state.year.label}` : ""} · Guru Piket: {state.teacher?.name ?? "-"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusColorMap[state.reportStatus.color] ?? "bg-slate-100 text-slate-600"}`}>
              {state.reportStatus.label}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Message Banner ─── */}
      {state.message && (
        <div className={`info-banner-${state.message.type === "success" ? "success" : state.message.type === "warning" ? "warning" : "error"}`}>
          {state.message.text}
        </div>
      )}

      {/* ─── P0-2: Load error → show retry ─── */}
      {state.loadError && (
        <Card>
          <div className="flex items-center justify-between gap-3 p-1">
            <div className="flex items-center gap-2">
              <span className="text-amber-600 text-lg">⚠️</span>
              <p className="text-sm text-slate-700">{state.loadError}</p>
            </div>
            <Button variant="secondary" className="text-xs" onClick={state.handleRetryLoad}>Coba Lagi</Button>
          </div>
        </Card>
      )}

      {/* ─── Date Picker ─── */}
      <Card>
        <Input label="📅 Tanggal" id="duty-date" type="date" value={state.date} onChange={state.setDate} />
      </Card>

      {/* ─── Segmented Switcher ─── */}
      <Card className="p-2">
        <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
          <button
            type="button"
            onClick={() => state.setMainView("catat")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
              state.mainView === "catat"
                ? "bg-white text-brand-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span className="text-base">⚡</span>
            <span>1. CATAT PELANGGARAN</span>
          </button>
          <button
            type="button"
            onClick={() => state.setMainView("rekap")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
              state.mainView === "rekap"
                ? "bg-white text-brand-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span className="text-base">📊</span>
            <span>2. REKAP & LAPORAN</span>
          </button>
        </div>
      </Card>

      {/* ─── VIEW 1: Mode Catat Pelanggaran ─── */}
      {state.mainView === "catat" && (
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

      {/* ─── VIEW 2: Mode Rekap & Laporan ─── */}
      {state.mainView === "rekap" && (
        <>
          {/* Sub-tab bar */}
          <Card className="p-2">
            <div className="flex gap-1 overflow-x-auto">
              {rekapSubTabs.map((st) => (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => state.setRekapSubTab(st.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                    state.rekapSubTab === st.key
                      ? "bg-brand-50 text-brand-700"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>{st.icon}</span>
                  <span>{st.label}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Sub-tab content */}
          {state.rekapSubTab === "presensi" && (
            <AttendanceRecapCard attendanceDetail={state.attendanceDetail} />
          )}

          {state.rekapSubTab === "catatan" && (
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
          )}

          {state.rekapSubTab === "poin" && (
            <PointLedgerTab
              ledger={state.ledger}
              ledgerRecords={state.ledgerRecords}
              ledgerClassFilter={state.ledgerClassFilter}
              setLedgerClassFilter={state.setLedgerClassFilter}
              ledgerStatusFilter={state.ledgerStatusFilter}
              setLedgerStatusFilter={state.setLedgerStatusFilter}
              ledgerStudentQuery={state.ledgerStudentQuery}
              setLedgerStudentQuery={state.setLedgerStudentQuery}
              filteredLedger={state.filteredLedger}
              ledgerDetailStudent={state.ledgerDetailStudent}
              ledgerDetailRecords={state.ledgerDetailRecords}
              letterPreview={state.letterPreview}
              setLetterPreview={state.setLetterPreview}
              rosters={state.rosters}
              yearLabel={state.year?.label ?? ""}
              handleOpenLedgerDetail={state.handleOpenLedgerDetail}
              handleCloseLedgerDetail={state.handleCloseLedgerDetail}
              handleBuildLetter={state.handleBuildLetter}
            />
          )}

          {state.rekapSubTab === "cetak" && (
            <PrintDutyReport
              date={state.date}
              yearLabel={state.year?.label ?? ""}
              teacherName={state.teacher?.name ?? "-"}
              records={state.records}
              attendanceDetail={state.attendanceDetail}
              reportNote={state.reportNote}
              ledger={state.ledger}
            />
          )}
        </>
      )}
    </div>
  );
}
