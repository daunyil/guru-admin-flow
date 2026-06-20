/**
 * Test untuk teaching-schedule-import.ts
 */
import { describe, it, expect } from "vitest";
import {
  validateScheduleImport,
  scheduleImportToSchedules,
} from "../src/teaching-schedule-import";

const validImport = {
  $schema: "guru-admin-flow/schedule/v1",
  academicYearLabel: "2025/2026",
  teacherName: "Siti Aminah, S.Pd.",
  source: "Smart Roster SMPN 8 Bantan",
  entries: [
    {
      subject: "Pendidikan Pancasila",
      classId: "VII A",
      classLabel: "VII A",
      dayOfWeek: 1,
      startPeriod: 1,
      durationJP: 2,
      startTime: "07:00",
      endTime: "08:20",
      semester: 1,
    },
    {
      subject: "Pendidikan Pancasila",
      classId: "VIII B",
      classLabel: "VIII B",
      dayOfWeek: 2,
      startPeriod: 4,
      durationJP: 2,
      semester: 1,
    },
  ],
};

describe("teaching-schedule-import — schema validation", () => {
  it("valid import → success", () => {
    const r = validateScheduleImport(validImport);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.academicYearLabel).toBe("2025/2026");
      expect(r.data.entries.length).toBe(2);
    }
  });

  it("$schema salah → fail", () => {
    const r = validateScheduleImport({ ...validImport, $schema: "wrong/v2" });
    expect(r.success).toBe(false);
  });

  it("dayOfWeek invalid (8) → fail", () => {
    const r = validateScheduleImport({
      ...validImport,
      entries: [{ ...validImport.entries[0], dayOfWeek: 8 }],
    });
    expect(r.success).toBe(false);
  });

  it("dayOfWeek 0 → fail", () => {
    const r = validateScheduleImport({
      ...validImport,
      entries: [{ ...validImport.entries[0], dayOfWeek: 0 }],
    });
    expect(r.success).toBe(false);
  });

  it("startPeriod negatif → fail", () => {
    const r = validateScheduleImport({
      ...validImport,
      entries: [{ ...validImport.entries[0], startPeriod: -1 }],
    });
    expect(r.success).toBe(false);
  });

  it("durationJP 0 → fail (positive required)", () => {
    const r = validateScheduleImport({
      ...validImport,
      entries: [{ ...validImport.entries[0], durationJP: 0 }],
    });
    expect(r.success).toBe(false);
  });

  it("startTime format salah → fail", () => {
    const r = validateScheduleImport({
      ...validImport,
      entries: [{ ...validImport.entries[0], startTime: "7:00" }], // bukan HH:mm
    });
    expect(r.success).toBe(false);
  });

  it("startTime >= endTime → fail (logic)", () => {
    const r = validateScheduleImport({
      ...validImport,
      entries: [
        { ...validImport.entries[0], startTime: "08:20", endTime: "07:00" },
      ],
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.errors.some((e) => e.includes("startTime") && e.includes("endTime"))).toBe(true);
    }
  });

  it("entries kosong → fail", () => {
    const r = validateScheduleImport({ ...validImport, entries: [] });
    expect(r.success).toBe(false);
  });

  it("academicYearLabel format salah → fail", () => {
    const r = validateScheduleImport({ ...validImport, academicYearLabel: "2025-2026" });
    expect(r.success).toBe(false);
  });
});

describe("teaching-schedule-import — scheduleImportToSchedules", () => {
  it("konversi import ke TeachingSchedule[] dengan source smart_roster_import", () => {
    const r = validateScheduleImport(validImport);
    expect(r.success).toBe(true);
    if (!r.success) return;

    const fallback = (_period: number, _duration: number) => ({
      startTime: "07:00",
      endTime: "08:20",
    });

    const schedules = scheduleImportToSchedules(r.data, fallback);
    expect(schedules.length).toBe(2);
    expect(schedules[0].source).toBe("smart_roster_import");
    expect(schedules[0].subject).toBe("Pendidikan Pancasila");
    expect(schedules[1].classLabel).toBe("VIII B");
  });

  it("entry tanpa startTime/endTime → pakai fallback", () => {
    const r = validateScheduleImport(validImport);
    if (!r.success) return;

    const fallback = (period: number, duration: number) => ({
      startTime: `${String(7 + Math.floor((period - 1) / 2)).padStart(2, "0")}:00`,
      endTime: `${String(7 + Math.floor((period - 1) / 2) + duration).padStart(2, "0")}:00`,
    });

    const schedules = scheduleImportToSchedules(r.data, fallback);
    // Entry kedua tidak punya startTime/endTime di fixture, harus pakai fallback
    expect(schedules[1].startTime).toMatch(/^\d{2}:\d{2}$/);
    expect(schedules[1].endTime).toMatch(/^\d{2}:\d{2}$/);
  });

  it("entry tanpa semester → default semester 1", () => {
    const r = validateScheduleImport({
      ...validImport,
      entries: [{ ...validImport.entries[0], semester: undefined }],
    });
    if (!r.success) return;

    const fallback = () => ({ startTime: "07:00", endTime: "08:20" });
    const schedules = scheduleImportToSchedules(r.data, fallback);
    expect(schedules[0].semester).toBe(1);
  });

  it("field BaseEntity TIDAK ada di hasil (caller assign)", () => {
    const r = validateScheduleImport(validImport);
    if (!r.success) return;

    const fallback = () => ({ startTime: "07:00", endTime: "08:20" });
    const schedules = scheduleImportToSchedules(r.data, fallback);
    for (const s of schedules) {
      expect("id" in s).toBe(false);
      expect("academicYearId" in s).toBe(false);
      expect("teacherId" in s).toBe(false);
      expect("createdAt" in s).toBe(false);
    }
  });
});
