/**
 * PrintExportButtons — tombol Cetak + Download HTML yang reusable.
 *
 * PRINT-EXPORT-POLISH-RC1: pasang di setiap halaman yang punya Mode Dokumen.
 * PRINT-EXPORT-POLISH-RC1-PATCH-1: + prop orientation (portrait/landscape).
 *
 * Landscape dipakai untuk dokumen lebar seperti Promes.
 */

import { Button, downloadHTML } from "./index";

export function PrintExportButtons({
  filename,
  title,
  schoolName,
  orientation = "portrait",
}: {
  filename: string;
  title: string;
  schoolName?: string;
  orientation?: "portrait" | "landscape";
}) {
  function handleDownload() {
    const docEl = document.querySelector(".print-area .document-page");
    if (docEl) {
      downloadHTML({
        filename,
        title,
        content: docEl.innerHTML,
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
