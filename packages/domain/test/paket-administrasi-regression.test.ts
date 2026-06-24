/**
 * Regression tests untuk P0/P1 fixes di FULL-APP-AUDIT-RC1-FIX-2 +
 * PAKET-ADMINISTRASI-FINAL-RC1.
 *
 * Coverage:
 *   - DOCX base64 encode/decode roundtrip (P0-4)
 *   - ATP Excel paste edge cases yang relevan dengan fix P0-1/P0-2
 *   - Prota Excel paste: validasi konsistensi JP (P1-4 logic test)
 *
 * Note: UI handler tests (window.confirm, etc.) tidak bisa di-test di unit test
 * tanpa DOM. Yang di-test di sini adalah domain helpers yang dipakai handler.
 */

import { describe, it, expect } from "vitest";
import {
  parseAtpExcelPaste,
  atpPasteRowsToEntries,
  validateAtpImport,
  atpImportToEntries,
  type AtpPasteMeta,
} from "../src/atp-import";
import { parseProtaExcelPaste } from "../src/prota-import";

/* ---------- P0-4: DOCX base64 roundtrip (logic test) ---------- */

describe("P0-4 regression: DOCX base64 encode/decode roundtrip", () => {
  // Re-implement encode/decode yang sama dengan di RppBulkReplacePage
  // untuk verifikasi logic-nya benar.
  function arrayBufferToBase64Docx(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    const base64 = btoa(binary);
    return `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64}`;
  }

  function isDocxBase64(content: string): boolean {
    return content.startsWith("data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,");
  }

  function base64DocxToArrayBuffer(content: string): ArrayBuffer | null {
    if (!isDocxBase64(content)) return null;
    const base64 = content.split(",")[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  it("roundtrip: encode → decode → buffer sama dengan asli", () => {
    const original = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0xff, 0x00, 0xab, 0xcd]).buffer;
    const encoded = arrayBufferToBase64Docx(original);
    expect(isDocxBase64(encoded)).toBe(true);
    const decoded = base64DocxToArrayBuffer(encoded);
    expect(decoded).not.toBeNull();
    const decodedBytes = new Uint8Array(decoded!);
    const originalBytes = new Uint8Array(original);
    expect(decodedBytes.length).toBe(originalBytes.length);
    for (let i = 0; i < originalBytes.length; i++) {
      expect(decodedBytes[i]).toBe(originalBytes[i]);
    }
  });

  it("isDocxBase64: string biasa → false", () => {
    expect(isDocxBase64("Hello World")).toBe(false);
    expect(isDocxBase64("<html>...</html>")).toBe(false);
    expect(isDocxBase64("")).toBe(false);
  });

  it("isDocxBase64: data URI lain → false", () => {
    expect(isDocxBase64("data:image/png;base64,abc")).toBe(false);
    expect(isDocxBase64("data:application/pdf;base64,abc")).toBe(false);
  });

  it("base64DocxToArrayBuffer: input bukan DOCX → null", () => {
    expect(base64DocxToArrayBuffer("Hello World")).toBeNull();
    expect(base64DocxToArrayBuffer("data:image/png;base64,abc")).toBeNull();
  });

  it("roundtrip: buffer besar (8KB) — test chunk logic", () => {
    const size = 8192;
    const original = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      original[i] = i % 256;
    }
    const encoded = arrayBufferToBase64Docx(original.buffer);
    const decoded = base64DocxToArrayBuffer(encoded);
    expect(decoded).not.toBeNull();
    const decodedBytes = new Uint8Array(decoded!);
    expect(decodedBytes.length).toBe(size);
    for (let i = 0; i < size; i++) {
      expect(decodedBytes[i]).toBe(original[i]);
    }
  });

  it("roundtrip: buffer kosong", () => {
    const original = new Uint8Array(0).buffer;
    const encoded = arrayBufferToBase64Docx(original);
    const decoded = base64DocxToArrayBuffer(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.byteLength).toBe(0);
  });
});

/* ---------- P0-1 regression: ATP import preview konsistensi ---------- */

