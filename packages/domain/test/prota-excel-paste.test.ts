/**
 * Tests untuk Prota Excel paste parser.
 *
 * IMPORT-BANK-TP-PROTA-RC1: Plan Kerja Bapak item #5.
 */

import { describe, it, expect } from "vitest";
import { parseProtaExcelPaste } from "../src/prota-import";

describe("parseProtaExcelPaste — header valid", () => {
  it("parse tab-separated dengan header lengkap", () => {
    const text = [
      "Semester\tMateri\tJP\tOrder\tCode\tLearning Outcome",
      "1\tBab 1: Norma\t2\t1\tM1\tMemahami norma",
      "1\tBab 2: Aturan\t3\t2\tM2\tMemahami aturan",
      "2\tBab 3: Hukum\t2\t3\tM3\tMemahami hukum",
    ].join("\n");
    const result = parseProtaExcelPaste(text);
    expect(result.units).toHaveLength(3);
    expect(result.skippedRows).toHaveLength(0);
    expect(result.units[0].semester).toBe(1);
    expect(result.units[0].title).toBe("Bab 1: Norma");
    expect(result.units[0].jp).toBe(2);
    expect(result.units[0].order).toBe(1);
    expect(result.units[0].code).toBe("M1");
    expect(result.units[0].learningOutcome).toBe("Memahami norma");
  });

  it("parse comma-separated", () => {
    const text = [
      "Semester,Materi,JP,Order",
      "1,Bab 1,2,1",
    ].join("\n");
    const result = parseProtaExcelPaste(text);
    expect(result.units).toHaveLength(1);
    expect(result.units[0].title).toBe("Bab 1");
  });

  it("parse semicolon-separated", () => {
    const text = [
      "Semester;Materi;JP;Order",
      "1;Bab 1;2;1",
    ].join("\n");
    const result = parseProtaExcelPaste(text);
    expect(result.units).toHaveLength(1);
  });

  it("header alias: 'Judul' → title, 'Urutan' → order, 'Kode' → code", () => {
    const text = [
      "Semester\tJudul\tJP\tUrutan\tKode",
      "1\tBab 1\t2\t1\tM1",
    ].join("\n");
    const result = parseProtaExcelPaste(text);
    expect(result.units[0].title).toBe("Bab 1");
    expect(result.units[0].order).toBe(1);
    expect(result.units[0].code).toBe("M1");
  });

  it("header alias: 'Materi' → title, 'No' → order, 'Alokasi' → jp", () => {
    const text = [
      "Materi\tNo\tAlokasi\tSemester",
      "Bab 1\t1\t2\t1",
    ].join("\n");
    const result = parseProtaExcelPaste(text);
    expect(result.units[0].title).toBe("Bab 1");
    expect(result.units[0].order).toBe(1);
    expect(result.units[0].jp).toBe(2);
    expect(result.units[0].semester).toBe(1);
  });

  it("semester 'Ganjil' → 1, 'Genap' → 2", () => {
    const text = [
      "Semester\tMateri\tJP\tOrder",
      "Ganjil\tBab 1\t2\t1",
      "Genap\tBab 2\t2\t2",
    ].join("\n");
    const result = parseProtaExcelPaste(text);
    expect(result.units[0].semester).toBe(1);
    expect(result.units[1].semester).toBe(2);
  });

  it("field opsional kosong → undefined", () => {
    const text = [
      "Semester\tMateri\tJP\tOrder\tCode\tLearning Outcome",
      "1\tBab 1\t2\t1\t\t",
    ].join("\n");
    const result = parseProtaExcelPaste(text);
    expect(result.units[0].code).toBeUndefined();
    expect(result.units[0].learningOutcome).toBeUndefined();
  });

  it("skip baris dengan field wajib kosong", () => {
    const text = [
      "Semester\tMateri\tJP\tOrder",
      "1\tBab 1\t2\t1",
      "\tBab 2\t2\t2",
      "1\t\t2\t3",
      "1\tBab 4\t\t4",
      "1\tBab 5\t2\t",
    ].join("\n");
    const result = parseProtaExcelPaste(text);
    expect(result.units).toHaveLength(1);
    expect(result.skippedRows).toHaveLength(4);
  });

  it("jp bukan angka → skip baris", () => {
    const text = [
      "Semester\tMateri\tJP\tOrder",
      "1\tBab 1\tdua\t1",
    ].join("\n");
    const result = parseProtaExcelPaste(text);
    expect(result.units).toHaveLength(0);
    expect(result.skippedRows).toHaveLength(1);
  });

  it("semester invalid (3) → skip baris", () => {
    const text = [
      "Semester\tMateri\tJP\tOrder",
      "3\tBab 1\t2\t1",
    ].join("\n");
    const result = parseProtaExcelPaste(text);
    expect(result.units).toHaveLength(0);
    expect(result.skippedRows).toHaveLength(1);
  });
});

