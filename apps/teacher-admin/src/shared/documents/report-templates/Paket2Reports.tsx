import {
  DocumentSection,
  DocumentTable,
  DocumentStatusBadge,
} from "../DocumentLayout";
import type { DocumentCell, DocumentCellObject } from "../DocumentLayout";
import { ReportFrame, CommonHeader, CommonSignature } from "./ReportFrame";
import type {
  ReportTemplateProps,
  EffectiveWeeksData,
  KktpAnalysisData,
  RemedialEnrichmentData,
  AtpReportData,
  AssessmentGridData,
} from "./types";
import { numVal } from "./helpers";

/* ════════════════════════════════════════════════════════════════════════════════
   PAKET 2: Supplementary School Document Components
   ════════════════════════════════════════════════════════════════════════════════ */

/* ── EffectiveWeeksDocument: Rincian Minggu Efektif (A4 Portrait) ── */

export function EffectiveWeeksDocument({ data, withPrintArea = true }: ReportTemplateProps<EffectiveWeeksData>) {
  const rows = data?.rows ?? [];
  const allocations = data?.allocations ?? [];

  /* ── Table 1: Perhitungan Minggu Efektif per Bulan ── */
  const table1Headers: DocumentCell[][] = [
    [
      { content: "NO", style: { width: '5%' }, align: 'center' },
      { content: "BULAN", style: { width: '25%' }, align: 'left' },
      { content: "JML MINGGU", style: { width: '20%' }, align: 'center' },
      { content: "MINGGU TDK EFEKTIF", style: { width: '25%' }, align: 'center' },
      { content: "MINGGU EFEKTIF", style: { width: '25%' }, align: 'center' },
    ],
  ];

  const totalWeeksSum = rows.reduce((s, r) => s + (numVal(r.totalWeeks) || 0), 0);
  const nonEffSum = rows.reduce((s, r) => s + (numVal(r.nonEffectiveWeeks) || 0), 0);
  const effSum = rows.reduce((s, r) => s + (numVal(r.effectiveWeeks) || 0), 0);

  const table1Footer: DocumentCell[][] = [
    [
      { content: "TOTAL", colSpan: 2, align: 'center' },
      { content: totalWeeksSum, align: 'center' },
      { content: nonEffSum, align: 'center' },
      { content: effSum, align: 'center' },
    ],
  ];

  const table1Rows: DocumentCell[][] | undefined = rows.length > 0
    ? rows.map((row, i) => [
        { content: i + 1, align: 'center' },
        { content: row.month || "—", align: 'left' },
        { content: row.totalWeeks ?? "—", align: 'center' },
        { content: row.nonEffectiveWeeks ?? "—", align: 'center' },
        { content: row.effectiveWeeks ?? "—", align: 'center' },
      ] as DocumentCell[])
    : undefined;

  /* ── Table 2: Distribusi Alokasi Jam Pelajaran ── */
  const table2Headers: DocumentCell[][] = [
    [
      { content: "NO", style: { width: '5%' }, align: 'center' },
      { content: "KOMPONEN", style: { width: '35%' }, align: 'left' },
      { content: "JP PER MINGGU", style: { width: '20%' }, align: 'center' },
      { content: "TOTAL MINGGU EFEKTIF", style: { width: '20%' }, align: 'center' },
      { content: "TOTAL JP", style: { width: '20%' }, align: 'center' },
    ],
  ];

  const allocJpTotal = allocations.reduce((s, r) => s + (numVal(r.totalJp) || 0), 0);

  const table2Footer: DocumentCell[][] = [
    [
      { content: "TOTAL JP SEMESTER", colSpan: 4, align: 'center' },
      { content: data?.totalJp ?? allocJpTotal, align: 'center' },
    ],
  ];

  const table2Rows: DocumentCell[][] | undefined = allocations.length > 0
    ? allocations.map((alloc, i) => [
        { content: i + 1, align: 'center' },
        { content: alloc.component || "—", align: 'left' },
        { content: alloc.jpPerWeek ?? "—", align: 'center' },
        { content: alloc.totalWeeks ?? data?.totalEffectiveWeeks ?? "—", align: 'center' },
        { content: alloc.totalJp ?? "—", align: 'center' },
      ] as DocumentCell[])
    : undefined;

  return (
    <ReportFrame withPrintArea={withPrintArea}>
      <CommonHeader
        context={data?.context}
        title="RINCIAN MINGGU EFEKTIF"
        subtitle="Penghitungan alokasi jam pelajaran efektif berdasarkan kalender pendidikan"
      />
      <DocumentSection title="A. Perhitungan Jumlah Minggu Efektif per Bulan">
        <DocumentTable
          headers={table1Headers}
          rows={table1Rows}
          footer={table1Footer}
          emptyText="Belum tersedia"
        />
      </DocumentSection>
      <DocumentSection title="B. Distribusi Alokasi Jam Pelajaran" subtitle="Total JP = Minggu Efektif × JP per Minggu">
        <DocumentTable
          headers={table2Headers}
          rows={table2Rows}
          footer={table2Footer}
          emptyText="Belum tersedia"
        />
      </DocumentSection>
      <CommonSignature context={data?.context} />
    </ReportFrame>
  );
}

