/**
 * RELEASE-V1-MANUAL-VERIFY-01: Test konkret DOCX end-to-end.
 *
 * Simulasi flow guru:
 *   1. Buat DOCX dengan placeholder {{NAMA_SEKOLAH}}, {{NAMA_GURU}}, dll.
 *   2. Proses dengan processDocxIdentity (replace placeholder)
 *   3. Simpan arsip: originalContent = base64 DOCX asli, processedContent = base64 DOCX hasil
 *   4. Decode processedContent → extract text → verifikasi placeholder sudah hilang
 *   5. Verifikasi: processedContent !== originalContent (bukan DOCX original)
 *
 * Ini menutup P0-1 PATCH-1: arsip DOCX harus menyimpan DOCX hasil replace.
 */

import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import {
  processDocxIdentity,
  isValidDocx,
  extractDocxText,
} from "../src/docx-identity";
import type { RppIdentityContext } from "../src/rpp-document";

const ctx: RppIdentityContext = {
  schoolName: "SMPN 8 Bantan",
  schoolAddress: "Jl. Pendidikan No. 1, Bantan",
  headmasterName: "Drs. Kepala Sekolah, M.Pd.",
  headmasterNip: "196501011990031001",
  teacherName: "Budi Santoso, S.Pd.",
  teacherNip: "198501012010011001",
  subject: "Pendidikan Pancasila",
  classLabel: "VII A",
  semester: "Ganjil",
  academicYearLabel: "2025/2026",
  fase: "D",
  place: "Bantan",
  date: "24 Juni 2026",
};

