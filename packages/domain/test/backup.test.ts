import { describe, it, expect } from "vitest";
import { validateBackup, type BackupFile } from "../src";
import { DATA_SCHEMA_VERSION } from "@guru-admin/shared";

const minimalBackup: BackupFile = {
  schemaVersion: DATA_SCHEMA_VERSION,
  exportedAt: "2025-06-01T00:00:00+07:00",
  appVersion: "0.1.0-sprint1",
  data: {
    academicYears: [],
    schoolProfile: null,
    teacherProfile: null,
    calendarEvents: [],
    protaProfiles: [],
    teachingSchedules: [],
    lessonSessions: [],
    attendanceRecords: [],
    classRosters: [],
    teachingJournals: [],
    semesterReports: [],
    documentSnapshots: [],
  },
};

describe("backup — validateBackup", () => {
  it("backup minimal valid → success", () => {
    const r = validateBackup(minimalBackup);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.summary.schemaVersion).toBe(DATA_SCHEMA_VERSION);
      expect(r.summary.hasSchoolProfile).toBe(false);
    }
  });

  it("schemaVersion lebih baru → ditolak", () => {
    const r = validateBackup({
      ...minimalBackup,
      schemaVersion: DATA_SCHEMA_VERSION + 1,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.message).toContain("lebih baru");
    }
  });

  it("struktur data salah → ditolak", () => {
    const r = validateBackup({
      schemaVersion: 1,
      exportedAt: "2025-06-01",
      appVersion: "0.1.0",
      data: { academicYears: "not-an-array" },
    });
    expect(r.success).toBe(false);
  });

  it("field wajib hilang → ditolak", () => {
    const r = validateBackup({
      schemaVersion: 1,
      // exportedAt hilang
      appVersion: "0.1.0",
      data: {},
    });
    expect(r.success).toBe(false);
  });

  it("summary counts benar", () => {
    const r = validateBackup({
      ...minimalBackup,
      data: {
        ...minimalBackup.data,
        academicYears: [
          {
            id: "y1",
            label: "2025/2026",
            startDate: "2025-07-14",
            endDate: "2026-06-13",
            semester1Start: "2025-07-14",
            semester1End: "2025-12-20",
            semester2Start: "2026-01-05",
            semester2End: "2026-06-13",
            active: true,
            sourceYearId: null,
            createdAt: "2025-06-01T00:00:00+07:00",
            updatedAt: "2025-06-01T00:00:00+07:00",
            deletedAt: null,
            syncStatus: "local_only",
          },
        ],
        calendarEvents: [],
        protaProfiles: new Array(3).fill(null).map((_, i) => ({
          id: `p${i}`,
          academicYearId: "y1",
          subject: "PPKn",
          grade: "VII",
          phase: "D",
          teacherId: "t1",
          annualIntraJP: 72,
          semester1IntraJP: 36,
          semester2IntraJP: 36,
          units: [],
          status: "draft",
          sourceYearId: null,
          createdAt: "2025-06-01T00:00:00+07:00",
          updatedAt: "2025-06-01T00:00:00+07:00",
          deletedAt: null,
          syncStatus: "local_only",
        })),
        teachingSchedules: [],
        lessonSessions: [],
        attendanceRecords: [],
        classRosters: [],
        teachingJournals: [],
        semesterReports: [],
        documentSnapshots: [],
      },
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.summary.counts.academicYears).toBe(1);
      expect(r.summary.counts.protaProfiles).toBe(3);
    }
  });
});
