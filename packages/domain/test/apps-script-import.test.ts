/**
 * Tests untuk apps-script-import.ts (APPS-SCRIPT-BRIDGE-RC1)
 */
import { describe, it, expect } from "vitest";
import {
  validateAppsScriptImport,
  previewAppsScriptImport,
  APPS_SCRIPT_EXTERNAL_SOURCE,
  appsScriptImportSchema,
  type AppsScriptImport,
} from "../src/apps-script-import";

function makeValidImport(overrides: Partial<AppsScriptImport> = {}): AppsScriptImport {
  return {
    source: "apps_script",
    exportedAt: "2025-07-14T10:00:00+07:00",
    schoolName: "SMPN 8 Bantan",
    academicYearLabel: "2025/2026",
    semester: 1,
    students: [
      { id: "as-s1", name: "Andi", number: 1, nis: "2025001", classId: "VII A", classLabel: "VII A" },
      { id: "as-s2", name: "Budi", number: 2, nis: "2025002", classId: "VII A", classLabel: "VII A" },
    ],
    gurus: [
      {
        id: "as-g1",
        teacherName: "Siti Aminah",
        teacherNip: "198503152010012005",
        subject: "Pendidikan Pancasila",
        classId: "VII A",
        classLabel: "VII A",
        semester: 1,
        academicYearLabel: "2025/2026",
      },
    ],
    absensi: [
      {
        id: "as-a1",
        date: "2025-07-21",
        classId: "VII A",
        classLabel: "VII A",
        subject: "Pendidikan Pancasila",
        teacherName: "Siti Aminah",
        semester: 1,
        academicYearLabel: "2025/2026",
        startPeriod: 1,
        startTime: "07:00",
        endTime: "08:20",
        records: [
          { studentId: "as-s1", studentName: "Andi", studentNumber: 1, status: "present" },
          { studentId: "as-s2", studentName: "Budi", studentNumber: 2, status: "sick" },
        ],
      },
    ],
    jurnal: [
      {
        id: "as-j1",
        date: "2025-07-21",
        classId: "VII A",
        classLabel: "VII A",
        subject: "Pendidikan Pancasila",
        teacherName: "Siti Aminah",
        semester: 1,
        academicYearLabel: "2025/2026",
        startPeriod: 1,
        startTime: "07:00",
        endTime: "08:20",
        materialTitle: "Norma dalam Masyarakat",
        realizationStatus: "done",
        presentCount: 1,
        sickCount: 1,
        excusedCount: 0,
        absentCount: 0,
        totalStudents: 2,
      },
    ],
    nilai: [
      {
        id: "as-n1",
        classId: "VII A",
        classLabel: "VII A",
        subject: "Pendidikan Pancasila",
        teacherName: "Siti Aminah",
        semester: 1,
        academicYearLabel: "2025/2026",
        kktp: 75,
        entries: [
          { studentId: "as-s1", studentName: "Andi", studentNumber: 1, dailyScore: 80, finalScore: 80 },
          { studentId: "as-s2", studentName: "Budi", studentNumber: 2, dailyScore: 70, finalScore: 70 },
        ],
      },
    ],
    ...overrides,
  };
}

describe("apps-script-import — validateAppsScriptImport", () => {
  it("import valid → success=true", () => {
    const data = makeValidImport();
    const result = validateAppsScriptImport(data);
    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.data).toBeDefined();
  });

  it("source bukan 'apps_script' → fail", () => {
    const data = { ...makeValidImport(), source: "other" };
    const result = validateAppsScriptImport(data);
    expect(result.success).toBe(false);
  });

  it("academicYearLabel kosong → fail", () => {
    const data = { ...makeValidImport(), academicYearLabel: "" };
    const result = validateAppsScriptImport(data);
    expect(result.success).toBe(false);
  });

  it("semester bukan 1/2 → fail", () => {
    const data = { ...makeValidImport(), semester: 3 };
    const result = validateAppsScriptImport(data);
    expect(result.success).toBe(false);
  });

  it("student tanpa id → fail", () => {
    const data = makeValidImport({
      students: [{ id: "", name: "Andi", classId: "VII A", classLabel: "VII A" }],
    });
    const result = validateAppsScriptImport(data);
    expect(result.success).toBe(false);
  });

  it("semua array kosong → success tapi warning", () => {
    const data = makeValidImport({
      students: [],
      gurus: [],
      absensi: [],
      jurnal: [],
      nilai: [],
    });
    const result = validateAppsScriptImport(data);
    expect(result.success).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("tidak berisi data");
  });

  it("academicYearLabel tidak format YYYY/YYYY → warning", () => {
    const data = makeValidImport({ academicYearLabel: "2025" });
    const result = validateAppsScriptImport(data);
    expect(result.success).toBe(true);
    expect(result.warnings.some((w) => w.includes("tidak sesuai format"))).toBe(true);
  });

  it("array default [] bila tidak ada di input", () => {
    const data = {
      source: "apps_script",
      exportedAt: "2025-07-14",
      academicYearLabel: "2025/2026",
      semester: 1,
    };
    const result = validateAppsScriptImport(data);
    expect(result.success).toBe(true);
    expect(result.data?.students).toEqual([]);
    expect(result.data?.gurus).toEqual([]);
  });

  it("status absensi invalid → fail", () => {
    const data = makeValidImport({
      absensi: [
        {
          ...makeValidImport().absensi[0],
          records: [
            { studentId: "s1", studentName: "Andi", status: "invalid_status" },
          ],
        },
      ],
    });
    const result = validateAppsScriptImport(data);
    expect(result.success).toBe(false);
  });
});

describe("apps-script-import — previewAppsScriptImport", () => {
  it("preview counts benar", () => {
    const data = makeValidImport();
    const preview = previewAppsScriptImport(data);
    expect(preview.valid).toBe(true);
    expect(preview.counts.students).toBe(2);
    expect(preview.counts.gurus).toBe(1);
    expect(preview.counts.absensi).toBe(1);
    expect(preview.counts.jurnal).toBe(1);
    expect(preview.counts.nilai).toBe(1);
  });

  it("preview untuk data kosong → semua 0", () => {
    const data = makeValidImport({
      students: [],
      gurus: [],
      absensi: [],
      jurnal: [],
      nilai: [],
    });
    const preview = previewAppsScriptImport(data);
    expect(preview.counts.students).toBe(0);
    expect(preview.counts.gurus).toBe(0);
    expect(preview.counts.absensi).toBe(0);
    expect(preview.counts.jurnal).toBe(0);
    expect(preview.counts.nilai).toBe(0);
  });
});

describe("apps-script-import — constants", () => {
  it("APPS_SCRIPT_EXTERNAL_SOURCE = 'apps_script'", () => {
    expect(APPS_SCRIPT_EXTERNAL_SOURCE).toBe("apps_script");
  });
});

describe("apps-script-import — idempotency key", () => {
  it("externalId unik per entitas (id dari Apps Script)", () => {
    const data = makeValidImport();
    // Setiap entitas punya 'id' yang akan jadi externalId
    expect(data.students[0].id).toBe("as-s1");
    expect(data.gurus[0].id).toBe("as-g1");
    expect(data.absensi[0].id).toBe("as-a1");
    expect(data.jurnal[0].id).toBe("as-j1");
    expect(data.nilai[0].id).toBe("as-n1");
  });

  it("parse via schema tetap pertahankan id", () => {
    const data = makeValidImport();
    const parsed = appsScriptImportSchema.parse(data);
    expect(parsed.students[0].id).toBe("as-s1");
    expect(parsed.gurus[0].id).toBe("as-g1");
  });
});
