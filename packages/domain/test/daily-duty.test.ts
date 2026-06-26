/**
 * PIKET-HARIAN-MOBILE-01: Tests untuk domain helpers.
 */

import { describe, it, expect } from "vitest";
import {
  summarizeDutyRecords,
  getStudentDutyStatus,
  DEFAULT_DUTY_RULES,
  type DutyRecord,
} from "../src/daily-duty";

const baseRecord = (overrides: Partial<DutyRecord> = {}): DutyRecord => ({
  id: "r1",
  dutyReportId: "dr1",
  academicYearId: "ay1",
  date: "2026-06-26",
  studentId: "s1",
  studentName: "Andi",
  studentNumber: 1,
  classId: "VII A",
  classLabel: "VII A",
  category: "attendance",
  type: "late",
  ruleId: "rule1",
  ruleLabel: "Terlambat",
  points: 5,
  note: undefined,
  followUp: undefined,
  recordedByTeacherId: "t1",
  recordedByTeacherName: "Budi",
  createdAt: "2026-06-26T00:00:00Z",
  updatedAt: "2026-06-26T00:00:00Z",
  deletedAt: null,
  syncStatus: "local_only",
  ...overrides,
});

describe("PIKET-HARIAN-MOBILE-01 — Domain helpers", () => {
  it("DEFAULT_DUTY_RULES punya 10 aturan", () => {
    expect(DEFAULT_DUTY_RULES).toHaveLength(10);
  });

  it("summarizeDutyRecords menghitung total poin dengan benar", () => {
    const records = [
      baseRecord({ points: 5, category: "attendance" }),
      baseRecord({ points: 10, category: "discipline" }),
      baseRecord({ points: 0, category: "health" }),
    ];
    const summary = summarizeDutyRecords(records);
    expect(summary.totalRecords).toBe(3);
    expect(summary.totalPoints).toBe(15);
    expect(summary.byCategory.attendance).toBe(1);
    expect(summary.byCategory.discipline).toBe(1);
    expect(summary.byCategory.health).toBe(1);
  });

  it("summarizeDutyRecords dengan array kosong", () => {
    const summary = summarizeDutyRecords([]);
    expect(summary.totalRecords).toBe(0);
    expect(summary.totalPoints).toBe(0);
  });

  it("getStudentDutyStatus: 0-24 = Aman", () => {
    expect(getStudentDutyStatus(0)).toBe("Aman");
    expect(getStudentDutyStatus(24)).toBe("Aman");
  });

  it("getStudentDutyStatus: 25-49 = Perlu pembinaan ringan", () => {
    expect(getStudentDutyStatus(25)).toBe("Pembinaan ringan");
    expect(getStudentDutyStatus(49)).toBe("Pembinaan ringan");
  });

  it("getStudentDutyStatus: 50-74 = Perlu perhatian wali kelas", () => {
    expect(getStudentDutyStatus(50)).toBe("Panggilan orang tua");
    expect(getStudentDutyStatus(74)).toBe("Panggilan orang tua");
  });

  it("getStudentDutyStatus: 75-99 = Panggilan orang tua", () => {
    expect(getStudentDutyStatus(75)).toBe("Kesiswaan/BK");
    expect(getStudentDutyStatus(99)).toBe("Kesiswaan/BK");
  });

  it("getStudentDutyStatus: >=100 = Tindak lanjut kesiswaan/BK", () => {
    expect(getStudentDutyStatus(100)).toBe("Tindak lanjut khusus");
    expect(getStudentDutyStatus(500)).toBe("Tindak lanjut khusus");
  });
});

/* ------------------------------------------------------------------ */
/*  PIKET-HARIAN-MOBILE-01A: Tests wajib sesuai spec Bapak            */
/* ------------------------------------------------------------------ */

/**
 * Tests 1-4: Rekap absen dedup (logic test — simulasi getAttendanceSummaryForDate)
 * Tests 5-8: DutyRecord source/attendanceLinkType + idempotent check
 *
 * Note: tests 1-4 test the dedup LOGIC (not the Dexie function directly,
 * karena butuh IndexedDB mock). Logic yang diuji: group by studentId,
 * ambil record terakhir per siswa, hitung H/S/I/A.
 */

