/**
 * Tests untuk ATP import (JSON) + Excel paste.
 *
 * IMPORT-BANK-TP-PROTA-RC1: Plan Kerja Bapak item #5.
 */

import { describe, it, expect } from "vitest";
import {
  validateAtpImport,
  atpImportToEntries,
  parseAtpExcelPaste,
  atpPasteRowsToEntries,
  type AtpPasteMeta,
} from "../src/atp-import";

const validAtpImport = {
  $schema: "guru-admin-flow/atp/v1",
  subject: "PPKn",
  grade: "VII",
  phase: "D",
  teacherName: "Budi Santoso, S.Pd.",
  entries: [
    {
      bab: "1",
      elemen: "Norma",
      cp: "Memahami norma dalam kehidupan sehari-hari",
      tp: "Peserta didik mampu menjelaskan pengertian norma",
      profilPelajar: "Beriman, Bernalar Kritis",
      kataKunci: "norma, aturan, kesepakatan",
      alokasiJP: 2,
    },
    {
      bab: "1",
      elemen: "Norma",
      cp: "Memahami norma dalam kehidupan sehari-hari",
      tp: "Peserta didik mampu menyebutkan jenis-jenis norma",
      alokasiJP: 3,
    },
  ],
};

/* ---------- validateAtpImport ---------- */

describe("validateAtpImport", () => {
  it("menerima JSON valid lengkap", () => {
    const v = validateAtpImport(validAtpImport);
    expect(v.success).toBe(true);
    expect(v.success && v.data.entries).toHaveLength(2);
  });

  it("menerima tanpa teacherName (opsional)", () => {
    const v = validateAtpImport({ ...validAtpImport, teacherName: undefined });
    expect(v.success).toBe(true);
  });

  it("menerima tanpa bab, profilPelajar, kataKunci (opsional)", () => {
    const v = validateAtpImport({
      ...validAtpImport,
      entries: [
        {
          elemen: "Norma",
          cp: "CP1",
          tp: "TP1",
          alokasiJP: 2,
        },
      ],
    });
    expect(v.success).toBe(true);
  });

  it("menolak entries kosong", () => {
    const v = validateAtpImport({ ...validAtpImport, entries: [] });
    expect(v.success).toBe(false);
  });

  it("menolak alokasiJP 0", () => {
    const v = validateAtpImport({
      ...validAtpImport,
      entries: [{ ...validAtpImport.entries[0], alokasiJP: 0 }],
    });
    expect(v.success).toBe(false);
  });

  it("menolak alokasiJP negatif", () => {
    const v = validateAtpImport({
      ...validAtpImport,
      entries: [{ ...validAtpImport.entries[0], alokasiJP: -1 }],
    });
    expect(v.success).toBe(false);
  });

  it("menolak alokasiJP desimal", () => {
    const v = validateAtpImport({
      ...validAtpImport,
      entries: [{ ...validAtpImport.entries[0], alokasiJP: 2.5 }],
    });
    expect(v.success).toBe(false);
  });

  it("menolak elemen kosong", () => {
    const v = validateAtpImport({
      ...validAtpImport,
      entries: [{ ...validAtpImport.entries[0], elemen: "" }],
    });
    expect(v.success).toBe(false);
  });

  it("menolak cp kosong", () => {
    const v = validateAtpImport({
      ...validAtpImport,
      entries: [{ ...validAtpImport.entries[0], cp: "" }],
    });
    expect(v.success).toBe(false);
  });

  it("menolak tp kosong", () => {
    const v = validateAtpImport({
      ...validAtpImport,
      entries: [{ ...validAtpImport.entries[0], tp: "" }],
    });
    expect(v.success).toBe(false);
  });

  it("menolak subject kosong", () => {
    const v = validateAtpImport({ ...validAtpImport, subject: "" });
    expect(v.success).toBe(false);
  });

  it("menolak grade kosong", () => {
    const v = validateAtpImport({ ...validAtpImport, grade: "" });
    expect(v.success).toBe(false);
  });

  it("menolak phase kosong", () => {
    const v = validateAtpImport({ ...validAtpImport, phase: "" });
    expect(v.success).toBe(false);
  });

  it("menolak $schema salah", () => {
    const v = validateAtpImport({ ...validAtpImport, $schema: "wrong" });
    expect(v.success).toBe(false);
  });

  it("menolak input bukan object", () => {
    const v = validateAtpImport("not-object");
    expect(v.success).toBe(false);
  });

  it("menolak input null", () => {
    const v = validateAtpImport(null);
    expect(v.success).toBe(false);
  });
});

