/**
 * GradeReportTab — Daftar Nilai Siswa
 *
 * Select assignment → load grade book & roster →
 * build GradeReportData → render via GradeReportDocument.
 */

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Card,
  CardHeader,
  Button,
  Select,
  EmptyState,
  PrintExportButtons,
} from "../../shared/ui";
import { InfoCard } from "../../shared/ui/ContextCard";
import { findGradeBook } from "../../shared/db/gradebook-repo";
import { findClassRoster } from "../../shared/db/class-roster-repo";
import {
  GradeReportDocument,
  type GradeReportData,
  type GradeReportRow,
  type GradeKdColumn,
} from "../../shared/documents/ReportTemplates";
import type {
  AcademicYear,
  TeacherProfile,
  SchoolProfile,
  TeachingAssignment,
  GradeBook,
  ClassRoster,
} from "@guru-admin/domain";
import { makeDocContext } from "./report-center-utils";

/* ================================================================== */
/*  A3: Daftar Nilai                                                  */
/* ================================================================== */

export function GradeReportTab({
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
  const [gradeBook, setGradeBook] = useState<GradeBook | undefined>();
  const [roster, setRoster] = useState<ClassRoster | undefined>();
  const [loadingData, setLoadingData] = useState(false);
  const [showDocument, setShowDocument] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const selectedAssignment = assignments.find((a) => a.id === selectedAssignmentId);

  const loadData = useCallback(async () => {
    if (!year || !teacher || !selectedAssignment) return;
    setLoadingData(true);
    setDataLoaded(false);
    setLoadError(null);
    try {
      const [gb, ros] = await Promise.all([
        findGradeBook({
          academicYearId: year.id,
          teacherId: teacher.id,
          classId: selectedAssignment.classId,
          semester: selectedAssignment.semester,
          subject: selectedAssignment.subject,
        }),
        findClassRoster(year.id, selectedAssignment.classId),
      ]);
      setGradeBook(gb ?? undefined);
      setRoster(ros ?? undefined);
      setDataLoaded(true);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Gagal memuat data nilai.");
      console.error("[GradeReport] loadData error:", err);
    } finally {
      setLoadingData(false);
    }
  }, [year, teacher, selectedAssignment]);

  useEffect(() => {
    if (selectedAssignment) {
      void loadData();
    } else {
      setGradeBook(undefined);
      setRoster(undefined);
      setDataLoaded(false);
    }
  }, [selectedAssignmentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const reportData = useMemo((): GradeReportData | null => {
    if (!selectedAssignment || !dataLoaded) return null;

    const entries = gradeBook?.entries ?? [];
    const kdColumns: GradeKdColumn[] = [
      { id: "kd1", label: "KD 1" },
      { id: "kd2", label: "KD 2" },
      { id: "kd3", label: "KD 3" },
      { id: "kd4", label: "KD 4" },
      { id: "kd5", label: "KD 5" },
      { id: "kd6", label: "KD 6" },
    ];

    // Merge roster info (NIS) into grade entries
    const rosterMap = new Map((roster?.students ?? []).map((s) => [s.id, s]));

    const rows: GradeReportRow[] = entries.map((entry, index) => {
      const student = rosterMap.get(entry.studentId);
      // Determine predicate from final score
      const score = entry.finalScore;
      let predicate = "—";
      if (score != null) {
        if (score >= 90) predicate = "A";
        else if (score >= 80) predicate = "B";
        else if (score >= 70) predicate = "C";
        else predicate = "D";
      }

      return {
        no: index + 1,
        nis: student?.nis || entry.studentNumber?.toString() || "—",
        name: entry.studentName,
        // SA-01: Preserve null semantics — null means "explicitly empty", not "not applicable"
        kdScores: {
          kd1: entry.kd1,
          kd2: entry.kd2,
          kd3: entry.kd3,
          kd4: entry.kd4,
          kd5: entry.kd5,
          kd6: entry.kd6,
        },
        ptsScore: entry.pts,
        pasScore: entry.pas,
        finalScore: entry.finalScore,
        predicate,
        note: entry.status === "remedial" ? "Remedial" : entry.status === "incomplete" ? "Belum Lengkap" : undefined,
      };
    });

    return {
      context: makeDocContext(school, teacher, {
        academicYear: year?.label,
        semester: semester === 1 ? "Ganjil" : "Genap",
        subject: selectedAssignment.subject,
        classLabel: selectedAssignment.classLabel,
      }),
      kktp: gradeBook?.passingScore,
      kdColumns,
      rows,
    };
  }, [selectedAssignment, dataLoaded, gradeBook, roster, school, teacher, year, semester]);

  const hasData = reportData !== null && (reportData.rows?.length ?? 0) > 0;

  return (
    <>
      {/* Filter */}
      <Card>
        <CardHeader
          title="Filter Daftar Nilai"
          description="Pilih Kelas dan Mapel untuk melihat daftar nilai siswa."
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
              id="grade-asg"
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
                {loadingData ? "Memuat..." : "Muat Data Nilai"}
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Report */}
      {hasData && reportData && (
        <Card>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-900">Daftar Nilai — {selectedAssignment?.classLabel} {selectedAssignment?.subject}</h3>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setShowDocument(!showDocument)}>
                {showDocument ? "Mode Ringkasan" : "Mode Dokumen"}
              </Button>
              <PrintExportButtons
                filename={`daftar-nilai-${selectedAssignment?.classLabel}-${selectedAssignment?.subject}`}
                title="DAFTAR NILAI"
                schoolName={school?.name}
                orientation="landscape"
                targetId="print-grade-report"
              />
            </div>
          </div>

          {/* Summary */}
          {!showDocument && (
            <div className="mt-4">
              <InfoCard
                entries={[
                  { label: "Jumlah Siswa", value: String(reportData.rows?.length ?? 0) },
                  { label: "KKTP/KKM", value: String(reportData.kktp ?? "-") },
                  { label: "Kelas", value: selectedAssignment?.classLabel ?? "-" },
                  { label: "Mapel", value: selectedAssignment?.subject ?? "-" },
                ]}
              />
            </div>
          )}

          {/* Document */}
          <div
            className={showDocument ? "mt-4" : "mt-4 hidden print:block"}
            id="print-grade-report"
          >
            <GradeReportDocument data={reportData} withPrintArea={false} />
          </div>
        </Card>
      )}

      {dataLoaded && !hasData && !loadError && (
        <EmptyState
          title="Belum Ada Data Nilai"
          description="Tidak ada data nilai untuk kelas dan mapel ini. Isi nilai terlebih dahulu di halaman Nilai."
          action={
            <Button variant="secondary" onClick={() => (window.location.hash = "#/grades")}>
              Buka Halaman Nilai
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
