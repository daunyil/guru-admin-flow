/**
 * resolveMerdekaWeekCell Contract Test — B2.1–B2.8
 *
 * Tests the v5 (Document-Centric Formal) cell resolver against
 * all spec IDs defined in PROMES-WORKFLOW-STANDARDS.md §3.3.
 *
 * Spec References:
 *   CELL-01: materi context (event = CSS bg + null content; non-event = unitJP or "-")
 *   CELL-02: cadangan context (numeric JP, NOT "C" string)
 *   CELL-03: kokurikuler context (numeric koJP)
 *   CELL-04: total context (event = "-"; non-event = intraJP + koJP)
 *   CELL-05: agenda context (event = badge span; non-event = "-")
 *   BR-01: Total JP per KBM week = intraCapacityJP + koJP
 *   BR-02: reservedForCadangan is SUBSET of intraCapacityJP (NOT added to total)
 *   BR-08: Badge/vertical text DITOLAK in materi/cadangan/koku cells
 *   BR-09: Badge labels ONLY in agenda row
 */

import { describe, it, expect } from "vitest";
import {
  resolveMerdekaWeekCell,
  buildWeekLookup,
  MERDEKA_EVENTS,
  type PromesWeekLookup,
  type WeekCellContext,
} from "../promes-helpers";
import type { PromesWeek } from "@guru-admin/domain";

/* ---- Test fixture builders ---- */

/** Build a mock PromesWeek with default KBM (learning) week properties */
function makeKBMWeek(weekNumber: number, overrides?: Partial<PromesWeek>): PromesWeek {
  return {
    weekNumber,
    startDate: `2026-07-${String(weekNumber * 7).padStart(2, "0")}`,
    isEffective: true,
    intraCapacityJP: 2,
    koJP: 1,
    reservedForCadangan: 0,
    assignedUnits: [
      { unitId: "unit-1", jp: 2 },
      { unitId: "unit-2", jp: 0 },
    ],
    calendarKind: null,
    blockReason: "",
    label: String(weekNumber),
    ...overrides,
  } as PromesWeek;
}

/** Build a mock PromesWeek with an event (STS) */
function makeSTSWeek(weekNumber: number): PromesWeek {
  return makeKBMWeek(weekNumber, {
    isEffective: false,
    intraCapacityJP: 0,
    koJP: 0,
    reservedForCadangan: 0,
    calendarKind: "pts",
    blockReason: "Sumatif Tengah Semester",
    assignedUnits: [],
  });
}

/** Build a mock PromesWeek with an event (SAS) */
function makeSASWeek(weekNumber: number): PromesWeek {
  return makeKBMWeek(weekNumber, {
    isEffective: false,
    intraCapacityJP: 0,
    koJP: 0,
    reservedForCadangan: 0,
    calendarKind: "pas",
    blockReason: "Sumatif Akhir Semester",
    assignedUnits: [],
  });
}

/** Build a mock PromesWeek with an event (MPLS) */
function makeMPLSWeek(weekNumber: number): PromesWeek {
  return makeKBMWeek(weekNumber, {
    isEffective: false,
    intraCapacityJP: 0,
    koJP: 0,
    reservedForCadangan: 0,
    calendarKind: "other",
    blockReason: "Masa Pengenalan Lingkungan Sekolah (MPLS)",
    assignedUnits: [],
  });
}

/** Build a lookup from an array of weeks */
function buildLookupFromWeeks(weeks: PromesWeek[]): PromesWeekLookup {
  return buildWeekLookup(weeks);
}

/* ============================================================ */
/*  B2.1: materi + event week (CELL-01 event side)              */
/* ============================================================ */

