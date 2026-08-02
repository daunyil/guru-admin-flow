# PROJECT-STATE.md — Guru Admin Flow

> Kondisi codebase per 2 Agustus 2026. Dokumen ini dibuat agar AI lain bisa memahami repo tanpa akses langsung.

---

## 1. Tech Stack

### Framework & Runtime

| Teknologi | Versi | Keterangan |
|---|---|---|
| React | ^18.3.1 | UI library |
| Vite | ^5.4.3 | Build tool |
| TypeScript | ^5.4.0 | Bahasa utama |
| Tailwind CSS | ^3.4.10 | Utility-first CSS |
| react-router-dom | ^6.26.2 | Client-side routing |

### Library Utama

| Library | Versi | Fungsi |
|---|---|---|
| Zustand | ^4.5.5 | State management (minimal, hanya untuk sync store) |
| Zod | ^3.23.8 | Schema validation & type inference (single source of truth) |
| Dexie | ^4.0.8 | IndexedDB wrapper (local-first persistence) |
| dexie-react-hooks | ^1.1.7 | React hooks untuk Dexie queries |
| docx | ^8.5.0 | DOCX generation (Word export) |
| ExcelJS | ^4.4.0 | XLSX generation (Excel export) |
| JSZip | ^3.10.1 | ZIP manipulation (DOCX = ZIP berisi XML) |
| @supabase/supabase-js | ^2.0.0 | Cloud auth & sync (opsional) |
| uuid | ^10.0.0 | ID generation |

### Dev Tools

| Tool | Versi | Fungsi |
|---|---|---|
| Vitest | ^2.1.1 | Unit testing |
| @testing-library/react | ^16.0.1 | Component testing |
| jsdom | ^25.0.0 | DOM environment untuk test |
| fake-indexeddb | ^6.2.5 | IndexedDB mock untuk test |

### Struktur Folder (2-3 level, exclude node_modules/.git/dist)

```
guru-admin-flow/
├── apps/
│   └── teacher-admin/          # Aplikasi utama (satu-satunya app)
│       └── src/
│           ├── modules/        # Modul bisnis (1-harian, 2-piket, dst.)
│           ├── pages/          # Halaman-level routing (kbm-hub)
│           ├── routes/         # Route definitions
│           └── shared/         # Shared code (db, documents, ui, hooks, exporters)
├── packages/
│   ├── domain/                 # Zod schemas + business rules + pure functions
│   └── shared/                 # Konstanta + util (date, id, slug, jp)
├── supabase/                   # Supabase config (opsional)
├── docs/                       # Dokumentasi desain
├── package.json                # Root monorepo
└── tsconfig.base.json          # Shared TS config
```

### Monorepo

- **Turborepo-style** workspace: `workspaces: ["apps/*", "packages/*"]`
- Build command: `cd apps/teacher-admin && node ../../node_modules/vite/bin/vite.js build`
- Deploy target: `/home/z/my-project/public/teacher-admin/`

---

## 2. Schema / Data Model

### Arsitektur Schema

Semua schema didefinisikan di `packages/domain/src/` menggunakan Zod. Setiap entitas punya:
- `xxxSchema` — Zod schema
- `parseXxx(input)` — parse dengan throw
- `safeParseXxx(input)` — parse dengan `{ success, data?, error? }`
- `Xxx` type — di-infer dari schema via `z.infer<typeof xxxSchema>`

### FULL SOURCE CODE: `packages/domain/src/base.ts`

```typescript
/**
 * Tipe dan schema dasar yang dipakai semua entitas.
 * Sumber: docs/DATA_MODEL_DRAFT.md §0
 */

import { z } from "zod";
import { DOCUMENT_STATUSES, SYNC_STATUSES } from "@guru-admin/shared";

/* ------------------------------------------------------------------ */
/*  Status types                                                      */
/* ------------------------------------------------------------------ */

export const syncStatusSchema = z.enum(SYNC_STATUSES);
export type SyncStatus = z.infer<typeof syncStatusSchema>;

export const documentStatusSchema = z.enum(DOCUMENT_STATUSES);
export type DocumentStatus = z.infer<typeof documentStatusSchema>;

/* ------------------------------------------------------------------ */
/*  BaseEntity                                                        */
/* ------------------------------------------------------------------ */

/**
 * Field wajib untuk semua entitas persisten.
 * Lihat docs/DATA_MODEL_DRAFT.md §0.1.
 */
export const baseEntitySchema = z.object({
  id: z.string().min(1, "ID wajib diisi"),
  createdAt: z.string().min(1, "createdAt wajib diisi"),
  updatedAt: z.string().min(1, "updatedAt wajib diisi"),
  deletedAt: z.string().nullable().optional(),
  syncStatus: syncStatusSchema,
});
export type BaseEntity = z.infer<typeof baseEntitySchema>;

/* ------------------------------------------------------------------ */
/*  Helper untuk membuat entity baru                                  */
/* ------------------------------------------------------------------ */

/**
 * Membuat field BaseEntity untuk entitas baru.
 * Dipakai oleh factory function per entitas.
 */
export function makeBaseEntityFields(id: string, now: string = new Date().toISOString()) {
  return {
    id,
    createdAt: now,
    updatedAt: now,
    deletedAt: null as string | null,
    syncStatus: "local_only" as const,
  };
}
```

### FULL SOURCE CODE: `apps/teacher-admin/src/shared/db/schema.ts`

```typescript
/**
 * Skema Dexie (IndexedDB) untuk Guru Admin Flow.
 * Sumber: docs/TECHNICAL_PLAN.md §4.3
 */

import Dexie, { type Table } from "dexie";
import type {
  AcademicYear,
  SchoolProfile,
  TeacherProfile,
  CalendarEvent,
  ProtaProfile,
  ProtaUnit,
  TeachingSchedule,
  TeachingAssignment,
  LessonSession,
  AttendanceRecord,
  ClassRoster,
  TeachingJournal,
  SemesterReport,
  GradeBook,
  ATPEntry,
  LKPD,
  RppDocument,
  RemedialProgram,
  EnrichmentProgram,
  DocumentSnapshot,
  SyncQueueItem,
  DutyRule,
  DutyReport,
  DutyRecord,
  SchoolDocument,
} from "@guru-admin/domain";

export class GuruAdminDB extends Dexie {
  academicYears!: Table<AcademicYear, string>;
  schoolProfile!: Table<SchoolProfile, string>;
  teacherProfile!: Table<TeacherProfile, string>;
  calendarEvents!: Table<CalendarEvent, string>;
  protaProfiles!: Table<ProtaProfile, string>;
  protaUnits!: Table<ProtaUnit, string>;
  teachingSchedules!: Table<TeachingSchedule, string>;
  teachingAssignments!: Table<TeachingAssignment, string>;
  lessonSessions!: Table<LessonSession, string>;
  attendanceRecords!: Table<AttendanceRecord, string>;
  classRosters!: Table<ClassRoster, string>;
  teachingJournals!: Table<TeachingJournal, string>;
  semesterReports!: Table<SemesterReport, string>;
  gradeBooks!: Table<GradeBook, string>;
  atpEntries!: Table<ATPEntry, string>;
  lkpds!: Table<LKPD, string>;
  rppDocuments!: Table<RppDocument, string>;
  remedialPrograms!: Table<RemedialProgram, string>;
  enrichmentPrograms!: Table<EnrichmentProgram, string>;
  documentSnapshots!: Table<DocumentSnapshot, string>;
  syncQueue!: Table<SyncQueueItem, string>;

  // PIKET-HARIAN-MOBILE-01: tabel Piket Harian (terisolasi)
  dailyDutyRules!: Table<DutyRule, string>;
  dailyDutyReports!: Table<DutyReport, string>;
  dailyDutyRecords!: Table<DutyRecord, string>;

  // WYSIWYG-DOC-01: tabel dokumen sekolah generik
  schoolDocuments!: Table<SchoolDocument, string>;

  constructor() {
    super("guru-admin-flow");

    this.version(1).stores({
      academicYears: "id, label, active",
      schoolProfile: "id",
      teacherProfile: "id",
      calendarEvents: "id, academicYearId, startDate, type, blocksLearning",
      protaProfiles: "id, academicYearId, subject, grade, phase, teacherId",
      protaUnits: "id, protaProfileId, semester, order",
      teachingSchedules: "id, academicYearId, teacherId, classId, dayOfWeek, semester, [academicYearId+teacherId+dayOfWeek+semester]",
      lessonSessions: "id, academicYearId, teacherId, classId, date, status, [classId+date+startPeriod]",
      attendanceRecords: "id, sessionId, studentId, classId, date, status, [sessionId+studentId]",
      classRosters: "id, classId, academicYearId",
      teachingJournals: "id, sessionId, academicYearId, teacherId, classId, date, status, realizationStatus",
      semesterReports: "id, academicYearId, teacherId, subject, grade, semester, status",
      documentSnapshots: "id, entityType, entityId, snapshotAt",
      syncQueue: "id, entityType, entityId, status, createdAt",
    });

    this.version(2).stores({
      gradeBooks: "id, academicYearId, teacherId, classId, subject, semester, status, [academicYearId+teacherId+classId+semester]",
    });

    this.version(3).stores({
      teachingAssignments: "id, academicYearId, semester, teacherId, subject, classId, [academicYearId+semester+teacherId+classId+subject]",
    });

    this.version(4).stores({
      atpEntries: "id, academicYearId, teacherId, subject, grade, classId, atpEntryId",
      lkpds: "id, academicYearId, teacherId, subject, classId, atpEntryId, status",
    });

    this.version(5).stores({
      semesterReports: "id, academicYearId, teacherId, subject, classId, grade, semester, status, [academicYearId+teacherId+subject+classId+semester]",
    });

    // GENERATOR-COMPLETION-RC1: add rppDocuments + remedialPrograms + enrichmentPrograms.
    this.version(6).stores({
      rppDocuments: "id, academicYearId, teacherId, subject, classLabel, semester, status, source",
      remedialPrograms: "id, academicYearId, teacherId, subject, classId, semester, status, [academicYearId+teacherId+subject+classId+semester]",
      enrichmentPrograms: "id, academicYearId, teacherId, subject, classId, semester, status, [academicYearId+teacherId+subject+classId+semester]",
    });

    // GRADEBOOK-V2: bump version for KD1-KD6 + PTS + PAS fields in GradeEntry.
    this.version(7).stores({
      gradeBooks: "id, academicYearId, teacherId, classId, subject, semester, status, [academicYearId+teacherId+classId+semester]",
    });

    // PIKET-HARIAN-MOBILE-01: tambah tabel Piket Harian (terisolasi dari app utama)
    this.version(8).stores({
      dailyDutyRules: "id, category, type, active",
      dailyDutyReports: "id, academicYearId, date, dutyTeacherId, finalized",
      dailyDutyRecords: "id, dutyReportId, academicYearId, date, studentId, classId, category, type",
    });

    // WYSIWYG-DOC-01: tabel ke-15 — dokumen sekolah generik untuk infrastruktur WYSIWYG
    this.version(9).stores({
      schoolDocuments:
        "id, docType, semester, tahunAjaran, kodeMapel, kodeKelas, status, teacherId, academicYearId, updatedAt",
    });

    // GRADEBOOK-V3-UH-UTS-UAS: new GradeBook fields (gradeModel, uhCount, weightUH/UTS/UAS).
    this.version(10).stores({
      gradeBooks: "id, academicYearId, teacherId, classId, subject, semester, status, [academicYearId+teacherId+classId+semester]",
    });

    // SB-01: Add separate UH/UTS/UAS fields (uh1-uh6, uts, uas) to GradeEntry.
    // SB-05: Migration backfills V3 defaults (gradeModel, uhCount, weights) on existing data.
    this.version(11).stores({
      gradeBooks: "id, academicYearId, teacherId, classId, subject, semester, status, [academicYearId+teacherId+classId+semester]",
    }).upgrade((tx) => {
      // SB-05: Backfill V3 fields on existing GradeBook data
      return tx.table("gradeBooks").toCollection().modify((book: Record<string, unknown>) => {
        if (book.gradeModel === undefined) book.gradeModel = "uh";
        if (book.uhCount === undefined) book.uhCount = 2;
        if (book.weightUH === undefined) book.weightUH = 25;
        if (book.weightUTS === undefined) book.weightUTS = 25;
        if (book.weightUAS === undefined) book.weightUAS = 50;

        if (book.gradeModel === "uh" && Array.isArray(book.entries)) {
          for (const entry of book.entries as Array<Record<string, unknown>>) {
            if (entry.uh1 === undefined) {
              const uhCount = (book.uhCount as number) ?? 2;
              for (let i = 1; i <= Math.min(uhCount, 6); i++) {
                const kdKey = `kd${i}`;
                const uhKey = `uh${i}`;
                if (entry[kdKey] != null && entry[uhKey] == null) {
                  entry[uhKey] = entry[kdKey];
                }
              }
            }
            if (entry.uts === undefined && entry.pts != null) {
              entry.uts = entry.pts;
            }
            if (entry.uas === undefined && entry.pas != null) {
              entry.uas = entry.pas;
            }
          }
        }
      });
    });

    // GRADEBOOK-V4-PA-SPLIT: Extend KD/UH to 10 columns, add kdCount, add kdDetails.
    this.version(12).stores({
      gradeBooks: "id, academicYearId, teacherId, classId, subject, semester, status, [academicYearId+teacherId+classId+semester]",
    }).upgrade((tx) => {
      return tx.table("gradeBooks").toCollection().modify((book: Record<string, unknown>) => {
        if (book.kdCount === undefined) book.kdCount = 6;
      });
    });
  }
}

export const db = new GuruAdminDB();

export async function ensureDBOpen(): Promise<void> {
  if (!db.isOpen()) {
    await db.open();
  }
}
```

### FULL SOURCE CODE: `packages/domain/src/academic-year.ts`

```typescript
/**
 * AcademicYear — Tahun pelajaran.
 * Sumber: docs/DATA_MODEL_DRAFT.md §1
 */

import { z } from "zod";
import { baseEntitySchema } from "./base";

export const academicYearSchema = baseEntitySchema.extend({
  label: z
    .string()
    .regex(/^\d{4}\/\d{4}$/, "Label wajib format YYYY/YYYY, contoh: 2025/2026"),
  startDate: z.string(),
  endDate: z.string(),
  semester1Start: z.string(),
  semester1End: z.string(),
  semester2Start: z.string(),
  semester2End: z.string(),
  active: z.boolean(),
  sourceYearId: z.string().nullable().optional(),
});

export type AcademicYear = z.infer<typeof academicYearSchema>;

export function validateAcademicYearLogic(y: AcademicYear): string[] {
  const errors: string[] = [];
  if (y.startDate >= y.endDate) errors.push("startDate wajib lebih awal dari endDate");
  if (y.semester1Start >= y.semester1End) errors.push("semester1Start wajib lebih awal dari semester1End");
  if (y.semester2Start >= y.semester2End) errors.push("semester2Start wajib lebih awal dari semester2End");
  if (y.semester1End >= y.semester2Start) errors.push("semester1End wajib lebih awal dari semester2Start");
  return errors;
}

export function parseAcademicYear(input: unknown): AcademicYear {
  return academicYearSchema.parse(input);
}

export function safeParseAcademicYear(input: unknown) {
  const result = academicYearSchema.safeParse(input);
  if (!result.success) return { success: false as const, error: result.error };
  const logicErrors = validateAcademicYearLogic(result.data);
  if (logicErrors.length > 0) return { success: false as const, error: new Error(logicErrors.join("; ")) };
  return { success: true as const, data: result.data };
}
```

