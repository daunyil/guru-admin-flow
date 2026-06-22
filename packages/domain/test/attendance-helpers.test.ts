/**
 * Test untuk attendance-helpers.ts
 */
import { describe, it, expect } from "vitest";
import {
  generateDefaultAttendance,
  summarizeAttendance,
  applyAttendanceChanges,
  isAllPresent,
  validateAttendanceConsistency,
  backfillNisInRecords,
} from "../src/attendance-helpers";
import type { ClassRoster } from "../src/attendance";

const baseTimestamp = "2025-07-14T00:00:00+07:00";

function makeRoster(studentCount = 5, withNis = false): ClassRoster {
  return {
    id: "roster-1",
    classId: "VII A",
    classLabel: "VII A",
    academicYearId: "ay-2025",
    students: Array.from({ length: studentCount }, (_, i) => ({
      id: `student-${i + 1}`,
      name: `Siswa ${i + 1}`,
      number: i + 1,
      nis: withNis ? `NIS-${1000 + i}` : undefined,
    })),
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
    deletedAt: null,
    syncStatus: "local_only",
  };
}

describe("attendance-helpers — generateDefaultAttendance", () => {
  it("5 siswa → 5 records, semua present", () => {
    const roster = makeRoster(5);
    const records = generateDefaultAttendance({
      roster,
      sessionId: "session-1",
      date: "2025-07-14",
    });

    expect(records.length).toBe(5);
    expect(records.every((r) => r.status === "present")).toBe(true);
    expect(records[0].sessionId).toBe("session-1");
    expect(records[0].date).toBe("2025-07-14");
    expect(records[0].classId).toBe("VII A");
    expect(records[0].studentName).toBe("Siswa 1");
    expect(records[0].studentNumber).toBe(1);
  });

  it("roster kosong → records kosong", () => {
    const roster = makeRoster(0);
    const records = generateDefaultAttendance({
      roster,
      sessionId: "session-1",
      date: "2025-07-14",
    });
    expect(records.length).toBe(0);
  });

  it("setiap record punya id unik + BaseEntity fields", () => {
    const roster = makeRoster(3);
    const records = generateDefaultAttendance({
      roster,
      sessionId: "session-1",
      date: "2025-07-14",
    });

    const ids = records.map((r) => r.id);
    expect(new Set(ids).size).toBe(3); // semua unik
    expect(records.every((r) => r.createdAt)).toBe(true);
    expect(records.every((r) => r.updatedAt)).toBe(true);
    expect(records.every((r) => r.syncStatus === "local_only")).toBe(true);
  });
});

describe("attendance-helpers — summarizeAttendance", () => {
  it("5 siswa semua hadir → present=5, others=0", () => {
    const roster = makeRoster(5);
    const records = generateDefaultAttendance({
      roster,
      sessionId: "session-1",
      date: "2025-07-14",
    });
    const summary = summarizeAttendance(records);

    expect(summary.total).toBe(5);
    expect(summary.present).toBe(5);
    expect(summary.sick).toBe(0);
    expect(summary.excused).toBe(0);
    expect(summary.absent).toBe(0);
  });

  it("mixed: 3 present, 1 sick, 1 absent", () => {
    const records = [
      { status: "present" },
      { status: "present" },
      { status: "present" },
      { status: "sick" },
      { status: "absent" },
    ] as never;
    const summary = summarizeAttendance(records);

    expect(summary.total).toBe(5);
    expect(summary.present).toBe(3);
    expect(summary.sick).toBe(1);
    expect(summary.absent).toBe(1);
    expect(summary.excused).toBe(0);
  });
});

describe("attendance-helpers — applyAttendanceChanges", () => {
  it("ubah 2 siswa dari present ke sick/absent, sisanya tetap present", () => {
    const roster = makeRoster(5);
    const records = generateDefaultAttendance({
      roster,
      sessionId: "session-1",
      date: "2025-07-14",
    });

    const updated = applyAttendanceChanges(records, [
      { studentId: "student-2", status: "sick", note: "Demam" },
      { studentId: "student-4", status: "absent" },
    ]);

    expect(updated[0].status).toBe("present"); // student-1 tetap
    expect(updated[1].status).toBe("sick");
    expect(updated[1].note).toBe("Demam");
    expect(updated[2].status).toBe("present"); // student-3 tetap
    expect(updated[3].status).toBe("absent");
    expect(updated[4].status).toBe("present"); // student-5 tetap
  });

  it("tidak mengubah record bila changes kosong", () => {
    const roster = makeRoster(3);
    const records = generateDefaultAttendance({
      roster,
      sessionId: "session-1",
      date: "2025-07-14",
    });

    const updated = applyAttendanceChanges(records, []);
    expect(updated.every((r) => r.status === "present")).toBe(true);
  });
});

