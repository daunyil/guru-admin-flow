/**
 * Test untuk journal-helpers.ts
 */
import { describe, it, expect } from "vitest";
import {
  generateJournalFromSession,
  applyJournalInput,
  resyncJournalAttendance,
  isJournalComplete,
  finalizeJournal,
} from "../src/journal-helpers";
import {
  generateDefaultAttendance,
  applyAttendanceChanges,
} from "../src/attendance-helpers";
import type { LessonSession, ProtaUnit } from "../src";
import type { ClassRoster } from "../src/attendance";

const baseTimestamp = "2025-07-14T00:00:00+07:00";

function makeSession(overrides: Partial<LessonSession> = {}): LessonSession {
  return {
    id: "session-1",
    academicYearId: "ay-2025",
    teachingScheduleId: "sched-1",
    teacherId: "teacher-profile",
    classId: "VII A",
    classLabel: "VII A",
    subject: "Pendidikan Pancasila",
    date: "2025-07-14",
    startPeriod: 1,
    durationJP: 2,
    startTime: "07:00",
    endTime: "08:20",
    semester: 1,
    plannedUnitId: "unit-1",
    status: "planned",
    calendarEventId: null,
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
    deletedAt: null,
    syncStatus: "local_only",
    ...overrides,
  };
}

function makeProtaUnit(overrides: Partial<ProtaUnit> = {}): ProtaUnit {
  return {
    id: "unit-1",
    protaProfileId: "prota-1",
    semester: 1,
    title: "Budaya Demokrasi",
    learningOutcome: "Peserta didik mampu menerapkan sikap demokratis",
    jp: 12,
    order: 1,
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
    deletedAt: null,
    syncStatus: "local_only",
    ...overrides,
  };
}

function makeRoster(studentCount = 5): ClassRoster {
  return {
    id: "roster-1",
    classId: "VII A",
    classLabel: "VII A",
    academicYearId: "ay-2025",
    students: Array.from({ length: studentCount }, (_, i) => ({
      id: `student-${i + 1}`,
      name: `Siswa ${i + 1}`,
      number: i + 1,
    })),
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
    deletedAt: null,
    syncStatus: "local_only",
  };
}

describe("journal-helpers — generateJournalFromSession", () => {
  it("auto-fill dari session + plannedUnit + attendance", () => {
    const session = makeSession();
    const unit = makeProtaUnit();
    const roster = makeRoster(5);
    const attendance = generateDefaultAttendance({
      roster,
      sessionId: session.id,
      date: session.date,
    });

    const journal = generateJournalFromSession({
      session,
      plannedUnit: unit,
      attendanceRecords: attendance,
    });

    // Auto-fill dari session
    expect(journal.sessionId).toBe("session-1");
    expect(journal.academicYearId).toBe("ay-2025");
    expect(journal.teacherId).toBe("teacher-profile");
    expect(journal.classId).toBe("VII A");
    expect(journal.classLabel).toBe("VII A");
    expect(journal.subject).toBe("Pendidikan Pancasila");
    expect(journal.date).toBe("2025-07-14");
    expect(journal.semester).toBe(1);

    // Auto-fill dari plannedUnit
    expect(journal.plannedUnitId).toBe("unit-1");
    expect(journal.plannedMaterialTitle).toBe("Budaya Demokrasi");
    expect(journal.plannedLearningOutcome).toBe("Peserta didik mampu menerapkan sikap demokratis");

    // Auto-fill dari attendance (5 siswa semua hadir)
    expect(journal.presentCount).toBe(5);
    expect(journal.sickCount).toBe(0);
    expect(journal.excusedCount).toBe(0);
    expect(journal.absentCount).toBe(0);
    expect(journal.totalStudents).toBe(5);

    // Default — guru bisa ubah
    expect(journal.realizationStatus).toBe("done");
    expect(journal.status).toBe("draft");
    expect(journal.locked).toBe(false);
  });

  it("tanpa plannedUnit → plannedMaterialTitle null", () => {
    const session = makeSession({ plannedUnitId: null });
    const attendance = generateDefaultAttendance({
      roster: makeRoster(3),
      sessionId: session.id,
      date: session.date,
    });

    const journal = generateJournalFromSession({
      session,
      plannedUnit: null,
      attendanceRecords: attendance,
    });

    expect(journal.plannedUnitId).toBeNull();
    expect(journal.plannedMaterialTitle).toBeNull();
    expect(journal.plannedLearningOutcome).toBeNull();
  });

  it("attendance kosong → totalStudents=0", () => {
    const session = makeSession();
    const journal = generateJournalFromSession({
      session,
      plannedUnit: makeProtaUnit(),
      attendanceRecords: [],
    });

    expect(journal.totalStudents).toBe(0);
    expect(journal.presentCount).toBe(0);
  });
});

