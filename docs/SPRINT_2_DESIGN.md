# Sprint 2 Design — Kalender + Prota + Promes

**Status:** Draft v0.2 (pre-merge Sprint 1, post senior dev review)
**Sumber otoritas:**
- `docs/GURU_ADMIN_FLOW_REFERENCE.md` §6 (Logika Kurikulum & JP), §7.2–7.4 (modul Kalender/Prota/Promes)
- `docs/PROJECT_CONTRACT.md` §4.1 (M02, M03, M04)
- `docs/TECHNICAL_PLAN.md` §9.2 (roadmap Sprint 2)
- `docs/DATA_MODEL_DRAFT.md` §4 (CalendarEvent), §5 (ProtaProfile + ProtaUnit)
- Prototipe referensi: `promes_generator_smpn8bantan.html` (algoritma distribusi cadangan-pertama, week-by-week) — **dengan koreksi critical, lihat §0**

**Filosofi yang dipatuhi:** *Promes adalah hasil, bukan sumber utama. Promes dibangkitkan dari Prota + Kalender + Jadwal Guru.*

**PENTING:** Dokumen ini adalah **design doc**, bukan implementasi. Tidak boleh ada kode produksi Sprint 2 yang ditulis sampai:
1. PR #1 (Sprint 1) di-merge ke `main`
2. Branch `sprint-2-design` di-merge atau design doc di-approve
3. Branch baru `sprint-2-calendar-prota-promes` dibuat dari `main` untuk eksekusi

---

## 0. CRITICAL PROMES RULE — Wajib Dipatuhi

> ⚠️ **Aturan ini Mengganti Interpretasi Prototipe Lama.**
>
> Prototipe `promes_generator_smpn8bantan.html` memperlakukan **3 JP/minggu sebagai kapasitas distribusi materi** untuk PPKn. **Ini SALAH** dan tidak boleh diulangi di Sprint 2.

### 0.1 Struktur JP Pendidikan Pancasila SMP (referensi: SMPN 8 Bantan)

```text
Total struktur     : 108 JP/tahun
  ├─ Intrakurikuler:  72 JP/tahun  (36 JP/semester)
  └─ Kokurikuler   :  36 JP/tahun  (18 JP/semester)

Per minggu (18 minggu efektif/semester):
  ├─ Intra: 2 JP/minggu  ← SUMBER distribusi materi
  └─ KO   : 1 JP/minggu  ← row terpisah, BUKAN materi
  Total  : 3 JP/minggu
```

### 0.2 Rumus Final Engine Promes Sprint 2

```text
Promes materi  =  Intra JP  (72 JP/tahun, 36 JP/semester)
KO             =  row terpisah per minggu (1 JP/minggu, 18 JP/semester)
Cadangan       =  penyesuaian internal guru (subset dari Intra, BUKAN tambahan)
```

### 0.3 Implikasi wajib

1. **`jpPerWeek` TIDAK BOLEH 3 untuk PPKn.** Engine Promes pakai `intraJpPerWeek` (default 2 untuk PPKn) sebagai kapasitas distribusi materi.
2. **KO tampil sebagai row terpisah** di tabel distribusi mingguan, BUKAN digabung dengan materi. Setiap minggu efektif punya: 1 row material (dari intra) + 1 row KO (catatan, 1 JP).
3. **Cadangan diambil dari Intra capacity**, bukan dari total 3 JP. Rumus: `materialCapacity = (effectiveWeeks × intraJpPerWeek) - cadanganJP`.
4. **Cadangan TIDAK BOLEH membuat materialCapacity negatif.** Bila `cadanganJP > effectiveWeeks × intraJpPerWeek`, error.
5. **KO BUKAN tugas Guru Admin Flow.** Tidak ada solver KO, tidak ada tracking kontribusi KO per mapel. KO cukup tampil sebagai catatan: "Alokasi kokurikuler: 1 JP/minggu / 18 JP/semester". Solver KO adalah urusan Smart Roster / Waka Kurikulum.
6. **Mode KO (blok harian / akhir minggu / akhir semester) hanya catatan.** Guru pilih mode di ProtaProfile, tampil sebagai label di row KO. Tidak ada perhitungan otomatis.

### 0.4 Validasi terhadap prototipe lama

| Aspek | Prototipe lama (SALAH) | Sprint 2 (BENAR) |
|---|---|---|
| Kapasitas distribusi materi | 3 JP/minggu (gabung intra + KO) | 2 JP/minggu (intra saja) |
| KO handling | Tidak ada row KO | Row KO terpisah per minggu (1 JP) |
| Cadangan source | Dari total 3 JP/minggu | Dari intra 2 JP/minggu |
| Material target | Tidak jelas (3 JP × minggu) | 36 JP/semester (intra) - cadangan |
| Total per minggu di tabel | 3 JP (materi) | 2 JP (materi) + 1 JP (KO row) = 3 JP total |

---

## 1. Scope Sprint 2

### 1.1 Modul yang dikerjakan

| Kode | Modul | Status Sprint 1 | Target Sprint 2 |
|---|---|---|---|
| M02 | Kalender Pendidikan | Schema + parse only | Editor lengkap: impor JSON, edit manual, validasi, preview |
| M03 | Prota | Schema + parse only | Editor lengkap: input manual, impor JSON, validasi JP, versi |
| M04 | Promes | Schema tidak ada | Engine generate + preview + status valid/perlu perbaikan |

### 1.2 Non-goals Sprint 2 (dilarang dikerjakan)

- Modul M05 Jadwal Guru lengkap (Sprint 3) — Sprint 2 pakai jadwal dummy/kosong, Promes pakai pendekatan week-by-week tanpa jadwal
- Modul M06–M09 (Sprint 4–5)
- Supabase (Sprint 6)
- **Solver KO (kokurikuler)** — urusan Smart Roster / Waka Kurikulum. Guru Admin Flow hanya tampilkan KO sebagai row catatan. Tidak ada perhitungan alokasi KO per mapel, tidak ada optimasi jadwal KO.
- Ekspor DOCX/PDF Promes (Sprint 5, bersama laporan semester)
- Multi-mapel per generate Promes (Sprint 2: 1 mapel per generate)
- Promes otomatis re-generate saat Prota/Kalender berubah (manual trigger di Sprint 2, auto-trigger di Sprint 3+)
- Versioning Prota dengan diff (Sprint 2: snapshot status draft → final saja)
- Hardcode `jpPerWeek` untuk mapel selain PPKn — user input manual untuk mapel lain
- Tracking kontribusi KO per materi — KO tidak ditelusuri per mapel

---

## 2. Kontrak Kalender JSON

### 2.1 Sumber input

Kalender diimpor dari **JSON hasil AI eksternal** (ChatGPT/Claude). Guru meng-upload dokumen kalender resmi (PDF/DOCX) ke AI, copy-paste JSON hasilnya ke aplikasi. Aplikasi **tidak** memanggil AI API langsung (lihat `PROJECT_CONTRACT.md` §5 non-goal).

### 2.2 Format JSON input (AI → aplikasi)

```json
{
  "$schema": "guru-admin-flow/calendar/v1",
  "academicYearLabel": "2025/2026",
  "source": "Kemenag Bengkalis TP 2025/2026",
  "events": [
    {
      "startDate": "2025-07-14",
      "endDate": "2025-07-14",
      "type": "school_activity",
      "label": "Awal Tahun Pelajaran - Masa Pengenalan Lingkungan Sekolah",
      "scope": "ALL",
      "blocksLearning": true
    },
    {
      "startDate": "2025-07-21",
      "endDate": "2025-08-30",
      "type": "learning",
      "label": "Minggu 1-6 KBM Semester 1",
      "scope": "ALL",
      "blocksLearning": false
    },
    {
      "startDate": "2025-08-17",
      "endDate": "2025-08-17",
      "type": "holiday",
      "label": "HUT RI ke-80",
      "scope": "ALL",
      "blocksLearning": true
    },
    {
      "startDate": "2025-12-22",
      "endDate": "2026-01-04",
      "type": "holiday",
      "label": "Libur Semester",
      "scope": "ALL",
      "blocksLearning": true
    },
    {
      "startDate": "2026-01-05",
      "endDate": "2026-03-15",
      "type": "learning",
      "label": "Minggu 1-10 KBM Semester 2",
      "scope": "ALL",
      "blocksLearning": false
    },
    {
      "startDate": "2026-03-16",
      "endDate": "2026-03-20",
      "type": "assessment",
      "label": "Asesmen Tengah Semester 2",
      "scope": "ALL",
      "blocksLearning": true
    },
    {
      "startDate": "2026-06-08",
      "endDate": "2026-06-13",
      "type": "report",
      "label": "Penyerahan Rapor",
      "scope": "ALL",
      "blocksLearning": true
    }
  ]
}
```