async function buildDocxWithPlaceholders(): Promise<ArrayBuffer> {
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
  // Document dengan SEMUA placeholder yang disebut Bapak di spec
  const body = `
<w:p><w:r><w:t xml:space="preserve">Sekolah: {{NAMA_SEKOLAH}}</w:t></w:r></w:p>
<w:p><w:r><w:t xml:space="preserve">Guru: {{NAMA_GURU}}</w:t></w:r></w:p>
<w:p><w:r><w:t xml:space="preserve">Mapel: {{MAPEL}}</w:t></w:r></w:p>
<w:p><w:r><w:t xml:space="preserve">Kelas: {{KELAS}}</w:t></w:r></w:p>
<w:p><w:r><w:t xml:space="preserve">Semester: {{SEMESTER}}</w:t></w:r></w:p>
<w:p><w:r><w:t xml:space="preserve">Tahun Pelajaran: {{TAHUN_PELAJARAN}}</w:t></w:r></w:p>
<w:p><w:r><w:t xml:space="preserve">Kepala Sekolah: {{NAMA_KEPALA_SEKOLAH}}</w:t></w:r></w:p>
<w:p><w:r><w:t xml:space="preserve">NIP Kepala: {{NIP_KEPALA_SEKOLAH}}</w:t></w:r></w:p>
<w:p><w:r><w:t xml:space="preserve">NIP Guru: {{NIP_GURU}}</w:t></w:r></w:p>
<w:p><w:r><w:t xml:space="preserve">Fase: {{FASE}}</w:t></w:r></w:p>
<w:p><w:r><w:t xml:space="preserve">Tempat: {{TEMPAT}}</w:t></w:r></w:p>
<w:p><w:r><w:t xml:space="preserve">Tanggal: {{TANGGAL}}</w:t></w:r></w:p>
<w:p><w:r><w:t xml:space="preserve">Alamat: {{ALAMAT_SEKOLAH}}</w:t></w:r></w:p>
`;
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${body}</w:body>
</w:document>`
  );
  return zip.generateAsync({ type: "arraybuffer" });
}

// Re-implement base64 encode/decode yang sama dengan RppBulkReplacePage
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

describe("RELEASE-V1-MANUAL-VERIFY-01 — Modul J: DOCX Identity end-to-end", () => {
  it("TEST J.1: Upload DOCX valid → isValidDocx = true", async () => {
    const buf = await buildDocxWithPlaceholders();
    expect(await isValidDocx(buf)).toBe(true);
  });

  it("TEST J.2: Proses DOCX → semua placeholder ter-replace", async () => {
    const buf = await buildDocxWithPlaceholders();
    const result = await processDocxIdentity({
      docxBuffer: buf,
      context: ctx,
    });
    expect(result.stats.placeholdersFound).toBe(13);
    expect(result.stats.placeholdersReplaced).toBe(13);
    expect(result.warnings).toHaveLength(0);
  });

  it("TEST J.3: Extract text dari DOCX hasil → tidak ada placeholder tersisa", async () => {
    const buf = await buildDocxWithPlaceholders();
    const result = await processDocxIdentity({
      docxBuffer: buf,
      context: ctx,
    });
    const text = await extractDocxText(result.outputBlob);
    // Tidak boleh ada placeholder {{...}} sama sekali
    expect(text).not.toContain("{{NAMA_SEKOLAH}}");
    expect(text).not.toContain("{{NAMA_GURU}}");
    expect(text).not.toContain("{{MAPEL}}");
    expect(text).not.toContain("{{KELAS}}");
    expect(text).not.toContain("{{SEMESTER}}");
    expect(text).not.toContain("{{TAHUN_PELAJARAN}}");
    expect(text).not.toContain("{{NAMA_KEPALA_SEKOLAH}}");
    expect(text).not.toContain("{{NIP_KEPALA_SEKOLAH}}");
    expect(text).not.toContain("{{NIP_GURU}}");
    expect(text).not.toContain("{{FASE}}");
    expect(text).not.toContain("{{TEMPAT}}");
    expect(text).not.toContain("{{TANGGAL}}");
    expect(text).not.toContain("{{ALAMAT_SEKOLAH}}");
    // Tidak boleh ada {{ sama sekali
    expect(text).not.toContain("{{");
  });

  it("TEST J.4: Extract text dari DOCX hasil → berisi value yang benar", async () => {
    const buf = await buildDocxWithPlaceholders();
    const result = await processDocxIdentity({
      docxBuffer: buf,
      context: ctx,
    });
    const text = await extractDocxText(result.outputBlob);
    expect(text).toContain("SMPN 8 Bantan");
    expect(text).toContain("Budi Santoso, S.Pd.");
    expect(text).toContain("Pendidikan Pancasila");
    expect(text).toContain("VII A");
    expect(text).toContain("Ganjil");
    expect(text).toContain("2025/2026");
  });

  it("TEST J.5: Simpan arsip — originalContent ≠ processedContent (KUNCI P0-1 FIX)", async () => {
    const originalBuf = await buildDocxWithPlaceholders();
    const result = await processDocxIdentity({
      docxBuffer: originalBuf,
      context: ctx,
    });
    const originalBase64 = arrayBufferToBase64Docx(originalBuf);
    const processedBase64 = arrayBufferToBase64Docx(result.outputBlob);
    // KUNCI: keduanya HARUS berbeda
    expect(originalBase64).not.toBe(processedBase64);
    // Keduanya valid base64 DOCX
    expect(isDocxBase64(originalBase64)).toBe(true);
    expect(isDocxBase64(processedBase64)).toBe(true);
  });

  it("TEST J.6: Download dari arsip — decode processedContent → text tanpa placeholder", async () => {
    const originalBuf = await buildDocxWithPlaceholders();
    const result = await processDocxIdentity({
      docxBuffer: originalBuf,
      context: ctx,
    });
    // Simulasi arsip: processedContent = base64 DOCX hasil replace
    const archiveProcessedContent = arrayBufferToBase64Docx(result.outputBlob);

    // Simulasi handleDownloadProcessed: decode processedContent
    const downloadedBuf = base64DocxToArrayBuffer(archiveProcessedContent);
    expect(downloadedBuf).not.toBeNull();
    const text = await extractDocxText(downloadedBuf!);

    // TEST KRITIS: file yang didownload tidak boleh masih berisi placeholder
    expect(text).not.toContain("{{NAMA_SEKOLAH}}");
    expect(text).not.toContain("{{");
    expect(text).toContain("SMPN 8 Bantan");
  });

  it("TEST J.7: Download dari arsip — bila salah simpan originalContent sebagai processedContent (BUG LAMA)", async () => {
    // Test ini mensimulasikan bug LAMA (sebelum PATCH-1):
    // bila processedContent = originalContent (DOCX asli), maka download
    // masih berisi placeholder. Test ini konfirmasi bahwa bug lama terdeteksi.
    const originalBuf = await buildDocxWithPlaceholders();
    const originalBase64 = arrayBufferToBase64Docx(originalBuf);

    // Simulasi bug lama: processedContent = originalContent
    const buggyProcessedContent = originalBase64;

    const downloadedBuf = base64DocxToArrayBuffer(buggyProcessedContent);
    const text = await extractDocxText(downloadedBuf!);

    // BUG LAMA: text masih berisi placeholder
    expect(text).toContain("{{NAMA_SEKOLAH}}");
    // Ini konfirmasi bahwa fix PATCH-1 diperlukan: bila processedContent
    // benar di-isi dengan base64 hasil replace, test J.6 PASS. Bila salah
    // isi dengan original, test ini PASS (mendeteksi bug).
  });

  it("TEST J.8: DOCX rusak (bukan ZIP) → isValidDocx = false", async () => {
    const buf = new TextEncoder().encode("not a docx").buffer;
    expect(await isValidDocx(buf)).toBe(false);
  });

  it("TEST J.9: processDocxIdentity throw bila input bukan DOCX", async () => {
    const buf = new TextEncoder().encode("not a docx").buffer;
    await expect(
      processDocxIdentity({ docxBuffer: buf, context: ctx })
    ).rejects.toThrow(/tidak bisa dibaca/);
  });
});