describe("journal-helpers — applyJournalInput", () => {
  it("guru ubah realizationStatus + note", () => {
    const session = makeSession();
    const journal = generateJournalFromSession({
      session,
      plannedUnit: makeProtaUnit(),
      attendanceRecords: generateDefaultAttendance({
        roster: makeRoster(5),
        sessionId: session.id,
        date: session.date,
      }),
    });

    const updated = applyJournalInput(journal, {
      realizationStatus: "continued",
      note: "Materi belum selesai, lanjut pertemuan berikutnya",
    });

    expect(updated.realizationStatus).toBe("continued");
    expect(updated.note).toBe("Materi belum selesai, lanjut pertemuan berikutnya");
    // Field auto-fill tetap
    expect(updated.plannedMaterialTitle).toBe("Budaya Demokrasi");
    expect(updated.presentCount).toBe(5);
  });

  it("guru isi actualMaterialTitle bila berbeda dari rencana", () => {
    const session = makeSession();
    const journal = generateJournalFromSession({
      session,
      plannedUnit: makeProtaUnit(),
      attendanceRecords: [],
    });

    const updated = applyJournalInput(journal, {
      actualMaterialTitle: "Materi Darurat: Kebudayaan Indonesia",
    });

    expect(updated.actualMaterialTitle).toBe("Materi Darurat: Kebudayaan Indonesia");
    expect(updated.plannedMaterialTitle).toBe("Budaya Demokrasi"); // planned tetap
  });
});

describe("journal-helpers — resyncJournalAttendance", () => {
  it("absensi berubah → journal ter-update", () => {
    const session = makeSession();
    const roster = makeRoster(5);
    const attendance = generateDefaultAttendance({
      roster,
      sessionId: session.id,
      date: session.date,
    });
    const journal = generateJournalFromSession({
      session,
      plannedUnit: makeProtaUnit(),
      attendanceRecords: attendance,
    });

    expect(journal.presentCount).toBe(5);

    // Ubah 2 siswa jadi sick
    const updatedAttendance = applyAttendanceChanges(attendance, [
      { studentId: "student-1", status: "sick" },
      { studentId: "student-2", status: "sick" },
    ]);

    const resynced = resyncJournalAttendance(journal, updatedAttendance);
    expect(resynced.presentCount).toBe(3);
    expect(resynced.sickCount).toBe(2);
  });
});

describe("journal-helpers — isJournalComplete", () => {
  it("lengkap bila ada materi + absensi + realizationStatus", () => {
    const session = makeSession();
    const journal = generateJournalFromSession({
      session,
      plannedUnit: makeProtaUnit(),
      attendanceRecords: generateDefaultAttendance({
        roster: makeRoster(5),
        sessionId: session.id,
        date: session.date,
      }),
    });

    const check = isJournalComplete(journal);
    expect(check.complete).toBe(true);
    expect(check.missingFields).toEqual([]);
  });

  it("belum lengkap bila totalStudents=0", () => {
    const session = makeSession();
    const journal = generateJournalFromSession({
      session,
      plannedUnit: makeProtaUnit(),
      attendanceRecords: [],
    });

    const check = isJournalComplete(journal);
    expect(check.complete).toBe(false);
    expect(check.missingFields).toContain("Absensi (totalStudents=0, mungkin belum ada siswa di roster)");
  });

  it("belum lengkap bila tidak ada plannedMaterialTitle dan actualMaterialTitle", () => {
    const session = makeSession({ plannedUnitId: null });
    const journal = generateJournalFromSession({
      session,
      plannedUnit: null,
      attendanceRecords: generateDefaultAttendance({
        roster: makeRoster(5),
        sessionId: session.id,
        date: session.date,
      }),
    });

    const check = isJournalComplete(journal);
    expect(check.complete).toBe(false);
    expect(check.missingFields).toContain("Materi (planned atau actual)");
  });
});

describe("journal-helpers — finalizeJournal", () => {
  it("bisa finalize bila lengkap", () => {
    const session = makeSession();
    const journal = generateJournalFromSession({
      session,
      plannedUnit: makeProtaUnit(),
      attendanceRecords: generateDefaultAttendance({
        roster: makeRoster(5),
        sessionId: session.id,
        date: session.date,
      }),
    });

    const result = finalizeJournal(journal);
    expect(result.success).toBe(true);
    expect(result.journal?.status).toBe("final");
    expect(result.journal?.locked).toBe(true);
    expect(result.journal?.finalizedAt).toBeTruthy();
  });

  it("tidak bisa finalize bila belum lengkap", () => {
    const session = makeSession();
    const journal = generateJournalFromSession({
      session,
      plannedUnit: null,
      attendanceRecords: [],
    });

    const result = finalizeJournal(journal);
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