### FULL SOURCE CODE: `packages/domain/src/school-profile.ts`

```typescript
/**
 * SchoolProfile — Profil sekolah (single row di MVP v1).
 * Sumber: docs/DATA_MODEL_DRAFT.md §2
 */

import { z } from "zod";
import { baseEntitySchema } from "./base";

export const SCHOOL_PROFILE_ID = "school-profile";

export const schoolProfileSchema = baseEntitySchema.extend({
  name: z.string().min(1, "Nama sekolah wajib diisi"),
  npsn: z.string().regex(/^\d{8}$/, "NPSN wajib 8 digit numerik"),
  nss: z.string().optional(),
  address: z.string().min(1, "Alamat wajib diisi"),
  village: z.string().min(1, "Desa/Kelurahan wajib diisi"),
  district: z.string().min(1, "Kecamatan wajib diisi"),
  regency: z.string().min(1, "Kabupaten/Kota wajib diisi"),
  province: z.string().min(1, "Provinsi wajib diisi"),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Format email tidak valid").optional().or(z.literal("")),
  website: z.string().optional(),
  headmasterName: z.string().min(1, "Nama kepala sekolah wajib diisi"),
  headmasterNip: z.string().regex(/^\d{18}$/, "NIP kepala sekolah wajib 18 digit numerik").optional().or(z.literal("")),
  headmasterSignature: z.string().optional(),
  logo: z.string().optional(),
});

export type SchoolProfile = z.infer<typeof schoolProfileSchema>;

export function parseSchoolProfile(input: unknown): SchoolProfile {
  return schoolProfileSchema.parse(input);
}

export function safeParseSchoolProfile(input: unknown) {
  const result = schoolProfileSchema.safeParse(input);
  if (!result.success) return { success: false as const, error: result.error };
  return { success: true as const, data: result.data };
}
```

### FULL SOURCE CODE: `packages/domain/src/teacher-profile.ts`

```typescript
/**
 * TeacherProfile — Profil guru (single row di MVP v1).
 * Sumber: docs/DATA_MODEL_DRAFT.md §3
 */

import { z } from "zod";
import { baseEntitySchema } from "./base";

export const TEACHER_PROFILE_ID = "teacher-profile";

export const teacherSubjectSchema = z.object({
  subject: z.string().min(1, "Mapel wajib diisi"),
  grades: z.array(z.string()).min(1, "Minimal 1 kelas wajib diisi"),
  phases: z.array(z.string()).min(1, "Minimal 1 fase wajib diisi"),
});

export const teacherProfileSchema = baseEntitySchema.extend({
  name: z.string().min(1, "Nama guru wajib diisi"),
  nip: z.string().regex(/^\d{18}$/, "NIP wajib 18 digit numerik").optional().or(z.literal("")),
  email: z.string().email("Format email tidak valid").optional().or(z.literal("")),
  phone: z.string().optional(),
  employeeStatus: z.enum(["pns", "pppk", "honorer", "gtt", "gty", "other"]),
  subjects: z.array(teacherSubjectSchema).min(1, "Minimal 1 mapel wajib diisi"),
  homeroomClassId: z.string().optional(),
  signature: z.string().optional(),
  photo: z.string().optional(),
});

export type TeacherSubject = z.infer<typeof teacherSubjectSchema>;
export type TeacherProfile = z.infer<typeof teacherProfileSchema>;

export function parseTeacherProfile(input: unknown): TeacherProfile {
  return teacherProfileSchema.parse(input);
}

export function safeParseTeacherProfile(input: unknown) {
  const result = teacherProfileSchema.safeParse(input);
  if (!result.success) return { success: false as const, error: result.error };
  return { success: true as const, data: result.data };
}
```

### FULL SOURCE CODE: `packages/domain/src/calendar-event.ts`

```typescript
/**
 * CalendarEvent — Event kalender pendidikan.
 * Sumber: docs/DATA_MODEL_DRAFT.md §4
 */

import { z } from "zod";
import { CALENDAR_EVENT_TYPES } from "@guru-admin/shared";
import { baseEntitySchema } from "./base";

export const calendarEventTypeSchema = z.enum(CALENDAR_EVENT_TYPES);

export const calendarScopeSchema = z.union([
  z.literal("ALL"),
  z.array(z.string()),
]);

export const calendarEventSchema = baseEntitySchema.extend({
  academicYearId: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  type: calendarEventTypeSchema,
  label: z.string().min(1, "Label event wajib diisi"),
  description: z.string().optional(),
  scope: calendarScopeSchema,
  blocksLearning: z.boolean(),
  source: z.enum(["ai_import", "manual"]),
});

export type CalendarEvent = z.infer<typeof calendarEventSchema>;
export type CalendarEventType = z.infer<typeof calendarEventTypeSchema>;
export type CalendarScope = z.infer<typeof calendarScopeSchema>;

export function parseCalendarEvent(input: unknown): CalendarEvent {
  return calendarEventSchema.parse(input);
}

export function safeParseCalendarEvent(input: unknown) {
  const result = calendarEventSchema.safeParse(input);
  if (!result.success) return { success: false as const, error: result.error };
  if (result.data.startDate > result.data.endDate) {
    return { success: false as const, error: new Error("startDate wajib <= endDate") };
  }
  if (result.data.type === "holiday" && !result.data.blocksLearning) {
    return { success: false as const, error: new Error("Event tipe 'holiday' wajib blocksLearning=true") };
  }
  return { success: true as const, data: result.data };
}
```

### FULL SOURCE CODE: `packages/domain/src/prota.ts`

```typescript
/**
 * Prota — Program Tahunan (ProtaProfile + ProtaUnit).
 * Sumber: docs/DATA_MODEL_DRAFT.md §5
 */

import { z } from "zod";
import { baseEntitySchema } from "./base";
import { documentStatusSchema } from "./base";

export const protaUnitSchema = baseEntitySchema.extend({
  protaProfileId: z.string().min(1),
  semester: z.union([z.literal(1), z.literal(2)]),
  title: z.string().min(1, "Judul materi wajib diisi"),
  learningOutcome: z.string().optional(),
  jp: z.number().int().positive("JP wajib bilangan bulat positif"),
  order: z.number().int().nonnegative(),
  code: z.string().optional(),
});

export const protaProfileSchema = baseEntitySchema.extend({
  academicYearId: z.string().min(1),
  subject: z.string().min(1),
  grade: z.string().min(1),
  phase: z.string().min(1),
  teacherId: z.string().min(1),
  annualIntraJP: z.number().int().nonnegative(),
  semester1IntraJP: z.number().int().nonnegative(),
  semester2IntraJP: z.number().int().nonnegative(),
  annualCocurricularJP: z.number().int().nonnegative().optional(),
  semester1CocurricularJP: z.number().int().nonnegative().optional(),
  semester2CocurricularJP: z.number().int().nonnegative().optional(),
  units: z.array(protaUnitSchema),
  status: documentStatusSchema,
  sourceYearId: z.string().nullable().optional(),
  notes: z.string().optional(),
});

export type ProtaUnit = z.infer<typeof protaUnitSchema>;
export type ProtaProfile = z.infer<typeof protaProfileSchema>;

export function parseProtaProfile(input: unknown): ProtaProfile {
  return protaProfileSchema.parse(input);
}

export function safeParseProtaProfile(input: unknown) {
  const result = protaProfileSchema.safeParse(input);
  if (!result.success) return { success: false as const, error: result.error };
  return { success: true as const, data: result.data };
}

export function parseProtaUnit(input: unknown): ProtaUnit {
  return protaUnitSchema.parse(input);
}

export function safeParseProtaUnit(input: unknown) {
  const result = protaUnitSchema.safeParse(input);
  if (!result.success) return { success: false as const, error: result.error };
  return { success: true as const, data: result.data };
}
```

### FULL SOURCE CODE: `packages/domain/src/teaching-schedule.ts`

```typescript
/**
 * TeachingSchedule — Jadwal mengajar guru.
 * Sumber: docs/DATA_MODEL_DRAFT.md §6
 */

import { z } from "zod";
import { baseEntitySchema } from "./base";

export const teachingScheduleSchema = baseEntitySchema.extend({
  academicYearId: z.string().min(1),
  teacherId: z.string().min(1),
  subject: z.string().min(1),
  classId: z.string().min(1),
  classLabel: z.string().min(1),
  dayOfWeek: z.number().int().min(1).max(7),
  startPeriod: z.number().int().positive(),
  durationJP: z.number().int().positive(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "startTime wajib format HH:mm"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "endTime wajib format HH:mm"),
  semester: z.union([z.literal(1), z.literal(2)]),
  source: z.enum(["manual", "smart_roster_import"]),
  notes: z.string().optional(),
});

export type TeachingSchedule = z.infer<typeof teachingScheduleSchema>;

export function parseTeachingSchedule(input: unknown): TeachingSchedule {
  return teachingScheduleSchema.parse(input);
}

export function safeParseTeachingSchedule(input: unknown) {
  const result = teachingScheduleSchema.safeParse(input);
  if (!result.success) return { success: false as const, error: result.error };
  if (result.data.startTime >= result.data.endTime) {
    return { success: false as const, error: new Error("startTime wajib lebih awal dari endTime") };
  }
  return { success: true as const, data: result.data };
}
```

### FULL SOURCE CODE: `packages/domain/src/teaching-assignment.ts`

```typescript
/**
 * TeachingAssignment — "Data Mengajar".
 *
 * Sumber: PATCH-FLOW-RC2C (senior audit recommendation)
 *
 * Filosofi: guru TIDAK memilih kelas+mapel secara terpisah. Guru memilih
 * satu paket "Data Mengajar" yang sudah ditetapkan di awal tahun pelajaran.
 * Satu assignment = 1 baris (guru, mapel, kelas, semester, tahun pelajaran).
 *
 * Key: (academicYearId, semester, teacherId, subject, classId) — unik.
 */

import { z } from "zod";
import { baseEntitySchema } from "./base";

export const teachingAssignmentSchema = baseEntitySchema.extend({
  academicYearId: z.string().min(1),
  semester: z.union([z.literal(1), z.literal(2)]),
  teacherId: z.string().min(1),
  teacherName: z.string().min(1),
  subject: z.string().min(1),
  classId: z.string().min(1),
  classLabel: z.string().min(1),
  jpPerWeek: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

export type TeachingAssignment = z.infer<typeof teachingAssignmentSchema>;

export function parseTeachingAssignment(input: unknown): TeachingAssignment {
  return teachingAssignmentSchema.parse(input);
}

export function safeParseTeachingAssignment(input: unknown) {
  const result = teachingAssignmentSchema.safeParse(input);
  if (!result.success) return { success: false as const, error: result.error };
  return { success: true as const, data: result.data };
}

export function assignmentCompositeKey(args: {
  academicYearId: string;
  semester: 1 | 2;
  teacherId: string;
  subject: string;
  classId: string;
}): string {
  return [args.academicYearId, `S${args.semester}`, args.teacherId, args.subject, args.classId].join("|");
}

export function isSameAssignmentContext(
  a: { academicYearId: string; semester: 1 | 2; teacherId: string; subject: string; classId: string },
  b: { academicYearId: string; semester: 1 | 2; teacherId: string; subject: string; classId: string }
): boolean {
  return (
    a.academicYearId === b.academicYearId &&
    a.semester === b.semester &&
    a.teacherId === b.teacherId &&
    a.subject === b.subject &&
    a.classId === b.classId
  );
}

export function assignmentLabel(a: { classLabel: string; subject: string; teacherName: string }): string {
  return `${a.classLabel} · ${a.subject} · ${a.teacherName}`;
}

export function assignmentShortLabel(a: { classLabel: string; subject: string }): string {
  return `${a.classLabel} · ${a.subject}`;
}
```

### FULL SOURCE CODE: `packages/domain/src/lesson-session.ts`

```typescript
/**
 * LessonSession — Sesi mengajar konkret pada tanggal tertentu.
 * Sumber: docs/DATA_MODEL_DRAFT.md §7
 */

import { z } from "zod";
import { LESSON_SESSION_STATUSES } from "@guru-admin/shared";
import { baseEntitySchema } from "./base";

export const lessonSessionStatusSchema = z.enum(LESSON_SESSION_STATUSES);

export const lessonSessionSchema = baseEntitySchema.extend({
  academicYearId: z.string().min(1),
  teachingScheduleId: z.string().min(1),
  teacherId: z.string().min(1),
  classId: z.string().min(1),
  classLabel: z.string().min(1),
  subject: z.string().min(1),
  date: z.string(),
  startPeriod: z.number().int().positive(),
  durationJP: z.number().int().positive(),
  startTime: z.string(),
  endTime: z.string(),
  semester: z.union([z.literal(1), z.literal(2)]),
  plannedUnitId: z.string().nullable().optional(),
  status: lessonSessionStatusSchema,
  calendarEventId: z.string().nullable().optional(),
});

export type LessonSession = z.infer<typeof lessonSessionSchema>;
export type LessonSessionStatus = z.infer<typeof lessonSessionStatusSchema>;

export function parseLessonSession(input: unknown): LessonSession {
  return lessonSessionSchema.parse(input);
}

export function safeParseLessonSession(input: unknown) {
  const result = lessonSessionSchema.safeParse(input);
  if (!result.success) return { success: false as const, error: result.error };
  return { success: true as const, data: result.data };
}
```

### FULL SOURCE CODE: `packages/domain/src/attendance.ts`

```typescript
/**
 * Attendance — AttendanceRecord + ClassRoster + StudentEntry.
 * Sumber: docs/DATA_MODEL_DRAFT.md §8
 */

import { z } from "zod";
import { ATTENDANCE_STATUSES } from "@guru-admin/shared";
import { baseEntitySchema } from "./base";

export const attendanceStatusSchema = z.enum(ATTENDANCE_STATUSES);

export const attendanceRecordSchema = baseEntitySchema.extend({
  sessionId: z.string().min(1),
  studentId: z.string().min(1),
  studentName: z.string().min(1),
  studentNumber: z.number().int().positive().optional(),
  nis: z.string().optional(),
  classId: z.string().min(1),
  classLabel: z.string().min(1),
  date: z.string(),
  status: attendanceStatusSchema,
  note: z.string().optional(),
});

export const studentEntrySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  number: z.number().int().positive(),
  nis: z.string().optional(),
});

export const classRosterSchema = baseEntitySchema.extend({
  classId: z.string().min(1),
  classLabel: z.string().min(1),
  academicYearId: z.string().min(1),
  students: z.array(studentEntrySchema),
});

export type AttendanceRecord = z.infer<typeof attendanceRecordSchema>;
export type AttendanceStatus = z.infer<typeof attendanceStatusSchema>;
export type StudentEntry = z.infer<typeof studentEntrySchema>;
export type ClassRoster = z.infer<typeof classRosterSchema>;

export function parseAttendanceRecord(input: unknown): AttendanceRecord {
  return attendanceRecordSchema.parse(input);
}

export function safeParseAttendanceRecord(input: unknown) {
  const result = attendanceRecordSchema.safeParse(input);
  if (!result.success) return { success: false as const, error: result.error };
  return { success: true as const, data: result.data };
}

export function parseClassRoster(input: unknown): ClassRoster {
  return classRosterSchema.parse(input);
}

export function safeParseClassRoster(input: unknown) {
  const result = classRosterSchema.safeParse(input);
  if (!result.success) return { success: false as const, error: result.error };
  return { success: true as const, data: result.data };
}
```

