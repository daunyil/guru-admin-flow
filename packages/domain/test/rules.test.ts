import { describe, it, expect } from "vitest";
import { ensureSingleActiveYear, planNewYearFromPrevious } from "../src";
import type { AcademicYear, SchoolProfile, TeacherProfile, ProtaProfile, TeachingSchedule } from "../src";

const baseTimestamp = "2025-06-01T00:00:00+07:00";

const sourceYear: AcademicYear = {
  id: "y-2025",
  label: "2025/2026",
  startDate: "2025-07-14",
  endDate: "2026-06-13",
  semester1Start: "2025-07-14",
  semester1End: "2025-12-20",
  semester2Start: "2026-01-05",
  semester2End: "2026-06-13",
  active: true,
  sourceYearId: null,
  createdAt: baseTimestamp,
  updatedAt: baseTimestamp,
  deletedAt: null,
  syncStatus: "local_only",
};

const oldYear: AcademicYear = {
  ...sourceYear,
  id: "y-2024",
  label: "2024/2025",
  startDate: "2024-07-15",
  endDate: "2025-06-14",
  semester1Start: "2024-07-15",
  semester1End: "2024-12-21",
  semester2Start: "2025-01-06",
  semester2End: "2025-06-14",
  active: false,
};

const school: SchoolProfile = {
  id: "school-profile",
  name: "SMPN 8 Bantan",
  npsn: "12345678",
  address: "Jl. Contoh",
  village: "Bantan",
  district: "Bantan",
  regency: "Bengkalis",
  province: "Riau",
  headmasterName: "Drs. Budi",
  createdAt: baseTimestamp,
  updatedAt: baseTimestamp,
  deletedAt: null,
  syncStatus: "local_only",
};

const teacher: TeacherProfile = {
  id: "teacher-profile",
  name: "Siti Aminah, S.Pd.",
  employeeStatus: "pns",
  subjects: [{ subject: "Pendidikan Pancasila", grades: ["VII"], phases: ["D"] }],
  createdAt: baseTimestamp,
  updatedAt: baseTimestamp,
  deletedAt: null,
  syncStatus: "local_only",
};

const prota2024: ProtaProfile = {
  id: "prota-2024",
  academicYearId: "y-2024",
  subject: "Pendidikan Pancasila",
  grade: "VII",
  phase: "D",
  teacherId: "teacher-profile",
  annualIntraJP: 72,
  semester1IntraJP: 36,
  semester2IntraJP: 36,
  units: [
    {
      id: "unit-old-1",
      protaProfileId: "prota-2024",
      semester: 1,
      title: "Budaya Demokrasi",
      jp: 12,
      order: 1,
      createdAt: baseTimestamp,
      updatedAt: baseTimestamp,
      deletedAt: null,
      syncStatus: "local_only",
    },
  ],
  status: "final",
  sourceYearId: null,
  createdAt: baseTimestamp,
  updatedAt: baseTimestamp,
  deletedAt: null,
  syncStatus: "synced",
};

const schedule2024: TeachingSchedule = {
  id: "sched-2024-1",
  academicYearId: "y-2024",
  teacherId: "teacher-profile",
  subject: "Pendidikan Pancasila",
  classId: "VII A",
  classLabel: "VII A",
  dayOfWeek: 1,
  startPeriod: 1,
  durationJP: 2,
  startTime: "07:30",
  endTime: "08:50",
  semester: 1,
  source: "manual",
  createdAt: baseTimestamp,
  updatedAt: baseTimestamp,
  deletedAt: null,
  syncStatus: "synced",
};

describe("rules — ensureSingleActiveYear", () => {
  it("valid bila tidak ada tahun aktif lain", () => {
    const r = ensureSingleActiveYear([oldYear], "y-2025");
    expect(r.valid).toBe(true);
    expect(r.conflictIds).toEqual([]);
  });

  it("invalid bila ada tahun aktif lain", () => {
    const r = ensureSingleActiveYear([sourceYear, oldYear]);
    expect(r.valid).toBe(false);
    expect(r.conflictIds).toEqual(["y-2025"]);
  });

  it("ignore id yang sedang di-activate", () => {
    const r = ensureSingleActiveYear([sourceYear], "y-2025");
    expect(r.valid).toBe(true);
  });
});

