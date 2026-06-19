/**
 * Util slug dari string Indonesia.
 * Berguna untuk ID entitas yang ramah-URL.
 */

/**
 * Membuat slug dari string Indonesia.
 * Contoh: "VII A — Pendidikan Pancasila" → "vii-a-pendidikan-pancasila"
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // hapus diacritics
    .replace(/[^a-z0-9\s-]/g, "") // hapus karakter non-alfanumerik
    .trim()
    .replace(/[\s-]+/g, "-") // spasi dan dash beruntun → single dash
    .replace(/^-+|-+$/g, ""); // hapus dash di awal/akhir
}

/**
 * Membuat ID dari label: "VII A" → "vii-a".
 */
export function idFromLabel(label: string): string {
  return slugify(label);
}
