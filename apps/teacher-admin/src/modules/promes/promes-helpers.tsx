/**
 * Shared helpers for Promes module — extracted from PromesPage.tsx
 * Contains: landscape matrix format helpers, Merdeka event definitions,
 * calendar event classification, and utility functions.
 *
 * REWRITE: Added buildWeekLookup(), buildMateriRows(), classifyPromesWeek()
 * to eliminate duplicated Map building and materi row construction across
 * the three document components. All old exports remain for backward compat.
 */

import { promesCalendarKindLabel } from "@guru-admin/domain";
import type { PromesWeek, UnitDistribution } from "@guru-admin/domain";

/* ============================================================ */
/*  Landscape matrix format helpers                              */
/* ============================================================ */

export const MONTH_SHORT_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export type PromesMonthColumn = {
  month: number;
  label: string;
  weeks: Array<{
    weekNumber: number;
    label: string;
    startDate: string;
  }>;
};

export function buildPromesMonthGroups(weeks: PromesWeek[], semester: 1 | 2): PromesMonthColumn[] {
  const monthNumbers = semester === 1 ? [7, 8, 9, 10, 11, 12] : [1, 2, 3, 4, 5, 6];

  return monthNumbers
    .map((month) => {
      const monthWeeks = weeks
        .filter((week) => Number(week.startDate.slice(5, 7)) === month)
        .sort((a, b) => a.weekNumber - b.weekNumber);

      return {
        month,
        label: MONTH_SHORT_ID[month - 1],
        weeks: monthWeeks.map((week, index) => ({
          weekNumber: week.weekNumber,
          label: String(index + 1),
          startDate: week.startDate,
        })),
      };
    })
    .filter((group) => group.weeks.length > 0);
}

/* ============================================================ */
/*  NEW: buildWeekLookup — unified lookup for all 3 documents    */
/* ============================================================ */

/** Unified week lookup built once and shared across all document components. */
export type PromesWeekLookup = {
  /** weekNumber → PromesWeek (fast lookup by week number) */
  weekByNumber: Map<number, PromesWeek>;

  /** weekNumber → PromesLandscapeEventColumn (for landscape matrix) */
  landscapeEventByWeek: Map<number, PromesLandscapeEventColumn | null>;

  /** weekNumber → PromesWeekEventInfo (for merdeka format) */
  weekEventInfoByWeek: Map<number, PromesWeekEventInfo | null>;

  /** unitId → (weekNumber → JP assigned in that week) */
  unitJPByWeek: Map<string, Map<number, number>>;
};

/**
 * Build all lookup maps from the raw weeks array.
 * Previously each document component built these independently —
 * now we do it once and share the result.
 */
export function buildWeekLookup(weeks: PromesWeek[]): PromesWeekLookup {
  // weekByNumber
  const weekByNumber = new Map<number, PromesWeek>();
  for (const w of weeks) {
    weekByNumber.set(w.weekNumber, w);
  }

  // landscapeEventByWeek
  const landscapeEventByWeek = new Map<number, PromesLandscapeEventColumn | null>();
  for (const w of weeks) {
    landscapeEventByWeek.set(w.weekNumber, getPromesLandscapeCalendarEvent(w));
  }

  // weekEventInfoByWeek (combined classification)
  const weekEventInfoByWeek = new Map<number, PromesWeekEventInfo | null>();
  for (const w of weeks) {
    weekEventInfoByWeek.set(w.weekNumber, classifyPromesWeek(w));
  }

  // unitJPByWeek: unitId → weekNumber → JP
  const unitJPByWeek = new Map<string, Map<number, number>>();
  for (const w of weeks) {
    for (const au of w.assignedUnits) {
      if (!unitJPByWeek.has(au.unitId)) {
        unitJPByWeek.set(au.unitId, new Map());
      }
      unitJPByWeek.get(au.unitId)!.set(w.weekNumber, au.jp);
    }
  }

  return { weekByNumber, landscapeEventByWeek, weekEventInfoByWeek, unitJPByWeek };
}

/** Get JP assigned to a unit in a specific week (returns 0 if none). */
export function getUnitJPInWeek(lookup: PromesWeekLookup, unitId: string, weekNumber: number): number {
  return lookup.unitJPByWeek.get(unitId)?.get(weekNumber) ?? 0;
}

/* ============================================================ */
/*  NEW: buildMateriRows — shared materi row construction        */
/* ============================================================ */

