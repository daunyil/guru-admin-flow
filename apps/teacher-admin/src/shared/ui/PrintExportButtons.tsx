/**
 * PrintExportButtons — tombol Cetak + Download HTML + Download DOCX/XLS.
 *
 * PRINT-EXPORT-POLISH-RC1: pasang di setiap halaman yang punya Mode Dokumen.
 * PRINT-EXPORT-POLISH-RC1-PATCH-1: + prop orientation (portrait/landscape).
 * UX-PRINT-02/04: + prop targetId (ambil dokumen spesifik, bukan query global pertama).
 * PIKET-AUDIT-05D-MINOR: + prop disabled (grayed-out state bila tidak ada data).
 * Sprint 6: + DOCX export button for Promes Merdeka + Rekap Semester.
 * Sprint 7: + XLS export button for Jurnal Mengajar (async — ExcelJS generates styled XLSX).
 */

import { useState } from "react";
import { Button, downloadHTML } from "./index";
import { downloadDocxBlob } from "../exporters";

export function PrintExportButtons({
  filename,
  title,
  schoolName,
  orientation = "portrait",
  targetId,
  disabled = false,
  docxExport,
  xlsExport,
}: {
  filename: string;
  title: string;
  schoolName?: string;
  orientation?: "portrait" | "landscape";
  /**
   * UX-PRINT-02: ID elemen target untuk export HTML.
   */
  targetId?: string;
  /**
   * PIKET-AUDIT-05D-MINOR: bila true, tombol ditampilkan grayed-out & tidak bisa diklik.
   */
  disabled?: boolean;
  /**
   * Sprint 6: DOCX export function — bila provided, tombol DOCX muncul.
   * Function harus return Promise<Blob>.
   */
  docxExport?: (() => Promise<Blob>) | null;
  /**
   * Sprint 7: XLS export function — bila provided, tombol XLS muncul.
   * Function harus return Promise<void> (ExcelJS async).
   */
  xlsExport?: (() => Promise<void>) | null;
}) {
  const [docxLoading, setDocxLoading] = useState(false);
  const [xlsLoading, setXlsLoading] = useState(false);

  function handleDownload() {
    let docEl: Element | null = null;
    if (targetId) {
      docEl = document.getElementById(targetId);
    }
    if (!docEl) {
      docEl = document.querySelector(".print-area .document-page");
    }
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

  async function handleDocxDownload() {
    if (!docxExport || disabled) return;
    setDocxLoading(true);
    try {
      const blob = await docxExport();
      downloadDocxBlob(blob, `${filename}.docx`);
    } catch (err) {
      console.error("[DOCX Export] Error:", err);
      alert("Gagal membuat file DOCX. Silakan coba lagi atau gunakan Cetak/Download HTML.");
    } finally {
      setDocxLoading(false);
    }
  }

  async function handleXlsDownload() {
    if (!xlsExport || disabled) return;
    setXlsLoading(true);
    try {
      await xlsExport();
    } catch (err) {
      console.error("[XLS Export] Error:", err);
      alert("Gagal membuat file XLS. Silakan coba lagi atau gunakan Cetak/Download HTML.");
    } finally {
      setXlsLoading(false);
    }
  }

  return (
    <div className={`flex gap-2 items-center ${disabled ? "opacity-50 pointer-events-none select-none" : ""}`} title={disabled ? "Data belum tersedia — tombol aktif setelah data dimuat" : undefined}>
      <Button variant="secondary" onClick={() => window.print()} disabled={disabled}>Cetak</Button>
      <Button variant="secondary" onClick={handleDownload} disabled={disabled}>Download HTML</Button>
      {docxExport && (
        <Button variant="primary" onClick={handleDocxDownload} disabled={disabled || docxLoading}>
          {docxLoading ? "⏳ Membuat DOCX..." : "📄 Download DOCX"}
        </Button>
      )}
      {xlsExport && (
        <Button variant="primary" onClick={handleXlsDownload} disabled={disabled || xlsLoading}>
          {xlsLoading ? "⏳ Membuat XLS..." : "📊 Download XLS"}
        </Button>
      )}
    </div>
  );
}
