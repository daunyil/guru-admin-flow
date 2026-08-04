/**
 * PiketReportTab — Laporan Piket Guru
 *
 * Filter by date range, load duty records, render summary & student ledger,
 * print/export via DocumentLayout.
 */

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Card,
  CardHeader,
  Button,
  EmptyState,
  Badge,
  Input,
  PrintExportButtons,
} from "@shared/ui";
import { InfoCard } from "@shared/ui/ContextCard";
import {
  listDutyRecordsByAcademicYear,
} from "@shared/db/daily-duty-repo";
import {
  DocumentPage,
  DocumentHeader,
  DocumentTitle,
  DocumentIdentityTable,
  DocumentSection,
  DocumentTable,
  DocumentSignature,
  DocumentSummaryCards,
  type DocumentSummaryCard,
} from "@shared/documents/DocumentLayout";
import {
  summarizeDutyRecords,
  buildStudentDutyLedger,
  getStudentDutyStatus,
  getDutyStatusVariant,
} from "@guru-admin/domain";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";
import type {
  AcademicYear,
  TeacherProfile,
  SchoolProfile,
  DutyRecord,
} from "@guru-admin/domain";
import { makeDocContext } from "./report-center-utils";
import type { DateRange } from "./report-center-types";

/* ================================================================== */
/*  A1: Laporan Piket                                                 */
/* ================================================================== */