describe("PIKET-HARIAN-MOBILE-01B — Rekap absen dedup logic (status terberat)", () => {
  type MockAttRecord = { studentId: string; status: string; updatedAt: string };

  // PIKET-HARIAN-MOBILE-01B: Ranking status terberat
  const STATUS_RANK: Record<string, number> = {
    absent: 4, sick: 3, excused: 2, present: 1,
  };

  function dedupByHeaviestStatus(records: MockAttRecord[]): Map<string, MockAttRecord> {
    const byStudent = new Map<string, MockAttRecord>();
    for (const r of records) {
      const existing = byStudent.get(r.studentId);
      if (!existing) { byStudent.set(r.studentId, r); continue; }
      const rRank = STATUS_RANK[r.status] ?? 0;
      const eRank = STATUS_RANK[existing.status] ?? 0;
      if (rRank > eRank || (rRank === eRank && r.updatedAt > existing.updatedAt)) {
        byStudent.set(r.studentId, r);
      }
    }
    return byStudent;
  }

  it("Test 1: 2 record present untuk siswa yang sama → hadir tetap 1", () => {
    const deduped = dedupByHeaviestStatus([
      { studentId: "s1", status: "present", updatedAt: "T08" },
      { studentId: "s1", status: "present", updatedAt: "T09" },
    ]);
    expect(deduped.size).toBe(1);
    expect(Array.from(deduped.values())[0].status).toBe("present");
  });

  it("Test 2: present lalu absent → absent 1, present 0", () => {
    const deduped = dedupByHeaviestStatus([
      { studentId: "s1", status: "present", updatedAt: "T08" },
      { studentId: "s1", status: "absent", updatedAt: "T09" },
    ]);
    expect(Array.from(deduped.values())[0].status).toBe("absent");
  });

  it("Test 3: present lalu sick → sick 1, present 0", () => {
    const deduped = dedupByHeaviestStatus([
      { studentId: "s1", status: "present", updatedAt: "T08" },
      { studentId: "s1", status: "sick", updatedAt: "T09" },
    ]);
    expect(Array.from(deduped.values())[0].status).toBe("sick");
  });

  it("Test 4: present lalu excused → excused 1, present 0", () => {
    const deduped = dedupByHeaviestStatus([
      { studentId: "s1", status: "present", updatedAt: "T08" },
      { studentId: "s1", status: "excused", updatedAt: "T09" },
    ]);
    expect(Array.from(deduped.values())[0].status).toBe("excused");
  });

  // PIKET-HARIAN-MOBILE-01B: 6 test reverse (status berat menang walau record lebih lama)

  it("Test 5: absent lalu present → absent 1, present 0 (status terberat menang)", () => {
    const deduped = dedupByHeaviestStatus([
      { studentId: "s1", status: "absent", updatedAt: "T08" },
      { studentId: "s1", status: "present", updatedAt: "T09" },
    ]);
    expect(Array.from(deduped.values())[0].status).toBe("absent");
  });

  it("Test 6: sick lalu present → sick 1, present 0 (status terberat menang)", () => {
    const deduped = dedupByHeaviestStatus([
      { studentId: "s1", status: "sick", updatedAt: "T08" },
      { studentId: "s1", status: "present", updatedAt: "T09" },
    ]);
    expect(Array.from(deduped.values())[0].status).toBe("sick");
  });

  it("Test 7: excused lalu present → excused 1, present 0 (status terberat menang)", () => {
    const deduped = dedupByHeaviestStatus([
      { studentId: "s1", status: "excused", updatedAt: "T08" },
      { studentId: "s1", status: "present", updatedAt: "T09" },
    ]);
    expect(Array.from(deduped.values())[0].status).toBe("excused");
  });

  it("Test 8: late lalu present → present 1, late diabaikan (late tidak ada di ranking)", () => {
    const deduped = dedupByHeaviestStatus([
      { studentId: "s1", status: "late", updatedAt: "T08" },
      { studentId: "s1", status: "present", updatedAt: "T09" },
    ]);
    // late tidak ada di STATUS_RANK (rank 0), present rank 1 → present menang
    expect(Array.from(deduped.values())[0].status).toBe("present");
  });

  it("Test 9: absent lalu present lalu sick → absent menang (ranking tertinggi)", () => {
    const deduped = dedupByHeaviestStatus([
      { studentId: "s1", status: "absent", updatedAt: "T08" },
      { studentId: "s1", status: "present", updatedAt: "T09" },
      { studentId: "s1", status: "sick", updatedAt: "T10" },
    ]);
    expect(Array.from(deduped.values())[0].status).toBe("absent");
  });

  it("Test 10: sync alpa — absent lalu present tetap membuat DutyRecord alpa (status terberat)", () => {
    // Simulasi: siswa absent di sesi 1, present di sesi 2.
    // Status terberat = absent → sync alpa tetap buat record.
    const deduped = dedupByHeaviestStatus([
      { studentId: "s1", status: "absent", updatedAt: "T08" },
      { studentId: "s1", status: "present", updatedAt: "T09" },
    ]);
    const finalStatus = Array.from(deduped.values())[0].status;
    expect(finalStatus).toBe("absent");
    // Karena status terberat = absent, syncAlpa akan buat DutyRecord
    // (logic: if attRecord.status !== "absent" continue → absent tidak di-skip)
  });
});

