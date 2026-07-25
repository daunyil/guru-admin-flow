/**
 * Shared helpers for Promes module — v5 (Document-Centric Formal)
 *
 * Contains BOTH legacy (matrix) and merdeka (document-centric) helpers:
 *   - Legacy: buildMateriRows + resolveLandscapeWeekCell → PromesLandscapeMatrixDocument
 *   - Merdeka: buildMateriRowsWithElements + resolveMerdekaWeekCell → PromesMerdekaDocument
 *
 * Key design rules (enforced in merdeka helpers):
 *   RULE 1: elemen = namaElemen, kodeTP = short code (max 10 chars), materi = full title
 *   RULE 2: schedule cells = numbers (0,1,2,3) or "-"; events = CSS bg only
 *   RULE 3: total JP per week = intraCapacityJP + koJP (NOT + reservedForCadangan)
 *   RULE 4: badge labels ONLY in "agenda" row, NOT in data cells
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
/*  buildWeekLookup — unified lookup for all 3 documents        */
/* ============================================================ */

/** Unified week lookup built once and shared across all document components. */
export type PromesWeekLookup = {
  weekByNumber: Map<number, PromesWeek>;
  landscapeEventByWeek: Map<number, PromesLandscapeEventColumn | null>;
  weekEventInfoByWeek: Map<number, PromesWeekEventInfo | null>;
  unitJPByWeek: Map<string, Map<number, number>>;
};

export function buildWeekLookup(weeks: PromesWeek[]): PromesWeekLookup {
  const weekByNumber = new Map<number, PromesWeek>();
  for (const w of weeks) weekByNumber.set(w.weekNumber, w);

  const landscapeEventByWeek = new Map<number, PromesLandscapeEventColumn | null>();
  for (const w of weeks) landscapeEventByWeek.set(w.weekNumber, getPromesLandscapeCalendarEvent(w));

  const weekEventInfoByWeek = new Map<number, PromesWeekEventInfo | null>();
  for (const w of weeks) weekEventInfoByWeek.set(w.weekNumber, classifyPromesWeek(w));

  const unitJPByWeek = new Map<string, Map<number, number>>();
  for (const w of weeks) {
    for (const au of w.assignedUnits) {
      if (!unitJPByWeek.has(au.unitId)) unitJPByWeek.set(au.unitId, new Map());
      unitJPByWeek.get(au.unitId)!.set(w.weekNumber, au.jp);
    }
  }

  return { weekByNumber, landscapeEventByWeek, weekEventInfoByWeek, unitJPByWeek };
}

export function getUnitJPInWeek(lookup: PromesWeekLookup, unitId: string, weekNumber: number): number {
  return lookup.unitJPByWeek.get(unitId)?.get(weekNumber) ?? 0;
}

/* ============================================================ */
/*  v5 (Document-Centric): buildMateriRowsWithElements — proper */
/*  and grouping with rowSpan for Elemen column                 */
/* ============================================================ */

/**
 * v5 RULE 1: STRICT data field separation.
 *
 * - Elemen column: `code` field if it looks like an element name,
 *   otherwise VERY abbreviated learningOutcome (max 3 words).
 *   NEVER use full title for Elemen.
 *
 * - KodeTP column: `code` field if it looks like a TP code ("TP 7.1"),
 *   otherwise abbreviated code. Max 10 chars. NEVER use full title or learningOutcome.
 *
 * - Materi column: `title` field — full text, abbreviated to max 7 words.
 *
 * Groups rows by element for rowSpan rendering.
 */
export type PromesElementGroup = {
  /** Unique key for this element group */
  elemenKey: string;
  /** Display name for the Elemen column (e.g., "Pancasila", "Bhinneka Tunggal Ika") */
  namaElemen: string;
  /** How many TP rows this element spans (for rowSpan) */
  tpCount: number;
  /** Individual TP rows within this element */
  tps: PromesMateriRow[];
};