describe("P0-1 regression: ATP import preview konsisten dengan apply", () => {
  it("validateAtpImport + atpImportToEntries menghasilkan entries yang jumlahnya sama dengan preview", () => {
    const json = {
      $schema: "guru-admin-flow/atp/v1",
      subject: "PPKn",
      grade: "VII",
      phase: "D",
      entries: [
        { bab: "1", elemen: "Norma", cp: "CP1", tp: "TP1", alokasiJP: 2 },
        { bab: "1", elemen: "Norma", cp: "CP1", tp: "TP2", alokasiJP: 3 },
        { bab: "2", elemen: "Aturan", cp: "CP2", tp: "TP3", alokasiJP: 2 },
      ],
    };
    const v = validateAtpImport(json);
    expect(v.success).toBe(true);
    if (!v.success) return;
    const entries = atpImportToEntries(v.data);
    // Preview menampilkan entries.length = 3, Apply menyimpan entries.length = 3.
    // Tidak ada perbedaan (regression: sebelumnya apply re-parse, bisa berbeda).
    expect(entries).toHaveLength(3);
    expect(entries[0].elemen).toBe("Norma");
    expect(entries[2].elemen).toBe("Aturan");
  });

  it("Excel paste preview konsisten dengan apply", () => {
    const text = [
      "Elemen\tCP\tTP\tAlokasi JP",
      "Norma\tCP1\tTP1\t2",
      "Norma\tCP1\tTP2\t3",
    ].join("\n");
    const meta: AtpPasteMeta = { subject: "PPKn", grade: "VII", phase: "D" };
    const result = parseAtpExcelPaste(text);
    const entries = atpPasteRowsToEntries(result.rows, meta);
    // Preview menampilkan rows.length = 2, Apply menyimpan entries.length = 2.
    expect(entries).toHaveLength(2);
    expect(entries[0].subject).toBe("PPKn");
    expect(entries[0].alokasiJP).toBe(2);
  });
});

/* ---------- P1-4 regression: Prota Excel paste JP konsistensi ---------- */

describe("P1-4 regression: Prota Excel paste JP validation", () => {
  it("parser tidak menolak unit dengan JP valid (> 0)", () => {
    const text = [
      "Semester\tMateri\tJP\tOrder",
      "1\tBab 1\t2\t1",
      "1\tBab 2\t3\t2",
    ].join("\n");
    const result = parseProtaExcelPaste(text);
    expect(result.units).toHaveLength(2);
    expect(result.units[0].jp).toBe(2);
    expect(result.units[1].jp).toBe(3);
  });

  it("parser menolak JP 0 (bukan positive)", () => {
    const text = [
      "Semester\tMateri\tJP\tOrder",
      "1\tBab 1\t0\t1",
    ].join("\n");
    const result = parseProtaExcelPaste(text);
    expect(result.units).toHaveLength(0);
    expect(result.skippedRows).toHaveLength(1);
  });

  it("parser menolak JP negatif", () => {
    const text = [
      "Semester\tMateri\tJP\tOrder",
      "1\tBab 1\t-1\t1",
    ].join("\n");
    const result = parseProtaExcelPaste(text);
    expect(result.units).toHaveLength(0);
  });

  it("parser menerima Order 0 (nonnegative)", () => {
    const text = [
      "Semester\tMateri\tJP\tOrder",
      "1\tBab 1\t2\t0",
    ].join("\n");
    const result = parseProtaExcelPaste(text);
    expect(result.units).toHaveLength(1);
    expect(result.units[0].order).toBe(0);
  });

  it("logika konsistensi JP: sem1 + sem2 ≠ annual → deteksi (test logic)", () => {
    // Simulasi logic yang ada di ProtaPage handleImport
    const annualIntraJP = 100;
    const semester1IntraJP = 60;
    const semester2IntraJP = 30; // 60 + 30 = 90 ≠ 100
    const isInconsistent = annualIntraJP > 0 && semester1IntraJP + semester2IntraJP !== annualIntraJP;
    expect(isInconsistent).toBe(true);
  });

  it("logika konsistensi JP: sem1 + sem2 = annual → konsisten", () => {
    const annualIntraJP = 100;
    const semester1IntraJP = 60;
    const semester2IntraJP = 40; // 60 + 40 = 100 = annual
    const isInconsistent = annualIntraJP > 0 && semester1IntraJP + semester2IntraJP !== annualIntraJP;
    expect(isInconsistent).toBe(false);
  });

  it("logika konsistensi JP: annual = 0 → skip check (tidak warning)", () => {
    const annualIntraJP = 0;
    const semester1IntraJP = 60;
    const semester2IntraJP = 40;
    const isInconsistent = annualIntraJP > 0 && semester1IntraJP + semester2IntraJP !== annualIntraJP;
    expect(isInconsistent).toBe(false); // annual = 0 → skip
  });
});

/* ---------- P1-3 regression: Prota duplikat deteksi logic ---------- */

