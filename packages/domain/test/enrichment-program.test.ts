/**
 * Tests untuk enrichment-program.ts (GENERATOR-COMPLETION-RC1-PATCH-1)
 *
 * QA-3: 0 siswa pengayaan tetap boleh final.
 */
import { describe, it, expect } from "vitest";
import {
  filterEnrichmentStudents,
  isEnrichmentProgramComplete,
  finalizeEnrichmentProgram,
  DEFAULT_ENRICHMENT_THRESHOLD,
  type EnrichmentProgram,
} from "../src/enrichment-program";

const baseTimestamp = "2025-07-14T00:00:00+07:00";

function makeProgram(overrides: Partial<EnrichmentProgram> = {}): EnrichmentProgram {
  return {
    id: "enr-1",
    academicYearId: "ay-2025",
    teacherId: "teacher-1",
    teacherName: "Siti Aminah",
    subject: "PPKn",
    classId: "VII A",
    classLabel: "VII A",
    semester: 1,
    threshold: DEFAULT_ENRICHMENT_THRESHOLD,
    students: [],
    plan: undefined,
    status: "draft",
    finalizedAt: null,
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
    deletedAt: null,
    syncStatus: "local_only",
    ...overrides,
  };
}

describe("enrichment-program — filterEnrichmentStudents", () => {
  it("siswa finalScore >= threshold masuk pengayaan", () => {
    const entries = [
      { studentId: "s1", studentName: "Andi", finalScore: 95 },
      { studentId: "s2", studentName: "Budi", finalScore: 80 },
      { studentId: "s3", studentName: "Cici", finalScore: 90 },
    ];
    const result = filterEnrichmentStudents(entries, 90);
    expect(result.length).toBe(2); // Andi (95) + Cici (90)
    expect(result[0].studentName).toBe("Andi");
    expect(result[1].studentName).toBe("Cici");
  });

  it("siswa finalScore < threshold tidak masuk pengayaan", () => {
    const entries = [
      { studentId: "s1", studentName: "Andi", finalScore: 89 },
    ];
    const result = filterEnrichmentStudents(entries, 90);
    expect(result.length).toBe(0);
  });

  it("siswa dengan finalScore null tidak masuk pengayaan", () => {
    const entries = [
      { studentId: "s1", studentName: "Andi", finalScore: null },
    ];
    const result = filterEnrichmentStudents(entries, 90);
    expect(result.length).toBe(0);
  });

  it("default threshold = 90", () => {
    expect(DEFAULT_ENRICHMENT_THRESHOLD).toBe(90);
  });

  it("threshold custom (misal 85)", () => {
    const entries = [
      { studentId: "s1", studentName: "Andi", finalScore: 86 },
    ];
    const result = filterEnrichmentStudents(entries, 85);
    expect(result.length).toBe(1);
  });
});

describe("enrichment-program — QA-3: 0 siswa tetap boleh final", () => {
  it("isEnrichmentProgramComplete return complete=true untuk 0 siswa", () => {
    const program = makeProgram({ students: [] });
    const check = isEnrichmentProgramComplete(program);
    expect(check.complete).toBe(true);
    expect(check.missingFields).toEqual([]);
  });

  it("finalizeEnrichmentProgram sukses untuk 0 siswa", () => {
    const program = makeProgram({ students: [] });
    const result = finalizeEnrichmentProgram(program);
    expect(result.success).toBe(true);
    expect(result.program?.status).toBe("final");
    expect(result.program?.finalizedAt).toBeTruthy();
  });

  it("isEnrichmentProgramComplete return complete=true untuk >0 siswa", () => {
    const program = makeProgram({
      students: [
        {
          studentId: "s1",
          studentName: "Andi",
          finalScore: 95,
        },
      ],
    });
    const check = isEnrichmentProgramComplete(program);
    expect(check.complete).toBe(true);
  });

  it("finalizeEnrichmentProgram sukses untuk >0 siswa", () => {
    const program = makeProgram({
      students: [
        {
          studentId: "s1",
          studentName: "Andi",
          finalScore: 95,
        },
      ],
    });
    const result = finalizeEnrichmentProgram(program);
    expect(result.success).toBe(true);
    expect(result.program?.status).toBe("final");
  });
});
