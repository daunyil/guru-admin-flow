/**
 * PromesDocxExporter — DOCX Export Contract for Promes Module (E1.1)
 *
 * This file defines the INTERFACE and type signatures for exporting
 * Promes (Program Semester) documents to DOCX format using the
 * `docx` library (already available in vendor bundle).
 *
 * IMPLEMENTATION is deferred to Sprint 6. This skeleton provides:
 *   1. Type definitions for DOCX export parameters
 *   2. Interface contract for the exporter function
 *   3. Mock/skeleton implementation that throws "not implemented"
 *   4. DOCX layout spec mapping (CSS → docx XML equivalent)
 *
 * Spec References:
 *   - E1.1: Define `PromesDocxExporter` interface
 *   - E1.2: Define merdeka DOCX layout spec (deferred)
 *   - E1.3: Research docx library capabilities (deferred)
 */

import type {
  PromesWeek,
  UnitDistribution,
  PromesSummary,
  ProtaProfile,
  PromesOptions,
} from "@guru-admin/domain";

/* ============================================================ */
/*  Type Definitions — DOCX Export Parameters                    */
/* ============================================================ */

/** Variasi type — matches usePromesState.PromesVariasi */
export type PromesVariasiForExport = "ringkas" | "matrix" | "merdeka";

/** Complete parameter set for DOCX export */
export type PromesDocxExportParams = {
  /** Which variasi to export */
  variasi: PromesVariasiForExport;

  /** Generated Promes result (weeks, distribution, summary, status) */
  result: {
    weeks: PromesWeek[];
    distribution: UnitDistribution[];
    summary: PromesSummary;
    status: "valid" | "needs_fix";
  };

  /** Semester (1 = Ganjil, 2 = Genap) */
  semester: 1 | 2;

  /** Academic year label (e.g., "2026/2027") */
  activeYearLabel: string;

  /** School identity data */
  schoolName: string;
  schoolRegency: string;

  /** Headmaster (Kepala Sekolah) identity */
  headmasterName: string;
  headmasterNip: string;

  /** Teacher (Guru Mata Pelajaran) identity */
  teacherName: string;
  teacherNip: string;

  /** Prota profile (subject, grade, phase) */
  profile: ProtaProfile | null;

  /** Promes options (JP per week, cadangan, etc.) */
  options: PromesOptions;

  /** School logo URL (optional, for Kop Surat) */
  logoUrl?: string;
};

/** Return type for DOCX export — a Blob containing the .docx file */
export type PromesDocxExportResult = Blob;

/* ============================================================ */
/*  DOCX Layout Spec — CSS → docx XML Mapping Reference         */
/*  (Deferred to Sprint 6 for full implementation)              */
/* ============================================================ */

/**
 * Merdeka DOCX Layout Spec (E1.2 — reference only, NOT implemented)
 *
 * | CSS Element         | docx XML Equivalent                           | Spec ID |
 * |---------------------|-----------------------------------------------|---------|
 * | border: 2px solid   | <w:tblBorders><w:top w:sz="4" w:val="single"/>| BORD-02 |
 * | border: 1px solid   | <w:tblBorders><w:top w:sz="2" w:val="single"/>| BORD-03 |
 * | font: Times New Roman | <w:rFonts w:ascii="Times New Roman"/>       | TYPO-01 |
 * | font-size: 7pt      | <w:sz w:val="14"/> (half-points)             | TYPO-03 |
 * | padding: 3pt 4pt    | <w:tblCellMar> + <w:spacing>                 | PADD-01 |
 * | bg-color: #1a1a2e   | <w:shd w:fill="1A1A2E"/>                     | CLR-11  |
 * | rowSpan             | <w:vMerge w:val="restart"/> + <w:vMerge/>    | COMP-08 |
 * | colSpan             | <w:gridSpan w:val="N"/>                       | COMP-09 |
 * | double border       | <w:pBdr><w:bottom w:sz="6" w:val="double"/>  | BORD-06 |
 *
 * NOTE: docx library uses "half-points" for font sizes:
 *   - 7pt → w:val="14"
 *   - 7.5pt → w:val="15"
 *   - 8pt → w:val="16"
 *   - 9pt → w:val="18"
 *   - 10pt → w:val="20"
 *   - 11pt → w:val="22"
 *   - 12pt → w:val="24"
 *   - 13pt → w:val="26"
 *
 * Border sizes in docx use eighth-points:
 *   - 1px → w:sz="8"
 *   - 2px → w:sz="16"
 *   - 3px (double) → w:sz="24" w:val="double"
 */

/* ============================================================ */
/*  Exporter Interface Contract                                  */
/* ============================================================ */

/**
 * PromesDocxExporter — Interface contract for DOCX export.
 *
 * Each variasi has its own export function because the layout
 * differs significantly (portrait vs landscape, serif vs sans-serif,
 * single vs multi-column JP, etc.)
 */
export interface PromesDocxExporter {
  /** Export Ringkas (Portrait) variasi to DOCX */
  exportRingkas(params: PromesDocxExportParams): Promise<PromesDocxExportResult>;

  /** Export Matrix (Landscape legacy) variasi to DOCX */
  exportMatrix(params: PromesDocxExportParams): Promise<PromesDocxExportResult>;

  /** Export Merdeka (Landscape Document-Centric) variasi to DOCX */
  exportMerdeka(params: PromesDocxExportParams): Promise<PromesDocxExportResult>;
}

/* ============================================================ */
/*  Skeleton Implementation (throws "not implemented")           */
/* ============================================================ */

/**
 * Default exporter — skeleton implementation.
 * All methods throw "Not implemented" error.
 * Actual implementation deferred to Sprint 6.
 */
export class DefaultPromesDocxExporter implements PromesDocxExporter {
  async exportRingkas(_params: PromesDocxExportParams): Promise<PromesDocxExportResult> {
    throw new Error("PromesDocxExporter.exportRingkas: Not implemented — deferred to Sprint 6 (E1)");
  }

  async exportMatrix(_params: PromesDocxExportParams): Promise<PromesDocxExportResult> {
    throw new Error("PromesDocxExporter.exportMatrix: Not implemented — deferred to Sprint 6 (E1)");
  }

  async exportMerdeka(_params: PromesDocxExportParams): Promise<PromesDocxExportResult> {
    throw new Error("PromesDocxExporter.exportMerdeka: Not implemented — deferred to Sprint 6 (E1)");
  }
}

/** Singleton exporter instance for use across the module */
export const promesDocxExporter = new DefaultPromesDocxExporter();
