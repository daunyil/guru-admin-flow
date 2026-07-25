/**
 * Step 3: Arsip RPP Hasil Replace — archive list display.
 */

import type { RppDocument } from "@guru-admin/domain";
import { formatLongDateID } from "@guru-admin/shared";
import { Card, CardHeader, EmptyState, Badge, Button } from "@shared/ui";
import { countTotalPlaceholders, isDocxBase64 } from "./rpp-bulk-utils";

interface ArchiveListCardProps {
  archives: RppDocument[];
  onDelete: (id: string) => Promise<void>;
  onPreview: (doc: RppDocument) => Promise<void>;
  onDownload: (doc: RppDocument) => void;
}

export function ArchiveListCard({
  archives,
  onDelete,
  onPreview,
  onDownload,
}: ArchiveListCardProps) {
  return (
    <Card>
      <CardHeader
        title="3. Arsip RPP Hasil Replace"
        description={`${archives.length} dokumen tersimpan`}
      />
      {archives.length === 0 ? (
        <EmptyState
          title="Belum ada arsip"
          description="Proses RPP lama di atas untuk membuat arsip pertama."
        />
      ) : (
        <div className="space-y-2">
          {archives.map((doc) => (
            <div key={doc.id} className="p-3 border border-slate-200 rounded-md">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">
                      {doc.filename ?? "Paste teks"}
                    </span>
                    <Badge variant="neutral">{doc.source}</Badge>
                    <Badge variant={doc.status === "final" ? "success" : "neutral"}>
                      {doc.status === "final" ? "Final" : "Draft"}
                    </Badge>
                    {doc.subject && <Badge variant="neutral">{doc.subject}</Badge>}
                    {doc.classLabel && <Badge variant="neutral">{doc.classLabel}</Badge>}
                    {(doc.literalReplacements?.length ?? 0) > 0 && (
                      <Badge variant="warning">{doc.literalReplacements?.length} literal</Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Diproses {formatLongDateID(doc.createdAt.slice(0, 10))} ·{" "}
                    {countTotalPlaceholders(doc.originalContent)} placeholder
                    {(doc.literalReplacements?.length ?? 0) > 0 && ` + ${doc.literalReplacements?.length} literal`}
                  </p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Button variant="secondary" className="text-xs px-2 py-1" onClick={() => onPreview(doc)}>
                    Preview
                  </Button>
                  <Button variant="secondary" className="text-xs px-2 py-1" onClick={() => onDownload(doc)}>
                    {isDocxBase64(doc.processedContent) ? "Download .docx" : "Download .html"}
                  </Button>
                  <Button variant="danger" className="text-xs px-2 py-1" onClick={() => onDelete(doc.id)}>
                    Hapus
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