describe("resolveMerdekaWeekCell — CELL-01 (materi context)", () => {
  const stsWeek = makeSTSWeek(5);
  const kbmWeeks = [makeKBMWeek(1), makeKBMWeek(2), stsWeek, makeKBMWeek(4)];
  const lookup = buildLookupFromWeeks(kbmWeeks);

  it("B2.1a: materi + STS event week → className includes colClass, content = null", () => {
    const result = resolveMerdekaWeekCell(lookup, 5, "materi", "unit-1");
    // CELL-01: className MUST include the event col class
    expect(result.className).toContain(MERDEKA_EVENTS.sts.colClass);
    // CELL-01: content MUST be null (NOT badge text) — BR-08 enforcement
    expect(result.content).toBeNull();
    // CELL-01: title should carry the event title for tooltip
    expect(result.title).toBe(MERDEKA_EVENTS.sts.title);
  });

  it("B2.1b: materi + MPLS event week → className includes colClass, content = null", () => {
    const mplsWeek = makeMPLSWeek(3);
    const lookup = buildLookupFromWeeks([makeKBMWeek(1), mplsWeek, makeKBMWeek(4)]);
    const result = resolveMerdekaWeekCell(lookup, 3, "materi", "unit-1");
    expect(result.className).toContain(MERDEKA_EVENTS.mpls.colClass);
    expect(result.content).toBeNull(); // BR-08: NO badge in materi row
  });

  it("B2.1c: materi + KBM week + unitId with JP → content = unitJP number", () => {
    const result = resolveMerdekaWeekCell(lookup, 1, "materi", "unit-1");
    // CELL-01: non-event week, unit-1 has 2 JP in week 1
    expect(result.className).toBe("merdeka-td");
    expect(result.content).toBe(2);
  });

  it("B2.1d: materi + KBM week + unitId with 0 JP → content = \"-\"", () => {
    const result = resolveMerdekaWeekCell(lookup, 1, "materi", "unit-2");
    // unit-2 has 0 JP in week 1
    expect(result.content).toBe("-");
  });

  it("B2.1e: materi + KBM week + no unitId → content = \"-\"", () => {
    const result = resolveMerdekaWeekCell(lookup, 1, "materi");
    expect(result.content).toBe("-");
  });
});

/* ============================================================ */
/*  B2.2/B2.3: cadangan context (CELL-02)                       */
/* ============================================================ */

describe("resolveMerdekaWeekCell — CELL-02 (cadangan context)", () => {
  it("B2.2a: cadangan + KBM week + reservedForCadangan > 0 → content = numeric JP", () => {
    const week = makeKBMWeek(1, { reservedForCadangan: 1 });
    const lookup = buildLookupFromWeeks([week]);
    const result = resolveMerdekaWeekCell(lookup, 1, "cadangan");
    // CELL-02: MUST be numeric value (1), NOT "C" string
    expect(result.content).toBe(1);
    expect(result.className).toContain("merdeka-td-cadangan");
  });

  it("B2.2b: cadangan + KBM week + reservedForCadangan = 0 → content = \"-\"", () => {
    const week = makeKBMWeek(1, { reservedForCadangan: 0 });
    const lookup = buildLookupFromWeeks([week]);
    const result = resolveMerdekaWeekCell(lookup, 1, "cadangan");
    expect(result.content).toBe("-");
  });

  it("B2.2c: cadangan + event week → content = null (CSS bg only)", () => {
    const stsWeek = makeSTSWeek(5);
    const lookup = buildLookupFromWeeks([stsWeek]);
    const result = resolveMerdekaWeekCell(lookup, 5, "cadangan");
    // BR-08: NO badge/vertical text in cadangan cells
    expect(result.content).toBeNull();
  });
});

/* ============================================================ */
/*  B2.3: kokurikuler context (CELL-03)                         */
/* ============================================================ */

describe("resolveMerdekaWeekCell — CELL-03 (kokurikuler context)", () => {
  it("kokurikuler + KBM week + koJP > 0 → content = numeric koJP", () => {
    const week = makeKBMWeek(1, { koJP: 1 });
    const lookup = buildLookupFromWeeks([week]);
    const result = resolveMerdekaWeekCell(lookup, 1, "kokurikuler");
    // CELL-03: numeric koJP value
    expect(result.content).toBe(1);
    expect(result.className).toContain("merdeka-td-koku-val");
  });

  it("kokurikuler + KBM week + koJP = 0 → content = \"-\"", () => {
    const week = makeKBMWeek(1, { koJP: 0 });
    const lookup = buildLookupFromWeeks([week]);
    const result = resolveMerdekaWeekCell(lookup, 1, "kokurikuler");
    expect(result.content).toBe("-");
  });

  it("kokurikuler + event week → content = null (CSS bg only)", () => {
    const stsWeek = makeSTSWeek(5);
    const lookup = buildLookupFromWeeks([stsWeek]);
    const result = resolveMerdekaWeekCell(lookup, 5, "kokurikuler");
    expect(result.content).toBeNull(); // BR-08: NO badge in koku cells
  });
});