### FULL SOURCE CODE: `packages/domain/src/teaching-journal.ts`

```typescript
/**
 * TeachingJournal — Jurnal mengajar per sesi.
 * Sumber: docs/DATA_MODEL_DRAFT.md §9
 */

import { z } from "zod";
import { JOURNAL_REALIZATION_STATUSES } from "@guru-admin/shared";
import { baseEntitySchema, documentStatusSchema } from "./base";

export const journalRealizationStatusSchema = z.enum(JOURNAL_REALIZATION_STATUSES);

export const teachingJournalSchema = baseEntitySchema.extend({
  sessionId: z.string().min(1),
  academicYearId: z.string().min(1),
  teacherId: z.string().min(1),
  classId: z.string().min(1),
  classLabel: z.string().min(1),
  subject: z.string().min(1),
  date: z.string(),
  semester: z.union([z.literal(1), z.literal(2)]),
  plannedUnitId: z.string().nullable().optional(),
  plannedMaterialTitle: z.string().nullable().optional(),
  plannedLearningOutcome: z.string().nullable().optional(),
  presentCount: z.number().int().nonnegative(),
  sickCount: z.number().int().nonnegative(),
  excusedCount: z.number().int().nonnegative(),
  lateCount: z.number().int().nonnegative().optional(),
  absentCount: z.number().int().nonnegative(),
  totalStudents: z.number().int().nonnegative(),
  realizationStatus: journalRealizationStatusSchema,
  actualMaterialTitle: z.string().optional(),
  note: z.string().optional(),
  followUp: z.string().optional(),
  status: documentStatusSchema,
  locked: z.boolean(),
  finalizedAt: z.string().nullable().optional(),
});

export type TeachingJournal = z.infer<typeof teachingJournalSchema>;
export type JournalRealizationStatus = z.infer<typeof journalRealizationStatusSchema>;

export function parseTeachingJournal(input: unknown): TeachingJournal {
  return teachingJournalSchema.parse(input);
}

export function safeParseTeachingJournal(input: unknown) {
  const result = teachingJournalSchema.safeParse(input);
  if (!result.success) return { success: false as const, error: result.error };
  const { presentCount, sickCount, excusedCount, absentCount, totalStudents } = result.data;
  if (presentCount + sickCount + excusedCount + absentCount !== totalStudents) {
    return {
      success: false as const,
      error: new Error(`Jumlah siswa tidak konsisten: present(${presentCount}) + sick(${sickCount}) + excused(${excusedCount}) + absent(${absentCount}) ≠ total(${totalStudents})`),
    };
  }
  return { success: true as const, data: result.data };
}
```

### FULL SOURCE CODE: `packages/domain/src/semester-report.ts`

```typescript
/**
 * SemesterReport — Laporan akhir semester.
 * Sumber: docs/DATA_MODEL_DRAFT.md §10
 */

import { z } from "zod";
import { baseEntitySchema, documentStatusSchema } from "./base";

export const classAbsenceSummarySchema = z.object({
  classId: z.string().min(1),
  classLabel: z.string().min(1),
  presentCount: z.number().int().nonnegative(),
  sickCount: z.number().int().nonnegative(),
  excusedCount: z.number().int().nonnegative(),
  lateCount: z.number().int().nonnegative().optional(),
  absentCount: z.number().int().nonnegative(),
  totalSessions: z.number().int().nonnegative(),
});

export const semesterReportSchema = baseEntitySchema.extend({
  academicYearId: z.string().min(1),
  teacherId: z.string().min(1),
  subject: z.string().min(1),
  grade: z.string().min(1),
  phase: z.string().min(1),
  classId: z.string().default(""),
  classLabel: z.string().default(""),
  semester: z.union([z.literal(1), z.literal(2)]),
  totalPlannedSessions: z.number().int().nonnegative(),
  totalDoneSessions: z.number().int().nonnegative(),
  totalContinuedSessions: z.number().int().nonnegative(),
  totalCancelledSessions: z.number().int().nonnegative(),
  totalPlannedUnits: z.number().int().nonnegative(),
  totalCompletedUnits: z.number().int().nonnegative(),
  totalPartialUnits: z.number().int().nonnegative(),
  totalNotStartedUnits: z.number().int().nonnegative(),
  completedUnitIds: z.array(z.string()),
  partialUnitIds: z.array(z.string()),
  notStartedUnitIds: z.array(z.string()),
  totalPresent: z.number().int().nonnegative(),
  totalSick: z.number().int().nonnegative(),
  totalExcused: z.number().int().nonnegative(),
  totalLate: z.number().int().nonnegative().optional(),
  totalAbsent: z.number().int().nonnegative(),
  perClassAbsence: z.array(classAbsenceSummarySchema),
  journalsFinalized: z.number().int().nonnegative(),
  journalsPending: z.number().int().nonnegative(),
  pendingJournalDates: z.array(z.string()),
  teacherNotes: z.string().optional(),
  followUpNotes: z.string().optional(),
  materialAdjustments: z.string().optional(),
  status: documentStatusSchema,
  finalizedAt: z.string().nullable().optional(),
  snapshotId: z.string().nullable().optional(),
});

export type SemesterReport = z.infer<typeof semesterReportSchema>;
export type ClassAbsenceSummary = z.infer<typeof classAbsenceSummarySchema>;

export function parseSemesterReport(input: unknown): SemesterReport {
  return semesterReportSchema.parse(input);
}

export function safeParseSemesterReport(input: unknown) {
  const result = semesterReportSchema.safeParse(input);
  if (!result.success) return { success: false as const, error: result.error };
  return { success: true as const, data: result.data };
}
```

### FULL SOURCE CODE: `packages/domain/src/gradebook.ts` (Schema definition — 833 lines total)

```typescript
/**
 * GradeBook — Nilai per kelas.
 *
 * V2 (GRADEBOOK-V2-KD-IMPORT-RC1):
 *   - Field nilai: KD1, KD2, KD3, KD4, KD5, KD6, PTS, PAS, Nilai Akhir.
 *   - KD = nilai per bab (KD1 = Bab 1, dst).
 *   - Nilai Akhir dihitung dari rata-rata KD + PTS + PAS (bobot configurable).
 *
 * V3 (GRADEBOOK-V3-UH-UTS-UAS):
 *   - gradeModel: "kd" | "uh" — model penilaian.
 *   - Model UH: kd1-uhCount dipakai sebagai UH1-UHn, pts → UTS, pas → UAS.
 *   - Bobot configurable: weightUH, weightUTS, weightUAS.
 *   - Rumus: avg(UH) × weightUH% + UTS × weightUTS% + UAS × weightUAS%.
 *
 * V4 (GRADEBOOK-V4-PA-SPLIT):
 *   - gradeModel: "pa-split" — Penilaian Harian split (Ulangan + Tugas per KD).
 *   - kdDetails: Record<number, KDScoreDetail> — per-KD detail (ulangan + tugas + override).
 *   - kdCount: jumlah KD yang ditampilkan (2-10, default 6).
 *   - StudentGradeRecord: VIEW type untuk Rekap Semester (landscape cetak).
 */

import { z } from "zod";
import { GRADE_ENTRY_STATUSES } from "@guru-admin/shared";
import { baseEntitySchema, documentStatusSchema } from "./base";

export const gradeEntryStatusSchema = z.enum(GRADE_ENTRY_STATUSES);

const scoreSchema = z.number().min(0).max(100).nullable().optional();

/* V4: KDScoreDetail */
export const kdScoreDetailSchema = z.object({
  ulangan: z.number().min(0).max(100).nullable().optional(),
  tugas: z.number().min(0).max(100).nullable().optional(),
  manualOverride: z.number().min(0).max(100).nullable().optional(),
});
export type KDScoreDetail = z.infer<typeof kdScoreDetailSchema>;

export function calculateKDFinalScore(detail?: KDScoreDetail): number | null {
  if (!detail) return null;
  if (typeof detail.manualOverride === "number") return detail.manualOverride;
  const ulangan = typeof detail.ulangan === "number" ? detail.ulangan : null;
  const tugas = typeof detail.tugas === "number" ? detail.tugas : null;
  if (ulangan !== null && tugas !== null) return Math.round((ulangan + tugas) / 2);
  if (ulangan !== null) return ulangan;
  if (tugas !== null) return tugas;
  return null;
}

export const gradeEntrySchema = z.object({
  studentId: z.string().min(1),
  studentName: z.string().min(1),
  studentNumber: z.number().int().positive().optional(),
  kd1: scoreSchema, kd2: scoreSchema, kd3: scoreSchema, kd4: scoreSchema,
  kd5: scoreSchema, kd6: scoreSchema, kd7: scoreSchema, kd8: scoreSchema,
  kd9: scoreSchema, kd10: scoreSchema,
  uh1: scoreSchema, uh2: scoreSchema, uh3: scoreSchema, uh4: scoreSchema,
  uh5: scoreSchema, uh6: scoreSchema, uh7: scoreSchema, uh8: scoreSchema,
  uh9: scoreSchema, uh10: scoreSchema,
  pts: scoreSchema, pas: scoreSchema,
  uts: scoreSchema, uas: scoreSchema,
  finalScore: scoreSchema, averageKd: scoreSchema,
  dailyScore: scoreSchema, assignmentScore: scoreSchema,
  summativeScore: scoreSchema, remedialScore: scoreSchema, averageScore: scoreSchema,
  status: gradeEntryStatusSchema,
  note: z.string().optional(),
  kdDetails: z.record(z.number().int().min(1).max(10), kdScoreDetailSchema).optional(),
});

export const gradeBookSchema = baseEntitySchema.extend({
  academicYearId: z.string().min(1),
  teacherId: z.string().min(1),
  classId: z.string().min(1),
  classLabel: z.string().min(1),
  subject: z.string().min(1),
  semester: z.union([z.literal(1), z.literal(2)]),
  passingScore: z.number().min(0).max(100),
  entries: z.array(gradeEntrySchema),
  status: documentStatusSchema,
  gradeModel: z.enum(["uh", "kd", "pa-split"]).default("uh"),
  uhCount: z.number().int().min(2).max(10).default(2),
  kdCount: z.number().int().min(2).max(10).default(6),
  weightUH: z.number().min(0).max(100).default(25),
  weightUTS: z.number().min(0).max(100).default(25),
  weightUAS: z.number().min(0).max(100).default(50),
}).refine(
  (data) => data.gradeModel !== "uh" || (data.weightUH + data.weightUTS + data.weightUAS === 100),
  { message: "Bobot UH + UTS + UAS harus berjumlah 100%", path: ["weightUAS"] }
).refine(
  (data) => data.gradeModel !== "pa-split" || (data.kdCount >= 2 && data.kdCount <= 10),
  { message: "KD count harus 2-10 untuk model PA-split", path: ["kdCount"] }
);

export type GradeEntryStatus = z.infer<typeof gradeEntryStatusSchema>;
export type GradeEntry = z.infer<typeof gradeEntrySchema>;
export type GradeBook = z.infer<typeof gradeBookSchema>;

export type GradeBookSummary = {
  totalStudents: number;
  completeCount: number;
  remedialCount: number;
  incompleteCount: number;
  classAverage: number | null;
};

export type StudentGradeRecord = {
  studentId: string;
  studentName: string;
  nisn?: string;
  studentNumber?: number;
  finalKDScores: Record<number, number | null>;
  ulanganScores: Record<number, number | null>;
  tugasScores: Record<number, number | null>;
  pts: number | null;
  pas: number | null;
  finalScore: number | null;
  ket: string;
};

// ... (calculateGradeEntry, calculateGradeBookEntries, summarizeGradeBook,
//      parseExcelPaste, cbtImportSchema, validateCbtImport, previewCbtMatch,
//      applyCbtToEntries, getCbtTargetLabels, transformToStudentGradeRecord —
//      full 833 lines in actual file. Key functions listed below.)

// calculateGradeEntry: V3-V4 three model support (kd, uh, pa-split)
//   with strictWeightMode, proportional weight normalization, legacy fallback.
// calculateGradeBookEntries: batch compute all entries.
// summarizeGradeBook: count complete/remedial/incomplete + class average.
// parseExcelPaste: parse tab-separated paste from Excel.
// cbtImportSchema + validateCbtImport + previewCbtMatch + applyCbtToEntries:
//   CBT (Computer-Based Test) import bridge.
```

### FULL SOURCE CODE: `packages/domain/src/atp-entry.ts`

```typescript
/**
 * ATPEntry — Bank ATP/TP per guru per mapel per kelas.
 */

import { z } from "zod";
import { baseEntitySchema, documentStatusSchema } from "./base";

export const atpEntrySchema = baseEntitySchema.extend({
  academicYearId: z.string().min(1),
  teacherId: z.string().min(1),
  teacherName: z.string().min(1).optional(),
  subject: z.string().min(1),
  grade: z.string().min(1),
  phase: z.string().min(1),
  classId: z.string().optional(),
  bab: z.string().optional(),
  elemen: z.string().min(1),
  cp: z.string().min(1),
  tp: z.string().min(1),
  profilPelajar: z.string().optional(),
  kataKunci: z.string().optional(),
  alokasiJP: z.number().int().positive(),
  status: documentStatusSchema,
});

export type ATPEntry = z.infer<typeof atpEntrySchema>;

export function parseATPEntry(input: unknown): ATPEntry { return atpEntrySchema.parse(input); }
export function safeParseATPEntry(input: unknown) {
  const result = atpEntrySchema.safeParse(input);
  if (!result.success) return { success: false as const, error: result.error };
  return { success: true as const, data: result.data };
}

export function atpEntryLabel(a: { subject: string; grade: string; bab?: string; alokasiJP: number }): string {
  const parts = [`${a.subject} — ${a.grade}`];
  if (a.bab) parts.push(`Bab ${a.bab}`);
  parts.push(`${a.alokasiJP} JP`);
  return parts.join(" · ");
}
```

### FULL SOURCE CODE: `packages/domain/src/lkpd.ts`