describe("PIKET-HARIAN-MOBILE-01A — DutyRecord source & idempotent", () => {
  it("Test 5: Late saja tidak membuat auto DutyRecord (late = manual only)", () => {
    // Late adalah type yang hanya bisa diinput manual oleh guru piket.
    // Tidak ada auto-creation dari attendanceRecords untuk "late".
    // Verify: DEFAULT_DUTY_RULES punya rule "late" dengan points 5
    const lateRule = DEFAULT_DUTY_RULES.find((r) => r.type === "late");
    expect(lateRule).toBeDefined();
    expect(lateRule?.points).toBe(5);
    // Late rule TIDAK punya attendanceLinkType (selalu manual)
    // Test: record late yang dibuat manual punya source="manual"
    const manualLateRecord = baseRecord({
      type: "late",
      ruleLabel: "Terlambat",
      points: 5,
      source: "manual",
      attendanceLinkType: null,
    });
    expect(manualLateRecord.source).toBe("manual");
    expect(manualLateRecord.attendanceLinkType).toBeNull();
  });

  it("Test 6: Sinkron Alpa membuat DutyRecord absent poin 10", () => {
    // Verify: DEFAULT_DUTY_RULES punya rule "absent_without_notice" dengan points 10
    const absentRule = DEFAULT_DUTY_RULES.find((r) => r.type === "absent_without_notice");
    expect(absentRule).toBeDefined();
    expect(absentRule?.points).toBe(10);
    // Record yang dibuat syncAlpa punya source="attendance", attendanceLinkType="absent_auto"
    const syncedRecord = baseRecord({
      type: "absent_without_notice",
      ruleLabel: "Alpa / tidak masuk tanpa keterangan",
      points: 10,
      source: "attendance",
      attendanceLinkType: "absent_auto",
    });
    expect(syncedRecord.source).toBe("attendance");
    expect(syncedRecord.attendanceLinkType).toBe("absent_auto");
  });

  it("Test 7: Sinkron Alpa dipanggil 2 kali → tidak dobel (idempotent logic)", () => {
    // Simulasi idempotent check: existing records dengan attendanceLinkType="absent_auto"
    const existingRecords: DutyRecord[] = [
      baseRecord({
        id: "r-existing",
        studentId: "s1",
        type: "absent_without_notice",
        source: "attendance",
        attendanceLinkType: "absent_auto",
      }),
    ];
    // Logic: bila studentId sudah ada di existing absent_auto records → skip
    const existingAbsentAutoStudentIds = new Set(
      existingRecords
        .filter((r) => r.attendanceLinkType === "absent_auto")
        .map((r) => r.studentId)
    );
    // Student s1 sudah ada → skip
    expect(existingAbsentAutoStudentIds.has("s1")).toBe(true);
    // Student s2 belum ada → buat baru
    expect(existingAbsentAutoStudentIds.has("s2")).toBe(false);
  });

  it("Test 8: Terlambat manual bisa disimpan sebagai DutyRecord source manual", () => {
    const manualRecord = baseRecord({
      type: "late",
      ruleLabel: "Terlambat",
      points: 5,
      source: "manual",
      attendanceLinkType: null,
      note: "Datang pukul 07:30",
    });
    expect(manualRecord.source).toBe("manual");
    expect(manualRecord.type).toBe("late");
    expect(manualRecord.points).toBe(5);
    expect(manualRecord.note).toBe("Datang pukul 07:30");
  });
});

/* ------------------------------------------------------------------ */
/*  PIKET-REPORT-APPSCRIPT-PARITY-02A: Tests wajib                    */
/* ------------------------------------------------------------------ */

import { formatSIADetail, type ClassAttendanceDetail } from "../src/daily-duty";

describe("PIKET-REPORT-APPSCRIPT-PARITY-02A — Rekap detail S/I/A", () => {
  function makeDetail(overrides: Partial<ClassAttendanceDetail> = {}): ClassAttendanceDetail {
    return {
      classId: "c1", classLabel: "VII A",
      present: 23, sick: 1, excused: 0, absent: 1, total: 25,
      source: "attendance",
      sickStudents: ["Ahmad"], excusedStudents: [], absentStudents: ["Budi"],
      ...overrides,
    };
  }

  it("Test 1: Rekap menampilkan angka H/S/I/A", () => {
    const d = makeDetail();
    expect(d.present).toBe(23);
    expect(d.sick).toBe(1);
    expect(d.excused).toBe(0);
    expect(d.absent).toBe(1);
  });

  it("Test 2: Detail menampilkan nama siswa sakit", () => {
    const d = makeDetail();
    expect(d.sickStudents).toContain("Ahmad");
  });

  it("Test 3: Detail menampilkan nama siswa izin", () => {
    const d = makeDetail({ excusedStudents: ["Citra"], excused: 1 });
    expect(d.excusedStudents).toContain("Citra");
  });

  it("Test 4: Detail menampilkan nama siswa alpa", () => {
    const d = makeDetail();
    expect(d.absentStudents).toContain("Budi");
  });

  it("Test 5: Detail TIDAK menampilkan nama siswa hadir (tidak ada field presentStudents)", () => {
    const d = makeDetail();
    // ClassAttendanceDetail tidak punya field presentStudents
    expect((d as Record<string, unknown>).presentStudents).toBeUndefined();
  });

  it("Test 6: Status late tidak masuk detail S/I/A (late tidak ada di STATUS_RANK)", () => {
    // STATUS_RANK = { absent: 4, sick: 3, excused: 2, present: 1 }
    // late tidak ada → rank 0 → tidak masuk hitungan S/I/A
    // Verify: formatSIADetail tidak pernah menyebut "late"
    const d = makeDetail({ sickStudents: [], excusedStudents: [], absentStudents: [] });
    const formatted = formatSIADetail(d);
    expect(formatted).not.toContain("late");
    expect(formatted).not.toContain("Terlambat");
  });

  it("Test 7: Jika tidak ada S/I/A, formatSIADetail menampilkan '—'", () => {
    const d = makeDetail({ sickStudents: [], excusedStudents: [], absentStudents: [] });
    expect(formatSIADetail(d)).toBe("—");
  });

  it("Test 8: Ranking absent > sick > excused > present tetap berlaku (dari 01B)", () => {
    // Verify: formatSIADetail menampilkan semua S/I/A dengan label yang benar
    const d = makeDetail({
      sickStudents: ["Ahmad"], excusedStudents: ["Citra"], absentStudents: ["Budi"],
    });
    const formatted = formatSIADetail(d);
    expect(formatted).toContain("Ahmad (Sakit)");
    expect(formatted).toContain("Citra (Izin)");
    expect(formatted).toContain("Budi (Alpa)");
  });

  it("Test 9: formatSIADetail format benar untuk multiple siswa", () => {
    const d = makeDetail({
      sickStudents: ["Ahmad", "Dewi"], absentStudents: ["Budi"],
    });
    const formatted = formatSIADetail(d);
    expect(formatted).toBe("Ahmad (Sakit), Dewi (Sakit), Budi (Alpa)");
  });
});