export function PiketReportTab({
  year,
  teacher,
  school,
  semester,
}: {
  year: AcademicYear | null;
  teacher: TeacherProfile | undefined;
  school: SchoolProfile | undefined;
  semester: number;
}) {
  const [records, setRecords] = useState<DutyRecord[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const today = todayISODate();
    const start = today.substring(0, 8) + "01"; // first of month
    return { startDate: start, endDate: today };
  });
  const [loadingData, setLoadingData] = useState(false);
  const [showDocument, setShowDocument] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!year) return;
    setLoadingData(true);
    setLoadError(null);
    try {
      const [recs] = await Promise.all([
        listDutyRecordsByAcademicYear(year.id),
      ]);
      setRecords(recs);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Gagal memuat data piket.");
      console.error("[PiketReport] loadData error:", err);
    } finally {
      setLoadingData(false);
    }
  }, [year]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (!r.date) return false;
      if (r.date < dateRange.startDate) return false;
      if (r.date > dateRange.endDate) return false;
      return true;
    });
  }, [records, dateRange]);

  const summary = useMemo(() => summarizeDutyRecords(filteredRecords), [filteredRecords]);

  const studentLedger = useMemo(() => buildStudentDutyLedger(filteredRecords), [filteredRecords]);

  const hasData = filteredRecords.length > 0;

  const context = makeDocContext(school, teacher, {
    academicYear: year?.label,
    semester: semester === 1 ? "Ganjil" : "Genap",
  });

  // Group records by date for the daily detail table
  const recordsByDate = useMemo(() => {
    const map = new Map<string, DutyRecord[]>();
    for (const r of filteredRecords) {
      const date = r.date || "unknown";
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(r);
    }
    // Sort by date desc
    return new Map([...map.entries()].sort((a, b) => b[0].localeCompare(a[0])));
  }, [filteredRecords]);

  const summaryCards: DocumentSummaryCard[] = [
    { label: "Total Pelanggaran", value: summary.totalRecords },
    { label: "Total Poin", value: summary.totalPoints },
    { label: "Kedisiplinan", value: summary.byCategory.discipline },
    { label: "Kehadiran", value: summary.byCategory.attendance },
  ];

  return (
    <>
      {/* Filter */}
      <Card>
        <CardHeader
          title="Filter Laporan Piket"
          description="Pilih rentang tanggal untuk laporan pelanggaran piket."
        />
        <div className="flex flex-wrap gap-3 items-end">
          <Input
            label="Tanggal Mulai"
            id="piket-start"
            type="date"
            value={dateRange.startDate}
            onChange={(v) => setDateRange((d) => ({ ...d, startDate: v }))}
          />
          <Input
            label="Tanggal Selesai"
            id="piket-end"
            type="date"
            value={dateRange.endDate}
            onChange={(v) => setDateRange((d) => ({ ...d, endDate: v }))}
          />
          <Button onClick={() => void loadData()} disabled={loadingData}>
            {loadingData ? "Memuat..." : "Muat Ulang"}
          </Button>
        </div>
        {hasData && (
          <div className="mt-3">
            <InfoCard
              entries={[
                { label: "Rentang", value: `${formatLongDateID(dateRange.startDate)} — ${formatLongDateID(dateRange.endDate)}` },
                { label: "Total Pelanggaran", value: String(summary.totalRecords) },
                { label: "Total Poin", value: String(summary.totalPoints) },
                { label: "Siswa Terlibat", value: String(studentLedger.length) },
              ]}
            />
          </div>
        )}
      </Card>

      {/* Preview / Cetak */}
      {hasData && (
        <Card>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-900">Laporan Piket</h3>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setShowDocument(!showDocument)}>
                {showDocument ? "Mode Ringkasan" : "Mode Dokumen"}
              </Button>
              <PrintExportButtons
                filename={`laporan-piket-${dateRange.startDate}-${dateRange.endDate}`}
                title="LAPORAN PIKET GURU"
                schoolName={school?.name}
                targetId="print-piket-report"
              />
            </div>
          </div>

          {/* Summary mode */}
          {!showDocument && (
            <div className="mt-4 space-y-3">
              {/* Student ledger table */}
              <h4 className="font-medium text-sm text-slate-700">Rekap Poin Siswa</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="py-2 px-3 text-left font-medium text-slate-600">No</th>
                      <th className="py-2 px-3 text-left font-medium text-slate-600">Nama</th>
                      <th className="py-2 px-3 text-left font-medium text-slate-600">Kelas</th>
                      <th className="py-2 px-3 text-center font-medium text-slate-600">Pelanggaran</th>
                      <th className="py-2 px-3 text-center font-medium text-slate-600">Poin</th>
                      <th className="py-2 px-3 text-left font-medium text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentLedger.map((item, i) => (
                      <tr key={`${item.studentId}-${item.classId}`} className="border-b border-slate-100">
                        <td className="py-2 px-3">{i + 1}</td>
                        <td className="py-2 px-3">{item.studentName}</td>
                        <td className="py-2 px-3">{item.classLabel}</td>
                        <td className="py-2 px-3 text-center">{item.totalRecords}</td>
                        <td className="py-2 px-3 text-center">{item.totalPoints}</td>
                        <td className="py-2 px-3">
                          <Badge variant={getDutyStatusVariant(item.totalPoints)}>
                            {getStudentDutyStatus(item.totalPoints)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Document mode */}
          <div
            className={showDocument ? "mt-4" : "mt-4 hidden print:block"}
            id="print-piket-report"
          >
            <DocumentPage orientation="portrait">
              <DocumentHeader
                schoolName={context.schoolName}
                schoolAddress={context.schoolAddress}
                institutionName={context.institutionName}
              />
              <DocumentTitle title="LAPORAN PIKET GURU" subtitle={`Periode ${formatLongDateID(dateRange.startDate)} — ${formatLongDateID(dateRange.endDate)}`} />
              <DocumentIdentityTable
                rows={[
                  { label: "Nama Sekolah", value: context.schoolName },
                  { label: "Tahun Pelajaran", value: context.academicYear },
                  { label: "Semester", value: context.semester },
                  { label: "Guru Piket", value: context.teacherName },
                ]}
              />

              <DocumentSection title="Ringkasan">
                <DocumentSummaryCards items={summaryCards} />
              </DocumentSection>

              <DocumentSection title="A. Rekap Poin Siswa">
                <DocumentTable
                  headers={[["No", "Nama Siswa", "Kelas", "Jumlah Pelanggaran", "Total Poin", "Status Pembinaan"]]}
                  rows={studentLedger.map((item, i) => [
                    i + 1,
                    item.studentName,
                    item.classLabel,
                    item.totalRecords,
                    item.totalPoints,
                    getStudentDutyStatus(item.totalPoints),
                  ])}
                  emptyText="Tidak ada catatan pelanggaran pada periode ini."
                />
              </DocumentSection>

              <DocumentSection title="B. Detail Pelanggaran Per Tanggal">
                {[...recordsByDate.entries()].map(([date, dateRecords]) => (
                  <DocumentSection key={date} title={formatLongDateID(date)}>
                    <DocumentTable
                      compact
                      headers={[["No", "Nama Siswa", "Kelas", "Pelanggaran", "Poin", "Keterangan"]]}
                      rows={dateRecords.map((r, i) => [
                        i + 1,
                        r.studentName,
                        r.classLabel,
                        r.ruleLabel,
                        r.points,
                        r.note || "—",
                      ])}
                    />
                  </DocumentSection>
                ))}
              </DocumentSection>

              <DocumentSignature
                left={{
                  role: "Mengetahui,\nKepala Sekolah",
                  name: context.headmasterName,
                  nip: context.headmasterNip,
                }}
                right={{
                  role: "Guru Piket",
                  name: context.teacherName,
                  nip: context.teacherNip,
                  placeDate: context.place
                    ? `${context.place}, ${context.dateLabel}`
                    : undefined,
                }}
              />
            </DocumentPage>
          </div>
        </Card>
      )}

      {!hasData && !loadingData && !loadError && (
        <EmptyState
          title="Belum Ada Data Piket"
          description="Tidak ada catatan pelanggaran pada rentang tanggal ini. Ubah filter atau buat laporan piket terlebih dahulu."
          action={
            <Button variant="secondary" onClick={() => (window.location.hash = "#/piket")}>
              Buka Halaman Piket
            </Button>
          }
        />
      )}

      {loadError && (
        <Card>
          <div className="p-4 text-center space-y-2">
            <p className="text-red-600 font-medium">Gagal Memuat Data</p>
            <p className="text-sm text-slate-500">{loadError}</p>
            <Button variant="secondary" onClick={() => void loadData()}>Coba Lagi</Button>
          </div>
        </Card>
      )}
    </>
  );
}