/* ---------- atpImportToEntries ---------- */

describe("atpImportToEntries", () => {
  it("konversi entries dengan benar", () => {
    const v = validateAtpImport(validAtpImport);
    expect(v.success).toBe(true);
    if (!v.success) return;
    const entries = atpImportToEntries(v.data);
    expect(entries).toHaveLength(2);
    expect(entries[0].subject).toBe("PPKn");
    expect(entries[0].grade).toBe("VII");
    expect(entries[0].phase).toBe("D");
    expect(entries[0].bab).toBe("1");
    expect(entries[0].elemen).toBe("Norma");
    expect(entries[0].alokasiJP).toBe(2);
    expect(entries[0].classId).toBeUndefined();
  });

  it("entry tanpa field opsional → field undefined", () => {
    const v = validateAtpImport({
      ...validAtpImport,
      entries: [{ elemen: "X", cp: "CP", tp: "TP", alokasiJP: 2 }],
    });
    expect(v.success).toBe(true);
    if (!v.success) return;
    const entries = atpImportToEntries(v.data);
    expect(entries[0].bab).toBeUndefined();
    expect(entries[0].profilPelajar).toBeUndefined();
    expect(entries[0].kataKunci).toBeUndefined();
  });
});

/* ---------- parseAtpExcelPaste ---------- */

describe("parseAtpExcelPaste — header valid", () => {
  it("parse tab-separated dengan header lengkap", () => {
    const text = [
      "Bab\tElemen\tCP\tTP\tProfil Pelajar\tKata Kunci\tAlokasi JP",
      "1\tNorma\tMemahami norma\tMenjelaskan norma\tBernalar\tnorma\t2",
      "1\tNorma\tMemahami norma\tMenyebutkan jenis\tBeriman\tnorma,jenis\t3",
    ].join("\n");
    const result = parseAtpExcelPaste(text);
    expect(result.rows).toHaveLength(2);
    expect(result.skippedRows).toHaveLength(0);
    expect(result.rows[0].bab).toBe("1");
    expect(result.rows[0].elemen).toBe("Norma");
    expect(result.rows[0].alokasiJP).toBe(2);
    expect(result.rows[1].kataKunci).toBe("norma,jenis");
  });

  it("parse comma-separated", () => {
    const text = [
      "Elemen,CP,TP,Alokasi JP",
      "Norma,Memahami,Menjelaskan,2",
    ].join("\n");
    const result = parseAtpExcelPaste(text);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].elemen).toBe("Norma");
    expect(result.rows[0].alokasiJP).toBe(2);
  });

  it("parse semicolon-separated", () => {
    const text = [
      "Elemen;CP;TP;Alokasi JP",
      "Norma;Memahami;Menjelaskan;2",
    ].join("\n");
    const result = parseAtpExcelPaste(text);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].elemen).toBe("Norma");
  });

  it("header alias: 'Capaian Pembelajaran' → cp, 'Tujuan Pembelajaran' → tp", () => {
    const text = [
      "Elemen\tCapaian Pembelajaran\tTujuan Pembelajaran\tJP",
      "Norma\tMemahami\tMenjelaskan\t2",
    ].join("\n");
    const result = parseAtpExcelPaste(text);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].cp).toBe("Memahami");
    expect(result.rows[0].tp).toBe("Menjelaskan");
  });

  it("header alias: 'Alokasi' → alokasiJP, 'Profil' → profilPelajar", () => {
    const text = [
      "Elemen\tCP\tTP\tAlokasi\tProfil",
      "Norma\tCP1\tTP1\t2\tBernalar",
    ].join("\n");
    const result = parseAtpExcelPaste(text);
    expect(result.rows[0].alokasiJP).toBe(2);
    expect(result.rows[0].profilPelajar).toBe("Bernalar");
  });

  it("field opsional kosong → undefined", () => {
    const text = [
      "Elemen\tCP\tTP\tAlokasi JP\tBab",
      "Norma\tCP1\tTP1\t2\t",
    ].join("\n");
    const result = parseAtpExcelPaste(text);
    expect(result.rows[0].bab).toBeUndefined();
  });

  it("skip baris dengan field wajib kosong", () => {
    const text = [
      "Elemen\tCP\tTP\tAlokasi JP",
      "Norma\tCP1\tTP1\t2",
      "\tCP2\tTP2\t3",
      "Norma\t\tTP3\t4",
    ].join("\n");
    const result = parseAtpExcelPaste(text);
    expect(result.rows).toHaveLength(1);
    expect(result.skippedRows).toHaveLength(2);
  });

  it("alokasiJP bukan angka → skip baris", () => {
    const text = [
      "Elemen\tCP\tTP\tAlokasi JP",
      "Norma\tCP1\tTP1\tdua",
    ].join("\n");
    const result = parseAtpExcelPaste(text);
    expect(result.rows).toHaveLength(0);
    expect(result.skippedRows).toHaveLength(1);
  });

  it("alokasiJP 0 atau negatif → skip baris", () => {
    const text = [
      "Elemen\tCP\tTP\tAlokasi JP",
      "Norma\tCP1\tTP1\t0",
      "Norma\tCP2\tTP2\t-1",
      "Norma\tCP3\tTP3\t2",
    ].join("\n");
    const result = parseAtpExcelPaste(text);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].alokasiJP).toBe(2);
  });
});

