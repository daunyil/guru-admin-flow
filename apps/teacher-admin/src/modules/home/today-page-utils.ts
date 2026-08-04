/**
 * Types and constants for TodayPage.
 * Non-React-specific — can be shared across sub-components.
 */

/* ================================================================== */
/*  Module Registry — types & constants                                  */
/* ================================================================== */

export type ModuleStatus = "lengkap" | "draft" | "perlu_finalisasi" | "belum_diisi";

export type ModuleEntry = {
  id: string;
  label: string;
  to: string;
  category: string;
  status: ModuleStatus;
  statusLabel: string;
};

/* ================================================================== */
/*  Pending Item                                                         */
/* ================================================================== */

export type PendingItem = {
  id: string;
  label: string;
  link: string;
  urgency: "high" | "medium" | "low";
};

/* ================================================================== */
/*  Status Config — mapping for ModuleRow badges                         */
/* ================================================================== */

export const STATUS_CONFIG: Record<ModuleStatus, { bg: string; text: string; icon: string }> = {
  lengkap: { bg: "bg-emerald-100", text: "text-emerald-800", icon: "✓" },
  draft: { bg: "bg-blue-100", text: "text-blue-800", icon: "◐" },
  perlu_finalisasi: { bg: "bg-amber-100", text: "text-amber-800", icon: "⚠" },
  belum_diisi: { bg: "bg-slate-100", text: "text-slate-600", icon: "○" },
};
