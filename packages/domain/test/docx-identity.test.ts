/**
 * Tests untuk DOCX identity replacement.
 *
 * DOCX-IDENTITY-RC1: Plan Kerja Bapak item #4.
 *
 * Strategi test:
 *   - Generate DOCX minimal secara programmatik (JSZip) di test setup.
 *   - Test roundtrip: buat DOCX → processDocxIdentity → extractDocxText →
 *     assert teks sudah di-replace.
 *   - Test edge case: DOCX rusak, DOCX tanpa document.xml, placeholder
 *     ter-split lintas run, literal replacement, XML escape.
 */

import { describe, it, expect, beforeAll } from "vitest";
import JSZip from "jszip";
import {
  processDocxIdentity,
  isValidDocx,
  extractDocxText,
} from "../src/docx-identity";
import type { RppIdentityContext, LiteralReplacement } from "../src/rpp-document";

const baseCtx: RppIdentityContext = {
  schoolName: "SMPN 8 Bantan",
  schoolAddress: "Jl. Pendidikan No. 1, Bantan",
  headmasterName: "Drs. Kepala Sekolah, M.Pd.",
  headmasterNip: "196501011990031001",
  teacherName: "Budi Santoso, S.Pd.",
  teacherNip: "198501012010011001",
  subject: "Ilmu Pengetahuan Alam",
  classLabel: "VII A",
  semester: "Ganjil",
  academicYearLabel: "2025/2026",
  fase: "D",
  place: "Bantan",
  date: "24 Juni 2026",
};

/** Bangun DOCX minimal dengan teks tertentu di word/document.xml. */
async function buildDocx(documentXml: string): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );
  zip.file("word/document.xml", documentXml);
  return zip.generateAsync({ type: "arraybuffer" });
}