/** A single TP row within an element group. */
export type PromesMateriRow = {
  key: string;
  rowNum: number;
  /** Kode TP — SHORT CODE ONLY, max 10 chars (e.g., "TP 7.1", "SLM 1") */
  kodeTP: string;
  /** Materi Pokok — FULL topic title */
  materi: string;
  intraJP: number;
  totalJP: number;
  unitId: string;
};

/**
 * Extract element name from a code string.
 * If code is like "TP 7.1" → extract "TP 7" as element prefix
 * If code is like "Pancasila" or "Bhinneka Tunggal Ika" → use as-is
 * If no code → use abbreviated learningOutcome or title
 */
function extractElemenName(code: string | undefined, learningOutcome: string | undefined, title: string): string {
  if (code) {
    // If code is a TP-style code like "TP 7.1", extract the element prefix "TP 7"
    const tpMatch = code.match(/^([A-Z]{1,4}\s*\d+)(\.\d+)?$/i);
    if (tpMatch) return tpMatch[1].toUpperCase(); // "TP 7"

    // If code is an element name like "Pancasila", "Bhinneka Tunggal Ika", use as-is
    if (code.length <= 30) return code;
  }

  // Fallback: abbreviated learningOutcome (max 3 words)
  if (learningOutcome) return compactText(learningOutcome, 3);

  // Last fallback: abbreviated title (max 3 words)
  return compactText(title, 3);
}

/**
 * Extract KodeTP — SHORT CODE ONLY.
 * RULE 1: kodeTP MUST be a short code like "TP 7.1", max 10 chars.
 * NEVER use full title or learningOutcome for this column.
 */
function extractKodeTP(code: string | undefined, title: string): string {
  if (code) {
    // If code already looks like a short code (max 10 chars), use as-is
    if (code.length <= 10) return code;

    // Otherwise abbreviate to 10 chars
    return code.slice(0, 10);
  }

  // Fallback: Try to extract TP code from title
  const tpMatch = title.match(/^tp\s*\d+(\.\d+)*/i);
  if (tpMatch) return tpMatch[0].toUpperCase();

  // Last fallback: first 10 chars of abbreviated title
  return compactText(title, 3).slice(0, 10);
}

/** Compact text to max words */
function compactText(text: string, maxWords: number): string {
  if (!text || text === "-") return "-";
  const cleaned = text.replace(/\s+/g, " ").replace(/^tp\s*\d+(\.\d+)?\s*[:.\-–—]?\s*/i, "").trim();
  if (!cleaned || cleaned === "-") return "-";

  const parts = cleaned.split(/\s[–—-]\s/).map((p) => p.trim()).filter(Boolean);
  const candidate = parts.length > 1 ? parts[parts.length - 1] : cleaned;

  const words = candidate.split(" ").filter(Boolean);
  if (words.length <= maxWords) return candidate;
  return `${words.slice(0, maxWords).join(" ")}…`;
}

/**
 * Build element groups from UnitDistribution[].
 * Groups units by their element (extracted from code prefix),
 * and properly separates Elemen/KodeTP/Materi fields.
 */
export function buildMateriRowsWithElements(distribution: UnitDistribution[]): PromesElementGroup[] {
  if (distribution.length === 0) {
    return [{
      elemenKey: "empty",
      namaElemen: "-",
      tpCount: 1,
      tps: [{ key: "empty", rowNum: 1, kodeTP: "-", materi: "Belum ada materi terdistribusi", intraJP: 0, totalJP: 0, unitId: "" }],
    }];
  }

  // Step 1: Build rows with proper field separation
  const rows = distribution.map((unit, i) => ({
    elemenName: extractElemenName(unit.code, unit.learningOutcome, unit.title),
    row: {
      key: unit.unitId,
      rowNum: i + 1,
      kodeTP: extractKodeTP(unit.code, unit.title),
      materi: compactText(unit.title, 7),
      intraJP: unit.totalJP,
      totalJP: unit.totalJP,
      unitId: unit.unitId,
    },
  }));

  // Step 2: Group by element name
  const groupMap = new Map<string, PromesElementGroup>();
  let rowNum = 1;

  for (const { elemenName, row } of rows) {
    if (!groupMap.has(elemenName)) {
      groupMap.set(elemenName, {
        elemenKey: `elem-${elemenName}`,
        namaElemen: elemenName,
        tpCount: 0,
        tps: [],
      });
    }
    const group = groupMap.get(elemenName)!;
    row.rowNum = rowNum++;
    group.tps.push(row);
    group.tpCount++;
  }

  return Array.from(groupMap.values());
}

