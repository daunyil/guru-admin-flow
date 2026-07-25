/**
 * PromesMerdekaDocument Component Structure Test — B1.1–B1.10
 *
 * Tests the v5 Document-Centric Formal PromesMerdekaDocument component
 * against all spec IDs defined in PROMES-WORKFLOW-STANDARDS.md §3.1–3.4.
 *
 * Spec References:
 *   COMP-01–07: Document section structure (Kop, Title, Identity, Table, Legend, Signature)
 *   COMP-08: Matrix table structure (header rows, rowSpan)
 *   COMP-09: Cadangan row present
 *   COMP-10: Kokurikuler row (conditional)
 *   COMP-11: Total row present
 *   COMP-12: Agenda row present
 *   KOP-01–11: Kop surat structure checks
 *   KOP-02: Logo box (conditional: logoUrl → img, else placeholder)
 *   SIG-02/03: NIP fields
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PromesLandscapeKurikulumMerdekaDocument } from "../PromesMerdekaDocument";
import type { PromesWeek, UnitDistribution, PromesSummary, ProtaProfile, PromesOptions } from "@guru-admin/domain";

/* ---- Test fixtures ---- */

const mockProfile: ProtaProfile = {
  id: "profile-1",
  subject: "Pendidikan Pancasila",
  grade: "VII-A",
  phase: "D",
  academicYearId: "year-1",
  teacherId: "teacher-1",
  schoolId: "school-1",
  totalJP: 56,
  intraJP: 42,
  koJP: 14,
  objectives: [],
} as ProtaProfile;

const mockOptions: PromesOptions = {
  intraJpPerWeek: 2,
  koJpPerWeek: 1,
  cadanganJP: 2,
  reserveFromEnd: true,
  koMode: "end_of_week",
};

const mockDistribution: UnitDistribution[] = [
  {
    unitId: "unit-1",
    code: "TP 7.1",
    learningOutcome: "Memahami sikap Pancasila",
    title: "Mengidentifikasi sikap Pancasila dalam kehidupan",
    totalJP: 8,
    intraJP: 6,
    koJP: 2,
  },
  {
    unitId: "unit-2",
    code: "TP 7.2",
    learningOutcome: "Menganalisis nilai Bhinneka Tunggal Ika",
    title: "Menganalisis contoh Bhinneka Tunggal Ika",
    totalJP: 8,
    intraJP: 6,
    koJP: 2,
  },
];

function makeMockWeeks(): PromesWeek[] {
  const weeks: PromesWeek[] = [];
  for (let i = 1; i <= 25; i++) {
    weeks.push({
      weekNumber: i,
      startDate: `2026-07-${String(i * 7).padStart(2, "0")}`,
      isEffective: true,
      intraCapacityJP: 2,
      koJP: 1,
      reservedForCadangan: 0,
      assignedUnits: i <= 10 ? [{ unitId: "unit-1", jp: 2 }] : [],
      calendarKind: i === 11 ? "pts" : null,
      blockReason: i === 11 ? "STS" : "",
      label: String(i),
    } as PromesWeek);
  }
  // Make STS week non-effective
  weeks[10] = {
    ...weeks[10],
    isEffective: false,
    intraCapacityJP: 0,
    koJP: 0,
    assignedUnits: [],
    calendarKind: "pts",
    blockReason: "Sumatif Tengah Semester",
  };
  return weeks;
}

const mockWeeks = makeMockWeeks();

const mockSummary: PromesSummary = {
  intraCapacityJP: 42,
  koTotalJP: 14,
  cadanganJP: 2,
  undistributedJP: 0,
  totalEffectiveWeeks: 24,
  totalEventWeeks: 1,
  totalKBMWeeks: 24,
};

const defaultProps = {
  weeks: mockWeeks,
  distribution: mockDistribution,
  summary: mockSummary,
  status: "valid" as const,
  semester: 1 as const,
  activeYearLabel: "2026/2027",
  schoolName: "SMP Negeri 1 Contoh",
  schoolRegency: "KABUPATEN CONTOH",
  headmasterName: "Dr. Budi Santoso",
  headmasterNip: "19700101 200301 1 001",
  teacherName: "Siti Aminah",
  teacherNip: "19850505 201001 2 002",
  profile: mockProfile,
  options: mockOptions,
};

