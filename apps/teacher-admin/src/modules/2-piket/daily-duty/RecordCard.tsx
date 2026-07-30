import type { DutyRecord } from "@guru-admin/domain";
import { formatLongDateID } from "@guru-admin/shared";

export function RecordCard({ record }: { record: DutyRecord }) {
  return <div className="p-2 border rounded-lg"><p className="text-xs text-slate-500">{formatLongDateID(record.date)}</p><p className="text-sm font-medium mt-0.5">{record.ruleLabel} · {record.points} poin</p>{record.note && <p className="text-xs text-slate-600 mt-1">Catatan: {record.note}</p>}{record.followUp && <p className="text-xs text-slate-600 mt-0.5">Tindak lanjut: {record.followUp}</p>}</div>;
}