```typescript
/**
 * LKPD — Lembar Kerja Peserta Didik.
 */

import { z } from "zod";
import { baseEntitySchema, documentStatusSchema } from "./base";

export const lkpdSchema = baseEntitySchema.extend({
  academicYearId: z.string().min(1),
  teacherId: z.string().min(1),
  teacherName: z.string().min(1).optional(),
  subject: z.string().min(1),
  grade: z.string().min(1),
  classId: z.string().optional(),
  classLabel: z.string().optional(),
  atpEntryId: z.string().min(1),
  tp: z.string().min(1),
  title: z.string().min(1),
  objective: z.string().min(1),
  materials: z.string().optional(),
  steps: z.string().min(1),
  guidingQuestions: z.string().optional(),
  assessment: z.string().optional(),
  notes: z.string().optional(),
  status: documentStatusSchema,
  finalizedAt: z.string().nullable().optional(),
});

export type LKPD = z.infer<typeof lkpdSchema>;

export function parseLKPD(input: unknown): LKPD { return lkpdSchema.parse(input); }
export function safeParseLKPD(input: unknown) {
  const result = lkpdSchema.safeParse(input);
  if (!result.success) return { success: false as const, error: result.error };
  return { success: true as const, data: result.data };
}

export function isLKPDComplete(lkpd: LKPD): { complete: boolean; missingFields: string[] } {
  const missing: string[] = [];
  if (!lkpd.title) missing.push("Judul");
  if (!lkpd.objective) missing.push("Tujuan");
  if (!lkpd.steps) missing.push("Langkah Kegiatan");
  if (!lkpd.atpEntryId) missing.push("TP (Tujuan Pembelajaran)");
  return { complete: missing.length === 0, missingFields: missing };
}

export function finalizeLKPD(lkpd: LKPD): { success: boolean; lkpd?: LKPD; errors: string[] } {
  const check = isLKPDComplete(lkpd);
  if (!check.complete) return { success: false, errors: [`LKPD belum lengkap: ${check.missingFields.join(", ")}`] };
  const now = new Date().toISOString();
  return { success: true, lkpd: { ...lkpd, status: "final", finalizedAt: now, updatedAt: now }, errors: [] };
}

export function lkpdLabel(l: { title: string; classLabel?: string; subject: string }): string {
  const parts = [l.title];
  if (l.classLabel) parts.push(l.classLabel);
  parts.push(l.subject);
  return parts.join(" · ");
}
```

### FULL SOURCE CODE: `packages/domain/src/rpp-document.ts`

```typescript
/**
 * RppDocument — arsip dokumen RPP/Modul Ajar hasil bulk identity replacement.
 */

import { z } from "zod";
import { baseEntitySchema, documentStatusSchema } from "./base";

export const rppIdentityContextSchema = z.object({
  schoolName: z.string(), schoolAddress: z.string(),
  headmasterName: z.string(), headmasterNip: z.string(),
  teacherName: z.string(), teacherNip: z.string(),
  subject: z.string(), classLabel: z.string(),
  semester: z.string(), academicYearLabel: z.string(),
  fase: z.string(), place: z.string(), date: z.string(),
});
export type RppIdentityContext = z.infer<typeof rppIdentityContextSchema>;

export const literalReplacementSchema = z.object({
  oldText: z.string().min(1), newText: z.string(),
});
export type LiteralReplacement = z.infer<typeof literalReplacementSchema>;

export const RPP_IDENTITY_PLACEHOLDERS = [
  "{{NAMA_SEKOLAH}}", "{{ALAMAT_SEKOLAH}}", "{{NAMA_KEPALA_SEKOLAH}}", "{{NIP_KEPALA_SEKOLAH}}",
  "{{NAMA_GURU}}", "{{NIP_GURU}}", "{{MAPEL}}", "{{KELAS}}", "{{SEMESTER}}",
  "{{TAHUN_PELAJARAN}}", "{{FASE}}", "{{TEMPAT}}", "{{TANGGAL}}",
] as const;

export const documentIdentityKindSchema = z.enum(["rpp", "prota", "atp", "lkpd", "blueprint", "question_card", "exam", "other"]);
export type DocumentIdentityKind = z.infer<typeof documentIdentityKindSchema>;

export const rppDocumentSchema = baseEntitySchema.extend({
  academicYearId: z.string().min(1),
  teacherId: z.string().min(1),
  teacherName: z.string().min(1).optional(),
  assignmentId: z.string().nullable().optional(),
  subject: z.string().optional(),
  classLabel: z.string().optional(),
  semester: z.union([z.literal(1), z.literal(2)]).optional(),
  documentKind: documentIdentityKindSchema.default("rpp"),
  originalContent: z.string(),
  processedContent: z.string(),
  source: z.enum(["upload", "paste"]),
  filename: z.string().nullable().optional(),
  contextSnapshot: rppIdentityContextSchema,
  literalReplacements: z.array(literalReplacementSchema).default([]),
  status: documentStatusSchema,
  finalizedAt: z.string().nullable().optional(),
});

export type RppDocument = z.infer<typeof rppDocumentSchema>;

export function parseRppDocument(input: unknown): RppDocument { return rppDocumentSchema.parse(input); }
export function safeParseRppDocument(input: unknown) {
  const result = rppDocumentSchema.safeParse(input);
  if (!result.success) return { success: false as const, error: result.error };
  return { success: true as const, data: result.data };
}

export function buildPlaceholderMap(ctx: RppIdentityContext): Record<string, string> {
  return {
    "{{NAMA_SEKOLAH}}": ctx.schoolName, "{{ALAMAT_SEKOLAH}}": ctx.schoolAddress,
    "{{NAMA_KEPALA_SEKOLAH}}": ctx.headmasterName, "{{NIP_KEPALA_SEKOLAH}}": ctx.headmasterNip,
    "{{NAMA_GURU}}": ctx.teacherName, "{{NIP_GURU}}": ctx.teacherNip,
    "{{MAPEL}}": ctx.subject, "{{KELAS}}": ctx.classLabel, "{{SEMESTER}}": ctx.semester,
    "{{TAHUN_PELAJARAN}}": ctx.academicYearLabel, "{{FASE}}": ctx.fase,
    "{{TEMPAT}}": ctx.place, "{{TANGGAL}}": ctx.date,
  };
}

export function replaceRppIdentityPlaceholders(content: string, ctx: RppIdentityContext): string {
  const map = buildPlaceholderMap(ctx);
  let result = content;
  for (const [placeholder, value] of Object.entries(map)) {
    if (!value) continue;
    result = result.split(placeholder).join(value);
  }
  return result;
}

export function replaceLiteralText(content: string, replacements: LiteralReplacement[]): string {
  let result = content;
  for (const { oldText, newText } of replacements) {
    if (!oldText) continue;
    result = result.split(oldText).join(newText);
  }
  return result;
}

export function applyAllReplacements(content: string, ctx: RppIdentityContext, literalReplacements: LiteralReplacement[] = []): string {
  let result = replaceRppIdentityPlaceholders(content, ctx);
  result = replaceLiteralText(result, literalReplacements);
  return result;
}

export function countPlaceholders(content: string): Record<string, number> {
  const result: Record<string, number> = {};
  for (const ph of RPP_IDENTITY_PLACEHOLDERS) {
    const count = content.split(ph).length - 1;
    if (count > 0) result[ph] = count;
  }
  return result;
}

export function hasAnyPlaceholder(content: string): boolean {
  return RPP_IDENTITY_PLACEHOLDERS.some((ph) => content.includes(ph));
}

export function countLiteralOccurrences(content: string, oldText: string): number {
  if (!oldText) return 0;
  return content.split(oldText).length - 1;
}
```

### FULL SOURCE CODE: `packages/domain/src/remedial-program.ts`

```typescript
/**
 * RemedialProgram — Program Remedial otomatis dari GradeBook.
 */

import { z } from "zod";
import { baseEntitySchema, documentStatusSchema } from "./base";

export const remedialStudentSchema = z.object({
  studentId: z.string().min(1),
  studentName: z.string().min(1),
  studentNumber: z.number().int().positive().optional(),
  nis: z.string().optional(),
  finalScore: z.number().min(0).max(100),
  remedialScore: z.number().min(0).max(100).nullable().optional(),
  tpToImprove: z.string().optional(),
  method: z.string().optional(),
  schedule: z.string().optional(),
  note: z.string().optional(),
});
export type RemedialStudent = z.infer<typeof remedialStudentSchema>;

export const remedialProgramSchema = baseEntitySchema.extend({
  academicYearId: z.string().min(1),
  teacherId: z.string().min(1),
  teacherName: z.string().min(1).optional(),
  subject: z.string().min(1),
  classId: z.string().min(1),
  classLabel: z.string().min(1),
  semester: z.union([z.literal(1), z.literal(2)]),
  kktp: z.number().int().min(0).max(100),
  students: z.array(remedialStudentSchema),
  plan: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: documentStatusSchema,
  finalizedAt: z.string().nullable().optional(),
});
export type RemedialProgram = z.infer<typeof remedialProgramSchema>;

export function parseRemedialProgram(input: unknown): RemedialProgram { return remedialProgramSchema.parse(input); }
export function safeParseRemedialProgram(input: unknown) {
  const result = remedialProgramSchema.safeParse(input);
  if (!result.success) return { success: false as const, error: result.error };
  return { success: true as const, data: result.data };
}

export function filterRemedialStudents(
  entries: Array<{ studentId: string; studentName: string; studentNumber?: number; nis?: string; finalScore: number | null }>,
  kktp: number
): RemedialStudent[] {
  return entries
    .filter((e) => e.finalScore !== null && e.finalScore < kktp)
    .map((e) => ({
      studentId: e.studentId, studentName: e.studentName, studentNumber: e.studentNumber, nis: e.nis,
      finalScore: e.finalScore as number, remedialScore: null, tpToImprove: undefined, method: undefined,
      schedule: undefined, note: undefined,
    }))
    .sort((a, b) => a.studentName.localeCompare(b.studentName));
}

export function isRemedialProgramComplete(_program: RemedialProgram): { complete: boolean; missingFields: string[] } {
  void _program;
  return { complete: true, missingFields: [] };
}

export function finalizeRemedialProgram(program: RemedialProgram): { success: boolean; program?: RemedialProgram; errors: string[] } {
  const check = isRemedialProgramComplete(program);
  if (!check.complete) return { success: false, errors: [`Program remedial belum lengkap: ${check.missingFields.join(", ")}`] };
  const now = new Date().toISOString();
  return { success: true, program: { ...program, status: "final", finalizedAt: now, updatedAt: now }, errors: [] };
}
```

### FULL SOURCE CODE: `packages/domain/src/enrichment-program.ts`

```typescript
/**
 * EnrichmentProgram — Program Pengayaan otomatis dari GradeBook.
 */

import { z } from "zod";
import { baseEntitySchema, documentStatusSchema } from "./base";

export const DEFAULT_ENRICHMENT_THRESHOLD = 90;

export const enrichmentStudentSchema = z.object({
  studentId: z.string().min(1),
  studentName: z.string().min(1),
  studentNumber: z.number().int().positive().optional(),
  nis: z.string().optional(),
  finalScore: z.number().min(0).max(100),
  activity: z.string().optional(),
  material: z.string().optional(),
  note: z.string().optional(),
});
export type EnrichmentStudent = z.infer<typeof enrichmentStudentSchema>;

export const enrichmentProgramSchema = baseEntitySchema.extend({
  academicYearId: z.string().min(1),
  teacherId: z.string().min(1),
  teacherName: z.string().min(1).optional(),
  subject: z.string().min(1),
  classId: z.string().min(1),
  classLabel: z.string().min(1),
  semester: z.union([z.literal(1), z.literal(2)]),
  threshold: z.number().int().min(0).max(100),
  students: z.array(enrichmentStudentSchema),
  plan: z.string().optional(),
  status: documentStatusSchema,
  finalizedAt: z.string().nullable().optional(),
});
export type EnrichmentProgram = z.infer<typeof enrichmentProgramSchema>;

export function parseEnrichmentProgram(input: unknown): EnrichmentProgram { return enrichmentProgramSchema.parse(input); }
export function safeParseEnrichmentProgram(input: unknown) {
  const result = enrichmentProgramSchema.safeParse(input);
  if (!result.success) return { success: false as const, error: result.error };
  return { success: true as const, data: result.data };
}

export function filterEnrichmentStudents(
  entries: Array<{ studentId: string; studentName: string; studentNumber?: number; nis?: string; finalScore: number | null }>,
  threshold: number = DEFAULT_ENRICHMENT_THRESHOLD
): EnrichmentStudent[] {
  return entries
    .filter((e) => e.finalScore !== null && e.finalScore >= threshold)
    .map((e) => ({
      studentId: e.studentId, studentName: e.studentName, studentNumber: e.studentNumber, nis: e.nis,
      finalScore: e.finalScore as number, activity: undefined, material: undefined, note: undefined,
    }))
    .sort((a, b) => a.studentName.localeCompare(b.studentName));
}

export function isEnrichmentProgramComplete(_program: EnrichmentProgram): { complete: boolean; missingFields: string[] } {
  void _program;
  return { complete: true, missingFields: [] };
}

export function finalizeEnrichmentProgram(program: EnrichmentProgram): { success: boolean; program?: EnrichmentProgram; errors: string[] } {
  const check = isEnrichmentProgramComplete(program);
  if (!check.complete) return { success: false, errors: [`Program pengayaan belum lengkap: ${check.missingFields.join(", ")}`] };
  const now = new Date().toISOString();
  return { success: true, program: { ...program, status: "final", finalizedAt: now, updatedAt: now }, errors: [] };
}
```

### FULL SOURCE CODE: `packages/domain/src/school-document.ts`

```typescript
/**
 * SchoolDocument — dokumen sekolah generik untuk infrastruktur WYSIWYG.
 * WYSIWYG-DOC-01: tabel ke-15 di Dexie v9.
 */

import { z } from "zod";
import { baseEntitySchema, documentStatusSchema } from "./base";

export const SCHOOL_DOC_TYPES = [
  "kalender-minggu-efektif", "promes", "prota", "atp", "absen-semester",
  "jurnal-semester", "daftar-nilai", "rapor-semester", "remedial", "pengayaan", "lainnya",
] as const;

export const schoolDocTypeSchema = z.enum(SCHOOL_DOC_TYPES);
export type SchoolDocType = z.infer<typeof schoolDocTypeSchema>;

export const SCHOOL_DOC_TYPE_LABELS: Record<SchoolDocType, string> = {
  "kalender-minggu-efektif": "Kalender Minggu Efektif",
  promes: "Program Semester", prota: "Program Tahunan", atp: "ATP / Tujuan Pembelajaran",
  "absen-semester": "Absensi Semester", "jurnal-semester": "Jurnal Semester",
  "daftar-nilai": "Daftar Nilai", "rapor-semester": "Rapor Semester",
  remedial: "Program Remedial", pengayaan: "Program Pengayaan", lainnya: "Dokumen Lainnya",
};

export const schoolDocOrientationSchema = z.enum(["portrait", "landscape"]);
export type SchoolDocOrientation = z.infer<typeof schoolDocOrientationSchema>;

export const schoolDocumentSchema = baseEntitySchema.extend({
  docType: schoolDocTypeSchema,
  semester: z.union([z.literal(1), z.literal(2)]),
  tahunAjaran: z.string().min(1),
  kodeMapel: z.string().optional().default(""),
  kodeKelas: z.string().optional().default(""),
  status: documentStatusSchema,
  teacherId: z.string().min(1),
  academicYearId: z.string().min(1),
  data: z.record(z.unknown()).optional().default({}),
  orientation: schoolDocOrientationSchema.optional().default("portrait"),
  meta: z.record(z.unknown()).optional().default({}),
  printedAt: z.string().nullable().optional(),
});
export type SchoolDocument = z.infer<typeof schoolDocumentSchema>;

export function parseSchoolDocument(input: unknown): SchoolDocument { return schoolDocumentSchema.parse(input); }
export function safeParseSchoolDocument(input: unknown) {
  const result = schoolDocumentSchema.safeParse(input);
  if (!result.success) return { success: false as const, error: result.error };
  return { success: true as const, data: result.data };
}

export function schoolDocumentCompositeKey(doc: {
  docType: SchoolDocType; semester: 1 | 2; tahunAjaran: string; kodeMapel?: string; kodeKelas?: string; teacherId: string;
}): string {
  return [doc.docType, doc.semester, doc.tahunAjaran, doc.kodeMapel ?? "", doc.kodeKelas ?? "", doc.teacherId].join(":");
}
```