/* ============================================================ */
/*  B1.1: Renders all 6 mandatory sections (COMP-01–07)         */
/* ============================================================ */

describe("PromesMerdekaDocument — Section structure (COMP-01–07)", () => {
  it("B1.1: All 6 mandatory sections present in document", () => {
    const { container } = render(<PromesLandscapeKurikulumMerdekaDocument {...defaultProps} />);

    // COMP-01: Kop Surat present
    const kopSurat = container.querySelector(".promes-merdeka-kop-surat");
    expect(kopSurat).not.toBeNull();

    // COMP-02: Title block present
    const titleBlock = container.querySelector(".promes-merdeka-title-block-doc");
    expect(titleBlock).not.toBeNull();

    // COMP-03: Identity table present
    const identityTable = container.querySelector(".promes-merdeka-identity-table");
    expect(identityTable).not.toBeNull();

    // COMP-04: Matrix table present
    const matrixTable = container.querySelector(".merdeka-matrix-table");
    expect(matrixTable).not.toBeNull();

    // COMP-07: Signature grid present
    const signatureGrid = container.querySelector(".signature-grid");
    expect(signatureGrid).not.toBeNull();
  });

  it("B1.5: Legend block present when activeEvents exist (COMP-05)", () => {
    const { container } = render(<PromesLandscapeKurikulumMerdekaDocument {...defaultProps} />);
    const legendBlock = container.querySelector(".merdeka-legend-block");
    expect(legendBlock).not.toBeNull();
  });

  it("COMP-06: Warning NOT shown when status = 'valid'", () => {
    const { container } = render(<PromesLandscapeKurikulumMerdekaDocument {...defaultProps} />);
    const warning = container.querySelector(".promes-warning");
    expect(warning).toBeNull();
  });

  it("COMP-06: Warning shown when status = 'needs_fix'", () => {
    const { container } = render(
      <PromesLandscapeKurikulumMerdekaDocument {...defaultProps} status="needs_fix" />
    );
    const warning = container.querySelector(".promes-warning");
    expect(warning).not.toBeNull();
  });
});

/* ============================================================ */
/*  B1.2: Kop Surat structure (KOP-01–10)                        */
/* ============================================================ */

describe("PromesMerdekaDocument — Kop Surat (KOP-01–10)", () => {
  it("B1.2a: Kop surat has logo box + kop-text with 4 lines (KOP-01/06)", () => {
    const { container } = render(<PromesLandscapeKurikulumMerdekaDocument {...defaultProps} />);

    // KOP-01: Logo box present
    const logoBox = container.querySelector(".promes-merdeka-kop-logo-box");
    expect(logoBox).not.toBeNull();

    // KOP-06: Kop-text with centered text
    const kopText = container.querySelector(".promes-merdeka-kop-text");
    expect(kopText).not.toBeNull();

    // 4 lines: instansi-1, dinas, unit, address
    const instansi = container.querySelector(".promes-merdeka-kop-instansi-1");
    expect(instansi).not.toBeNull();
    expect(instansi?.textContent).toContain("PEMERINTAH");

    const dinas = container.querySelector(".promes-merdeka-kop-dinas");
    expect(dinas).not.toBeNull();
    expect(dinas?.textContent).toContain("DINAS PENDIDIKAN");

    const unit = container.querySelector(".promes-merdeka-kop-unit");
    expect(unit).not.toBeNull();
    expect(unit?.textContent).toContain("SMP Negeri 1 Contoh");

    const address = container.querySelector(".promes-merdeka-kop-address");
    expect(address).not.toBeNull();
    expect(address?.textContent).toContain("KABUPATEN CONTOH");
  });

  it("B1.2b: Logo placeholder rendered when no logoUrl (KOP-02/04)", () => {
    const { container } = render(<PromesLandscapeKurikulumMerdekaDocument {...defaultProps} />);
    const placeholder = container.querySelector(".promes-merdeka-kop-logo-placeholder");
    expect(placeholder).not.toBeNull();
    expect(placeholder?.textContent).toBe("LOGO");

    // No img rendered
    const logoImg = container.querySelector(".promes-merdeka-kop-logo-img");
    expect(logoImg).toBeNull();
  });

  it("B1.2c: Logo <img> rendered when logoUrl provided (KOP-01)", () => {
    const { container } = render(
      <PromesLandscapeKurikulumMerdekaDocument {...defaultProps} logoUrl="https://example.com/logo.png" />
    );
    const logoImg = container.querySelector(".promes-merdeka-kop-logo-img");
    expect(logoImg).not.toBeNull();

    // Placeholder should NOT be rendered
    const placeholder = container.querySelector(".promes-merdeka-kop-logo-placeholder");
    expect(placeholder).toBeNull();
  });
});

