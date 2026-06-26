/**
 * PIKET-HARIAN-MOBILE-01: Tests untuk domain helpers.
 */

import { describe, it, expect } from "vitest";
import {
  summarizeDutyRecords,
  getStudentDutyStatus,
  DEFAULT_DUTY_RULES,
  type DutyRecord,
} from "../src/daily-duty";

const baseRecord = (overrides: Partial<DutyRecord> = {}): DutyRecord => ({
  id: "r1",
  dutyReportId: "dr1",
  academicYearId: "ay1",
  date: "2026-06-26",
  studentId: "s1",
  studentName: "Andi",
  studentNumber: 1,
  classId: "VII A",
  classLabel: "VII A",
  category: "attendance",
  type: "late",
  ruleId: "rule1",
  ruleLabel: "Terlambat",
  points: 5,
  note: undefined,
  followUp: undefined,
  recordedByTeacherId: "t1",
  recordedByTeacherName: "Budi",
  createdAt: "2026-06-26T00:00:00Z",
  updatedAt: "2026-06-26T00:00:00Z",
  deletedAt: null,
  syncStatus: "local_only",
  ...overrides,
});

describe("PIKET-HARIAN-MOBILE-01 — Domain helpers", () => {
  it("DEFAULT_DUTY_RULES punya 10 aturan", () => {
    expect(DEFAULT_DUTY_RULES).toHaveLength(10);
  });

  it("summarizeDutyRecords menghitung total poin dengan benar", () => {
    const records = [
      baseRecord({ points: 5, category: "attendance" }),
      baseRecord({ points: 10, category: "discipline" }),
      baseRecord({ points: 0, category: "health" }),
    ];
    const summary = summarizeDutyRecords(records);
    expect(summary.totalRecords).toBe(3);
    expect(summary.totalPoints).toBe(15);
    expect(summary.byCategory.attendance).toBe(1);
    expect(summary.byCategory.discipline).toBe(1);
    expect(summary.byCategory.health).toBe(1);
  });

  it("summarizeDutyRecords dengan array kosong", () => {
    const summary = summarizeDutyRecords([]);
    expect(summary.totalRecords).toBe(0);
    expect(summary.totalPoints).toBe(0);
  });

  it("getStudentDutyStatus: 0-24 = Aman", () => {
    expect(getStudentDutyStatus(0)).toBe("Aman");
    expect(getStudentDutyStatus(24)).toBe("Aman");
  });

  it("getStudentDutyStatus: 25-49 = Perlu pembinaan ringan", () => {
    expect(getStudentDutyStatus(25)).toBe("Perlu pembinaan ringan");
    expect(getStudentDutyStatus(49)).toBe("Perlu pembinaan ringan");
  });

  it("getStudentDutyStatus: 50-74 = Perlu perhatian wali kelas", () => {
    expect(getStudentDutyStatus(50)).toBe("Perlu perhatian wali kelas");
    expect(getStudentDutyStatus(74)).toBe("Perlu perhatian wali kelas");
  });

  it("getStudentDutyStatus: 75-99 = Panggilan orang tua", () => {
    expect(getStudentDutyStatus(75)).toBe("Panggilan orang tua");
    expect(getStudentDutyStatus(99)).toBe("Panggilan orang tua");
  });

  it("getStudentDutyStatus: >=100 = Tindak lanjut kesiswaan/BK", () => {
    expect(getStudentDutyStatus(100)).toBe("Tindak lanjut kesiswaan/BK");
    expect(getStudentDutyStatus(500)).toBe("Tindak lanjut kesiswaan/BK");
  });
});
