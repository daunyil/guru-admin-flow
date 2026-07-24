/**
 * PromesPortraitDocument — Format Vertikal (portrait)
 * Daftar minggu per baris, format ringkas dan mudah dibaca.
 *
 * REWRITE: Cleaner logic using helper functions instead of inline conditionals.
 * Premium UI: consistent identity table, clean section titles, professional print output.
 */

import React from "react";
import {
  DocumentPage,
  DocumentTitle,
  DocumentSection,
  DocumentTable,
  DocumentIdentityTable,
  DocumentSignature,
  type DocumentCell,
  type DocumentCellObject,
} from "../../shared/documents";
import type { PromesWeek, UnitDistribution, KORow, PromesSummary, ProtaProfile } from "@guru-admin/domain";
import { promesCalendarKindLabel } from "@guru-admin/domain";
import { isPureCadanganWeek } from "./promes-helpers";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";

export interface PromesPortraitDocumentProps {
  weeks: PromesWeek[];
  distribution: UnitDistribution[];
  koRows: KORow[];
  summary: PromesSummary;
  status: "valid" | "needs_fix";
  semester: 1 | 2;
  activeYearLabel: string;
  schoolName: string;
  schoolRegency: string;
  headmasterName: string;
  teacherName: string;
  profile: ProtaProfile | null;
}

/* ---- Helper: determine what to show in the Materi column ---- */
function resolvePortraitMateriCell(week: PromesWeek, calLabel: string): React.ReactNode {
  if (week.assignedUnits.length > 0) {
    return (
      <span>
        {week.assignedUnits.map((u, i) => (
          <span key={i}>
            {i > 0 && "; "}{u.title} ({u.jp} JP)
          </span>
        ))}
      </span>
    );
  }
  if (calLabel) {
    return <strong>{calLabel}</strong>;
  }
  if (week.reservedForCadangan > 0) {
    return <em>(Cadangan — lihat catatan di bawah)</em>;
  }
  if (week.isEffective) {
    return "(Kosong)";
  }
  return week.blockReason ?? "(Libur)";
}

/* ---- Helper: determine what to show in the Keterangan column ---- */
function resolvePortraitKeterangan(week: PromesWeek, calLabel: string): string {
  if (calLabel) return calLabel;
  if (week.reservedForCadangan > 0 && week.assignedUnits.length === 0) return "Cadangan";
  if (!week.isEffective) return "Libur";
  return "";
}

