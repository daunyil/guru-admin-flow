/**
 * JournalReportTab — Rekap Jurnal Mengajar Guru
 *
 * Select assignment → load journals →
 * build JournalReportData → render via JournalReportDocument.
 */

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Card,
  CardHeader,
  Button,
  Select,
  EmptyState,
  PrintExportButtons,
} from "@shared/ui";
import { InfoCard } from "@shared/ui/ContextCard";
import { listJournals } from "@shared/db/journal-repo";
import {
  JournalReportDocument,
  type JournalReportData,
  type JournalReportRow,
} from "@shared/documents/ReportTemplates";
import { formatLongDateID } from "@guru-admin/shared";
import type {
  AcademicYear,
  TeacherProfile,
  SchoolProfile,
  TeachingAssignment,
  TeachingJournal,
} from "@guru-admin/domain";
import { makeDocContext } from "./report-center-utils";

/* ================================================================== */
/*  A4: Jurnal Guru                                                   */
/* ================================================================== */

export function JournalReportTab({
  year,
  teacher,
  school,
  assignments,
  semester,
}: {
  year: AcademicYear | null;
  teacher: TeacherProfile | undefined;
  school: SchoolProfile | undefined;
  assignments: TeachingAssignment[];
  semester: number;
}) {
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [journals, setJournals] = useState<TeachingJournal[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [showDocument, setShowDocument] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const selectedAssignment = assignments.find((a) => a.id === selectedAssignmentId);

  const loadData = useCallback(async () => {
    if (!year || !selectedAssignment) return;
    setLoadingData(true);
    setDataLoaded(false);
    setLoadError(null);
    try {
      const allJournals = await listJournals(year.id, selectedAssignment.semester);
      setJournals(allJournals);
      setDataLoaded(true);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Gagal memuat data jurnal.");
      console.error("[JournalReport] loadData error:", err);
    } finally {
      setLoadingData(false);
    }
  }, [year, selectedAssignment]);

  useEffect(() => {
    if (selectedAssignment) {
      void loadData();
    } else {
      setJournals([]);
      setDataLoaded(false);
    }
  }, [selectedAssignmentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const reportData = useMemo((): JournalReportData | null => {
    if (!selectedAssignment || !dataLoaded) return null;

    // Filter journals for this assignment
    const assignmentJournals = journals
      .filter(
        (j) =>
          j.classId === selectedAssignment.classId &&
          j.subject === selectedAssignment.subject &&
          j.teacherId === selectedAssignment.teacherId,
      )
      .sort((a, b) => a.date.localeCompare(b.date));

    const rows: JournalReportRow[] = assignmentJournals.map((j, index) => {
      const attendanceNote = [
        j.totalStudents && `H: ${j.presentCount}`,
        j.sickCount > 0 && `S: ${j.sickCount}`,
        j.excusedCount > 0 && `I: ${j.excusedCount}`,
        j.absentCount > 0 && `A: ${j.absentCount}`,
      ]
        .filter(Boolean)
        .join(", ");

      return {
        no: index + 1,
        date: j.date ? formatLongDateID(j.date) : "—",
        classLabel: j.classLabel,
        subject: j.subject,
        material: j.actualMaterialTitle || j.plannedMaterialTitle || "—",
        activity: j.realizationStatus === "done" ? "Terlaksana" : j.realizationStatus === "continued" ? "Dilanjutkan" : "Dibatalkan",
        attendanceNote,
        reflection: j.followUp || j.note || "—",
      };
    });

    return {
      context: makeDocContext(school, teacher, {
        academicYear: year?.label,
        semester: semester === 1 ? "Ganjil" : "Genap",
        subject: selectedAssignment.subject,
        classLabel: selectedAssignment.classLabel,
      }),
      rows,
    };
  }, [selectedAssignment, dataLoaded, journals, school, teacher, year, semester]);

  const hasData = reportData !== null && (reportData.rows?.length ?? 0) > 0;

  // Stats for summary
  const journalStats = useMemo(() => {
    if (!reportData?.rows) return { total: 0, done: 0, continued: 0 };
    const rows = reportData.rows;
    return {
      total: rows.length,
      done: rows.filter((r) => r.activity === "Terlaksana").length,
      continued: rows.filter((r) => r.activity === "Dilanjutkan").length,
    };
  }, [reportData]);

  return (
    <>
      {/* Filter */}
      <Card>
        <CardHeader
          title="Filter Jurnal Guru"
          description="Pilih Kelas dan Mapel untuk melihat rekap jurnal mengajar."
        />
        {assignments.length === 0 ? (
          <EmptyState
            title="Belum ada Kelas dan Mapel"
            description="Buka menu Kelas dan Mapel untuk membuat assignment dulu."
            action={
              <Button variant="secondary" onClick={() => (window.location.hash = "#/assignments")}>
                Buka Kelas dan Mapel
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            <Select
              label="Kelas dan Mapel"
              id="journal-asg"
              value={selectedAssignmentId}
              onChange={setSelectedAssignmentId}
              options={[
                { value: "", label: "-- Pilih --" },
                ...assignments.map((a) => ({
                  value: a.id,
                  label: `${a.classLabel} · ${a.subject}`,
                })),
              ]}
            />
            {selectedAssignment && !dataLoaded && (
              <Button onClick={() => void loadData()} disabled={loadingData}>
                {loadingData ? "Memuat..." : "Muat Data Jurnal"}
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Report */}
      {hasData && reportData && (
        <Card>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-900">Rekap Jurnal — {selectedAssignment?.classLabel} {selectedAssignment?.subject}</h3>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setShowDocument(!showDocument)}>
                {showDocument ? "Mode Ringkasan" : "Mode Dokumen"}
              </Button>
              <PrintExportButtons
                filename={`rekap-jurnal-${selectedAssignment?.classLabel}-${selectedAssignment?.subject}`}
                title="REKAP JURNAL MENGAJAR"
                schoolName={school?.name}
                targetId="print-journal-report"
              />
            </div>
          </div>

          {/* Summary */}
          {!showDocument && (
            <div className="mt-4">
              <InfoCard
                entries={[
                  { label: "Total Pertemuan", value: String(journalStats.total) },
                  { label: "Terlaksana", value: String(journalStats.done) },
                  { label: "Dilanjutkan", value: String(journalStats.continued) },
                  { label: "Kelas", value: selectedAssignment?.classLabel ?? "-" },
                ]}
              />
            </div>
          )}

          {/* Document */}
          <div
            className={showDocument ? "mt-4" : "mt-4 hidden print:block"}
            id="print-journal-report"
          >
            <JournalReportDocument data={reportData} withPrintArea={false} />
          </div>
        </Card>
      )}

      {dataLoaded && !hasData && !loadError && (
        <EmptyState
          title="Belum Ada Data Jurnal"
          description="Tidak ada jurnal untuk kelas dan mapel ini. Isi jurnal terlebih dahulu."
          action={
            <Button variant="secondary" onClick={() => (window.location.hash = "#/kbm-hub?step=jurnal")}>
              Buka Halaman Jurnal
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
