/**
 * Tests untuk rpp-document.ts (GENERATOR-COMPLETION-RC1-PATCH-1)
 *
 * QA-1: Verifikasi literal replacement + multi-dokumen + placeholder.
 */
import { describe, it, expect } from "vitest";
import {
  replaceRppIdentityPlaceholders,
  replaceLiteralText,
  applyAllReplacements,
  buildPlaceholderMap,
  countPlaceholders,
  hasAnyPlaceholder,
  countLiteralOccurrences,
  RPP_IDENTITY_PLACEHOLDERS,
  type RppIdentityContext,
  type LiteralReplacement,
} from "../src/rpp-document";

const ctx: RppIdentityContext = {
  schoolName: "SMPN 8 Bantan",
  schoolAddress: "Jl. Pendidikan No. 1, Bantan",
  headmasterName: "Drs. H. Suparman, M.Pd.",
  headmasterNip: "196512121986031005",
  teacherName: "Siti Aminah, S.Pd.",
  teacherNip: "198503152010012005",
  subject: "Pendidikan Pancasila",
  classLabel: "VII A",
  semester: "Ganjil",
  academicYearLabel: "2025/2026",
  fase: "D",
  place: "Bantan",
  date: "2025-07-14",
};

describe("rpp-document — placeholder replacement", () => {
  it("replace {{NAMA_SEKOLAH}} dengan value dari context", () => {
    const content = "Sekolah: {{NAMA_SEKOLAH}}";
    const result = replaceRppIdentityPlaceholders(content, ctx);
    expect(result).toBe("Sekolah: SMPN 8 Bantan");
  });

  it("replace semua 13 placeholder sekaligus", () => {
    const content = RPP_IDENTITY_PLACEHOLDERS.join(" | ");
    const result = replaceRppIdentityPlaceholders(content, ctx);
    expect(result).toContain("SMPN 8 Bantan");
    expect(result).toContain("Siti Aminah, S.Pd.");
    expect(result).toContain("VII A");
    expect(result).toContain("Ganjil");
    expect(result).toContain("2025/2026");
    expect(result).toContain("D");
    expect(result).toContain("Bantan");
    expect(result).toContain("2025-07-14");
  });

  it("tidak mengubah teks di luar placeholder", () => {
    const content = "Materi: Norma dalam Masyarakat. Sekolah: {{NAMA_SEKOLAH}}.";
    const result = replaceRppIdentityPlaceholders(content, ctx);
    expect(result).toBe("Materi: Norma dalam Masyarakat. Sekolah: SMPN 8 Bantan.");
  });
});

describe("rpp-document — literal text replacement (QA-1)", () => {
  it("ganti teks lama → teks baru (case-sensitive, global)", () => {
    const content = "Sekolah: SMA Negeri 1 Jakarta. Kepala: Budi. Guru: Budi.";
    const replacements: LiteralReplacement[] = [
      { oldText: "SMA Negeri 1 Jakarta", newText: "SMPN 8 Bantan" },
      { oldText: "Budi", newText: "Siti Aminah" },
    ];
    const result = replaceLiteralText(content, replacements);
    expect(result).toBe("Sekolah: SMPN 8 Bantan. Kepala: Siti Aminah. Guru: Siti Aminah.");
  });

  it("tidak mengubah teks bila oldText tidak ditemukan", () => {
    const content = "Sekolah: SMPN 8 Bantan";
    const replacements: LiteralReplacement[] = [
      { oldText: "SMA Lama", newText: "SMPN 8 Bantan" },
    ];
    const result = replaceLiteralText(content, replacements);
    expect(result).toBe("Sekolah: SMPN 8 Bantan"); // tidak berubah
  });

  it("oldText kosong → skip (tidak error)", () => {
    const content = "test";
    const replacements: LiteralReplacement[] = [
      { oldText: "", newText: "baru" },
    ];
    const result = replaceLiteralText(content, replacements);
    expect(result).toBe("test"); // tidak berubah
  });

  it("multiple replacement berurutan", () => {
    const content = "Sekolah lama: SMA 1. NIP lama: 123. Tahun lama: 2020.";
    const replacements: LiteralReplacement[] = [
      { oldText: "SMA 1", newText: "SMPN 8" },
      { oldText: "123", newText: "456" },
      { oldText: "2020", newText: "2025/2026" },
    ];
    const result = replaceLiteralText(content, replacements);
    expect(result).toBe("Sekolah lama: SMPN 8. NIP lama: 456. Tahun lama: 2025/2026.");
  });
});

describe("rpp-document — applyAllReplacements (placeholder + literal)", () => {
  it("placeholder dulu, lalu literal", () => {
    const content = "Sekolah: {{NAMA_SEKOLAH}}. Lama: SMA 1.";
    const replacements: LiteralReplacement[] = [
      { oldText: "SMA 1", newText: "SMPN 8 Bantan" },
    ];
    const result = applyAllReplacements(content, ctx, replacements);
    expect(result).toBe("Sekolah: SMPN 8 Bantan. Lama: SMPN 8 Bantan.");
  });

  it("tanpa literalReplacements → hanya placeholder", () => {
    const content = "Sekolah: {{NAMA_SEKOLAH}}";
    const result = applyAllReplacements(content, ctx);
    expect(result).toBe("Sekolah: SMPN 8 Bantan");
  });
});

describe("rpp-document — countPlaceholders + hasAnyPlaceholder", () => {
  it("hitung placeholder yang ada di content", () => {
    const content = "{{NAMA_SEKOLAH}} dan {{NAMA_GURU}} dan {{NAMA_SEKOLAH}}";
    const counts = countPlaceholders(content);
    expect(counts["{{NAMA_SEKOLAH}}"]).toBe(2);
    expect(counts["{{NAMA_GURU}}"]).toBe(1);
    expect(counts["{{KELAS}}"]).toBeUndefined();
  });

  it("hasAnyPlaceholder true bila ada minimal 1", () => {
    expect(hasAnyPlaceholder("{{NAMA_SEKOLAH}}")).toBe(true);
    expect(hasAnyPlaceholder("teks biasa tanpa placeholder")).toBe(false);
  });
});

describe("rpp-document — countLiteralOccurrences (QA-1 preview)", () => {
  it("hitung berapa kali oldText muncul", () => {
    const content = "SMA 1 SMA 1 SMA 1";
    expect(countLiteralOccurrences(content, "SMA 1")).toBe(3);
  });

  it("oldText tidak ditemukan → 0", () => {
    expect(countLiteralOccurrences("test", "tidak ada")).toBe(0);
  });

  it("oldText kosong → 0", () => {
    expect(countLiteralOccurrences("test", "")).toBe(0);
  });
});

describe("rpp-document — buildPlaceholderMap", () => {
  it("map berisi semua 13 placeholder", () => {
    const map = buildPlaceholderMap(ctx);
    expect(Object.keys(map).length).toBe(13);
    expect(map["{{NAMA_SEKOLAH}}"]).toBe("SMPN 8 Bantan");
    expect(map["{{NAMA_GURU}}"]).toBe("Siti Aminah, S.Pd.");
    expect(map["{{KELAS}}"]).toBe("VII A");
  });
});
