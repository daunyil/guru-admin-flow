/**
 * Test untuk promes-lesson-linker.ts
 */
import { describe, it, expect } from "vitest";
import { linkPromesToLessons } from "../src/promes-lesson-linker";
import { makeLessonSession, makeProtaUnit } from "./sprint3-fixtures";

describe("promes-lesson-linker — Test #1: Happy path", () => {
  it("10 sesi planned × 2 JP = 20 JP capacity, 1 unit 20 JP → terdistribusi penuh", () => {
    const sessions = Array.from({ length: 10 }, (_, i) =>
      makeLessonSession({
        date: `2025-07-${String(14 + i).padStart(2, "0")}`,
        durationJP: 2,
        status: "planned",
      })
    );
    const units = [makeProtaUnit({ jp: 20, order: 1 })];

    const result = linkPromesToLessons({
      sessions,
      units,
      cadanganJP: 0,
    });

    expect(result.errors).toEqual([]);
    expect(result.summary.totalSessions).toBe(10);
    expect(result.summary.plannedSessions).toBe(10);
    expect(result.summary.totalIntraCapacityJP).toBe(20);
    expect(result.summary.materialCapacityJP).toBe(20);
    expect(result.summary.totalUnitJP).toBe(20);
    expect(result.summary.distributedJP).toBe(20);
    expect(result.summary.undistributedJP).toBe(0);
    expect(result.summary.allocationStatus).toBe("tepat");
    expect(result.distribution[0].status).toBe("fully_distributed");
    expect(result.distribution[0].sessionsCount).toBe(10);
  });
});

describe("promes-lesson-linker — Test #2: Cadangan reserve dari akhir", () => {
  it("10 sesi × 2 JP, cadangan 6 → 3 sesi terakhir jadi cadangan, 7 sesi untuk materi", () => {
    const sessions = Array.from({ length: 10 }, (_, i) =>
      makeLessonSession({
        date: `2025-07-${String(14 + i).padStart(2, "0")}`,
        durationJP: 2,
        status: "planned",
      })
    );
    const units = [makeProtaUnit({ jp: 14, order: 1 })]; // 7 sesi × 2 JP

    const result = linkPromesToLessons({
      sessions,
      units,
      cadanganJP: 6,
      reserveFromEnd: true,
    });

    expect(result.summary.cadanganSessions).toBe(3); // 3 sesi × 2 JP = 6 cadangan
    expect(result.summary.materialCapacityJP).toBe(14);
    expect(result.summary.distributedJP).toBe(14);
    expect(result.summary.undistributedJP).toBe(0);
    expect(result.summary.allocationStatus).toBe("tepat");
  });
});

