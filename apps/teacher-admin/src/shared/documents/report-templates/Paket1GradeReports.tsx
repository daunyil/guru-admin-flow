import { DocumentSection, DocumentTable } from "../DocumentLayout";
import type { DocumentCell, DocumentCellObject } from "../DocumentLayout";
import { ReportFrame, CommonHeader, CommonSignature } from "./ReportFrame";
import type {
  ReportTemplateProps,
  GradeReportData,
  GradeReportRow,
  MasteryAnalysisData,
  RemedialReportData,
  EnrichmentReportData,
} from "./types";
import { predikat, numVal, avgVals, defaultKdColumns } from "./helpers";

export function GradeReportDocument({ data, withPrintArea = true }: ReportTemplateProps<GradeReportData>) {
  const rows = data?.rows ?? [];
  const TOTAL_TP = 4;

  /* ── Resolve TP scores: prefer tpScores, fall back to kdScores ── */
  const resolveTp = (row: GradeReportRow): Array<number | string | null | undefined> => {
    if (row.tpScores && row.tpScores.length > 0) return row.tpScores.slice(0, TOTAL_TP);
    if (row.kdScores) {
      const kdCols = data?.kdColumns ?? defaultKdColumns();
      return kdCols.slice(0, TOTAL_TP).map((col) => row.kdScores?.[col.id]);
    }
    return [null, null, null, null];
  };

  /* ── Resolve STS/SAS/NA: prefer new fields, fall back to old ── */
  const sts  = (row: GradeReportRow) => row.stsScore ?? row.ptsScore ?? null;
  const sas  = (row: GradeReportRow) => row.sasScore ?? row.pasScore ?? null;
  const na   = (row: GradeReportRow) => row.naScore ?? row.finalScore ?? null;
  const desc = (row: GradeReportRow) => row.capaian ?? row.note ?? "";

  /* ── Header Row 1 ── */
  const row1: DocumentCell[] = [
    { content: "NO", rowSpan: 2, style: { width: '3%' }, align: 'center' },
    { content: "NIS/NISN", rowSpan: 2, style: { width: '9%' }, align: 'center' },
    { content: "NAMA SISWA", rowSpan: 2, style: { width: '22%' }, align: 'left' },
    { content: "FORMATIF (TP)", colSpan: TOTAL_TP, align: 'center' },
    { content: "SUMATIF", colSpan: 2, align: 'center' },
    { content: "NA", rowSpan: 2, style: { width: '5%' }, align: 'center' },
    { content: "PREDIKAT", rowSpan: 2, style: { width: '6%' }, align: 'center' },
    { content: "CAPAIAN KOMPETENSI / DESKRIPSI", rowSpan: 2, style: { width: '23%' }, align: 'left' },
  ];

  /* ── Header Row 2: leaf columns ── */
  const tpLabels = data?.kdColumns && data.kdColumns.length >= TOTAL_TP
    ? data.kdColumns.slice(0, TOTAL_TP).map((col) => col.label)
    : ["TP1", "TP2", "TP3", "TP4"];

  const row2: DocumentCell[] = [
    ...tpLabels.map((label) => ({ content: label, style: { width: '4.5%' }, align: 'center' } as DocumentCellObject)),
    { content: "STS", style: { width: '5%' }, align: 'center' },
    { content: "SAS", style: { width: '5%' }, align: 'center' },
  ];

  const headers = [row1, row2];

  /* ── Data Rows ── */
  const dataRows: DocumentCell[][] | undefined = rows.length > 0
    ? rows.map((row, index) => {
        const tpVals = resolveTp(row);
        const naVal  = na(row);
        const pred   = row.predicate || predikat(naVal);
        return [
          { content: row.no ?? index + 1, align: 'center' },
          { content: row.nis || "—", align: 'center' },
          { content: row.name, align: 'left' },
          ...tpVals.map((v) => ({ content: v ?? "—", align: 'center' } as DocumentCellObject)),
          { content: sts(row) ?? "—", align: 'center' },
          { content: sas(row) ?? "—", align: 'center' },
          { content: naVal ?? "—", align: 'center' },
          { content: pred, align: 'center' },
          { content: desc(row) || "—", align: 'left' },
        ] as DocumentCell[];
      })
    : undefined;

  /* ── Footer: Rata-rata Kelas ── */
  const avgTp = Array.from({ length: TOTAL_TP }, (_, ti) =>
    avgVals(rows.map((r) => numVal(resolveTp(r)[ti])))
  );
  const avgSTS = avgVals(rows.map((r) => numVal(sts(r))));
  const avgSAS = avgVals(rows.map((r) => numVal(sas(r))));
  const avgNA  = avgVals(rows.map((r) => numVal(na(r))));

  const footer: DocumentCell[][] = [
    [
      { content: "Rata-rata Kelas", colSpan: 3, align: 'center' },
      ...avgTp.map((v) => ({ content: v, align: 'center' } as DocumentCellObject)),
      { content: avgSTS, align: 'center' },
      { content: avgSAS, align: 'center' },
      { content: avgNA, align: 'center' },
      { content: predikat(avgNA), align: 'center' },
      { content: "", align: 'left' },
    ],
  ];

  return (
    <ReportFrame withPrintArea={withPrintArea} orientation="landscape">
      <CommonHeader
        context={data?.context}
        title="LAPORAN NILAI / ASESMEN"
        subtitle="Nilai Formatif (TP), Sumatif (STS & SAS), Nilai Akhir, Predikat, dan Deskripsi Capaian"
        extraIdentityRows={[{ label: "KKTP/KKM", value: data?.kktp }]}
      />
      <DocumentTable compact headers={headers} rows={dataRows} footer={footer} emptyText="Belum tersedia" />
      <CommonSignature context={data?.context} />
    </ReportFrame>
  );
}

