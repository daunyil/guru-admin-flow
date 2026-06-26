/**
 * JOURNAL-REVIEW-NARRATIVE-03 — Helper narasi jurnal mengajar.
 *
 * Mengubah input terstruktur (materi + activities + respons siswa + kendala +
 * tindak lanjut) menjadi kalimat naratif yang rapi dan mengalir, cocok untuk
 * laporan administrasi guru.
 *
 * Aturan bahasa (lihat sprint instruction §7):
 *  - Bahasa baku
 *  - Ringkas dan mengalir
 *  - Tidak sekadar menyalin kata chip mentah ("diskusi, tanya jawab, latihan")
 *  - Harus menjadi kalimat lengkap
 *
 * Pure function. Tidak ada side-effect. Tidak butuh DB.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface JournalNarrativeInput {
  /** Materi / pokok bahasan aktual (bisa dari Prota atau input guru). */
  material?: string;
  /** Daftar kegiatan pembelajaran (chip quick choices). */
  activities?: string[];
  /** Respons siswa (contoh: "Aktif", "Cukup aktif", "Masih pasif"). */
  studentResponse?: string;
  /** Kendala atau catatan tambahan. */
  obstacle?: string;
  /** Rencana tindak lanjut. */
  followUp?: string;
  /** Catatan bebas tambahan dari guru (akan masuk noteNarrative bila ada). */
  freeNote?: string;
}

export interface JournalNarrativeResult {
  /** Narasi kegiatan pembelajaran. */
  activityNarrative: string;
  /** Narasi catatan / respons siswa / kendala. */
  noteNarrative: string;
  /** Narasi tindak lanjut. */
  followUpNarrative: string;
}

/* ------------------------------------------------------------------ */
/*  Quick choices constants                                            */
/* ------------------------------------------------------------------ */

/**
 * Quick choices untuk input terstruktur jurnal.
 * UI boleh pakai ini atau mendefinisikan sendiri — domain hanya menyediakan
 * referensi agar konsisten lintas halaman.
 */
export const JOURNAL_ACTIVITY_CHOICES: readonly string[] = [
  "Diskusi",
  "Tanya jawab",
  "Latihan",
  "Presentasi",
  "Kerja kelompok",
  "Refleksi",
  "Penguatan materi",
] as const;

export const JOURNAL_RESPONSE_CHOICES: readonly string[] = [
  "Aktif",
  "Cukup aktif",
  "Masih pasif",
  "Perlu bimbingan",
  "Antusias",
] as const;

export const JOURNAL_OBSTACLE_CHOICES: readonly string[] = [
  "Sebagian siswa belum memahami materi",
  "Waktu pembelajaran terbatas",
  "Sebagian siswa belum aktif",
  "Tidak ada kendala berarti",
] as const;

export const JOURNAL_FOLLOWUP_CHOICES: readonly string[] = [
  "Penguatan materi",
  "Latihan tambahan",
  "Bimbingan individu",
  "Remedial ringan",
  "Dilanjutkan pertemuan berikutnya",
] as const;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Buat daftar aktivitas menjadi frasa yang mengalir.
 * Contoh: ["Diskusi", "Tanya jawab", "Latihan"] → "diskusi, tanya jawab, dan latihan"
 */
function joinActivities(activities: string[]): string {
  const cleaned = activities
    .map((a) => String(a ?? "").trim())
    .filter((a) => a.length > 0);
  if (cleaned.length === 0) return "";
  if (cleaned.length === 1) return cleaned[0].toLowerCase();
  if (cleaned.length === 2) return `${cleaned[0].toLowerCase()} dan ${cleaned[1].toLowerCase()}`;
  const head = cleaned.slice(0, -1).map((a) => a.toLowerCase()).join(", ");
  const tail = cleaned[cleaned.length - 1].toLowerCase();
  return `${head}, dan ${tail}`;
}

/**
 * Kapitalisasi huruf pertama kalimat.
 */
function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Normalize whitespace (collapse multiple spaces, trim).
 */
