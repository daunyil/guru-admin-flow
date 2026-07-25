import { Card, Badge, Button } from "../../shared/ui";
import type { LKPD } from "@guru-admin/domain";
import { safeFormatDate } from "./utils";

interface LKPDItemCardProps {
  lkpd: LKPD;
  onPreview: () => void;
  onEdit: () => void;
  onFinalize: () => void;
  onOpenRevision: () => void;
  onDelete: () => void;
}

export function LKPDItemCard({
  lkpd,
  onPreview,
  onEdit,
  onFinalize,
  onOpenRevision,
  onDelete,
}: LKPDItemCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{lkpd.title}</span>
            <Badge variant={lkpd.status === "final" ? "success" : "neutral"}>
              {lkpd.status === "final" ? "Final" : "Draf"}
            </Badge>
            {lkpd.classLabel && <Badge variant="neutral">{lkpd.classLabel}</Badge>}
            <Badge variant="neutral">{lkpd.subject}</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            TP: {(lkpd.tp ?? "").length > 80 ? (lkpd.tp ?? "").slice(0, 80) + "..." : (lkpd.tp || "-")}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Dibuat {safeFormatDate(lkpd.createdAt)}
          </p>
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <Button variant="secondary" className="text-xs px-2 py-1" onClick={onPreview}>
            Preview
          </Button>
          {lkpd.status !== "final" ? (
            <>
              <Button
                variant="secondary"
                className="text-xs px-2 py-1"
                onClick={onEdit}
              >
                Edit
              </Button>
              <Button className="text-xs px-2 py-1" onClick={onFinalize}>
                Finalkan
              </Button>
            </>
          ) : (
            <Button
              variant="secondary"
              className="text-xs px-2 py-1"
              onClick={onOpenRevision}
            >
              Buka Revisi
            </Button>
          )}
          <Button variant="danger" className="text-xs px-2 py-1" onClick={onDelete}>
            Hapus
          </Button>
        </div>
      </div>
    </Card>
  );
}
