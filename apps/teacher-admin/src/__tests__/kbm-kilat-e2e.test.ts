/**
 * E2E Test — KBM Kilat Flow: Presensi → Jurnal → Nilai → Simpan
 *
 * Tests the complete data flow using actual repo functions and Dexie IndexedDB.
 * Uses fake-indexeddb to simulate the browser environment.
 *
 * Validates:
 *   1. Init attendance for session (default all present)
 *   2. Update attendance changes (sick, absent, late, excused)
 *   3. Verify auto-sync attendance counts
 *   4. Init journal for session (auto-sync from attendance)
 *   5. Update journal with actual material title
 *   6. Save nilai to gradebook (uh1 field)
 *   7. Verify gradebook UH model calculation
 *   8. Update gradebook with additional scores
 *   9. Resync journal with updated attendance
 *  10. Find gradebook by composite key
 *  11. calculateGradeBookEntries independent verification
 */

import "fake-indexeddb/auto";
import { describe, it, expect, beforeAll } from "vitest";

// Use relative imports to avoid path alias resolution issues in vitest
import { db } from "../shared/db/schema";
import {
  saveSchoolProfile,
  saveTeacherProfile,
  saveAcademicYear,
  getActiveAcademicYear,
  getTeacherProfile,
} from "../shared/db/profile-repo";
import {
  saveClassRoster,
  findClassRoster,
} from "../shared/db/class-roster-repo";
import {
  saveTeachingSchedule,
  listTeachingSchedules,
} from "../shared/db/teaching-schedule-repo";
import {
  autoGenerateFromSchedules,
  listAssignments,
} from "../shared/db/teaching-assignment-repo";
import {
  generateAndSaveLessonSessions,
  getLessonSessionsByDate,
  getLessonSession,
  findOrCreateManualSession,
} from "../shared/db/lesson-session-repo";
import {
  listCalendarEvents,
} from "../shared/db/calendar-repo";
import {
  initAttendanceForSession,
  updateAttendance,
  getAttendanceBySession,
} from "../shared/db/attendance-repo";
import {
  initJournalForSession,
  updateJournal,
  resyncJournal,
  getJournalBySession,
} from "../shared/db/journal-repo";
import {
  findGradeBook,
  saveGradeBook,
  updateGradeBook,
  getGradeBook,
} from "../shared/db/gradebook-repo";
import {
  summarizeAttendance,
  calculateGradeBookEntries,
} from "@guru-admin/domain";
import type {
  AttendanceStatus,
  AttendanceRecord,
  GradeBook,
  GradeEntry,
  LessonSession,
  TeachingJournal,
  ClassRoster,
} from "@guru-admin/domain";

/* ============================================================ */
/*  Shared test data                                             */
/* ============================================================ */

let yearId: string;
let teacherId: string;
let sessionId: string;
let session: LessonSession;
let roster: ClassRoster;

const STUDENTS = [
  { id: "s1", name: "Ahmad Rizky", number: 1, nis: "2025001" },
  { id: "s2", name: "Budi Santoso", number: 2, nis: "2025002" },
  { id: "s3", name: "Citra Dewi", number: 3, nis: "2025003" },
  { id: "s4", name: "Dian Permata", number: 4, nis: "2025004" },
  { id: "s5", name: "Eka Putra", number: 5, nis: "2025005" },
  { id: "s6", name: "Fitri Handayani", number: 6, nis: "2025006" },
  { id: "s7", name: "Galih Pratama", number: 7, nis: "2025007" },
  { id: "s8", name: "Hani Safitri", number: 8, nis: "2025008" },
  { id: "s9", name: "Irfan Maulana", number: 9, nis: "2025009" },
  { id: "s10", name: "Joko Widodo", number: 10, nis: "2025010" },
];

/* ============================================================ */
/*  Setup: Seed minimal data                                     */
/* ============================================================ */