export function MasteryAnalysisDocument({ data, withPrintArea = true }: ReportTemplateProps<MasteryAnalysisData>) {
  const kdColumns = data?.kdColumns && data.kdColumns.length > 0 ? data.kdColumns : defaultKdColumns();

  return (
    <ReportFrame withPrintArea={withPrintArea} orientation="landscape">
      <CommonHeader
        context={data?.context}
        title="ANALISIS KETUNTASAN"
        subtitle="Analisis ketuntasan siswa per KD"
        extraIdentityRows={[{ label: "KKTP/KKM", value: data?.kktp }]}
      />
      <DocumentTable
        className="grade-kd-table"
        headers={[[{ content: "No", style: { width: '24pt' } }, { content: "Nomor Induk", style: { width: '48pt' } }, { content: "Nama Siswa", style: { width: '120pt' } }, ...kdColumns.map((col) => ({ content: col.label, style: { width: '28pt' } })), { content: "Rata-rata", style: { width: '40pt' } }, { content: "Ketuntasan", style: { width: '44pt' } }, { content: "Tindak Lanjut" }]]}
        rows={(data?.rows ?? []).map((row, index) => [
          row.no ?? index + 1,
          row.nis || "—",
          row.name,
          ...kdColumns.map((col) => row.kdMastery?.[col.id] ?? "—"),
          row.average ?? "—",
          row.masteryStatus || "—",
          row.followUp || "—",
        ])}
      />
      <CommonSignature context={data?.context} />
    </ReportFrame>
  );
}

export function RemedialReportDocument({ data, withPrintArea = true }: ReportTemplateProps<RemedialReportData>) {
  const rows = data?.rows ?? [];
  return (
    <ReportFrame withPrintArea={withPrintArea}>
      <CommonHeader context={data?.context} title="PROGRAM REMEDIAL" subtitle="Tindak lanjut bagi siswa yang belum mencapai KKTP" extraIdentityRows={[{ label: "KKTP", value: data?.kktp }]} />
      <DocumentTable
        headers={[[{ content: "No", style: { width: '24pt' } }, { content: "Nama Siswa", style: { width: '80pt' } }, { content: "Nilai Awal", style: { width: '36pt' } }, { content: "Bentuk Remedial" }, { content: "Nilai Setelah Remedial", style: { width: '36pt' } }, { content: "Keterangan", style: { width: '50pt' } }]]}
        rows={rows.map((row, index) => [row.no ?? index + 1, row.name, row.scoreBefore ?? "—", row.remedialActivity || "Pembelajaran ulang / tugas perbaikan", row.scoreAfter ?? "—", row.note || "—"])}
        emptyText="Tidak terdapat siswa yang mengikuti remedial karena seluruh siswa telah mencapai KKTP."
      />
      <DocumentSection title="Kesimpulan">
        <p className="document-paragraph">{data?.conclusion || (rows.length > 0 ? "Program remedial dilaksanakan untuk membantu siswa mencapai kompetensi yang ditetapkan." : "Tidak terdapat siswa yang memerlukan program remedial pada periode ini.")}</p>
      </DocumentSection>
      <CommonSignature context={data?.context} />
    </ReportFrame>
  );
}

export function EnrichmentReportDocument({ data, withPrintArea = true }: ReportTemplateProps<EnrichmentReportData>) {
  const rows = data?.rows ?? [];
  return (
    <ReportFrame withPrintArea={withPrintArea}>
      <CommonHeader context={data?.context} title="PROGRAM PENGAYAAN" subtitle="Tindak lanjut bagi siswa yang telah mencapai capaian tinggi" extraIdentityRows={[{ label: "Batas Pengayaan", value: data?.threshold }]} />
      <DocumentTable
        headers={[[{ content: "No", style: { width: '24pt' } }, { content: "Nama Siswa", style: { width: '80pt' } }, { content: "Nilai", style: { width: '36pt' } }, { content: "Kegiatan Pengayaan" }, { content: "Produk/Hasil", style: { width: '50pt' } }, { content: "Keterangan", style: { width: '50pt' } }]]}
        rows={rows.map((row, index) => [row.no ?? index + 1, row.name, row.score ?? "—", row.enrichmentActivity || "Tugas pengayaan / proyek mandiri", row.product || "—", row.note || "—"])}
        emptyText="Tidak terdapat siswa yang masuk program pengayaan pada periode ini."
      />
      <DocumentSection title="Kesimpulan">
        <p className="document-paragraph">{data?.conclusion || (rows.length > 0 ? "Program pengayaan diberikan untuk memperluas dan memperdalam penguasaan materi siswa." : "Program pengayaan belum dilaksanakan karena belum ada siswa yang memenuhi kriteria pengayaan.")}</p>
      </DocumentSection>
      <CommonSignature context={data?.context} />
    </ReportFrame>
  );
}