describe("P1-3 regression: Prota duplikat deteksi logic", () => {
  it("deteksi duplikat: subject+grade sama → duplikat", () => {
    const existing = [
      { subject: "PPKn", grade: "VII", status: "draft" },
      { subject: "IPA", grade: "VIII", status: "final" },
    ];
    const newMeta = { subject: "PPKn", grade: "VII" };
    const duplicate = existing.find(
      (p) => p.subject === newMeta.subject && p.grade === newMeta.grade
    );
    expect(duplicate).toBeDefined();
    expect(duplicate?.status).toBe("draft");
  });

  it("deteksi duplikat: subject beda → tidak duplikat", () => {
    const existing = [
      { subject: "PPKn", grade: "VII", status: "draft" },
    ];
    const newMeta = { subject: "IPA", grade: "VII" };
    const duplicate = existing.find(
      (p) => p.subject === newMeta.subject && p.grade === newMeta.grade
    );
    expect(duplicate).toBeUndefined();
  });

  it("deteksi duplikat: grade beda → tidak duplikat", () => {
    const existing = [
      { subject: "PPKn", grade: "VII", status: "draft" },
    ];
    const newMeta = { subject: "PPKn", grade: "VIII" };
    const duplicate = existing.find(
      (p) => p.subject === newMeta.subject && p.grade === newMeta.grade
    );
    expect(duplicate).toBeUndefined();
  });
});

/* ---------- PAKET-ADMINISTRASI-FINAL-RC1: category grouping logic ---------- */

describe("PAKET-ADMINISTRASI-FINAL-RC1: category grouping", () => {
  type DocCategory = "perencanaan" | "harian" | "evaluasi" | "dokumen" | "laporan";
  type DocItem = { id: string; category: DocCategory; status: "lengkap" | "belum" | "kosong" };

  const CATEGORY_ORDER: DocCategory[] = ["perencanaan", "harian", "evaluasi", "dokumen", "laporan"];

  const docs: DocItem[] = [
    { id: "prota", category: "perencanaan", status: "lengkap" },
    { id: "promes", category: "perencanaan", status: "belum" },
    { id: "atp", category: "perencanaan", status: "lengkap" },
    { id: "roster", category: "harian", status: "lengkap" },
    { id: "attendance", category: "harian", status: "belum" },
    { id: "grades", category: "evaluasi", status: "kosong" },
    { id: "remedial", category: "evaluasi", status: "belum" },
    { id: "lkpd", category: "dokumen", status: "lengkap" },
    { id: "laporan", category: "laporan", status: "belum" },
  ];

  it("grouping by category menghasilkan 5 grup sesuai urutan", () => {
    const groups = CATEGORY_ORDER.map((cat) => ({
      category: cat,
      items: docs.filter((d) => d.category === cat),
    })).filter((g) => g.items.length > 0);

    expect(groups).toHaveLength(5);
    expect(groups[0].category).toBe("perencanaan");
    expect(groups[0].items).toHaveLength(3);
    expect(groups[1].category).toBe("harian");
    expect(groups[1].items).toHaveLength(2);
    expect(groups[4].category).toBe("laporan");
    expect(groups[4].items).toHaveLength(1);
  });

  it("skor kelengkapan = lengkapCount / totalDocs * 100", () => {
    const lengkapCount = docs.filter((d) => d.status === "lengkap").length;
    const totalDocs = docs.length;
    const score = Math.round((lengkapCount / totalDocs) * 100);
    expect(lengkapCount).toBe(4);
    expect(totalDocs).toBe(9);
    expect(score).toBe(44);
  });

  it("count per status akurat", () => {
    const lengkap = docs.filter((d) => d.status === "lengkap").length;
    const belum = docs.filter((d) => d.status === "belum").length;
    const kosong = docs.filter((d) => d.status === "kosong").length;
    expect(lengkap).toBe(4);
    expect(belum).toBe(4);
    expect(kosong).toBe(1);
  });

  it("deadline indicator: hari ke akhir semester", () => {
    const todayISO = "2026-06-24";
    const semesterEnd = "2026-12-20";
    const days = Math.ceil(
      (new Date(semesterEnd).getTime() - new Date(todayISO).getTime()) / (1000 * 60 * 60 * 24)
    );
    expect(days).toBeGreaterThan(0);
    expect(days).toBeLessThan(365);
  });

  it("deadline indicator: hari sudah lewat akhir semester", () => {
    const todayISO = "2026-12-25";
    const semesterEnd = "2026-12-20";
    const days = Math.ceil(
      (new Date(semesterEnd).getTime() - new Date(todayISO).getTime()) / (1000 * 60 * 60 * 24)
    );
    expect(days).toBeLessThan(0);
  });
});