beforeAll(async () => {
  // Clear all tables
  await db.schoolProfile.clear();
  await db.teacherProfile.clear();
  await db.academicYears.clear();
  await db.classRosters.clear();
  await db.teachingSchedules.clear();
  await db.teachingAssignments.clear();
  await db.lessonSessions.clear();
  await db.attendanceRecords.clear();
  await db.teachingJournals.clear();
  await db.gradeBooks.clear();

  // School profile
  await saveSchoolProfile({
    name: "SMPN 8 Bantan",
    npsn: "10452678",
    address: "Jl. Pendidikan No. 1, Bantan",
    village: "Bantan",
    district: "Bantan",
    regency: "Bengkalis",
    province: "Riau",
    postalCode: "28791",
    phone: "0766-123456",
    email: "smpn8bantan@example.com",
    headmasterName: "Drs. H. Suparman, M.Pd.",
    headmasterNip: "196512121986031005",
  });

  // Teacher profile
  await saveTeacherProfile({
    name: "Siti Aminah, S.Pd.",
    nip: "198503152010012005",
    email: "siti.aminah@example.com",
    phone: "0812-3456-7890",
    employeeStatus: "pns",
    subjects: [
      { subject: "Pendidikan Pancasila", grades: ["VII"], phases: ["D"] },
    ],
  });

  const teacher = await getTeacherProfile();
  teacherId = teacher!.id;

  // Academic year
  await saveAcademicYear({
    label: "2025/2026",
    startDate: "2025-07-14",
    endDate: "2026-06-13",
    semester1Start: "2025-07-14",
    semester1End: "2025-12-20",
    semester2Start: "2026-01-05",
    semester2End: "2026-06-13",
    active: true,
    sourceYearId: null,
  });

  const year = await getActiveAcademicYear();
  yearId = year!.id;

  // Class roster — VII A with 10 students
  await saveClassRoster({
    classId: "class-vii-a",
    classLabel: "VII A",
    academicYearId: yearId,
    students: STUDENTS,
  });

  roster = (await findClassRoster(yearId, "class-vii-a"))!;

  // Teaching schedule — use today's day of week
  const dayOfWeek = new Date().getDay();

  await saveTeachingSchedule({
    academicYearId: yearId,
    teacherId,
    classId: "class-vii-a",
    classLabel: "VII A",
    subject: "Pendidikan Pancasila",
    dayOfWeek,
    startTime: "07:00",
    endTime: "08:20",
    startPeriod: 1,
    durationJP: 2,
    semester: 1,
  });

  // Generate teaching assignments
  const allSchedules = await listTeachingSchedules(yearId);
  const teacherProfile = await getTeacherProfile();
  await autoGenerateFromSchedules({
    academicYear: year!,
    teacher: teacherProfile!,
    schedules: allSchedules,
    semester: 1,
  });

  // Generate lesson sessions for today
  // Use findOrCreateManualSession to create a session directly
  const today = new Date().toISOString().split("T")[0];
  const { session: manualSession } = await findOrCreateManualSession({
    mode: "susulan",
    academicYear: year!,
    teacherId,
    roster,
    subject: "Pendidikan Pancasila",
    date: today,
  });

  sessionId = manualSession.id;
  session = manualSession;
}, 60000);

/* ============================================================ */
/*  Tests                                                        */
/* ============================================================ */

describe("KBM Kilat — Step 1: Init Attendance", () => {
  it("should create attendance records for all students", async () => {
    const records = await initAttendanceForSession({
      sessionId,
      date: session.date,
      roster,
    });

    expect(records.length).toBe(10);
  });

  it("should default all students to 'present'", async () => {
    const records = await getAttendanceBySession(sessionId);
    const allPresent = records.every((r) => r.status === "present");
    expect(allPresent).toBe(true);
  });

  it("should show correct summary: 10 present, 0 others", async () => {
    const records = await getAttendanceBySession(sessionId);
    const summary = summarizeAttendance(records);
    expect(summary.present).toBe(10);
    expect(summary.sick).toBe(0);
    expect(summary.absent).toBe(0);
    expect(summary.late).toBe(0);
    expect(summary.excused).toBe(0);
  });
});

