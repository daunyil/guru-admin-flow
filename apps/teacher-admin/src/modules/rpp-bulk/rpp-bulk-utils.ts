/**
 * Pure utility functions & constants for RppBulkReplacePage.
 *
 * These are stateless helpers that don't depend on React.
 */

import { countPlaceholders } from "@guru-admin/domain";

/** Delimiter untuk multi-dokumen paste. */
export const DOC_DELIMITERS = ["=== DOKUMEN ===", "=== RPP ===", "---DOKUMEN---", "---RPP---"];

/** Pisahkan teks yang berisi multiple dokumen jadi array. */
export function splitMultipleDocuments(text: string): string[] {
  let result = [text];
  for (const delim of DOC_DELIMITERS) {
    const next: string[] = [];
    for (const doc of result) {
      next.push(...doc.split(delim));
    }
    result = next;
  }
  return result
    .map((d) => d.trim())
    .filter((d) => d.length > 0);
}

/** Konversi ArrayBuffer DOCX → string base64 dengan prefix data URI. */
export function arrayBufferToBase64Docx(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000; // 32KB chunk untuk avoid call stack overflow
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  const base64 = btoa(binary);
  return `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64}`;
}

/** Cek apakah content adalah base64 DOCX (dari import DOCX). */
export function isDocxBase64(content: string): boolean {
  return content.startsWith("data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,");
}

/** Decode base64 DOCX → ArrayBuffer untuk download. */
export function base64DocxToArrayBuffer(content: string): ArrayBuffer | null {
  if (!isDocxBase64(content)) return null;
  const base64 = content.split(",")[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/** Count total placeholders in content string. */
export function countTotalPlaceholders(content: string): number {
  const counts = countPlaceholders(content);
  return Object.values(counts).reduce((sum, n) => sum + n, 0);
}