/** A materi row used by both landscape matrix and merdeka formats. */
export type PromesMateriRow = {
  key: string;
  rowNum: number;
  /** Elemen/TP label (landscape matrix format) */
  elemen: string;
  /** Kode TP label (merdeka format) */
  kodeTP: string;
  /** Materi Pokok label */
  materi: string;
  intraJP: number;
  totalJP: number;
  unitId: string;
};

/**
 * Transform UnitDistribution[] into display rows needed by BOTH
 * landscape matrix and merdeka formats. Previously each document
 * built these independently with nearly identical logic.
 *
 * Priority chain for Elemen/TP column:
 *   learningOutcome (best — genuine TP text) → code (OK — element code like "TP 7.1")
 *   → compactPromesElemen(title) (fallback — abbreviated title)
 *
 * Priority chain for Kode TP column (merdeka-specific):
 *   code → compactPromesMaterial(learningOutcome, 3) → compactPromesElemen(title, 3)
 */
export function buildMateriRows(distribution: UnitDistribution[]): PromesMateriRow[] {
  if (distribution.length === 0) {
    return [{ key: "empty", rowNum: 1, elemen: "-", kodeTP: "-", materi: "Belum ada materi terdistribusi", intraJP: 0, totalJP: 0, unitId: "" }];
  }

  return distribution.map((unit, i) => ({
    key: unit.unitId,
    rowNum: i + 1,
    // Elemen column: learningOutcome → code → abbreviated title
    elemen: unit.learningOutcome
      ? compactPromesMaterial(unit.learningOutcome, 5)
      : unit.code
        ? unit.code
        : compactPromesElemen(unit.title, 3),
    // Kode TP column: code → abbreviated learningOutcome → abbreviated title
    kodeTP: unit.code
      ? unit.code
      : unit.learningOutcome
        ? compactPromesMaterial(unit.learningOutcome, 3)
        : compactPromesElemen(unit.title, 3),
    materi: compactPromesMaterial(unit.title, 7),
    intraJP: unit.totalJP,
    totalJP: unit.totalJP,
    unitId: unit.unitId,
  }));
}

/* ============================================================ */
/*  NEW: classifyPromesWeek — unified event classification       */
/* ============================================================ */

/** Combined week event info with both landscape & merdeka classification. */
export type PromesWeekEventInfo = {
  /** Legacy landscape event kind + label */
  landscape: PromesLandscapeEventColumn | null;
  /** Merdeka event definition (badge + column class) */
  merdeka: MerdekaEventDef | null;
};

/**
 * Classify a week's event in ONE pass, producing both the legacy
 * landscape event column AND the merdeka event definition.
 * This replaces the need to call both getPromesLandscapeCalendarEvent()
 * and detectMerdekaEventKind() separately — they had overlapping logic.
 */
export function classifyPromesWeek(week: PromesWeek): PromesWeekEventInfo {
  const landscape = getPromesLandscapeCalendarEvent(week);
  const merdeka = detectMerdekaEventKind(week);
  return { landscape, merdeka };
}

/* ============================================================ */
/*  Text compacting helpers                                      */
/* ============================================================ */

export function compactPromesMaterial(text: string, maxWords = 7): string {
  const cleaned = (text || "-")
    .replace(/\s+/g, " ")
    .replace(/^tp\s*\d+(\.\d+)?\s*[:.\-–—]?\s*/i, "")
    .trim();

  if (!cleaned || cleaned === "-") return "-";

  const parts = cleaned.split(/\s[–—-]\s/).map((p) => p.trim()).filter(Boolean);
  const candidate = parts.length > 1 ? parts[parts.length - 1] : cleaned;

  const words = candidate.split(" ").filter(Boolean);
  if (words.length <= maxWords) return candidate;

  return `${words.slice(0, maxWords).join(" ")}…`;
}

/**
 * PROMES-ELEMEN-TP-05: Compact Elemen/TP column content.
 * Produces clearly different content from the Materi column:
 * - If title has a "TP X.Y" prefix, extract and show just the TP code ("TP 7.1")
 * - Otherwise, show a very abbreviated version (max 3 words)
 * - This makes Elemen visually distinct from Materi (max 7 words)
 */