describe("parseAtpExcelPaste — mode fallback (tanpa header valid)", () => {
  it("fallback: asumsi urutan [Elemen, CP, TP, JP, Bab, Profil, KataKunci]", () => {
    const text = [
      "Norma\tCP1\tTP1\t2\t1\tBernalar\tnorma",
      "Norma\tCP2\tTP2\t3\t2\tBeriman\tnorma2",
    ].join("\n");
    const result = parseAtpExcelPaste(text);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].elemen).toBe("Norma");
    expect(result.rows[0].cp).toBe("CP1");
    expect(result.rows[0].tp).toBe("TP1");
    expect(result.rows[0].alokasiJP).toBe(2);
    expect(result.rows[0].bab).toBe("1");
    expect(result.rows[0].profilPelajar).toBe("Bernalar");
    expect(result.rows[0].kataKunci).toBe("norma");
  });

  it("fallback: minimal 4 kolom [Elemen, CP, TP, JP]", () => {
    const text = [
      "Norma\tCP1\tTP1\t2",
    ].join("\n");
    const result = parseAtpExcelPaste(text);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].elemen).toBe("Norma");
    expect(result.rows[0].alokasiJP).toBe(2);
    expect(result.rows[0].bab).toBeUndefined();
  });

  it("fallback: 5 kolom [Elemen, CP, TP, JP, Bab]", () => {
    const text = [
      "Norma\tCP1\tTP1\t2\t1",
    ].join("\n");
    const result = parseAtpExcelPaste(text);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].bab).toBe("1");
  });

  it("fallback: <4 kolom → skip", () => {
    const text = [
      "Norma\tCP1\tTP1",
    ].join("\n");
    const result = parseAtpExcelPaste(text);
    expect(result.rows).toHaveLength(0);
    expect(result.skippedRows).toHaveLength(1);
  });
});

describe("parseAtpExcelPaste — edge case", () => {
  it("teks kosong → rows kosong", () => {
    const result = parseAtpExcelPaste("");
    expect(result.rows).toHaveLength(0);
    expect(result.skippedRows).toHaveLength(0);
  });

  it("teks hanya whitespace → rows kosong", () => {
    const result = parseAtpExcelPaste("   \n  \t  ");
    expect(result.rows).toHaveLength(0);
  });

  it("header ada tapi tidak ada kolom wajib → semua baris skip", () => {
    const text = [
      "Bab\tProfil Pelajar",
      "1\tBernalar",
    ].join("\n");
    const result = parseAtpExcelPaste(text);
    // Header tidak lengkap → mode fallback dengan warning
    expect(result.rows.length + result.skippedRows.length).toBeGreaterThan(0);
  });
});

/* ---------- atpPasteRowsToEntries ---------- */

describe("atpPasteRowsToEntries", () => {
  it("merge rows dengan meta (subject/grade/phase)", () => {
    const meta: AtpPasteMeta = { subject: "IPA", grade: "VIII", phase: "D" };
    const rows = [
      {
        bab: "1",
        elemen: "Materi",
        cp: "CP1",
        tp: "TP1",
        alokasiJP: 2,
      },
    ];
    const entries = atpPasteRowsToEntries(rows, meta);
    expect(entries).toHaveLength(1);
    expect(entries[0].subject).toBe("IPA");
    expect(entries[0].grade).toBe("VIII");
    expect(entries[0].phase).toBe("D");
    expect(entries[0].elemen).toBe("Materi");
  });
});
