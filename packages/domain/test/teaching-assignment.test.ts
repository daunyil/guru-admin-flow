/**
 * Tests for teaching-assignment.ts (PATCH-FLOW-RC2C)
 */
import { describe, it, expect } from "vitest";
import {
  teachingAssignmentSchema,
  parseTeachingAssignment,
  safeParseTeachingAssignment,
  assignmentCompositeKey,
  isSameAssignmentContext,
  assignmentLabel,
  assignmentShortLabel,
  type TeachingAssignment,
} from "../src/teaching-assignment";

const baseTimestamp = "2025-07-14T00:00:00+07:00";

function makeAssignment(overrides: Partial<TeachingAssignment> = {}): TeachingAssignment {
  return {
    id: "asg-1",
    academicYearId: "ay-2025",
    semester: 1,
    teacherId: "teacher-1",
    teacherName: "Emi Ramdani",
    subject: "Pendidikan Pancasila",
    classId: "VII A",
    classLabel: "VII A",
    jpPerWeek: 2,
    notes: undefined,
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
    deletedAt: null,
    syncStatus: "local_only",
    ...overrides,
  };
}

describe("teaching-assignment — schema validation", () => {
  it("assignment valid → parse success", () => {
    const a = makeAssignment();
    expect(() => parseTeachingAssignment(a)).not.toThrow();
  });

  it("field wajib hilang → safeParse gagal", () => {
    const r = safeParseTeachingAssignment({
      ...makeAssignment(),
      teacherId: undefined,
    });
    expect(r.success).toBe(false);
  });

  it("semester harus 1 atau 2", () => {
    const r = safeParseTeachingAssignment({
      ...makeAssignment(),
      semester: 3,
    });
    expect(r.success).toBe(false);
  });

  it("classLabel kosong → gagal", () => {
    const r = safeParseTeachingAssignment({
      ...makeAssignment(),
      classLabel: "",
    });
    expect(r.success).toBe(false);
  });

  it("jpPerWeek opsional, default undefined", () => {
    const a = makeAssignment();
    delete a.jpPerWeek;
    const parsed = parseTeachingAssignment(a);
    expect(parsed.jpPerWeek).toBeUndefined();
  });
});

describe("teaching-assignment — assignmentCompositeKey", () => {
  it("key mengandung semua 5 komponen", () => {
    const key = assignmentCompositeKey({
      academicYearId: "ay-2025",
      semester: 1,
      teacherId: "t1",
      subject: "PPKn",
      classId: "VII A",
    });
    expect(key).toBe("ay-2025|S1|t1|PPKn|VII A");
  });

  it("semester berbeda → key berbeda", () => {
    const k1 = assignmentCompositeKey({
      academicYearId: "ay-2025",
      semester: 1,
      teacherId: "t1",
      subject: "PPKn",
      classId: "VII A",
    });
    const k2 = assignmentCompositeKey({
      academicYearId: "ay-2025",
      semester: 2,
      teacherId: "t1",
      subject: "PPKn",
      classId: "VII A",
    });
    expect(k1).not.toBe(k2);
  });

  it("classId berbeda → key berbeda", () => {
    const k1 = assignmentCompositeKey({
      academicYearId: "ay-2025",
      semester: 1,
      teacherId: "t1",
      subject: "PPKn",
      classId: "VII A",
    });
    const k2 = assignmentCompositeKey({
      academicYearId: "ay-2025",
      semester: 1,
      teacherId: "t1",
      subject: "PPKn",
      classId: "VII B",
    });
    expect(k1).not.toBe(k2);
  });
});

describe("teaching-assignment — isSameAssignmentContext", () => {
  it("5-tuple sama → true", () => {
    const a = {
      academicYearId: "ay-2025",
      semester: 1 as const,
      teacherId: "t1",
      subject: "PPKn",
      classId: "VII A",
    };
    expect(isSameAssignmentContext(a, a)).toBe(true);
  });

  it("subject berbeda → false", () => {
    const a = {
      academicYearId: "ay-2025",
      semester: 1 as const,
      teacherId: "t1",
      subject: "PPKn",
      classId: "VII A",
    };
    const b = { ...a, subject: "IPA" };
    expect(isSameAssignmentContext(a, b)).toBe(false);
  });

  it("teacherId berbeda → false (data guru lain tidak bercampur)", () => {
    const a = {
      academicYearId: "ay-2025",
      semester: 1 as const,
      teacherId: "t1",
      subject: "PPKn",
      classId: "VII A",
    };
    const b = { ...a, teacherId: "t2" };
    expect(isSameAssignmentContext(a, b)).toBe(false);
  });
});

describe("teaching-assignment — labels", () => {
  it("assignmentLabel format: classLabel · subject · teacherName", () => {
    const label = assignmentLabel({
      classLabel: "VII A",
      subject: "Pendidikan Pancasila",
      teacherName: "Emi Ramdani",
    });
    expect(label).toBe("VII A · Pendidikan Pancasila · Emi Ramdani");
  });

  it("assignmentShortLabel format: classLabel · subject", () => {
    const label = assignmentShortLabel({
      classLabel: "VII A",
      subject: "Pendidikan Pancasila",
    });
    expect(label).toBe("VII A · Pendidikan Pancasila");
  });
});