export function compactPromesElemen(text: string, maxWords = 3): string {
  if (!text || text === "-") return "-";
  const cleaned = text.replace(/\s+/g, " ").trim();

  // If title has a "TP X.Y" prefix (e.g. "TP 7.1 - Memahami prinsip..."), extract just the TP code
  const tpMatch = cleaned.match(/^tp\s*\d+(\.\d+)*/i);
  if (tpMatch) {
    return tpMatch[0].toUpperCase(); // "TP 7.1"
  }

  // No TP prefix — show very abbreviated version (max 3 words) to differentiate from Materi
  const words = cleaned.split(" ").filter(Boolean);
  if (words.length <= maxWords) return cleaned;
  return `${words.slice(0, maxWords).join(" ")}…`;
}

/* ============================================================ */
/*  Landscape event classification (legacy — kept for compat)    */
/* ============================================================ */

export type PromesLandscapeEventKind = "learning" | "assessment" | "scopeAssessment" | "remedial" | "kokurikuler" | "holiday" | "other";

export type PromesLandscapeEventColumn = {
  kind: PromesLandscapeEventKind;
  label: string;
};

export const PROMES_LEGEND_ITEMS: Array<{ kind: PromesLandscapeEventKind; label: string }> = [
  { kind: "learning", label: "Kegiatan belajar mengajar" },
  { kind: "assessment", label: "Asesmen sumatif tengah dan akhir semester" },
  { kind: "scopeAssessment", label: "Asesmen sumatif lingkup materi" },
  { kind: "kokurikuler", label: "Kokurikuler" },
  { kind: "remedial", label: "Remedial" },
  { kind: "holiday", label: "Libur semester / hari libur" },
  { kind: "other", label: "Kegiatan sekolah khusus" },
];

export function promesEventClassName(kind: PromesLandscapeEventKind): string {
  return `promes-event-${kind}`;
}

export function compactEventLabel(label: string): string {
  const normalized = label.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (/libur/i.test(normalized) && normalized.length > 26) return normalized;
  if (normalized.length <= 34) return normalized;
  return `${normalized.slice(0, 31)}…`;
}

export function getPromesLandscapeCalendarEvent(week: PromesWeek): PromesLandscapeEventColumn | null {
  const rawLabel = (week.blockReason || (week.calendarKind ? promesCalendarKindLabel(week.calendarKind) : "")).trim();
  const lower = rawLabel.toLowerCase();

  if (week.calendarKind === "libur") {
    return { kind: "holiday", label: compactEventLabel(rawLabel || "Libur") };
  }

  if (week.calendarKind === "pts" || week.calendarKind === "pas") {
    return { kind: "assessment", label: compactEventLabel(rawLabel || promesCalendarKindLabel(week.calendarKind)) };
  }

  if (week.calendarKind === "remedial") {
    return { kind: "remedial", label: compactEventLabel(rawLabel || "Remedial") };
  }

  if (week.calendarKind === "p5") {
    return { kind: "kokurikuler", label: "Kokurikuler" };
  }

  if (week.calendarKind === "other" && rawLabel) {
    if (/asesmen|sumatif|lingkup/.test(lower)) {
      return { kind: "scopeAssessment", label: compactEventLabel(rawLabel) };
    }
    return { kind: "other", label: compactEventLabel(rawLabel) };
  }

  return null;
}

/* ============================================================ */
/*  PROMES-VARIASI-01: Kurikulum Merdeka event definitions       */
/* ============================================================ */

export type MerdekaEventKind = "mpls" | "hut" | "sts" | "sas" | "cm" | "rl" | "holiday" | "remedial" | "kokurikuler" | "other";

export type MerdekaEventDef = {
  key: MerdekaEventKind;
  label: string;
  title: string;
  badgeClass: string;
  colClass: string;
};

