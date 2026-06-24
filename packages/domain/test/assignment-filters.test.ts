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

/* ------------------------------------------------------------------ */
/*  FULL-APP-AUDIT-RC1-FIX-1: P0-4 regression tests                  */
/*  Memastikan ATP/LKPD/RPP tidak muncul false positive untuk kelas/  */
/*  mapel/semester yang berbeda (bug sebelumnya: pakai .length global). */
/* ------------------------------------------------------------------ */

describe("FULL-APP-AUDIT-RC1-FIX-1 — P0-4 false positive regression", () => {
  const assignment7A = makeAssignment({
    id: "asg-7a",
    classId: "VII A", classLabel: "VII A",
    subject: "PPKn", teacherId: "t1",
    semester: 1,
  });
  const assignment7B = makeAssignment({
    id: "asg-7b",
    classId: "VII B", classLabel: "VII B",
    subject: "PPKn", teacherId: "t1",
    semester: 1,
  });
  const assignment8A = makeAssignment({
    id: "asg-8a",
    classId: "VIII A", classLabel: "VIII A",
    subject: "PPKn", teacherId: "t1",
    semester: 1,
  });
  const assignmentMatematika7A = makeAssignment({
    id: "asg-mtk-7a",
    classId: "VII A", classLabel: "VII A",
    subject: "Matematika", teacherId: "t1",
    semester: 1,
  });

  it("ATP kelas 7A tidak muncul untuk kelas 7B (subject+grade sama, classId beda)", () => {
    const atpEntries = [
      { teacherId: "t1", subject: "PPKn", grade: "VII", classId: "VII A" },
      { teacherId: "t1", subject: "PPKn", grade: "VII", classId: "VII B" },
    ];
    expect(filterATPForAssignment(atpEntries, assignment7A)).toHaveLength(1);
    expect(filterATPForAssignment(atpEntries, assignment7A)[0].classId).toBe("VII A");
    expect(filterATPForAssignment(atpEntries, assignment7B)).toHaveLength(1);
    expect(filterATPForAssignment(atpEntries, assignment7B)[0].classId).toBe("VII B");
  });

  it("ATP grade VIII tidak muncul untuk assignment grade VII", () => {
    const atpEntries = [
      { teacherId: "t1", subject: "PPKn", grade: "VII", classId: undefined },
      { teacherId: "t1", subject: "PPKn", grade: "VIII", classId: undefined },
    ];
    expect(filterATPForAssignment(atpEntries, assignment7A)).toHaveLength(1);
    expect(filterATPForAssignment(atpEntries, assignment7A)[0].grade).toBe("VII");
    expect(filterATPForAssignment(atpEntries, assignment8A)).toHaveLength(1);
    expect(filterATPForAssignment(atpEntries, assignment8A)[0].grade).toBe("VIII");
  });

  it("ATP subject beda tidak muncul (PPKn vs Matematika)", () => {
    const atpEntries = [
      { teacherId: "t1", subject: "PPKn", grade: "VII", classId: undefined },
      { teacherId: "t1", subject: "Matematika", grade: "VII", classId: undefined },
    ];
    expect(filterATPForAssignment(atpEntries, assignment7A)).toHaveLength(1);
    expect(filterATPForAssignment(atpEntries, assignment7A)[0].subject).toBe("PPKn");
    expect(filterATPForAssignment(atpEntries, assignmentMatematika7A)).toHaveLength(1);
    expect(filterATPForAssignment(atpEntries, assignmentMatematika7A)[0].subject).toBe("Matematika");
  });

  it("ATP teacherId beda tidak muncul", () => {
    const atpEntries = [
      { teacherId: "t1", subject: "PPKn", grade: "VII", classId: undefined },
      { teacherId: "t2", subject: "PPKn", grade: "VII", classId: undefined },
    ];
    expect(filterATPForAssignment(atpEntries, assignment7A)).toHaveLength(1);
    expect(filterATPForAssignment(atpEntries, assignment7A)[0].teacherId).toBe("t1");
  });

  it("LKPD kelas 7A tidak muncul untuk kelas 7B", () => {
    const lkpds = [
      { teacherId: "t1", subject: "PPKn", grade: "VII", classId: "VII A" },
      { teacherId: "t1", subject: "PPKn", grade: "VII", classId: "VII B" },
    ];
    expect(filterLKPDForAssignment(lkpds, assignment7A)).toHaveLength(1);
    expect(filterLKPDForAssignment(lkpds, assignment7A)[0].classId).toBe("VII A");
    expect(filterLKPDForAssignment(lkpds, assignment7B)).toHaveLength(1);
    expect(filterLKPDForAssignment(lkpds, assignment7B)[0].classId).toBe("VII B");
  });

  it("LKPD subject beda tidak muncul", () => {
    const lkpds = [
      { teacherId: "t1", subject: "PPKn", grade: "VII", classId: undefined },
      { teacherId: "t1", subject: "Matematika", grade: "VII", classId: undefined },
    ];
    expect(filterLKPDForAssignment(lkpds, assignment7A)).toHaveLength(1);
    expect(filterLKPDForAssignment(lkpds, assignment7A)[0].subject).toBe("PPKn");
  });

  it("LKPD grade beda tidak muncul (VII vs VIII)", () => {
    const lkpds = [
      { teacherId: "t1", subject: "PPKn", grade: "VII", classId: undefined },
      { teacherId: "t1", subject: "PPKn", grade: "VIII", classId: undefined },
    ];
    expect(filterLKPDForAssignment(lkpds, assignment7A)).toHaveLength(1);
    expect(filterLKPDForAssignment(lkpds, assignment7A)[0].grade).toBe("VII");
  });

  it("RPP dengan assignmentId tidak muncul untuk assignment lain", () => {
    const rppDocs = [
      { teacherId: "t1", assignmentId: "asg-7a", subject: "PPKn", classLabel: "VII A", semester: 1 as const },
      { teacherId: "t1", assignmentId: "asg-7b", subject: "PPKn", classLabel: "VII B", semester: 1 as const },
    ];
    expect(filterRppDocumentsForAssignment(rppDocs, assignment7A)).toHaveLength(1);
    expect(filterRppDocumentsForAssignment(rppDocs, assignment7A)[0].assignmentId).toBe("asg-7a");
    expect(filterRppDocumentsForAssignment(rppDocs, assignment7B)).toHaveLength(1);
    expect(filterRppDocumentsForAssignment(rppDocs, assignment7B)[0].assignmentId).toBe("asg-7b");
  });

  it("RPP tanpa assignmentId: filter by subject + classLabel + semester", () => {
    const rppDocs = [
      { teacherId: "t1", assignmentId: null, subject: "PPKn", classLabel: "VII A", semester: 1 as const },
      { teacherId: "t1", assignmentId: null, subject: "PPKn", classLabel: "VII B", semester: 1 as const },
      { teacherId: "t1", assignmentId: null, subject: "Matematika", classLabel: "VII A", semester: 1 as const },
      { teacherId: "t1", assignmentId: null, subject: "PPKn", classLabel: "VII A", semester: 2 as const },
    ];
    expect(filterRppDocumentsForAssignment(rppDocs, assignment7A)).toHaveLength(1);
    // Yang cocok hanya: PPKn + VII A + semester 1
  });

  it("RPP teacherId beda tidak muncul", () => {
    const rppDocs = [
      { teacherId: "t1", assignmentId: "asg-7a", subject: "PPKn", classLabel: "VII A", semester: 1 as const },
      { teacherId: "t2", assignmentId: "asg-7a", subject: "PPKn", classLabel: "VII A", semester: 1 as const },
    ];
    expect(filterRppDocumentsForAssignment(rppDocs, assignment7A)).toHaveLength(1);
    expect(filterRppDocumentsForAssignment(rppDocs, assignment7A)[0].teacherId).toBe("t1");
  });

  it("Simulasi bug lama: 3 ATP global tetapi hanya 1 yang valid untuk assignment", () => {
    // Bug lama: atpEntries.length === 3 → status "lengkap" meski untuk kelas lain.
    // Fix baru: filterATPForAssignment === 1 → tetap "lengkap" tapi count benar.
    const atpEntries = [
      { teacherId: "t1", subject: "PPKn", grade: "VII", classId: "VII A" },
      { teacherId: "t1", subject: "PPKn", grade: "VII", classId: "VII B" },
      { teacherId: "t1", subject: "Matematika", grade: "VII", classId: "VII A" },
    ];
    const filtered = filterATPForAssignment(atpEntries, assignment7A);
    expect(atpEntries.length).toBe(3); // bug lama pakai ini
    expect(filtered.length).toBe(1);   // fix baru pakai ini
    // Status yang benar: "lengkap" (1 > 0), detail "1 TP" bukan "3 TP"
  });

  it("Simulasi edge case: roster 0 assignment → semua filter return []", () => {
    expect(filterATPForAssignment([], assignment7A)).toEqual([]);
    expect(filterLKPDForAssignment([], assignment7A)).toEqual([]);
    expect(filterRppDocumentsForAssignment([], assignment7A)).toEqual([]);
  });
});
