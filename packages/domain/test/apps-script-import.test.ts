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

describe("apps-script-import — V2 export (RC1-PATCH-1-V2)", () => {
  /** Sample JSON yang cocok dengan exportForAppGenerator() dari Code_DB_V2.gs. */
  function makeV2Export() {
    return {
      $schema: "guru-admin-flow/apps-script/v1",
      source: "apps_script",
      exportedAt: "2025-07-21T14:30:00+07:00",
      schoolName: "SMPN 8 Bantan",
      academicYearLabel: "2025/2026",
      semester: 1,
      students: [
        { id: "v2-s1", name: "Andi Saputra", number: 1, nis: "2025001", classId: "VII A", classLabel: "VII A" },
        { id: "v2-s2", name: "Budi Pratama", number: 2, nis: "2025002", classId: "VII A", classLabel: "VII A" },
      ],
      gurus: [
        {
          id: "v2-g1",
          teacherName: "Siti Aminah, S.Pd.",
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
          id: "v2-a1",
          date: "2025-07-21",
          classId: "VII A",
          classLabel: "VII A",
          subject: "Pendidikan Pancasila",
          teacherName: "Siti Aminah, S.Pd.",
          semester: 1,
          academicYearLabel: "2025/2026",
          startPeriod: 1,
          startTime: "07:00",
          endTime: "08:20",
          records: [
            { studentId: "v2-s1", studentName: "Andi Saputra", studentNumber: 1, status: "present" },
            { studentId: "v2-s2", studentName: "Budi Pratama", studentNumber: 2, status: "late", note: "Terlambat 10 menit" },
          ],
        },
      ],
      jurnal: [
        {
          id: "v2-j1",
          date: "2025-07-21",
          classId: "VII A",
          classLabel: "VII A",
          subject: "Pendidikan Pancasila",
          teacherName: "Siti Aminah, S.Pd.",
          semester: 1,
          academicYearLabel: "2025/2026",
          startPeriod: 1,
          startTime: "07:00",
          endTime: "08:20",
          materialTitle: "Norma dalam Kehidupan Masyarakat",
          realizationStatus: "done",
          presentCount: 1,
          sickCount: 0,
          excusedCount: 0,
          absentCount: 0,
          totalStudents: 2,
        },
      ],
      nilai: [
        {
          id: "v2-n1",
          classId: "VII A",
          classLabel: "VII A",
          subject: "Pendidikan Pancasila",
          teacherName: "Siti Aminah, S.Pd.",
          semester: 1,
          academicYearLabel: "2025/2026",
          kktp: 75,
          entries: [
            { studentId: "v2-s1", studentName: "Andi Saputra", studentNumber: 1, dailyScore: 85, summativeScore: 88, finalScore: 86 },
            { studentId: "v2-s2", studentName: "Budi Pratama", studentNumber: 2, dailyScore: 70, summativeScore: 72, finalScore: 71 },
          ],
        },
      ],
    };
  }

  it("V2 export valid → success=true", () => {
    const result = validateAppsScriptImport(makeV2Export());
    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("V2 preview counts benar", () => {
    const data = validateAppsScriptImport(makeV2Export()).data!;
    const preview = previewAppsScriptImport(data);
    expect(preview.counts.students).toBe(2);
    expect(preview.counts.gurus).toBe(1);
    expect(preview.counts.absensi).toBe(1);
    expect(preview.counts.jurnal).toBe(1);
    expect(preview.counts.nilai).toBe(1);
  });

  it("V2 nilai: summativeScore tidak hilang", () => {
    const data = validateAppsScriptImport(makeV2Export()).data!;
    expect(data.nilai[0].entries[0].summativeScore).toBe(88);
    expect(data.nilai[0].entries[1].summativeScore).toBe(72);
  });

  it("V2 nilai: dailyScore + finalScore tetap ada", () => {
    const data = validateAppsScriptImport(makeV2Export()).data!;
    expect(data.nilai[0].entries[0].dailyScore).toBe(85);
    expect(data.nilai[0].entries[0].finalScore).toBe(86);
  });

  it("V2 absensi: status 'late' diterima", () => {
    const data = validateAppsScriptImport(makeV2Export()).data!;
    expect(data.absensi[0].records[1].status).toBe("late");
  });

  it("V2 absensi: semua 5 status diterima (present/sick/excused/absent/late)", () => {
    const exportData = makeV2Export();
    exportData.absensi[0].records = [
      { studentId: "s1", studentName: "A", status: "present" },
      { studentId: "s2", studentName: "B", status: "sick" },
      { studentId: "s3", studentName: "C", status: "excused" },
      { studentId: "s4", studentName: "D", status: "absent" },
      { studentId: "s5", studentName: "E", status: "late" },
    ];
    const result = validateAppsScriptImport(exportData);
    expect(result.success).toBe(true);
  });

  it("V2: $schema field opsional, tidak wajib", () => {
    const exportData = makeV2Export();
    delete (exportData as { $schema?: string }).$schema;
    const result = validateAppsScriptImport(exportData);
    expect(result.success).toBe(true);
  });

  it("V2: schoolName opsional", () => {
    const exportData = makeV2Export();
    delete (exportData as { schoolName?: string }).schoolName;
    const result = validateAppsScriptImport(exportData);
    expect(result.success).toBe(true);
  });

  it("V2: studentId dari Apps Script dipertahankan (idempotency)", () => {
    const data = validateAppsScriptImport(makeV2Export()).data!;
    expect(data.students[0].id).toBe("v2-s1");
    expect(data.students[1].id).toBe("v2-s2");
  });

  it("V2: import ulang data yang sama → idempotent (student IDs sama)", () => {
    const data1 = validateAppsScriptImport(makeV2Export()).data!;
    const data2 = validateAppsScriptImport(makeV2Export()).data!;
    // IDs harus identik (Apps Script IDs dipertahankan)
    expect(data1.students.map((s) => s.id)).toEqual(data2.students.map((s) => s.id));
    expect(data1.gurus.map((g) => g.id)).toEqual(data2.gurus.map((g) => g.id));
    expect(data1.absensi.map((a) => a.id)).toEqual(data2.absensi.map((a) => a.id));
    expect(data1.jurnal.map((j) => j.id)).toEqual(data2.jurnal.map((j) => j.id));
    expect(data1.nilai.map((n) => n.id)).toEqual(data2.nilai.map((n) => n.id));
  });
});