describe("KBM Kilat — Step 2: Update Attendance", () => {
  it("should apply status changes correctly", async () => {
    const changes = [
      { studentId: "s2", status: "sick" as AttendanceStatus },
      { studentId: "s5", status: "absent" as AttendanceStatus },
      { studentId: "s7", status: "late" as AttendanceStatus },
      { studentId: "s9", status: "excused" as AttendanceStatus },
    ];

    const updated = await updateAttendance(sessionId, changes);

    const s2 = updated.find((r) => r.studentId === "s2");
    const s5 = updated.find((r) => r.studentId === "s5");
    const s7 = updated.find((r) => r.studentId === "s7");
    const s9 = updated.find((r) => r.studentId === "s9");

    expect(s2?.status).toBe("sick");
    expect(s5?.status).toBe("absent");
    expect(s7?.status).toBe("late");
    expect(s9?.status).toBe("excused");
  });

  it("should compute correct summary after changes", async () => {
    const records = await getAttendanceBySession(sessionId);
    const summary = summarizeAttendance(records);

    expect(summary.present).toBe(6);   // 10 - 4 changed
    expect(summary.sick).toBe(1);      // s2
    expect(summary.absent).toBe(1);    // s5
    expect(summary.late).toBe(1);      // s7
    expect(summary.excused).toBe(1);   // s9
  });

  it("should persist attendance changes in IndexedDB", async () => {
    const records = await getAttendanceBySession(sessionId);
    const s2 = records.find((r) => r.studentId === "s2");
    const s5 = records.find((r) => r.studentId === "s5");

    expect(s2?.status).toBe("sick");
    expect(s5?.status).toBe("absent");
  });
});

describe("KBM Kilat — Step 3: Init Journal (auto-sync from attendance)", () => {
  it("should create journal with auto-synced attendance counts", async () => {
    const attendanceRecords = await getAttendanceBySession(sessionId);
    const journal = await initJournalForSession({
      session,
      attendanceRecords,
    });

    expect(journal).not.toBeNull();
    expect(journal.sessionId).toBe(sessionId);
    expect(journal.presentCount).toBe(6);
    expect(journal.sickCount).toBe(1);
    expect(journal.absentCount).toBe(1);
    expect(journal.lateCount).toBe(1);
    expect(journal.excusedCount).toBe(1);
    expect(journal.totalStudents).toBe(10);
  });
});

describe("KBM Kilat — Step 4: Update Journal", () => {
  let journal: TeachingJournal;

  beforeAll(async () => {
    journal = (await getJournalBySession(sessionId))!;
  });

  it("should save actual material title and note", async () => {
    const updated = await updateJournal(journal.id, {
      actualMaterialTitle: "Pancasila sebagai Dasar Negara",
      note: "Siswa aktif berdiskusi tentang sila ke-3",
      realizationStatus: "done",
    });

    expect(updated?.actualMaterialTitle).toBe("Pancasila sebagai Dasar Negara");
    expect(updated?.note).toBe("Siswa aktif berdiskusi tentang sila ke-3");
    expect(updated?.realizationStatus).toBe("done");
  });

  it("should persist journal updates in IndexedDB", async () => {
    const j = await getJournalBySession(sessionId);
    expect(j?.actualMaterialTitle).toBe("Pancasila sebagai Dasar Negara");
    expect(j?.presentCount).toBe(6); // Counts should still be synced
  });
});

