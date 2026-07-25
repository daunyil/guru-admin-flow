/**
 * PIKET-HARIAN-MOBILE-01: Halaman Piket Harian.
 * Mobile-first. Terisolasi dari app utama — tidak menulis ke attendanceRecords.
 */

import { Card, Input, Button } from "@shared/ui";
import { LoadingState } from "@shared/ui";
import { formatLongDateID } from "@guru-admin/shared";
import { useDailyDutyState } from "./useDailyDutyState";
import type { Tab } from "./types";
import { CatatTab } from "./CatatTab";
import { DutyNotesTab } from "./DutyNotesTab";
import { AttendanceRecapCard } from "./AttendanceRecapCard";
import { PointLedgerTab } from "./PointLedgerTab";
import { PrintDutyReport } from "./PrintDutyReport";

const tabs: Array<{ key: Tab; label: string }> = [
  { key: "catat", label: "Catat" },
  { key: "rekap", label: "Rekap" },
  { key: "catatan", label: "Catatan" },
  { key: "poin", label: "Rekap Poin" },
  { key: "cetak", label: "Cetak" },
];

export function DailyDutyPage() {
  const state = useDailyDutyState();

  if (state.loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="page-header">
        <h1 className="text-2xl font-bold text-slate-900">Piket Harian</h1>
        <p className="text-sm text-slate-500 mt-1">
          {state.year ? `TP ${state.year.label}` : ""} · {formatLongDateID(state.date)} · Guru Piket: {state.teacher?.name ?? "-"}
        </p>
      </div>

      {state.message && (
        <div className={`info-banner-${state.message.type === "success" ? "success" : state.message.type === "warning" ? "warning" : "error"}`}>
          {state.message.text}
        </div>
      )}
      <Card><Input label="Tanggal" id="duty-date" type="date" value={state.date} onChange={state.setDate} /></Card>

      <Card>
        <div className="flex gap-2 flex-wrap">
          {tabs.map((t) => <Button key={t.key} variant={state.tab === t.key ? "primary" : "secondary"} className="text-xs" onClick={() => state.setTab(t.key)}>{t.label}</Button>)}
        </div>
      </Card>

      {state.tab === "catat" && (
        <CatatTab
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
        />
      )}

      {state.tab === "rekap" && <AttendanceRecapCard attendanceDetail={state.attendanceDetail} />}

      {state.tab === "catatan" && (
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
        />
      )}

      {state.tab === "poin" && (
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

      {state.tab === "cetak" && <PrintDutyReport date={state.date} yearLabel={state.year?.label ?? ""} teacherName={state.teacher?.name ?? "-"} records={state.records} attendanceDetail={state.attendanceDetail} reportNote={state.reportNote} ledger={state.ledger} />}
    </div>
  );
}