/* ============================================================ */
/*  B2.5/B2.6: total context (CELL-04 + BR-01/02)              */
/* ============================================================ */

describe("resolveMerdekaWeekCell — CELL-04 (total context)", () => {
  it("B2.5: total + event week → content = \"-\" (no KBM)", () => {
    const stsWeek = makeSTSWeek(5);
    const lookup = buildLookupFromWeeks([stsWeek]);
    const result = resolveMerdekaWeekCell(lookup, 5, "total");
    // CELL-04: event week = "-" (NOT 0)
    expect(result.content).toBe("-");
    expect(result.className).toContain("merdeka-td-total-event");
  });

  it("B2.6a: total + KBM week → content = intraJP + koJP (BR-01)", () => {
    const week = makeKBMWeek(1, { intraCapacityJP: 2, koJP: 1 });
    const lookup = buildLookupFromWeeks([week]);
    const result = resolveMerdekaWeekCell(lookup, 1, "total");
    // BR-01: Total = intraCapacityJP + koJP = 2 + 1 = 3 JP
    expect(result.content).toBe(3);
    expect(result.className).toContain("merdeka-td-total-val");
  });

  it("B2.6b: total + KBM week → reservedForCadangan NOT added separately (BR-02)", () => {
    const week = makeKBMWeek(1, { intraCapacityJP: 2, koJP: 1, reservedForCadangan: 1 });
    const lookup = buildLookupFromWeeks([week]);
    const result = resolveMerdekaWeekCell(lookup, 1, "total");
    // BR-02: reservedForCadangan is SUBSET of intraCapacityJP, NOT added to total
    // Total MUST still be 3 (2 + 1), NOT 4 (2 + 1 + 1)
    expect(result.content).toBe(3);
  });

  it("total + non-effective week (no calendarKind) → content = \"-\"", () => {
    const week = makeKBMWeek(1, { isEffective: false, intraCapacityJP: 0, koJP: 0, calendarKind: null, blockReason: "" });
    const lookup = buildLookupFromWeeks([week]);
    const result = resolveMerdekaWeekCell(lookup, 1, "total");
    expect(result.content).toBe("-");
  });
});

/* ============================================================ */
/*  B2.4: agenda context (CELL-05 + BR-09)                     */
/* ============================================================ */

describe("resolveMerdekaWeekCell — CELL-05 (agenda context)", () => {
  it("B2.4a: agenda + STS event week → badge span rendered", () => {
    const stsWeek = makeSTSWeek(5);
    const lookup = buildLookupFromWeeks([stsWeek]);
    const result = resolveMerdekaWeekCell(lookup, 5, "agenda");
    // CELL-05: agenda is ONLY context that shows badge <span>
    expect(result.className).toContain("merdeka-td-agenda-cell");
    // Content should be a React element (badge span)
    expect(result.content).not.toBeNull();
    expect(result.content).not.toBe("-");
  });

  it("B2.4b: agenda + SAS event week → badge span rendered", () => {
    const sasWeek = makeSASWeek(15);
    const lookup = buildLookupFromWeeks([sasWeek]);
    const result = resolveMerdekaWeekCell(lookup, 15, "agenda");
    expect(result.className).toContain("merdeka-td-agenda-cell");
    expect(result.content).not.toBeNull();
  });

  it("B2.4c: agenda + MPLS event week → badge span rendered", () => {
    const mplsWeek = makeMPLSWeek(1);
    const lookup = buildLookupFromWeeks([mplsWeek]);
    const result = resolveMerdekaWeekCell(lookup, 1, "agenda");
    expect(result.className).toContain("merdeka-td-agenda-cell");
    expect(result.content).not.toBeNull();
  });

  it("B2.4d: agenda + non-event week → content = \"-\"", () => {
    const kbmWeek = makeKBMWeek(1);
    const lookup = buildLookupFromWeeks([kbmWeek]);
    const result = resolveMerdekaWeekCell(lookup, 1, "agenda");
    // CELL-05: no event = "-"
    expect(result.content).toBe("-");
    expect(result.className).toBe("merdeka-td");
  });
});

