import type { DashboardCard, DashboardClassGroup, DaySummary } from "../types";

/* ============================================================ */
/*  Dashboard View — Day Progress + Session Cards                */
/* ============================================================ */

export interface DashboardViewProps {
  dashboardClassGroups: DashboardClassGroup[];
  daySummary: DaySummary;
  progressPercent: number;
  selectDashboardSession: (id: string) => void;
}

export function DashboardView({ dashboardClassGroups, daySummary, progressPercent, selectDashboardSession }: DashboardViewProps) {
  return (
    <div className="space-y-3 md:space-y-4">
      {/* Day Progress Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 md:p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs md:text-sm font-bold text-slate-700">Progres Hari Ini</span>
          <span className="text-xs md:text-sm font-bold text-emerald-600">{progressPercent}%</span>
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
          {daySummary.done > 0 && (
            <div className="bg-emerald-500 h-full transition-all" style={{ width: `${(daySummary.done / daySummary.total) * 100}%` }} />
          )}
          {daySummary.partial > 0 && (
            <div className="bg-amber-400 h-full transition-all" style={{ width: `${(daySummary.partial / daySummary.total) * 100}%` }} />
          )}
          {daySummary.unfilled > 0 && (
            <div className="bg-slate-200 h-full transition-all" style={{ width: `${(daySummary.unfilled / daySummary.total) * 100}%` }} />
          )}
        </div>
        <div className="flex gap-3 md:gap-4 mt-2">
          <span className="text-[10px] md:text-xs text-slate-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Selesai ({daySummary.done})
          </span>
          <span className="text-[10px] md:text-xs text-slate-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Sebagian ({daySummary.partial})
          </span>
          <span className="text-[10px] md:text-xs text-slate-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-200 inline-block" /> Belum ({daySummary.unfilled})
          </span>
        </div>
      </div>

      {/* Session cards grouped by class */}
      {dashboardClassGroups.map((group) => (
        <ClassGroupCard key={group.classId} group={group} onSelect={selectDashboardSession} />
      ))}
    </div>
  );
}

/* ---- Class Group Card ---- */
function ClassGroupCard({ group, onSelect }: { group: DashboardClassGroup; onSelect: (id: string) => void }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="bg-slate-50 px-4 py-2.5 md:py-3 border-b border-slate-100">
        <h3 className="text-xs md:text-sm font-bold text-slate-800 uppercase tracking-wider">{group.classLabel}</h3>
      </div>
      <div className="divide-y divide-slate-100">
        {group.cards.map((card) => (
          <SessionCardRow key={card.session.id} card={card} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

/* ---- Session Card Row (clickable) ---- */
function SessionCardRow({ card, onSelect }: { card: DashboardCard; onSelect: (id: string) => void }) {
  const statusColorMap: Record<string, string> = {
    done: "bg-emerald-100 text-emerald-700",
    partial: "bg-amber-100 text-amber-700",
    unfilled: "bg-slate-100 text-slate-600",
  };
  const statusDotColor: Record<string, string> = {
    done: "bg-emerald-500",
    partial: "bg-amber-400",
    unfilled: "bg-slate-300",
  };

  return (
    <button
      onClick={() => onSelect(card.session.id)}
      className="w-full flex items-center gap-3 px-4 py-3 md:py-3.5 text-left active:bg-slate-50 hover:bg-slate-50 transition-colors min-h-[44px]"
    >
      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusDotColor[card.status]}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs md:text-sm font-bold text-slate-900 truncate">
            P{card.meetingNumber} — {card.session.subject}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] md:text-xs text-slate-500">
            JP {card.session.startPeriod}{card.session.durationJP > 1 ? `-${card.session.startPeriod + card.session.durationJP - 1}` : ""}
          </span>
          {card.attendanceSummary && (
            <span className="text-[10px] md:text-xs text-slate-400 truncate">{card.attendanceSummary}</span>
          )}
        </div>
      </div>
      <span className={`text-[10px] md:text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap ${statusColorMap[card.status]}`}>
        {card.statusIcon} {card.statusLabel}
      </span>
    </button>
  );
}
