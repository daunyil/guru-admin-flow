/**
 * GradesPage shared types.
 */
import type { GradeEntry } from "@guru-admin/domain";

/** Paste preview result state — shared between usePasteImport and GradesSidebar. */
export interface PastePreviewResult {
  matched: Array<{ studentName: string; studentNumber?: number; scores: Partial<GradeEntry> }>;
  unmatched: string[];
}
