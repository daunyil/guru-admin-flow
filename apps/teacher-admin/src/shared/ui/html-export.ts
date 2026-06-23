/**
 * HTML export helper — download print-area sebagai standalone .html file.
 *
 * PRINT-EXPORT-POLISH-RC1: guru bisa download dokumen sebagai HTML
 * yang bisa dibuka di browser/Word tanpa perlu app berjalan.
 *
 * Tidak PDF (butuh library = roadmap berikutnya).
 * Tidak Word .docx (butuh library = roadmap berikutnya).
 */

/**
 * Generate standalone HTML document dari content + title.
 * HTML ini include inline CSS supaya bisa dibuka tanpa internet.
 */
export function generateStandaloneHTML(args: {
  title: string;
  content: string; // HTML inner content
  schoolName?: string;
}): string {
  const { title, content } = args;
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: "Times New Roman", Georgia, serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #000;
      background: #fff;
      padding: 2cm 2.5cm;
      max-width: 21cm;
      margin: 0 auto;
    }
    .document-title {
      text-align: center;
      font-weight: bold;
      font-size: 14pt;
      text-transform: uppercase;
      margin-bottom: 4pt;
      letter-spacing: 0.5pt;
    }
    .document-subtitle {
      text-align: center;
      font-size: 11pt;
      margin-bottom: 12pt;
    }
    .document-identity {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16pt;
      font-size: 10pt;
    }
    .document-identity td {
      border: 1px solid #000;
      padding: 4pt 8pt;
    }
    .document-identity td:first-child {
      font-weight: bold;
      width: 25%;
      background: #f5f5f5;
    }
    .document-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10pt;
      margin-bottom: 12pt;
    }
    .document-table th,
    .document-table td {
      border: 1px solid #000;
      padding: 4pt 6pt;
      text-align: left;
      vertical-align: top;
    }
    .document-table th {
      background: #e0e0e0;
      font-weight: bold;
      text-align: center;
    }
    .document-table .text-center {
      text-align: center;
    }
    .document-table tfoot td {
      font-weight: bold;
      background: #f5f5f5;
    }
    .document-section-title {
      font-weight: bold;
      font-size: 11pt;
      margin-top: 12pt;
      margin-bottom: 6pt;
    }
    .signature-grid {
      display: flex;
      justify-content: space-between;
      margin-top: 36pt;
      font-size: 10pt;
    }
    .signature-grid > div {
      text-align: center;
      width: 40%;
    }
    .signature-grid .sig-space {
      height: 60pt;
    }
    .signature-grid .sig-name {
      font-weight: bold;
      text-decoration: underline;
    }
    pre {
      white-space: pre-wrap;
      font-family: inherit;
    }
    @media print {
      body { padding: 0; max-width: 100%; }
      @page { size: A4 portrait; margin: 1.5cm 2cm; }
    }
  </style>
</head>
<body>
${content}
</body>
</html>`;
}

/**
 * Download content sebagai standalone .html file.
 * Browser only.
 */
export function downloadHTML(args: {
  filename: string;
  title: string;
  content: string;
  schoolName?: string;
}): void {
  const html = generateStandaloneHTML(args);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = args.filename.endsWith(".html") ? args.filename : `${args.filename}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