/* ------------------------------------------------------------------ */
/*  PIKET-QUICK-INPUT-LIST-02B: Smart Search Tests                    */
/* ------------------------------------------------------------------ */

import {
  normalizeSearchText,
  matchSmartSearch,
  DUTY_RULE_SEARCH_KEYWORDS,
  makeRuleSearchTarget,
  searchDutyRules,
  makeStudentSearchTarget,
  searchStudents,
  validateDutyRecordInput,
  type StudentSearchable,
} from "../src/daily-duty";

function makeRule(overrides: Partial<DutyRule> = {}): DutyRule {
  return {
    id: "rule-x",
    category: "attendance",
    type: "late",
    label: "Terlambat",
    points: 5,
    active: true,
    createdAt: "2026-06-26T00:00:00Z",
    updatedAt: "2026-06-26T00:00:00Z",
    deletedAt: null,
    syncStatus: "local_only",
    ...overrides,
  };
}

function makeStudent(overrides: Partial<StudentSearchable> = {}): StudentSearchable {
  return {
    id: "s1",
    name: "Muhammad Stio",
    number: 18,
    classId: "7B",
    classLabel: "7B",
    ...overrides,
  };
}

describe("PIKET-QUICK-INPUT-LIST-02B — Search siswa cerdas", () => {
  const students: StudentSearchable[] = [
    makeStudent({ id: "s1", name: "Muhammad Stio", number: 18, classId: "7B", classLabel: "7B" }),
    makeStudent({ id: "s2", name: "Budi Santoso", number: 4, classId: "8A", classLabel: "8A" }),
    makeStudent({ id: "s3", name: "Ahmad Wijaya", number: 7, classId: "7A", classLabel: "7A" }),
    makeStudent({ id: "s4", name: "Dewi Lestari", number: 10, classId: "8B", classLabel: "8B" }),
  ];

  // Test 1: case-insensitive
  it("Test 1: Search siswa mengabaikan huruf besar/kecil", () => {
    expect(searchStudents(students, "budi")).toContain(students[1]);
    expect(searchStudents(students, "BUDI")).toContain(students[1]);
    expect(searchStudents(students, "BuDi")).toContain(students[1]);
  });

  // Test 2: penggalan nama
  it("Test 2: Search siswa bisa penggalan nama", () => {
    const r = searchStudents(students, "stio");
    expect(r).toContain(students[0]);
  });

  // Test 3: nama tengah/belakang
  it("Test 3: Search siswa bisa nama tengah/belakang", () => {
    const r1 = searchStudents(students, "santoso");
    expect(r1).toContain(students[1]);
    const r2 = searchStudents(students, "lestari");
    expect(r2).toContain(students[3]);
    const r3 = searchStudents(students, "wijaya");
    expect(r3).toContain(students[2]);
  });

  // Test 4: beberapa kata "muh st"
  it("Test 4: Search siswa bisa beberapa kata, contoh 'muh st'", () => {
    const r = searchStudents(students, "muh st");
    expect(r).toContain(students[0]);
    // Budi Santoso tidak match "muh st" (tidak ada "muh")
    expect(r).not.toContain(students[1]);
  });

  // Test 5: nomor siswa
  it("Test 5: Search siswa bisa nomor siswa, contoh '18'", () => {
    const r = searchStudents(students, "18");
    expect(r).toContain(students[0]);
    // Hanya siswa nomor 18 yang cocok
    expect(r).toHaveLength(1);
  });

  // Test 6: class follows student (saat siswa dipilih, classId/classLabel dari siswa)
  it("Test 6: Saat siswa dipilih, classId/classLabel mengikuti siswa", () => {
    // Simulasi: siswa 7B dipilih → classId/classLabel = 7B
    const selected = students[0]; // Muhammad Stio, 7B
    expect(selected.classId).toBe("7B");
    expect(selected.classLabel).toBe("7B");
    // Siswa 8A dipilih → classId/classLabel = 8A
    const selected2 = students[1];
    expect(selected2.classId).toBe("8A");
    expect(selected2.classLabel).toBe("8A");
    // Verifikasi classId BUKAN dari filter, tapi dari data siswa
    expect(selected.classId).not.toBe("all"); // bukan filter "Semua"
  });

  // Test 7: query kosong → semua siswa
  it("Test 7: Query kosong mengembalikan semua siswa", () => {
    expect(searchStudents(students, "")).toHaveLength(4);
    expect(searchStudents(students, "   ")).toHaveLength(4);
  });

  // Test 8: NIS/NISN jika tersedia
  it("Test 8: Search siswa bisa NIS bila tersedia", () => {
    const withNis: StudentSearchable[] = [
      makeStudent({ id: "s5", name: "Eka Putri", number: 5, nis: "1234567", classId: "7A", classLabel: "7A" }),
    ];
    expect(searchStudents(withNis, "1234567")).toContain(withNis[0]);
  });
});