### FULL SOURCE CODE: `packages/domain/src/snapshot-sync.ts`

```typescript
/**
 * DocumentSnapshot & SyncQueue — entitas pendukung.
 * Sumber: docs/DATA_MODEL_DRAFT.md §11
 */

import { z } from "zod";
import { baseEntitySchema, documentStatusSchema } from "./base";

export const documentSnapshotSchema = baseEntitySchema.extend({
  entityType: z.enum(["prota", "promes", "semester_report", "journal"]),
  entityId: z.string().min(1),
  status: documentStatusSchema,
  snapshotData: z.string(),
  snapshotAt: z.string(),
  snapshotBy: z.string(),
  reason: z.string().optional(),
});

export type DocumentSnapshot = z.infer<typeof documentSnapshotSchema>;

export function parseDocumentSnapshot(input: unknown): DocumentSnapshot { return documentSnapshotSchema.parse(input); }

export const syncQueueItemSchema = z.object({
  id: z.string().min(1),
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  operation: z.enum(["create", "update", "delete"]),
  payload: z.string(),
  status: z.enum(["pending", "syncing", "synced", "error"]),
  attempts: z.number().int().nonnegative(),
  lastAttemptAt: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type SyncQueueItem = z.infer<typeof syncQueueItemSchema>;

export function parseSyncQueueItem(input: unknown): SyncQueueItem { return syncQueueItemSchema.parse(input); }
```

### FULL SOURCE CODE: `packages/domain/src/daily-duty.ts`

```typescript
/**
 * PIKET-HARIAN-MOBILE-01: Domain types untuk modul Piket Harian.
 * Modul terisolasi dari app utama. Tidak menulis ke attendanceRecords.
 */

import { z } from "zod";
import { baseEntitySchema } from "./base";

export const dutyRecordCategorySchema = z.enum(["attendance", "discipline", "health", "permission", "other"]);
export type DutyRecordCategory = z.infer<typeof dutyRecordCategorySchema>;

export const dutyRecordTypeSchema = z.enum([
  "late", "absent_without_notice", "early_leave", "sick_uks",
  "incomplete_uniform", "class_disruption", "skipping_class",
  "fight", "rude_behavior", "other",
]);
export type DutyRecordType = z.infer<typeof dutyRecordTypeSchema>;

export const dutyRuleSchema = baseEntitySchema.extend({
  category: dutyRecordCategorySchema,
  type: dutyRecordTypeSchema,
  label: z.string().min(1),
  points: z.number().int().nonnegative(),
  active: z.boolean().default(true),
});
export type DutyRule = z.infer<typeof dutyRuleSchema>;

export const dutyReportSchema = baseEntitySchema.extend({
  academicYearId: z.string().min(1),
  date: z.string().min(1),
  dutyTeacherId: z.string().min(1),
  dutyTeacherName: z.string().min(1),
  note: z.string().optional(),
  finalized: z.boolean().default(false),
  finalizedAt: z.string().nullable().optional(),
});
export type DutyReport = z.infer<typeof dutyReportSchema>;

export const dutyRecordSchema = baseEntitySchema.extend({
  dutyReportId: z.string().min(1),
  academicYearId: z.string().min(1),
  date: z.string().min(1),
  studentId: z.string().min(1),
  studentName: z.string().min(1),
  studentNumber: z.number().int().positive().optional(),
  classId: z.string().min(1),
  classLabel: z.string().min(1),
  category: dutyRecordCategorySchema,
  type: dutyRecordTypeSchema,
  ruleId: z.string().nullable().optional(),
  ruleLabel: z.string().min(1),
  source: z.enum(["manual", "attendance"]).default("manual"),
  attendanceLinkType: z.enum(["absent_auto"]).nullable().optional(),
  points: z.number().int().nonnegative(),
  note: z.string().optional(),
  followUp: z.string().optional(),
  recordedByTeacherId: z.string().min(1),
  recordedByTeacherName: z.string().min(1),
});
export type DutyRecord = z.infer<typeof dutyRecordSchema>;

export type DutySummary = { totalRecords: number; totalPoints: number; byCategory: Record<DutyRecordCategory, number> };

export function summarizeDutyRecords(records: DutyRecord[]): DutySummary {
  const byCategory: Record<DutyRecordCategory, number> = { attendance: 0, discipline: 0, health: 0, permission: 0, other: 0 };
  let totalPoints = 0;
  for (const r of records) { byCategory[r.category]++; totalPoints += r.points; }
  return { totalRecords: records.length, totalPoints, byCategory };
}

export function getStudentDutyStatus(totalPoints: number): string {
  if (totalPoints <= 24) return "Aman";
  if (totalPoints <= 49) return "Pembinaan ringan";
  if (totalPoints <= 74) return "Panggilan orang tua";
  if (totalPoints <= 99) return "Kesiswaan/BK";
  return "Tindak lanjut khusus";
}

export type DutyStatusVariant = "neutral" | "success" | "warning" | "error" | "errorStrong";

export function getDutyStatusVariant(totalPoints: number): DutyStatusVariant {
  if (totalPoints <= 24) return "success";
  if (totalPoints <= 49) return "warning";
  if (totalPoints <= 74) return "neutral";
  if (totalPoints <= 99) return "error";
  return "errorStrong";
}

export const DEFAULT_DUTY_RULES: Array<Omit<DutyRule, "id" | "createdAt" | "updatedAt" | "deletedAt" | "syncStatus">> = [
  { category: "attendance", type: "late", label: "Terlambat", points: 5, active: true },
  { category: "attendance", type: "absent_without_notice", label: "Alpa / tidak masuk tanpa keterangan", points: 10, active: true },
  { category: "permission", type: "early_leave", label: "Izin pulang", points: 0, active: true },
  { category: "health", type: "sick_uks", label: "Sakit / UKS", points: 0, active: true },
  { category: "discipline", type: "incomplete_uniform", label: "Atribut tidak lengkap", points: 10, active: true },
  { category: "discipline", type: "class_disruption", label: "Ribut / mengganggu pembelajaran", points: 10, active: true },
  { category: "discipline", type: "skipping_class", label: "Bolos / keluar kelas tanpa izin", points: 20, active: true },
  { category: "discipline", type: "fight", label: "Berkelahi", points: 25, active: true },
  { category: "discipline", type: "rude_behavior", label: "Berkata tidak sopan", points: 15, active: true },
  { category: "other", type: "other", label: "Lainnya", points: 0, active: true },
];

export interface ClassAttendanceSummary {
  classId: string; classLabel: string; present: number; sick: number; excused: number;
  absent: number; total: number; source: "attendance" | "empty";
}

export interface ClassAttendanceDetail {
  classId: string; classLabel: string; present: number; sick: number; excused: number;
  absent: number; total: number; source: "attendance" | "empty";
  sickStudents: string[]; excusedStudents: string[]; absentStudents: string[];
}

export function formatSIADetail(detail: ClassAttendanceDetail): string {
  const parts: string[] = [];
  for (const name of detail.sickStudents) parts.push(`${name} (Sakit)`);
  for (const name of detail.excusedStudents) parts.push(`${name} (Izin)`);
  for (const name of detail.absentStudents) parts.push(`${name} (Alpa)`);
  return parts.length > 0 ? parts.join(", ") : "—";
}

export function normalizeSearchText(value: string): string {
  return String(value ?? "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, " ").trim();
}

export function matchSmartSearch(query: string, target: string): boolean {
  const q = normalizeSearchText(query); const t = normalizeSearchText(target);
  if (!q) return true;
  return q.split(" ").every((part) => t.includes(part));
}

export const DUTY_RULE_SEARCH_KEYWORDS: Record<DutyRecordType, string[]> = {
  late: ["terlambat", "telat", "datang lambat", "lambat"],
  absent_without_notice: ["alpa", "absen", "tidak hadir", "tidak masuk", "tanpa keterangan"],
  early_leave: ["izin pulang", "pulang cepat", "keluar sekolah"],
  sick_uks: ["sakit", "uks", "kurang sehat"],
  incomplete_uniform: ["seragam", "atribut", "baju", "topi", "dasi", "sepatu"],
  class_disruption: ["ribut", "gaduh", "mengganggu", "berisik"],
  skipping_class: ["bolos", "keluar kelas", "kabur", "tidak ikut pelajaran"],
  fight: ["berkelahi", "kelahi", "berantem", "pukul"],
  rude_behavior: ["tidak sopan", "kasar", "melawan", "berkata kasar"],
  other: ["lainnya", "catatan khusus"],
};

export function makeRuleSearchTarget(rule: DutyRule): string {
  const keywords = DUTY_RULE_SEARCH_KEYWORDS[rule.type] ?? [];
  return [rule.label, rule.category, rule.type, String(rule.points), ...keywords].filter(Boolean).join(" ");
}

export function searchDutyRules(rules: DutyRule[], query: string): DutyRule[] {
  if (!query.trim()) return rules;
  return rules.filter((rule) => matchSmartSearch(query, makeRuleSearchTarget(rule)));
}

export interface StudentSearchable {
  id: string; name: string; number?: number; nis?: string; nisn?: string;
  classId: string; classLabel: string;
}

export function makeStudentSearchTarget(student: StudentSearchable): string {
  return [student.name, student.number != null ? String(student.number) : "", student.nis ?? "", student.nisn ?? "", student.classLabel].filter(Boolean).join(" ");
}

export function searchStudents<T extends StudentSearchable>(students: T[], query: string): T[] {
  if (!query.trim()) return students;
  return students.filter((s) => matchSmartSearch(query, makeStudentSearchTarget(s)));
}

export function validateDutyRecordInput(args: {
  selectedStudent: StudentSearchable | null | undefined;
  selectedRule: DutyRule | null | undefined;
  note: string;
}): { ok: true } | { ok: false; message: string } {
  if (!args.selectedStudent) return { ok: false, message: "Pilih siswa terlebih dahulu." };
  if (!args.selectedRule) return { ok: false, message: "Pilih pelanggaran terlebih dahulu." };
  if (args.selectedRule.type === "other" && !args.note.trim()) return { ok: false, message: "Catatan wajib untuk jenis Lainnya." };
  return { ok: true };
}

export interface StudentDutyLedgerItem {
  studentId: string; studentName: string; studentNumber?: number; classId: string; classLabel: string;
  totalRecords: number; totalPoints: number;
  attendanceCount: number; disciplineCount: number; healthCount: number; permissionCount: number; otherCount: number;
  lastRecordDate?: string; statusLabel: string;
}

export function buildStudentDutyLedger(records: DutyRecord[]): StudentDutyLedgerItem[] {
  const activeRecords = records.filter((r) => !r.deletedAt);
  const groups = new Map<string, StudentDutyLedgerItem>();
  for (const r of activeRecords) {
    const key = `${r.studentId}__${r.classId}`;
    let entry = groups.get(key);
    if (!entry) {
      entry = { studentId: r.studentId, studentName: r.studentName, studentNumber: r.studentNumber,
        classId: r.classId, classLabel: r.classLabel, totalRecords: 0, totalPoints: 0,
        attendanceCount: 0, disciplineCount: 0, healthCount: 0, permissionCount: 0, otherCount: 0,
        lastRecordDate: undefined, statusLabel: "" };
      groups.set(key, entry);
    }
    entry.totalRecords++; entry.totalPoints += r.points;
    switch (r.category) {
      case "attendance": entry.attendanceCount++; break; case "discipline": entry.disciplineCount++; break;
      case "health": entry.healthCount++; break; case "permission": entry.permissionCount++; break;
      case "other": entry.otherCount++; break;
    }
    if (!entry.lastRecordDate || r.date > entry.lastRecordDate) entry.lastRecordDate = r.date;
  }
  const items = Array.from(groups.values());
  for (const item of items) item.statusLabel = getStudentDutyStatus(item.totalPoints);
  items.sort((a, b) => b.totalPoints !== a.totalPoints ? b.totalPoints - a.totalPoints : a.studentName.localeCompare(b.studentName, "id"));
  return items;
}

export function filterDutyRecordsByStudent(records: DutyRecord[], studentId: string, classId?: string): DutyRecord[] {
  return records.filter((r) => !r.deletedAt && r.studentId === studentId)
    .filter((r) => (classId ? r.classId === classId : true))
    .sort((a, b) => b.date.localeCompare(a.date));
}
```

### FULL SOURCE CODE: `packages/domain/src/promes-types.ts`

```typescript
/**
 * Tipe data untuk engine Promes.
 * Sumber: docs/SPRINT_2_DESIGN.md §5.2
 */

import type { ProtaProfile } from "./prota";
import type { CalendarEvent } from "./calendar-event";
import type { AcademicYear } from "./academic-year";

export type KOMode = "daily_block" | "end_of_week" | "end_of_semester";

export type PromesCalendarKind = "pts" | "pas" | "remedial" | "p5" | "libur" | "other" | null;

export type PromesOptions = {
  intraJpPerWeek: number;
  koJpPerWeek: number;
  cadanganJP: number;
  reserveFromEnd: boolean;
  koMode?: KOMode;
};

export type PromesWeek = {
  weekNumber: number;
  startDate: string;
  endDate: string;
  isEffective: boolean;
  blockReason?: string;
  calendarKind?: PromesCalendarKind;
  intraCapacityJP: number;
  reservedForCadangan: number;
  availableForMaterial: number;
  koJP: number;
  assignedUnits: Array<{ unitId: string; title: string; learningOutcome?: string; jp: number }>;
};

export type KORow = {
  weekNumber: number; date: string; jp: number; mode: KOMode; label: string;
};

export type UnitDistribution = {
  unitId: string; title: string; learningOutcome?: string; code?: string;
  totalJP: number; distributedJP: number; undistributedJP: number;
  weeks: number[]; status: "fully_distributed" | "partially_distributed" | "not_distributed";
};

export type PromesSummary = {
  totalWeeks: number; effectiveWeeks: number;
  intraCapacityJP: number; cadanganJP: number; materialCapacityJP: number;
  totalUnitJP: number; distributedJP: number; undistributedJP: number;
  koTotalJP: number; allocationStatus: "tepat" | "cukup" | "kurang";
};

export type PromesResult = {
  weeks: PromesWeek[]; distribution: UnitDistribution[]; koRows: KORow[];
  summary: PromesSummary; status: "valid" | "needs_fix"; warnings: string[]; errors: string[];
};

export type GeneratePromesInput = {
  prota: ProtaProfile; academicYear: AcademicYear; calendar: CalendarEvent[];
  semester: 1 | 2; options: PromesOptions;
};
```