/* ── KktpAnalysisDocument: Analisis KKTP / Kriteria Ketuntasan (A4 Landscape) ── */

export function KktpAnalysisDocument({ data, withPrintArea = true }: ReportTemplateProps<KktpAnalysisData>) {
  const rows = data?.rows ?? [];

  const intervalLabels = ["0–60%", "61–70%", "71–80%", "81–100%"];
  const intervalDescriptions = ["Perlu Bimbingan", "Cukup", "Baik", "Sangat Baik"];

  /* ── Header Row 1: rowSpan + colSpan groups ── */
  const row1: DocumentCell[] = [
    { content: "NO", rowSpan: 2, style: { width: '4%' }, align: 'center' },
    { content: "ELEMEN", rowSpan: 2, style: { width: '16%' }, align: 'left' },
    { content: "TUJUAN PEMBELAJARAN (TP)", rowSpan: 2, style: { width: '30%' }, align: 'left' },
    { content: "INTERVAL KRITERIA KETERCAPAIAN", colSpan: 4, align: 'center' },
    { content: "KET / AKSI REKOMENDASI", rowSpan: 2, style: { width: '22%' }, align: 'left' },
  ];

  /* ── Header Row 2: interval columns with descriptions ── */
  const row2: DocumentCell[] = intervalLabels.map((label, i) =>
    ({ content: `${label}\n${intervalDescriptions[i]}`, style: { width: '7%' }, align: 'center' } as DocumentCellObject)
  );

  const headers = [row1, row2];

  /* ── Data Rows: checkmark in matching interval column ── */
  const dataRows: DocumentCell[][] | undefined = rows.length > 0
    ? rows.map((row, index) => {
        const intervalIdx = row.intervalIndex ?? -1;
        const mark = row.intervalMark ?? "✓";
        return [
          { content: index + 1, align: 'center' },
          { content: row.element || "—", align: 'left' },
          { content: row.learningObjective || "—", align: 'left' },
          ...intervalLabels.map((_, i) =>
            ({ content: i === intervalIdx ? mark : "", align: 'center' } as DocumentCellObject)
          ),
          { content: row.actionOrRecommendation || "", align: 'left' },
        ] as DocumentCell[];
      })
    : undefined;

  return (
    <ReportFrame withPrintArea={withPrintArea} orientation="landscape">
      <CommonHeader
        context={data?.context}
        title="ANALISIS KKTP"
        subtitle="Kriteria Ketuntasan Tujuan Pembelajaran — pemetaan interval nilai/rubrik"
        extraIdentityRows={[{ label: "KKTP/KKM", value: data?.kktp }]}
      />
      <DocumentTable compact headers={headers} rows={dataRows} emptyText="Belum tersedia" />
      <CommonSignature context={data?.context} />
    </ReportFrame>
  );
}