/** Template document.xml minimal dengan paragraph. */
function docXml(paragraphs: string[]): string {
  const body = paragraphs
    .map(
      (p) =>
        `<w:p><w:r><w:t xml:space="preserve">${p}</w:t></w:r></w:p>`
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${body}</w:body>
</w:document>`;
}

/** Template document.xml dengan paragraph yang <w:t>-nya di-split lintas run. */
function docXmlSplitRuns(parts: string[]): string {
  // Satu paragraph, multiple <w:r><w:t> adjacent
  const runs = parts
    .map((p) => `<w:r><w:t xml:space="preserve">${p}</w:t></w:r>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body><w:p>${runs}</w:p></w:body>
</w:document>`;
}

describe("DOCX-IDENTITY-RC1 — isValidDocx", () => {
  it("menerima DOCX valid dengan word/document.xml", async () => {
    const buf = await buildDocx(docXml(["Hello"]));
    expect(await isValidDocx(buf)).toBe(true);
  });

  it("menolak buffer bukan ZIP", async () => {
    const buf = new TextEncoder().encode("not a zip").buffer;
    expect(await isValidDocx(buf)).toBe(false);
  });

  it("menolak ZIP tanpa word/document.xml", async () => {
    const zip = new JSZip();
    zip.file("foo.txt", "bar");
    const buf = await zip.generateAsync({ type: "arraybuffer" });
    expect(await isValidDocx(buf)).toBe(false);
  });
});

describe("DOCX-IDENTITY-RC1 — extractDocxText", () => {
  it("ekstrak teks dari DOCX sederhana", async () => {
    const buf = await buildDocx(docXml(["Hello World", "Second paragraph"]));
    const text = await extractDocxText(buf);
    expect(text).toContain("Hello World");
    expect(text).toContain("Second paragraph");
  });

  it("ekstrak teks dari DOCX dengan split runs", async () => {
    const buf = await buildDocx(docXmlSplitRuns(["Hel", "lo ", "World"]));
    const text = await extractDocxText(buf);
    expect(text).toContain("Hello World");
  });
});

describe("DOCX-IDENTITY-RC1 — processDocxIdentity (placeholder)", () => {
  it("replace placeholder tunggal di satu run", async () => {
    const buf = await buildDocx(
      docXml(["Sekolah: {{NAMA_SEKOLAH}}"])
    );
    const result = await processDocxIdentity({
      docxBuffer: buf,
      context: baseCtx,
    });
    expect(result.stats.placeholdersFound).toBe(1);
    expect(result.stats.placeholdersReplaced).toBe(1);
    const text = await extractDocxText(result.outputBlob);
    expect(text).toContain("Sekolah: SMPN 8 Bantan");
    expect(text).not.toContain("{{NAMA_SEKOLAH}}");
  });

  it("replace multiple placeholder berbeda", async () => {
    const buf = await buildDocx(
      docXml([
        "Sekolah: {{NAMA_SEKOLAH}}, Guru: {{NAMA_GURU}}",
        "Mapel: {{MAPEL}}, Kelas: {{KELAS}}, Semester: {{SEMESTER}}",
      ])
    );
    const result = await processDocxIdentity({
      docxBuffer: buf,
      context: baseCtx,
    });
    // 2 placeholder di paragraf 1 (NAMA_SEKOLAH + NAMA_GURU) + 3 di paragraf 2 (MAPEL + KELAS + SEMESTER) = 5
    expect(result.stats.placeholdersReplaced).toBe(5);
    const text = await extractDocxText(result.outputBlob);
    expect(text).toContain("Sekolah: SMPN 8 Bantan, Guru: Budi Santoso, S.Pd.");
    expect(text).toContain("Mapel: Ilmu Pengetahuan Alam, Kelas: VII A, Semester: Ganjil");
  });

  it("replace placeholder yang sama berkali-kali", async () => {
    const buf = await buildDocx(
      docXml([
        "{{NAMA_SEKOLAH}} adalah sekolah saya.",
        "Saya belajar di {{NAMA_SEKOLAH}}.",
        "{{NAMA_SEKOLAH}} bagus.",
      ])
    );
    const result = await processDocxIdentity({
      docxBuffer: buf,
      context: baseCtx,
    });
    expect(result.stats.placeholdersReplaced).toBe(3);
  });

  it("replace placeholder yang ter-split lintas run", async () => {
    // "{{NAMA_SEKOLAH}}" di-split jadi "{{NAMA_", "SEKOLAH", "}}"
    const buf = await buildDocx(
      docXmlSplitRuns(["Sekolah: {{NAMA_", "SEKOLAH", "}}"])
    );
    const result = await processDocxIdentity({
      docxBuffer: buf,
      context: baseCtx,
    });
    expect(result.stats.placeholdersFound).toBe(1);
    expect(result.stats.placeholdersReplaced).toBe(1);
    const text = await extractDocxText(result.outputBlob);
    expect(text).toContain("Sekolah: SMPN 8 Bantan");
  });

  it("replace placeholder yang ter-split per karakter (worst case)", async () => {
    const parts = "{{NAMA_SEKOLAH}}".split("");
    const buf = await buildDocx(docXmlSplitRuns(parts));
    const result = await processDocxIdentity({
      docxBuffer: buf,
      context: baseCtx,
    });
    expect(result.stats.placeholdersReplaced).toBe(1);
    const text = await extractDocxText(result.outputBlob);
    expect(text).toContain("SMPN 8 Bantan");
  });

  it("tidak mengubah teks lain selain placeholder", async () => {
    const buf = await buildDocx(
      docXml([
        "Langkah 1: Membaca teks bacaan",
        "Langkah 2: Diskusi kelompok",
        "Sekolah: {{NAMA_SEKOLAH}}",
      ])
    );
    const result = await processDocxIdentity({
      docxBuffer: buf,
      context: baseCtx,
    });
    const text = await extractDocxText(result.outputBlob);
    expect(text).toContain("Langkah 1: Membaca teks bacaan");
    expect(text).toContain("Langkah 2: Diskusi kelompok");
  });
});

describe("DOCX-IDENTITY-RC1 — processDocxIdentity (literal)", () => {
  it("replace literal text tunggal", async () => {
    const buf = await buildDocx(
      docXml(["SMA Negeri 1 Jakarta adalah sekolah lama."])
    );
    const literals: LiteralReplacement[] = [
      { oldText: "SMA Negeri 1 Jakarta", newText: "SMPN 8 Bantan" },
    ];
    const result = await processDocxIdentity({
      docxBuffer: buf,
      context: baseCtx,
      literalReplacements: literals,
    });
    expect(result.stats.literalMatches).toBe(1);
    const text = await extractDocxText(result.outputBlob);
    expect(text).toContain("SMPN 8 Bantan adalah sekolah lama.");
    expect(text).not.toContain("SMA Negeri 1 Jakarta");
  });

  it("replace multiple literal pairs", async () => {
    const buf = await buildDocx(
      docXml([
        "Guru: Budi Lama",
        "Mapel: IPA Lama",
      ])
    );
    const literals: LiteralReplacement[] = [
      { oldText: "Budi Lama", newText: "Budi Santoso" },
      { oldText: "IPA Lama", newText: "Ilmu Pengetahuan Alam" },
    ];
    const result = await processDocxIdentity({
      docxBuffer: buf,
      context: baseCtx,
      literalReplacements: literals,
    });
    expect(result.stats.literalMatches).toBe(2);
    const text = await extractDocxText(result.outputBlob);
    expect(text).toContain("Guru: Budi Santoso");
    expect(text).toContain("Mapel: Ilmu Pengetahuan Alam");
  });

  it("literal replacement + placeholder bersamaan", async () => {
    const buf = await buildDocx(
      docXml([
        "SMA Negeri 1 adalah {{NAMA_SEKOLAH}} sekarang.",
      ])
    );
    const literals: LiteralReplacement[] = [
      { oldText: "SMA Negeri 1", newText: "SMPN 8" },
    ];
    const result = await processDocxIdentity({
      docxBuffer: buf,
      context: baseCtx,
      literalReplacements: literals,
    });
    const text = await extractDocxText(result.outputBlob);
    expect(text).toContain("SMPN 8 adalah SMPN 8 Bantan sekarang.");
  });

  it("literal dengan karakter XML special (escape)", async () => {
    const buf = await buildDocx(
      docXml(["Tanda < & > dalam teks"])
    );
    const literals: LiteralReplacement[] = [
      { oldText: "< & >", newText: "& < >" },
    ];
    const result = await processDocxIdentity({
      docxBuffer: buf,
      context: baseCtx,
      literalReplacements: literals,
    });
    expect(result.stats.literalMatches).toBe(1);
    const text = await extractDocxText(result.outputBlob);
    expect(text).toContain("& < >");
  });
});

describe("DOCX-IDENTITY-RC1 — processDocxIdentity (edge case)", () => {
  it("menolak buffer bukan ZIP", async () => {
    const buf = new TextEncoder().encode("not a docx").buffer;
    await expect(
      processDocxIdentity({ docxBuffer: buf, context: baseCtx })
    ).rejects.toThrow(/tidak bisa dibaca/);
  });

  it("menolak ZIP tanpa word/document.xml", async () => {
    const zip = new JSZip();
    zip.file("foo.txt", "bar");
    const buf = await zip.generateAsync({ type: "arraybuffer" });
    await expect(
      processDocxIdentity({ docxBuffer: buf, context: baseCtx })
    ).rejects.toThrow(/word\/document\.xml/);
  });

  it("DOCX tanpa placeholder/literal → warning, tetap return DOCX valid", async () => {
    const buf = await buildDocx(docXml(["Dokumen tanpa identitas tertulis."]));
    const result = await processDocxIdentity({
      docxBuffer: buf,
      context: baseCtx,
    });
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toMatch(/tidak ada placeholder/i);
    expect(result.outputBlob).toBeInstanceOf(ArrayBuffer);
    // Output tetap valid DOCX
    expect(await isValidDocx(result.outputBlob)).toBe(true);
  });

  it("context dengan field kosong → placeholder tidak di-replace", async () => {
    const buf = await buildDocx(docXml(["Sekolah: {{NAMA_SEKOLAH}}"]));
    const ctxWithEmpty: RppIdentityContext = { ...baseCtx, schoolName: "" };
    const result = await processDocxIdentity({
      docxBuffer: buf,
      context: ctxWithEmpty,
    });
    // placeholder found tapi 0 replaced (karena value kosong)
    expect(result.stats.placeholdersFound).toBe(1);
    expect(result.stats.placeholdersReplaced).toBe(0);
  });

  it("literalReplacements kosong → tidak ada literal match", async () => {
    const buf = await buildDocx(docXml(["Teks biasa tanpa placeholder."]));
    const result = await processDocxIdentity({
      docxBuffer: buf,
      context: baseCtx,
      literalReplacements: [],
    });
    expect(result.stats.literalMatches).toBe(0);
  });

  it("literal dengan oldText kosong diabaikan", async () => {
    const buf = await buildDocx(docXml(["Teks"]));
    const literals: LiteralReplacement[] = [
      { oldText: "", newText: "Should not match" },
    ];
    const result = await processDocxIdentity({
      docxBuffer: buf,
      context: baseCtx,
      literalReplacements: literals,
    });
    expect(result.stats.literalMatches).toBe(0);
  });

  it("DOCX dengan multiple paragraphs diproses semua", async () => {
    const buf = await buildDocx(
      docXml([
        "Paragraf 1: {{NAMA_SEKOLAH}}",
        "Paragraf 2: {{NAMA_GURU}}",
        "Paragraf 3: {{MAPEL}}",
      ])
    );
    const result = await processDocxIdentity({
      docxBuffer: buf,
      context: baseCtx,
    });
    expect(result.stats.placeholdersReplaced).toBe(3);
    const text = await extractDocxText(result.outputBlob);
    expect(text).toContain("Paragraf 1: SMPN 8 Bantan");
    expect(text).toContain("Paragraf 2: Budi Santoso, S.Pd.");
    expect(text).toContain("Paragraf 3: Ilmu Pengetahuan Alam");
  });

  it("output DOCX bisa di-replace ulang (idempotent-ish)", async () => {
    // Setelah replace {{NAMA_SEKOLAH}} → "SMPN 8 Bantan", replace lagi
    // dengan context baru → "SMPN 8 Bantan" tetap (karena bukan placeholder lagi)
    const buf1 = await buildDocx(docXml(["{{NAMA_SEKOLAH}}"]));
    const result1 = await processDocxIdentity({
      docxBuffer: buf1,
      context: baseCtx,
    });
    // Replace lagi dengan context beda
    const newCtx = { ...baseCtx, schoolName: "SMPN 9 Lain" };
    const result2 = await processDocxIdentity({
      docxBuffer: result1.outputBlob,
      context: newCtx,
    });
    const text = await extractDocxText(result2.outputBlob);
    // Tidak ada placeholder lagi, jadi teks tetap "SMPN 8 Bantan"
    expect(text).toContain("SMPN 8 Bantan");
    expect(text).not.toContain("SMPN 9 Lain");
  });
});

describe("DOCX-IDENTITY-RC1 — processDocxIdentity (stats & files)", () => {
  it("stats.filesProcessed include word/document.xml", async () => {
    const buf = await buildDocx(docXml(["{{NAMA_SEKOLAH}}"]));
    const result = await processDocxIdentity({
      docxBuffer: buf,
      context: baseCtx,
    });
    expect(result.stats.filesProcessed).toContain("word/document.xml");
  });

  it("stats akurat: placeholder found vs replaced", async () => {
    const buf = await buildDocx(
      docXml(["{{NAMA_SEKOLAH}} {{NAMA_SEKOLAH}} {{NIP_GURU}}"])
    );
    const result = await processDocxIdentity({
      docxBuffer: buf,
      context: baseCtx,
    });
    expect(result.stats.placeholdersFound).toBe(3);
    expect(result.stats.placeholdersReplaced).toBe(3);
  });
});
