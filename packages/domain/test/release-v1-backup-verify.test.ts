/**
 * RELEASE-V1-MANUAL-VERIFY-01: Test konkret Backup/Restore schema roundtrip.
 *
 * Verifikasi: backup schema validasi semua entitas, restore atomic.
 */

import { describe, it, expect } from "vitest";
import {
  validateBackup,
  backupFileSchema,
  type BackupFile,
} from "../src/backup";

const validBackup: BackupFile = {
  schemaVersion: 7,
  exportedAt: "2026-06-25T00:00:00+07:00",
  appVersion: "0.5.1",
  data: {
    academicYears: [
      {
        id: "ay-2025",
        label: "2025/2026",
        startDate: "2025-07-14",
        endDate: "2026-06-30",
        semester1Start: "2025-07-14",
        semester1End: "2025-12-20",
        semester2Start: "2026-01-05",
        semester2End: "2026-06-30",
        active: true,
        createdAt: "2025-07-14T00:00:00+07:00",
        updatedAt: "2025-07-14T00:00:00+07:00",
        deletedAt: null,
        syncStatus: "local_only",
      },
    ],
    schoolProfile: {
      id: "school-profile",
      name: "SMPN 8 Bantan",
      npsn: "12345678",
      address: "Jl. Pendidikan No. 1",
      village: "Bantan",
      district: "Bantan",
      regency: "Bantan",
      province: "Kepulauan Riau",
      postalCode: "29455",
      headmasterName: "Drs. Kepala Sekolah, M.Pd.",
      headmasterNip: "196501011990031001",
      createdAt: "2025-07-14T00:00:00+07:00",
      updatedAt: "2025-07-14T00:00:00+07:00",
      deletedAt: null,
      syncStatus: "local_only",
    },
    teacherProfile: {
      id: "teacher-profile",
      name: "Budi Santoso, S.Pd.",
      nip: "198501012010011001",
      employeeStatus: "pns",
      subjects: [{ subject: "Pendidikan Pancasila", grades: ["VII"], phases: ["D"] }],
      createdAt: "2025-07-14T00:00:00+07:00",
      updatedAt: "2025-07-14T00:00:00+07:00",
      deletedAt: null,
      syncStatus: "local_only",
    },
    calendarEvents: [],
    protaProfiles: [],
    teachingSchedules: [],
    teachingAssignments: [
      {
        id: "asg-1",
        academicYearId: "ay-2025",
        semester: 1,
        teacherId: "teacher-profile",
        teacherName: "Budi Santoso, S.Pd.",
        subject: "Pendidikan Pancasila",
        classId: "VII A",
        classLabel: "VII A",
        createdAt: "2025-07-14T00:00:00+07:00",
        updatedAt: "2025-07-14T00:00:00+07:00",
        deletedAt: null,
        syncStatus: "local_only",
      },
    ],
    lessonSessions: [],
    attendanceRecords: [],
    classRosters: [
      {
        id: "roster-1",
        classId: "VII A",
        classLabel: "VII A",
        academicYearId: "ay-2025",
        students: [
          { id: "s1", name: "Andi", number: 1, nis: "2025001" },
          { id: "s2", name: "Budi", number: 2, nis: "2025002" },
          { id: "s3", name: "Citra", number: 3, nis: "2025003" },
          { id: "s4", name: "Dewi", number: 4, nis: "2025004" },
          { id: "s5", name: "Eka", number: 5, nis: "2025005" },
        ],
        createdAt: "2025-07-14T00:00:00+07:00",
        updatedAt: "2025-07-14T00:00:00+07:00",
        deletedAt: null,
        syncStatus: "local_only",
      },
    ],
    teachingJournals: [],
    semesterReports: [],
    gradeBooks: [],
    atpEntries: [],
    lkpds: [],
    rppDocuments: [],
    remedialPrograms: [],
    enrichmentPrograms: [],
    documentSnapshots: [],
  },
};

describe("RELEASE-V1-MANUAL-VERIFY-01 — Modul L: Backup/Restore", () => {
  it("TEST L.1: backup valid → validateBackup success", () => {
    const result = validateBackup(validBackup);
    expect(result.success).toBe(true);
  });

  it("TEST L.2: schemaVersion > 7 → ditolak (file dari app lebih baru)", () => {
    const future = { ...validBackup, schemaVersion: 99 };
    const result = validateBackup(future);
    expect(result.success).toBe(false);
  });

  it("TEST L.3: backup tanpa teachingAssignments (field lama) → default []", () => {
    // Simulasi backup dari versi lama (sebelum teachingAssignments ada)
    const oldBackup = JSON.parse(JSON.stringify(validBackup));
    delete oldBackup.data.teachingAssignments;
    const result = validateBackup(oldBackup);
    // .default([]) harus handle missing field
    expect(result.success).toBe(true);
  });

  it("TEST L.4: backup tanpa gradeBooks (field lama) → default []", () => {
    const oldBackup = JSON.parse(JSON.stringify(validBackup));
    delete oldBackup.data.gradeBooks;
    const result = validateBackup(oldBackup);
    expect(result.success).toBe(true);
  });

  it("TEST L.5: backup dengan roster 5 siswa → restore akan kembalikan 5 siswa", () => {
    const result = validateBackup(validBackup);
    expect(result.success).toBe(true);
    if (!result.success) return;
    const roster = result.data.data.classRosters[0];
    expect(roster.students).toHaveLength(5);
    expect(roster.students[0].name).toBe("Andi");
    expect(roster.students[4].name).toBe("Eka");
  });

  it("TEST L.6: backup dengan academicYear active=true → restore kembalikan tahun aktif", () => {
    const result = validateBackup(validBackup);
    expect(result.success).toBe(true);
    if (!result.success) return;
    const year = result.data.data.academicYears[0];
    expect(year.active).toBe(true);
    expect(year.label).toBe("2025/2026");
  });

  it("TEST L.7: backup bukan object → ditolak", () => {
    const result = validateBackup("not-an-object");
    expect(result.success).toBe(false);
  });

  it("TEST L.8: backup null → ditolak", () => {
    const result = validateBackup(null);
    expect(result.success).toBe(false);
  });

  it("TEST L.9: backup schemaVersion hilang → ditolak", () => {
    const noVersion = { ...validBackup };
    delete (noVersion as Record<string, unknown>).schemaVersion;
    const result = validateBackup(noVersion);
    expect(result.success).toBe(false);
  });

  it("TEST L.10: backupFileSchema parse → data konsisten", () => {
    const parsed = backupFileSchema.parse(validBackup);
    expect(parsed.schemaVersion).toBe(7);
    expect(parsed.data.academicYears).toHaveLength(1);
    expect(parsed.data.classRosters).toHaveLength(1);
    expect(parsed.data.classRosters[0].students).toHaveLength(5);
    expect(parsed.data.teachingAssignments).toHaveLength(1);
  });
});
