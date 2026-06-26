/**
 * PIKET-STUDENT-LEDGER-RECAP-04A-PATCH-1: Repo + domain refresh tests.
 *
 * Test 1-2: listDutyRecordsByAcademicYear (repo, mock Dexie)
 * Test 3: buildStudentDutyLedger setelah record baru (domain, pure)
 *
 * Verifies that the ledger data source reflects record changes — so the
 * UI patch (void loadLedgerData() after handleCatat/handleDeleteRecord/
 * handleSyncAlpa) is correct: loadLedgerData reads fresh from DB, and
 * buildStudentDutyLedger recomputes from the fresh records.
 */

import "fake-indexeddb/auto";
import { describe, it, expect, vi, beforeEach } from "vitest";

/* ------------------------------------------------------------------ */
/*  Mock db.dailyDutyRecords for listDutyRecordsByAcademicYear         */
/* ------------------------------------------------------------------ */

type MockDutyRecord = {
  id: string;
  dutyReportId: string;
  academicYearId: string;
  date: string;
  studentId: string;
  studentName: string;
  studentNumber?: number;
  classId: string;
  classLabel: string;
  category: string;
  type: string;
  ruleId?: string;
  ruleLabel: string;
  source: string;
  attendanceLinkType?: string | null;
  points: number;
  note?: string;
  followUp?: string;
  recordedByTeacherId: string;
  recordedByTeacherName: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncStatus: string;
};

const mockDutyRecords: MockDutyRecord[] = [];

vi.mock("../shared/db/schema", () => ({
  db: {
    dailyDutyRecords: {
      where: () => ({
        equals: () => ({
          toArray: () => Promise.resolve(mockDutyRecords),
        }),
      }),
    },
    attendanceRecords: {
      where: () => ({
        equals: () => ({
          toArray: () => Promise.resolve([]),
        }),
      }),
    },
  },
}));

vi.mock("../shared/db/class-roster-repo", () => ({
  listClassRosters: () => Promise.resolve([]),
}));

vi.mock("../shared/db/crud", () => ({
  createEntity: (data: any) => ({
    ...data,
    id: "mock-id-" + Math.random().toString(36).slice(2, 6),
    createdAt: "now",
    updatedAt: "now",
    deletedAt: null,
    syncStatus: "local_only",
  }),
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
import { listDutyRecordsByAcademicYear } from "../shared/db/daily-duty-repo";
import { buildStudentDutyLedger, type DutyRecord } from "@guru-admin/domain";

function makeRecord(overrides: Partial<MockDutyRecord> = {}): MockDutyRecord {
  return {
    id: "r-" + Math.random().toString(36).slice(2, 8),
    dutyReportId: "dr1",
    academicYearId: "ay-2026",
    date: "2026-06-26",
    studentId: "s1",
    studentName: "Andi",
    studentNumber: 1,
    classId: "7A",
    classLabel: "7A",
    category: "attendance",
    type: "late",
    ruleId: "rule1",
    ruleLabel: "Terlambat",
    source: "manual",
    attendanceLinkType: null,
    points: 5,
    recordedByTeacherId: "t1",
    recordedByTeacherName: "Budi",
    createdAt: "2026-06-26T00:00:00Z",
    updatedAt: "2026-06-26T00:00:00Z",
    deletedAt: null,
    syncStatus: "local_only",
    ...overrides,
  };
}

describe("PIKET-STUDENT-LEDGER-RECAP-04A-PATCH-1 — listDutyRecordsByAcademicYear", () => {
  beforeEach(() => {
    mockDutyRecords.length = 0;
  });

  // Test 1 (spec): membaca record aktif tahun berjalan
  it("Test 1: listDutyRecordsByAcademicYear membaca record aktif tahun berjalan", async () => {
    mockDutyRecords.push(
      makeRecord({ id: "r1", studentId: "s1", points: 5, date: "2026-06-20" }),
      makeRecord({ id: "r2", studentId: "s2", points: 10, date: "2026-06-26" }),
      makeRecord({ id: "r3", studentId: "s3", points: 25, date: "2026-06-15" }),
    );

    const records = await listDutyRecordsByAcademicYear("ay-2026");
    expect(records).toHaveLength(3);
    // Semua record punya academicYearId yang benar
    expect(records.every((r) => r.academicYearId === "ay-2026")).toBe(true);
    // Urut date desc (terbaru dulu)
    expect(records[0].date).toBe("2026-06-26");
    expect(records[1].date).toBe("2026-06-20");
    expect(records[2].date).toBe("2026-06-15");
  });

  // Test 2 (spec): tidak mengembalikan record deletedAt
  it("Test 2: listDutyRecordsByAcademicYear TIDAK mengembalikan record deletedAt", async () => {
    mockDutyRecords.push(
      makeRecord({ id: "r1", studentId: "s1", points: 5, deletedAt: null }),
      makeRecord({ id: "r2", studentId: "s1", points: 10, deletedAt: "2026-06-27T00:00:00Z" }), // soft-deleted
      makeRecord({ id: "r3", studentId: "s2", points: 15, deletedAt: null }),
    );

    const records = await listDutyRecordsByAcademicYear("ay-2026");
    expect(records).toHaveLength(2); // hanya 2 record aktif
    expect(records.every((r) => !r.deletedAt)).toBe(true);
    // Record r2 (deleted) tidak boleh ada
    expect(records.find((r) => r.id === "r2")).toBeUndefined();
  });

  // Test 3 (spec): buildStudentDutyLedger setelah record baru → total poin terbaru
  it("Test 3: buildStudentDutyLedger setelah record baru menghasilkan total poin terbaru", async () => {
    // Setup awal: 1 siswa dengan 1 record (5 poin)
    mockDutyRecords.push(
      makeRecord({ id: "r1", studentId: "s1", points: 5, date: "2026-06-20" }),
    );

    let records = await listDutyRecordsByAcademicYear("ay-2026");
    let ledger = buildStudentDutyLedger(records as DutyRecord[]);
    expect(ledger).toHaveLength(1);
    expect(ledger[0].totalPoints).toBe(5);
    expect(ledger[0].totalRecords).toBe(1);

    // Simulasi: guru tambah catatan baru (10 poin) untuk siswa yang sama
    mockDutyRecords.push(
      makeRecord({ id: "r2", studentId: "s1", points: 10, date: "2026-06-26" }),
    );

    // Reload records (simulasi void loadLedgerData() di UI)
    records = await listDutyRecordsByAcademicYear("ay-2026");
    ledger = buildStudentDutyLedger(records as DutyRecord[]);
    expect(ledger).toHaveLength(1);
    expect(ledger[0].totalPoints).toBe(15); // 5 + 10
    expect(ledger[0].totalRecords).toBe(2);
    expect(ledger[0].lastRecordDate).toBe("2026-06-26");
  });

  // Bonus: read-only — tidak menambah/mengubah record
  it("Test 4 (bonus): listDutyRecordsByAcademicYear read-only (tidak mengubah mock array)", async () => {
    mockDutyRecords.push(
      makeRecord({ id: "r1", studentId: "s1", points: 5 }),
    );
    const countBefore = mockDutyRecords.length;
    await listDutyRecordsByAcademicYear("ay-2026");
    const countAfter = mockDutyRecords.length;
    expect(countAfter).toBe(countBefore);
  });
});
