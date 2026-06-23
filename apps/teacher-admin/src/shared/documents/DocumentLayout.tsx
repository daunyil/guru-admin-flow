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

function renderCell(cell: DocumentCell, tagName: "th" | "td", index: number): ReactNode {
  const Tag = tagName;

  if (isCellObject(cell)) {
    return (
      <Tag
        key={index}
        colSpan={cell.colSpan}
        rowSpan={cell.rowSpan}
        className={cx(cell.align ? `text-${cell.align}` : undefined, cell.className)}
        style={cell.style}
      >
        {cell.content ?? ""}
      </Tag>
    );
  }

  return <Tag key={index}>{cell}</Tag>;
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

export function DocumentPage({
  children,
  orientation = "portrait",
  className,
  toolbar,
}: DocumentPageProps) {
  return (
    <>
      {toolbar ? <div className="print-toolbar no-print">{toolbar}</div> : null}
      <article
        className={cx(
          "document-page",
          orientation === "landscape" && "document-landscape",
          className
        )}
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
  const safeRows =
    rows.length > 0 ? rows : [{ label: "Keterangan", value: "Belum tersedia" }];

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
  emptyText = "Belum tersedia",
  className,
  compact = false,
}: DocumentTableProps) {
  const colSpan = getMaxColumnCount(headers, rows);
  const safeRows =
    rows && rows.length > 0
      ? rows
      : [[{ content: emptyText, colSpan, className: "text-center text-muted" }]];

  return (
    <div className="document-table-wrap">
      {caption ? <div className="document-table-caption">{caption}</div> : null}
      <table
        className={cx(
          "document-table",
          compact && "document-table-compact",
          className
        )}
      >
        {headers && headers.length > 0 ? (
          <thead>
            {headers.map((row, rowIndex) => (
              <tr key={`header-${rowIndex}`}>
                {row.map((cell, cellIndex) => renderCell(cell, "th", cellIndex))}
              </tr>
            ))}
          </thead>
        ) : null}
        <tbody>
          {safeRows.map((row, rowIndex) => (
            <tr key={`body-${rowIndex}`}>
              {row.map((cell, cellIndex) => renderCell(cell, "td", cellIndex))}
            </tr>
          ))}
        </tbody>
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
