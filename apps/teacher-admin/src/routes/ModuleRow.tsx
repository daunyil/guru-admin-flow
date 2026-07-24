/**
 * ModuleRow — satu baris modul dengan status + tombol Buka
 */

import { Link } from "react-router-dom";
import { STATUS_CONFIG } from "./today-page-utils";
import type { ModuleEntry } from "./today-page-utils";

export function ModuleRow({ entry }: { entry: ModuleEntry }) {
  const cfg = STATUS_CONFIG[entry.status];

  return (
    <div className="flex items-center gap-3 py-2.5 px-1 group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-900 truncate">{entry.label}</span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
            <span className="text-[10px]">{cfg.icon}</span>
            {entry.statusLabel}
          </span>
        </div>
      </div>
      <Link
        to={entry.to}
        className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-md border border-brand-200 text-brand-700 bg-brand-50 hover:bg-brand-100 transition-colors"
      >
        {entry.status === "belum_diisi" ? "Isi" : entry.status === "perlu_finalisasi" ? "Finalisasi" : "Buka"}
      </Link>
    </div>
  );
}