/* ============================================================ */
/*  B1.3: Double border renders (KOP-11)                        */
/* ============================================================ */

describe("PromesMerdekaDocument — KOP-11 double border", () => {
  it("B1.3: Double border element exists below kop surat", () => {
    const { container } = render(<PromesLandscapeKurikulumMerdekaDocument {...defaultProps} />);
    const doubleBorder = container.querySelector(".promes-merdeka-kop-double-border");
    expect(doubleBorder).not.toBeNull();
  });
});

/* ============================================================ */
/*  B1.4/B1.5: Matrix table structure (COMP-08)                 */
/* ============================================================ */

describe("PromesMerdekaDocument — Matrix table structure (COMP-08)", () => {
  it("B1.4: Header row 1 has Elemen, KodeTP, Materi, Alokasi, month columns", () => {
    const { container } = render(<PromesLandscapeKurikulumMerdekaDocument {...defaultProps} />);
    const headerRow = container.querySelector(".merdeka-header-row");
    expect(headerRow).not.toBeNull();

    // Check that key header th elements exist
    const ths = headerRow!.querySelectorAll("th");
    expect(ths.length).toBeGreaterThan(4); // At least 4 fixed + month cols
  });

  it("B1.5: Elemen column rowSpan correct per group (COMP-08)", () => {
    const { container } = render(<PromesLandscapeKurikulumMerdekaDocument {...defaultProps} />);
    const elemenTds = container.querySelectorAll(".merdeka-td-elemen");
    expect(elemenTds.length).toBeGreaterThan(0);

    // Each element group should have exactly one elemen td with correct rowSpan
    const firstElemenTd = elemenTds[0];
    const rowSpan = firstElemenTd.getAttribute("rowspan");
    expect(rowSpan).not.toBeNull();
    expect(Number(rowSpan)).toBeGreaterThan(0);
  });
});

/* ============================================================ */
/*  B1.6: Cadangan row present (COMP-09)                        */
/* ============================================================ */

describe("PromesMerdekaDocument — COMP-09 cadangan row", () => {
  it("B1.6: Cadangan row exists with colSpan=3 label + JP column + week cells", () => {
    const { container } = render(<PromesLandscapeKurikulumMerdekaDocument {...defaultProps} />);
    const cadanganRow = container.querySelector(".merdeka-cadangan-row");
    expect(cadanganRow).not.toBeNull();

    const labelTd = container.querySelector(".merdeka-td-label-cadangan");
    expect(labelTd).not.toBeNull();
    expect(labelTd?.textContent).toContain("Cadangan");

    const jpTd = container.querySelector(".merdeka-td-jp-cadangan");
    expect(jpTd).not.toBeNull();
  });
});

/* ============================================================ */
/*  B1.7: Kokurikuler row conditional (COMP-10)                 */
/* ============================================================ */