export const MERDEKA_EVENTS: Record<string, MerdekaEventDef> = {
  mpls: { key: "mpls", label: "[M]", title: "Masa Pengenalan Lingkungan Sekolah", badgeClass: "merdeka-badge-mpls", colClass: "merdeka-col-mpls" },
  hut:  { key: "hut",  label: "[H]", title: "HUT RI / Libur Nasional", badgeClass: "merdeka-badge-hut", colClass: "merdeka-col-hut" },
  sts:  { key: "sts",  label: "[STS]", title: "Sumatif Tengah Semester", badgeClass: "merdeka-badge-sts", colClass: "merdeka-col-sts" },
  sas:  { key: "sas",  label: "[SAS]", title: "Sumatif Akhir Semester", badgeClass: "merdeka-badge-sas", colClass: "merdeka-col-sas" },
  cm:   { key: "cm",   label: "[CM]", title: "Class Meeting & Pengolahan Nilai", badgeClass: "merdeka-badge-cm", colClass: "merdeka-col-cm" },
  rl:   { key: "rl",   label: "[R/L]", title: "Pembagian Rapor & Libur Semester", badgeClass: "merdeka-badge-rl", colClass: "merdeka-col-rl" },
  remedial: { key: "remedial", label: "[Rem]", title: "Remedial", badgeClass: "merdeka-badge-remedial", colClass: "merdeka-col-remedial" },
  kokurikuler: { key: "kokurikuler", label: "[KO]", title: "Kokurikuler / P5", badgeClass: "merdeka-badge-kokurikuler", colClass: "merdeka-col-kokurikuler" },
  holiday: { key: "holiday", label: "[L]", title: "Libur", badgeClass: "merdeka-badge-holiday", colClass: "merdeka-col-holiday" },
  other: { key: "other", label: "[*]", title: "Kegiatan Sekolah Khusus", badgeClass: "merdeka-badge-other", colClass: "merdeka-col-other" },
};

export function detectMerdekaEventKind(week: PromesWeek): MerdekaEventDef | null {
  const rawLabel = (week.blockReason || (week.calendarKind ? promesCalendarKindLabel(week.calendarKind) : "")).trim();
  const lower = rawLabel.toLowerCase();

  if (week.calendarKind === "pts") return MERDEKA_EVENTS.sts;
  if (week.calendarKind === "pas") return MERDEKA_EVENTS.sas;
  if (week.calendarKind === "p5") return MERDEKA_EVENTS.kokurikuler;
  if (week.calendarKind === "remedial") return MERDEKA_EVENTS.remedial;

  if (week.calendarKind === "libur") {
    if (/hut|17\s*agustus|kemerdekaan|nasion/.test(lower)) return MERDEKA_EVENTS.hut;
    if (/rapor|libur\s*semester|semester\s*akhir/.test(lower)) return MERDEKA_EVENTS.rl;
    if (/class\s*meeting|pengolahan\s*nilai/.test(lower)) return MERDEKA_EVENTS.cm;
    return MERDEKA_EVENTS.holiday;
  }

  if (week.calendarKind === "other" && rawLabel) {
    if (/mpls|pengenalan\s*lingkungan|morient/.test(lower)) return MERDEKA_EVENTS.mpls;
    if (/class\s*meeting|pengolahan\s*nilai/.test(lower)) return MERDEKA_EVENTS.cm;
    if (/asesmen|sumatif|lingkup/.test(lower)) return MERDEKA_EVENTS.sts;
    return MERDEKA_EVENTS.other;
  }

  return null;
}

/* ============================================================ */
/*  Helper: pure cadangan week check                             */
/* ============================================================ */

/**
 * Cek apakah minggu HANYA cadangan
 * (reservedForCadangan > 0, tidak ada materi, tidak ada event kalender).
 */
export function isPureCadanganWeek(week: PromesWeek): boolean {
  return (
    week.reservedForCadangan > 0 &&
    week.assignedUnits.length === 0 &&
    !week.calendarKind
  );
}

/* ============================================================ */
/*  NEW: week cell rendering helpers                             */
/* ============================================================ */

/** What kind of content a week cell should display, based on context. */
export type WeekCellContext = "materi" | "effective" | "cadangan" | "kokurikuler" | "total" | "agenda";

/**
 * Determine what content to show in a week cell for the LANDSCAPE MATRIX format.
 * Returns a simple object describing the cell — the component just renders it.
 *
 * @param lookup     - The pre-built week lookup
 * @param weekNumber - Which week column
 * @param unitId     - Unit ID (only for materi context)
 * @param rowIndex   - Row index (0 = first materi row, for event badge placement)
 * @param context    - What kind of row this cell is in
 */
export type WeekCellResult = {
  /** CSS class names to apply */
  className: string;
  /** Content to render inside the cell */
  content: React.ReactNode;
  /** Tooltip title (for event cells) */
  title?: string;
};

