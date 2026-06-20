# Data Model Draft — Guru Admin Flow

**Status:** Sprint 0 — Draft v1.0
**Sumber otoritas:** `docs/GURU_ADMIN_FLOW_REFERENCE.md` §10
**Tujuan:** Mendefinisikan tipe data awal yang akan diimpelementasikan di `packages/domain` pada Sprint 1.

Dokumen ini adalah **draft**. Setiap penambahan/pengubahan tipe selama Sprint 1–5 wajib memperbarui dokumen ini terlebih dahulu, baru mengubah kode di `packages/domain`.

---

## 0. Konvensi Umum

### 0.1 Field Wajib untuk Semua Entitas Persisten

Setiap entitas yang disimpan ke Dexie (dan nantinya Supabase) wajib memiliki:

```ts
type BaseEntity = {
  id: string;            // UUID v4, di-generate di sisi aplikasi
  createdAt: string;     // ISO 8601 dengan timezone, contoh: "2025-08-18T10:30:00+07:00"
  updatedAt: string;     // ISO 8601 dengan timezone
  deletedAt?: string | null;  // soft delete, ISO 8601 atau null
  syncStatus: SyncStatus;     // status sinkronisasi cloud (Sprint 6)
};

type SyncStatus =
  | "local_only"      // tersimpan di perangkat, belum ada di cloud
  | "pending"         // antrian sinkronisasi
  | "synced"          // sudah tersinkron dengan cloud
  | "error"           // gagal sinkron, perlu retry
  | "conflict";       // konflik dengan versi cloud (Sprint 6+)
```

### 0.2 Aturan Penanggalan

- Semua tanggal disimpan sebagai ISO 8601 string dengan timezone lokal (`Asia/Jakarta` untuk MVP v1).
- Tanggal saja (tanpa jam): format `YYYY-MM-DD` (contoh: `"2025-08-18"`).
- Timestamp: format `YYYY-MM-DDTHH:mm:ss±HH:mm` (contoh: `"2025-08-18T10:30:00+07:00"`).

### 0.3 Aturan ID

- `id` utama: UUID v4 string.
- ID komposit (untuk unique constraint): kombinasi field dengan pemisah `+` (contoh: `classId+date+startPeriod` pada `LessonSession`).

### 0.4 Aturan Status Dokumen

```ts
type DocumentStatus =
  | "draft"
  | "ready_for_review"
  | "final"
  | "revised"
  | "locked";
```

---

## 1. AcademicYear

Tahun pelajaran aktif. Hanya satu yang boleh `active: true` pada satu waktu.

```ts
type AcademicYear = BaseEntity & {
  label: string;           // format "2025/2026"
  startDate: string;       // ISO date "2025-07-14"
  endDate: string;         // ISO date "2026-06-13"
  semester1Start: string;  // ISO date
  semester1End: string;    // ISO date
  semester2Start: string;  // ISO date
  semester2End: string;    // ISO date
  active: boolean;         // true untuk tahun pelajaran yang sedang aktif
  sourceYearId?: string;   // AcademicYear.id sumber saat "Buat Tahun Baru dari Tahun Lalu"
};
```

**Validasi:**

- `label` wajib match regex `^\d{4}/\d{4}$`.
- `startDate < endDate`.
- `semester1Start < semester1End < semester2Start < semester2End`.
- Hanya satu `AcademicYear` dengan `active: true`. Saat mengaktifkan satu, yang lain wajib di-set `active: false`.

**Indeks Dexie:** `id, label, active`.

---

## 2. SchoolProfile

Profil sekolah. Single row di MVP v1 (satu aplikasi = satu sekolah).

```ts
type SchoolProfile = BaseEntity & {
  name: string;             // "SMPN 8 Bantan"
  npsn: string;             // Nomor Pokok Sekolah Nasional, 8 digit
  nss?: string;             // Nomor Sekolah Sekolah (opsional)
  address: string;
  village: string;          // Desa/Kelurahan
  district: string;         // Kecamatan
  regency: string;          // Kabupaten/Kota
  province: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  headmasterName: string;   // Nama kepala sekolah (berubah tiap tahun)
  headmasterNip?: string;   // NIP kepala sekolah
  headmasterSignature?: string;  // URL ke gambar tanda tangan (opsional)
  logo?: string;            // URL ke logo sekolah (opsional)
};
```