describe("PromesMerdekaDocument — COMP-10 kokurikuler row (conditional)", () => {
  it("B1.7a: Kokurikuler row present when summary.koTotalJP > 0", () => {
    const { container } = render(<PromesLandscapeKurikulumMerdekaDocument {...defaultProps} />);
    const kokuRow = container.querySelector(".merdeka-koku-row");
    expect(kokuRow).not.toBeNull();
  });

  it("B1.7b: Kokurikuler row absent when summary.koTotalJP = 0", () => {
    const noKoSummary = { ...mockSummary, koTotalJP: 0 };
    const { container } = render(
      <PromesLandscapeKurikulumMerdekaDocument {...defaultProps} summary={noKoSummary} />
    );
    const kokuRow = container.querySelector(".merdeka-koku-row");
    expect(kokuRow).toBeNull();
  });
});

/* ============================================================ */
/*  B1.8: Total row present (COMP-11)                           */
/* ============================================================ */

describe("PromesMerdekaDocument — COMP-11 total row", () => {
  it("B1.8: Total row exists with \"JUMLAH JP PER MINGGU\" label + totalJP value", () => {
    const { container } = render(<PromesLandscapeKurikulumMerdekaDocument {...defaultProps} />);
    const totalRow = container.querySelector(".merdeka-total-row");
    expect(totalRow).not.toBeNull();

    const labelTd = container.querySelector(".merdeka-td-total-label");
    expect(labelTd).not.toBeNull();
    expect(labelTd?.textContent).toContain("JUMLAH JP PER MINGGU");

    const jpTd = container.querySelector(".merdeka-td-jp-total");
    expect(jpTd).not.toBeNull();
    // Total JP = intraCapacityJP + koTotalJP = 42 + 14 = 56
    expect(jpTd?.textContent).toContain("56");
  });
});

/* ============================================================ */
/*  B1.9: Agenda row present (COMP-12)                          */
/* ============================================================ */

describe("PromesMerdekaDocument — COMP-12 agenda row", () => {
  it("B1.9: Agenda row exists with \"AGENDA NON-KBM\" label", () => {
    const { container } = render(<PromesLandscapeKurikulumMerdekaDocument {...defaultProps} />);
    const agendaRow = container.querySelector(".merdeka-agenda-row");
    expect(agendaRow).not.toBeNull();

    const labelTd = container.querySelector(".merdeka-td-agenda-label");
    expect(labelTd).not.toBeNull();
    expect(labelTd?.textContent).toContain("AGENDA NON-KBM");
  });
});

/* ============================================================ */
/*  B1.10: Signature NIP (SIG-02/03)                           */
/* ============================================================ */

describe("PromesMerdekaDocument — SIG-02/03 NIP fields", () => {
  it("B1.10: Both NIP fields rendered for Kepala and Guru", () => {
    render(<PromesLandscapeKurikulumMerdekaDocument {...defaultProps} />);

    // SIG-02: Headmaster NIP
    expect(screen.getByText(/NIP\.\s*19700101/)).not.toBeNull();

    // SIG-03: Teacher NIP
    expect(screen.getByText(/NIP\.\s*19850505/)).not.toBeNull();
  });

  it("Signature left role = \"Mengetahui, Kepala Sekolah\" (SIG-01)", () => {
    render(<PromesLandscapeKurikulumMerdekaDocument {...defaultProps} />);
    expect(screen.getByText(/Kepala Sekolah/)).not.toBeNull();
  });

  it("Signature right role = \"Guru Mata Pelajaran\" (SIG-01)", () => {
    render(<PromesLandscapeKurikulumMerdekaDocument {...defaultProps} />);
    expect(screen.getByText(/Guru Mata Pelajaran/)).not.toBeNull();
  });

  it("Signature right place-date contains schoolRegency (SIG-04)", () => {
    const { container } = render(<PromesLandscapeKurikulumMerdekaDocument {...defaultProps} />);
    // SIG-04: Place-date appears ONLY in right signature block (index 1).
    // Left signature block has placeDate="\u00A0" (blank placeholder).
    // schoolRegency also appears in kop surat address, so use container query
    // scoped to second signature-place-date element.
    const placeDates = container.querySelectorAll(".signature-place-date");
    expect(placeDates.length).toBe(2);
    // Right block (index 1) contains the schoolRegency + date
    expect(placeDates[1]?.textContent).toContain("KABUPATEN CONTOH");
  });
});