describe("KBM Kilat — Step 5: Save Nilai to GradeBook (uh1)", () => {
  let gradeBook: GradeBook;

  it("should create a new GradeBook with uh1 values", async () => {
    const nilaiMap = new Map<string, number>();
    nilaiMap.set("s1", 85);
    nilaiMap.set("s2", 72);
    nilaiMap.set("s3", 90);
    nilaiMap.set("s4", 65);
    nilaiMap.set("s6", 78);
    nilaiMap.set("s8", 88);
    nilaiMap.set("s10", 95);
    // s5, s7, s9 — no score

    const entries: GradeEntry[] = roster.students
      .sort((a, b) => a.number - b.number)
      .map((s) => {
        const nilai = nilaiMap.get(s.id) ?? null;
        return {
          studentId: s.id,
          studentName: s.name,
          studentNumber: s.number,
          nis: s.nis,
          kd1: null, kd2: null, kd3: null, kd4: null, kd5: null, kd6: null,
          kd7: null, kd8: null, kd9: null, kd10: null,
          uh1: nilai,
          uh2: null, uh3: null, uh4: null, uh5: null, uh6: null,
          uh7: null, uh8: null, uh9: null, uh10: null,
          pts: null, pas: null, uts: null, uas: null,
          finalScore: null, averageKd: null,
          dailyScore: null, assignmentScore: null, summativeScore: null,
          remedialScore: null, averageScore: null,
          status: nilai !== null ? "complete" as const : "incomplete" as const,
        } as GradeEntry;
      });

    gradeBook = await saveGradeBook({
      academicYearId: yearId,
      teacherId,
      classId: session.classId,
      classLabel: session.classLabel,
      subject: session.subject,
      semester: session.semester,
      passingScore: 75,
      entries,
      status: "draft",
      gradeModel: "uh",
      uhCount: 2,
      kdCount: 6,
      weightUH: 25,
      weightUTS: 25,
      weightUAS: 50,
    });

    expect(gradeBook).not.toBeNull();
    expect(gradeBook.entries.length).toBe(10);
    expect(gradeBook.gradeModel).toBe("uh");
  });

  it("should calculate finalScore for students with uh1 only (proportional mode)", async () => {
    const gb = await getGradeBook(gradeBook.id);
    expect(gb).not.toBeUndefined();

    // Students with uh1 filled: finalScore should be calculated
    // With only UH component (no UTS/UAS), proportional mode:
    //   finalScore = avgUH (since only one component, weight normalizes to 100%)
    //   avgUH = uh1 (only one UH filled)
    // So finalScore = uh1

    const s1 = gb!.entries.find((e) => e.studentId === "s1");
    expect(s1?.uh1).toBe(85);
    expect(s1?.finalScore).toBe(85); // Proportional: avgUH=85, weight normalizes
    expect(s1?.status).toBe("complete"); // 85 >= 75

    const s4 = gb!.entries.find((e) => e.studentId === "s4");
    expect(s4?.uh1).toBe(65);
    expect(s4?.finalScore).toBe(65); // Proportional: avgUH=65
    expect(s4?.status).toBe("remedial"); // 65 < 75

    const s2 = gb!.entries.find((e) => e.studentId === "s2");
    expect(s2?.uh1).toBe(72);
    expect(s2?.finalScore).toBe(72); // Proportional: avgUH=72
    expect(s2?.status).toBe("remedial"); // 72 < 75
  });

  it("should mark students without uh1 as incomplete", async () => {
    const gb = await getGradeBook(gradeBook.id);

    const s5 = gb!.entries.find((e) => e.studentId === "s5");
    expect(s5?.uh1).toBeNull();
    expect(s5?.status).toBe("incomplete");

    const s7 = gb!.entries.find((e) => e.studentId === "s7");
    expect(s7?.uh1).toBeNull();
    expect(s7?.status).toBe("incomplete");
  });
});