/**
 * Legacy flat row builder — kept for backward compat with landscape matrix format.
 * v5 RULE 1: Elemen/KodeTP/Materi now use STRICTLY DIFFERENT data.
 */
export function buildMateriRows(distribution: UnitDistribution[]): PromesMateriRowLegacy[] {
  if (distribution.length === 0) {
    return [{ key: "empty", rowNum: 1, elemen: "-", kodeTP: "-", materi: "Belum ada materi terdistribusi", intraJP: 0, totalJP: 0, unitId: "" }];
  }

  return distribution.map((unit, i) => ({
    key: unit.unitId,
    rowNum: i + 1,
    // v5 RULE 1: Elemen = element name (NOT full title/learningOutcome)
    elemen: extractElemenName(unit.code, unit.learningOutcome, unit.title),
    // v5 RULE 1: KodeTP = short code only (max 10 chars, NOT full title)
    kodeTP: extractKodeTP(unit.code, unit.title),
    // v5 RULE 1: Materi = full title (abbreviated to 7 words max)
    materi: compactText(unit.title, 7),
    intraJP: unit.totalJP,
    totalJP: unit.totalJP,
    unitId: unit.unitId,
  }));
}

/** Legacy flat row type — kept for backward compat */
export type PromesMateriRowLegacy = {
  key: string;
  rowNum: number;
  elemen: string;
  kodeTP: string;
  materi: string;
  intraJP: number;
  totalJP: number;
  unitId: string;
};

/* ============================================================ */
/*  v5 (Document-Centric): resolveMerdekaWeekCell — NUMERIC-ONLY */
/*                                                              */
/*  RULE 2: All content cells MUST contain numbers (0,1,2,3)   */
/*  or "-". NEVER insert string chars like 'C','M','H'.        */
/*  Events shown ONLY via CSS background + badge overlay on     */
/*  agenda row (not in data cells).                            */
/* ============================================================ */

export type PromesWeekEventInfo = {
  landscape: PromesLandscapeEventColumn | null;
  merdeka: MerdekaEventDef | null;
};

export function classifyPromesWeek(week: PromesWeek): PromesWeekEventInfo {
  const landscape = getPromesLandscapeCalendarEvent(week);
  const merdeka = detectMerdekaEventKind(week);
  return { landscape, merdeka };
}

/** What kind of content a week cell should display, based on context. */
export type WeekCellContext = "materi" | "effective" | "cadangan" | "kokurikuler" | "total" | "agenda";

export type WeekCellResult = {
  className: string;
  content: React.ReactNode;
  title?: string;
};

/**
 * v5 (Document-Centric Formal): resolveMerdekaWeekCell — STRICT numeric-only cells.
 *
 * v5 key rules (enforced since Blueprint redesign):
 *   RULE 2: Total JP per week = intraCapacityJP + koJP ONLY.
 *     NEVER add reservedForCadangan separately (it's subset of intraCapacityJP).
 *     Max per KBM week = 3 JP (2 Intra + 1 P5). Event weeks = "-".
 *   RULE 3: NO badge/vertical text in materi/cadangan/koku schedule cells.
 *     Event weeks = CSS background ONLY, content = null/empty.
 *     Badge labels ONLY in "agenda" row (AGENDA NON-KBM).
 *
 * Content rules:
 * - Cadangan cells: numeric JP value (1, 2), NOT 'C' string
 * - Event cells in materi rows: CSS background ONLY, content = null/empty
 * - Event cells in cadangan/koku/total rows: CSS background, content = null/empty
 * - Event cells in agenda row: badge label (ONLY this row shows badges)
 * - Non-event materi cells: numeric JP (2) or "-"
 * - Total cells: intraCapacityJP + koJP (NOT + reservedForCadangan)
 */