/* ── RemedialEnrichmentDocument: Laporan Remedial & Pengayaan (A4 Landscape) ── */

export function RemedialEnrichmentDocument({ data, withPrintArea = true }: ReportTemplateProps<RemedialEnrichmentData>) {
  const rows = data?.rows ?? [];

  /* ── Headers: single-row, percentage widths ── */
  const headers: DocumentCell[][] = [
    [
      { content: "NO", style: { width: '4%' }, align: 'center' },
      { content: "NAMA SISWA", style: { width: '20%' }, align: 'left' },
      { content: "NILAI AWAL", style: { width: '8%' }, align: 'center' },
      { content: "TP / KD BELUM TUNTAS", style: { width: '22%' }, align: 'left' },
      { content: "BENTUK KEGIATAN (REMEDIAL / PENGAYAAN)", style: { width: '26%' }, align: 'left' },
      { content: "NILAI AKHIR", style: { width: '8%' }, align: 'center' },
      { content: "KET", style: { width: '12%' }, align: 'center' },
    ],
  ];

  /* ── Data Rows ── */
  const dataRows: DocumentCell[][] | undefined = rows.length > 0
    ? rows.map((row, index) => {
        const isTuntas = row.status === "TUNTAS";
        const statusBadge = (
          <DocumentStatusBadge tone={isTuntas ? "complete" : "danger"}>
            {row.status || "—"}
          </DocumentStatusBadge>
        );
        return [
          { content: row.no ?? index + 1, align: 'center' },
          { content: row.name, align: 'left' },
          { content: row.initialScore ?? "—", align: 'center' },
          { content: row.unfinishedTp || "—", align: 'left' },
          { content: row.activity || (row.activityType === "Pengayaan" ? "Tugas pengayaan / proyek mandiri" : "Pembelajaran ulang / tugas perbaikan"), align: 'left' },
          { content: row.finalScore ?? "—", align: 'center' },
          { content: statusBadge, align: 'center' },
        ] as DocumentCell[];
      })
    : undefined;

  return (
    <ReportFrame withPrintArea={withPrintArea} orientation="landscape">
      <CommonHeader
        context={data?.context}
        title="LAPORAN REMEDIAL & PENGAYAAN"
        subtitle="Catatan pelaksanaan program perbaikan (remedial) dan pengayaan bagi siswa"
        extraIdentityRows={[{ label: "KKTP/KKM", value: data?.kktp }]}
      />
      <DocumentTable headers={headers} rows={dataRows} emptyText="Belum tersedia" />
      {data?.conclusion ? (
        <DocumentSection title="Kesimpulan">
          <p className="document-paragraph">{data.conclusion}</p>
        </DocumentSection>
      ) : rows.length > 0 ? (
        <DocumentSection title="Kesimpulan">
          <p className="document-paragraph">
            Program remedial dan pengayaan dilaksanakan untuk membantu siswa mencapai kompetensi
            yang ditetapkan serta memperluas penguasaan materi bagi siswa yang telah tuntas.
          </p>
        </DocumentSection>
      ) : null}
      <CommonSignature context={data?.context} />
    </ReportFrame>
  );
}

/* ── AtpReportDocument: Alur Tujuan Pembelajaran / ATP (A4 Landscape) ── */