### Relasi Antar Entitas (Diagram Alur)

```
AcademicYear
  ├── CalendarEvent[]
  ├── ProtaProfile → ProtaUnit[]
  ├── TeachingSchedule[]
  ├── TeachingAssignment[] (5-tuple key)
  ├── ClassRoster → StudentEntry[]
  └── SemesterReport

TeachingAssignment (5-tuple: academicYearId, semester, teacherId, subject, classId)
  ├── LessonSession[] (generated from schedule + calendar)
  ├── AttendanceRecord[] (per session, per student)
  ├── TeachingJournal[] (per session)
  ├── GradeBook → GradeEntry[] (per student)
  ├── ATPEntry[]
  ├── LKPD[]
  ├── RppDocument[]
  ├── RemedialProgram → RemedialStudent[]
  ├── EnrichmentProgram → EnrichmentStudent[]
  └── SchoolDocument[] (WYSIWYG generic docs)

DutyReport (per hari, per guru piket)
  └── DutyRecord[] (per siswa, per pelanggaran)
      └── StudentDutyLedgerItem (aggregated view)
```

### Dexie Database (22 tables, 12 versions)

| Version | Perubahan |
|---|---|
| v1 | 13 tabel inti |
| v2 | +gradeBooks |
| v3 | +teachingAssignments |
| v4 | +atpEntries, +lkpds |
| v5 | semesterReports compound index |
| v6 | +rppDocuments, +remedialPrograms, +enrichmentPrograms |
| v7 | gradeBooks: KD1-KD6 + PTS + PAS |
| v8 | +dailyDutyRules, +dailyDutyReports, +dailyDutyRecords |
| v9 | +schoolDocuments |
| v10 | gradeBooks: V3 UH/UTS/UAS model |
| v11 | gradeBooks: migration backfill V3 defaults |
| v12 | gradeBooks: V4 KD/UH to 10 columns, kdCount, kdDetails |

---

## 3. Modul yang Sudah Selesai

### 3.1 Modul 1-harian (Harian / KBM)

| Sub-modul | Status | File Utama | Fitur Jalan | Belum |
|---|---|---|---|---|
| **Attendance** (QuickAttendance) | ✅ Selesai | `QuickAttendancePage.tsx`, `useQuickAttendanceState.ts`, `AttendanceEditor.tsx`, `AttendanceUnfilledList.tsx`, `quick-attendance-types.ts`, `siakad-attendance-adoption.ts` | WYSIWYG doc flow, auto-save, dirty guard, sidebar + preview, SIAKAD adapter | — |
| **Grades** (GradeBook) | ✅ Selesai | `GradesPage.tsx`, `GradesSidebar.tsx`, `GradeDocument.tsx`, `useGradesInit.ts`, `useGradesData.ts`, `useGradesDoc.ts`, `useCbtImport.ts`, `usePasteImport.ts`, `grades-types.ts`, `grades-utils.ts` | V3 grade model (UH/UTS/UAS + KD/PTS/PAS), CBT import, Excel paste import, WYSIWYG doc | — |
| **Journal** (QuickJournal) | ✅ Selesai | `QuickJournalPage.tsx`, `JournalUnfilledList.tsx`, `QuickJournalEditor.tsx`, `JournalSidebar.tsx`, `useJournalDocument.ts`, `quickJournalTypes.ts` | Meeting-first, draft/finalize, structured narrative, WYSIWYG doc | — |
| **KBM Kilat** | ✅ Selesai | `KbmKilatPage.tsx`, `useKbmSession.ts` | Accordion flow (Smart Selector → Presensi → Jurnal → Nilai → Save), structured notes | — |
| **Rekap Semester** | ✅ Selesai | `RekapSemesterPage.tsx`, `useRekapSemesterState.ts`, `hooks/useSemesterAggregator.ts`, `AbsensiBulananMatrix.tsx`, `TatapMukaMatrix.tsx`, `NilaiMatrix.tsx`, `JurnalMatrix.tsx` | 4 format matriks, DOCX/XLSX export, pre-print controls | — |

### 3.2 Modul 2-piket (Piket Harian)

| Sub-modul | Status | File Utama | Fitur Jalan | Belum |
|---|---|---|---|---|
| **Daily Duty** | ✅ Selesai | `DailyDutyPage.tsx`, `useDailyDutyState.ts`, `CatatPelanggaranView.tsx`, `BukuKedisiplinanBKTab.tsx`, `DutyNotesTab.tsx`, `AttendanceRecapCard.tsx`, `LedgerDetailSheet.tsx`, `LetterPreview.tsx`, `PrintDutyReport.tsx`, `ThresholdWarningModal.tsx`, `Chip.tsx`, `piket-letter.ts`, `types.ts`, `utils.ts`, `hooks/*.ts`, `__tests__/piket-letter.test.ts` | Gradient header (indigo/blue), tab-based layout, violation recording, BK discipline book, letter generation, threshold warnings, print reports, BottomSheet detail, smart search | — |

### 3.3 Modul 3-administrasi (Administrasi)

| Sub-modul | Status | File Utama | Fitur Jalan | Belum |
|---|---|---|---|---|
| **LKPD** | ✅ Selesai | `LKPDPage.tsx`, `useLKPDState.ts`, `LKPDForm.tsx`, `LKPDPreview.tsx`, `LKPDItemCard.tsx`, `types.ts`, `utils.ts` | Full CRUD, draft/finalize, WYSIWYG doc | — |
| **RPP** | ✅ Selesai | `RPPPage.tsx` | Template generator, copy-paste workflow | — |
| **RPP Bulk Replace** | ✅ Selesai | `RppBulkReplacePage.tsx`, `useRppBulkState.ts`, `IdentityFormCard.tsx`, `LiteralReplacementCard.tsx`, `DocumentInputCard.tsx`, `ArchiveListCard.tsx`, `PreviewCard.tsx`, `PlaceholderReferenceCard.tsx`, `rpp-bulk-utils.ts` | Placeholder + literal replacement, DOCX upload/process, 13 placeholder types | — |
| **Remedial** | ✅ Selesai | `RemedialPage.tsx`, `useRemedialState.ts`, `RemedialSidebar.tsx`, `RemedialDocument.tsx`, `constants.ts` | Auto-filter from GradeBook, WYSIWYG doc | — |
| **Pengayaan** | ✅ Selesai | `EnrichmentPage.tsx`, `useEnrichmentState.ts`, `EnrichmentSidebar.tsx`, `PengayaanDocument.tsx`, `constants.ts` | Auto-filter from GradeBook, WYSIWYG doc | — |
| **Semester Report** | ✅ Selesai | `SemesterReportPage.tsx`, `useSemesterReportState.ts`, `SemesterReportSidebar.tsx`, `SemesterReportDocument.tsx` | WYSIWYG doc, completeness check | — |
| **Evaluation Docs** | ✅ Selesai | `EvaluationDocsPage.tsx`, `useEvaluationDocsState.ts`, `evaluation-docs-types.ts`, `AssignmentSelector.tsx`, `TabSelector.tsx`, `EffectiveWeeksTab.tsx`, `KktpAnalysisTab.tsx`, `KisiKisiTab.tsx`, `KartuSoalTab.tsx`, `AssessmentGridTab.tsx` | 5 evaluation modules, AI prompt bridge | — |
| **Lainnya** | ✅ Selesai | `LainnyaPage.tsx`, `useLainnyaState.ts`, `LainnyaSidebar.tsx`, `LainnyaDocument.tsx` | Generic WYSIWYG doc, 11/11 SchoolDocType coverage | — |
| **Admin Package** | ✅ Selesai | `AdminPackagePage.tsx`, `useAdminPackageState.ts`, `admin-package-types.ts`, `LengkapiTab.tsx`, `PreviewTab.tsx`, `ModulTab.tsx`, `DefaultChecklist.tsx`, `generateChecklistHTML.ts` | 14-document checklist, status tracking | — |
| **Prota** | ✅ Selesai | `ProtaPage.tsx`, `useProtaDocState.ts`, `ProtaDocument.tsx`, `ProtaSidebar.tsx`, `Header.tsx`, `NewProfileForm.tsx`, `ImportModal.tsx`, `prota-helpers.ts` | WYSIWYG doc, profile CRUD, import | — |
| **Promes** | ✅ Selesai | `PromesPage.tsx`, `usePromesState.ts`, `PromesSidebar.tsx`, `PromesFormView.tsx`, `PromesPortraitDocument.tsx`, `PromesMerdekaDocument.tsx`, `PromesLandscapeMatrixDocument.tsx`, `promes-helpers.tsx`, `__tests__/*.test.tsx` | 3 format dokumen, DOCX export, engine pure function | — |
| **ATP** | ✅ Selesai | `ATPPage.tsx`, `useATPPageState.ts`, `ATPForm.tsx`, `ATPDocument.tsx`, `ATPSidebar.tsx`, `AIPromptOverlay.tsx`, `ATPImportOverlay.tsx`, `atpUtils.ts` | WYSIWYG doc, AI prompt, import | — |
| **Calendar** | ✅ Selesai | `CalendarPage.tsx`, `KalenderMEDocument.tsx`, `CalendarSidebar.tsx`, `EventForm.tsx`, `Header.tsx`, `ImportModal.tsx`, `calendarHelpers.ts` | WYSIWYG doc, event CRUD, import | — |
| **Schedule** | ✅ Selesai | `SchedulePage.tsx`, `useScheduleState.ts`, `ScheduleForm.tsx`, `LinkerSection.tsx`, `Header.tsx`, `ImportModal.tsx` | Schedule CRUD, import, generate sessions | — |

### 3.4 Modul 4-integrasi (Integrasi)

| Sub-modul | Status | File Utama | Fitur Jalan | Belum |
|---|---|---|---|---|
| **Apps Script Import** | ✅ Selesai | `AppsScriptImportPage.tsx`, `useAppsScriptImportState.ts`, `ImportInputCard.tsx`, `ValidationErrorsCard.tsx`, `PreviewCard.tsx`, `PreviewStat.tsx`, `SummaryResultCard.tsx`, `SummaryCard.tsx` | One-way bridge, validate → preview → import | — |
| **Auto Document** | ✅ Selesai | `AutoDocumentPage.tsx`, `useAutoDocumentState.ts`, `AssignmentSelectorCard.tsx`, `DocumentPreviewCard.tsx`, `DocumentViewCard.tsx`, `PrintControlsCard.tsx`, `SummaryStatsCard.tsx` | 12-document package assembly | — |
| **Completeness** | ✅ Selesai | `CompletenessPage.tsx` | Module completeness checker | — |
| **Report Center** | ✅ Selesai | `ReportCenterPage.tsx`, `report-center-types.ts`, `report-center-utils.ts`, `PiketReportTab.tsx`, `AttendanceMatrixTab.tsx`, `GradeReportTab.tsx`, `JournalReportTab.tsx` | 4 tab report | — |

### 3.5 Modul 5-data-dasar (Master Data)

| Sub-modul | Status | File Utama | Fitur Jalan | Belum |
|---|---|---|---|---|
| **Assignments** | ✅ Selesai | `AssignmentsPage.tsx` | 5-tuple assignment CRUD | — |
| **Backup** | ✅ Selesai | `BackupPage.tsx` | Full backup/restore, validation | — |
| **New Year** | ✅ Selesai | `NewYearWizard.tsx` | 3-step wizard, copy dari tahun lalu | — |
| **Profile** | ✅ Selesai | `ProfilePage.tsx`, `SchoolProfileForm.tsx`, `TeacherProfileForm.tsx`, `AcademicYearManager.tsx`, `TabButton.tsx`, `profile-types.ts` | 3-tab profile management | — |
| **Roster** | ✅ Selesai | `RosterPage.tsx`, `useRosterState.ts`, `RosterHeader.tsx`, `NewRosterForm.tsx`, `RosterDetail.tsx`, `ImportModal.tsx`, `types.ts` | Excel/CSV paste import, duplicate check | — |

### 3.6 KBM Hub (Halaman Terpadu)

| Sub-modul | Status | File Utama | Fitur Jalan | Belum |
|---|---|---|---|---|
| **KBM Hub** | ✅ Selesai | `KbmHubPage.tsx`, `useKbmHub.ts`, `types.ts`, `constants.ts`, `hooks/*.ts`, `components/*.tsx` | Unified dashboard + editor, responsive, auto-opens Jurnal after Presensi | — |

### 3.7 Auth

| Sub-modul | Status | File Utama | Fitur Jalan | Belum |
|---|---|---|---|---|
| **Auth Gate** | ✅ Selesai | `AuthGate.tsx` | Supabase auth, local fallback | — |

---

## 4. Komponen Dokumen / Print Engine

### Arsitektur 3-Layer

```
Layer 1: Data (types.ts + helpers.ts) — Pure TypeScript, zero React
Layer 2: Template (report-templates/*.tsx) — React components, DocumentLayout primitives
Layer 3: Export (exporters/*.ts) — DOCX (docx library) + XLSX (ExcelJS)
Layer 4: Presentation (DocumentPreview.tsx + CSS) — WYSIWYG A4 canvas + toolbar
```

### FULL SOURCE CODE: `packages/domain/src/promes-engine.ts`