describe("rules — planNewYearFromPrevious", () => {
  it("membuat newYear dengan label dan tanggal baru", () => {
    const plan = planNewYearFromPrevious({
      sourceYear: oldYear,
      newLabel: "2025/2026",
      newStartDate: "2025-07-14",
      newEndDate: "2026-06-13",
      newSemester1Start: "2025-07-14",
      newSemester1End: "2025-12-20",
      newSemester2Start: "2026-01-05",
      newSemester2End: "2026-06-13",
      schoolProfile: school,
      teacherProfile: teacher,
      protaProfiles: [prota2024],
      teachingSchedules: [schedule2024],
    });

    expect(plan.newYear.label).toBe("2025/2026");
    expect(plan.newYear.startDate).toBe("2025-07-14");
    expect(plan.newYear.active).toBe(true);
    expect(plan.newYear.sourceYearId).toBe("y-2024");
  });

  it("menyalin ProtaProfile dari tahun sumber dengan status draft", () => {
    const plan = planNewYearFromPrevious({
      sourceYear: oldYear,
      newLabel: "2025/2026",
      newStartDate: "2025-07-14",
      newEndDate: "2026-06-13",
      newSemester1Start: "2025-07-14",
      newSemester1End: "2025-12-20",
      newSemester2Start: "2026-01-05",
      newSemester2End: "2026-06-13",
      schoolProfile: school,
      teacherProfile: teacher,
      protaProfiles: [prota2024],
      teachingSchedules: [schedule2024],
    });

    expect(plan.newProtaProfiles).toHaveLength(1);
    expect(plan.newProtaProfiles[0].subject).toBe("Pendidikan Pancasila");
    expect(plan.newProtaProfiles[0].status).toBe("draft"); // status reset ke draft
    expect(plan.newProtaProfiles[0].sourceYearId).toBe("prota-2024");
    expect(plan.newProtaProfiles[0].units).toHaveLength(1);
    expect(plan.newProtaProfiles[0].units[0].title).toBe("Budaya Demokrasi");
  });

  it("menyalin TeachingSchedule dengan source: manual", () => {
    const plan = planNewYearFromPrevious({
      sourceYear: oldYear,
      newLabel: "2025/2026",
      newStartDate: "2025-07-14",
      newEndDate: "2026-06-13",
      newSemester1Start: "2025-07-14",
      newSemester1End: "2025-12-20",
      newSemester2Start: "2026-01-05",
      newSemester2End: "2026-06-13",
      schoolProfile: school,
      teacherProfile: teacher,
      protaProfiles: [prota2024],
      teachingSchedules: [schedule2024],
    });

    expect(plan.newTeachingSchedules).toHaveLength(1);
    expect(plan.newTeachingSchedules[0].source).toBe("manual");
    expect(plan.newTeachingSchedules[0].classLabel).toBe("VII A");
  });

  it("field BaseEntity (id, createdAt, dst) TIDAK ada di hasil plan", () => {
    const plan = planNewYearFromPrevious({
      sourceYear: oldYear,
      newLabel: "2025/2026",
      newStartDate: "2025-07-14",
      newEndDate: "2026-06-13",
      newSemester1Start: "2025-07-14",
      newSemester1End: "2025-12-20",
      newSemester2Start: "2026-01-05",
      newSemester2End: "2026-06-13",
      schoolProfile: school,
      teacherProfile: teacher,
      protaProfiles: [prota2024],
      teachingSchedules: [schedule2024],
    });

    // newYear tidak boleh punya field BaseEntity
    expect("id" in plan.newYear).toBe(false);
    expect("createdAt" in plan.newYear).toBe(false);
    expect("syncStatus" in plan.newYear).toBe(false);

    // ProtaProfile baru juga tidak boleh
    expect("id" in plan.newProtaProfiles[0]).toBe(false);
    expect("createdAt" in plan.newProtaProfiles[0]).toBe(false);

    // Unit juga tidak boleh
    expect("id" in plan.newProtaProfiles[0].units[0]).toBe(false);
  });

  it("hanya menyalin entitas yang academicYearId cocok dengan sourceYear", () => {
    const anotherYearProta: ProtaProfile = {
      ...prota2024,
      id: "prota-other",
      academicYearId: "y-other",
    };
    const plan = planNewYearFromPrevious({
      sourceYear: oldYear,
      newLabel: "2025/2026",
      newStartDate: "2025-07-14",
      newEndDate: "2026-06-13",
      newSemester1Start: "2025-07-14",
      newSemester1End: "2025-12-20",
      newSemester2Start: "2026-01-05",
      newSemester2End: "2026-06-13",
      schoolProfile: school,
      teacherProfile: teacher,
      protaProfiles: [prota2024, anotherYearProta],
      teachingSchedules: [schedule2024],
    });

    expect(plan.newProtaProfiles).toHaveLength(1); // hanya prota2024
    expect(plan.newProtaProfiles[0].sourceYearId).toBe("prota-2024");
  });
});
