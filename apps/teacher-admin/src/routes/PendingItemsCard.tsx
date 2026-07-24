/**
 * PendingItemsCard — card displaying pending work items.
 */

import { Link } from "react-router-dom";
import { Card, CardHeader } from "../shared/ui";
import type { PendingItem } from "./today-page-utils";

type PendingItemsCardProps = {
  pendingItems: PendingItem[];
};

export function PendingItemsCard({ pendingItems }: PendingItemsCardProps) {
  if (pendingItems.length === 0) return null;

  return (
    <Card>
      <CardHeader title="Belum Selesai" description={`${pendingItems.length} pekerjaan tertunda`} />
      <div className="space-y-2">
        {pendingItems.map((item) => (
          <Link
            key={item.id}
            to={item.link}
            className="flex items-center justify-between p-2 border border-slate-200 rounded-md hover:bg-slate-50"
          >
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${item.urgency === "high" ? "bg-rose-500" : "bg-amber-500"}`} />
              <span className="text-sm">{item.label}</span>
            </div>
            <span className="text-xs text-slate-400">→</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}
