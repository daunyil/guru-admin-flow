/**
 * Tests untuk assignment-filters.ts (AUTO-DOCUMENT-ENGINE-RC1-PATCH-1)
 */
import { describe, it, expect } from "vitest";
import {
  deriveGradeFromClassLabel,
  matchesAssignmentSubject,
  matchesAssignmentGrade,
  matchesAssignmentClassOptional,
  filterProtaForAssignment,
  filterATPForAssignment,
  filterLKPDForAssignment,
  filterRppDocumentsForAssignment,
  matchesAssignmentContext,
} from "../src/assignment-filters";
import type { TeachingAssignment } from "../src/teaching-assignment";

const baseTimestamp = "2025-07-14T00:00:00+07:00";

function makeAssignment(overrides: Partial<TeachingAssignment> = {}): TeachingAssignment {
  return {
    id: "asg-1",
    academicYearId: "ay-2025",
    semester: 1,
    teacherId: "t1",
    teacherName: "Siti Aminah",
    subject: "PPKn",
    classId: "VII A",
    classLabel: "VII A",
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
    deletedAt: null,
    syncStatus: "local_only",
    ...overrides,
  };
}

describe("assignment-filters — deriveGradeFromClassLabel", () => {
  it("VII A → VII", () => {
    expect(deriveGradeFromClassLabel("VII A")).toBe("VII");
  });
  it("VIII B → VIII", () => {
    expect(deriveGradeFromClassLabel("VIII B")).toBe("VIII");
  });
  it("IX C → IX", () => {
    expect(deriveGradeFromClassLabel("IX C")).toBe("IX");
  });
  it("format tidak cocok → string kosong", () => {
    expect(deriveGradeFromClassLabel("Kelas 7")).toBe("");
  });
});

describe("assignment-filters — matchesAssignmentSubject", () => {
  it("subject cocok → true", () => {
    expect(matchesAssignmentSubject("PPKn", makeAssignment())).toBe(true);
  });
  it("subject beda → false", () => {
    expect(matchesAssignmentSubject("IPA", makeAssignment())).toBe(false);
  });
  it("subject undefined → false", () => {
    expect(matchesAssignmentSubject(undefined, makeAssignment())).toBe(false);
  });
});

describe("assignment-filters — matchesAssignmentGrade", () => {
  it("grade VII cocok dengan assignment VII A → true", () => {
    expect(matchesAssignmentGrade("VII", makeAssignment())).toBe(true);
  });
  it("grade VIII beda → false", () => {
    expect(matchesAssignmentGrade("VIII", makeAssignment())).toBe(false);
  });
  it("grade undefined → false", () => {
    expect(matchesAssignmentGrade(undefined, makeAssignment())).toBe(false);
  });
});

describe("assignment-filters — matchesAssignmentClassOptional", () => {
  it("classId kosong → true (umum untuk grade)", () => {
    expect(matchesAssignmentClassOptional("", makeAssignment())).toBe(true);
  });
  it("classId undefined → true", () => {
    expect(matchesAssignmentClassOptional(undefined, makeAssignment())).toBe(true);
  });
  it("classId cocok → true", () => {
    expect(matchesAssignmentClassOptional("VII A", makeAssignment())).toBe(true);
  });
  it("classId beda → false", () => {
    expect(matchesAssignmentClassOptional("VIII B", makeAssignment())).toBe(false);
  });
});

describe("assignment-filters — filterProtaForAssignment", () => {
  it("Prota mapel sama grade sama teacher sama → ambil", () => {
    const protas = [
      { teacherId: "t1", subject: "PPKn", grade: "VII" },
    ];
    const result = filterProtaForAssignment(protas, makeAssignment());
    expect(result).not.toBeNull();
  });

  it("Prota mapel sama tapi grade beda → tidak terambil", () => {
    const protas = [
      { teacherId: "t1", subject: "PPKn", grade: "VIII" },
    ];
    const result = filterProtaForAssignment(protas, makeAssignment());
    expect(result).toBeNull();
  });

  it("Prota mapel sama tapi teacher beda → tidak terambil", () => {
    const protas = [
      { teacherId: "t2", subject: "PPKn", grade: "VII" },
    ];
    const result = filterProtaForAssignment(protas, makeAssignment());
    expect(result).toBeNull();
  });

  it("Prota kosong → null", () => {
    const result = filterProtaForAssignment([], makeAssignment());
    expect(result).toBeNull();
  });
});

