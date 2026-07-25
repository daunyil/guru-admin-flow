import { Link } from "react-router-dom";
import { Card, CardHeader, Badge, Button } from "@shared/ui";
import type { AdminDocumentPackage } from "@guru-admin/domain";

interface DocumentPreviewCardProps {
  pkg: AdminDocumentPackage;
}

export function DocumentPreviewCard({ pkg }: DocumentPreviewCardProps) {
  return (
    <Card>
      <CardHeader
        title="2. Preview Paket Administrasi"
        description={`Skor Kelengkapan: ${pkg.summary.completenessScore}% — ${pkg.summary.availableDocs} lengkap, ${pkg.summary.draftDocs} draft, ${pkg.summary.notAvailableDocs} belum ada`}
      />
      <div className="space-y-2">
        {pkg.documents.map((doc) => (
          <div
            key={doc.key}
            className="p-3 border border-slate-200 rounded-md flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <span
                className={`w-3 h-3 rounded-full shrink-0 ${
                  doc.status === "available"
                    ? "bg-emerald-500"
                    : doc.status === "draft"
                    ? "bg-amber-500"
                    : "bg-rose-500"
                }`}
              />
              <div className="min-w-0">
                <p className="font-medium text-sm">{doc.name}</p>
                <p className="text-xs text-slate-500">{doc.detail}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge
                variant={
                  doc.status === "available"
                    ? "success"
                    : doc.status === "draft"
                    ? "warning"
                    : "error"
                }
              >
                {doc.status === "available" ? "Lengkap" : doc.status === "draft" ? "Draft" : "Belum Tersedia"}
              </Badge>
              <Link to={doc.route}>
                <Button variant="secondary" className="text-xs px-2 py-1">
                  Buka
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