export function resolveLandscapeWeekCell(
  lookup: PromesWeekLookup,
  weekNumber: number,
  context: WeekCellContext,
  unitId?: string,
  rowIndex?: number,
): WeekCellResult {
  const event = lookup.landscapeEventByWeek.get(weekNumber) ?? null;
  const week = lookup.weekByNumber.get(weekNumber);
  const isFirstRow = rowIndex === 0;

  // Event weeks: show background color + badge (only first materi row gets text)
  if (event) {
    const cssClass = promesEventClassName(event.kind);
    if (context === "materi") {
      return {
        className: `week-cell ${isFirstRow ? "promes-event-cell" : ""} ${cssClass}`,
        content: isFirstRow ? <span className="promes-vertical-label">{event.label}</span> : "",
        title: event.label,
      };
    }
    // Summary rows: just background color, no text
    return { className: `week-cell ${cssClass}`, content: "" };
  }

  // Non-event weeks: content depends on context
  switch (context) {
    case "materi": {
      const unitJP = unitId ? getUnitJPInWeek(lookup, unitId, weekNumber) : 0;
      const isAssigned = unitJP > 0;
      return {
        className: `week-cell ${isAssigned ? "promes-event-learning" : ""}`,
        content: isAssigned ? unitJP : "",
      };
    }
    case "effective":
      return {
        className: "week-cell",
        content: week?.isEffective ? week.intraCapacityJP : "",
      };
    case "cadangan":
      return {
        className: "week-cell",
        content: (week?.reservedForCadangan ?? 0) > 0 ? "C" : "",
      };
    case "kokurikuler":
      return {
        className: `week-cell ${(week?.koJP ?? 0) > 0 ? "promes-event-kokurikuler" : ""}`,
        content: (week?.koJP ?? 0) > 0 ? week!.koJP : "",
      };
    case "total": {
      const totalWeekJP = (week?.isEffective ? week.intraCapacityJP : 0) + (week?.koJP ?? 0) + (week?.reservedForCadangan ?? 0);
      return {
        className: "week-cell",
        content: week?.isEffective ? totalWeekJP : "",
      };
    }
    default:
      return { className: "week-cell", content: "" };
  }
}

/**
 * Determine what content to show in a week cell for the MERDEKA format.
 * Returns a simple object describing the cell.
 */
export function resolveMerdekaWeekCell(
  lookup: PromesWeekLookup,
  weekNumber: number,
  context: WeekCellContext,
  unitId?: string,
  rowIndex?: number,
): WeekCellResult {
  const eventInfo = lookup.weekEventInfoByWeek.get(weekNumber);
  const merdekaEvent = eventInfo?.merdeka ?? null;
  const week = lookup.weekByNumber.get(weekNumber);
  const isFirstRow = rowIndex === 0;

  // Event weeks: show badge/column background
  if (merdekaEvent) {
    if (context === "materi") {
      return {
        className: `merdeka-td ${merdekaEvent.colClass}`,
        content: isFirstRow ? <span className={`merdeka-badge ${merdekaEvent.badgeClass}`}>{merdekaEvent.label}</span> : "",
        title: merdekaEvent.title,
      };
    }
    if (context === "agenda") {
      return {
        className: "merdeka-td merdeka-td-agenda-cell",
        content: <span className={`merdeka-badge ${merdekaEvent.badgeClass}`}>{merdekaEvent.label}</span>,
      };
    }
    if (context === "total") {
      return { className: "merdeka-td merdeka-td-total-event", content: "-" };
    }
    // Cadangan/kokurikuler: just column background, no text
    return { className: `merdeka-td ${merdekaEvent.colClass}`, content: "" };
  }

  // Non-event weeks: content depends on context
  switch (context) {
    case "materi": {
      const unitJP = unitId ? getUnitJPInWeek(lookup, unitId, weekNumber) : 0;
      return {
        className: "merdeka-td",
        content: unitJP > 0 ? unitJP : "-",
      };
    }
    case "cadangan":
      return {
        className: "merdeka-td merdeka-td-cadangan",
        content: (week?.reservedForCadangan ?? 0) > 0 ? "C" : "-",
      };
    case "kokurikuler":
      return {
        className: "merdeka-td merdeka-td-koku-val",
        content: (week?.koJP ?? 0) > 0 ? week!.koJP : "-",
      };
    case "total": {
      const totalWeekJP = (week?.isEffective ? week.intraCapacityJP : 0) + (week?.koJP ?? 0) + (week?.reservedForCadangan ?? 0);
      return {
        className: "merdeka-td merdeka-td-total-val",
        content: week?.isEffective ? (totalWeekJP > 0 ? totalWeekJP : "-") : "-",
      };
    }
    case "agenda":
      return { className: "merdeka-td", content: "-" };
    default:
      return { className: "merdeka-td", content: "" };
  }
}