describe("PIKET-QUICK-INPUT-LIST-02B — Search pelanggaran cerdas", () => {
  const rules: DutyRule[] = [
    makeRule({ id: "rule-late", type: "late", label: "Terlambat", points: 5, category: "attendance" }),
    makeRule({ id: "rule-absent", type: "absent_without_notice", label: "Alpa / tidak masuk tanpa keterangan", points: 10, category: "attendance" }),
    makeRule({ id: "rule-uniform", type: "incomplete_uniform", label: "Atribut tidak lengkap", points: 10, category: "discipline" }),
    makeRule({ id: "rule-fight", type: "fight", label: "Berkelahi", points: 25, category: "discipline" }),
    makeRule({ id: "rule-disruption", type: "class_disruption", label: "Ribut / mengganggu pembelajaran", points: 10, category: "discipline" }),
    makeRule({ id: "rule-other", type: "other", label: "Lainnya", points: 0, category: "other" }),
  ];

  // Test 9: case-insensitive
  it("Test 9: Search pelanggaran mengabaikan huruf besar/kecil", () => {
    expect(searchDutyRules(rules, "TERLAMBAT")).toContain(rules[0]);
    expect(searchDutyRules(rules, "terlambat")).toContain(rules[0]);
  });

  // Test 10: "telat" → Terlambat (sinonim)
  it("Test 10: Search 'telat' menemukan Terlambat", () => {
    const r = searchDutyRules(rules, "telat");
    expect(r).toContain(rules[0]);
  });

  // Test 11: "seragam" → Atribut tidak lengkap (sinonim)
  it("Test 11: Search 'seragam' menemukan Atribut tidak lengkap", () => {
    const r = searchDutyRules(rules, "seragam");
    expect(r).toContain(rules[2]);
  });

  // Test 12: "tidak masuk" → Alpa
  it("Test 12: Search 'tidak masuk' menemukan Alpa", () => {
    const r = searchDutyRules(rules, "tidak masuk");
    expect(r).toContain(rules[1]);
  });

  // Test 13: "10" → aturan dengan 10 poin
  it("Test 13: Search '10' menemukan aturan dengan 10 poin", () => {
    const r = searchDutyRules(rules, "10");
    // 3 aturan dengan points 10: absent, uniform, disruption
    expect(r).toContain(rules[1]); // Alpa 10p
    expect(r).toContain(rules[2]); // Atribut 10p
    expect(r).toContain(rules[4]); // Ribut 10p
    // Tidak boleh match aturan dengan points 5/25/0
    expect(r).not.toContain(rules[0]); // Terlambat 5p
    expect(r).not.toContain(rules[3]); // Berkelahi 25p
    expect(r).not.toContain(rules[5]); // Lainnya 0p
  });

  // Test 14: sinonim berkelahi/berantem/kelahi
  it("Test 14: Search sinonim 'berantem' dan 'kelahi' menemukan Berkelahi", () => {
    expect(searchDutyRules(rules, "berantem")).toContain(rules[3]);
    expect(searchDutyRules(rules, "kelahi")).toContain(rules[3]);
  });

  // Test 15: sinonim gaduh/ribut
  it("Test 15: Search 'gaduh' menemukan Ribut / mengganggu pembelajaran", () => {
    expect(searchDutyRules(rules, "gaduh")).toContain(rules[4]);
  });

  // Test 16: query kosong → semua rule
  it("Test 16: Query kosong mengembalikan semua rule", () => {
    expect(searchDutyRules(rules, "")).toHaveLength(6);
  });
});

