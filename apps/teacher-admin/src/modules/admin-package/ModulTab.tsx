/**
 * ModulTab — Tab 3 content for "Semua Modul".
 * Shows navigation cards for all technical modules.
 */

import { Link } from "react-router-dom";
import { Card, CardHeader } from "@shared/ui";
import { GATE_GROUPS } from "@shared/layout/navigation";

export function ModulTab() {
  return (
    <Card className="no-print">
      <CardHeader title="Semua Modul" description="Buka modul teknis jika perlu mengedit data langsung." />
      <div className="space-y-3">
        {GATE_GROUPS.map((group) => (
          <div key={group.title}>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">{group.title}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {group.cards.map((card) => (
                <Link key={card.id} to={card.to}>
                  <div className="p-3 border border-slate-200 rounded-lg hover:border-brand-300 hover:bg-brand-50 transition-colors cursor-pointer">
                    <p className="text-sm font-medium text-slate-800">{card.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{card.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