/* ============================================================ */
/*  Additional: cross-context enforcement (BR-08/09)            */
/* ============================================================ */

describe("resolveMerdekaWeekCell — BR-08/09 enforcement (no badges outside agenda)", () => {
  const stsWeek = makeSTSWeek(5);

  it("materi event week content MUST be null (NOT badge)", () => {
    const lookup = buildLookupFromWeeks([stsWeek]);
    const result = resolveMerdekaWeekCell(lookup, 5, "materi", "unit-1");
    // BR-08: Badge/vertical text DITOLAK in materi cells
    expect(result.content).toBeNull();
  });

  it("cadangan event week content MUST be null (NOT badge)", () => {
    const lookup = buildLookupFromWeeks([stsWeek]);
    const result = resolveMerdekaWeekCell(lookup, 5, "cadangan");
    expect(result.content).toBeNull();
  });

  it("kokurikuler event week content MUST be null (NOT badge)", () => {
    const lookup = buildLookupFromWeeks([stsWeek]);
    const result = resolveMerdekaWeekCell(lookup, 5, "kokurikuler");
    expect(result.content).toBeNull();
  });

  it("total event week content MUST be \"-\" (NOT badge)", () => {
    const lookup = buildLookupFromWeeks([stsWeek]);
    const result = resolveMerdekaWeekCell(lookup, 5, "total");
    // Total shows "-" on event weeks, NOT a badge
    expect(result.content).toBe("-");
  });

  it("agenda event week is ONLY context with non-null badge content (BR-09)", () => {
    const lookup = buildLookupFromWeeks([stsWeek]);
    const result = resolveMerdekaWeekCell(lookup, 5, "agenda");
    // BR-09: Badge labels ONLY in agenda row
    expect(result.content).not.toBeNull();
    expect(result.content).not.toBe("-");
  });
});

/* ============================================================ */
/*  Edge cases: mixed weeks with both KBM and events            */
/* ============================================================ */

describe("resolveMerdekaWeekCell — mixed week scenarios", () => {
  const weeks = [
    makeKBMWeek(1),
    makeKBMWeek(2, { reservedForCadangan: 1 }),
    makeSTSWeek(3),
    makeKBMWeek(4, { koJP: 1 }),
    makeKBMWeek(5),
  ];
  const lookup = buildLookupFromWeeks(weeks);

  it("week 1 (KBM): materi shows unitJP, total shows 3, cadangan shows \"-\"", () => {
    const materi = resolveMerdekaWeekCell(lookup, 1, "materi", "unit-1");
    expect(materi.content).toBe(2);

    const total = resolveMerdekaWeekCell(lookup, 1, "total");
    expect(total.content).toBe(3); // 2 intra + 1 ko

    const cadangan = resolveMerdekaWeekCell(lookup, 1, "cadangan");
    expect(cadangan.content).toBe("-"); // reservedForCadangan = 0 for week 1
  });

  it("week 2 (KBM with cadangan): cadangan shows 1 JP, total still = 3 (BR-02)", () => {
    const cadangan = resolveMerdekaWeekCell(lookup, 2, "cadangan");
    expect(cadangan.content).toBe(1); // CELL-02: numeric, not "C"

    const total = resolveMerdekaWeekCell(lookup, 2, "total");
    // BR-02: reservedForCadangan NOT added to total
    expect(total.content).toBe(3); // 2 + 1, NOT 2 + 1 + 1 = 4
  });

  it("week 3 (STS event): all contexts except agenda = null/\"-\"", () => {
    const materi = resolveMerdekaWeekCell(lookup, 3, "materi", "unit-1");
    expect(materi.content).toBeNull(); // CELL-01

    const cadangan = resolveMerdekaWeekCell(lookup, 3, "cadangan");
    expect(cadangan.content).toBeNull(); // BR-08

    const koku = resolveMerdekaWeekCell(lookup, 3, "kokurikuler");
    expect(koku.content).toBeNull(); // BR-08

    const total = resolveMerdekaWeekCell(lookup, 3, "total");
    expect(total.content).toBe("-"); // CELL-04

    const agenda = resolveMerdekaWeekCell(lookup, 3, "agenda");
    expect(agenda.content).not.toBeNull(); // CELL-05: ONLY badge row
  });
});