**Validasi:**

- `npsn` wajib 8 digit numerik.
- `headmasterName` tidak boleh kosong (wajib diisi saat membuat dokumen resmi).

**Indeks Dexie:** `id` (single row, id konstan `"school-profile"`).

---

## 3. TeacherProfile

Profil guru yang menggunakan aplikasi. Single row di MVP v1.

```ts
type TeacherProfile = BaseEntity & {
  name: string;             // nama lengkap dengan gelar
  nip?: string;             // NIP, 18 digit jika ada
  email?: string;
  phone?: string;
  employeeStatus: "pns" | "pppk" | "honorer" | "gtt" | "gty" | "other";
  subjects: TeacherSubject[];  // mapel yang diajar
  homeroomClassId?: string;    // id kelas wali (opsional, MVP v1 tidak mengeksploitasi)
  signature?: string;          // URL ke gambar tanda tangan (opsional)
  photo?: string;              // URL ke foto (opsional)
};

type TeacherSubject = {
  subject: string;          // "Pendidikan Pancasila"
  grades: string[];         // ["VII", "VIII"]
  phases: string[];         // ["D"]
};
```

**Validasi:**

- `subjects` minimal 1 entry.
- `name` tidak boleh kosong.
- `nip` jika diisi wajib 18 digit numerik.

**Indeks Dexie:** `id` (single row, id konstan `"teacher-profile"`).

---

## 4. CalendarEvent

Event kalender pendidikan. Berasal dari impor JSON hasil AI atau input manual.

```ts
type CalendarEvent = BaseEntity & {
  academicYearId: string;
  startDate: string;        // ISO date
  endDate: string;          // ISO date (boleh sama dengan startDate untuk event 1 hari)
  type: CalendarEventType;
  label: string;            // nama event, contoh: "Minggu 1 KBM", "Libur Idul Adha"
  description?: string;
  scope: CalendarScope;     // berlaku untuk siapa
  blocksLearning: boolean;  // true = tidak ada KBM di rentang ini
  source: "ai_import" | "manual";
};

type CalendarEventType =
  | "learning"           // minggu KBM efektif
  | "assessment"         // asesmen/ulangan
  | "holiday"            // libur nasional/keagamaan
  | "school_activity"    // kegiatan sekolah (upacara, classmtg, dll.)
  | "remedial"           // jadwal remedial
  | "report"             // hari rapor
  | "cocurricular";      // kegiatan kokurikuler blok

type CalendarScope =
  | "ALL"                 // berlaku untuk semua kelas
  | string[];             // berlaku untuk kelas tertentu, contoh: ["VII A", "VIII B"]
```

**Validasi:**

- `startDate <= endDate`.
- `type` wajib salah satu dari union.
- Jika `type === "holiday"`, maka `blocksLearning: true` wajib.
- Tidak boleh ada event `learning` yang tumpang tindih dengan event `holiday` untuk `scope` yang sama (warning, bukan error).

**Indeks Dexie:** `id, academicYearId, startDate, type, blocksLearning`.

---

## 5. ProtaProfile

Program Tahunan per mapel per kelas per tahun pelajaran.

```ts
type ProtaProfile = BaseEntity & {
  academicYearId: string;
  subject: string;          // "Pendidikan Pancasila"
  grade: string;            // "VII"
  phase: string;            // "D" (Kurikulum Merdeka)
  teacherId: string;        // TeacherProfile.id
  annualIntraJP: number;    // total JP intrakurikuler tahunan, contoh: 72
  semester1IntraJP: number; // total JP intrakurikuler semester 1, contoh: 36
  semester2IntraJP: number; // total JP intrakurikuler semester 2, contoh: 36
  annualCocurricularJP?: number;     // total JP KO tahunan (opsional, jika dipakai)
  semester1CocurricularJP?: number;
  semester2CocurricularJP?: number;
  units: ProtaUnit[];       // daftar materi/TP
  status: DocumentStatus;   // status dokumen Prota
  sourceYearId?: string;    // ProtaProfile.id sumber saat "Buat Tahun Baru"
  notes?: string;
};

type ProtaUnit = BaseEntity & {
  protaProfileId: string;   // parent ProtaProfile.id
  semester: 1 | 2;
  title: string;            // judul materi/TP
  learningOutcome?: string; // tujuan pembelajaran
  jp: number;               // alokasi JP untuk unit ini
  order: number;            // urutan unit dalam semester
  code?: string;            // kode ATP jika ada, contoh: "PP.7.1"
};
```

