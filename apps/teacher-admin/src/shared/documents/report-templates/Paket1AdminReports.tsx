import {
  DocumentSection,
  DocumentSummaryCards,
  DocumentTable,
  DocumentIdentityTable,
  DocumentStatusBadge,
} from "../DocumentLayout";
import { ReportFrame, CommonHeader, CommonSignature } from "./ReportFrame";
import type {
  ReportTemplateProps,
  AdminPackageReportData,
  OfficialDocumentArchiveData,
  EffectiveWeekDetailData,
  SemesterReportData,
} from "./types";
import { statusTone, statusText } from "./helpers";

export function AdminPackageReport({ data, withPrintArea = true }: ReportTemplateProps<AdminPackageReportData>) {
  const items = data?.items ?? [];
  const completeCount = items.filter((item) => item.status === "complete").length;
  const summary = data?.summary ?? [
    { label: "Total Dokumen", value: items.length || "0" },
    { label: "Lengkap", value: completeCount },
    { label: "Belum Lengkap", value: Math.max(0, items.length - completeCount) },
    { label: "Status", value: items.length > 0 ? "Terverifikasi" : "Belum tersedia" },
  ];

  return (
    <ReportFrame withPrintArea={withPrintArea}>
      <CommonHeader context={data?.context} title="PAKET ADMINISTRASI GURU" subtitle="Daftar kelengkapan dokumen administrasi pembelajaran" />
      <DocumentSection title="Ringkasan Dokumen"><DocumentSummaryCards items={summary} /></DocumentSection>
      <DocumentSection title="Checklist Paket Administrasi">
        <DocumentTable
          headers={[[{ content: "No", style: { width: '24pt' } }, { content: "Kelompok", style: { width: '50pt' } }, { content: "Nama Dokumen" }, { content: "Sumber", style: { width: '50pt' } }, { content: "Status", style: { width: '50pt' } }, { content: "Keterangan", style: { width: '60pt' } }]]}
          rows={items.map((item, index) => [
            index + 1,
            item.group || "—",
            item.name,
            item.source === "official" ? "Dokumen Resmi" : item.source === "teacher" ? "Guru" : "Aplikasi",
            { content: <DocumentStatusBadge tone={statusTone(item.status)}>{statusText(item.status)}</DocumentStatusBadge>, align: "center" },
            item.note || "—",
          ])}
        />
      </DocumentSection>
      <CommonSignature context={data?.context} />
    </ReportFrame>
  );
}

export function OfficialDocumentArchiveReport({ data, withPrintArea = true }: ReportTemplateProps<OfficialDocumentArchiveData>) {
  return (
    <ReportFrame withPrintArea={withPrintArea}>
      <CommonHeader context={data?.context} title="ARSIP DOKUMEN RESMI" subtitle="Kalender pendidikan, CP resmi, ATP, dan prota resmi" />
      <DocumentTable
        headers={[[{ content: "No", style: { width: '24pt' } }, { content: "Nama Dokumen" }, { content: "Sumber", style: { width: '50pt' } }, { content: "Tahun", style: { width: '36pt' } }, { content: "Status", style: { width: '50pt' } }, { content: "Keterangan", style: { width: '60pt' } }]]}
        rows={(data?.items ?? []).map((item, index) => [
          item.no ?? index + 1,
          item.name,
          item.source || "—",
          item.year || data?.context?.academicYear || "—",
          item.status || "Tersimpan",
          item.note || "—",
        ])}
      />
      <CommonSignature context={data?.context} />
    </ReportFrame>
  );
}

export function EffectiveWeekDetailDocument({ data, withPrintArea = true }: ReportTemplateProps<EffectiveWeekDetailData>) {
  return (
    <ReportFrame withPrintArea={withPrintArea}>
      <CommonHeader context={data?.context} title="RINCIAN MINGGU EFEKTIF" subtitle="Berdasarkan kalender pendidikan dinas/sekolah yang diinput sebagai referensi" />
      <DocumentTable
        headers={[[{ content: "No", style: { width: '24pt' } }, { content: "Bulan", style: { width: '50pt' } }, { content: "Jumlah Minggu", style: { width: '36pt' } }, { content: "Minggu Tidak Efektif", style: { width: '36pt' } }, { content: "Minggu Efektif", style: { width: '36pt' } }, { content: "Kegiatan/Keterangan" }]]}
        rows={(data?.rows ?? []).map((row, index) => [
          index + 1,
          row.month,
          row.totalWeeks ?? "—",
          row.nonEffectiveWeeks ?? "—",
          row.effectiveWeeks ?? "—",
          row.activities || "—",
        ])}
      />
      <DocumentSection title="Rekapitulasi">
        <DocumentIdentityTable
          columns={1}
          rows={[
            { label: "Total Minggu Efektif", value: data?.totalEffectiveWeeks },
            { label: "Total Jam Efektif", value: data?.totalEffectiveHours },
            { label: "Catatan", value: data?.note || "Mengacu pada kalender pendidikan resmi." },
          ]}
        />
      </DocumentSection>
      <CommonSignature context={data?.context} />
    </ReportFrame>
  );
}

export function SemesterReportDocument({ data, withPrintArea = true }: ReportTemplateProps<SemesterReportData>) {
  const notes = data?.notes ?? [];
  return (
    <ReportFrame withPrintArea={withPrintArea}>
      <CommonHeader context={data?.context} title="LAPORAN AKHIR SEMESTER" subtitle="Rekapitulasi kegiatan pembelajaran, kehadiran, jurnal, dan nilai" />
      <DocumentSection title="Rekap Kehadiran"><DocumentTable headers={[["No", "Komponen", "Jumlah", "Keterangan"]]} rows={(data?.attendanceSummary ?? []).map((row, index) => [row.no ?? index + 1, row.component, row.total, row.note || "—"])} /></DocumentSection>
      <DocumentSection title="Rekap Jurnal Mengajar"><DocumentTable headers={[["No", "Komponen", "Jumlah", "Keterangan"]]} rows={(data?.journalSummary ?? []).map((row, index) => [row.no ?? index + 1, row.component, row.total, row.note || "—"])} /></DocumentSection>
      <DocumentSection title="Rekap Nilai"><DocumentTable headers={[["No", "Komponen", "Jumlah", "Keterangan"]]} rows={(data?.gradeSummary ?? []).map((row, index) => [row.no ?? index + 1, row.component, row.total, row.note || "—"])} /></DocumentSection>
      <DocumentSection title="Catatan Guru">
        {notes.length > 0 ? <ol className="document-ordered-list">{notes.map((note, index) => <li key={`${note}-${index}`}>{note}</li>)}</ol> : <p className="document-empty-text">Belum tersedia</p>}
      </DocumentSection>
      <CommonSignature context={data?.context} />
    </ReportFrame>
  );
}
