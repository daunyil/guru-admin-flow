import type { CSSProperties, ReactNode } from "react";

export type DocumentOrientation = "portrait" | "landscape";
export type DocumentBadgeTone =
  | "default"
  | "complete"
  | "incomplete"
  | "warning"
  | "danger"
  | "info";

export interface DocumentHeaderProps {
  schoolName?: string;
  schoolAddress?: string;
  schoolOffice?: string;
  institutionName?: string;
  logoUrl?: string;
  showBorder?: boolean;
}

export interface DocumentTitleProps {
  title: string;
  subtitle?: string;
  align?: "left" | "center" | "right";
}

export interface DocumentIdentityRow {
  label: string;
  value?: ReactNode;
}

export interface DocumentIdentityTableProps {
  rows: DocumentIdentityRow[];
  columns?: 1 | 2;
  className?: string;
}

export interface DocumentPageProps {
  children: ReactNode;
  orientation?: DocumentOrientation;
  className?: string;
  toolbar?: ReactNode;
}

export interface DocumentSectionProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

export interface DocumentCellObject {
  content?: ReactNode;
  colSpan?: number;
  rowSpan?: number;
  className?: string;
  style?: CSSProperties;
  align?: "left" | "center" | "right";
}

export type DocumentCell = ReactNode | DocumentCellObject;

export interface DocumentTableProps {
  caption?: string;
  headers?: DocumentCell[][];
  rows?: DocumentCell[][];
  /** Footer rows rendered inside <tfoot>. Useful for summary/total rows
   *  that should stay at the bottom of the table and repeat on page breaks. */
  footer?: DocumentCell[][];
  emptyText?: string;
  className?: string;
  compact?: boolean;
}

export interface DocumentSignaturePerson {
  role: string;
  name?: string;
  nip?: string;
  placeDate?: string;
}

export interface DocumentSignatureProps {
  left?: DocumentSignaturePerson;
  right?: DocumentSignaturePerson;
  className?: string;
}

export interface DocumentStatusBadgeProps {
  children: ReactNode;
  tone?: DocumentBadgeTone;
  className?: string;
}

export interface DocumentSummaryCard {
  label: string;
  value: ReactNode;
  note?: ReactNode;
}

export interface DocumentSummaryCardsProps {
  items: DocumentSummaryCard[];
  columns?: 2 | 3 | 4;
  className?: string;
}

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

function isCellObject(cell: DocumentCell): cell is DocumentCellObject {
  return typeof cell === "object" && cell !== null && !Array.isArray(cell) && !("type" in cell);
}

function renderCell(cell: DocumentCell, tagName: "th" | "td", keyPrefix: string): ReactNode {
  const Tag = tagName;

  if (isCellObject(cell)) {
    return (
      <Tag
        key={keyPrefix}
        colSpan={cell.colSpan}
        rowSpan={cell.rowSpan}
        className={cx(cell.align ? `text-${cell.align}` : undefined, cell.className)}
        style={cell.style}
      >
        {cell.content ?? ""}
      </Tag>
    );
  }

  return <Tag key={keyPrefix}>{cell}</Tag>;
}

function getMaxColumnCount(headers?: DocumentCell[][], rows?: DocumentCell[][]): number {
  const allRows = [...(headers ?? []), ...(rows ?? [])];
  if (allRows.length === 0) return 1;

  return Math.max(
    1,
    ...allRows.map((row) =>
      row.reduce((total: number, cell) => {
        if (isCellObject(cell)) return total + (cell.colSpan ?? 1);
        return total + 1;
      }, 0 as number)
    )
  );
}

/**
 * Build column width array for <colgroup> by tracking rowSpan/colSpan across header rows.
 * For each column, finds the "leaf cell" (cell at the bottom-most occupied row level)
 * and extracts its style.width. Only single-column cells (colSpan=1) contribute
 * individual column widths; colSpan>1 cells are skipped to avoid distributing
 * a combined width across spanned columns.
 *
 * This correctly handles multi-row headers where rowSpan cells from upper rows
 * reach down to the leaf level — those cells are also considered leaf cells
 * for their respective columns.
 */