describe("parseProtaExcelPaste — mode fallback", () => {
  it("fallback: asumsi urutan [Semester, Materi, JP, Order, Code, LO]", () => {
    const text = [
      "1\tBab 1: Norma\t2\t1\tM1\tMemahami norma",
      "2\tBab 3: Hukum\t2\t2\tM3\tMemahami hukum",
    ].join("\n");
    const result = parseProtaExcelPaste(text);
    expect(result.units).toHaveLength(2);
    expect(result.units[0].semester).toBe(1);
    expect(result.units[0].title).toBe("Bab 1: Norma");
    expect(result.units[0].code).toBe("M1");
  });

  it("fallback: minimal 4 kolom (Semester, Materi, JP, Order)", () => {
    const text = [
      "1\tBab 1\t2\t1",
    ].join("\n");
    const result = parseProtaExcelPaste(text);
    expect(result.units).toHaveLength(1);
    expect(result.units[0].code).toBeUndefined();
    expect(result.units[0].learningOutcome).toBeUndefined();
  });

  it("fallback: <4 kolom → skip", () => {
    const text = [
      "1\tBab 1\t2",
    ].join("\n");
    const result = parseProtaExcelPaste(text);
    expect(result.units).toHaveLength(0);
    expect(result.skippedRows).toHaveLength(1);
  });

  it("fallback: semester 'Ganjil' diterima", () => {
    const text = [
      "Ganjil\tBab 1\t2\t1",
    ].join("\n");
    const result = parseProtaExcelPaste(text);
    expect(result.units).toHaveLength(1);
    expect(result.units[0].semester).toBe(1);
  });
});

describe("parseProtaExcelPaste — edge case", () => {
  it("teks kosong → units kosong", () => {
    const result = parseProtaExcelPaste("");
    expect(result.units).toHaveLength(0);
    expect(result.skippedRows).toHaveLength(0);
  });

  it("teks hanya whitespace → units kosong", () => {
    const result = parseProtaExcelPaste("  \n  \t  ");
    expect(result.units).toHaveLength(0);
  });

  it("header ada tapi tidak lengkap → mode fallback dengan warning", () => {
    const text = [
      "Materi\tCode",
      "Bab 1\tM1",
      "1\tBab 2\t2\t2\tM2",
    ].join("\n");
    const result = parseProtaExcelPaste(text);
    // Header ada (Materi, Code) tapi tidak lengkap (semua kolom wajib) → fallback
    expect(result.skippedRows[0].reason).toMatch(/header tidak lengkap/i);
  });

  it("multiple baris dengan campuran valid/invalid", () => {
    const text = [
      "Semester\tMateri\tJP\tOrder",
      "1\tBab 1\t2\t1",
      "1\tBab 2\tdua\t2",   // JP invalid
      "Ganjil\tBab 3\t3\t3",
      "1\tBab 4\t2\t4",
    ].join("\n");
    const result = parseProtaExcelPaste(text);
    expect(result.units).toHaveLength(3); // baris 1, 3, 4 valid
    expect(result.skippedRows).toHaveLength(1); // baris 2 invalid
    expect(result.units[1].title).toBe("Bab 3");
    expect(result.units[1].semester).toBe(1); // Ganjil → 1
  });
});
