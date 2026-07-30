/**
 * AccordionCard — Step-by-step accordion with state indicator.
 *
 * Used by: KBM Kilat (3 steps: Presensi → Jurnal → Nilai).
 *
 * States:
 *   - pending: grayed out, cannot open, step number shown
 *   - active: auto-open, colored step indicator, clickable
 *   - done: collapsed with checkmark, green indicator, clickable to re-open
 *
 * V2: Added stepColor prop for color-coded step indicators.
 *   - "green"  → Step 1 (Presensi)
 *   - "blue"   → Step 2 (Jurnal)
 *   - "amber"  → Step 3 (Nilai)
 *   - default  → blue
 */

import { type ReactNode, useCallback, useEffect, useState } from "react";

export type StepState = "pending" | "active" | "done";
export type StepColor = "green" | "blue" | "amber" | "slate";

interface AccordionCardProps {
  step: number;
  title: string;
  subtitle: string;
  state: StepState;
  defaultOpen?: boolean;
  /** Controlled open state — when provided, component becomes controlled */
  open?: boolean;
  /** Callback when user toggles the accordion (only in controlled mode) */
  onToggle?: (open: boolean) => void;
  /** Color theme for the step indicator. Default: "blue" */
  stepColor?: StepColor;
  children: ReactNode;
}

const STEP_COLOR_MAP: Record<StepColor, { active: string; done: string; icon: string }> = {
  green: {
    active: "bg-emerald-100 text-emerald-700",
    done: "bg-emerald-100 text-emerald-700",
    icon: "🟢",
  },
  blue: {
    active: "bg-blue-100 text-blue-700",
    done: "bg-emerald-100 text-emerald-700",
    icon: "🔵",
  },
  amber: {
    active: "bg-amber-100 text-amber-700",
    done: "bg-emerald-100 text-emerald-700",
    icon: "⚪",
  },
  slate: {
    active: "bg-slate-100 text-slate-700",
    done: "bg-emerald-100 text-emerald-700",
    icon: "⚪",
  },
};

export function AccordionCard({
  step,
  title,
  subtitle,
  state,
  defaultOpen = false,
  open: controlledOpen,
  onToggle,
  stepColor = "blue",
  children,
}: AccordionCardProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const handleToggle = useCallback(() => {
    if (isControlled) {
      onToggle?.(!open);
    } else {
      setInternalOpen((prev) => !prev);
    }
  }, [isControlled, onToggle, open]);

  // Auto-open when state becomes active (only in uncontrolled mode)
  useEffect(() => {
    if (!isControlled && state === "active") setInternalOpen(true);
  }, [state, isControlled]);

  const isDone = state === "done";
  const isPending = state === "pending";
  const colorConfig = STEP_COLOR_MAP[stepColor];

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all mb-3 ${
        isPending ? "border-slate-100 opacity-60" : "border-slate-200"
      }`}
    >
      {/* Header */}
      <button
        onClick={() => !isPending && handleToggle()}
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
                  : colorConfig.active
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