describe("attendance-helpers — isAllPresent", () => {
  it("semua present → true", () => {
    const roster = makeRoster(5);
    const records = generateDefaultAttendance({
      roster,
      sessionId: "session-1",
      date: "2025-07-14",
    });
    expect(isAllPresent(records)).toBe(true);
  });

  it("ada 1 sick → false", () => {
    const roster = makeRoster(5);
    const records = generateDefaultAttendance({
      roster,
      sessionId: "session-1",
      date: "2025-07-14",
    });
    const updated = applyAttendanceChanges(records, [
      { studentId: "student-1", status: "sick" },
    ]);
    expect(isAllPresent(updated)).toBe(false);
  });

  it("records kosong → true (vacuous truth)", () => {
    expect(isAllPresent([])).toBe(true);
  });
});

describe("attendance-helpers — validateAttendanceConsistency", () => {
  it("konsisten: 5 records, total=5, present+sick+excused+absent=5", () => {
    const roster = makeRoster(5);
    const records = generateDefaultAttendance({
      roster,
      sessionId: "session-1",
      date: "2025-07-14",
    });
    const check = validateAttendanceConsistency(records);
    expect(check.valid).toBe(true);
    expect(check.expected).toBe(5);
    expect(check.actual).toBe(5);
  });
});

describe("attendance-helpers — backfillNisInRecords", () => {
  it("records tanpa NIS + roster dengan NIS → isi NIS, changed=true", () => {
    const rosterWithNis = makeRoster(3, true);
    const rosterWithoutNis = makeRoster(3, false);

    // Generate records dari roster tanpa NIS (simulasi data lama)
    const oldRecords = generateDefaultAttendance({
      roster: rosterWithoutNis,
      sessionId: "session-1",
      date: "2025-07-14",
    });
    expect(oldRecords.every((r) => !r.nis)).toBe(true);

    // Backfill dari roster dengan NIS
    const { records, changed } = backfillNisInRecords(oldRecords, rosterWithNis);
    expect(changed).toBe(true);
    expect(records[0].nis).toBe("NIS-1000");
    expect(records[1].nis).toBe("NIS-1001");
    expect(records[2].nis).toBe("NIS-1002");
  });

  it("records sudah ada NIS → tidak diubah, changed=false", () => {
    const rosterWithNis = makeRoster(3, true);
    const records = generateDefaultAttendance({
      roster: rosterWithNis,
      sessionId: "session-1",
      date: "2025-07-14",
    });
    // records sudah ada NIS
    expect(records[0].nis).toBe("NIS-1000");

    const { records: result, changed } = backfillNisInRecords(records, rosterWithNis);
    expect(changed).toBe(false);
    expect(result[0].nis).toBe("NIS-1000");
  });

  it("roster tanpa NIS → tidak ada perubahan, changed=false", () => {
    const rosterWithoutNis = makeRoster(3, false);
    const records = generateDefaultAttendance({
      roster: rosterWithoutNis,
      sessionId: "session-1",
      date: "2025-07-14",
    });
    const { records: result, changed } = backfillNisInRecords(records, rosterWithoutNis);
    expect(changed).toBe(false);
    expect(result.every((r) => !r.nis)).toBe(true);
  });

  it("records kosong → records kosong, changed=false", () => {
    const roster = makeRoster(3, true);
    const { records, changed } = backfillNisInRecords([], roster);
    expect(changed).toBe(false);
    expect(records.length).toBe(0);
  });

  it("student di roster tapi tidak di records → diabaikan", () => {
    const rosterWithNis = makeRoster(5, true);
    const rosterFor3 = makeRoster(3, false);
    const records = generateDefaultAttendance({
      roster: rosterFor3,
      sessionId: "session-1",
      date: "2025-07-14",
    });
    // Records hanya 3 siswa, roster 5 siswa
    const { records: result, changed } = backfillNisInRecords(records, rosterWithNis);
    expect(changed).toBe(true);
    expect(result.length).toBe(3); // jumlah records tidak berubah
    expect(result[0].nis).toBe("NIS-1000");
  });
});