function buildColWidths(headers: DocumentCell[][]): (string | undefined)[] {
  if (headers.length === 0) return [];

  const totalCols = getMaxColumnCount(headers);
  if (totalCols === 0) return [];

  const widths: (string | undefined)[] = new Array(totalCols).fill(undefined);

  type GridEntry = { row: number; cellIdx: number; colSpan: number; rowSpan: number };
  const occupied: (GridEntry | null)[][] = Array.from(
    { length: headers.length },
    () => new Array<GridEntry | null>(totalCols).fill(null)
  );

  for (let r = 0; r < headers.length; r++) {
    let colCursor = 0;
    for (let c = 0; c < headers[r].length; c++) {
      while (colCursor < totalCols && occupied[r][colCursor] !== null) colCursor++;
      if (colCursor >= totalCols) break;

      const cell = headers[r][c];
      const cs = isCellObject(cell) ? (cell.colSpan ?? 1) : 1;
      const rs = isCellObject(cell) ? (cell.rowSpan ?? 1) : 1;

      for (let dr = 0; dr < Math.min(rs, headers.length - r); dr++) {
        for (let dc = 0; dc < cs; dc++) {
          if (colCursor + dc < totalCols) {
            occupied[r + dr][colCursor + dc] = { row: r, cellIdx: c, colSpan: cs, rowSpan: rs };
          }
        }
      }

      colCursor += cs;
    }
  }

  const lastRow = headers.length - 1;
  for (let col = 0; col < totalCols; col++) {
    const entry = occupied[lastRow][col];
    if (!entry) continue;

    const cell = headers[entry.row][entry.cellIdx];
    if (entry.colSpan === 1 && isCellObject(cell) && cell.style?.width) {
      widths[col] = cell.style.width as string;
    }
  }

  return widths;
}

export function DocumentPage({
  children,
  orientation = "portrait",
  className,
  toolbar,
}: DocumentPageProps) {
  /* INLINE-STYLE-FALLBACK: CSS conflicts dari index.css & wysiwyg-canvas.css
     dapat override class-based rules. Inline style menjamin font & layout
     A4 TIDAK terganggu oleh Tailwind @layer cascade atau .wysiwyg-canvas override. */
  /* NAME-02 FIX: added width: "100%" to ensure document fills
     container even when CSS class width (210mm/297mm) is overridden. */
  /* PROMES-CASCADE-FIX: promes-landscape-page uses compressed 8pt font for
     dense matrix. If className includes "promes-landscape-page", we skip
     the inline fontSize override so document-print.css / wysiwyg-canvas.css
     !important rules can take effect. Without this, inline fontSize:11pt
     would override everything (inline > !important CSS). */
  const isPromesLandscape = className?.includes("promes-landscape-page") ?? false;
  const isMerdekaPage = className?.includes("promes-merdeka-page") ?? false;
  /* DOCUMENT-CENTRIC FORMAL: Merdeka pages use serif font (Times New Roman / Georgia)
     per Blueprint Standar Dinas Pendidikan. Other pages retain Arial sans-serif. */
  const fontFamily = isMerdekaPage
    ? "'Times New Roman', Georgia, serif"
    : "Arial, Helvetica, sans-serif";
  const inlineStyle: React.CSSProperties = {
    fontFamily,
    fontSize: isPromesLandscape ? undefined : "11pt",
    lineHeight: isPromesLandscape ? undefined : "1.25",
    width: "100%",
    boxSizing: "border-box",
  };

  return (
    <>
      {toolbar ? <div className="print-toolbar no-print">{toolbar}</div> : null}
      <article
        className={cx(
          "document-page",
          orientation === "landscape" && "document-landscape",
          orientation === "portrait" && "document-portrait",
          className
        )}
        style={inlineStyle}
      >
        {children}
      </article>
    </>
  );
}

