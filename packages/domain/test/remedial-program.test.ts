/**
 * Tests untuk remedial-program.ts (GENERATOR-COMPLETION-RC1-PATCH-1)
 *
 * QA-2: 0 siswa remedial tetap boleh final.
 */
import { describe, it, expect } from "vitest";
import {
  filterRemedialStudents,
  isRemedialProgramComplete,
  finalizeRemedialProgram,
  type RemedialProgram,
} from "../src/remedial-program";

const baseTimestamp = "2025-07-14T00:00:00+07:00";

function makeProgram(overrides: Partial<RemedialProgram> = {}): RemedialProgram {
  return {
    id: "rem-1",
    academicYearId: "ay-2025",
    teacherId: "teacher-1",
    teacherName: "Siti Aminah",
    subject: "PPKn",
    classId: "VII A",
    classLabel: "VII A",
    semester: 1,
    kktp: 75,
    students: [],
    plan: undefined,
    startDate: undefined,
    endDate: undefined,
    status: "draft",
    finalizedAt: null,
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
    deletedAt: null,
    syncStatus: "local_only",
    ...overrides,
  };
}

describe("remedial-program — filterRemedialStudents", () => {
  it("siswa finalScore < KKTP masuk remedial", () => {
    const entries = [
      { studentId: "s1", studentName: "Andi", finalScore: 60 },
      { studentId: "s2", studentName: "Budi", finalScore: 80 },
      { studentId: "s3", studentName: "Cici", finalScore: 74 },
    ];
    const result = filterRemedialStudents(entries, 75);
    expect(result.length).toBe(2); // Andi (60) + Cici (74)
    expect(result[0].studentName).toBe("Andi");
    expect(result[1].studentName).toBe("Cici");
  });

  it("siswa finalScore === KKTP tidak masuk remedial (kurang dari, bukan <=)", () => {
    const entries = [
      { studentId: "s1", studentName: "Andi", finalScore: 75 },
    ];
    const result = filterRemedialStudents(entries, 75);
    expect(result.length).toBe(0); // 75 tidak < 75
  });

  it("siswa dengan finalScore null tidak masuk remedial", () => {
    const entries = [
      { studentId: "s1", studentName: "Andi", finalScore: null },
    ];
    const result = filterRemedialStudents(entries, 75);
    expect(result.length).toBe(0);
  });

  it("semua siswa tuntas → 0 siswa remedial", () => {
    const entries = [
      { studentId: "s1", studentName: "Andi", finalScore: 80 },
      { studentId: "s2", studentName: "Budi", finalScore: 90 },
    ];
    const result = filterRemedialStudents(entries, 75);
    expect(result.length).toBe(0);
  });
});

describe("remedial-program — QA-2: 0 siswa tetap boleh final", () => {
  it("isRemedialProgramComplete return complete=true untuk 0 siswa", () => {
    const program = makeProgram({ students: [] });
    const check = isRemedialProgramComplete(program);
    expect(check.complete).toBe(true);
    expect(check.missingFields).toEqual([]);
  });

  it("finalizeRemedialProgram sukses untuk 0 siswa", () => {
    const program = makeProgram({ students: [] });
    const result = finalizeRemedialProgram(program);
    expect(result.success).toBe(true);
    expect(result.program?.status).toBe("final");
    expect(result.program?.finalizedAt).toBeTruthy();
  });

  it("isRemedialProgramComplete return complete=true untuk >0 siswa", () => {
    const program = makeProgram({
      students: [
        {
          studentId: "s1",
          studentName: "Andi",
          finalScore: 60,
          remedialScore: null,
        },
      ],
    });
    const check = isRemedialProgramComplete(program);
    expect(check.complete).toBe(true);
  });

  it("finalizeRemedialProgram sukses untuk >0 siswa", () => {
    const program = makeProgram({
      students: [
        {
          studentId: "s1",
          studentName: "Andi",
          finalScore: 60,
          remedialScore: null,
        },
      ],
    });
    const result = finalizeRemedialProgram(program);
    expect(result.success).toBe(true);
    expect(result.program?.status).toBe("final");
  });
});