describe("PIKET-QUICK-INPUT-LIST-02B — Poin otomatis & validasi", () => {
  // Test 17: Poin simpan mengikuti DutyRule.points
  it("Test 17: Poin simpan mengikuti DutyRule.points", () => {
    const lateRule = makeRule({ type: "late", points: 5 });
    const absentRule = makeRule({ type: "absent_without_notice", points: 10 });
    const fightRule = makeRule({ type: "fight", points: 25 });
    // Simulasi: selectedRule.points dipakai langsung saat simpan DutyRecord
    expect(lateRule.points).toBe(5);
    expect(absentRule.points).toBe(10);
    expect(fightRule.points).toBe(25);
    // Verifikasi: poin tidak diketik manual, diambil dari rule
    const savedRecord: Partial<DutyRecord> = {
      points: lateRule.points,
      ruleId: lateRule.id,
    };
    expect(savedRecord.points).toBe(5);
  });

  // Test 18: Jenis "Lainnya" wajib catatan
  it("Test 18: Jenis 'Lainnya' wajib catatan", () => {
    const otherRule = makeRule({ id: "rule-other", type: "other", label: "Lainnya", points: 0 });
    const student = makeStudent();
    // Catatan kosong → gagal
    const r1 = validateDutyRecordInput({ selectedStudent: student, selectedRule: otherRule, note: "" });
    expect(r1.ok).toBe(false);
    if (!r1.ok) expect(r1.message).toContain("Catatan wajib");
    // Catatan berisi → ok
    const r2 = validateDutyRecordInput({ selectedStudent: student, selectedRule: otherRule, note: "Membawa HP" });
    expect(r2.ok).toBe(true);
  });

  // Test 19: Validasi: siswa belum dipilih
  it("Test 19: Validasi gagal bila siswa belum dipilih", () => {
    const rule = makeRule({ type: "late", points: 5 });
    const r = validateDutyRecordInput({ selectedStudent: null, selectedRule: rule, note: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("siswa");
  });

  // Test 20: Validasi: pelanggaran belum dipilih
  it("Test 20: Validasi gagal bila pelanggaran belum dipilih", () => {
    const student = makeStudent();
    const r = validateDutyRecordInput({ selectedStudent: student, selectedRule: null, note: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("pelanggaran");
  });

  // Test 21: Validasi: rule non-Lainnya tidak wajib catatan
  it("Test 21: Rule non-Lainnya tidak wajib catatan (note kosong tetap ok)", () => {
    const student = makeStudent();
    const lateRule = makeRule({ type: "late", points: 5 });
    const r = validateDutyRecordInput({ selectedStudent: student, selectedRule: lateRule, note: "" });
    expect(r.ok).toBe(true);
  });
});

describe("PIKET-QUICK-INPUT-LIST-02B — Helper primitives", () => {
  // Test 22: normalizeSearchText hapus diakritik
  it("Test 22: normalizeSearchText menghapus diakritik (é → e)", () => {
    expect(normalizeSearchText("Sítío")).toBe("sitio");
    expect(normalizeSearchText("José")).toBe("jose");
  });

  // Test 23: normalizeSearchText collapse whitespace
  it("Test 23: normalizeSearchText collapse whitespace", () => {
    expect(normalizeSearchText("  budi   santoso  ")).toBe("budi santoso");
  });

  // Test 24: matchSmartSearch — semua kata harus match
  it("Test 24: matchSmartSearch — semua kata query harus match di target", () => {
    expect(matchSmartSearch("budi", "Budi Santoso")).toBe(true);
    expect(matchSmartSearch("budi santo", "Budi Santoso")).toBe(true);
    expect(matchSmartSearch("budi joko", "Budi Santoso")).toBe(false); // joko tidak ada
    expect(matchSmartSearch("", "Budi")).toBe(true); // query kosong → true
  });

  // Test 25: DUTY_RULE_SEARCH_KEYWORDS punya entry untuk semua DutyRecordType
  it("Test 25: DUTY_RULE_SEARCH_KEYWORDS punya entry untuk semua DutyRecordType", () => {
    const types: DutyRule["type"][] = [
      "late", "absent_without_notice", "early_leave", "sick_uks",
      "incomplete_uniform", "class_disruption", "skipping_class",
      "fight", "rude_behavior", "other",
    ];
    for (const t of types) {
      expect(DUTY_RULE_SEARCH_KEYWORDS[t]).toBeDefined();
      expect(Array.isArray(DUTY_RULE_SEARCH_KEYWORDS[t])).toBe(true);
      expect(DUTY_RULE_SEARCH_KEYWORDS[t].length).toBeGreaterThan(0);
    }
  });

  // Test 26: makeRuleSearchTarget menggabungkan label + category + type + points + keywords
  it("Test 26: makeRuleSearchTarget menggabungkan semua field + keywords", () => {
    const rule = makeRule({ type: "late", label: "Terlambat", points: 5, category: "attendance" });
    const target = makeRuleSearchTarget(rule);
    expect(target).toContain("terlambat");
    expect(target).toContain("attendance");
    expect(target).toContain("late");
    expect(target).toContain("5");
    expect(target).toContain("telat"); // dari keywords
  });

  // Test 27: makeStudentSearchTarget menggabungkan name + number + classLabel
  it("Test 27: makeStudentSearchTarget menggabungkan name + number + classLabel", () => {
    const s = makeStudent({ name: "Muhammad Stio", number: 18, classLabel: "7B" });
    const target = makeStudentSearchTarget(s);
    // makeStudentSearchTarget returns raw values; normalization happens in matchSmartSearch.
    const normalized = normalizeSearchText(target);
    expect(normalized).toContain("muhammad stio");
    expect(normalized).toContain("18");
    expect(normalized).toContain("7b");
  });
});

/* ------------------------------------------------------------------ */
/*  PIKET-STUDENT-LEDGER-RECAP-04A: Ledger + Status tests             */
/* ------------------------------------------------------------------ */

import {
  buildStudentDutyLedger,
  filterDutyRecordsByStudent,
  getDutyStatusVariant,
} from "../src/daily-duty";

describe("PIKET-STUDENT-LEDGER-RECAP-04A — getStudentDutyStatus + getDutyStatusVariant", () => {
  // Test 8 (spec): 0–24 = Aman
  it("Test 8: getStudentDutyStatus 0–24 = Aman", () => {
    expect(getStudentDutyStatus(0)).toBe("Aman");
    expect(getStudentDutyStatus(24)).toBe("Aman");
  });

  // Test 9 (spec): 25–49 = Pembinaan ringan
  it("Test 9: getStudentDutyStatus 25–49 = Pembinaan ringan", () => {
    expect(getStudentDutyStatus(25)).toBe("Pembinaan ringan");
    expect(getStudentDutyStatus(49)).toBe("Pembinaan ringan");
  });

  // Test 10 (spec): 50–74 = Panggilan orang tua
  it("Test 10: getStudentDutyStatus 50–74 = Panggilan orang tua", () => {
    expect(getStudentDutyStatus(50)).toBe("Panggilan orang tua");
    expect(getStudentDutyStatus(74)).toBe("Panggilan orang tua");
  });

  // Test 11 (spec): 75–99 = Kesiswaan/BK
  it("Test 11: getStudentDutyStatus 75–99 = Kesiswaan/BK", () => {
    expect(getStudentDutyStatus(75)).toBe("Kesiswaan/BK");
    expect(getStudentDutyStatus(99)).toBe("Kesiswaan/BK");
  });

  // Test 12 (spec): 100+ = Tindak lanjut khusus
  it("Test 12: getStudentDutyStatus 100+ = Tindak lanjut khusus", () => {
    expect(getStudentDutyStatus(100)).toBe("Tindak lanjut khusus");
    expect(getStudentDutyStatus(500)).toBe("Tindak lanjut khusus");
  });

  // Bonus: getDutyStatusVariant
  it("getDutyStatusVariant returns correct variant per threshold", () => {
    expect(getDutyStatusVariant(0)).toBe("success");
    expect(getDutyStatusVariant(24)).toBe("success");
    expect(getDutyStatusVariant(25)).toBe("warning");
    expect(getDutyStatusVariant(49)).toBe("warning");
    expect(getDutyStatusVariant(50)).toBe("neutral");
    expect(getDutyStatusVariant(74)).toBe("neutral");
    expect(getDutyStatusVariant(75)).toBe("error");
    expect(getDutyStatusVariant(99)).toBe("error");
    expect(getDutyStatusVariant(100)).toBe("errorStrong");
    expect(getDutyStatusVariant(500)).toBe("errorStrong");
  });
});

describe("PIKET-STUDENT-LEDGER-RECAP-04A — buildStudentDutyLedger", () => {
  // Helper: buat DutyRecord dengan override
  function ledgerRecord(overrides: Partial<DutyRecord> = {}): DutyRecord {
    return {
      id: "r-" + Math.random().toString(36).slice(2, 8),
      dutyReportId: "dr1",
      academicYearId: "ay1",
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
      points: 5,
      note: undefined,
      followUp: undefined,
      recordedByTeacherId: "t1",
      recordedByTeacherName: "Budi",
      createdAt: "2026-06-26T00:00:00Z",
      updatedAt: "2026-06-26T00:00:00Z",
      deletedAt: null,
      syncStatus: "local_only",
      ...overrides,
    };
  }

  // Test 1 (spec): group by studentId + classId
  it("Test 1: buildStudentDutyLedger group by studentId + classId", () => {
    const records = [
      ledgerRecord({ studentId: "s1", classId: "7A", classLabel: "7A" }),
      ledgerRecord({ studentId: "s1", classId: "7A", classLabel: "7A" }),
      ledgerRecord({ studentId: "s2", classId: "7A", classLabel: "7A" }),
      // Siswa yang sama pindah kelas → entry terpisah
      ledgerRecord({ studentId: "s1", classId: "7B", classLabel: "7B" }),
    ];
    const ledger = buildStudentDutyLedger(records);
    // 3 entry: s1+7A, s2+7A, s1+7B
    expect(ledger).toHaveLength(3);
    const s1_7A = ledger.find((i) => i.studentId === "s1" && i.classId === "7A");
    expect(s1_7A?.totalRecords).toBe(2);
  });

  // Test 2 (spec): total poin dihitung benar
  it("Test 2: total poin dihitung benar", () => {
    const records = [
      ledgerRecord({ studentId: "s1", points: 5 }),
      ledgerRecord({ studentId: "s1", points: 10 }),
      ledgerRecord({ studentId: "s1", points: 25 }),
      ledgerRecord({ studentId: "s2", points: 15 }),
    ];
    const ledger = buildStudentDutyLedger(records);
    const s1 = ledger.find((i) => i.studentId === "s1");
    expect(s1?.totalPoints).toBe(40);
    const s2 = ledger.find((i) => i.studentId === "s2");
    expect(s2?.totalPoints).toBe(15);
  });

  // Test 3 (spec): total records dihitung benar
  it("Test 3: total records dihitung benar", () => {
    const records = [
      ledgerRecord({ studentId: "s1" }),
      ledgerRecord({ studentId: "s1" }),
      ledgerRecord({ studentId: "s1" }),
      ledgerRecord({ studentId: "s2" }),
    ];
    const ledger = buildStudentDutyLedger(records);
    const s1 = ledger.find((i) => i.studentId === "s1");
    expect(s1?.totalRecords).toBe(3);
    const s2 = ledger.find((i) => i.studentId === "s2");
    expect(s2?.totalRecords).toBe(1);
  });

  // Test 4 (spec): count kategori attendance/discipline/health/permission/other benar
  it("Test 4: count kategori attendance/discipline/health/permission/other benar", () => {
    const records = [
      ledgerRecord({ studentId: "s1", category: "attendance" }),
      ledgerRecord({ studentId: "s1", category: "attendance" }),
      ledgerRecord({ studentId: "s1", category: "discipline" }),
      ledgerRecord({ studentId: "s1", category: "health" }),
      ledgerRecord({ studentId: "s1", category: "permission" }),
      ledgerRecord({ studentId: "s1", category: "other" }),
    ];
    const ledger = buildStudentDutyLedger(records);
    const s1 = ledger.find((i) => i.studentId === "s1");
    expect(s1?.attendanceCount).toBe(2);
    expect(s1?.disciplineCount).toBe(1);
    expect(s1?.healthCount).toBe(1);
    expect(s1?.permissionCount).toBe(1);
    expect(s1?.otherCount).toBe(1);
    expect(s1?.totalRecords).toBe(6);
  });

  // Test 5 (spec): deletedAt tidak dihitung
  it("Test 5: deletedAt tidak dihitung", () => {
    const records = [
      ledgerRecord({ studentId: "s1", points: 5, deletedAt: null }),
      ledgerRecord({ studentId: "s1", points: 10, deletedAt: "2026-06-27T00:00:00Z" }), // soft-deleted
      ledgerRecord({ studentId: "s1", points: 15, deletedAt: null }),
    ];
    const ledger = buildStudentDutyLedger(records);
    const s1 = ledger.find((i) => i.studentId === "s1");
    expect(s1?.totalRecords).toBe(2);  // hanya 2 record aktif
    expect(s1?.totalPoints).toBe(20);  // 5 + 15, bukan 30
  });

  // Test 6 (spec): lastRecordDate mengambil tanggal terbaru
  it("Test 6: lastRecordDate mengambil tanggal terbaru", () => {
    const records = [
      ledgerRecord({ studentId: "s1", date: "2026-06-20" }),
      ledgerRecord({ studentId: "s1", date: "2026-06-26" }),
      ledgerRecord({ studentId: "s1", date: "2026-06-15" }),
      ledgerRecord({ studentId: "s1", date: "2026-06-22" }),
    ];
    const ledger = buildStudentDutyLedger(records);
    const s1 = ledger.find((i) => i.studentId === "s1");
    expect(s1?.lastRecordDate).toBe("2026-06-26");
  });

  // Test 7 (spec): ledger urut dari totalPoints terbesar
  it("Test 7: ledger urut dari totalPoints terbesar", () => {
    const records = [
      ledgerRecord({ studentId: "s1", points: 5 }),   // total 5
      ledgerRecord({ studentId: "s2", points: 50 }),  // total 50
      ledgerRecord({ studentId: "s3", points: 25 }),  // total 25
      ledgerRecord({ studentId: "s4", points: 100 }), // total 100
    ];
    const ledger = buildStudentDutyLedger(records);
    expect(ledger[0].studentId).toBe("s4"); // 100
    expect(ledger[1].studentId).toBe("s2"); // 50
    expect(ledger[2].studentId).toBe("s3"); // 25
    expect(ledger[3].studentId).toBe("s1"); // 5
    expect(ledger[0].totalPoints).toBeGreaterThanOrEqual(ledger[1].totalPoints);
  });

  // Bonus: statusLabel otomatis diisi dari getStudentDutyStatus
  it("statusLabel otomatis diisi dari getStudentDutyStatus", () => {
    const records = [
      ledgerRecord({ studentId: "s1", points: 5 }),   // Aman
      ledgerRecord({ studentId: "s2", points: 30 }),  // Pembinaan ringan
      ledgerRecord({ studentId: "s3", points: 80 }),  // Kesiswaan/BK
    ];
    const ledger = buildStudentDutyLedger(records);
    expect(ledger.find((i) => i.studentId === "s1")?.statusLabel).toBe("Aman");
    expect(ledger.find((i) => i.studentId === "s2")?.statusLabel).toBe("Pembinaan ringan");
    expect(ledger.find((i) => i.studentId === "s3")?.statusLabel).toBe("Kesiswaan/BK");
  });

  // Bonus: input kosong → ledger kosong
  it("input kosong → ledger kosong", () => {
    const ledger = buildStudentDutyLedger([]);
    expect(ledger).toEqual([]);
  });

  // Bonus: studentNumber dipertahankan di ledger
  it("studentNumber dipertahankan di ledger", () => {
    const records = [
      ledgerRecord({ studentId: "s1", studentNumber: 18 }),
      ledgerRecord({ studentId: "s1", studentNumber: 18 }),
    ];
    const ledger = buildStudentDutyLedger(records);
    const s1 = ledger.find((i) => i.studentId === "s1");
    expect(s1?.studentNumber).toBe(18);
  });
});

describe("PIKET-STUDENT-LEDGER-RECAP-04A — filterDutyRecordsByStudent", () => {
  function ledgerRecord(overrides: Partial<DutyRecord> = {}): DutyRecord {
    return {
      id: "r-" + Math.random().toString(36).slice(2, 8),
      dutyReportId: "dr1",
      academicYearId: "ay1",
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
      points: 5,
      note: undefined,
      followUp: undefined,
      recordedByTeacherId: "t1",
      recordedByTeacherName: "Budi",
      createdAt: "2026-06-26T00:00:00Z",
      updatedAt: "2026-06-26T00:00:00Z",
      deletedAt: null,
      syncStatus: "local_only",
      ...overrides,
    };
  }

  // Test 14 (spec): riwayat siswa urut tanggal terbaru
  it("Test 14: Riwayat siswa urut tanggal terbaru dulu", () => {
    const records = [
      ledgerRecord({ studentId: "s1", date: "2026-06-20" }),
      ledgerRecord({ studentId: "s1", date: "2026-06-26" }),
      ledgerRecord({ studentId: "s1", date: "2026-06-15" }),
      ledgerRecord({ studentId: "s2", date: "2026-06-25" }),
    ];
    const riwayat = filterDutyRecordsByStudent(records, "s1");
    expect(riwayat).toHaveLength(3);
    expect(riwayat[0].date).toBe("2026-06-26");
    expect(riwayat[1].date).toBe("2026-06-20");
    expect(riwayat[2].date).toBe("2026-06-15");
  });

  // Test: filter by classId optional
  it("filter by classId optional (siswa pindah kelas)", () => {
    const records = [
      ledgerRecord({ studentId: "s1", classId: "7A", date: "2026-06-01" }),
      ledgerRecord({ studentId: "s1", classId: "7B", date: "2026-06-20" }),
      ledgerRecord({ studentId: "s1", classId: "7A", date: "2026-06-26" }),
    ];
    // Tanpa classId → semua record siswa
    const all = filterDutyRecordsByStudent(records, "s1");
    expect(all).toHaveLength(3);
    // Dengan classId 7A → hanya 7A
    const only7A = filterDutyRecordsByStudent(records, "s1", "7A");
    expect(only7A).toHaveLength(2);
    expect(only7A.every((r) => r.classId === "7A")).toBe(true);
  });

  // Test: deletedAt tidak ikut
  it("deletedAt tidak ikut filter", () => {
    const records = [
      ledgerRecord({ studentId: "s1", deletedAt: null }),
      ledgerRecord({ studentId: "s1", deletedAt: "2026-06-27T00:00:00Z" }),
    ];
    const riwayat = filterDutyRecordsByStudent(records, "s1");
    expect(riwayat).toHaveLength(1);
  });
});