export function DocumentHeader({
  schoolName,
  schoolAddress,
  schoolOffice,
  institutionName,
  logoUrl,
  showBorder = true,
}: DocumentHeaderProps) {
  return (
    <header className={cx("document-header", showBorder && "with-border")}>
      {logoUrl ? (
        <div className="document-logo-box">
          <img src={logoUrl} alt="Logo sekolah" className="document-logo" />
        </div>
      ) : null}

      <div className="document-header-text">
        {institutionName ? (
          <div className="document-kop-line document-kop-small">
            {institutionName}
          </div>
        ) : null}
        {schoolOffice ? (
          <div className="document-kop-line document-kop-small">
            {schoolOffice}
          </div>
        ) : null}
        <div className="document-kop-line document-kop-school">
          {schoolName || "NAMA SEKOLAH"}
        </div>
        <div className="document-kop-line document-kop-address">
          {schoolAddress || "Alamat sekolah belum tersedia"}
        </div>
        {/* SA-08: Warning badge when identity data is incomplete */}
        {!schoolName && (
          <div className="document-kop-line" style={{ color: "#dc2626", fontSize: "9pt", fontWeight: 600 }}>
            [DATA BELUM LENGKAP — Nama sekolah belum diisi]
          </div>
        )}
      </div>
    </header>
  );
}

export function DocumentTitle({
  title,
  subtitle,
  align = "center",
}: DocumentTitleProps) {
  return (
    <div className={cx("document-title-block", `text-${align}`)}>
      <h1 className="document-title">{title}</h1>
      {subtitle ? <p className="document-subtitle">{subtitle}</p> : null}
    </div>
  );
}