### 2.3 Validasi impor kalender

| # | Validasi | Aksi bila gagal |
|---|---|---|
| 1 | `$schema` cocok `guru-admin-flow/calendar/v1` | Tolak dengan pesan: "Schema tidak dikenali. Pastikan JSON dari AI prompt yang benar." |
| 2 | `academicYearLabel` format `YYYY/YYYY` | Tolak |
| 3 | `academicYearLabel` ada di AcademicYear lokal | Tolak dengan saran: "Buat tahun pelajaran dulu di menu Profil." |
| 4 | `events` array, minimal 1 event | Tolak |
| 5 | Setiap event: `startDate <= endDate` | Tolak per-event, tampilkan index |
| 6 | Setiap event: `type` valid union (7 jenis) | Tolak per-event |
| 7 | Event `holiday` wajib `blocksLearning: true` | Auto-fix: set `blocksLearning: true` + warning |
| 8 | Tidak ada event `learning` yang tumpang tindih dengan event `holiday` scope sama | Warning (bukan error), tampilkan daftar konflik |
| 9 | Tidak ada 2+ event `learning` yang tumpang tindih scope sama | Error, minta user perbaiki |

### 2.4 Konflik dengan kalender existing

Saat impor kalender baru untuk tahun pelajaran yang sudah punya kalender:

| Mode | Behavior |
|---|---|
| **Replace** (default) | Hapus semua CalendarEvent lama untuk academicYearId ini, simpan yang baru. Snapshot data lama tetap aman di DocumentSnapshot bila ada. |
| **Merge** (advanced, Sprint 3+) | Event baru ditambahkan, event lama dengan label sama di-update. Tidak dikerjakan di Sprint 2. |

UI wajib tampilkan konfirmasi eksplisit sebelum replace:
```
"Anda akan mengganti 23 event kalender existing dengan 28 event baru dari JSON. 
Lanjutkan? [Ya, Ganti] [Batal]"
```

### 2.5 Zod schema untuk import (di `packages/domain/src/calendar-import.ts`)

```ts
export const calendarImportSchema = z.object({
  $schema: z.literal("guru-admin-flow/calendar/v1"),
  academicYearLabel: z.string().regex(/^\d{4}\/\d{4}$/),
  source: z.string().optional(),
  events: z.array(z.object({
    startDate: z.string(),
    endDate: z.string(),
    type: calendarEventTypeSchema,
    label: z.string().min(1),
    scope: calendarScopeSchema,
    blocksLearning: z.boolean(),
    description: z.string().optional(),
  })).min(1),
});

export type CalendarImport = z.infer<typeof calendarImportSchema>;
```

---

## 3. Editor Kalender Minimal

### 3.1 UI spec — halaman `/calendar`

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│ Kalender Pendidikan — TP 2025/2026 [active]            │
├─────────────────────────────────────────────────────────┤
│ [Impor JSON]  [Tambah Event]  [Preview Semester]       │
├─────────────────────────────────────────────────────────┤
│ Filter: [Semester ▼] [Jenis ▼] [Scope ▼]   23 events   │
├─────────────────────────────────────────────────────────┤
│ Sen, 14 Jul 2025  │ school_activity │ Awal Tahun...    │
│ Sab, 17 Agt 2025  │ holiday         │ HUT RI ke-80     │
│ Sen, 21 Jul 2025  │ learning        │ Minggu 1-6 KBM   │
│ ...                                                     │
└─────────────────────────────────────────────────────────┘
```

**Daftar event** diurutkan by `startDate` ascending. Column:
- Tanggal (format panjang Indonesia: `Sen, 14 Jul 2025`)
- Jenis (badge color-coded: learning=hijau, assessment=amber, holiday=merah, school_activity=biru, remedial=ungu, report=teal, cocurricular=orange)
- Label + scope (kecil di bawah label)
- Aksi: edit (pencil), hapus (trash, soft-delete)

### 3.2 Form tambah/edit event

Field:
- `label` (text, wajib)
- `type` (select 7 jenis)
- `startDate` (date, wajib)
- `endDate` (date, wajib, default = startDate)
- `scope` (radio: ALL / pilih kelas dari ClassRoster)
- `blocksLearning` (checkbox, auto-checked bila type=holiday)
- `description` (textarea, opsional)

### 3.3 Impor JSON — modal flow

```
[Click "Impor JSON"]
   ↓
Modal: "Impor Kalender dari JSON"
   - Textarea untuk paste JSON (atau file picker .json)
   - Tombol "Validasi"
   ↓
[Click "Validasi"]
   ↓
Tampilkan ringkasan:
   - academicYearLabel: 2025/2026
   - Jumlah event: 28
   - Breakdown per jenis: 18 learning, 5 holiday, 2 assessment, ...
   - Warning konflik (bila ada)
   - Konflik dengan kalender existing: 23 event akan dihapus
   ↓
[Click "Impor & Ganti"] (disabled bila ada error)
   ↓
Proses:
   - Soft-delete CalendarEvent lama untuk academicYearId
   - Simpan CalendarEvent baru (source: "ai_import")
   - Tampilkan success toast
   - Refresh daftar event
```

### 3.4 Preview semester

Tampilan kalender bulanan untuk satu semester (1 atau 2). Setiap tanggal diwarnai:
- Hijau muda: `learning`
- Merah: `holiday`
- Amber: `assessment`
- Biru: `school_activity`
- Abu-abu: tanggal di luar semester aktif

Berguna untuk verifikasi visual sebelum finalisasi.

### 3.5 Persistensi

- Tabel Dexie: `calendarEvents` (sudah ada schema di Sprint 1)
- Index: `id, academicYearId, startDate, type, blocksLearning`
- Soft delete via `deletedAt` (sudah ada di schema BaseEntity)

---

## 4. Input Prota

### 4.1 UI spec — halaman `/prota`

**Layout:**

```
┌─────────────────────────────────────────────────────────┐
│ Program Tahunan — TP 2025/2026                          │
├─────────────────────────────────────────────────────────┤
│ [Mapel: Pendidikan Pancasila ▼]  [Kelas: VII ▼]        │
│ [Tahun: 2025/2026 ▼]                                    │
├─────────────────────────────────────────────────────────┤
│ Status: [Draft]                                         │
├─────────────────────────────────────────────────────────┤
│ § Identitas Prota                                       │
│   Total JP Tahunan (intra): 72                          │
│   Total JP Semester 1 (intra): 36                       │
│   Total JP Semester 2 (intra): 36                       │
│   Total JP Tahunan (kokurikuler): 36 [opsional]        │
│   Semester 1 KO: 18   Semester 2 KO: 18                │
│   Fase: D   Guru: [teacher name]                       │
├─────────────────────────────────────────────────────────┤
│ § Daftar Materi/TP                                      │
│ [Impor JSON]  [Tambah Materi]                           │
│                                                          │
│ Semester 1 (target: 36 JP intra)                       │
│ ┌──┬──────────────────────┬─────┬───────┬───────────┐  │
│ │ #│ Judul                │ JP  │ Order │ Aksi      │  │
│ ├──┼──────────────────────┼─────┼───────┼───────────┤  │
│ │ 1│ Budaya Demokrasi     │ 12  │ 1     │ edit del  │  │
│ │ 2│ Keadilan Sosial      │ 24  │ 2     │ edit del  │  │
│ ├──┴──────────────────────┴─────┴───────┴───────────┘  │
│ Subtotal: 36 JP ✓ (target: 36)                         │
│                                                          │
│ Semester 2 (target: 36 JP intra)                       │
│ ...                                                      │
│ Subtotal: 36 JP ✓ (target: 36)                         │
├─────────────────────────────────────────────────────────┤
│ Total Tahunan: 72 JP ✓ (target: 72)                    │
│ [Simpan sebagai Draft]  [Tandai Ready for Review]      │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Validasi JP — 72 intra + 36 kokurikuler

