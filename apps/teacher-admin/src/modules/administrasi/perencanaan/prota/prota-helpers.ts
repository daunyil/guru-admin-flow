/**
 * Prota helper constants and utility functions.
 * Shared across Prota sub-components.
 */

import type { ProtaProfile } from "@guru-admin/domain";

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

export const MONTH_FULL_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/* ------------------------------------------------------------------ */
/*  Status helpers                                                    */
/* ------------------------------------------------------------------ */

export function statusBadge(
  status: ProtaProfile["status"]
): "success" | "warning" | "error" | "neutral" {
  switch (status) {
    case "draft": return "neutral";
    case "ready_for_review": return "warning";
    case "final": return "success";
    case "revised": return "warning";
    case "locked": return "success";
    default: return "neutral";
  }
}

export function statusLabel(status: ProtaProfile["status"]): string {
  switch (status) {
    case "draft": return "Draf";
    case "ready_for_review": return "Siap Dicek";
    case "final": return "Final";
    case "revised": return "Perlu Revisi";
    case "locked": return "Dikunci";
    default: return status;
  }
}
