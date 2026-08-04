/**
 * Perbarui Identitas Dokumen — ganti identitas dokumen lama secara massal.
 *
 * BATCH-ADMIN-USABILITY-RC1: ubah dari "RPP Bulk Replace" ke
 * "Perbarui Identitas Dokumen" yang mendukung berbagai jenis dokumen.
 *
 * Jenis dokumen yang didukung:
 *   RPP/Modul Ajar, Prota, ATP, LKPD, Kisi-kisi, Kartu Soal, Naskah Soal, Lainnya.
 *
 * Mode teks/paste tetap aman. DOCX = roadmap berikutnya.
 *
 * Refactored: monolithic component split into sub-files:
 *   - rpp-bulk-utils.ts    (pure utilities & constants)
 *   - useRppBulkState.ts   (state management & handlers hook)
 *   - IdentityFormCard.tsx (Step 1: Identitas Baru)
 *   - LiteralReplacementCard.tsx (Step 1b: Ganti Teks)
 *   - DocumentInputCard.tsx (Step 2: Dokumen Lama)
 *   - ArchiveListCard.tsx   (Step 3: Arsip)
 *   - PreviewCard.tsx       (Preview Modal)
 *   - PlaceholderReferenceCard.tsx (Daftar Placeholder)
 */

import { Card, CardHeader, Select } from "@shared/ui";
import { LoadingState } from "@shared/ui";
import { useRppBulkState } from "./useRppBulkState";
import { IdentityFormCard } from "./IdentityFormCard";
import { LiteralReplacementCard } from "./LiteralReplacementCard";
import { DocumentInputCard } from "./DocumentInputCard";
import { ArchiveListCard } from "./ArchiveListCard";
import { PreviewCard } from "./PreviewCard";
import { PlaceholderReferenceCard } from "./PlaceholderReferenceCard";

export function RppBulkReplacePage() {
  const state = useRppBulkState();

  if (state.loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="page-header">
        <h1 className="text-2xl font-bold text-slate-900">Perbarui Identitas Dokumen</h1>
        <p className="text-sm text-slate-500 mt-1">
          {state.year ? `TP ${state.year.label}` : "Belum ada tahun aktif"} · Ganti identitas dokumen lama tanpa ubah isi materi.
        </p>
      </div>

      {state.message && (
        <div className={`info-banner-${state.message.type === "success" ? "success" : "error"}`}>
          {state.message.text}
        </div>
      )}

      {/* Info: format yang didukung */}
      <Card className="bg-emerald-50 border-emerald-200">
        <div className="flex items-start gap-2 text-sm">
          <span className="text-emerald-600 text-lg">✓</span>
          <div>
            <p className="font-semibold text-emerald-900">Format yang Didukung</p>
            <p className="text-emerald-800 mt-1">
              Upload file <code>.docx</code> (Word 2007+), <code>.txt</code>, <code>.html</code>, <code>.md</code> atau <strong>paste teks</strong>.
              Untuk <code>.docx</code>: app baca isi dokumen, ganti identitas lama dengan yang baru, dan hasilkan <code>.docx</code> baru dengan format Word tetap utuh.
            </p>
            <p className="text-emerald-800 mt-1">
              <strong>Multi-dokumen (teks):</strong> pisah beberapa RPP dengan delimiter <code>=== DOKUMEN ===</code> atau <code>=== RPP ===</code>.
            </p>
            <p className="text-amber-700 mt-1 text-xs">
              Catatan: <code>.doc</code> lama (OLE) dan <code>.pdf</code> belum didukung. Konversi dulu ke <code>.docx</code> via Word → Save As .docx.
            </p>
          </div>
        </div>
      </Card>

      {/* Pilih jenis dokumen */}
      <Card>
        <CardHeader title="Jenis Dokumen" description="Pilih jenis dokumen yang akan diperbarui identitasnya." />
        <Select
          label="Jenis Dokumen"
          id="doc-kind"
          value={state.docKind}
          onChange={state.setDocKind}
          options={[
            { value: "rpp", label: "RPP / Modul Ajar" },
            { value: "prota", label: "Prota" },
            { value: "atp", label: "ATP" },
            { value: "lkpd", label: "LKPD" },
            { value: "blueprint", label: "Kisi-kisi" },
            { value: "question_card", label: "Kartu Soal" },
            { value: "exam", label: "Naskah Soal" },
            { value: "other", label: "Dokumen Lain" },
          ]}
        />
      </Card>

      {/* Step 1: Identitas */}
      <IdentityFormCard
        ctx={state.ctx}
        setCtx={state.setCtx}
        assignments={state.assignments}
        selectedAssignmentId={state.selectedAssignmentId}
        onAssignmentPick={state.handleAssignmentPick}
      />

      {/* Step 1b: Literal Replacements */}
      <LiteralReplacementCard
        literalReplacements={state.literalReplacements}
        validLiterals={state.validLiterals}
        liveLiteralMatches={state.liveLiteralMatches}
        onUpdate={state.updateLiteralReplacement}
        onAdd={state.addLiteralReplacement}
        onRemove={state.removeLiteralReplacement}
        inputText={state.inputText}
      />

      {/* Step 2: Input dokumen lama */}
      <DocumentInputCard
        fileInputRef={state.fileInputRef}
        filename={state.filename}
        inputText={state.inputText}
        setInputText={state.setInputText}
        docxBuffer={state.docxBuffer}
        docxProcessing={state.docxProcessing}
        docxResult={state.docxResult}
        docxStats={state.docxStats}
        livePlaceholderCount={state.livePlaceholderCount}
        liveHasPlaceholders={state.liveHasPlaceholders}
        multiDocCount={state.multiDocCount}
        validLiterals={state.validLiterals}
        liveProcessed={state.liveProcessed}
        ctx={state.ctx}
        year={state.year}
        teacher={state.teacher}
        handleFileUpload={state.handleFileUpload}
        handleProcessDocx={state.handleProcessDocx}
        handleDownloadDocx={state.handleDownloadDocx}
        handleSaveDocxArchive={state.handleSaveDocxArchive}
        handleProcessAndSave={state.handleProcessAndSave}
        setPreviewDoc={state.setPreviewDoc}
      />

      {/* Step 3: Arsip */}
      <ArchiveListCard
        archives={state.archives}
        onDelete={state.handleDelete}
        onPreview={state.handlePreview}
        onDownload={state.handleDownloadProcessed}
      />

      {/* Preview Modal */}
      {state.previewDoc && (
        <PreviewCard
          previewDoc={state.previewDoc}
          onDownload={state.handleDownloadProcessed}
          onClose={() => state.setPreviewDoc(null)}
        />
      )}

      {/* Daftar placeholder (info card) */}
      <PlaceholderReferenceCard ctx={state.ctx} />
    </div>
  );
}
