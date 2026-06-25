/**
 * PrintExportButtons — tombol Cetak + Download HTML yang reusable.
 *
 * PRINT-EXPORT-POLISH-RC1: pasang di setiap halaman yang punya Mode Dokumen.
 * PRINT-EXPORT-POLISH-RC1-PATCH-1: + prop orientation (portrait/landscape).
 * UX-PRINT-02/04: + prop targetId (ambil dokumen spesifik, bukan query global pertama).
 *
 * Landscape dipakai untuk dokumen lebar seperti Promes.
 */

import { Button, downloadHTML } from "./index";

export function PrintExportButtons({
  filename,
  title,
  schoolName,
  orientation = "portrait",
  targetId,
}: {
  filename: string;
  title: string;
  schoolName?: string;
  orientation?: "portrait" | "landscape";
  /**
   * UX-PRINT-02: ID elemen target untuk export HTML.
   * Bila provided, ambil elemen ini (lebih akurat).
   * Bila tidak, fallback ke query global ".print-area .document-page" pertama
   * (behavior lama, tetap berfungsi untuk halaman yang belum set targetId).
   */
  targetId?: string;
}) {
  function handleDownload() {
    // UX-PRINT-02: prioritaskan targetId bila provided
    let docEl: Element | null = null;
    if (targetId) {
      docEl = document.getElementById(targetId);
    }
    if (!docEl) {
      // Fallback: query global (behavior lama)
      docEl = document.querySelector(".print-area .document-page");
    }
    if (docEl) {
      downloadHTML({
        filename,
        title,
        content: docEl.innerHTML,
        // UX-PRINT-04: schoolName dipakai sebagai subtitle di header dokumen
        schoolName,
        orientation,
      });
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={() => window.print()}>Cetak</Button>
      <Button variant="secondary" onClick={handleDownload}>Download HTML</Button>
    </>
  );
}
