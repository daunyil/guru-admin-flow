/**
 * Util tanggal untuk Guru Admin Flow.
 *
 * Semua tanggal disimpan sebagai ISO 8601 string dengan timezone lokal
 * (lihat docs/DATA_MODEL_DRAFT.md §0.2):
 *   - Tanggal saja (tanpa jam): format "YYYY-MM-DD"
 *   - Timestamp: format "YYYY-MM-DDTHH:mm:ss±HH:mm"
 */

import { DEFAULT_LOCALE, DEFAULT_TIMEZONE, DAY_LABELS_ID, MONTH_LABELS_ID } from "./constants";

/**
 * Mendapatkan tanggal hari ini dalam format ISO date (YYYY-MM-DD),
 * dikonversi ke timezone lokal Asia/Jakarta.
 */
export function todayISODate(now: Date = new Date()): string {
  return toISODate(now);
}

/**
 * Mengonversi Date ke string ISO date (YYYY-MM-DD) di timezone lokal.
 */
export function toISODate(date: Date): string {
  // Format dengan timezone Asia/Jakarta menggunakan Intl
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: DEFAULT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date); // en-CA menghasilkan YYYY-MM-DD
}

/**
 * Mengonversi Date ke string ISO timestamp lengkap dengan offset timezone.
 * Contoh: "2025-08-18T10:30:00+07:00"
 */
export function toISOTimestamp(date: Date = new Date()): string {
  // Pakai toISOString lalu replace 'Z' dengan offset timezone lokal
  const tzOffset = -date.getTimezoneOffset(); // dalam menit
  const sign = tzOffset >= 0 ? "+" : "-";
  const absOffset = Math.abs(tzOffset);
  const offsetHours = String(Math.floor(absOffset / 60)).padStart(2, "0");
  const offsetMinutes = String(absOffset % 60).padStart(2, "0");

  // Dapatkan bagian YYYY-MM-DDTHH:mm:ss di timezone lokal
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: DEFAULT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  const yyyy = get("year");
  const mm = get("month");
  const dd = get("day");
  const hh = get("hour") === "24" ? "00" : get("hour");
  const min = get("minute");
  const ss = get("second");

  return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}${sign}${offsetHours}:${offsetMinutes}`;
}

/**
 * Parse ISO date (YYYY-MM-DD) ke Date di timezone lokal.
 * Penting: Date konstruktor interpretasi "2025-08-18" sebagai UTC midnight,
 * yang bisa geser tanggal di timezone Asia/Jakarta. Kita pakai pendekatan
 * menambahkan T00:00:00 lokal secara eksplisit.
 *
 * FIXPACK MV-P1-01: Bila input berupa ISO timestamp (mis. "2026-06-25T23:58:15+00:00"),
 * ambil 10 karakter pertama (bagian tanggal saja). Sebelumnya, input dengan timezone
 * langsung ditolak → crash LKPD page.
 */
export function parseISODate(iso: string): Date {
  // FIXPACK MV-P1-01: normalize — bila mengandung "T", ambil 10 karakter pertama
  const dateOnly = iso.includes("T") ? iso.slice(0, 10) : iso;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    throw new Error(`Format tanggal tidak valid: ${iso}. Harus YYYY-MM-DD.`);
  }
  // Buat Date dari "YYYY-MM-DDT00:00:00" di timezone lokal
  // Trik: gunakan parts eksplisit untuk hindari ambiguity
  const [y, m, d] = dateOnly.split("-").map(Number);
  // MV-POLISH-FIXPACK-02 P2: hard validation — tolak tanggal mustahil
  // (mis. 2026-02-31, 2026-13-01, 2026-00-00)
  const date = new Date(y, m - 1, d, 0, 0, 0, 0);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    throw new Error(`Tanggal mustahil: ${dateOnly}. Periksa kembali.`);
  }
  return date;
}

/**
 * Validasi format ISO date (YYYY-MM-DD).
 * FIXPACK MV-P1-01: juga accept ISO timestamp (normalize ke date-only).
 */
export function isValidISODate(iso: string): boolean {
  const dateOnly = iso.includes("T") ? iso.slice(0, 10) : iso;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return false;
  const [y, m, d] = dateOnly.split("-").map(Number);
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  // Cek dengan parse dan round-trip
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/**
 * Format tanggal Indonesia panjang: "Senin, 18 Agustus 2025".
 */
export function formatLongDateID(iso: string): string {
  const date = parseISODate(iso);
  const dayName = DAY_LABELS_ID[date.getDay() === 0 ? 7 : date.getDay()];
  const day = date.getDate();
  const monthName = MONTH_LABELS_ID[date.getMonth() + 1];
  const year = date.getFullYear();
  return `${dayName}, ${day} ${monthName} ${year}`;
}

/**
 * Format tanggal Indonesia pendek: "18 Agu 2025".
 */
export function formatShortDateID(iso: string): string {
  const date = parseISODate(iso);
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    timeZone: DEFAULT_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * Mendapatkan dayOfWeek (1=Senin, 7=Minggu) dari ISO date.
 */
export function getDayOfWeek(iso: string): number {
  const date = parseISODate(iso);
  const jsDay = date.getDay(); // 0=Minggu, 1=Senin, ..., 6=Sabtu
  return jsDay === 0 ? 7 : jsDay;
}

/**
 * Mengecek apakah dua rentang tanggal (inklusif) overlap.
 */
export function dateRangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const sA = parseISODate(startA).getTime();
  const eA = parseISODate(endA).getTime();
  const sB = parseISODate(startB).getTime();
  const eB = parseISODate(endB).getTime();
  return sA <= eB && sB <= eA;
}

/**
 * Mendapatkan daftar tanggal (ISO) dalam rentang [start, end] inklusif.
 */
export function enumerateDateRange(startISO: string, endISO: string): string[] {
  const result: string[] = [];
  const start = parseISODate(startISO);
  const end = parseISODate(endISO);
  if (start > end) return result;
  const cursor = new Date(start);
  while (cursor <= end) {
    result.push(toISODate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

/**
 * Mendapatkan nomor minggu dalam tahun (ISO week number).
 * Berguna untuk identifikasi "Minggu 1", "Minggu 2", dst.
 */
export function getISOWeekNumber(iso: string): number {
  const date = parseISODate(iso);
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7; // 0=Senin, ..., 6=Minggu
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / (7 * 24 * 3600 * 1000));
}