export function DocumentIdentityTable({
  rows,
  columns = 2,
  className,
}: DocumentIdentityTableProps) {
  // SA-08: Show warning instead of misleading "Belum tersedia" placeholder
  const safeRows =
    rows.length > 0 ? rows : [{ label: "Keterangan", value: <span style={{ color: "#dc2626" }}>[DATA BELUM LENGKAP]</span> }];

  if (columns === 1) {
    return (
      <table className={cx("document-identity", "document-identity-one", className)}>
        <tbody>
          {safeRows.map((row, index) => (
            <tr key={`${row.label}-${index}`}>
              <td className="document-identity-label">{row.label}</td>
              <td className="document-identity-separator">:</td>
              <td className="document-identity-value">
                {row.value || "Belum tersedia"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  const pairedRows: Array<[DocumentIdentityRow | undefined, DocumentIdentityRow | undefined]> = [];
  for (let i = 0; i < safeRows.length; i += 2) {
    pairedRows.push([safeRows[i], safeRows[i + 1]]);
  }

  return (
    <table className={cx("document-identity", className)}>
      <tbody>
        {pairedRows.map(([left, right], index) => (
          <tr key={`identity-row-${index}`}>
            <td className="document-identity-label">{left?.label || ""}</td>
            <td className="document-identity-separator">{left ? ":" : ""}</td>
            <td className="document-identity-value">{left?.value || ""}</td>
            <td className="document-identity-gap" />
            <td className="document-identity-label">{right?.label || ""}</td>
            <td className="document-identity-separator">{right ? ":" : ""}</td>
            <td className="document-identity-value">{right?.value || ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function DocumentSection({
  title,
  subtitle,
  children,
  className,
}: DocumentSectionProps) {
  return (
    <section className={cx("document-section", className)}>
      {title ? <h2 className="document-section-title">{title}</h2> : null}
      {subtitle ? <p className="document-section-subtitle">{subtitle}</p> : null}
      {children}
    </section>
  );
}

export function DocumentTable({
  caption,
  headers,
  rows,
  footer,
  emptyText = "Belum tersedia",
  className,
  compact = false,
}: DocumentTableProps) {
  const colSpan = getMaxColumnCount(headers, rows);
  const safeRows =
    rows && rows.length > 0
      ? rows
      : [[{ content: emptyText, colSpan, className: "text-center text-muted" }]];

  /* --- Auto colgroup for column width locking ---
   * Uses buildColWidths() to properly handle multi-row headers with rowSpan.
   * For each column, finds the "leaf cell" (cell at the bottom-most row level)
   * and extracts its style.width. Only single-column cells (colSpan=1)
   * contribute individual column widths.
   */
  const colWidths = headers && headers.length > 0 ? buildColWidths(headers) : [];
  const hasColWidths = colWidths.some((w) => w !== undefined);

  return (
    <div className="document-table-wrap">
      {caption ? <div className="document-table-caption">{caption}</div> : null}
      <table
        className={cx(
          "document-table",
          compact && "document-table-compact",
          className
        )}
        style={{
          fontFamily: "Arial, Helvetica, sans-serif",
          width: "100%",
          tableLayout: "fixed",
          borderCollapse: "collapse",
          boxSizing: "border-box",
        }}
      >
        {/* Auto Colgroup for Column Width Locking */}
        {hasColWidths ? (
          <colgroup>
            {colWidths.map((width, idx) => (
              <col key={`col-${idx}`} style={width ? { width } : undefined} />
            ))}
          </colgroup>
        ) : null}

        {headers && headers.length > 0 ? (
          <thead>
            {headers.map((row, rowIndex) => (
              <tr key={`h-${rowIndex}`}>
                {row.map((cell, cellIndex) => renderCell(cell, "th", `h-${rowIndex}-${cellIndex}`))}
              </tr>
            ))}
          </thead>
        ) : null}
        <tbody>
          {safeRows.map((row, rowIndex) => (
            <tr key={`r-${rowIndex}`}>
              {row.map((cell, cellIndex) => renderCell(cell, "td", `r-${rowIndex}-${cellIndex}`))}
            </tr>
          ))}
        </tbody>
        {footer && footer.length > 0 ? (
          <tfoot>
            {footer.map((row, rowIndex) => (
              <tr key={`f-${rowIndex}`}>
                {row.map((cell, cellIndex) => renderCell(cell, "td", `f-${rowIndex}-${cellIndex}`))}
              </tr>
            ))}
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}

export function DocumentSignature({ left, right, className }: DocumentSignatureProps) {
  const safeLeft = left ?? {
    role: "Mengetahui,\nKepala Sekolah",
    name: "",
    nip: "",
  };

  const safeRight = right ?? {
    role: "Guru Mata Pelajaran",
    name: "",
    nip: "",
  };

  return (
    <div className={cx("signature-grid", className)}>
      {[safeLeft, safeRight].map((person, index) => (
        <div className="signature-block" key={`${person.role}-${index}`}>
          <div className="signature-place-date">{person.placeDate || "\u00A0"}</div>
          <div className="signature-role">
            {person.role.split("\n").map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
          <div className="signature-space" />
          <div className="signature-name">
            {person.name || "________________________"}
          </div>
          <div className="signature-nip">
            {person.nip ? `NIP. ${person.nip}` : "NIP. ____________________"}
          </div>
        </div>
      ))}
    </div>
  );
}

export function DocumentStatusBadge({
  children,
  tone = "default",
  className,
}: DocumentStatusBadgeProps) {
  return (
    <span className={cx("document-status-badge", `tone-${tone}`, className)}>
      {children}
    </span>
  );
}

export function DocumentSummaryCards({
  items,
  columns = 4,
  className,
}: DocumentSummaryCardsProps) {
  const safeItems =
    items.length > 0 ? items : [{ label: "Data", value: "Belum tersedia", note: "" }];

  return (
    <div className={cx("document-summary-cards", `document-summary-cols-${columns}`, className)}>
      {safeItems.map((item, index) => (
        <div className="document-summary-card" key={`${item.label}-${index}`}>
          <div className="document-summary-label">{item.label}</div>
          <div className="document-summary-value">{item.value}</div>
          {item.note ? <div className="document-summary-note">{item.note}</div> : null}
        </div>
      ))}
    </div>
  );
}
