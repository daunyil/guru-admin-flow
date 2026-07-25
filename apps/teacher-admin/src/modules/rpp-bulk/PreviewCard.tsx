/**
 * Preview Modal — display preview of processed document.
 */

import type { RppDocument } from "@guru-admin/domain";
import { Card, CardHeader, Badge, Button } from "../../shared/ui";
import { countTotalPlaceholders, isDocxBase64 } from "./rpp-bulk-utils";

interface PreviewCardProps {
  previewDoc: RppDocument;
  onDownload: (doc: RppDocument) => void;
  onClose: () => void;
}

export function PreviewCard({
  previewDoc,
  onDownload,
  onClose,
}: PreviewCardProps) {
  return (
    <Card>
      <CardHeader
        title="Preview Hasil Replace"
        description={previewDoc.filename ?? "Paste teks"}
      />
      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          <Badge variant="neutral">
            {countTotalPlaceholders(previewDoc.originalContent)} placeholder
          </Badge>
          {(previewDoc.literalReplacements?.length ?? 0) > 0 && (
            <Badge variant="warning">
              {previewDoc.literalReplacements?.length} literal replacement
            </Badge>
          )}
          {previewDoc.id !== "preview" && (
            <Button variant="secondary" className="text-xs" onClick={() => onDownload(previewDoc)}>
              Download .html
            </Button>
          )}
          <Button variant="secondary" className="text-xs" onClick={() => window.print()}>
            Cetak
          </Button>
          <Button variant="secondary" className="text-xs" onClick={onClose}>
            Tutup Preview
          </Button>
        </div>

        <div className="print-area">
          <div className="document-page document-portrait">
            {isDocxBase64(previewDoc.processedContent) ? (
              // UX-DOC-05: arsip DOCX base64 TIDAK boleh ditampilkan sebagai HTML.
              // Tampilkan info + tombol Download saja.
              <div className="p-4 bg-slate-50 rounded text-center space-y-3">
                <p className="text-sm font-semibold text-slate-700">
                  Arsip DOCX (binary)
                </p>
                <p className="text-xs text-slate-500">
                  File .docx hasil replace identitas. Preview teks tidak tersedia untuk arsip DOCX.
                  Klik Download untuk mengambil file .docx.
                </p>
                <Button variant="secondary" className="text-sm" onClick={() => onDownload(previewDoc)}>
                  Download .docx
                </Button>
              </div>
            ) : (
              <div
                className="rpp-content"
                style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}
                dangerouslySetInnerHTML={{ __html: previewDoc.processedContent }}
              />
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