describe("KBM Kilat — Step 6: Update GradeBook with additional scores", () => {
  let gradeBook: GradeBook;

  beforeAll(async () => {
    const gb = await findGradeBook({
      academicYearId: yearId,
      teacherId,
      classId: session.classId,
      semester: session.semester,
      subject: session.subject,
    });
    gradeBook = gb!;
  });

  it("should add scores for missing students and recalculate", async () => {
    const updatedEntries = gradeBook.entries.map((e) => {
      if (e.studentId === "s5") return { ...e, uh1: 50 };
      if (e.studentId === "s7") return { ...e, uh1: 80 };
      if (e.studentId === "s9") return { ...e, uh1: 70 };
      return e;
    });

    const updated = await updateGradeBook(gradeBook.id, {
      entries: updatedEntries,
      passingScore: 75,
      gradeModel: "uh",
      uhCount: 2,
      kdCount: 6,
      weightUH: 25,
      weightUTS: 25,
      weightUAS: 50,
    });

    expect(updated).not.toBeUndefined();

    // All students now have uh1
    const allHaveScore = updated!.entries.every((e) => e.uh1 !== null);
    expect(allHaveScore).toBe(true);

    // Verify remedial students
    const s5 = updated!.entries.find((e) => e.studentId === "s5");
    expect(s5?.uh1).toBe(50);
    expect(s5?.status).toBe("remedial"); // 50 < 75

    const s9 = updated!.entries.find((e) => e.studentId === "s9");
    expect(s9?.uh1).toBe(70);
    expect(s9?.status).toBe("remedial"); // 70 < 75

    const s7 = updated!.entries.find((e) => e.studentId === "s7");
    expect(s7?.uh1).toBe(80);
    expect(s7?.status).toBe("complete"); // 80 >= 75
  });
});

describe("KBM Kilat — Step 7: Resync Journal", () => {
  it("should resync journal counts from attendance", async () => {
    const attendanceRecords = await getAttendanceBySession(sessionId);
    const journal = await resyncJournal(sessionId, attendanceRecords);

    expect(journal).not.toBeUndefined();
    expect(journal?.presentCount).toBe(6);
    expect(journal?.sickCount).toBe(1);
    expect(journal?.absentCount).toBe(1);
    expect(journal?.lateCount).toBe(1);
    expect(journal?.excusedCount).toBe(1);
  });
});

describe("KBM Kilat — Step 8: Find GradeBook by composite key", () => {
  it("should find gradebook by academicYearId + teacherId + classId + semester + subject", async () => {
    const found = await findGradeBook({
      academicYearId: yearId,
      teacherId,
      classId: session.classId,
      semester: session.semester,
      subject: session.subject,
    });

    expect(found).not.toBeUndefined();
    expect(found?.classLabel).toBe("VII A");
    expect(found?.subject).toBe("Pendidikan Pancasila");
    expect(found?.gradeModel).toBe("uh");
  });
});

describe("KBM Kilat — Step 9: calculateGradeBookEntries (UH model, full)", () => {
  it("should calculate finalScore with all components (UH + UTS + UAS)", () => {
    const testEntries: GradeEntry[] = [
      {
        studentId: "t1",
        studentName: "Test Student",
        studentNumber: 1,
        kd1: null, kd2: null, kd3: null, kd4: null, kd5: null, kd6: null,
        kd7: null, kd8: null, kd9: null, kd10: null,
        uh1: 80, uh2: 90, uh3: null, uh4: null, uh5: null, uh6: null,
        uh7: null, uh8: null, uh9: null, uh10: null,
        pts: 85, pas: 88, uts: 85, uas: 88,
        finalScore: null, averageKd: null,
        dailyScore: null, assignmentScore: null, summativeScore: null,
        remedialScore: null, averageScore: null,
        status: "incomplete",
      },
    ];

    // UH model with uhCount=2: avgUH = (80+90)/2 = 85
    // finalScore = 85 × 25% + 85 × 25% + 88 × 50% = 21.25 + 21.25 + 44 = 86.5
    const calculated = calculateGradeBookEntries(testEntries, 75, {
      gradeModel: "uh",
      uhCount: 2,
      weightUH: 25,
      weightUTS: 25,
      weightUAS: 50,
    });

    const entry = calculated[0];
    expect(entry.uh1).toBe(80);
    expect(entry.uh2).toBe(90);
    expect(entry.finalScore).toBe(86.5);
    expect(entry.status).toBe("complete"); // 86.5 >= 75
  });

  it("should calculate with only UH component (proportional mode)", () => {
    const testEntries: GradeEntry[] = [
      {
        studentId: "t2",
        studentName: "Only UH Student",
        studentNumber: 2,
        kd1: null, kd2: null, kd3: null, kd4: null, kd5: null, kd6: null,
        kd7: null, kd8: null, kd9: null, kd10: null,
        uh1: 70, uh2: null, uh3: null, uh4: null, uh5: null, uh6: null,
        uh7: null, uh8: null, uh9: null, uh10: null,
        pts: null, pas: null, uts: null, uas: null,
        finalScore: null, averageKd: null,
        dailyScore: null, assignmentScore: null, summativeScore: null,
        remedialScore: null, averageScore: null,
        status: "incomplete",
      },
    ];

    // Only UH component: avgUH = 70, proportional weight normalizes to 100%
    // finalScore = 70
    const calculated = calculateGradeBookEntries(testEntries, 75, {
      gradeModel: "uh",
      uhCount: 2,
      weightUH: 25,
      weightUTS: 25,
      weightUAS: 50,
    });

    const entry = calculated[0];
    expect(entry.finalScore).toBe(70);
    expect(entry.status).toBe("remedial"); // 70 < 75
  });

  it("should mark entry as incomplete when all scores are null", () => {
    const testEntries: GradeEntry[] = [
      {
        studentId: "t3",
        studentName: "Empty Student",
        studentNumber: 3,
        kd1: null, kd2: null, kd3: null, kd4: null, kd5: null, kd6: null,
        kd7: null, kd8: null, kd9: null, kd10: null,
        uh1: null, uh2: null, uh3: null, uh4: null, uh5: null, uh6: null,
        uh7: null, uh8: null, uh9: null, uh10: null,
        pts: null, pas: null, uts: null, uas: null,
        finalScore: null, averageKd: null,
        dailyScore: null, assignmentScore: null, summativeScore: null,
        remedialScore: null, averageScore: null,
        status: "incomplete",
      },
    ];

    const calculated = calculateGradeBookEntries(testEntries, 75, {
      gradeModel: "uh",
      uhCount: 2,
      weightUH: 25,
      weightUTS: 25,
      weightUAS: 50,
    });

    const entry = calculated[0];
    expect(entry.finalScore).toBeNull();
    expect(entry.status).toBe("incomplete");
  });
});

