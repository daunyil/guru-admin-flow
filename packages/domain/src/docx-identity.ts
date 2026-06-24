/**
 * DOCX Identity Replacement — ganti placeholder + literal di file .docx tanpa
 * hancurkan formatting Word.
 *
 * DOCX-IDENTITY-RC1: Plan Kerja Bapak item #4.
 *
 * Strategi:
 *   1. .docx = ZIP berisi XML. Teks dokumen ada di word/document.xml +
 *      word/header*.xml + word/footer*.xml.
 *   2. Ekstrak XML dari ZIP.
 *   3. Di tiap XML: scan <w:p> paragraph, concat <w:t> adjacent, replace
 *      placeholder/literal di teks gabungan, tulis kembali ke <w:t> pertama
 *      dan kosongkan <w:t> sisanya. Ini preservasi formatting (run properties
 *      di <w:r> pertama dipakai untuk teks hasil).
 *   4. Untuk <w:t> yang tidak ter-split (kasus sederhana), langsung replace
 *      di text content-nya.
 *   5. Escape karakter XML special (<, >, &, ", ') sebelum tulis.
 *
 * Input: ArrayBuffer DOCX asli + RppIdentityContext + LiteralReplacement[]
 * Output: ArrayBuffer DOCX baru (biner, siap di-download atau disimpan)
 *
 * Pure function (tidak menyentuh DOM). Memakai jszip (browser + Node).
 */

import JSZip from "jszip";
import {
  RPP_IDENTITY_PLACEHOLDERS,
  buildPlaceholderMap,
  replaceLiteralText,
  type RppIdentityContext,
  type LiteralReplacement,
} from "./rpp-document";

/** Hasil pemrosesan DOCX. */
export type DocxProcessResult = {
  /** DOCX baru (biner). */
  outputBlob: ArrayBuffer;
  /** Statistik replacement. */
  stats: {
    placeholdersFound: number;
    placeholdersReplaced: number;
    literalMatches: number;
    filesProcessed: string[];
  };
  /** Warning ringan (tidak block). */
  warnings: string[];
};

/** File XML di dalam DOCX yang berisi teks dokumen. */
const DOCX_TEXT_FILES = [
  "word/document.xml",
  // Header/footer bisa juga berisi identitas
  "word/header1.xml",
  "word/header2.xml",
  "word/header3.xml",
  "word/footer1.xml",
  "word/footer2.xml",
  "word/footer3.xml",
];

