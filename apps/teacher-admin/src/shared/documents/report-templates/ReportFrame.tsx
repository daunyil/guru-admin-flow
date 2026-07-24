import type { ReactNode } from "react";
import {
  DocumentPage,
  DocumentHeader,
  DocumentTitle,
  DocumentIdentityTable,
  DocumentSignature,
} from "../DocumentLayout";
import type { DocumentContext } from "./types";
import { makeIdentityRows, formatPlaceDate } from "./helpers";

export function ReportFrame({
  children,
  orientation = "portrait",
  withPrintArea = true,
}: {
  children: ReactNode;
  orientation?: "portrait" | "landscape";
  withPrintArea?: boolean;
}) {
  const page = <DocumentPage orientation={orientation}>{children}</DocumentPage>;
  return withPrintArea ? <div className="print-area">{page}</div> : page;
}

export function CommonHeader({
  context,
  title,
  subtitle,
  extraIdentityRows,
}: {
  context?: DocumentContext;
  title: string;
  subtitle?: string;
  extraIdentityRows?: Array<{ label: string; value?: ReactNode }>;
}) {
  return (
    <>
      <DocumentHeader
        schoolName={context?.schoolName}
        schoolAddress={context?.schoolAddress}
        schoolOffice={context?.schoolOffice}
        institutionName={context?.institutionName}
        logoUrl={context?.logoUrl}
      />
      <DocumentTitle title={title} subtitle={subtitle} />
      <DocumentIdentityTable rows={makeIdentityRows(context, extraIdentityRows)} />
    </>
  );
}

export function CommonSignature({ context }: { context?: DocumentContext }) {
  return (
    <DocumentSignature
      left={{ role: "Mengetahui,\nKepala Sekolah", name: context?.headmasterName, nip: context?.headmasterNip }}
      right={{
        role: "Guru Mata Pelajaran",
        name: context?.teacherName,
        nip: context?.teacherNip,
        placeDate: formatPlaceDate(context),
      }}
    />
  );
}
