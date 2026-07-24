/**
 * Shared helpers for Promes module — extracted from PromesPage.tsx
 * Contains: landscape matrix format helpers, Merdeka event definitions,
 * calendar event classification, and utility functions.
 */

import { promesCalendarKindLabel } from "@guru-admin/domain";
import type { PromesWeek } from "@guru-admin/domain";

/* ============================================================ */
/*  Landscape matrix format helpers                              */
/* ============================================================ */

export const MONTH_SHORT_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export type PromesMonthColumn = {
  month: number;
  label: string;
  weeks: Array<{
    weekNumber: number;
    label: string;
    startDate: string;
  }>;
};

export function buildPromesMonthGroups(weeks: PromesWeek[], semester: 1 | 2): PromesMonthColumn[] {
  const monthNumbers = semester === 1 ? [7, 8, 9, 10, 11, 12] : [1, 2, 3, 4, 5, 6];

  return monthNumbers
    .map((month) => {
      const monthWeeks = weeks
        .filter((week) => Number(week.startDate.slice(5, 7)) === month)
        .sort((a, b) => a.weekNumber - b.weekNumber);

      return {
        month,
        label: MONTH_SHORT_ID[month - 1],
        weeks: monthWeeks.map((week, index) => ({
          weekNumber: week.weekNumber,
          label: String(index + 1),
          startDate: week.startDate,
        })),
      };
    })
    .filter((group) => group.weeks.length > 0);
}

export function compactPromesMaterial(text: string, maxWords = 7): string {
  const cleaned = (text || "-")
    .replace(/\s+/g, " ")
    .replace(/^tp\s*\d+(\.\d+)?\s*[:.\-–—]?\s*/i, "")
    .trim();

  if (!cleaned || cleaned === "-") return "-";

  const parts = cleaned.split(/\s[–—-]\s/).map((p) => p.trim()).filter(Boolean);
  const candidate = parts.length > 1 ? parts[parts.length - 1] : cleaned;

  const words = candidate.split(" ").filter(Boolean);
  if (words.length <= maxWords) return candidate;

  return `${words.slice(0, maxWords).join(" ")}…`;
}

/**
 * PROMES-ELEMEN-TP-05: Compact Elemen/TP column content.
 * Produces clearly different content from the Materi column:
 * - If title has a "TP X.Y" prefix, extract and show just the TP code ("TP 7.1")
 * - Otherwise, show a very abbreviated version (max 3 words)
 * - This makes Elemen visually distinct from Materi (max 7 words)
 */
export function compactPromesElemen(text: string, maxWords = 3): string {
  if (!text || text === "-") return "-";
  const cleaned = text.replace(/\s+/g, " ").trim();

  // If title has a "TP X.Y" prefix (e.g. "TP 7.1 - Memahami prinsip..."), extract just the TP code
  const tpMatch = cleaned.match(/^tp\s*\d+(\.\d+)*/i);
  if (tpMatch) {
    return tpMatch[0].toUpperCase(); // "TP 7.1"
  }

  // No TP prefix — show very abbreviated version (max 3 words) to differentiate from Materi
  const words = cleaned.split(" ").filter(Boolean);
  if (words.length <= maxWords) return cleaned;
  return `${words.slice(0, maxWords).join(" ")}…`;
}

export type PromesLandscapeEventKind = "learning" | "assessment" | "scopeAssessment" | "remedial" | "kokurikuler" | "holiday" | "other";

export type PromesLandscapeEventColumn = {
  kind: PromesLandscapeEventKind;
  label: string;
};

export const PROMES_LEGEND_ITEMS: Array<{ kind: PromesLandscapeEventKind; label: string }> = [
  { kind: "learning", label: "Kegiatan belajar mengajar" },
  { kind: "assessment", label: "Asesmen sumatif tengah dan akhir semester" },
  { kind: "scopeAssessment", label: "Asesmen sumatif lingkup materi" },
  { kind: "kokurikuler", label: "Kokurikuler" },
  { kind: "remedial", label: "Remedial" },
  { kind: "holiday", label: "Libur semester / hari libur" },
  { kind: "other", label: "Kegiatan sekolah khusus" },
];

export function promesEventClassName(kind: PromesLandscapeEventKind): string {
  return `promes-event-${kind}`;
}

export function compactEventLabel(label: string): string {
  const normalized = label.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (/libur/i.test(normalized) && normalized.length > 26) return normalized;
  if (normalized.length <= 34) return normalized;
  return `${normalized.slice(0, 31)}…`;
}

