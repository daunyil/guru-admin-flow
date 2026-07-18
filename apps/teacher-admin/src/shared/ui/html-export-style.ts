export function getStandaloneDocumentCSS(
  orientation: "portrait" | "landscape"
): string {
  const pageWidth = orientation === "landscape" ? "297mm" : "210mm";
  const minHeight = orientation === "landscape" ? "210mm" : "297mm";
  const pagePadding = orientation === "landscape" ? "12mm 15mm" : "15mm 20mm";
  const pageSize = orientation === "landscape" ? "A4 landscape" : "A4 portrait";

  return `
:root {
  --document-ink: #000;
  --document-muted: #555;
  --document-border: #000;
  --document-bg: #fff;
  --document-complete: #166534;
  --document-warning: #92400e;
  --document-danger: #991b1b;
  --document-info: #1e40af;
}

* { box-sizing: border-box; }

html,
body {
  margin: 0;
  padding: 0;
  background: #e5e7eb;
  color: #000;
  font-family: "Times New Roman", Times, serif;
}

.print-area {
  background: #e5e7eb;
  color: var(--document-ink);
  padding: 24px;
  min-height: 100vh;
}

.document-page {
  width: ${pageWidth};
  min-height: ${minHeight};
  margin: 0 auto 24px;
  padding: ${pagePadding};
  background: var(--document-bg);
  color: var(--document-ink);
  font-family: "Times New Roman", Times, serif;
  font-size: 11pt;
  line-height: 1.25;
  box-shadow: 0 8px 28px rgba(0,0,0,.16);
}

.document-page.document-landscape {
  width: 297mm;
  min-height: 210mm;
  padding: 12mm 15mm;
}

.document-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 8px;
  padding-bottom: 7px;
  border-bottom: 3px double #000;
}

.document-header-text {
  flex: 1;
  text-align: center;
  text-transform: uppercase;
}

.document-kop-small { font-size: 11pt; font-weight: 700; }
.document-kop-school { font-size: 16pt; font-weight: 800; letter-spacing: .02em; }
.document-kop-address { font-size: 9.5pt; font-style: italic; text-transform: none; }

.document-title-block { margin: 10px 0 8px; text-align: center; }
.document-title {
  margin: 0;
  padding: 0;
  font-size: 13pt;
  font-weight: 800;
  text-transform: uppercase;
  text-decoration: underline;
}

.document-subtitle { margin: 3px 0 0; color: #555; font-size: 10.5pt; }

.document-identity,
.promes-top-identity {
  width: 100%;
  border-collapse: collapse;
  margin: 7px 0 10px;
  font-size: 10.5pt;
}

.document-identity td,
.promes-top-identity td {
  border: none;
  padding: 2px 4px;
  vertical-align: top;
}

.document-identity-label {
  width: 120px;
  font-weight: 700;
  white-space: nowrap;
}

.document-identity-separator {
  width: 10px;
  text-align: center;
}

.document-section { margin-top: 12px; break-inside: avoid; }
.document-section-title {
  margin: 0 0 6px;
  padding: 0;
  font-size: 11pt;
  font-weight: 800;
  text-transform: uppercase;
}

.document-table-wrap { width: 100%; overflow: visible; margin: 6px 0 10px; }
.document-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 9.5pt;
  color: #000;
}

.document-table th,
.document-table td {
  border: 1px solid #000;
  padding: 4px 5px;
  vertical-align: middle;
  word-break: normal;
  overflow-wrap: anywhere;
}

.document-table th {
  text-align: center;
  font-weight: 800;
  background: #fff;
}

.text-left { text-align: left !important; }
.text-center { text-align: center !important; }
.text-muted { color: #555; }
.preserve-line { white-space: pre-line; }

.signature-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  margin-top: 24px;
  break-inside: avoid;
}

.signature-block { text-align: center; min-height: 112px; font-size: 10.5pt; }
.signature-role { min-height: 34px; font-weight: 700; }
.signature-space { height: 52px; }
.signature-name { font-weight: 800; text-decoration: underline; }

.attendance-grid,
.grade-kd-table,
.question-grid-table,
.promes-table {
  font-size: 7.6pt;
}

.attendance-grid th,
.attendance-grid td,
.grade-kd-table th,
.grade-kd-table td,
.question-grid-table th,
.question-grid-table td,
.promes-table th,
.promes-table td {
  padding: 1px 2px;
}

.attendance-grid .date-cell {
  font-size: 6.5pt;
  height: 34px;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
}

.promes-objective-col { width: 185px; }
.promes-material-col { width: 235px; }
.w-jp { width: 34px; }
.promes-week-cell { width: 20px; }

.print-toolbar,
.no-print,
nav,
header.app-header,
.app-header,
.sidebar,
.topbar,
.bottom-nav,
button {
  display: none !important;
}

@media print {
  @page {
    size: ${pageSize};
    margin: 0;
  }

  @page landscape {
    size: A4 landscape;
    margin: 0;
  }

  .document-landscape { page: landscape; }

  html,
  body {
    width: auto !important;
    min-height: auto !important;
    margin: 0 !important;
    padding: 0 !important;
    background: white !important;
    color: black !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .print-area {
    width: auto !important;
    min-height: auto !important;
    padding: 0 !important;
    margin: 0 !important;
    background: white !important;
  }

  .document-page {
    width: ${pageWidth} !important;
    min-height: ${minHeight} !important;
    margin: 0 auto !important;
    padding: ${pagePadding} !important;
    box-shadow: none !important;
    background: white !important;
    color: black !important;
    font-family: "Times New Roman", Times, serif !important;
    font-size: 11pt !important;
    break-after: page;
    page-break-after: always;
  }

  .document-page:last-child {
    break-after: auto;
    page-break-after: auto;
  }

  .document-table tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .document-table thead {
    display: table-header-group;
  }
}
`;
}