describe("promes-lesson-linker — Test #3: Materi lebih besar dari capacity → kurang", () => {
  it("10 sesi × 2 JP = 20 capacity, 1 unit 30 JP → 20 terdistribusi, 10 undistributed", () => {
    const sessions = Array.from({ length: 10 }, () =>
      makeLessonSession({ durationJP: 2, status: "planned" })
    );
    const units = [makeProtaUnit({ jp: 30, order: 1 })];

    const result = linkPromesToLessons({
      sessions,
      units,
      cadanganJP: 0,
    });

    expect(result.summary.materialCapacityJP).toBe(20);
    expect(result.summary.totalUnitJP).toBe(30);
    expect(result.summary.distributedJP).toBe(20);
    expect(result.summary.undistributedJP).toBe(10);
    expect(result.summary.allocationStatus).toBe("kurang");
    expect(result.distribution[0].status).toBe("partially_distributed");
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe("promes-lesson-linker — Test #4: Materi lebih kecil dari capacity → cukup", () => {
  it("10 sesi × 2 JP = 20 capacity, 1 unit 10 JP → 10 terdistribusi, 10 sisa", () => {
    const sessions = Array.from({ length: 10 }, () =>
      makeLessonSession({ durationJP: 2, status: "planned" })
    );
    const units = [makeProtaUnit({ jp: 10, order: 1 })];

    const result = linkPromesToLessons({
      sessions,
      units,
      cadanganJP: 0,
    });

    expect(result.summary.materialCapacityJP).toBe(20);
    expect(result.summary.totalUnitJP).toBe(10);
    expect(result.summary.distributedJP).toBe(10);
    expect(result.summary.undistributedJP).toBe(0);
    expect(result.summary.allocationStatus).toBe("cukup");
    expect(result.summary.emptySessions).toBeGreaterThan(0); // sesi tanpa materi
  });
});

describe("promes-lesson-linker — Test #5: Multi unit berurutan", () => {
  it("3 unit (10+10+10=30 JP), 15 sesi × 2 JP = 30 capacity → semua terdistribusi", () => {
    const sessions = Array.from({ length: 15 }, (_, i) =>
      makeLessonSession({
        date: `2025-07-${String(14 + i).padStart(2, "0")}`,
        durationJP: 2,
        status: "planned",
      })
    );
    const units = [
      makeProtaUnit({ jp: 10, order: 1, title: "Unit A" }),
      makeProtaUnit({ jp: 10, order: 2, title: "Unit B" }),
      makeProtaUnit({ jp: 10, order: 3, title: "Unit C" }),
    ];

    const result = linkPromesToLessons({
      sessions,
      units,
      cadanganJP: 0,
    });

    expect(result.summary.totalUnitJP).toBe(30);
    expect(result.summary.distributedJP).toBe(30);
    expect(result.summary.allocationStatus).toBe("tepat");
    expect(result.distribution.length).toBe(3);
    expect(result.distribution[0].sessionsCount).toBe(5); // 10 JP / 2 JP per sesi
    expect(result.distribution[1].sessionsCount).toBe(5);
    expect(result.distribution[2].sessionsCount).toBe(5);
  });
});

describe("promes-lesson-linker — Test #6: Sesi cancelled tidak dialokasikan materi", () => {
  it("10 sesi (5 planned + 5 cancelled), cadangan 0, unit 10 JP → hanya planned dialokasikan", () => {
    const sessions = Array.from({ length: 10 }, (_, i) =>
      makeLessonSession({
        date: `2025-07-${String(14 + i).padStart(2, "0")}`,
        durationJP: 2,
        status: i < 5 ? "planned" : "cancelled",
      })
    );
    const units = [makeProtaUnit({ jp: 10, order: 1 })];

    const result = linkPromesToLessons({
      sessions,
      units,
      cadanganJP: 0,
    });

    expect(result.summary.plannedSessions).toBe(5);
    expect(result.summary.cancelledSessions).toBe(5);
    expect(result.summary.totalIntraCapacityJP).toBe(10); // hanya planned
    expect(result.summary.materialCapacityJP).toBe(10);
    expect(result.summary.distributedJP).toBe(10);
    expect(result.summary.allocationStatus).toBe("tepat");
  });
});

describe("promes-lesson-linker — Test #7: Cadangan > total capacity → error", () => {
  it("10 sesi × 2 JP = 20 capacity, cadangan 30 → error", () => {
    const sessions = Array.from({ length: 10 }, () =>
      makeLessonSession({ durationJP: 2, status: "planned" })
    );
    const units = [makeProtaUnit({ jp: 5, order: 1 })];

    const result = linkPromesToLessons({
      sessions,
      units,
      cadanganJP: 30,
    });

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("Cadangan 30 JP melebihi total kapasitas intra 20 JP");
  });
});

describe("promes-lesson-linker — Test #8: Sessions kosong → error", () => {
  it("sessions=[], return error", () => {
    const result = linkPromesToLessons({
      sessions: [],
      units: [makeProtaUnit()],
      cadanganJP: 0,
    });

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("Tidak ada LessonSession");
  });
});

describe("promes-lesson-linker — Test #9: Units kosong → error", () => {
  it("units=[], return error", () => {
    const sessions = [makeLessonSession()];
    const result = linkPromesToLessons({
      sessions,
      units: [],
      cadanganJP: 0,
    });

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain("Tidak ada ProtaUnit");
  });
});

describe("promes-lesson-linker — Test #10: plannedUnitId ter-assign di linkedSessions", () => {
  it("sesi yang dapat materi punya plannedUnitId != null", () => {
    const sessions = Array.from({ length: 5 }, () =>
      makeLessonSession({ durationJP: 2, status: "planned" })
    );
    const units = [makeProtaUnit({ jp: 10, order: 1 })];

    const result = linkPromesToLessons({
      sessions,
      units,
      cadanganJP: 0,
    });

    expect(result.linkedSessions.length).toBe(5);
    for (const s of result.linkedSessions) {
      expect(s.plannedUnitId).toBe(units[0].id);
    }
  });
});

describe("promes-lesson-linker — Test #11: Cadangan reserve dari awal", () => {
  it("reserveFromEnd=false, cadangan di awal", () => {
    const sessions = Array.from({ length: 10 }, (_, i) =>
      makeLessonSession({
        date: `2025-07-${String(14 + i).padStart(2, "0")}`,
        durationJP: 2,
        status: "planned",
      })
    );
    const units = [makeProtaUnit({ jp: 14, order: 1 })];

    const result = linkPromesToLessons({
      sessions,
      units,
      cadanganJP: 6,
      reserveFromEnd: false,
    });

    expect(result.summary.cadanganSessions).toBe(3);
    // Sesi pertama (tanggal paling awal) harusnya jadi cadangan
    expect(result.cadanganSessions.some((s) => s.date === "2025-07-14")).toBe(true);
  });
});

describe("promes-lesson-linker — Test #12: Unit split di sesi", () => {
  it("unit 6 JP dengan sesi 2 JP → 3 sesi untuk unit itu", () => {
    const sessions = Array.from({ length: 5 }, (_, i) =>
      makeLessonSession({
        date: `2025-07-${String(14 + i).padStart(2, "0")}`,
        durationJP: 2,
        status: "planned",
      })
    );
    const units = [makeProtaUnit({ jp: 6, order: 1 })];

    const result = linkPromesToLessons({
      sessions,
      units,
      cadanganJP: 0,
    });

    expect(result.distribution[0].sessionsCount).toBe(3);
    expect(result.distribution[0].distributedJP).toBe(6);
    expect(result.distribution[0].status).toBe("fully_distributed");
    // 2 sesi terakhir harusnya empty (tidak dapat unit)
    expect(result.summary.emptySessions).toBe(2);
  });
});
