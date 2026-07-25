/**
 * Step 2: Dokumen Lama — file upload, DOCX section, textarea, stats, and action buttons.
 */

import type { AcademicYear, TeacherProfile, RppIdentityContext, RppDocument, LiteralReplacement, DocxProcessResult } from "@guru-admin/domain";
import { Card, CardHeader, Textarea, Button, Badge } from "@shared/ui";

interface DocxStatsEntry {
  oldText: string;
  count: number;
}

interface DocumentInputCardProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  filename: string;
  inputText: string;
  setInputText: (v: string) => void;
  docxBuffer: ArrayBuffer | null;
  docxProcessing: boolean;
  docxResult: DocxProcessResult | null;
  docxStats: { placeholders: number; literals: DocxStatsEntry[] };
  livePlaceholderCount: number;
  liveHasPlaceholders: boolean;
  multiDocCount: number;
  validLiterals: LiteralReplacement[];
  liveProcessed: string;
  ctx: RppIdentityContext;
  year: AcademicYear | null;
  teacher: TeacherProfile | undefined;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleProcessDocx: () => Promise<void>;
  handleDownloadDocx: () => void;
  handleSaveDocxArchive: () => Promise<void>;
  handleProcessAndSave: () => Promise<void>;
  setPreviewDoc: React.Dispatch<React.SetStateAction<RppDocument | null>>;
}

export function DocumentInputCard({
  fileInputRef,
  filename,
  inputText,
  setInputText,
  docxBuffer,
  docxProcessing,
  docxResult,
  docxStats,
  livePlaceholderCount,
  liveHasPlaceholders,
  multiDocCount,
  validLiterals,
  liveProcessed,
  ctx,
  year,
  teacher,
  handleFileUpload,
  handleProcessDocx,
  handleDownloadDocx,
  handleSaveDocxArchive,
  handleProcessAndSave,
  setPreviewDoc,
}: DocumentInputCardProps) {
  return (
    <Card>
      <CardHeader
        title="2. Dokumen Lama"
        description="Upload file (.docx/.txt/.html/.md) atau paste teks dokumen lama."
      />
      <div className="space-y-3">
        <div>
          <label className="label">Upload File (.docx/.txt/.html/.md)</label>
          <input
            ref={fileInputRef as React.Ref<HTMLInputElement>}
            type="file"
            accept=".docx,.txt,.html,.htm,.md"
            onChange={handleFileUpload}
            className="input"
          />
          {filename && (
            <p className="text-xs text-slate-500 mt-1">
              File: {filename}
              {docxBuffer && <Badge variant="success">DOCX siap diproses</Badge>}
            </p>
          )}
        </div>

        {/* DOCX-IDENTITY-RC1: section khusus DOCX */}
        {docxBuffer && (
          <div className="p-3 bg-slate-50 rounded-md space-y-3">
            <div className="text-sm font-semibold text-slate-700">
              Mode DOCX: {filename}
            </div>
            <div className="text-xs text-slate-600 space-y-1">
              <p>Placeholder ditemukan: <strong>{docxStats.placeholders}</strong></p>
              {docxStats.literals.length > 0 && (
                <div>
                  <p>Literal match:</p>
                  <ul className="ml-4 list-disc">
                    {docxStats.literals.map((l, i) => (
                      <li key={i}><code>{l.oldText}</code> → <strong>{l.count}</strong>×</li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-slate-500">
                {docxStats.placeholders === 0 && docxStats.literals.every((l) => l.count === 0)
                  ? "⚠ Tidak ada placeholder/literal ditemukan. Tambah pasangan literal di Step 1b dulu."
                  : "✓ Klik Proses DOCX untuk replace."}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={handleProcessDocx}
                disabled={docxProcessing}
              >
                {docxProcessing ? "Memproses..." : "Proses DOCX"}
              </Button>
            </div>

            {docxResult && (
              <div className="p-3 bg-emerald-50 rounded border border-emerald-200 space-y-2">
                <p className="text-sm font-semibold text-emerald-900">✓ DOCX berhasil diproses</p>
                <div className="text-xs text-emerald-800 space-y-1">
                  <p>Placeholder di-replace: <strong>{docxResult.stats.placeholdersReplaced}</strong> / {docxResult.stats.placeholdersFound} ditemukan</p>
                  <p>Literal replacement: <strong>{docxResult.stats.literalMatches}</strong></p>
                  <p>File diproses: {docxResult.stats.filesProcessed.join(", ")}</p>
                  {docxResult.warnings.length > 0 && (
                    <p className="text-amber-700">⚠ {docxResult.warnings.join(" ")}</p>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="secondary" className="text-sm" onClick={handleDownloadDocx}>
                    Download .docx
                  </Button>
                  <Button variant="secondary" className="text-sm" onClick={handleSaveDocxArchive}>
                    Simpan ke Arsip
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-slate-500 text-center">— atau paste teks di bawah (mode teks) —</div>

        <Textarea
          label="Atau Paste Teks Dokumen Lama"
          id="rpp-input"
          value={inputText}
          onChange={setInputText}
          rows={8}
          placeholder="Tempel teks dokumen lama di sini. Placeholder yang didukung: {{NAMA_SEKOLAH}}, {{NAMA_GURU}}, dll. Untuk multi-dokumen, pisah dengan === DOKUMEN ==="
        />

        {inputText && (
          <div className="p-3 bg-slate-50 rounded-md text-sm space-y-2">
            <p className="font-medium text-slate-700">
              Placeholder terdeteksi: <strong>{livePlaceholderCount}</strong> buah
              {multiDocCount > 1 && (
                <span className="ml-3">
                  Multi-dokumen: <strong>{multiDocCount}</strong> blok
                </span>
              )}
            </p>
            {!liveHasPlaceholders && validLiterals.length === 0 && (
              <p className="text-xs text-amber-700">
                ⚠ Tidak ada placeholder ditemukan. Tambah pasangan literal di Step 1b
                untuk ganti teks identitas lama secara langsung.
              </p>
            )}
            {(liveHasPlaceholders || validLiterals.length > 0) && (
              <p className="text-xs text-emerald-700">
                ✓ Klik &quot;Proses &amp; Simpan&quot; untuk ganti placeholder + literal
                dengan identitas di atas.
              </p>
            )}
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <Button onClick={handleProcessAndSave} disabled={!inputText.trim()}>
            Proses &amp; Simpan Arsip
          </Button>
          {inputText && (liveHasPlaceholders || validLiterals.length > 0) && (
            <Button
              variant="secondary"
              onClick={() => {
                setPreviewDoc({
                  id: "preview",
                  academicYearId: year?.id ?? "",
                  teacherId: teacher?.id ?? "",
                  originalContent: inputText,
                  processedContent: liveProcessed,
                  source: filename ? "upload" : "paste",
                  filename: filename || null,
                  contextSnapshot: ctx,
                  literalReplacements: validLiterals,
                  status: "draft",
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  deletedAt: null,
                  syncStatus: "local_only",
                } as RppDocument);
              }}
            >
              Preview Hasil Replace
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