```typescript
/**
 * Engine generate Promes — PURE FUNCTION.
 * Sumber: docs/SPRINT_2_DESIGN.md §5
 *
 * Aturan KRITIS (lihat §0 CRITICAL PROMES RULE):
 *   1. Material capacity = (effectiveWeeks × intraJpPerWeek) - cadanganJP
 *      BUKAN pakai total 3 JP/minggu.
 *   2. KO tampil sebagai row terpisah, koTotalJP TIDAK mengurangi materialCapacityJP.
 *   3. Cadangan di-reserve dari INTRA capacity (bukan total).
 *   4. Cadangan TIDAK BOLEH membuat materialCapacityJP negatif → ERROR.
 *   5. Materi didistribusikan berurutan ke minggu yang availableForMaterial.
 *   6. Bila materi tidak muat → status="needs_fix" + tampilkan JP belum terdistribusi.
 */

import type {
  GeneratePromesInput, PromesOptions, PromesResult, PromesWeek,
  KORow, UnitDistribution, PromesSummary, KOMode, PromesCalendarKind,
} from "./promes-types";
import type { ProtaUnit } from "./prota";
import type { CalendarEvent } from "./calendar-event";
import { parseISODate, toISODate, getDayOfWeek, dateRangesOverlap } from "@guru-admin/shared";

export function detectPromesCalendarKind(event: CalendarEvent): PromesCalendarKind {
  if (event.type === "learning") return null;
  const text = (event.label ?? "").toLowerCase();
  if (/pts|uts|sts|tengah\s*semester|sumatif\s*tengah/.test(text)) return "pts";
  if (/remedial/.test(text)) return "remedial";
  if (/pas|psas|sas|akhir\s*semester|sumatif\s*akhir/.test(text)) return "pas";
  if (/p5|projek|project/.test(text)) return "p5";
  if (/libur|cuti/.test(text)) return "libur";
  if (event.type === "assessment") return "other";
  if (event.type === "remedial") return "remedial";
  if (event.type === "holiday") return "libur";
  if (event.type === "school_activity") return "other";
  return "other";
}

export function promesCalendarKindLabel(kind: PromesCalendarKind): string {
  switch (kind) {
    case "pts": return "PTS"; case "pas": return "PAS"; case "remedial": return "Remedial";
    case "p5": return "P5"; case "libur": return "Libur"; case "other": return ""; case null: return "";
  }
}

export function generatePromes(input: GeneratePromesInput): PromesResult {
  const { prota, calendar, semester, options } = input;
  const warnings: string[] = [];
  const errors: string[] = [];

  if (options.intraJpPerWeek <= 0) errors.push(`intraJpPerWeek harus > 0. Diterima: ${options.intraJpPerWeek}.`);
  if (options.cadanganJP < 0) errors.push(`cadanganJP tidak boleh negatif. Diterima: ${options.cadanganJP}.`);
  if (options.koJpPerWeek < 0) errors.push(`koJpPerWeek tidak boleh negatif. Diterima: ${options.koJpPerWeek}.`);
  if (errors.length > 0) return emptyResult(warnings, errors);

  if (prota.status === "final" || prota.status === "locked") {
    errors.push(`Prota berstatus "${prota.status}". Ubah ke draft dulu sebelum generate Promes.`);
    return emptyResult(warnings, errors);
  }

  const academicYear = input.academicYear;
  const semesterStart = semester === 1 ? academicYear.semester1Start : academicYear.semester2Start;
  const semesterEnd = semester === 1 ? academicYear.semester1End : academicYear.semester2End;

  const semesterCalendar = calendar.filter((e) => dateRangesOverlap(e.startDate, e.endDate, semesterStart, semesterEnd));
  if (semesterCalendar.length === 0) {
    errors.push(`Kalender kosong untuk semester ${semester}. Impor kalender dulu.`);
    return emptyResult(warnings, errors);
  }

  const weeks = enumerateWeeks(semesterStart, semesterEnd);
  if (weeks.length === 0) {
    errors.push(`Tidak ada minggu dalam rentang semester ${semester}.`);
    return emptyResult(warnings, errors);
  }

  for (const week of weeks) {
    const learningEvent = semesterCalendar.find(
      (e) => e.type === "learning" && dateRangesOverlap(week.startDate, week.endDate, e.startDate, e.endDate)
    );
    const blockingEvent = semesterCalendar.find(
      (e) => e.blocksLearning && dateRangesOverlap(week.startDate, week.endDate, e.startDate, e.endDate)
    );
    const calendarEvent = semesterCalendar.find(
      (e) => { if (e.type === "learning") return false; return dateRangesOverlap(week.startDate, week.endDate, e.startDate, e.endDate); }
    );
    const kind = calendarEvent ? detectPromesCalendarKind(calendarEvent) : null;
    week.calendarKind = kind;
    const isCalendarBlocked = kind === "pts" || kind === "pas" || kind === "remedial" || kind === "p5" || kind === "libur";
    week.isEffective = !!learningEvent && !blockingEvent && !isCalendarBlocked;
    if (isCalendarBlocked && kind) week.blockReason = calendarEvent?.label ?? promesCalendarKindLabel(kind);
    else week.blockReason = blockingEvent?.label;
  }

  for (const week of weeks) {
    if (week.isEffective) { week.intraCapacityJP = options.intraJpPerWeek; week.koJP = options.koJpPerWeek; }
    else { week.intraCapacityJP = 0; week.koJP = 0; }
    week.reservedForCadangan = 0; week.availableForMaterial = week.intraCapacityJP;
  }

  const totalIntraCapacity = weeks.filter((w) => w.isEffective).reduce((sum, w) => sum + w.intraCapacityJP, 0);
  if (options.cadanganJP > totalIntraCapacity) {
    errors.push(`Cadangan ${options.cadanganJP} JP melebihi total kapasitas intra ${totalIntraCapacity} JP.`);
    const koRows = generateKORows(weeks, options);
    const distribution = computeDistribution(prota.units, semester, weeks);
    const summary = computeSummary(weeks, options, distribution, totalIntraCapacity, 0);
    return { weeks, distribution, koRows, summary, status: "needs_fix", warnings, errors };
  }

  const effectiveWeeksForReserve = weeks.filter((w) => w.isEffective);
  const reserveOrder = options.reserveFromEnd ? [...effectiveWeeksForReserve].reverse() : effectiveWeeksForReserve;
  let cadanganRemaining = options.cadanganJP;
  for (const week of reserveOrder) {
    if (cadanganRemaining <= 0) break;
    const take = Math.min(week.intraCapacityJP, cadanganRemaining);
    week.reservedForCadangan = take; cadanganRemaining -= take;
  }

  for (const week of weeks) week.availableForMaterial = week.intraCapacityJP - week.reservedForCadangan;

  const semesterUnits = prota.units.filter((u) => u.semester === semester).sort((a, b) => a.order - b.order);
  if (semesterUnits.length === 0) {
    errors.push(`Tidak ada materi (ProtaUnit) untuk semester ${semester}.`);
    const koRows = generateKORows(weeks, options);
    const distribution: UnitDistribution[] = [];
    const summary = computeSummary(weeks, options, distribution, totalIntraCapacity, 0);
    return { weeks, distribution, koRows, summary, status: "needs_fix", warnings, errors };
  }

  const unitQueue = semesterUnits.map((u) => ({ unit: u, remainingJP: u.jp }));
  for (const week of weeks) {
    if (!week.isEffective) continue;
    let weekAvailable = week.availableForMaterial;
    while (weekAvailable > 0 && unitQueue.length > 0) {
      const current = unitQueue[0];
      const assign = Math.min(current.remainingJP, weekAvailable);
      week.assignedUnits.push({ unitId: current.unit.id, title: current.unit.title, learningOutcome: current.unit.learningOutcome, jp: assign });
      current.remainingJP -= assign; weekAvailable -= assign;
      if (current.remainingJP === 0) unitQueue.shift();
    }
  }

  const koRows = generateKORows(weeks, options);
  const distribution = computeDistribution(semesterUnits, semester, weeks);
  const totalUnitJP = semesterUnits.reduce((sum, u) => sum + u.jp, 0);
  const summary = computeSummary(weeks, options, distribution, totalIntraCapacity, totalUnitJP);

  const undistributedUnits = distribution.filter((d) => d.status !== "fully_distributed");
  if (undistributedUnits.length > 0) {
    for (const d of undistributedUnits) {
      warnings.push(`Unit "${d.title}" ${d.status === "not_distributed" ? "TIDAK terdistribusi" : "terdistribusi sebagian"}: ${d.distributedJP}/${d.totalJP} JP (sisa ${d.undistributedJP} JP belum muat).`);
    }
  }

  const status: PromesResult["status"] = summary.undistributedJP === 0 ? "valid" : "needs_fix";
  return { weeks, distribution, koRows, summary, status, warnings, errors };
}

function emptyResult(warnings: string[], errors: string[]): PromesResult {
  return {
    weeks: [], distribution: [], koRows: [],
    summary: { totalWeeks: 0, effectiveWeeks: 0, intraCapacityJP: 0, cadanganJP: 0, materialCapacityJP: 0, totalUnitJP: 0, distributedJP: 0, undistributedJP: 0, koTotalJP: 0, allocationStatus: "kurang" },
    status: "needs_fix", warnings, errors,
  };
}

function enumerateWeeks(semesterStartISO: string, semesterEndISO: string): PromesWeek[] {
  const weeks: PromesWeek[] = [];
  const semesterStart = parseISODate(semesterStartISO);
  const semesterEnd = parseISODate(semesterEndISO);
  if (semesterStart > semesterEnd) return weeks;
  const cursor = new Date(semesterStart);
  const startDow = getDayOfWeek(toISODate(cursor));
  if (startDow > 1) cursor.setDate(cursor.getDate() + (7 - startDow + 1));
  let weekNumber = 1;
  while (cursor <= semesterEnd) {
    const weekStart = new Date(cursor); const weekEnd = new Date(cursor);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weeks.push({
      weekNumber: weekNumber++, startDate: toISODate(weekStart), endDate: toISODate(weekEnd),
      isEffective: false, calendarKind: null, intraCapacityJP: 0, reservedForCadangan: 0,
      availableForMaterial: 0, koJP: 0, assignedUnits: [],
    });
    cursor.setDate(cursor.getDate() + 7);
  }
  return weeks;
}

function generateKORows(weeks: PromesWeek[], options: PromesOptions): KORow[] {
  const mode: KOMode = options.koMode ?? "daily_block";
  const koRows: KORow[] = [];
  for (const week of weeks) {
    if (week.isEffective && week.koJP > 0) {
      koRows.push({ weekNumber: week.weekNumber, date: week.startDate, jp: week.koJP, mode, label: `Alokasi kokurikuler: ${week.koJP} JP/minggu (${mode})` });
    }
  }
  return koRows;
}

function computeDistribution(semesterUnits: ProtaUnit[], _semester: 1 | 2, weeks: PromesWeek[]): UnitDistribution[] {
  return semesterUnits.map((unit) => {
    const assignedWeeks = weeks.filter((w) => w.assignedUnits.some((a) => a.unitId === unit.id));
    const distributedJP = assignedWeeks.reduce((sum, w) => sum + (w.assignedUnits.find((a) => a.unitId === unit.id)?.jp ?? 0), 0);
    const undistributedJP = unit.jp - distributedJP;
    let status: UnitDistribution["status"];
    if (distributedJP === 0) status = "not_distributed";
    else if (undistributedJP === 0) status = "fully_distributed";
    else status = "partially_distributed";
    return { unitId: unit.id, title: unit.title, learningOutcome: unit.learningOutcome, code: unit.code, totalJP: unit.jp, distributedJP, undistributedJP, weeks: assignedWeeks.map((w) => w.weekNumber), status };
  });
}

function computeSummary(weeks: PromesWeek[], options: PromesOptions, distribution: UnitDistribution[], totalIntraCapacity: number, totalUnitJP: number): PromesSummary {
  const effectiveWeeks = weeks.filter((w) => w.isEffective).length;
  const cadanganJP = options.cadanganJP;
  const materialCapacityJP = Math.max(0, totalIntraCapacity - cadanganJP);
  const distributedJP = distribution.reduce((sum, d) => sum + d.distributedJP, 0);
  const undistributedJP = totalUnitJP - distributedJP;
  const koTotalJP = weeks.filter((w) => w.isEffective).reduce((sum, w) => sum + w.koJP, 0);
  let allocationStatus: PromesSummary["allocationStatus"];
  if (materialCapacityJP === totalUnitJP) allocationStatus = "tepat";
  else if (materialCapacityJP > totalUnitJP) allocationStatus = "cukup";
  else allocationStatus = "kurang";
  return { totalWeeks: weeks.length, effectiveWeeks, intraCapacityJP: totalIntraCapacity, cadanganJP, materialCapacityJP, totalUnitJP, distributedJP, undistributedJP, koTotalJP, allocationStatus };
}
```

### FULL SOURCE CODE: `apps/teacher-admin/src/modules/3-administrasi/_perencanaan/promes/PromesLandscapeMatrixDocument.tsx`