**Validasi:**

- `semester1IntraJP + semester2IntraJP === annualIntraJP` (warning jika tidak sama, bukan error).
- Sum of `ProtaUnit.jp` per semester wajib sama dengan `semester{N}IntraJP` (status `Valid` jika sama, `Perlu perbaikan` jika tidak).
- `ProtaUnit.order` unik per `(protaProfileId, semester)`.
- `phase` konsisten dengan `grade` (VII/VIII/IX → fase D).

**Indeks Dexie:** `id, academicYearId, subject, grade, phase, teacherId`.

**Indeks ProtaUnit:** `id, protaProfileId, semester, order`.

---

## 6. TeachingSchedule

Jadwal mengajar guru per kelas per hari per jam ke. Sumber dari input manual atau impor Smart Roster.

```ts
type TeachingSchedule = BaseEntity & {
  academicYearId: string;
  teacherId: string;
  subject: string;          // "Pendidikan Pancasila"
  classId: string;          // "VII A" (id atau label kelas)
  classLabel: string;       // label kelas untuk display, contoh: "VII A"
  dayOfWeek: number;        // 1=Senin, 2=Selasa, ..., 7=Minggu
  startPeriod: number;      // jam ke awal, contoh: 1
  durationJP: number;       // durasi dalam JP, contoh: 2
  startTime: string;        // "07:30"
  endTime: string;          // "08:50"
  semester: 1 | 2;          // jadwal bisa berbeda per semester
  source: "manual" | "smart_roster_import";
  notes?: string;
};
```

**Validasi:**

- `dayOfWeek` 1–7.
- `startPeriod >= 1`, `durationJP >= 1`.
- `startTime < endTime`.
- Tidak boleh ada `TeachingSchedule` yang tumpang tindih untuk `teacherId` yang sama di `dayOfWeek` dan `semester` yang sama (error).
- Tidak boleh ada `TeachingSchedule` yang tumpang tindih untuk `classId` yang sama di `dayOfWeek` dan `semester` yang sama (error).

**Indeks Dexie:** `id, academicYearId, teacherId, classId, dayOfWeek, semester, [academicYearId+teacherId+dayOfWeek+semester]`.

---

## 7. LessonSession

Sesi mengajar konkret pada tanggal tertentu. Auto-generated dari `TeachingSchedule` + `CalendarEvent`.

```ts
type LessonSession = BaseEntity & {
  academicYearId: string;
  teachingScheduleId: string;  // sumber jadwal
  teacherId: string;
  classId: string;
  classLabel: string;
  subject: string;
  date: string;              // ISO date "2025-08-18"
  startPeriod: number;
  durationJP: number;
  startTime: string;
  endTime: string;
  semester: 1 | 2;
  plannedUnitId?: string;    // ProtaUnit.id yang direncanakan untuk sesi ini (dari Promes)
  status: LessonSessionStatus;
  calendarEventId?: string;  // CalendarEvent.id yang relevan (jika hari libur/kegiatan)
};

type LessonSessionStatus =
  | "planned"     // dijadwalkan, belum dieksekusi
  | "done"        // terlaksana sesuai rencana
  | "continued"   // dilanjutkan ke sesi berikutnya
  | "cancelled"   // tidak terlaksana (libur, kegiatan, dll.)
  | "rescheduled"; // dijadwal ulang (Sprint 4+, MVP v1 opsional)
```

**Validasi:**

- `date` wajib dalam rentang `AcademicYear.startDate` – `endDate`.
- `date` wajib sesuai `dayOfWeek` dari `TeachingSchedule` sumber.
- Jika `CalendarEvent.blocksLearning === true` untuk `date` ini, `status` wajib `cancelled`.
- Unique constraint: `[classId+date+startPeriod]` (satu kelas tidak bisa punya 2 sesi di jam yang sama).

**Indeks Dexie:** `id, academicYearId, teacherId, classId, date, status, [classId+date+startPeriod]`.