export function AtpReportDocument({ data, withPrintArea = true }: ReportTemplateProps<AtpReportData>) {
  const rows = data?.rows ?? [];

  /* ── Headers: single-row, percentage widths ── */
  const headers: DocumentCell[][] = [
    [
      { content: "NO", style: { width: '4%' }, align: 'center' },
      { content: "ELEMEN", style: { width: '15%' }, align: 'left' },
      { content: "CAPAIAN PEMBELAJARAN (CP)", style: { width: '25%' }, align: 'left' },
      { content: "TUJUAN PEMBELAJARAN (TP)", style: { width: '30%' }, align: 'left' },
      { content: "ALOKASI (JP)", style: { width: '6%' }, align: 'center' },
      { content: "PROFIL PELAJAR PANCASILA", style: { width: '20%' }, align: 'left' },
    ],
  ];

  /* ── Data Rows ── */
  const dataRows: DocumentCell[][] | undefined = rows.length > 0
    ? rows.map((row, index) => [
        { content: index + 1, align: 'center' },
        { content: row.element || "—", align: 'left' },
        { content: row.learningOutcome || "—", align: 'left' },
        { content: row.learningObjective || "—", align: 'left', className: 'preserve-line' },
        { content: row.allocationJp ?? "—", align: 'center' },
        { content: row.pancasilaProfile || "—", align: 'left' },
      ] as DocumentCell[])
    : undefined;

  /* ── Footer: Total Jam Pelajaran ATP ── */
  const totalJp = rows.reduce((sum, r) => {
    const n = numVal(r.allocationJp);
    return sum + (isNaN(n) ? 0 : n);
  }, 0);

  const footer: DocumentCell[][] = [
    [
      { content: "Total Jam Pelajaran ATP", colSpan: 4, align: 'center' },
      { content: totalJp, align: 'center' },
      { content: "", align: 'left' },
    ],
  ];

  return (
    <ReportFrame withPrintArea={withPrintArea} orientation="landscape">
      <CommonHeader
        context={data?.context}
        title="ALUR TUJUAN PEMBELAJARAN (ATP)"
        subtitle="Peta alur materi pembelajaran Kurikulum Merdeka per semester"
      />
      <DocumentTable headers={headers} rows={dataRows} footer={footer} emptyText="Belum tersedia" />
      <CommonSignature context={data?.context} />
    </ReportFrame>
  );
}

/* ── AssessmentGridDocument: Kisi-Kisi Penulisan Soal (A4 Landscape) ── */

export function AssessmentGridDocument({ data, withPrintArea = true }: ReportTemplateProps<AssessmentGridData>) {
  const rows = data?.rows ?? [];

  /* ── Headers: single-row, percentage widths ── */
  const headers: DocumentCell[][] = [
    [
      { content: "NO", style: { width: '4%' }, align: 'center' },
      { content: "CAPAIAN / ELEMEN", style: { width: '18%' }, align: 'left' },
      { content: "MATERI", style: { width: '20%' }, align: 'left' },
      { content: "INDIKATOR SOAL", style: { width: '32%' }, align: 'left' },
      { content: "BENTUK SOAL", style: { width: '10%' }, align: 'center' },
      { content: "LEVEL", style: { width: '8%' }, align: 'center' },
      { content: "NO. SOAL", style: { width: '8%' }, align: 'center' },
    ],
  ];

  /* ── Data Rows ── */
  const dataRows: DocumentCell[][] | undefined = rows.length > 0
    ? rows.map((row, index) => [
        { content: row.no ?? index + 1, align: 'center' },
        { content: row.element || "—", align: 'left' },
        { content: row.material || "—", align: 'left' },
        { content: row.indicator || "—", align: 'left' },
        { content: row.questionForm || "—", align: 'center' },
        { content: row.cognitiveLevel || "—", align: 'center' },
        { content: row.questionNumbers || "—", align: 'center' },
      ] as DocumentCell[])
    : undefined;

  return (
    <ReportFrame withPrintArea={withPrintArea} orientation="landscape">
      <CommonHeader
        context={data?.context}
        title="KISI-KISI PENULISAN SOAL"
        subtitle={data?.assessmentTitle || "Asesmen Sumatif Tengah Semester (STS) / Akhir Semester (SAS)"}
      />
      <DocumentTable headers={headers} rows={dataRows} emptyText="Belum tersedia" />
      <CommonSignature context={data?.context} />
    </ReportFrame>
  );
}
