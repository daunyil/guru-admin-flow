/**
 * PrintExportButtons — tombol Cetak + Download HTML yang reusable.
 *
 * PRINT-EXPORT-POLISH-RC1: pasang di setiap halaman yang punya Mode Dokumen.
 * Tambah tombol "Download HTML" di samping "Cetak".
 */

import { Button, downloadHTML } from "./index";

export function PrintExportButtons({
  filename,
  title,
  schoolName,
}: {
  filename: string;
  title: string;
  schoolName?: string;
}) {
  function handleDownload() {
    const docEl = document.querySelector(".print-area .document-page");
    if (docEl) {
      downloadHTML({
        filename,
        title,
        content: docEl.innerHTML,
        schoolName,
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