Sesuai praktik SMPN 8 Bantan (lihat `GURU_ADMIN_FLOW_REFERENCE.md` §6.3 dan §0 di doc ini):
- **Total struktur PPKn: 108 JP/tahun** = 72 JP intrakurikuler + 36 JP kokurikuler
- Per semester: 54 JP = 36 JP intra + 18 JP KO
- Per minggu (18 minggu efektif): 3 JP = 2 JP intra + 1 JP KO
- **Material distribution pakai intra JP saja (2 JP/minggu)** — lihat §0 CRITICAL PROMES RULE

**Aturan validasi:**

| # | Rule | Status |
|---|---|---|
| 1 | `semester1IntraJP + semester2IntraJP === annualIntraJP` | Warning bila tidak sama (bukan error) |
| 2 | Sum `ProtaUnit.jp` per semester === `semester{N}IntraJP` | Status `Valid` bila sama, `Perlu perbaikan` bila tidak |
| 3 | `ProtaUnit.order` unik per `(protaProfileId, semester)` | Error bila duplikat |
| 4 | `ProtaUnit.jp` bilangan bulat positif (>0) | Error (sudah di Zod schema) |
| 5 | KO field opsional — bila diisi, `semester1CocurricularJP + semester2CocurricularJP === annualCocurricularJP` | Warning bila tidak konsisten |
| 6 | `phase` konsisten dengan `grade` (VII/VIII/IX → D) | Warning (bukan error, karena bisa saja guru punya interpretasi berbeda) |
| 7 | KO field BUKAN bagian dari validasi material (rule #2). KO hanya catatan struktur, tidak mempengaruhi sum `ProtaUnit.jp`. | Info — tidak ada action, hanya dokumen |
| 8 | `cadanganJP` (di set saat generate Promes, bukan di Prota) TIDAK BOLEH membuat `materialCapacity` negatif. Lihat §5.4 edge case #3. | Error di engine Promes, bukan di Prota editor |

**Catatan penting tentang cadangan:**

Cadangan BUKAN field di ProtaProfile. Cadangan di-set saat generate Promes (di halaman `/promes`). Cadangan adalah **subset dari Intra capacity** — guru memilih berapa JP intra yang dialokasikan untuk asesmen/remedial/pengayaan alih-alih materi. Rumus:

```text
materialCapacity = (effectiveWeeks × intraJpPerWeek) - cadanganJP
```

Bila `cadanganJP > effectiveWeeks × intraJpPerWeek` → error, materialCapacity negatif.

**Tampilan status validasi Prota:**
```
✓ Subtotal Semester 1: 36 JP (target 36) — TEPAT
✓ Subtotal Semester 2: 36 JP (target 36) — TEPAT
✓ Total Tahunan Intra: 72 JP (target 72) — TEPAT
ℹ KO Tahunan: 36 JP (18 JP/semester) — catatan struktur, bukan bagian validasi materi
```

atau:

```
✗ Subtotal Semester 1: 32 JP (target 36) — KURANG 4 JP
✓ Subtotal Semester 2: 36 JP (target 36) — TEPAT
⚠ Total Tahunan Intra: 68 JP (target 72) — KURANG 4 JP
```

### 4.3 Impor Prota JSON

Format JSON input (AI → aplikasi):

```json
{
  "$schema": "guru-admin-flow/prota/v1",
  "subject": "Pendidikan Pancasila",
  "grade": "VII",
  "phase": "D",
  "annualIntraJP": 72,
  "semester1IntraJP": 36,
  "semester2IntraJP": 36,
  "annualCocurricularJP": 36,
  "semester1CocurricularJP": 18,
  "semester2CocurricularJP": 18,
  "units": [
    {
      "semester": 1,
      "title": "Budaya Demokrasi",
      "learningOutcome": "Peserta didik mampu menerapkan sikap demokratis...",
      "jp": 12,
      "order": 1,
      "code": "PP.7.1"
    },
    {
      "semester": 1,
      "title": "Keadilan Sosial",
      "learningOutcome": "Peserta didik mampu memahami prinsip keadilan sosial...",
      "jp": 24,
      "order": 2,
      "code": "PP.7.2"
    }
  ]
}
```

### 4.4 Zod schema untuk import (di `packages/domain/src/prota-import.ts`)

```ts
export const protaImportSchema = z.object({
  $schema: z.literal("guru-admin-flow/prota/v1"),
  subject: z.string().min(1),
  grade: z.string().min(1),
  phase: z.string().min(1),
  annualIntraJP: z.number().int().nonnegative(),
  semester1IntraJP: z.number().int().nonnegative(),
  semester2IntraJP: z.number().int().nonnegative(),
  annualCocurricularJP: z.number().int().nonnegative().optional(),
  semester1CocurricularJP: z.number().int().nonnegative().optional(),
  semester2CocurricularJP: z.number().int().nonnegative().optional(),
  units: z.array(z.object({
    semester: z.union([z.literal(1), z.literal(2)]),
    title: z.string().min(1),
    learningOutcome: z.string().optional(),
    jp: z.number().int().positive(),
    order: z.number().int().nonnegative(),
    code: z.string().optional(),
  })).min(1),
});

export type ProtaImport = z.infer<typeof protaImportSchema>;
```

### 4.5 Status dokumen Prota

- `draft` — default saat baru dibuat/diimpor
- `ready_for_review` — semua validasi pass, guru siap submit ke kepala sekolah
- `final` — kepala sekolah approve (di luar aplikasi, guru update manual)
- `revised` — ada perubahan setelah `final`, snapshot baru dibuat
- `locked` — permanen, tidak bisa diubah

Transisi di Sprint 2:
- `draft → ready_for_review`: semua validasi JP pass (rule #2 di atas)
- `ready_for_review → final`: manual trigger, snapshot dibuat
- `final → revised`: edit data, snapshot baru otomatis
- `final → locked`: manual trigger, permanen

---

## 5. Engine Generate Promes

### 5.1 Filosofi

**Promes = Prota + Kalender + Jadwal Guru** (lihat `GURU_ADMIN_FLOW_REFERENCE.md` §6.4)

Di Sprint 2, **Jadwal Guru belum ada** (Sprint 3). Engine Promes Sprint 2 pakai pendekatan **week-by-week** tanpa jadwal:
- Asumsi: setiap minggu efektif = `intraJpPerWeek` JP untuk **materi** (default 2 untuk PPKn) + `koJpPerWeek` JP untuk **KO row terpisah** (default 1 untuk PPKn)
- Distribusi materi ke minggu efektif secara berurutan, menggunakan **intra capacity saja** (lihat §0 CRITICAL PROMES RULE)
- Cadangan di-reserve dari **intra capacity** minggu (bukan total 3 JP), algoritma diadaptasi dari prototipe HTML dengan koreksi
- KO tampil sebagai **row terpisah** per minggu, BUKAN digabung dengan materi

Di Sprint 3, engine akan di-extend untuk pakai Jadwal Guru asli (distribusi ke sesi konkret per tanggal).

### 5.2 Pure function interface (di `packages/domain/src/promes-engine.ts`)

```ts
/**
 * Engine generate Promes — PURE FUNCTION, tidak ada side effect.
 *
 * Input:
 *  - prota: ProtaProfile (sudah tervalidasi)
 *  - calendar: CalendarEvent[] untuk academicYearId ini
 *  - semester: 1 | 2
 *  - options: { intraJpPerWeek, koJpPerWeek, cadanganJP, koMode }
 *
 * Output:
 *  - PromesResult { weeks, distribution, koRows, summary, status }
 *
 * Aturan (LIHAT §0 CRITICAL PROMES RULE):
 *  - Minggu efektif = calendar event type "learning" yang TIDAK tumpang tindih
 *    dengan event "holiday" / "school_activity" blocksLearning=true
 *  - Kapasitas distribusi MATERI = (mingguEfektif × intraJpPerWeek) - cadanganJP
 *  - KO TIDAK termasuk dalam kapasitas materi. KO tampil sebagai row terpisah
 *    per minggu efektif, dengan koJpPerWeek JP.
 *  - Cadangan di-reserve dari INTRA capacity minggu (bukan total intra+KO),
 *    algoritma: dari minggu terakhir ke depan (reserveFromEnd=true default)
 *  - Cadangan TIDAK BOLEH membuat materialCapacity negatif.
 *    Bila cadanganJP > effectiveWeeks × intraJpPerWeek → error.
 *  - Materi didistribusikan berurutan ke minggu yang tersedia (setelah reserve cadangan)
 *  - Bila materi tidak muat → status "needs_fix" + tampilkan JP belum terdistribusi
 */
export function generatePromes(args: {
  prota: ProtaProfile;
  calendar: CalendarEvent[];
  semester: 1 | 2;
  options: PromesOptions;
}): PromesResult;

export type PromesOptions = {
  /**
   * JP intrakurikuler per minggu untuk distribusi MATERI.
   * Default: 2 (PPKn — sesuai §0.1: 2 JP intra + 1 JP KO = 3 JP/minggu).
   * Untuk mapel lain: user input manual (tidak di-hardcode).
   */
  intraJpPerWeek: number;

  /**
   * JP kokurikuler per minggu — tampil sebagai ROW TERPISAH, BUKAN bagian
   * kapasitas materi. Default: 1 (PPKn). Bisa 0 bila mapel tidak punya KO.
   */
  koJpPerWeek: number;

  /**
   * Cadangan JP — di-reserve dari INTRA capacity, bukan dari total.
   * Default: 6 (untuk asesmen, remedial, pengayaan, penyesuaian kegiatan sekolah).
   * Bisa diedit guru. Tidak boleh membuat materialCapacity negatif.
   */
  cadanganJP: number;

  /** Cadangan di-reserve dari minggu terakhir ke depan. Default: true. */
  reserveFromEnd: boolean;

  /**
   * Mode KO (hanya catatan, tidak ada perhitungan otomatis).
   * - "daily_block": blok harian
   * - "end_of_week": blok akhir minggu
   * - "end_of_semester": blok akhir semester
   * Default: "daily_block"
   */
  koMode?: "daily_block" | "end_of_week" | "end_of_semester";
};

export type PromesResult = {
  weeks: PromesWeek[];
  distribution: UnitDistribution[];  // per ProtaUnit (materi only)
  koRows: KORow[];                    // row KO terpisah per minggu efektif
  summary: PromesSummary;
  status: "valid" | "needs_fix";
  warnings: string[];
  errors: string[];
};

export type PromesWeek = {
  weekNumber: number;       // 1, 2, 3, ...
  startDate: string;        // ISO date (Senin minggu itu)
  endDate: string;          // ISO date (Minggu minggu itu)
  isEffective: boolean;     // true bila ada event "learning" dan tidak diblokir
  blockReason?: string;     // bila isEffective=false, alasan (holiday label, etc.)

  // Intra (material) capacity
  intraCapacityJP: number;       // bila effective: intraJpPerWeek, bila tidak: 0
  reservedForCadangan: number;   // JP intra yang di-reserve untuk cadangan minggu ini
  availableForMaterial: number;  // intraCapacityJP - reservedForCadangan

  // KO capacity (row terpisah, tidak mengurangi material)
  koJP: number;                  // bila effective: koJpPerWeek, bila tidak: 0

  // Material assigned to this week
  assignedUnits: Array<{
    unitId: string;
    title: string;
    jp: number;
  }>;
};

export type KORow = {
  weekNumber: number;
  date: string;          // ISO date (start of week)
  jp: number;            // koJpPerWeek
  mode: "daily_block" | "end_of_week" | "end_of_semester";
  label: string;         // "Alokasi kokurikuler: 1 JP/minggu"
};

export type UnitDistribution = {
  unitId: string;
  title: string;
  totalJP: number;
  distributedJP: number;
  undistributedJP: number;
  weeks: number[]; // weekNumber tempat unit ini diajar
  status: "fully_distributed" | "partially_distributed" | "not_distributed";
};

export type PromesSummary = {
  totalWeeks: number;
  effectiveWeeks: number;

  // Intra (material) — sesuai §0
  intraCapacityJP: number;     // effectiveWeeks × intraJpPerWeek
  cadanganJP: number;
  materialCapacityJP: number;  // intraCapacityJP - cadanganJP (TIDAK boleh negatif)
  totalUnitJP: number;         // sum of ProtaUnit.jp untuk semester ini
  distributedJP: number;
  undistributedJP: number;

  // KO — row terpisah, tidak mempengaruhi material
  koTotalJP: number;           // effectiveWeeks × koJpPerWeek

  allocationStatus: "tepat" | "cukup" | "kurang";
  // tepat: materialCapacityJP === totalUnitJP
  // cukup: materialCapacityJP > totalUnitJP (ada sisa untuk kegiatan lain)
  // kurang: materialCapacityJP < totalUnitJP (materi tidak muat)
};
```

### 5.3 Algoritma distribusi (diadaptasi dari prototipe HTML, dengan koreksi §0)

```text
INPUT:
  - prota: ProtaProfile
  - calendar: CalendarEvent[]
  - semester: 1 | 2
  - options: { intraJpPerWeek, koJpPerWeek, cadanganJP, reserveFromEnd, koMode }

LANGKAH 0: Validasi awal
  bila cadanganJP > (perkiraan effectiveWeeks × intraJpPerWeek):
    → warning (bukan error, karena effectiveWeeks belum diketahui pasti)
    → nanti di LANGKAH 4, bila cadangan > actual capacity → error

LANGKAH 1: Tentukan rentang semester
  semesterStart = prota.academicYear.semester{N}Start
  semesterEnd = prota.academicYear.semester{N}End

LANGKAH 2: Enumerasi minggu-minggu dalam semester (Senin-Minggu)
  weeks = []
  cursor = senin pertama pada/tepat setelah semesterStart
  while cursor <= semesterEnd:
    weekEnd = cursor + 6 hari
    weeks.push({
      weekNumber: weeks.length + 1,
      startDate: cursor,
      endDate: weekEnd,
    })
    cursor = cursor + 7 hari

LANGKAH 3: Tentukan isEffective per minggu
  for each week in weeks:
    learningEvent = calendar.find(e => e.type === "learning" && overlap(week, e))
    blockingEvent = calendar.find(e => e.blocksLearning && overlap(week, e))
    week.isEffective = learningEvent && !blockingEvent
    week.blockReason = blockingEvent?.label

LANGKAH 4: Hitung kapasitas INTRA per minggu (BUKAN total 3 JP)
  for each week in weeks:
    bila week.isEffective:
      week.intraCapacityJP = options.intraJpPerWeek   // PPKn: 2
      week.koJP = options.koJpPerWeek                  // PPKn: 1 (row terpisah)
    else:
      week.intraCapacityJP = 0
      week.koJP = 0
    week.reservedForCadangan = 0  // akan diisi di LANGKAH 5
    week.availableForMaterial = week.intraCapacityJP  // sementara

LANGKAH 5: Reserve cadangan dari INTRA capacity (algoritma prototipe, dengan koreksi)
  totalIntraCapacity = sum of week.intraCapacityJP for effective weeks
  
  bila options.cadanganJP > totalIntraCapacity:
    → ERROR: "Cadangan {cadanganJP} JP melebihi total kapasitas intra {totalIntraCapacity} JP. 
              Kurangi cadangan atau tambah minggu efektif."
    → return PromesResult with status="needs_fix", errors=[...]
  
  cadanganRemaining = options.cadanganJP
  bila options.reserveFromEnd:
    for week from last to first:
      bila week.isEffective and cadanganRemaining > 0:
        take = min(week.intraCapacityJP, cadanganRemaining)
        week.reservedForCadangan = take
        cadanganRemaining -= take
  else:
    for week from first to last:
      (sama seperti di atas)
  
  for each week:
    week.availableForMaterial = week.intraCapacityJP - week.reservedForCadangan

LANGKAH 6: Distribusikan materi ke minggu availableForMaterial
  units = prota.units.filter(u => u.semester === semester).sort(by order)
  unitQueue = [{ unit, remainingJP: unit.jp } for unit in units]
  
  for week in weeks (effective only):
    weekAvailable = week.availableForMaterial
    while weekAvailable > 0 and unitQueue not empty:
      current = unitQueue[0]
      assign = min(current.remainingJP, weekAvailable)
      week.assignedUnits.push({ unitId, title, jp: assign })
      current.remainingJP -= assign
      weekAvailable -= assign
      bila current.remainingJP === 0:
        unitQueue.shift()

LANGKAH 7: Generate KO rows (row terpisah, BUKAN bagian distribusi materi)
  koRows = []
  for week in weeks (effective only):
    bila week.koJP > 0:
      koRows.push({
        weekNumber: week.weekNumber,
        date: week.startDate,
        jp: week.koJP,
        mode: options.koMode,
        label: `Alokasi kokurikuler: ${week.koJP} JP/minggu (${options.koMode})`
      })

LANGKAH 8: Hitung distribution per unit
  for each unit:
    distributedJP = sum of assigned across all weeks
    undistributedJP = unit.jp - distributedJP
    status = fully_distributed | partially_distributed | not_distributed

LANGKAH 9: Hitung summary & status
  totalIntraCapacity = sum of week.intraCapacityJP (effective only)
  cadanganJP = options.cadanganJP
  materialCapacityJP = totalIntraCapacity - cadanganJP  // TIDAK boleh negatif
  totalUnitJP = sum of unit.jp untuk semester ini
  distributedJP = sum of unit.distributedJP
  undistributedJP = totalUnitJP - distributedJP
  
  koTotalJP = sum of week.koJP (effective only)
  
  allocationStatus:
    "tepat"  bila materialCapacityJP === totalUnitJP
    "cukup"  bila materialCapacityJP > totalUnitJP
    "kurang" bila materialCapacityJP < totalUnitJP
  
  status:
    "valid"     bila undistributedJP === 0
    "needs_fix" bila undistributedJP > 0

OUTPUT: PromesResult { weeks, distribution, koRows, summary, status, warnings, errors }
```

### 5.4 Edge cases yang wajib ditangani

| # | Case | Behavior |
|---|---|---|
| 1 | Tidak ada event "learning" di kalender | status="needs_fix", error="Kalender belum punya minggu efektif KBM. Impor kalender dulu." |
| 2 | Semua minggu diblokir holiday | Sama seperti #1 |
| 3 | **`cadanganJP > totalIntraCapacity`** (effectiveWeeks × intraJpPerWeek) | **ERROR** (bukan warning): "Cadangan {X} JP melebihi total kapasitas intra {Y} JP. Kurangi cadangan atau tambah minggu efektif." materialCapacityJP tidak boleh negatif. |
| 4 | `totalUnitJP === 0` (semester ini tidak ada unit) | Error: "Tidak ada materi untuk semester ini. Tambahkan unit di Prota dulu." |
| 5 | `cadanganJP === 0` | OK, semua intra kapasitas untuk materi. Reserve di-skip. KO row tetap muncul. |
| 6 | Minggu efektif partial (1-2 hari libur dalam seminggu) | Tetap effective=true dengan catatan (bukan blok penuh) — tidak di Sprint 2, default ke effective=true or false berdasarkan kalender |
| 7 | Materi lebih besar dari kapasitas 1 minggu | Auto-split ke minggu berikutnya (lihat LANGKAH 6, while loop) |
| 8 | Prota `status` bukan `draft` atau `ready_for_review` | Tolak generate, minta user ubah Prota ke draft dulu |
| 9 | Semester kosong di Prota (tidak ada unit) | Sama seperti #4 |
| 10 | Tahun pelajaran tidak aktif | Warning: "Tahun pelajaran tidak aktif. Generate tetap dilanjutkan, tapi pastikan ini benar." |
| 11 | **`koJpPerWeek === 0`** (mapel tanpa KO) | OK, tidak ada KO row di output. Material distribusi normal dengan intraJpPerWeek saja. |
| 12 | **`intraJpPerWeek === 0`** (tidak masuk akal, tapi defensive) | Error: "intraJpPerWeek harus > 0. Tidak ada kapasitas untuk distribusi materi." |
| 13 | **KO mode berbeda** (`daily_block` vs `end_of_week` vs `end_of_semester`) | Hanya affect label di KO row, tidak affect perhitungan. Semua mode menghasilkan koJpPerWeek JP per minggu efektif. |

### 5.5 Test plan untuk engine Promes

Engine adalah pure function → mudah di-unit test. Target coverage: 95%+.

```text
File: packages/domain/test/promes-engine.test.ts

Test cases (updated untuk §0 CRITICAL PROMES RULE):

1. Happy path PPKn: Prota 36 JP intra/semester + Kalender 18 minggu efektif
   + intraJpPerWeek=2 + koJpPerWeek=1 + cadangan=6
   → totalIntraCapacity = 18 × 2 = 36 JP
   → materialCapacityJP = 36 - 6 = 30 JP
   → bila totalUnitJP = 30, status="valid", allocationStatus="tepat"
   → koRows: 18 row × 1 JP = 18 JP total (row terpisah)
   → koTotalJP = 18 (TIDAK mengurangi materialCapacityJP)

2. Allocation "cukup": totalUnitJP < materialCapacityJP
   → status="valid", sisa JP di minggu terakhir untuk kegiatan lain
   → koRows tetap 18 row

3. Allocation "kurang": totalUnitJP > materialCapacityJP
   → status="needs_fix", tampilkan JP belum terdistribusi per unit
   → koRows tetap dihasilkan (KO tidak terpengaruh)

4. Cadangan 0: semua intra kapasitas untuk materi
   → materialCapacityJP = 36 JP (bukan 30)
   → status="valid" bila totalUnitJP = 36
   → koRows tetap 18 row × 1 JP

5. Cadangan > total intra capacity: ERROR (bukan warning)
   → cadangan=40, intraCapacity=36 → error, status="needs_fix"
   → materialCapacityJP tidak negatif (clamped ke 0 atau error sebelum distribusi)

6. Kalender tanpa event "learning": error
   → status="needs_fix", error message jelas
   → koRows kosong (tidak ada minggu efektif)

7. Unit lebih besar dari 1 minggu: auto-split
   → unit 12 JP dengan intraJpPerWeek=2 → 6 minggu (bukan 4 minggu seperti prototipe lama)

8. Reserve dari belakang: minggu terakhir full cadangan
   → cadangan=6, intraJpPerWeek=2: minggu 16, 17, 18 full cadangan (2+2+2)
   → minggu 1-15 untuk materi (15 × 2 = 30 JP)

9. Holiday di tengah semester: minggu itu not effective
   → intraCapacityJP = 0, koJP = 0 untuk minggu itu
   → distribusi skip, koRows skip

10. Prota status "final" ditolak: error
    → "Prota berstatus final. Ubah ke draft dulu."

11. Semester 2 dengan kalender semester 1: error
    → "Tidak ada minggu efektif untuk semester 2 di rentang ini."

12. Empty calendar events: error
    → "Kalender kosong. Impor kalender dulu."

13. KO row terpisah verification (KRITIS — verifikasi §0 rule):
    → generate dengan PPKn (intra=2, KO=1, 18 minggu)
    → assert koRows.length === 18
    → assert setiap koRow.jp === 1
    → assert materialCapacityJP === 30 (bukan 48 = 18×3-6)
    → assert koTotalJP === 18
    → assert koTotalJP TIDAK mengurangi materialCapacityJP

14. Mapel tanpa KO (koJpPerWeek=0):
    → koRows = [] (kosong)
    → materialCapacityJP = effectiveWeeks × intraJpPerWeek - cadangan
    → distribusi materi normal

15. Cadangan membuat materialCapacityJP = 0 (boundary):
    → cadangan=36, intraCapacity=36 → materialCapacityJP=0
    → status="needs_fix", tidak ada materi terdistribusi
    → koRows tetap dihasilkan

16. KO mode "end_of_semester":
    → semua koRow.mode = "end_of_semester"
    → label: "Alokasi kokurikuler: 1 JP/minggu (end_of_semester)"
    → koRow.jp tetap 1 per minggu (mode hanya catatan, tidak affect perhitungan)
```

---

## 6. Preview Promes

### 6.1 UI spec — halaman `/promes`

**Layout (updated untuk §0 CRITICAL PROMES RULE — KO row terpisah):**

```
┌─────────────────────────────────────────────────────────┐
│ Program Semester — TP 2025/2026                         │
├─────────────────────────────────────────────────────────┤
│ [Mapel: PPKn ▼] [Kelas: VII ▼] [Semester: 1 ▼]         │
│ [Intra JP/Minggu: 2] [KO JP/Minggu: 1] [Cadangan: 6]   │
│ [Mode KO: blok harian ▼]                                │
│ [Generate Promes]                                       │
├─────────────────────────────────────────────────────────┤
│ Status: [✓ Valid] atau [⚠ Perlu Perbaikan]             │
│                                                         │
│ Ringkasan (sesuai §0):                                  │
│   Total minggu: 18                                      │
│   Minggu efektif: 18                                    │
│                                                         │
│   INTRAKURIKULER (materi):                              │
│     Kapasitas intra: 36 JP (18 × 2)                     │
│     Cadangan: 6 JP                                      │
│     Available untuk materi: 30 JP                       │
│     Materi (Prota): 30 JP                               │
│     Terdistribusi: 30 JP ✓                              │
│     Belum terdistribusi: 0 JP                           │
│                                                         │
│   KOKURIKULER (row terpisah):                           │
│     Total KO: 18 JP (18 × 1)                            │
│     Mode: blok harian                                   │
├─────────────────────────────────────────────────────────┤
§ Tabel Distribusi Mingguan (Intra + KO row terpisah)     │
┌────┬──────────┬─────────┬──────────┬──────────────────┐ │
│ Mg │ Tanggal  │ Efektif │ Intra JP │ Materi / KO      │ │
├────┼──────────┼─────────┼──────────┼──────────────────┤ │
│ 1  │ 14 Jul   │ ✓       │ 2 (mat)  │ Budaya Demokrasi │ │
│    │          │         │ 1 (KO)   │ KO: blok harian  │ │
│ 2  │ 21 Jul   │ ✓       │ 2 (mat)  │ Budaya Demokrasi │ │
│    │          │         │ 1 (KO)   │ KO: blok harian  │ │
│ ...                                                     │ │
│ 16 │ 24 Nov   │ ✓       │ 2 (cad)  │ (cadangan)       │ │
│    │          │         │ 1 (KO)   │ KO: blok harian  │ │
│ 17 │ 1 Des    │ ✓       │ 2 (cad)  │ (cadangan)       │ │
│    │          │         │ 1 (KO)   │ KO: blok harian  │ │
│ 18 │ 8 Des    │ ✓       │ 2 (cad)  │ (cadangan)       │ │
│    │          │         │ 1 (KO)   │ KO: blok harian  │ │
└────┴──────────┴─────────┴──────────┴──────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ § Status per Materi (intra only)                        │
│ ✓ Budaya Demokrasi (12 JP) — terdistribusi penuh (Mg 1-6)│
│ ✓ Keadilan Sosial (18 JP) — terdistribusi penuh (Mg 7-15)│
│ ...                                                     │
├─────────────────────────────────────────────────────────┤
│ § Row Kokurikuler (catatan, bukan materi)               │
│ ℹ 18 row KO × 1 JP = 18 JP total                        │
│ ℹ Mode: blok harian                                     │
│ ℹ Solver KO: urusan Smart Roster / Waka Kurikulum       │
├─────────────────────────────────────────────────────────┤
│ [Cetak Preview]                                         │
└─────────────────────────────────────────────────────────┘
```

**Catatan penting UI:**
- Setiap minggu efektif punya **2 row**: 1 row intra (materi/cadangan) + 1 row KO
- Row intra diwarnai hijau muda (materi) atau kuning (cadangan)
- Row KO diwarnai abu-abu atau oranye, dengan label "KO: {mode}"
- Total per minggu = 3 JP (2 intra + 1 KO), tapi **tidak digabung** di tabel — tetap terpisah
- Bila `koJpPerWeek = 0` (mapel tanpa KO), row KO tidak muncul

### 6.2 Tampilan status

| Status | Tampilan | Kondisi |
|---|---|---|
| ✓ Valid (tepat) | Badge hijau | `allocationStatus === "tepat"` |
| ✓ Valid (cukup) | Badge hijau + "X JP sisa" | `allocationStatus === "cukup"` |
| ⚠ Perlu Perbaikan | Badge kuning + detail JP kurang | `status === "needs_fix"` |
| ✗ Error | Badge merah + error message | Ada error (kalender kosong, Prota final, dst) |

### 6.3 Tabel distribusi

Column:
- **Minggu** (nomor 1-24)
- **Tanggal** (rentang Senin-Minggu, format pendek Indonesia)
- **Efektif** (✓ atau ✗ dengan tooltip alasan)
- **Cadangan** (JP yang di-reserve)
- **Materi** (judul unit + JP, bila ada)

Bila `!isEffective`, row diwarnai abu-abu, kolom Materi menampilkan alasan (mis. "Libur HUT RI ke-80").

### 6.4 Persistensi Promes

Sprint 2: **tidak persist** — Promes di-generate on-demand dari Prota + Kalender. Setiap kali user buka halaman /promes, engine jalan ulang.

Sprint 3+: Tambah entitas `PromesDocument` untuk simpan hasil generate + snapshot saat status `final`. Memungkinkan dokumen Promes final dipreservasi bahkan setelah Prota/Kalender berubah.

Alasan tidak persist di Sprint 2:
- Engine adalah pure function, regenerasi cepat (<100ms)
- Hindari inkonsistensi: Promes selalu reflect Prota + Kalender saat ini
- Sederhanakan UX: tidak ada "Promes stale" yang perlu di-refresh

### 6.5 Cetak preview

Sprint 2: tampilkan view print-friendly (CSS `@media print`). Format A4, judul + identitas sekolah + tabel distribusi + tanda tangan.

Ekspor PDF/DOCX: Sprint 5 (bersama laporan semester).

---

## 7. Acceptance Criteria Sprint 2

### 7.1 Modul M02 Kalender

- [ ] Halaman `/calendar` dapat menampilkan daftar event untuk tahun pelajaran aktif
- [ ] Tombol "Impor JSON" dapat menerima paste JSON atau file .json
- [ ] Validasi impor menolak JSON dengan `$schema` salah
- [ ] Validasi impor menolak JSON dengan `academicYearLabel` yang tidak ada di lokal
- [ ] Konfirmasi eksplisit sebelum replace kalender existing
- [ ] Setelah impor, event lama di-soft-delete, event baru disimpan dengan `source: "ai_import"`
- [ ] Form tambah/edit event dapat menyimpan ke Dexie
- [ ] Soft delete bekerja (event tetap di DB dengan `deletedAt` terisi, tidak tampil di daftar)
- [ ] Preview semester menampilkan kalender bulanan dengan color coding per jenis event
- [ ] Filter by semester/jenis/scope bekerja

### 7.2 Modul M03 Prota

- [ ] Halaman `/prota` dapat menampilkan ProtaProfile per (subject, grade, academicYear)
- [ ] Form input Prota dapat menyimpan identitas (target JP intra + KO)
- [ ] Form daftar materi dapat tambah/edit/hapus ProtaUnit
- [ ] Validasi real-time: subtotal JP per semester vs target
- [ ] Status `Valid` bila subtotal = target, `Perlu perbaikan` bila tidak
- [ ] Impor JSON Prota dapat menerima format `guru-admin-flow/prota/v1`
- [ ] Validasi impor menolak JSON dengan $schema salah
- [ ] Transisi status `draft → ready_for_review` hanya bila semua validasi pass
- [ ] Transisi `ready_for_review → final` membuat DocumentSnapshot
- [ ] Transisi `final → revised` membuat snapshot baru
- [ ] Transisi `final → locked` permanen

### 7.3 Modul M04 Promes

- [ ] Halaman `/promes` dapat memilih (subject, grade, semester) untuk generate
- [ ] Input `intraJpPerWeek`, `koJpPerWeek`, `cadanganJP`, dan `koMode` dapat diatur user
- [ ] Default PPKn: intraJpPerWeek=2, koJpPerWeek=1, cadanganJP=6, koMode="daily_block"
- [ ] Untuk mapel selain PPKn: tidak ada default hardcoded, user input manual
- [ ] Tombol "Generate Promes" memanggil engine pure function
- [ ] Engine return `PromesResult` dengan weeks, distribution, **koRows**, summary, status
- [ ] Tabel distribusi mingguan menampilkan **2 row per minggu**: row intra (materi/cadangan) + row KO terpisah
- [ ] **KO row terpisah** — KO TIDAK digabung dengan materi (verifikasi §0 rule)
- [ ] Status `Valid` (tepat/cukup) atau `Perlu Perbaikan` ditampilkan dengan jelas
- [ ] Ringkasan menampilkan INTRA (materialCapacityJP) dan KO (koTotalJP) sebagai section terpisah
- [ ] Bila `needs_fix`, tampilkan detail: JP kurang, unit yang tidak terdistribusi
- [ ] Bila `cadanganJP > totalIntraCapacity`, tampilkan ERROR (bukan warning)
- [ ] Bila error (kalender kosong, Prota final, dst), tampilkan error message jelas
- [ ] Cetak preview (`@media print`) menghasilkan dokumen A4 yang rapi dengan row KO terpisah
- [ ] Engine regenerasi on-demand (tidak persist di Sprint 2)

### 7.4 Engine Promes (pure function)

- [ ] `generatePromes()` ada di `packages/domain/src/promes-engine.ts`
- [ ] Pure function: tidak ada side effect, tidak baca dari Dexie
- [ ] Input: ProtaProfile, CalendarEvent[], semester, options (intraJpPerWeek, koJpPerWeek, cadanganJP, reserveFromEnd, koMode)
- [ ] Output: PromesResult (weeks, distribution, **koRows**, summary, status, warnings, errors)
- [ ] **Material capacity = (effectiveWeeks × intraJpPerWeek) - cadanganJP** (BUKAN pakai total 3 JP)
- [ ] **KO rows terpisah** — koTotalJP TIDAK mengurangi materialCapacityJP
- [ ] **Cadangan tidak boleh membuat materialCapacityJP negatif** — bila terjadi, return error
- [ ] Handle 13 edge cases (lihat §5.4)
- [ ] Unit test coverage ≥ 95%
- [ ] Test case happy path + 15 edge cases (lihat §5.5, total 16 test)
- [ ] Test case #13 (KO row terpisah verification) WAJIB pass — ini verifikasi §0 CRITICAL PROMES RULE

### 7.5 Lintas modul

- [ ] Tidak ada modul Sprint 3+ yang ikut dikerjakan (jadwal, absensi, jurnal, laporan)
- [ ] Tidak ada dependency Supabase
- [ ] CI workflow PASS (typecheck, test, build, audit)
- [ ] Worklog diperbarui
- [ ] Dokumen kontrak diperbarui bila ada perubahan scope/data model

---

## 8. File Structure Sprint 2

### 8.1 File baru

```text
packages/domain/src/
├── calendar-import.ts        # Zod schema + parse for calendar JSON import
├── prota-import.ts           # Zod schema + parse for prota JSON import
├── promes-engine.ts          # Pure function generatePromes + types
├── promes-types.ts           # PromesWeek, UnitDistribution, PromesSummary, PromesResult
└── rules/
    └── promes-rules.ts       # Validation rules specific to Promes generation

packages/domain/test/
├── calendar-import.test.ts   # Test calendar import validation
├── prota-import.test.ts      # Test prota import validation
└── promes-engine.test.ts     # Test 12 cases (happy path + 11 edge cases)

apps/teacher-admin/src/modules/
├── calendar/
│   ├── CalendarPage.tsx       # Halaman /calendar
│   ├── components/
│   │   ├── EventList.tsx      # Daftar event
│   │   ├── EventForm.tsx      # Form tambah/edit
│   │   ├── ImportModal.tsx    # Modal impor JSON
│   │   └── SemesterPreview.tsx # Kalender bulanan
│   └── index.ts
├── prota/
│   ├── ProtaPage.tsx          # Halaman /prota
│   ├── components/
│   │   ├── ProtaIdentityForm.tsx  # Form identitas Prota
│   │   ├── UnitList.tsx           # Daftar unit per semester
│   │   ├── UnitForm.tsx           # Form tambah/edit unit
│   │   ├── ImportModal.tsx        # Modal impor JSON
│   │   └── ValidationPanel.tsx    # Panel status validasi JP
│   └── index.ts
└── promes/
    ├── PromesPage.tsx         # Halaman /promes
    ├── components/
    │   ├── GeneratePanel.tsx   # Panel input (subject, grade, semester, options)
    │   ├── ResultSummary.tsx   # Ringkasan hasil generate
    │   ├── WeekTable.tsx       # Tabel distribusi mingguan
    │   ├── UnitStatusList.tsx  # Status per unit
    │   └── PrintView.tsx       # View print-friendly
    └── index.ts

apps/teacher-admin/src/shared/db/
├── calendar-repo.ts           # CRUD for CalendarEvent (extend dari Sprint 1)
├── prota-repo.ts              # CRUD for ProtaProfile + ProtaUnit
└── (promes-repo tidak ada di Sprint 2 — tidak persist)
```

### 8.2 File yang diubah

```text
apps/teacher-admin/src/App.tsx
  - Tambah route: /calendar, /prota, /promes
  - Tambah import 3 modul baru

apps/teacher-admin/src/shared/layout/AppShell.tsx
  - Tambah menu: Kalender, Prota, Promes (di antara "Profil" dan "Tahun Baru")

apps/teacher-admin/src/routes/TodayPage.tsx
  - Update status sprint checklist (centang Sprint 2 items)

packages/domain/src/index.ts
  - Export calendar-import, prota-import, promes-engine, promes-types

packages/shared/src/constants.ts
  - Tambah: CALENDAR_IMPORT_SCHEMA = "guru-admin-flow/calendar/v1"
  - Tambah: PROTA_IMPORT_SCHEMA = "guru-admin-flow/prota/v1"
  - Tambah: DEFAULT_JP_PER_WEEK = 3
  - Tambah: DEFAULT_CADANGAN_JP = 6
```

### 8.3 Dependensi antar file

```text
calendar-import.ts     → zod, calendar-event.ts (reuse schema)
prota-import.ts        → zod, prota.ts (reuse schema)
promes-engine.ts       → prota.ts, calendar-event.ts, promes-types.ts, date utils
promes-types.ts        → (no internal deps, pure types)

CalendarPage           → calendar-repo, calendar-import (validation), shared/ui
ProtaPage              → prota-repo, prota-import (validation), shared/ui
PromesPage             → prota-repo, calendar-repo, promes-engine, shared/ui
```

---

## 9. Risiko & Mitigasi

| # | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| 1 | Format JSON dari AI tidak konsisten (guru paste dengan format berbeda) | Tinggi | Schema Zod strict + pesan error jelas + contoh JSON di panduan user |
| 2 | Engine Promes punya bug logika distribusi | Tinggi | Pure function + 16 test case wajib pass sebelum merge (termasuk test #13 KO row terpisah verification) |
| 3 | Performa generate Promes lambat untuk kalender besar (>100 event) | Sedang | Engine pure function, eksekusi <100ms untuk 50 minggu. Monitor di Sprint 3+ bila perlu |
| 4 | User bingung dengan status `draft` vs `ready_for_review` Prota | Sedang | Tooltip + helper text di UI. Status transisi hanya bisa dilakukan bila validasi pass |
| 5 | Tabel distribusi mingguan terlalu lebar di mobile (2 row per minggu: intra + KO) | Sedang | Responsive: collapse ke card view di mobile (1 card per minggu berisi intra + KO), expand ke tabel di desktop |
| 6 | Cetak preview tidak rapi di browser berbeda | Rendah | Pakai CSS `@media print` standard, uji di Chrome + Firefox + Safari |
| 7 | Soft delete event menyebabkan kalender "hilang" tanpa sadar | Sedang | Tampilkan konfirmasi + indikator visual "X event di-soft-delete" + opsi restore di Sprint 3+ |
| 8 | Import kalender replace tanpa sadar menghapus yang penting | Tinggi | Konfirmasi ekspliksit + auto-backup ke DocumentSnapshot sebelum replace (Sprint 2: log only, Sprint 3+: snapshot) |
| 9 | Validasi JP "warning" vs "error" membingungkan | Sedang | Bedakan visual: warning = kuning, error = merah. Warning tidak block simpan, error block |
| 10 | Engine Promes mengandalkan jadwal dummy (intraJpPerWeek) → hasil tidak realistis | Tinggi (sementara) | Disclaimer jelas di UI: "Sprint 2 pakai asumsi X JP intra/minggu. Sprint 3 akan pakai jadwal guru asli." + opsi adjust intraJpPerWeek manual |
| 11 | **Dev/AI berikutnya ulangi kesalahan prototipe lama (3 JP/minggu = kapasitas materi)** | **TINGGI** | §0 CRITICAL PROMES RULE prominently di atas dokumen + test case #13 wajib pass + komentar inline di kode engine + review wajib cek `materialCapacityJP` formula |
| 12 | Cadangan diset terlalu besar oleh guru → materialCapacityJP negatif | Sedang | Engine return ERROR (bukan warning) bila `cadanganJP > totalIntraCapacity`. UI disable generate bila preview menunjukkan akan error |
| 13 | KO row membingungkan guru (dia kira KO = materi) | Sedang | Label jelas "KO: {mode} — BUKAN materi" + section terpisah "Row Kokurikuler (catatan, bukan materi)" + tooltip penjelasan |

---

## 10. Estimasi & Pendekatan Eksekusi

### 10.1 Estimasi ukuran

| Bagian | File baru | LoC estimasi | Test case |
|---|---|---|---|
| Schema import (calendar + prota) | 2 | 200 | 20 |
| Engine Promes | 2 (engine + types) | 350 | 12 |
| Repo Dexie (calendar + prota) | 2 | 250 | - |
| UI Kalender | 5 (page + 4 components) | 600 | - |
| UI Prota | 5 (page + 4 components) | 700 | - |
| UI Promes | 5 (page + 4 components) | 500 | - |
| Update App.tsx + AppShell + TodayPage | 3 diubah | 50 | - |
| **Total** | **24 file** | **~2.650 LoC** | **32 test** |

### 10.2 Urutan eksekusi (setelah PR #1 merge)

```text
1. packages/domain: calendar-import.ts + prota-import.ts + promes-engine.ts + promes-types.ts
   → Unit test untuk semua (32 test)
   → typecheck + test pass

2. apps/teacher-admin/src/shared/db: calendar-repo.ts + prota-repo.ts
   → typecheck pass

3. apps/teacher-admin/src/modules/calendar: CalendarPage + 4 components
   → Manual test: impor JSON, edit, preview

4. apps/teacher-admin/src/modules/prota: ProtaPage + 4 components
   → Manual test: input manual, impor JSON, validasi JP

5. apps/teacher-admin/src/modules/promes: PromesPage + 4 components
   → Manual test: generate dari Prota + Kalender existing

6. Update App.tsx (routes), AppShell (menu), TodayPage (status)
   → Build pass

7. Manual smoke test end-to-end:
   a. Impor kalender JSON hasil AI
   b. Input Prota manual atau impor JSON
   c. Validasi JP 72/36/36 pass
   d. Generate Promes semester 1
   e. Status Valid
   f. Generate Promes semester 2
   g. Cetak preview

8. Commit + push branch sprint-2-calendar-prota-promes
9. Buat PR #2
10. Tunggu CI PASS + audit
11. Merge to main
12. SPRINT 2 — CLOSED
```

### 10.3 Branch strategy

```text
main (Sprint 1 merged)
  └── sprint-2-design (DESIGN DOC ONLY, this branch)
        ↑
        Design doc di-merge ke main duluan (sebelum coding Sprint 2)

main (Sprint 2 design merged)
  └── sprint-2-calendar-prota-promes (EXECUTION BRANCH)
        ↑
        Semua kode produksi Sprint 2 di sini
```

---

## 11. Keputusan Senior Dev (7 Pertanyaan Sudah Dijawab)

7 pertanyaan di v0.1 sudah dijawab senior dev. Keputusan final:

### 11.1 Format JSON kalender dan Prota — SETUJU

- Kalender: `guru-admin-flow/calendar/v1`
- Prota: `guru-admin-flow/prota/v1`
- Syarat wajib field: `schemaVersion`, `academicYear`, `semester`, `source`, `events`/`units`, `createdAt`
- JSON divalidasi sebelum masuk database (Zod schema)

### 11.2 Default jpPerWeek — KOREKSI KRITIS (lihat §0)

- **PPKn: 3 JP struktur = 2 JP intra (materi) + 1 JP KO (row terpisah)**
- Untuk distribusi materi Promes: hanya 2 JP intra dihitung sebagai kapasitas materi
- 1 JP KO tampil sebagai row terpisah/catatan
- Mapel lain: **tidak di-hardcode**, user input manual
- Engine pakai `intraJpPerWeek` (bukan `jpPerWeek`) — lihat §5.2

### 11.3 Cadangan default — SETUJU dengan batasan

- Default: 6 JP
- Bisa diedit guru
- **Tidak boleh membuat total distribusi materi menjadi negatif** (error bila terjadi)
- Cadangan dipakai untuk: asesmen, remedial, pengayaan, penyesuaian kegiatan sekolah
- Cadangan di-reserve dari INTRA capacity (bukan total 3 JP) — lihat §0.3

### 11.4 KO / Kokurikuler — SEDERHANA, BUKAN SOLVER

- Cukup field dan row terpisah
- Tidak perlu UI khusus kompleks
- KO tidak dihitung per mapel secara rumit
- KO tidak ditelusuri kontribusinya per materi
- KO cukup tampil sebagai: "Alokasi kokurikuler: 1 JP/minggu / 18 JP semester"
- Mode KO hanya catatan: `daily_block` | `end_of_week` | `end_of_semester`
- **Jangan membuat solver KO di Guru Admin. Itu urusan Smart Roster / Waka.**

### 11.5 Persistensi Promes — SETUJU tidak persist di Sprint 2

- Sprint 2: generate on-demand, preview, print sederhana, validasi
- Persistensi dokumen Promes final masuk setelah engine stabil (Sprint 3+)
- Alasan: bila Kalender/Prota berubah, Promes bisa di-generate ulang

### 11.6 Cetak preview — SETUJU CSS only

- Sprint 2: CSS `@media print` saja
- Belum perlu: PDF export, DOCX export, Excel export kompleks
- Ekspor resmi masuk Sprint 5 bersama laporan semester

### 11.7 Multi-mapel per generate — SETUJU single mapel

- Sprint 2: 1 mapel, 1 kelas, 1 semester, 1 generate
- Multi-mapel: Sprint 3+
- Jangan membuat Sprint 2 melebar

### 11.8 Catatan penting Promes (KONTRAK FINAL)

```text
Pendidikan Pancasila SMP:
  Total struktur     : 108 JP/tahun
  Intrakurikuler    :  72 JP/tahun  (36 JP/semester)
  Kokurikuler       :  36 JP/tahun  (18 JP/semester)

Promes materi:
  Yang didistribusikan ke materi = 72 JP/tahun intrakurikuler (intra only)
  Kokurikuler = row/catatan terpisah
  Cadangan = penyesuaian internal guru (subset dari intra, BUKAN tambahan)

Rumus final engine Promes Sprint 2:
  Promes materi = intra JP
  KO = row terpisah
  Cadangan = penyesuaian internal guru
```

**Jangan ulangi kesalahan prototipe lama** yang memperlakukan semua 3 JP/minggu sebagai kapasitas distribusi materi.

---

## 12. Riwayat Revisi Design Doc

| Versi | Tanggal | Perubahan | Penanggung Jawab |
|---|---|---|---|
| v0.1 | Pre-merge Sprint 1 | Draft awal design Sprint 2 (12 section, 1.006 baris) | Senior dev (main) |
| v0.2 | Post senior dev review | **KOREKSI KRITIS**: tambah §0 CRITICAL PROMES RULE (108=72 intra+36 KO, material=intra only, KO=row terpisah). Update §1.2 non-goals (tambah solver KO). Update §4.2 validasi JP (cadangan subset intra). Update §5.2 engine interface (intraJpPerWeek + koJpPerWeek, hapus jpPerWeek=3). Update §5.3 algoritma (cadangan dari intra, KO row terpisah). Update §5.4 edge cases (13 case, cadangan>intra=ERROR). Update §5.5 test plan (16 test, test #13 KO verification). Update §6.1 UI (2 row per minggu: intra+KO). Update §7 AC (KO row + cadangan tidak negatif). Update §9 risiko (3 risiko baru). Ganti §11 dari 7 pertanyaan → keputusan final senior dev. | Senior dev (main) |
