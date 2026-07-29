/**
 * AccordionCard — Step-by-step accordion with state indicator.
 *
 * Used by: KBM Kilat (3 steps: Presensi → Jurnal → Nilai).
 *
 * States:
 *   - pending: grayed out, cannot open, step number shown
 *   - active: auto-open, blue step indicator, clickable
 *   - done: collapsed with checkmark, green indicator, clickable to re-open
 */

import { type ReactNode, useEffect, useState } from "react";

export type StepState = "pending" | "active" | "done";

interface AccordionCardProps {
  step: number;
  title: string;
  subtitle: string;
  state: StepState;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function AccordionCard({
  step,
  title,
  subtitle,
  state,
  defaultOpen = false,
  children,
}: AccordionCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  // Auto-open when state becomes active
  useEffect(() => {
    if (state === "active") setOpen(true);
  }, [state]);

  const isDone = state === "done";
  const isPending = state === "pending";

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all ${
        isPending ? "border-slate-100 opacity-60" : "border-slate-200"
      }`}
    >
      {/* Header */}
      <button
        onClick={() => !isPending && setOpen(!open)}
        disabled={isPending}
        className={`w-full p-4 text-left flex justify-between items-center bg-white active:scale-[0.99] transition-transform ${
          isPending ? "cursor-not-allowed" : "cursor-pointer"
        }`}
      >
        <div className="flex items-center gap-3">
          {/* Step indicator */}
          <span
            className={`w-7 h-7 rounded-full font-bold text-xs flex items-center justify-center ${
              isDone
                ? "bg-emerald-100 text-emerald-700"
                : isPending
                  ? "bg-slate-100 text-slate-400"
                  : "bg-blue-100 text-blue-700"
            }`}
          >
            {isDone ? "✓" : step}
          </span>
          <div>
            <h2 className="text-xs font-bold text-slate-800">{title}</h2>
            <p className={`text-[10px] ${isDone ? "text-emerald-600" : "text-slate-500"}`}>
              {subtitle}
            </p>
          </div>
        </div>
        <span className={`text-slate-400 text-xs transition-transform ${open ? "rotate-180" : ""}`}>
          ▼
        </span>
      </button>

      {/* Content */}
      {open && !isPending && (
        <div className="p-4 pt-0 border-t border-slate-100 bg-slate-50/50">
          {children}
        </div>
      )}
    </div>
  );
}
