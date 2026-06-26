/**
 * PIKET-REPORT-APPSCRIPT-PARITY-02B: Test repo + dedup ranking nyata.
 *
 * Test 1-2: getAttendanceDetailForDate dengan mock Dexie
 * Test 3-6: dedupByHeaviestStatus dengan multiple records per siswa
 *
 * Karena getAttendanceDetailForDate butuh IndexedDB, kita pakai fake-indexeddb.
 */

import "fake-indexeddb/auto";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock schema (db) supaya tidak butuh IndexedDB nyata
const mockAttendanceRecords: Array<{
  studentId: string; studentName: string; studentNumber: number;
  classId: string; classLabel: string; date: string; status: string;
  updatedAt: string; deletedAt: string | null;
}> = [];

const mockRosters: Array<{
  id: string; classId: string; classLabel: string; academicYearId: string;
  students: Array<{ id: string; name: string; number: number; nis?: string }>;
}> = [
  {
    id: "r1", classId: "VII A", classLabel: "VII A", academicYearId: "ay1",
    students: [
      { id: "s1", name: "Ahmad", number: 1 },
      { id: "s2", name: "Budi", number: 2 },
      { id: "s3", name: "Citra", number: 3 },
      { id: "s4", name: "Dewi", number: 4 },
    ],
  },
];

vi.mock("../shared/db/schema", () => ({
  db: {
    attendanceRecords: {
      where: () => ({
        equals: () => ({
          toArray: () => Promise.resolve(mockAttendanceRecords.filter(
            (r) => r.classId === mockRosters[0].classId
          )),
        }),
      }),
    },
  },
}));

vi.mock("../shared/db/class-roster-repo", () => ({
  listClassRosters: () => Promise.resolve(mockRosters),
}));

vi.mock("../shared/db/crud", () => ({
  createEntity: (data: any) => ({ ...data, id: "mock-id", createdAt: "now", updatedAt: "now", deletedAt: null, syncStatus: "local_only" }),
  updateEntityFields: (existing: any, patch: any) => ({ ...existing, ...patch, updatedAt: "now" }),
  softDelete: (entity: any) => ({ ...entity, deletedAt: "now" }),
}));

vi.mock("@guru-admin/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@guru-admin/shared")>();
  return {
    ...actual,
    nowTimestamp: () => "2026-06-26T00:00:00Z",
    uuid: () => "mock-uuid",
  };
});

// Import setelah mock
import { getAttendanceDetailForDate } from "../shared/db/daily-duty-repo";

describe("PIKET-REPORT-APPSCRIPT-PARITY-02B — Repo getAttendanceDetailForDate", () => {
  beforeEach(() => {
    mockAttendanceRecords.length = 0;
  });

  it("Test 1: getAttendanceDetailForDate membaca attendanceRecords dan mengembalikan nama siswa S/I/A", async () => {
    // Setup: Ahmad sakit, Budi alpa, Citra hadir, Dewi izin
    mockAttendanceRecords.push(
      { studentId: "s1", studentName: "Ahmad", studentNumber: 1, classId: "VII A", classLabel: "VII A", date: "2026-06-26", status: "sick", updatedAt: "T08", deletedAt: null },
      { studentId: "s2", studentName: "Budi", studentNumber: 2, classId: "VII A", classLabel: "VII A", date: "2026-06-26", status: "absent", updatedAt: "T08", deletedAt: null },
      { studentId: "s3", studentName: "Citra", studentNumber: 3, classId: "VII A", classLabel: "VII A", date: "2026-06-26", status: "present", updatedAt: "T08", deletedAt: null },
      { studentId: "s4", studentName: "Dewi", studentNumber: 4, classId: "VII A", classLabel: "VII A", date: "2026-06-26", status: "excused", updatedAt: "T08", deletedAt: null },
    );

    const details = await getAttendanceDetailForDate({ academicYearId: "ay1", date: "2026-06-26" });
    expect(details).toHaveLength(1);
    const d = details[0];
    expect(d.classLabel).toBe("VII A");
    expect(d.present).toBe(1);
    expect(d.sick).toBe(1);
    expect(d.excused).toBe(1);
    expect(d.absent).toBe(1);
    expect(d.sickStudents).toContain("Ahmad");
    expect(d.absentStudents).toContain("Budi");
    expect(d.excusedStudents).toContain("Dewi");
  });

  it("Test 2: getAttendanceDetailForDate TIDAK memasukkan siswa Hadir dan TIDAK menulis attendanceRecords", async () => {
    mockAttendanceRecords.push(
      { studentId: "s1", studentName: "Ahmad", studentNumber: 1, classId: "VII A", classLabel: "VII A", date: "2026-06-26", status: "present", updatedAt: "T08", deletedAt: null },
      { studentId: "s2", studentName: "Budi", studentNumber: 2, classId: "VII A", classLabel: "VII A", date: "2026-06-26", status: "sick", updatedAt: "T08", deletedAt: null },
    );

    const recordCountBefore = mockAttendanceRecords.length;
    const details = await getAttendanceDetailForDate({ academicYearId: "ay1", date: "2026-06-26" });
    const recordCountAfter = mockAttendanceRecords.length;

    // Tidak menambah record (read-only)
    expect(recordCountAfter).toBe(recordCountBefore);

    const d = details[0];
    // Nama siswa hadir (Ahmad) tidak ada di sickStudents/excusedStudents/absentStudents
    expect(d.sickStudents).not.toContain("Ahmad");
    expect(d.excusedStudents).not.toContain("Ahmad");
    expect(d.absentStudents).not.toContain("Ahmad");
    // Nama siswa sakit (Budi) ada
    expect(d.sickStudents).toContain("Budi");
  });
});