describe("KBM Kilat — Step 10: Full saveAll flow simulation", () => {
  it("should save attendance + journal + gradebook in sequence", async () => {
    // 1. Save attendance changes
    const changes = [
      { studentId: "s3", status: "sick" as AttendanceStatus },
    ];
    const updatedAtt = await updateAttendance(sessionId, changes);
    const s3 = updatedAtt.find((r) => r.studentId === "s3");
    expect(s3?.status).toBe("sick");

    // 2. Save journal
    const journal = await getJournalBySession(sessionId);
    const updatedJournal = await updateJournal(journal!.id, {
      actualMaterialTitle: "Pancasila sebagai Dasar Negara (Lanjutan)",
      note: "Materi hari kedua",
    });
    expect(updatedJournal?.actualMaterialTitle).toBe("Pancasila sebagai Dasar Negara (Lanjutan)");

    // 3. Resync journal after attendance change
    const allAttendance = await getAttendanceBySession(sessionId);
    const resynced = await resyncJournal(sessionId, allAttendance);
    // After adding s3 as sick: present=5, sick=2 (s2 + s3)
    expect(resynced?.sickCount).toBe(2);

    // 4. Save nilai to gradebook
    const existingGB = await findGradeBook({
      academicYearId: yearId,
      teacherId,
      classId: session.classId,
      semester: session.semester,
      subject: session.subject,
    });
    expect(existingGB).not.toBeUndefined();

    // Update s3's uh1 score
    const newEntries = existingGB!.entries.map((e) => {
      if (e.studentId === "s3") return { ...e, uh1: 60 };
      return e;
    });
    const updatedGB = await updateGradeBook(existingGB!.id, {
      entries: newEntries,
      passingScore: 75,
      gradeModel: "uh",
      uhCount: 2,
      kdCount: 6,
      weightUH: 25,
      weightUTS: 25,
      weightUAS: 50,
    });

    const s3Entry = updatedGB!.entries.find((e) => e.studentId === "s3");
    expect(s3Entry?.uh1).toBe(60);
    expect(s3Entry?.status).toBe("remedial"); // 60 < 75
  });
});
