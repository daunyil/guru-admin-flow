/**
 * Perangkat Evaluasi — halaman /evaluation-docs
 *
 * AI-PROMPT-BRIDGE-RC1: bridge untuk perangkat evaluasi via prompt AI.
 * Flow: App data → Generate Prompt → guru copy ke Claude → paste JSON → validasi → preview → cetak.
 *
 * 5 modul:
 *   1. Rincian Minggu Efektif
 *   2. Analisis KKTP
 *   3. Kisi-kisi Soal (Blueprint)
 *   4. Kartu Soal (Question Card)
 *   5. Kisi-Kisi Penulisan Soal (Assessment Grid)
 */

import { LoadingState } from "@shared/ui";
import { useEvaluationDocsState } from "./useEvaluationDocsState";
import { AssignmentSelector } from "./AssignmentSelector";
import { TabSelector } from "./TabSelector";
import { EffectiveWeeksTab } from "./EffectiveWeeksTab";
import { KktpAnalysisTab } from "./KktpAnalysisTab";
import { KisiKisiTab } from "./KisiKisiTab";
import { KartuSoalTab } from "./KartuSoalTab";
import { AssessmentGridTab } from "./AssessmentGridTab";

export function EvaluationDocsPage() {
  const state = useEvaluationDocsState();

  if (state.loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="page-header">
        <h1 className="text-2xl font-bold text-slate-900">Perangkat Evaluasi</h1>
        <p className="text-sm text-slate-500 mt-1">
          {state.year ? `TP ${state.year.label}` : "Belum ada tahun aktif"} · Kisi-kisi, Kartu Soal, Minggu Efektif via AI Prompt Bridge.
        </p>
      </div>

      {state.message && (
        <div className={`info-banner-${state.message.type === "success" ? "success" : "error"}`}>
          {state.message.text}
        </div>
      )}

      {/* Pilih Kelas dan Mapel */}
      <AssignmentSelector
        assignments={state.assignments}
        selectedAssignmentId={state.selectedAssignmentId}
        setSelectedAssignmentId={state.setSelectedAssignmentId}
        assignment={state.assignment}
        year={state.year}
      />

      {state.assignment && (
        <>
          {/* Tab selector */}
          <TabSelector
            tab={state.tab}
            setTab={state.setTab}
            setShowDocument={state.setShowDocument}
            blueprintResult={state.blueprintResult}
          />

          {/* TAB: Minggu Efektif */}
          {state.tab === "minggu-efektif" && (
            <EffectiveWeeksTab
              jpPerWeek={state.jpPerWeek}
              setJpPerWeek={state.setJpPerWeek}
              handleGenerateWeeks={state.handleGenerateWeeks}
              effectiveWeeks={state.effectiveWeeks}
              effectiveWeeksTotal={state.effectiveWeeksTotal}
              effectiveJPTotal={state.effectiveJPTotal}
              showDocument={state.showDocument}
              setShowDocument={state.setShowDocument}
              school={state.school}
              year={state.year}
              assignment={state.assignment}
            />
          )}

          {/* TAB: KKTP Analisis */}
          {state.tab === "kktp-analisis" && (
            <KktpAnalysisTab
              filteredATP={state.filteredATP()}
              selectedTpIds={state.selectedTpIds}
              toggleTp={state.toggleTp}
              kktpValue={state.kktpValue}
              setKktpValue={state.setKktpValue}
              kktpRows={state.kktpRows}
              setKktpRows={state.setKktpRows}
              buildKktpRows={state.buildKktpRows}
              showDocument={state.showDocument}
              setShowDocument={state.setShowDocument}
              school={state.school}
              year={state.year}
              assignment={state.assignment}
            />
          )}

          {/* TAB: Kisi-kisi */}
          {state.tab === "kisi-kisi" && (
            <KisiKisiTab
              assessmentType={state.assessmentType}
              setAssessmentType={state.setAssessmentType}
              title={state.title}
              setTitle={state.setTitle}
              pgCount={state.pgCount}
              setPgCount={state.setPgCount}
              essayCount={state.essayCount}
              setEssayCount={state.setEssayCount}
              filteredATP={state.filteredATP()}
              selectedTpIds={state.selectedTpIds}
              toggleTp={state.toggleTp}
              handleGenerateBlueprintPrompt={state.handleGenerateBlueprintPrompt}
              blueprintPrompt={state.blueprintPrompt}
              copyToClipboard={state.copyToClipboard}
              blueprintJsonInput={state.blueprintJsonInput}
              setBlueprintJsonInput={state.setBlueprintJsonInput}
              handleParseBlueprint={state.handleParseBlueprint}
              blueprintResult={state.blueprintResult}
              handleGenerateCardPrompt={state.handleGenerateCardPrompt}
              setTab={state.setTab}
            />
          )}

          {/* TAB: Kartu Soal */}
          {state.tab === "kartu-soal" && (
            <KartuSoalTab
              cardPrompt={state.cardPrompt}
              copyToClipboard={state.copyToClipboard}
              cardJsonInput={state.cardJsonInput}
              setCardJsonInput={state.setCardJsonInput}
              handleParseCard={state.handleParseCard}
              cardResult={state.cardResult}
              showDocument={state.showDocument}
              setShowDocument={state.setShowDocument}
              school={state.school}
              year={state.year}
              assignment={state.assignment}
              title={state.title}
              assessmentType={state.assessmentType}
            />
          )}

          {/* TAB: Kisi-Kisi Penulisan Soal (Assessment Grid) */}
          {state.tab === "kisi-kisi-soal" && (
            <AssessmentGridTab
              assessmentGridTitle={state.assessmentGridTitle}
              setAssessmentGridTitle={state.setAssessmentGridTitle}
              filteredATP={state.filteredATP()}
              selectedTpIds={state.selectedTpIds}
              toggleTp={state.toggleTp}
              buildAssessmentGridRows={state.buildAssessmentGridRows}
              assessmentGridRows={state.assessmentGridRows}
              setAssessmentGridRows={state.setAssessmentGridRows}
              showDocument={state.showDocument}
              setShowDocument={state.setShowDocument}
              school={state.school}
              year={state.year}
              assignment={state.assignment}
            />
          )}
        </>
      )}
    </div>
  );
}
