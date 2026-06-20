/**
 * Test untuk calendar-import.ts — validasi JSON impor kalender.
 */
import { describe, it, expect } from "vitest";
import {
  validateCalendarImport,
  calendarImportToEvents,
  calendarImportSchema,
} from "../src/calendar-import";

const validImport = {
  $schema: "guru-admin-flow/calendar/v1",
  academicYearLabel: "2025/2026",
  source: "Kemenag Bengkalis TP 2025/2026",
  events: [
    {
      startDate: "2025-07-14",
      endDate: "2025-07-14",
      type: "school_activity",
      label: "Awal Tahun Pelajaran",
      scope: "ALL",
      blocksLearning: true,
    },
    {
      startDate: "2025-07-21",
      endDate: "2025-11-16",
      type: "learning",
      label: "KBM Semester 1",
      scope: "ALL",
      blocksLearning: false,
    },
    {
      startDate: "2025-08-17",
      endDate: "2025-08-17",
      type: "holiday",
      label: "HUT RI ke-80",
      scope: "ALL",
      blocksLearning: true,
    },
  ],
};

describe("calendar-import — schema validation", () => {
  it("valid import → success", () => {
    const r = validateCalendarImport(validImport);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.academicYearLabel).toBe("2025/2026");
      expect(r.data.events.length).toBe(3);
    }
  });

  it("$schema salah → fail", () => {
    const r = validateCalendarImport({
      ...validImport,
      $schema: "wrong-schema/v2",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.errors.some((e) => e.includes("$schema"))).toBe(true);
    }
  });

  it("$schema hilang → fail", () => {
    const { $schema, ...noSchema } = validImport;
    void $schema;
    const r = validateCalendarImport(noSchema);
    expect(r.success).toBe(false);
  });

  it("academicYearLabel format salah → fail", () => {
    const r = validateCalendarImport({
      ...validImport,
      academicYearLabel: "2025-2026",
    });
    expect(r.success).toBe(false);
  });

  it("events kosong → fail", () => {
    const r = validateCalendarImport({
      ...validImport,
      events: [],
    });
    expect(r.success).toBe(false);
  });

  it("type event invalid → fail", () => {
    const r = validateCalendarImport({
      ...validImport,
      events: [
        {
          ...validImport.events[0],
          type: "invalid_type",
        },
      ],
    });
    expect(r.success).toBe(false);
  });

  it("startDate > endDate → fail (logic validation)", () => {
    const r = validateCalendarImport({
      ...validImport,
      events: [
        {
          ...validImport.events[0],
          startDate: "2025-08-01",
          endDate: "2025-07-01",
        },
      ],
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.errors.some((e) => e.includes("startDate") && e.includes("endDate"))).toBe(true);
    }
  });

  it("holiday dengan blocksLearning=false → fail (logic, harus auto-fix)", () => {
    const r = validateCalendarImport({
      ...validImport,
      events: [
        {
          startDate: "2025-08-17",
          endDate: "2025-08-17",
          type: "holiday",
          label: "HUT RI",
          scope: "ALL",
          blocksLearning: false, // SALAH untuk holiday
        },
      ],
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.errors.some((e) => e.includes("holiday") && e.includes("blocksLearning"))).toBe(true);
    }
  });
});

describe("calendar-import — calendarImportToEvents", () => {
  it("konversi import ke CalendarEvent[] dengan academicYearId", () => {
    const r = validateCalendarImport(validImport);
    expect(r.success).toBe(true);
    if (!r.success) return;

    const events = calendarImportToEvents(r.data, "ay-2025");
    expect(events.length).toBe(3);
    expect(events[0].academicYearId).toBe("ay-2025");
    expect(events[0].source).toBe("ai_import");
    expect(events[2].type).toBe("holiday");
    expect(events[2].blocksLearning).toBe(true); // auto-fix untuk holiday
  });

  it("field BaseEntity TIDAK ada di hasil (caller yang assign)", () => {
    const r = validateCalendarImport(validImport);
    if (!r.success) return;
    const events = calendarImportToEvents(r.data, "ay-2025");
    for (const e of events) {
      expect("id" in e).toBe(false);
      expect("createdAt" in e).toBe(false);
      expect("syncStatus" in e).toBe(false);
    }
  });
});

describe("calendar-import — schema export", () => {
  it("calendarImportSchema tersedia untuk export", () => {
    expect(calendarImportSchema).toBeDefined();
  });
});