export function resolveMerdekaWeekCell(
  lookup: PromesWeekLookup,
  weekNumber: number,
  context: WeekCellContext,
  unitId?: string,
): WeekCellResult {
  const eventInfo = lookup.weekEventInfoByWeek.get(weekNumber);
  const merdekaEvent = eventInfo?.merdeka ?? null;
  const week = lookup.weekByNumber.get(weekNumber);

  // ---- Event weeks: CSS background ONLY, NO badges in data rows ----
  // v5 RULE 3: Badges ONLY in "agenda" row. Data rows = CSS bg + null content.
  if (merdekaEvent) {
    if (context === "materi") {
      // v5 RULE 3: NO badge overlay even on first row.
      // Event weeks in materi rows: CSS background ONLY, null content.
      return {
        className: `merdeka-td ${merdekaEvent.colClass}`,
        content: null,
        title: merdekaEvent.title,
      };
    }
    if (context === "agenda") {
      // Agenda row: BADGES ONLY HERE (BUG #3)
      return {
        className: "merdeka-td merdeka-td-agenda-cell",
        content: <span className={`merdeka-badge ${merdekaEvent.badgeClass}`}>{merdekaEvent.label}</span>,
      };
    }
    if (context === "total") {
      // Total row: show "-" for event weeks (no KBM)
      return { className: "merdeka-td merdeka-td-total-event", content: "-" };
    }
    // Cadangan/kokurikuler/effective rows on event weeks: CSS background, null content
    return { className: `merdeka-td ${merdekaEvent.colClass}`, content: null };
  }

  // ---- Non-event weeks: content depends on context ----
  switch (context) {
    case "materi": {
      // v5 RULE 2: numeric JP value ONLY, or "-" if none assigned
      const unitJP = unitId ? getUnitJPInWeek(lookup, unitId, weekNumber) : 0;
      return {
        className: "merdeka-td",
        content: unitJP > 0 ? unitJP : "-",
      };
    }
    case "cadangan": {
      // v5 RULE 2: numeric JP value, NOT 'C' string!
      const cadanganJP = week?.reservedForCadangan ?? 0;
      return {
        className: "merdeka-td merdeka-td-cadangan",
        content: cadanganJP > 0 ? cadanganJP : "-",
      };
    }
    case "kokurikuler": {
      // v5 RULE 2: numeric JP value
      const koJP = week?.koJP ?? 0;
      return {
        className: "merdeka-td merdeka-td-koku-val",
        content: koJP > 0 ? koJP : "-",
      };
    }
    case "total": {
      // v5 RULE 2: Total = intraCapacityJP + koJP ONLY.
      // NEVER add reservedForCadangan separately — it's a SUBSET of intraCapacityJP.
      // On KBM week: 2 + 1 = 3 JP. On event week: already handled above.
      const intraJP = week?.isEffective ? week.intraCapacityJP : 0;
      const p5JP = week?.koJP ?? 0;
      const totalJP = intraJP + p5JP;
      return {
        className: "merdeka-td merdeka-td-total-val",
        content: week?.isEffective ? (totalJP > 0 ? totalJP : "-") : "-",
      };
    }
    case "agenda":
      // No event for this week: show "-"
      return { className: "merdeka-td", content: "-" };
    default:
      return { className: "merdeka-td", content: "" };
  }
}