---

## 8. AttendanceRecord

Absensi per siswa per sesi. Default `present` untuk semua siswa.

```ts
type AttendanceRecord = BaseEntity & {
  sessionId: string;        // LessonSession.id
  studentId: string;        // id siswa (entitas Student belum didefinisikan di MVP v1, lihat catatan)
  studentName: string;      // denormalized untuk display
  studentNumber?: number;   // nomor absen
  classId: string;
  classLabel: string;
  date: string;             // ISO date (denormalized dari session)
  status: AttendanceStatus;
  note?: string;
};

type AttendanceStatus =
  | "present"  // hadir (default)
  | "sick"     // sakit
  | "excused"  // izin
  | "absent";  // alpa
```

**Catatan MVP v1:** Entitas `Student` belum didefinisikan. Daftar siswa per kelas akan disimpan sebagai struktur sederhana:

```ts
type ClassRoster = BaseEntity & {
  classId: string;
  classLabel: string;
  academicYearId: string;
  students: StudentEntry[];
};

type StudentEntry = {
  id: string;
  name: string;
  number: number;  // nomor absen
};
```

Daftar siswa diimpor manual atau dari JSON untuk MVP v1. Manajemen siswa lengkap (CRUD siswa lintas tahun) adalah non-goal.

**Validasi:**

- `status` wajib salah satu dari union.
- Unique constraint: `[sessionId+studentId]`.
- `studentNumber` unik per `classId`.

**Indeks Dexie:** `id, sessionId, studentId, classId, date, status, [sessionId+studentId]`.

---

## 9. TeachingJournal

Jurnal mengajar per sesi. Auto-filled dari `LessonSession` + `ProtaUnit` + `AttendanceRecord`.

```ts
type TeachingJournal = BaseEntity & {
  sessionId: string;        // LessonSession.id
  academicYearId: string;
  teacherId: string;
  classId: string;
  classLabel: string;
  subject: string;
  date: string;             // ISO date (denormalized)
  semester: 1 | 2;

  // Auto-filled dari Promes + LessonSession
  plannedUnitId?: string;
  plannedMaterialTitle?: string;
  plannedLearningOutcome?: string;

  // Auto-filled dari AttendanceRecord
  presentCount: number;
  sickCount: number;
  excusedCount: number;
  absentCount: number;
  totalStudents: number;

  // Input guru
  realizationStatus: JournalRealizationStatus;
  actualMaterialTitle?: string;     // bila berbeda dari rencana
  note?: string;
  followUp?: string;

  // Status dokumen
  status: DocumentStatus;  // draft | ready_for_review | final | revised | locked
  locked: boolean;         // mirror dari status === "locked"
  finalizedAt?: string;
};

type JournalRealizationStatus =
  | "done"        // selesai sesuai rencana
  | "continued"   // dilanjutkan ke sesi berikutnya
  | "cancelled";  // tidak terlaksana
```

**Validasi:**

- `presentCount + sickCount + excusedCount + absentCount === totalStudents`.
- `realizationStatus` wajib salah satu dari union.
- Jika `status === "final" || "locked"`, semua field wajib terisi (kecuali `actualMaterialTitle`, `note`, `followUp` opsional).
- Transisi `final → locked` permanen.

**Indeks Dexie:** `id, sessionId, academicYearId, teacherId, classId, date, status, realizationStatus`.

---

## 10. SemesterReport

Laporan akhir semester. Auto-generated dari kompilasi `TeachingJournal` + `AttendanceRecord` + progres `ProtaUnit`.