/* ------------------------------------------------------------------ */
/*  Test dedup ranking nyata: multiple records 1 siswa                */
/* ------------------------------------------------------------------ */

describe("PIKET-REPORT-APPSCRIPT-PARITY-02B — Dedup ranking nyata", () => {
  beforeEach(() => {
    mockAttendanceRecords.length = 0;
  });

  it("Test 3: absent lalu present → status terberat = absent", async () => {
    mockAttendanceRecords.push(
      { studentId: "s1", studentName: "Ahmad", studentNumber: 1, classId: "VII A", classLabel: "VII A", date: "2026-06-26", status: "absent", updatedAt: "T08", deletedAt: null },
      { studentId: "s1", studentName: "Ahmad", studentNumber: 1, classId: "VII A", classLabel: "VII A", date: "2026-06-26", status: "present", updatedAt: "T09", deletedAt: null },
    );
    const details = await getAttendanceDetailForDate({ academicYearId: "ay1", date: "2026-06-26" });
    const d = details[0];
    // absent menang walau present lebih baru
    expect(d.absent).toBe(1);
    expect(d.present).toBe(0);
    expect(d.absentStudents).toContain("Ahmad");
  });

  it("Test 4: sick lalu present → status terberat = sick", async () => {
    mockAttendanceRecords.push(
      { studentId: "s1", studentName: "Ahmad", studentNumber: 1, classId: "VII A", classLabel: "VII A", date: "2026-06-26", status: "sick", updatedAt: "T08", deletedAt: null },
      { studentId: "s1", studentName: "Ahmad", studentNumber: 1, classId: "VII A", classLabel: "VII A", date: "2026-06-26", status: "present", updatedAt: "T09", deletedAt: null },
    );
    const details = await getAttendanceDetailForDate({ academicYearId: "ay1", date: "2026-06-26" });
    const d = details[0];
    expect(d.sick).toBe(1);
    expect(d.present).toBe(0);
    expect(d.sickStudents).toContain("Ahmad");
  });

  it("Test 5: excused lalu present → status terberat = excused", async () => {
    mockAttendanceRecords.push(
      { studentId: "s1", studentName: "Ahmad", studentNumber: 1, classId: "VII A", classLabel: "VII A", date: "2026-06-26", status: "excused", updatedAt: "T08", deletedAt: null },
      { studentId: "s1", studentName: "Ahmad", studentNumber: 1, classId: "VII A", classLabel: "VII A", date: "2026-06-26", status: "present", updatedAt: "T09", deletedAt: null },
    );
    const details = await getAttendanceDetailForDate({ academicYearId: "ay1", date: "2026-06-26" });
    const d = details[0];
    expect(d.excused).toBe(1);
    expect(d.present).toBe(0);
    expect(d.excusedStudents).toContain("Ahmad");
  });

  it("Test 6: absent lalu present lalu sick → status terberat = absent (ranking tertinggi)", async () => {
    mockAttendanceRecords.push(
      { studentId: "s1", studentName: "Ahmad", studentNumber: 1, classId: "VII A", classLabel: "VII A", date: "2026-06-26", status: "absent", updatedAt: "T08", deletedAt: null },
      { studentId: "s1", studentName: "Ahmad", studentNumber: 1, classId: "VII A", classLabel: "VII A", date: "2026-06-26", status: "present", updatedAt: "T09", deletedAt: null },
      { studentId: "s1", studentName: "Ahmad", studentNumber: 1, classId: "VII A", classLabel: "VII A", date: "2026-06-26", status: "sick", updatedAt: "T10", deletedAt: null },
    );
    const details = await getAttendanceDetailForDate({ academicYearId: "ay1", date: "2026-06-26" });
    const d = details[0];
    expect(d.absent).toBe(1);
    expect(d.sick).toBe(0);
    expect(d.present).toBe(0);
    expect(d.absentStudents).toContain("Ahmad");
  });
});