/** Karakter yang harus di-escape di XML. */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Unescape XML entities kembali ke teks biasa (untuk matching). */
function unescapeXml(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/**
 * Cari semua pasangan (startTag, endTag) yang tidak nested.
 * Return array of { start, end, content } indices.
 */
function findTagPairs(xml: string, startTag: string, endTag: string): Array<{
  start: number;
  end: number;
  content: string;
}> {
  const pairs: Array<{ start: number; end: number; content: string }> = [];
  const stack: number[] = [];
  let i = 0;
  while (i < xml.length) {
    const startIdx = xml.indexOf(startTag, i);
    if (startIdx === -1) break;
    // Cari endTag setelah startTag
    const endIdx = xml.indexOf(endTag, startIdx + startTag.length);
    if (endIdx === -1) break;
    pairs.push({
      start: startIdx,
      end: endIdx + endTag.length,
      content: xml.slice(startIdx + startTag.length, endIdx),
    });
    i = endIdx + endTag.length;
    void stack;
  }
  return pairs;
}

/**
 * Ekstrak teks gabungan dari semua <w:t> dalam satu <w:p> paragraph.
 * Kembalikan array { paragraphStart, paragraphEnd, runs: [{tStart, tEnd, text, fullTag}] }.
 */
function extractParagraphRuns(xml: string): Array<{
  paragraphStart: number;
  paragraphEnd: number;
  runs: Array<{ tStart: number; tEnd: number; rawText: string; fullTag: string }>;
}> {
  const paragraphs: Array<{
    paragraphStart: number;
    paragraphEnd: number;
    runs: Array<{ tStart: number; tEnd: number; rawText: string; fullTag: string }>;
  }> = [];

  // Cari semua <w:p>...</w:p>
  const pPairs = findTagPairs(xml, "<w:p ", "</w:p>");
  // Juga tangani <w:p/> (self-closing, tidak ada teks)
  // Dan <w:p>...</w:p> tanpa attribute
  const pPairs2 = findTagPairs(xml, "<w:p>", "</w:p>");
  const allPairs = [...pPairs, ...pPairs2].sort((a, b) => a.start - b.start);

  for (const p of allPairs) {
    const pContent = xml.slice(p.start, p.end);
    // Cari semua <w:t>...</w:t> dalam paragraph ini
    const tPairs = findTagPairs(pContent, "<w:t", "</w:t>");
    const runs: Array<{ tStart: number; tEnd: number; rawText: string; fullTag: string }> = [];
    for (const t of tPairs) {
      const tContent = xml.slice(p.start + t.start, p.start + t.end);
      // Ekstrak teks dalam: <w:t xml:space="preserve">TEXT</w:t> atau <w:t>TEXT</w:t>
      const gtIdx = tContent.indexOf(">");
      const closeIdx = tContent.lastIndexOf("</w:t>");
      if (gtIdx === -1 || closeIdx === -1) continue;
      const rawText = tContent.slice(gtIdx + 1, closeIdx);
      runs.push({
        tStart: p.start + t.start,
        tEnd: p.start + t.end,
        rawText,
        fullTag: tContent,
      });
    }
    if (runs.length > 0) {
      paragraphs.push({
        paragraphStart: p.start,
        paragraphEnd: p.end,
        runs,
      });
    }
  }

  return paragraphs;
}

/**
 * Apply replacement pada satu file XML.
 * Return { newXml, stats }.
 */
function applyReplacementsToXml(
  xml: string,
  ctx: RppIdentityContext,
  literalReplacements: LiteralReplacement[]
): { newXml: string; placeholdersFound: number; placeholdersReplaced: number; literalMatches: number } {
  let placeholdersFound = 0;
  let placeholdersReplaced = 0;
  let literalMatches = 0;

  // Hitung placeholder found di teks asli (sebelum replace)
  const fullText = extractFullText(xml);
  for (const ph of RPP_IDENTITY_PLACEHOLDERS) {
    const count = fullText.split(ph).length - 1;
    placeholdersFound += count;
  }

  // Hitung literal matches di teks asli
  for (const { oldText } of literalReplacements) {
    if (!oldText) continue;
    literalMatches += fullText.split(oldText).length - 1;
  }

  // Strategi: extract paragraphs → di tiap paragraph, concat semua <w:t> text,
  // apply replacement, lalu tulis hasil ke <w:t> pertama dan kosongkan sisanya.
  // Ini menangani placeholder yang ter-split lintas run.
  const paragraphs = extractParagraphRuns(xml);
  // Proses dari belakang supaya offset tidak geser
  paragraphs.sort((a, b) => b.paragraphStart - a.paragraphStart);

  let result = xml;
  for (const p of paragraphs) {
    if (p.runs.length === 0) continue;

    // Concat text dari semua runs (unescape dulu untuk matching)
    const concatenatedRaw = p.runs.map((r) => r.rawText).join("");
    const concatenated = unescapeXml(concatenatedRaw);

    // Apply placeholder replacement
    let newText = concatenated;
    const placeholderMap = buildPlaceholderMap(ctx);
    for (const [placeholder, value] of Object.entries(placeholderMap)) {
      if (!value) continue;
      const before = newText;
      newText = newText.split(placeholder).join(value);
      if (newText !== before) {
        placeholdersReplaced += before.split(placeholder).length - 1;
      }
    }

    // Apply literal replacement
    newText = replaceLiteralText(newText, literalReplacements);

    // Jika tidak ada perubahan, skip
    if (newText === concatenated) continue;

    // Tulis hasil ke <w:t> pertama, kosongkan sisanya
    // Escape newText untuk XML
    const escapedNewText = escapeXml(newText);

    // Bangun XML baru: timpa <w:t> pertama dengan teks baru, sisanya jadi <w:t></w:t>
    // Urutkan runs dari belakang supaya offset stabil
    const sortedRuns = [...p.runs].sort((a, b) => b.tStart - a.tStart);

    // Untuk run pertama (paling awal), replace fullTag dengan tag baru berisi newText
    const firstRun = sortedRuns[sortedRuns.length - 1];
    // Ambil tag <w:t ...> asli, pertahankan attribute (termasuk xml:space)
    const firstTagMatch = firstRun.fullTag.match(/<w:t[^>]*>/);
    const firstOpenTag = firstTagMatch ? firstTagMatch[0] : "<w:t>";
    // Pastikan xml:space="preserve" ada supaya spasi awal/akhir tidak di-trim
    const safeOpenTag = firstOpenTag.includes("xml:space")
      ? firstOpenTag
      : firstOpenTag.replace(">", ' xml:space="preserve">');
    const newFirstTag = `${safeOpenTag}${escapedNewText}</w:t>`;

    result =
      result.slice(0, firstRun.tStart) +
      newFirstTag +
      result.slice(firstRun.tEnd);

    // Kosongkan run sisanya
    for (let i = 0; i < sortedRuns.length - 1; i++) {
      const r = sortedRuns[i];
      const tagMatch = r.fullTag.match(/<w:t[^>]*>/);
      const openTag = tagMatch ? tagMatch[0] : "<w:t>";
      const safeTag = openTag.includes("xml:space")
        ? openTag
        : openTag.replace(">", ' xml:space="preserve">');
      const emptyTag = `${safeTag}</w:t>`;
      result =
        result.slice(0, r.tStart) +
        emptyTag +
        result.slice(r.tEnd);
    }
  }

  return { newXml: result, placeholdersFound, placeholdersReplaced, literalMatches };
}

/** Ekstrak full text dari XML (untuk counting). */
function extractFullText(xml: string): string {
  const paragraphs = extractParagraphRuns(xml);
  return paragraphs
    .map((p) => p.runs.map((r) => unescapeXml(r.rawText)).join(""))
    .join("\n");
}

/**
 * Proses DOCX: ganti placeholder + literal, kembalikan DOCX baru sebagai ArrayBuffer.
 *
 * @throws Error bila input bukan ZIP valid atau tidak ada word/document.xml.
 */
export async function processDocxIdentity(args: {
  docxBuffer: ArrayBuffer;
  context: RppIdentityContext;
  literalReplacements?: LiteralReplacement[];
}): Promise<DocxProcessResult> {
  const { docxBuffer, context, literalReplacements = [] } = args;
  const warnings: string[] = [];
  const filesProcessed: string[] = [];
  let totalPlaceholdersFound = 0;
  let totalPlaceholdersReplaced = 0;
  let totalLiteralMatches = 0;

  // Parse ZIP
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(docxBuffer);
  } catch (e) {
    throw new Error(
      "File .docx tidak bisa dibaca. Pastikan file adalah .docx valid (bukan .doc lama atau .pdf). " +
      `Detail: ${e instanceof Error ? e.message : String(e)}`
    );
  }

  // Validasi: word/document.xml harus ada
  const documentXml = zip.file("word/document.xml");
  if (!documentXml) {
    throw new Error(
      "File .docx tidak berisi word/document.xml. Mungkin file rusak atau bukan .docx standar."
    );
  }

  // Proses semua file teks yang ada
  for (const filePath of DOCX_TEXT_FILES) {
    const file = zip.file(filePath);
    if (!file) continue;
    const xml = await file.async("string");
    const { newXml, placeholdersFound, placeholdersReplaced, literalMatches } =
      applyReplacementsToXml(xml, context, literalReplacements);
    zip.file(filePath, newXml);
    filesProcessed.push(filePath);
    totalPlaceholdersFound += placeholdersFound;
    totalPlaceholdersReplaced += placeholdersReplaced;
    totalLiteralMatches += literalMatches;
  }

  // Warning jika tidak ada perubahan
  if (totalPlaceholdersReplaced === 0 && totalLiteralMatches === 0) {
    warnings.push(
      "Tidak ada placeholder atau teks literal yang ditemukan di DOCX. " +
      "Pastikan dokumen memakai placeholder {{NAMA_SEKOLAH}} dll atau tambah pasangan literal di Step 1b."
    );
  }

  // Warning jika placeholder found tapi tidak semua di-replace (mis. ter-split parah)
  if (totalPlaceholdersFound > totalPlaceholdersReplaced) {
    warnings.push(
      `${totalPlaceholdersFound - totalPlaceholdersReplaced} placeholder terdeteksi tapi tidak ter-replace. ` +
      "Kemungkinan placeholder ter-split lintas run dengan formatting kompleks (mis. warna/font berbeda per karakter)."
    );
  }

  // Serialize kembali ke ArrayBuffer
  const outputBlob = await zip.generateAsync({
    type: "arraybuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return {
    outputBlob,
    stats: {
      placeholdersFound: totalPlaceholdersFound,
      placeholdersReplaced: totalPlaceholdersReplaced,
      literalMatches: totalLiteralMatches,
      filesProcessed,
    },
    warnings,
  };
}

/**
 * Cek apakah ArrayBuffer adalah DOCX valid (ZIP dengan word/document.xml).
 * Lebih cepat dari processDocxIdentity bila hanya perlu validasi.
 */
export async function isValidDocx(buffer: ArrayBuffer): Promise<boolean> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    return zip.file("word/document.xml") !== null;
  } catch {
    return false;
  }
}

/**
 * Ekstrak teks plain dari DOCX (untuk preview atau pencarian placeholder).
 * Return seluruh teks dokumen, dipisah newline antar paragraph.
 */
export async function extractDocxText(buffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const documentXml = zip.file("word/document.xml");
  if (!documentXml) {
    throw new Error("word/document.xml tidak ditemukan di DOCX.");
  }
  const xml = await documentXml.async("string");
  return extractFullText(xml);
}