```ts
type SemesterReport = BaseEntity & {
  academicYearId: string;
  teacherId: string;
  subject: string;
  grade: string;
  phase: string;
  semester: 1 | 2;

  // Rekap pertemuan
  totalPlannedSessions: number;     // total sesi yang dijadwalkan
  totalDoneSessions: number;        // sesi dengan realizationStatus "done"
  totalContinuedSessions: number;
  totalCancelledSessions: number;

  // Rekap materi
  totalPlannedUnits: number;        // total ProtaUnit di semester ini
  totalCompletedUnits: number;      // unit yang semua sesi-nya "done"
  totalPartialUnits: number;        // unit yang sebagian sesi "done"
  totalNotStartedUnits: number;
  completedUnitIds: string[];
  partialUnitIds: string[];
  notStartedUnitIds: string[];

  // Rekap absensi (akumulasi dari semua sesi)
  totalPresent: number;
  totalSick: number;
  totalExcused: number;
  totalAbsent: number;
  perClassAbsence: ClassAbsenceSummary[];

  // Rekap jurnal
  journalsFinalized: number;
  journalsPending: number;
  pendingJournalDates: string[];    // tanggal-tanggal dengan jurnal belum final

  // Catatan
  teacherNotes?: string;
  followUpNotes?: string;
  materialAdjustments?: string;     // penjelasan bila ada materi yang tidak tercapai

  // Status dokumen
  status: DocumentStatus;
  finalizedAt?: string;
  snapshotId?: string;              // DocumentSnapshot.id saat status "final" atau "locked"
};

type ClassAbsenceSummary = {
  classId: string;
  classLabel: string;
  presentCount: number;
  sickCount: number;
  excusedCount: number;
  absentCount: number;
  totalSessions: number;
};
```

**Validasi:**

- `totalPlannedSessions === totalDoneSessions + totalContinuedSessions + totalCancelledSessions`.
- `totalPlannedUnits === totalCompletedUnits + totalPartialUnits + totalNotStartedUnits`.
- Tombol "Finalisasi" dinonaktifkan jika `journalsPending > 0` ATAU ada `AttendanceRecord` dengan `syncStatus !== "synced"` (Sprint 6+).
- Saat transisi `draft → ready_for_review`, snapshot wajib dibuat.
- Saat transisi `ready_for_review → final`, snapshot final dibuat dan tidak bisa diubah.

**Indeks Dexie:** `id, academicYearId, teacherId, subject, grade, semester, status`.

---

## 11. Tipe Tambahan (Pendukung)

### 11.1 DocumentSnapshot

Snapshot dokumen final untuk audit trail.

```ts
type DocumentSnapshot = BaseEntity & {
  entityType: "prota" | "promes" | "semester_report" | "journal";
  entityId: string;
  status: DocumentStatus;
  snapshotData: string;  // JSON serialized dari entity pada saat snapshot
  snapshotAt: string;
  snapshotBy: string;    // teacherId
  reason?: string;
};
```

**Indeks Dexie:** `id, entityType, entityId, snapshotAt`.

### 11.2 SyncQueue (Untuk Sprint 6, didefinisikan di Sprint 0 sebagai placeholder)

```ts
type SyncQueueItem = {
  id: string;
  entityType: string;
  entityId: string;
  operation: "create" | "update" | "delete";
  payload: string;       // JSON serialized
  status: "pending" | "syncing" | "synced" | "error";
  attempts: number;
  lastAttemptAt?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
};
```

**Indeks Dexie:** `id, entityType, entityId, status, createdAt`.

---

## 12. Relasi Antar Entitas (Diagram Teks)

```text
SchoolProfile (1) ────── (N) AcademicYear (1) ──── (N) CalendarEvent
                              │
                              ├──── (N) ProtaProfile (1) ──── (N) ProtaUnit
                              │
                              ├──── (N) TeachingSchedule (1) ──── (N) LessonSession
                              │                                          │
                              │                                          ├──── (N) AttendanceRecord
                              │                                          │
                              │                                          └──── (1) TeachingJournal
                              │
                              └──── (N) SemesterReport

TeacherProfile (1) ────── (N) TeachingSchedule
                  └────── (N) ProtaProfile
                  └────── (N) LessonSession
                  └────── (N) TeachingJournal
                  └────── (N) SemesterReport

DocumentSnapshot (N) ──── (1) [ProtaProfile | SemesterReport | TeachingJournal]
```

---

## 13. Aturan "Buat Tahun Baru dari Tahun Lalu" (Implementasi Data)

Saat fitur ini dipanggil dengan `sourceYearId`:

1. Buat `AcademicYear` baru dengan `sourceYearId` terisi, `active: true`. Set `AcademicYear` lama menjadi `active: false`.
2. Salin `SchoolProfile` (id tetap `"school-profile"`, field diupdate jika ada perubahan).
3. Salin `TeacherProfile` (id tetap `"teacher-profile"`).
4. Salin `CalendarEvent` dengan `academicYearId` baru (kosongkan dulu, guru wajib impor ulang).
5. Salin `ProtaProfile` + `ProtaUnit`:
   - `id` baru (UUID v4).
   - `sourceYearId` terisi id ProtaProfile lama.
   - `status: "draft"`.
   - `units` disalin dengan id baru, `protaProfileId` baru.