function normalizeText(text: string): string {
  return String(text ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

/* ------------------------------------------------------------------ */
/*  buildJournalNarrative                                              */
/* ------------------------------------------------------------------ */

/**
 * Bangun narasi jurnal dari input terstruktur.
 *
 * Output tiga bagian:
 *  - activityNarrative: "Pembelajaran membahas <materi> melalui <activities>."
 *  - noteNarrative: gabungan respons siswa + kendala + freeNote dalam 1-2 kalimat.
 *  - followUpNarrative: "Tindak lanjut dilakukan melalui <followUp>." atau default.
 *
 * Bila input kosong, helper tetap menghasilkan kalimat aman (tidak throw).
 */
export function buildJournalNarrative(input: JournalNarrativeInput): JournalNarrativeResult {
  const material = normalizeText(input.material ?? "");
  const activities = (input.activities ?? []).map((a) => normalizeText(a)).filter((a) => a.length > 0);
  const studentResponse = normalizeText(input.studentResponse ?? "");
  const obstacle = normalizeText(input.obstacle ?? "");
  const followUp = normalizeText(input.followUp ?? "");
  const freeNote = normalizeText(input.freeNote ?? "");

  /* ---- activityNarrative ---- */
  // Pattern: "Pembelajaran membahas <material> melalui <activities>."
  // Bila material kosong: "Pembelajaran dilaksanakan melalui <activities>."
  // Bila activities kosong: "Pembelajaran membahas <material>."
  // Bila keduanya kosong: "Pembelajaran dilaksanakan sesuai rencana."
  let activityNarrative: string;
  if (material && activities.length > 0) {
    activityNarrative = `Pembelajaran membahas ${material.toLowerCase()} melalui ${joinActivities(activities)} untuk membantu siswa memahami materi.`;
  } else if (material && activities.length === 0) {
    activityNarrative = `Pembelajaran membahas ${material.toLowerCase()}.`;
  } else if (!material && activities.length > 0) {
    activityNarrative = `Pembelajaran dilaksanakan melalui ${joinActivities(activities)} untuk membantu siswa memahami materi.`;
  } else {
    activityNarrative = "Pembelajaran dilaksanakan sesuai rencana.";
  }
  activityNarrative = capitalize(activityNarrative);

  /* ---- noteNarrative ---- */
  // Gabungan: respons siswa + kendala + freeNote dalam 1-2 kalimat.
  // Pattern:
  //   "Siswa mengikuti kegiatan dengan <response>."
  //   "Secara umum pembelajaran berjalan baik. <obstacle>."
  //   "<freeNote>"
  const noteParts: string[] = [];

  if (studentResponse) {
    // Respons sudah berupa frasa ("Aktif", "Cukup aktif", dll) → langsung dipakai.
    noteParts.push(`Siswa mengikuti kegiatan dengan ${studentResponse.toLowerCase()}.`);
  }

  if (obstacle) {
    const obstacleLower = obstacle.toLowerCase();
    if (obstacleLower === "tidak ada kendala berarti") {
      noteParts.push("Secara umum pembelajaran berjalan baik tanpa kendala berarti.");
    } else {
      noteParts.push(`Secara umum pembelajaran berjalan baik, namun ${obstacleLower}.`);
    }
  } else {
    // Bila tidak ada obstacle, tetap berikan kalimat penutup positif.
    if (studentResponse) {
      // Sudah ada kalimat respons; tidak perlu tambahan.
    } else {
      noteParts.push("Secara umum pembelajaran berjalan baik.");
    }
  }

  if (freeNote) {
    // Catatan bebas ditambahkan apa adanya (asumsi guru sudah menulis kalimat utuh).
    // Bila tidak diakhiri titik, tambahkan titik.
    const note = freeNote.endsWith(".") || freeNote.endsWith("?") || freeNote.endsWith("!")
      ? freeNote
      : `${freeNote}.`;
    noteParts.push(capitalize(note));
  }

  const noteNarrative = noteParts.join(" ");

  /* ---- followUpNarrative ---- */
  // Pattern: "Tindak lanjut dilakukan melalui <followUp> pada pertemuan berikutnya."
  // Bila followUp kosong: "Tindak lanjut akan dilakukan pada pertemuan berikutnya."
  let followUpNarrative: string;
  if (followUp) {
    const followLower = followUp.toLowerCase();
    // Bila followUp adalah "Dilanjutkan pertemuan berikutnya", jangan double phrasing.
    if (followLower.includes("dilanjutkan") && followLower.includes("pertemuan berikutnya")) {
      followUpNarrative = `Pembelajaran akan dilanjutkan pada pertemuan berikutnya.`;
    } else {
      followUpNarrative = `Tindak lanjut dilakukan melalui ${followLower} pada pertemuan berikutnya.`;
    }
  } else {
    followUpNarrative = "Tindak lanjut akan dilakukan pada pertemuan berikutnya.";
  }
  followUpNarrative = capitalize(followUpNarrative);

  return { activityNarrative, noteNarrative, followUpNarrative };
}

/* ------------------------------------------------------------------ */
/*  Validation helpers (UI logic, testable)                            */
/* ------------------------------------------------------------------ */

/**
 * Pure-function validator: apakah jurnal bisa difinalkan?
 * UI memakai ini untuk disable/enable tombol "Setujui & Finalkan".
 *
 * Aturan (sprint instruction §4):
 *  - Materi wajib ada.
 *  - Kegiatan wajib ada.
 *  - Tindak lanjut boleh kosong.
 *  - Review wajib sudah dibuka.
 */
export function canFinalizeJournal(args: {
  material: string;
  activities: string[];
  reviewOpened: boolean;
}): { ok: true } | { ok: false; message: string } {
  if (!String(args.material ?? "").trim()) {
    return { ok: false, message: "Materi wajib ada." };
  }
  if (!Array.isArray(args.activities) || args.activities.length === 0) {
    return { ok: false, message: "Kegiatan wajib ada." };
  }
  if (!args.reviewOpened) {
    return { ok: false, message: "Buka review jurnal terlebih dahulu sebelum finalisasi." };
  }
  return { ok: true };
}

/**
 * Pure-function: apakah ganti tanggal perlu konfirmasi?
 * Sprint instruction §9 (Date Guard):
 *  - Kalau jurnal belum dipilih, tanggal boleh diganti (false).
 *  - Kalau sedang mengedit draft, ganti tanggal harus konfirmasi (true).
 *  - Kalau jurnal sudah final, tanggal tidak bisa diubah dari halaman edit (true — UI blok).
 */
export function dateChangeRequiresConfirm(args: {
  hasActiveDraft: boolean;
  isFinal: boolean;
}): boolean {
  if (args.isFinal) return true; // final → blok, but treat as "requires confirm" (UI akan tolak)
  return args.hasActiveDraft;
}

/* ------------------------------------------------------------------ */
/*  Structured note packing (schema unchanged — JSON in `note` field)  */
/* ------------------------------------------------------------------ */

/**
 * JOURNAL-REVIEW-NARRATIVE-03: Pack structured journal input into `note` field.
 *
 * Karena schema database tidak boleh berubah, kita simpan structured input
 * (activities, studentResponse, obstacle, freeNote) sebagai JSON di field `note`
 * yang sudah ada. Field `actualMaterialTitle` dan `followUp` tetap dipakai
 * langsung (string biasa).
 *
 * Format: `{"__v":1,"activities":[...],"studentResponse":"...","obstacle":"...","freeNote":"..."}`
 *
 * Backward compat: bila note lama adalah plain text, unpackStructuredNote
 * akan mengembalikannya sebagai freeNote.
 */
const NOTE_MARKER_VERSION = 1;

export interface JournalStructuredNote {
  activities: string[];
  studentResponse: string;
  obstacle: string;
  freeNote: string;
}

export function packStructuredNote(input: JournalStructuredNote): string {
  return JSON.stringify({
    __v: NOTE_MARKER_VERSION,
    activities: input.activities,
    studentResponse: input.studentResponse,
    obstacle: input.obstacle,
    freeNote: input.freeNote,
  });
}

export function unpackStructuredNote(note: string | undefined | null): JournalStructuredNote {
  const empty: JournalStructuredNote = {
    activities: [],
    studentResponse: "",
    obstacle: "",
    freeNote: "",
  };
  if (!note) return empty;
  try {
    const parsed = JSON.parse(note);
    if (parsed && typeof parsed === "object" && parsed.__v === NOTE_MARKER_VERSION) {
      return {
        activities: Array.isArray(parsed.activities) ? parsed.activities : [],
        studentResponse: typeof parsed.studentResponse === "string" ? parsed.studentResponse : "",
        obstacle: typeof parsed.obstacle === "string" ? parsed.obstacle : "",
        freeNote: typeof parsed.freeNote === "string" ? parsed.freeNote : "",
      };
    }
  } catch {
    // Not JSON — fall through to legacy handling.
  }
  // Legacy plain text note → treat as freeNote.
  return { ...empty, freeNote: note };
}
