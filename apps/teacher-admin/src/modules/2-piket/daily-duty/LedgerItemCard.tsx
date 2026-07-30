import type { StudentDutyLedgerItem } from "@guru-admin/domain";
import { formatLongDateID } from "@guru-admin/shared";
import { Button } from "@shared/ui";
import { statusClass } from "./utils";

export function LedgerItemCard({ item, onOpen }: { item: StudentDutyLedgerItem; onOpen: () => void }) {
  const cls = statusClass(item.statusLabel);
  return <div className="p-2 border rounded-lg"><div className="flex items-start justify-between gap-2"><div className="min-w-0 flex-1"><p className="font-medium text-sm">{item.studentName}{item.studentNumber ? <span className="text-xs text-slate-500 ml-2">No. {item.studentNumber}</span> : null}</p><p className="text-xs text-slate-500">{item.classLabel} · {item.totalPoints} poin · {item.totalRecords} kejadian{item.lastRecordDate ? ` · terakhir ${formatLongDateID(item.lastRecordDate)}` : ""}</p><span className={`inline-block mt-1 px-1.5 py-0.5 text-xs rounded border ${cls}`}>{item.statusLabel}</span></div><Button variant="secondary" className="text-xs shrink-0" onClick={onOpen}>Lihat</Button></div><p className="text-xs text-slate-600 mt-1">{[item.attendanceCount > 0 && `Kehadiran: ${item.attendanceCount}`, item.disciplineCount > 0 && `Disiplin: ${item.disciplineCount}`, item.healthCount > 0 && `Kesehatan: ${item.healthCount}`, item.permissionCount > 0 && `Izin: ${item.permissionCount}`, item.otherCount > 0 && `Lainnya: ${item.otherCount}`].filter(Boolean).join(" · ")}</p></div>;
}