export function getPromesLandscapeCalendarEvent(week: PromesWeek): PromesLandscapeEventColumn | null {
  const rawLabel = (week.blockReason || (week.calendarKind ? promesCalendarKindLabel(week.calendarKind) : "")).trim();
  const lower = rawLabel.toLowerCase();

  if (week.calendarKind === "libur") {
    return { kind: "holiday", label: compactEventLabel(rawLabel || "Libur") };
  }

  if (week.calendarKind === "pts" || week.calendarKind === "pas") {
    return { kind: "assessment", label: compactEventLabel(rawLabel || promesCalendarKindLabel(week.calendarKind)) };
  }

  if (week.calendarKind === "remedial") {
    return { kind: "remedial", label: compactEventLabel(rawLabel || "Remedial") };
  }

  if (week.calendarKind === "p5") {
    return { kind: "kokurikuler", label: "Kokurikuler" };
  }

  if (week.calendarKind === "other" && rawLabel) {
    if (/asesmen|sumatif|lingkup/.test(lower)) {
      return { kind: "scopeAssessment", label: compactEventLabel(rawLabel) };
    }
    return { kind: "other", label: compactEventLabel(rawLabel) };
  }

  return null;
}

/* ============================================================ */
/*  PROMES-VARIASI-01: Kurikulum Merdeka event definitions       */
/* ============================================================ */

export type MerdekaEventKind = "mpls" | "hut" | "sts" | "sas" | "cm" | "rl" | "holiday" | "remedial" | "kokurikuler" | "other";

export type MerdekaEventDef = {
  key: MerdekaEventKind;
  label: string;
  title: string;
  badgeClass: string;
  colClass: string;
};

export const MERDEKA_EVENTS: Record<string, MerdekaEventDef> = {
  mpls: { key: "mpls", label: "[M]", title: "Masa Pengenalan Lingkungan Sekolah", badgeClass: "merdeka-badge-mpls", colClass: "merdeka-col-mpls" },
  hut:  { key: "hut",  label: "[H]", title: "HUT RI / Libur Nasional", badgeClass: "merdeka-badge-hut", colClass: "merdeka-col-hut" },
  sts:  { key: "sts",  label: "[STS]", title: "Sumatif Tengah Semester", badgeClass: "merdeka-badge-sts", colClass: "merdeka-col-sts" },
  sas:  { key: "sas",  label: "[SAS]", title: "Sumatif Akhir Semester", badgeClass: "merdeka-badge-sas", colClass: "merdeka-col-sas" },
  cm:   { key: "cm",   label: "[CM]", title: "Class Meeting & Pengolahan Nilai", badgeClass: "merdeka-badge-cm", colClass: "merdeka-col-cm" },
  rl:   { key: "rl",   label: "[R/L]", title: "Pembagian Rapor & Libur Semester", badgeClass: "merdeka-badge-rl", colClass: "merdeka-col-rl" },
  remedial: { key: "remedial", label: "[Rem]", title: "Remedial", badgeClass: "merdeka-badge-remedial", colClass: "merdeka-col-remedial" },
  kokurikuler: { key: "kokurikuler", label: "[KO]", title: "Kokurikuler / P5", badgeClass: "merdeka-badge-kokurikuler", colClass: "merdeka-col-kokurikuler" },
  holiday: { key: "holiday", label: "[L]", title: "Libur", badgeClass: "merdeka-badge-holiday", colClass: "merdeka-col-holiday" },
  other: { key: "other", label: "[*]", title: "Kegiatan Sekolah Khusus", badgeClass: "merdeka-badge-other", colClass: "merdeka-col-other" },
};

export function detectMerdekaEventKind(week: PromesWeek): MerdekaEventDef | null {
  const rawLabel = (week.blockReason || (week.calendarKind ? promesCalendarKindLabel(week.calendarKind) : "")).trim();
  const lower = rawLabel.toLowerCase();

  if (week.calendarKind === "pts") return MERDEKA_EVENTS.sts;
  if (week.calendarKind === "pas") return MERDEKA_EVENTS.sas;
  if (week.calendarKind === "p5") return MERDEKA_EVENTS.kokurikuler;
  if (week.calendarKind === "remedial") return MERDEKA_EVENTS.remedial;

  if (week.calendarKind === "libur") {
    if (/hut|17\s*agustus|kemerdekaan|nasion/.test(lower)) return MERDEKA_EVENTS.hut;
    if (/rapor|libur\s*semester|semester\s*akhir/.test(lower)) return MERDEKA_EVENTS.rl;
    if (/class\s*meeting|pengolahan\s*nilai/.test(lower)) return MERDEKA_EVENTS.cm;
    return MERDEKA_EVENTS.holiday;
  }

  if (week.calendarKind === "other" && rawLabel) {
    if (/mpls|pengenalan\s*lingkungan|morient/.test(lower)) return MERDEKA_EVENTS.mpls;
    if (/class\s*meeting|pengolahan\s*nilai/.test(lower)) return MERDEKA_EVENTS.cm;
    if (/asesmen|sumatif|lingkup/.test(lower)) return MERDEKA_EVENTS.sts;
    return MERDEKA_EVENTS.other;
  }

  return null;
}

/* ============================================================ */
/*  Helper: pure cadangan week check                             */
/* ============================================================ */

/**
 * Cek apakah minggu HANYA cadangan
 * (reservedForCadangan > 0, tidak ada materi, tidak ada event kalender).
 */
export function isPureCadanganWeek(week: PromesWeek): boolean {
  return (
    week.reservedForCadangan > 0 &&
    week.assignedUnits.length === 0 &&
    !week.calendarKind
  );
}