describe("assignment-filters — filterATPForAssignment", () => {
  it("ATP mapel sama grade sama → dihitung", () => {
    const entries = [
      { teacherId: "t1", subject: "PPKn", grade: "VII" },
    ];
    const result = filterATPForAssignment(entries, makeAssignment());
    expect(result.length).toBe(1);
  });

  it("ATP mapel sama grade beda → tidak dihitung", () => {
    const entries = [
      { teacherId: "t1", subject: "PPKn", grade: "VIII" },
    ];
    const result = filterATPForAssignment(entries, makeAssignment());
    expect(result.length).toBe(0);
  });

  it("ATP classId kosong → dianggap umum (diambil)", () => {
    const entries = [
      { teacherId: "t1", subject: "PPKn", grade: "VII", classId: "" },
    ];
    const result = filterATPForAssignment(entries, makeAssignment());
    expect(result.length).toBe(1);
  });

  it("ATP classId beda → tidak dihitung", () => {
    const entries = [
      { teacherId: "t1", subject: "PPKn", grade: "VII", classId: "VIII B" },
    ];
    const result = filterATPForAssignment(entries, makeAssignment());
    expect(result.length).toBe(0);
  });

  it("ATP classId sama → dihitung", () => {
    const entries = [
      { teacherId: "t1", subject: "PPKn", grade: "VII", classId: "VII A" },
    ];
    const result = filterATPForAssignment(entries, makeAssignment());
    expect(result.length).toBe(1);
  });
});

describe("assignment-filters — filterLKPDForAssignment", () => {
  it("LKPD kelas sama → dihitung", () => {
    const lkpds = [
      { teacherId: "t1", subject: "PPKn", grade: "VII", classId: "VII A" },
    ];
    const result = filterLKPDForAssignment(lkpds, makeAssignment());
    expect(result.length).toBe(1);
  });

  it("LKPD kelas lain → tidak dihitung", () => {
    const lkpds = [
      { teacherId: "t1", subject: "PPKn", grade: "VII", classId: "VII B" },
    ];
    const result = filterLKPDForAssignment(lkpds, makeAssignment());
    expect(result.length).toBe(0);
  });

  it("LKPD classId kosong → dianggap umum (diambil)", () => {
    const lkpds = [
      { teacherId: "t1", subject: "PPKn", grade: "VII" },
    ];
    const result = filterLKPDForAssignment(lkpds, makeAssignment());
    expect(result.length).toBe(1);
  });
});

describe("assignment-filters — filterRppDocumentsForAssignment", () => {
  it("RPP dengan assignmentId cocok → dihitung", () => {
    const docs = [
      { teacherId: "t1", assignmentId: "asg-1" },
    ];
    const result = filterRppDocumentsForAssignment(docs, makeAssignment());
    expect(result.length).toBe(1);
  });

  it("RPP dengan assignmentId beda → tidak dihitung", () => {
    const docs = [
      { teacherId: "t1", assignmentId: "asg-other" },
    ];
    const result = filterRppDocumentsForAssignment(docs, makeAssignment());
    expect(result.length).toBe(0);
  });

  it("RPP tanpa assignmentId tapi subject/classLabel/semester cocok → dihitung", () => {
    const docs = [
      { teacherId: "t1", assignmentId: null, subject: "PPKn", classLabel: "VII A", semester: 1 as const },
    ];
    const result = filterRppDocumentsForAssignment(docs, makeAssignment());
    expect(result.length).toBe(1);
  });

  it("RPP tanpa assignmentId tapi subject beda → tidak dihitung", () => {
    const docs = [
      { teacherId: "t1", assignmentId: null, subject: "IPA", classLabel: "VII A", semester: 1 as const },
    ];
    const result = filterRppDocumentsForAssignment(docs, makeAssignment());
    expect(result.length).toBe(0);
  });

  it("RPP teacher beda → tidak dihitung", () => {
    const docs = [
      { teacherId: "t2", assignmentId: "asg-1" },
    ];
    const result = filterRppDocumentsForAssignment(docs, makeAssignment());
    expect(result.length).toBe(0);
  });

  it("RPP tanpa assignmentId dan tanpa field context → dihitung (hanya cek teacherId)", () => {
    const docs = [
      { teacherId: "t1", assignmentId: null },
    ];
    const result = filterRppDocumentsForAssignment(docs, makeAssignment());
    expect(result.length).toBe(1);
  });
});

describe("assignment-filters — matchesAssignmentContext", () => {
  it("semua field cocok → true", () => {
    const item = { teacherId: "t1", subject: "PPKn", classId: "VII A", semester: 1 as const };
    expect(matchesAssignmentContext(item, makeAssignment())).toBe(true);
  });

  it("teacherId beda → false", () => {
    const item = { teacherId: "t2", subject: "PPKn", classId: "VII A", semester: 1 as const };
    expect(matchesAssignmentContext(item, makeAssignment())).toBe(false);
  });

  it("subject beda → false", () => {
    const item = { teacherId: "t1", subject: "IPA", classId: "VII A", semester: 1 as const };
    expect(matchesAssignmentContext(item, makeAssignment())).toBe(false);
  });

  it("classId beda → false", () => {
    const item = { teacherId: "t1", subject: "PPKn", classId: "VIII B", semester: 1 as const };
    expect(matchesAssignmentContext(item, makeAssignment())).toBe(false);
  });

  it("semester beda → false", () => {
    const item = { teacherId: "t1", subject: "PPKn", classId: "VII A", semester: 2 as const };
    expect(matchesAssignmentContext(item, makeAssignment())).toBe(false);
  });

  it("field kosong/undefined → true (guard lewat)", () => {
    const item = { teacherId: "t1" };
    expect(matchesAssignmentContext(item, makeAssignment())).toBe(true);
  });
});