/**
 * Legacy landscape format resolver — kept for backward compat.
 * v5 fix applied: cadangan cells now show numeric JP, not 'C'.
 */
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

  if (event) {
    const cssClass = promesEventClassName(event.kind);
    if (context === "materi") {
      return {
        className: `week-cell ${isFirstRow ? "promes-event-cell" : ""} ${cssClass}`,
        content: isFirstRow ? <span className="promes-vertical-label">{event.label}</span> : "",
        title: event.label,
      };
    }
    return { className: `week-cell ${cssClass}`, content: "" };
  }

  switch (context) {
    case "materi": {
      const unitJP = unitId ? getUnitJPInWeek(lookup, unitId, weekNumber) : 0;
      return { className: `week-cell ${unitJP > 0 ? "promes-event-learning" : ""}`, content: unitJP > 0 ? unitJP : "" };
    }
    case "effective":
      return { className: "week-cell", content: week?.isEffective ? week.intraCapacityJP : "" };
    case "cadangan": {
      // v5 fix: numeric value, not 'C' string
      const cadanganJP = week?.reservedForCadangan ?? 0;
      return { className: "week-cell", content: cadanganJP > 0 ? cadanganJP : "" };
    }
    case "kokurikuler": {
      const koJP = week?.koJP ?? 0;
      return { className: `week-cell ${koJP > 0 ? "promes-event-kokurikuler" : ""}`, content: koJP > 0 ? koJP : "" };
    }
    case "total": {
      const intraJP = week?.isEffective ? week.intraCapacityJP : 0;
      const cadanganJP = week?.reservedForCadangan ?? 0;
      const p5JP = week?.koJP ?? 0;
      const totalWeekJP = intraJP + cadanganJP + p5JP;
      return { className: "week-cell", content: week?.isEffective ? totalWeekJP : "" };
    }
    default:
      return { className: "week-cell", content: "" };
  }
}

/* ============================================================ */
/*  Legacy helpers (kept for backward compat)                    */
/* ============================================================ */

export function compactPromesMaterial(text: string, maxWords = 7): string {
  return compactText(text, maxWords);
}

export function compactPromesElemen(text: string, maxWords = 3): string {
  return compactText(text, maxWords);
}

export type PromesLandscapeEventKind = "learning" | "assessment" | "scopeAssessment" | "remedial" | "kokurikuler" | "holiday" | "other";
export type PromesLandscapeEventColumn = { kind: PromesLandscapeEventKind; label: string; };

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
  if (normalized.length <= 34) return normalized;
  return `${normalized.slice(0, 31)}…`;
}

export function getPromesLandscapeCalendarEvent(week: PromesWeek): PromesLandscapeEventColumn | null {
  const rawLabel = (week.blockReason || (week.calendarKind ? promesCalendarKindLabel(week.calendarKind) : "")).trim();
  const lower = rawLabel.toLowerCase();

  if (week.calendarKind === "libur") return { kind: "holiday", label: compactEventLabel(rawLabel || "Libur") };
  if (week.calendarKind === "pts" || week.calendarKind === "pas") return { kind: "assessment", label: compactEventLabel(rawLabel || promesCalendarKindLabel(week.calendarKind)) };
  if (week.calendarKind === "remedial") return { kind: "remedial", label: compactEventLabel(rawLabel || "Remedial") };
  if (week.calendarKind === "p5") return { kind: "kokurikuler", label: "Kokurikuler" };
  if (week.calendarKind === "other" && rawLabel) {
    if (/asesmen|sumatif|lingkup/.test(lower)) return { kind: "scopeAssessment", label: compactEventLabel(rawLabel) };
    return { kind: "other", label: compactEventLabel(rawLabel) };
  }
  return null;
}

/* ============================================================ */
/*  Merdeka event definitions                                    */
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

export function isPureCadanganWeek(week: PromesWeek): boolean {
  return week.reservedForCadangan > 0 && week.assignedUnits.length === 0 && !week.calendarKind;
}