export function PromesPortraitDocument({
  weeks, distribution, koRows, summary, status, semester, activeYearLabel,
  schoolName, schoolRegency, headmasterName, teacherName, profile,
}: PromesPortraitDocumentProps) {

  /* ---- Identity rows (2-column layout) ---- */
  const identityRows = [
    { label: "Satuan Pendidikan", value: schoolName },
    { label: "Kelas / Fase", value: `${profile?.grade ?? "-"} / ${profile?.phase ?? "-"}` },
    { label: "Mata Pelajaran", value: profile?.subject ?? "-" },
    { label: "Semester", value: semester === 1 ? "Ganjil" : "Genap" },
    { label: "Tahun Pelajaran", value: activeYearLabel },
    { label: "Alokasi Waktu", value: `${summary.effectiveWeeks > 0 ? Math.round(summary.intraCapacityJP / summary.effectiveWeeks) : 0} Jam/Minggu` },
    { label: "Total Minggu", value: `${summary.totalWeeks} minggu` },
    { label: "Minggu Efektif", value: `${summary.effectiveWeeks} minggu` },
    { label: "Kapasitas Intrakurikuler", value: `${summary.intraCapacityJP} JP` },
    { label: "Cadangan", value: `${summary.cadanganJP} JP` },
    { label: "Kokurikuler", value: `${summary.koTotalJP} JP` },
    { label: "Total", value: `${summary.intraCapacityJP + summary.cadanganJP + summary.koTotalJP} JP` },
  ];

  /* ---- Week distribution table headers ---- */
  const distHeaders: DocumentCell[][] = [
    [
      { content: "Mg", style: { width: '5%' }, align: 'center' },
      { content: "Tanggal", style: { width: '12%' }, align: 'left' },
      { content: "Intra JP", style: { width: '8%' }, align: 'center' },
      { content: "KO JP", style: { width: '8%' }, align: 'center' },
      { content: "Materi / Kegiatan", align: 'left' },
      { content: "Keterangan", style: { width: '10%' }, align: 'left' },
    ],
  ];

  /* ---- Week distribution data rows ---- */
  const visibleWeeks = weeks.filter((w) => !isPureCadanganWeek(w));

  const distRows: DocumentCell[][] = visibleWeeks.map((w): DocumentCell[] => {
    const dateStr = formatLongDateID(w.startDate).split(",")[1]?.trim() ?? w.startDate;
    const calLabel = w.calendarKind ? promesCalendarKindLabel(w.calendarKind) || w.blockReason || "" : "";

    return [
      { content: w.weekNumber, align: 'center' } as DocumentCellObject,
      { content: dateStr, align: 'left' } as DocumentCellObject,
      { content: w.isEffective ? w.intraCapacityJP : "-", align: 'center' } as DocumentCellObject,
      { content: w.isEffective ? w.koJP : "-", align: 'center' } as DocumentCellObject,
      { content: resolvePortraitMateriCell(w, calLabel), align: 'left' } as DocumentCellObject,
      { content: resolvePortraitKeterangan(w, calLabel), align: 'left' } as DocumentCellObject,
    ];
  });

  /* ---- Footer: summary totals ---- */
  const distFooter: DocumentCell[][] = [
    [
      { content: "JUMLAH", colSpan: 2, align: 'center' },
      { content: `${summary.intraCapacityJP} JP`, align: 'center' },
      { content: `${summary.koTotalJP} JP`, align: 'center' },
      { content: `Materi: ${summary.distributedJP} JP`, align: 'left' },
      { content: `${summary.effectiveWeeks} mg efektif`, align: 'center' },
    ],
  ];

  /* ---- Rekap materi table ---- */
  const rekapHeaders: DocumentCell[][] = [
    [
      { content: "No", style: { width: '5%' }, align: 'center' },
      { content: "Materi / TP", align: 'left' },
      { content: "JP", style: { width: '8%' }, align: 'center' },
      { content: "Status", style: { width: '15%' }, align: 'center' },
    ],
  ];

  const rekapRows: DocumentCell[][] = distribution.map((d, i) => [
    { content: i + 1, align: 'center' },
    { content: d.title, align: 'left' },
    { content: d.totalJP, align: 'center' },
    { content: d.status === "fully_distributed" ? "Terdistribusi" : d.status === "partially_distributed" ? "Sebagian" : "Belum", align: 'center' },
  ]);

  return (
    <DocumentPage orientation="portrait">
      <DocumentTitle
        title={`PROGRAM SEMESTER ${semester === 1 ? "GANJIL" : "GENAP"}`}
        subtitle={`Tahun Pelajaran ${activeYearLabel}`}
      />

      <DocumentIdentityTable rows={identityRows} columns={2} />

      <DocumentSection title="DISTRIBUSI MATERI PER MINGGU">
        <DocumentTable headers={distHeaders} rows={distRows} footer={distFooter} />
      </DocumentSection>

      {summary.cadanganJP > 0 && (
        <div className="document-paragraph">
          <strong>Cadangan Akhir Semester: {summary.cadanganJP} JP</strong> — Digunakan untuk kegiatan pembelajaran, penilaian, dan penyesuaian sesuai kebutuhan.
        </div>
      )}

      <DocumentSection title="REKAP MATERI">
        <DocumentTable headers={rekapHeaders} rows={rekapRows} />
      </DocumentSection>

      {koRows.length > 0 && (
        <p className="document-paragraph">
          <b>Kokurikuler:</b> {koRows.length} × {koRows[0]?.jp ?? 0} JP = {summary.koTotalJP} JP.
        </p>
      )}

      {summary.cadanganJP > 0 && (
        <p className="document-paragraph">
          <b>Cadangan Akhir Semester:</b> {summary.cadanganJP} JP.
        </p>
      )}

      {status !== "valid" && (
        <p className="document-paragraph" style={{ color: "#a00" }}>
          Promes belum lengkap: {summary.undistributedJP} JP materi belum terdistribusi.
        </p>
      )}

      <DocumentSignature
        left={{ role: "Mengetahui,\nKepala Sekolah", name: headmasterName }}
        right={{ role: "Guru Mata Pelajaran", name: teacherName, placeDate: `${schoolRegency || "..........."}, ${formatLongDateID(todayISODate())}` }}
      />
    </DocumentPage>
  );
}