6. Salin `TeachingSchedule`:
   - `id` baru.
   - `academicYearId` baru.
   - `source: "manual"` (perlu dikonfirmasi ulang oleh guru).
7. **Kosongkan** (tidak disalin): `LessonSession`, `AttendanceRecord`, `TeachingJournal`, `SemesterReport`, `DocumentSnapshot`.
8. Catat operasi di `worklog.md` aplikasi (jika diperlukan audit).

---

## 14. Validasi Lintas Entitas (Cross-Entity Validation)

Validasi berikut dijalankan sebelum transisi status dokumen penting:

### 14.1 Sebelum Promes di-set `ready_for_review`

- Total JP `ProtaUnit` per semester sama dengan `ProtaProfile.semester{N}IntraJP`.
- Semua `ProtaUnit` terdistribusi ke minimal 1 `LessonSession`.
- Tidak ada `CalendarEvent.blocksLearning: true` yang mengenai tanggal sesi yang sudah dialokasikan materi.

### 14.2 Sebelum SemesterReport di-set `ready_for_review`

- Semua `TeachingJournal` untuk semester ini berstatus `final` atau `locked`.
- Semua `AttendanceRecord` untuk semester ini memiliki `syncStatus: "synced"` (Sprint 6+; di Sprint 1–5 diabaikan).
- Total `totalDoneSessions + totalContinuedSessions + totalCancelledSessions === totalPlannedSessions`.

### 14.3 Sebelum SemesterReport di-set `final`

- Snapshot `DocumentSnapshot` sudah dibuat.
- Tidak ada perubahan pada `TeachingJournal` setelah snapshot (jika ada, status kembali ke `revised`).

---

## 15. Catatan untuk Implementasi Sprint 1

1. Implementasi tipe di `packages/domain/src/<entity>.ts` dengan export Zod schema (untuk validasi runtime) + TypeScript type (untuk compile-time).
2. Setiap tipe wajib memiliki `parse()` function yang menerima `unknown` dan return tipe yang sudah tervalidasi atau throw `ZodError`.
3. Setiap tipe wajib memiliki `safeParse()` yang return `{ success: true, data } | { success: false, error }`.
4. Business rules (cross-entity validation di §14) diimplementasikan sebagai pure function di `packages/domain/src/rules/`.
5. Migration skema Dexie wajib menambahkan field baru sebagai optional, tidak boleh menghapus field lama tanpa migration step.

---

## 16. Yang Belum Didefinisikan (Akan Ditambahkan di Sprint Berikutnya)

| Entitas/Field | Sprint | Catatan |
|---|---|---|
| `Student` (sebagai entitas penuh) | Sprint 3+ | MVP v1 cukup `ClassRoster.students` sederhana |
| `Class` (sebagai entitas penuh) | Sprint 3+ | MVP v1 `classId` adalah string label |
| `Subject` (sebagai entitas penuh) | Sprint 1+ opsional | MVP v1 `subject` adalah string |
| `Assessment` (asesmen terjadwal) | Sprint 2+ | Bagian dari `CalendarEvent.type === "assessment"` untuk MVP v1 |
| `Score` / `Grade` | non-goal MVP v1 | Hanya simpan minimal jika diperlukan untuk laporan |
| `RemedialPlan` | non-goal MVP v1 | Hanya catat di `TeachingJournal.followUp` |
| `KOActivity` | non-goal MVP v1 | KO dikelola koordinator, bukan guru mapel |
| `DocumentTemplate` (DOCX/PDF) | Sprint 5+ | Format export laporan, belum urgent di Sprint 1–4 |
| `AuditLog` | Sprint 6+ | Untuk tracking perubahan multi-user |

---

## 17. Riwayat Revisi

| Versi | Tanggal | Perubahan | Penanggung Jawab |
|---|---|---|---|
| v1.0 | Sprint 0 | Dokumen awal, 11 entitas inti + 2 entitas pendukung | Sprint 0 owner |
