/**
 * Auto Document Engine — halaman /auto-document
 *
 * AUTO-DOCUMENT-ENGINE-RC1: engine yang mengumpulkan data per Kelas dan Mapel
 * menjadi paket administrasi guru. Preview kelengkapan + tombol cetak.
 *
 * Flow:
 *   1. Pilih Kelas dan Mapel
 *   2. Klik "Susun Paket Dokumen"
 *   3. App load semua data terkait assignment
 *   4. Tampilkan preview: 12 dokumen dengan status available/draft/not_available
 *   5. Tombol cetak (print CSS)
 */

import { LoadingState } from "../../shared/ui";
import { useAutoDocumentState } from "./useAutoDocumentState";
import { AssignmentSelectorCard } from "./AssignmentSelectorCard";
import { DocumentPreviewCard } from "./DocumentPreviewCard";
import { SummaryStatsCard } from "./SummaryStatsCard";
import { PrintControlsCard } from "./PrintControlsCard";
import { DocumentViewCard } from "./DocumentViewCard";

export function AutoDocumentPage() {
  const state = useAutoDocumentState();

  if (state.loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="page-header">
        <h1 className="text-2xl font-bold text-slate-900">Auto Document Engine</h1>
        <p className="text-sm text-slate-500 mt-1">
          {state.year ? `TP ${state.year.label}` : "Belum ada tahun aktif"} · Generate paket administrasi guru per Kelas dan Mapel.
        </p>
      </div>

      {state.message && (
        <div className={`info-banner-${state.message.type === "success" ? "success" : "error"}`}>
          {state.message.text}
        </div>
      )}

      {/* Step 1: Pilih Kelas dan Mapel */}
      <AssignmentSelectorCard
        assignments={state.assignments}
        selectedAssignmentId={state.selectedAssignmentId}
        setSelectedAssignmentId={state.setSelectedAssignmentId}
        assignment={state.assignment}
        year={state.year}
        generating={state.generating}
        handleGenerate={state.handleGenerate}
      />

      {/* Step 2: Preview Paket */}
      {state.pkg && (
        <>
          <DocumentPreviewCard pkg={state.pkg} />

          {/* Summary angka */}
          <SummaryStatsCard pkg={state.pkg} />

          {/* Tombol Cetak */}
          <PrintControlsCard
            showDocument={state.showDocument}
            setShowDocument={state.setShowDocument}
            pkg={state.pkg}
            school={state.school}
          />

          {/* Mode Dokumen */}
          {state.showDocument && (
            <DocumentViewCard
              pkg={state.pkg}
              year={state.year}
              school={state.school}
            />
          )}
        </>
      )}
    </div>
  );
}