```typescript
/**
 * PromesLandscapeMatrixDocument — landscape matrix format
 *
 * REWRITE: Major simplification using shared helpers:
 *   - buildWeekLookup() instead of building Maps inline
 *   - buildMateriRows() instead of inline materi row construction
 *   - resolveLandscapeWeekCell() instead of 5+ different inline logic blocks
 *   - Clean JSX with consistent styling and premium print output
 */

import {
  DocumentPage, DocumentTitle, DocumentIdentityTable, DocumentSignature,
} from "@shared/documents";
import type { PromesWeek, UnitDistribution, KORow, PromesSummary, ProtaProfile } from "@guru-admin/domain";
import { buildPromesMonthGroups, buildWeekLookup, buildMateriRows, resolveLandscapeWeekCell, promesEventClassName, PROMES_LEGEND_ITEMS } from "./promes-helpers";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";

export interface PromesLandscapeMatrixDocumentProps {
  weeks: PromesWeek[];
  distribution: UnitDistribution[];
  koRows: KORow[];
  summary: PromesSummary;
  status: "valid" | "needs_fix";
  semester: 1 | 2;
  activeYearLabel: string;
  schoolName: string;
  schoolRegency: string;
  headmasterName: string;
  headmasterNip: string;
  teacherName: string;
  teacherNip: string;
  profile: ProtaProfile | null;
}

export function PromesLandscapeMatrixDocument({
  weeks, distribution, summary, status, semester, activeYearLabel,
  schoolName, schoolRegency, headmasterName, headmasterNip, teacherName, teacherNip, profile,
}: PromesLandscapeMatrixDocumentProps) {
  const monthGroups = buildPromesMonthGroups(weeks, semester);
  const weekColumns = monthGroups.flatMap((m) => m.weeks);
  const lookup = buildWeekLookup(weeks);
  const materiRows = buildMateriRows(distribution);

  const intraPerWeek = summary.effectiveWeeks > 0 ? Math.round(summary.intraCapacityJP / summary.effectiveWeeks) : 0;
  const kokuPerWeek = summary.koTotalJP > 0 ? Math.round(summary.koTotalJP / summary.effectiveWeeks) : 0;
  const totalPerWeek = summary.effectiveWeeks > 0 ? Math.round((summary.intraCapacityJP + summary.koTotalJP) / summary.effectiveWeeks) : 0;

  const identityRows = [
    { label: "Satuan Pendidikan", value: schoolName || "-" },
    { label: "Mata Pelajaran", value: profile?.subject ?? "-" },
    { label: "Kelas / Fase", value: `${profile?.grade ?? "-"} / ${profile?.phase ?? "-"}` },
    { label: "Semester", value: semester === 1 ? "Ganjil (1)" : "Genap (2)" },
    { label: "Tahun Pelajaran", value: activeYearLabel || "-" },
    { label: "Beban Belajar / Minggu", value: `${totalPerWeek} JP (Intra ${intraPerWeek} + Koku ${kokuPerWeek})` },
  ];

  const fixedColWidthPercent = 30;
  const weekColWidthPercent = (100 - fixedColWidthPercent) / weekColumns.length;

  return (
    <DocumentPage orientation="landscape" className="promes-landscape-page promes-one-page">
      <DocumentTitle title={`PROGRAM SEMESTER (PROMES)`} subtitle={`TAHUN AJARAN ${activeYearLabel || "..........."}`} />
      <DocumentIdentityTable rows={identityRows} columns={2} />

      <table className="promes-matrix-table promes-vertical-event-table" style={{ fontFamily: "Arial, Helvetica, sans-serif", width: "100%", tableLayout: "fixed", borderCollapse: "collapse", boxSizing: "border-box" }}>
        <colgroup>
          <col style={{ width: '2.5%' }} /> <col style={{ width: '8%' }} /> <col style={{ width: '12%' }} />
          <col style={{ width: '2.5%' }} /> <col style={{ width: '2.5%' }} /> <col style={{ width: '2.5%' }} />
          {weekColumns.map((week) => (<col key={`col-${week.weekNumber}`} style={{ width: `${weekColWidthPercent.toFixed(2)}%` }} />))}
        </colgroup>
        <thead>
          <tr>
            <th rowSpan={2} className="col-no-merdeka">No</th>
            <th rowSpan={2} className="col-elemen-merdeka">Elemen / TP</th>
            <th rowSpan={2} className="col-materi-merdeka">ATP / Materi Pokok</th>
            <th colSpan={3} className="col-jp-group-merdeka">Alokasi Waktu (JP)</th>
            {monthGroups.map((group) => (<th key={group.month} colSpan={group.weeks.length} className="month-head">{group.label}</th>))}
          </tr>
          <tr>
            <th className="col-intra-jp-merdeka">Intra</th>
            <th className="col-koku-jp-merdeka">Koku</th>
            <th className="col-total-jp-merdeka">Total</th>
            {weekColumns.map((week) => (<th key={`week-head-${week.weekNumber}`} className="week-head">{week.label}</th>))}
          </tr>
        </thead>
        <tbody>
          {materiRows.map((row, rowIndex) => (
            <tr key={row.key} className="promes-learning-row">
              <td className="text-center no-cell">{row.rowNum}</td>
              <td className="elemen-cell">{row.elemen}</td>
              <td className="materi-cell">{row.materi}</td>
              <td className="text-center jp-cell">{row.intraJP > 0 ? `${row.intraJP}` : "-"}</td>
              <td className="text-center jp-cell koku-jp-cell">-</td>
              <td className="text-center jp-cell total-jp-cell"><strong>{row.totalJP}</strong></td>
              {weekColumns.map((week) => {
                const cell = resolveLandscapeWeekCell(lookup, week.weekNumber, "materi", row.unitId, rowIndex);
                return (<td key={`${row.key}-${week.weekNumber}`} className={cell.className} title={cell.title}>{cell.content}</td>);
              })}
            </tr>
          ))}
          <tr className="total-row promes-summary-row">
            <td colSpan={3}><strong>Jumlah Jam Efektif</strong></td>
            <td className="text-center jp-cell"><strong>{summary.intraCapacityJP}</strong></td>
            <td className="text-center jp-cell koku-jp-cell"><strong>{summary.koTotalJP}</strong></td>
            <td className="text-center jp-cell total-jp-cell"><strong>{summary.intraCapacityJP + summary.koTotalJP}</strong></td>
            {weekColumns.map((week) => { const cell = resolveLandscapeWeekCell(lookup, week.weekNumber, "effective"); return <td key={`eff-${week.weekNumber}`} className={cell.className}>{cell.content}</td>; })}
          </tr>
          <tr className="cadangan-row promes-summary-row">
            <td colSpan={3}>Jumlah Jam Cadangan</td>
            <td className="text-center jp-cell">{summary.cadanganJP > 0 ? `${summary.cadanganJP}` : "-"}</td>
            <td className="text-center jp-cell koku-jp-cell">-</td>
            <td className="text-center jp-cell total-jp-cell">{summary.cadanganJP > 0 ? `${summary.cadanganJP}` : "-"}</td>
            {weekColumns.map((week) => { const cell = resolveLandscapeWeekCell(lookup, week.weekNumber, "cadangan"); return <td key={`cad-${week.weekNumber}`} className={cell.className}>{cell.content}</td>; })}
          </tr>
          {summary.koTotalJP > 0 && (
            <tr className="promes-summary-row promes-koku-row">
              <td colSpan={3}><strong>Kokurikuler</strong></td>
              <td className="text-center jp-cell">-</td>
              <td className="text-center jp-cell koku-jp-cell"><strong>{summary.koTotalJP}</strong></td>
              <td className="text-center jp-cell total-jp-cell"><strong>{summary.koTotalJP}</strong></td>
              {weekColumns.map((week) => { const cell = resolveLandscapeWeekCell(lookup, week.weekNumber, "kokurikuler"); return <td key={`ko-${week.weekNumber}`} className={cell.className}>{cell.content}</td>; })}
            </tr>
          )}
          <tr className="total-row promes-summary-row">
            <td colSpan={3}><strong>Jumlah Jam Total Semester {semester === 1 ? "Ganjil" : "Genap"}</strong></td>
            <td className="text-center jp-cell"><strong>{summary.intraCapacityJP + summary.cadanganJP}</strong></td>
            <td className="text-center jp-cell koku-jp-cell"><strong>{summary.koTotalJP}</strong></td>
            <td className="text-center jp-cell total-jp-cell"><strong>{summary.intraCapacityJP + summary.cadanganJP + summary.koTotalJP}</strong></td>
            {weekColumns.map((week) => { const cell = resolveLandscapeWeekCell(lookup, week.weekNumber, "total"); return <td key={`tot-${week.weekNumber}`} className={cell.className}>{cell.content}</td>; })}
          </tr>
        </tbody>
      </table>

      <div className="promes-legend-block">
        <strong>Keterangan:</strong>
        <div className="promes-legend-grid">
          {PROMES_LEGEND_ITEMS.map((item) => (
            <div key={item.kind} className="promes-legend-item">
              <span className={`promes-legend-swatch ${promesEventClassName(item.kind)}`}></span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {status !== "valid" && (
        <p className="promes-warning">Promes belum lengkap: {summary.undistributedJP} JP materi belum terdistribusi.</p>
      )}

      <DocumentSignature
        left={{ role: "Mengetahui,\nKepala Sekolah", name: headmasterName, nip: headmasterNip }}
        right={{ role: "Guru Mata Pelajaran", name: teacherName, nip: teacherNip, placeDate: `${schoolRegency || "..........."}, ${formatLongDateID(todayISODate())}` }}
      />
    </DocumentPage>
  );
}
```

### Dokumen yang Bisa Digenerate

| Dokumen | Format | File Pembuat |
|---|---|---|
| Prota (Program Tahunan) | Screen + Print | `ProtaDocument.tsx` |
| Promes (Program Semester) | Screen + Print + DOCX | `PromesPortraitDocument.tsx`, `PromesMerdekaDocument.tsx`, `PromesLandscapeMatrixDocument.tsx`, `promes-docx-exporter.ts` |
| ATP (Tujuan Pembelajaran) | Screen + Print | `ATPDocument.tsx` |
| LKPD (Lembar Kerja) | Screen + Print | `LKPDPreview.tsx`, `Paket1LKPD.tsx` |
| Rekap Semester (4 format) | Screen + Print + DOCX + XLSX | `AbsensiBulananMatrix.tsx`, `TatapMukaMatrix.tsx`, `NilaiMatrix.tsx`, `JurnalMatrix.tsx`, `rekap-semester-docx-exporter.ts`, `rekap-semester-xls-exporter.ts` |
| Absensi Bulanan | Screen + Print + DOCX + XLSX | `AbsensiBulananMatrix.tsx` |
| Daftar Nilai | Screen + Print | `GradeDocument.tsx`, `Paket1GradeReports.tsx` |
| Jurnal Mengajar | Screen + Print | `Paket1AttendanceJournal.tsx` |
| Semester Report | Screen + Print | `SemesterReportDocument.tsx` |
| Remedial Program | Screen + Print | `RemedialDocument.tsx` |
| Program Pengayaan | Screen + Print | `PengayaanDocument.tsx` |
| Admin Package (14 dokumen) | Screen + Print | `Paket1AdminReports.tsx`, `Paket2Reports.tsx` |
| Kisi-kisi / Kartu Soal | Screen + Print | `AssessmentReports.tsx` |
| Kalender Minggu Efektif | Screen + Print | `KalenderMEDocument.tsx` |
| Piket Report | Screen + Print | `PrintDutyReport.tsx`, `PiketReportTab.tsx` |
| Surat Peringatan (SP) | Screen | `LetterPreview.tsx` |
| Dokumen Generik (11 jenis) | Screen + Print | `LainnyaDocument.tsx` |
| RPP Bulk Replace | Screen + DOCX | `RppBulkReplacePage.tsx`, `processDocxIdentity()` |

### Cara Kerja DocumentPreview (WYSIWYG Canvas)

1. **Auto-save**: Setiap perubahan data di-save ke Dexie `schoolDocuments` via `useAutoSave` hook (debounced)
2. **ensureDoc pattern**: Cari dokumen existing by compositeKey; jika tidak ada, buat baru
3. **Status management**: Draft → Siap Dicek → Final → Dikunci
4. **Print**: `window.print()` dengan `@media print` rules di `document-print.css`
5. **DOCX export**: Button trigger `promes-docx-exporter.ts` atau `rekap-semester-docx-exporter.ts`
6. **Orientation**: `@page portrait` / `@page landscape` via named pages

### Cara Kerja DOCX Identity Replacement

1. Input: `ArrayBuffer` DOCX + `RppIdentityContext` + `LiteralReplacement[]`
2. Parse DOCX sebagai ZIP (JSZip)
3. Baca `word/document.xml`, `word/header*.xml`, `word/footer*.xml`
4. Di tiap XML: extract `<w:p>` paragraphs, concat `<w:t>` runs, replace placeholder/literal, tulis kembali
5. Placeholder: `{{NAMA_SEKOLAH}}`, `{{ALAMAT_SEKOLAH}}`, `{{NAMA_GURU}}`, dll (13 placeholder)
6. Literal: ganti teks "SMA Negeri 1" → "SMPN 8 Bantan" (case-sensitive)
7. Output: ArrayBuffer DOCX baru (siap download)

---

## 5. Konvensi & Pattern

### Naming Convention

| Jenis | Konvensi | Contoh |
|---|---|---|
| File komponen | PascalCase | `DailyDutyPage.tsx`, `LedgerDetailSheet.tsx` |
| File hook | camelCase dengan `use` prefix | `useDailyDutyState.ts`, `useCatatState.ts` |
| File types | kebab-case | `quick-attendance-types.ts`, `grades-types.ts` |
| File util | kebab-case | `prota-helpers.ts`, `promes-helpers.tsx` |
| File test | Mirip file yang di-test | `piket-letter.test.ts` |
| Zod schema | `xxxSchema` | `academicYearSchema`, `dutyRecordSchema` |
| Type | `Xxx` (PascalCase) | `AcademicYear`, `DutyRecord` |
| Parse function | `parseXxx` / `safeParseXxx` | `parseProtaProfile`, `safeParseGradeBook` |
| Domain file | Satu entitas per file | `academic-year.ts`, `gradebook.ts` |

### Arsitektur Pattern

1. **Schema-first (Zod as single source of truth)**:
   - Semua tipe di-infer dari Zod schema (`z.infer<typeof xxxSchema>`)
   - Tidak ada TypeScript interface terpisah — Zod schema adalah otoritas
   - Setiap schema punya `parse` + `safeParse` function

2. **Local-first (Dexie + IndexedDB)**:
   - Semua data disimpan di IndexedDB via Dexie
   - Supabase sync opsional (auth + cloud backup)
   - `syncStatus` field di setiap entitas: "local_only" | "pending" | "synced" | "error" | "conflict"

3. **WYSIWYG Document Architecture**:
   - Pattern: `Sidebar + DocumentPreview + auto-save`
   - `ensureDoc` pattern: find-or-create by compositeKey
   - `useAutoSave` hook: debounced save ke `schoolDocuments` table
   - `useDirtyGuard` hook: browser navigation warning

4. **Pure Function Domain Layer**:
   - Semua engine/generator di `packages/domain/` adalah pure function
   - Tidak ada side effect, tidak baca dari Dexie
   - Caller wajib simpan hasil ke Dexie

5. **Teaching Assignment 5-tuple**:
   - Key: `(academicYearId, semester, teacherId, subject, classId)`
   - Semua data (absensi, jurnal, nilai, laporan) difilter by assignment
   - `assignmentCompositeKey()` helper untuk unique key

6. **Module Isolation**:
   - Modul Piket terisolasi dari app utama (tidak menulis ke attendanceRecords)
   - Hanya membaca attendanceRecords untuk rekap kehadiran (read-only)

### Hal yang HARUS Diuti Developer/AI Baru

1. **Tambah entitas baru**: Buat file di `packages/domain/src/`, definisikan Zod schema, export dari `index.ts`, tambah Dexie table + migration
2. **Tambah modul UI baru**: Buat folder di `apps/teacher-admin/src/modules/`, ikuti pola `XxxPage.tsx` + `useXxxState.ts`
3. **Tambah dokumen print baru**: Buat template di `report-templates/`, gunakan `DocumentLayout` primitives, tambah CSS di `document-print.css`
4. **Jangan bypass Zod**: Semua data yang masuk ke DB harus divalidasi via schema
5. **Jangan import React/Dexie di domain**: `@guru-admin/domain` wajib pure TypeScript + Zod only
6. **Jangan import domain dari shared**: `@guru-admin/shared` wajib zero dependency (hanya constants + util)
7. **Touch target 44px**: Semua tombol/interaktif wajib `min-h-[44px]`
8. **Indigo/blue untuk Piket**: Gradient header Piket = indigo/blue (bukan emerald/teal seperti KBM)
9. **BottomSheet overflow-hidden**: Container BottomSheet harus punya `overflow-hidden` agar `max-h-[85vh]` enforced
10. **Single scroll container**: Hindari nested `overflow-y-auto` dalam BottomSheet — satu scroll container saja

---

## 6. Known Issues / Belum Selesai

### Bug yang Diketahui

| Bug | Status | Detail |
|---|---|---|
| BottomSheet overflow (SUDAH DIFIX) | ✅ Fixed | Root cause: container tidak punya `overflow-hidden` + nested scroll container. Fix: tambah `overflow-hidden` di BottomSheet container, hapus `max-h-[35vh] overflow-y-auto` dari LedgerDetailSheet record history |
| Circular chunk warning saat build | ⚠️ Known | `PrintExportButtons` circular import antara `shared/ui/index.tsx` dan beberapa modul. Tidak mempengaruhi runtime, hanya warning Rollup |
| `vh` unit di mobile | ⚠️ Known | BottomSheet pakai `max-h-[85vh]` — di mobile browser dengan address bar, `vh` bisa tidak akurat. Diperbaiki sebagian oleh `overflow-hidden` |

### Bagian yang Sengaja Belum Dikerjakan

| Fitur | Alasan |
|---|---|
| Cloud sync (Supabase) | Infra sudah ada (`supabase/` dir, `sync-store.ts`, `daily-bridge.ts`) tapi belum diaktifkan. Menunggu kebutuhan nyata |
| Multi-school support | SchoolProfile dan TeacherProfile single-row di MVP v1. Parameter sudah disediakan di `planNewYearFromPrevious` untuk validasi masa depan |
| Lint & CI | `lint` script hanya echo placeholder. Belum ada ESLint/Prettier setup |
| PWA service worker | Build sudah PWA-ready (manifest, service worker) tapi belum diaktifkan secara penuh |
| Smart Roster integration | `schedule-import.ts` sudah mendukung import dari Smart Roster, tapi belum ada UI untuk koneksi langsung |
| Docx export untuk semua template | Hanya Promes dan Rekap Semester yang punya DOCX exporter. Template lain hanya print via `window.print()` |
