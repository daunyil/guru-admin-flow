/**
 * Generic download helpers for file exports.
 * Extracted from promes-docx-exporter to avoid boundary violations.
 */

/**
 * Download a DOCX Blob as a file.
 * Creates a temporary <a> element, sets href to blob URL,
 * triggers click, then cleans up.
 */
export function downloadDocxBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  // Cleanup after a short delay (browser needs time to start download)
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
