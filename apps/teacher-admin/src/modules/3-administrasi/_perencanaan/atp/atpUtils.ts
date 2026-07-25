/**
 * ATP utility functions and types.
 *
 * Pure functions with no React dependency — safe to import from any module.
 */

import type { ATPEntry } from "@guru-admin/domain";

/* ------------------------------------------------------------------ */
/*  AI Prompt helpers                                                  */
/* ------------------------------------------------------------------ */

export const AI_PROMPT_TYPES = ["lkpd", "rpp", "jurnal", "remedial", "pengayaan"] as const;
export type AIPromptType = (typeof AI_PROMPT_TYPES)[number];

export function generateAIPrompt(entry: ATPEntry, type: AIPromptType): string {
  const base = `Sebagai guru ${entry.subject} kelas ${entry.grade} (Fase ${entry.phase}), buatkan ${type.toUpperCase()} untuk Tujuan Pembelajaran berikut:

Tujuan Pembelajaran: ${entry.tp}
Elemen: ${entry.elemen}
Capaian Pembelajaran: ${entry.cp}
Bab: ${entry.bab ?? "-"}
Profil Pelajar Pancasila: ${entry.profilPelajar ?? "-"}
Kata Kunci: ${entry.kataKunci ?? "-"}
Alokasi JP: ${entry.alokasiJP} JP

Format: sesuaikan dengan standar Kurikulum Merdeka untuk ${entry.grade}.`;

  if (type === "lkpd") return base + "\n\nLKPD harus memuat: tujuan, alat/bahan, langkah kegiatan, pertanyaan pemandu, penilaian.";
  if (type === "rpp") return base + "\n\nRPP/Modul Ajar harus memuat: identitas, kompetensi awal, tujuan, kegiatan pendahuluan-inti-penutup, asesmen.";
  if (type === "remedial") return base + "\n\nBuat program remedial sederhana untuk siswa yang belum mencapai TP ini.";
  if (type === "pengayaan") return base + "\n\nBuat program pengayaan untuk siswa yang sudah menguasai TP ini.";
  return base;
}

/* ------------------------------------------------------------------ */
/*  Import helpers                                                     */
/* ------------------------------------------------------------------ */

/** Key function used for duplicate detection during import. */
export const existingKey = (e: { subject: string; grade: string; tp: string }) =>
  `${e.subject}|${e.grade}|${e.tp}`;
