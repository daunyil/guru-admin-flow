/**
 * AttendanceMatrixTab — Matrix Absensi Siswa
 *
 * Select assignment → load sessions, attendance, roster →
 * build AttendanceReportData → render via AttendanceReportDocument.
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
import { listLessonSessions } from "@shared/db/lesson-session-repo";
import { findClassRoster } from "@shared/db/class-roster-repo";
import { db } from "@shared/db/schema";
import {
  AttendanceReportDocument,
  type AttendanceReportData,
  type AttendanceMeeting,
  type AttendanceStudentRow,
} from "@shared/documents/ReportTemplates";
import type {
  AcademicYear,
  TeacherProfile,
  SchoolProfile,
  TeachingAssignment,
  LessonSession,
  AttendanceRecord,
  ClassRoster,
} from "@guru-admin/domain";
import { makeDocContext } from "./report-center-utils";

/* ================================================================== */
/*  A2: Matrix Absensi                                                */
/* ================================================================== */

export function AttendanceMatrixTab({
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
  const [sessions, setSessions] = useState<LessonSession[]>([]);
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const [roster, setRoster] = useState<ClassRoster | undefined>();
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
      const [sess, att, ros] = await Promise.all([
        listLessonSessions(year.id, selectedAssignment.semester),
        db.attendanceRecords
          .where("classId")
          .equals(selectedAssignment.classId)
          .toArray(),
        findClassRoster(year.id, selectedAssignment.classId),
      ]);
      setSessions(sess);
      setAllAttendance(att);
      setRoster(ros ?? undefined);
      setDataLoaded(true);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Gagal memuat data absensi.");
      console.error("[AttendanceMatrix] loadData error:", err);
    } finally {
      setLoadingData(false);
    }
  }, [year, selectedAssignment]);

  // Auto-load when assignment changes
  useEffect(() => {
    if (selectedAssignment) {
      void loadData();
    } else {
      setSessions([]);
      setAllAttendance([]);
      setRoster(undefined);
      setDataLoaded(false);
    }
  }, [selectedAssignmentId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build report data
  const reportData = useMemo((): AttendanceReportData | null => {
    if (!selectedAssignment || !dataLoaded) return null;

    // Filter sessions for this assignment
    const assignmentSessions = sessions
      .filter(
        (s) =>
          s.classId === selectedAssignment.classId &&
          s.subject === selectedAssignment.subject &&
          s.teacherId === selectedAssignment.teacherId,
      )
      .sort((a, b) => a.date.localeCompare(b.date) || a.startPeriod - b.startPeriod);

    // Build meeting columns
    const meetings: AttendanceMeeting[] = assignmentSessions.map((s, i) => ({
      label: String(i + 1),
      date: s.date,
    }));

    // SA-11: Pre-group attendance by sessionId for O(1) lookup instead of O(n) linear search
    const attendanceBySession = new Map<string, Map<string, AttendanceRecord>>();
    for (const att of allAttendance) {
      if (att.deletedAt) continue;
      let inner = attendanceBySession.get(att.sessionId);
      if (!inner) {
        inner = new Map();
        attendanceBySession.set(att.sessionId, inner);
      }
      inner.set(att.studentId, att);
    }

    // Build student rows from roster
    const students = (roster?.students ?? []).map(
      (student, studentIndex): AttendanceStudentRow => {
        const statuses: string[] = [];
        let sick = 0;
        let excused = 0;
        let absent = 0;

        for (const session of assignmentSessions) {
          const record = attendanceBySession.get(session.id)?.get(student.id);
          let code = "";
          if (record) {
            switch (record.status) {
              case "present":
                code = "H";
                break;
              case "sick":
                code = "S";
                sick++;
                break;
              case "excused":
                code = "I";
                excused++;
                break;
              case "absent":
                code = "A";
                absent++;
                break;
              case "late":
                code = "H"; // late = hadir per product decision
                break;
            }
          }
          statuses.push(code);
        }

        return {
          no: studentIndex + 1,
          nis: student.nis,
          name: student.name,
          statuses,
          summary: { sick, excused, absent },
        };
      },
    );

    return {
      context: makeDocContext(school, teacher, {
        academicYear: year?.label,
        semester: semester === 1 ? "Ganjil" : "Genap",
        subject: selectedAssignment.subject,
        classLabel: selectedAssignment.classLabel,
      }),
      meetings,
      students,
    };
  }, [selectedAssignment, dataLoaded, sessions, allAttendance, roster, school, teacher, year, semester]);

  const hasData = reportData !== null && (reportData.students?.length ?? 0) > 0;

  return (
    <>
      {/* Filter */}
      <Card>
        <CardHeader
          title="Filter Matrix Absensi"
          description="Pilih Kelas dan Mapel untuk melihat matrix kehadiran siswa."
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
              id="attendance-asg"
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
            {selectedAssignment && (
              <InfoCard
                entries={[
                  { label: "Kelas", value: selectedAssignment.classLabel },
                  { label: "Mapel", value: selectedAssignment.subject },
                  { label: "Semester", value: String(selectedAssignment.semester) },
                ]}
              />
            )}
            {selectedAssignment && !dataLoaded && (
              <Button onClick={() => void loadData()} disabled={loadingData}>
                {loadingData ? "Memuat..." : "Muat Data Absensi"}
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Report */}
      {hasData && reportData && (
        <Card>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-900">Matrix Absensi — {selectedAssignment?.classLabel} {selectedAssignment?.subject}</h3>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setShowDocument(!showDocument)}>
                {showDocument ? "Mode Ringkasan" : "Mode Dokumen"}
              </Button>
              <PrintExportButtons
                filename={`matrix-absensi-${selectedAssignment?.classLabel}-${selectedAssignment?.subject}`}
                title="MATRIX ABSENSI SISWA"
                schoolName={school?.name}
                orientation="landscape"
                targetId="print-attendance-matrix"
              />
            </div>
          </div>

          {/* Summary */}
          {!showDocument && (
            <div className="mt-4">
              <InfoCard
                entries={[
                  { label: "Jumlah Pertemuan", value: String(reportData.meetings?.length ?? 0) },
                  { label: "Jumlah Siswa", value: String(reportData.students?.length ?? 0) },
                  { label: "Kelas", value: selectedAssignment?.classLabel ?? "-" },
                  { label: "Mapel", value: selectedAssignment?.subject ?? "-" },
                ]}
              />
            </div>
          )}

          {/* Document */}
          <div
            className={showDocument ? "mt-4" : "mt-4 hidden print:block"}
            id="print-attendance-matrix"
          >
            <AttendanceReportDocument data={reportData} withPrintArea={false} />
          </div>
        </Card>
      )}

      {dataLoaded && !hasData && (
        <EmptyState
          title="Belum Ada Data Absensi"
          description="Tidak ada data siswa atau pertemuan untuk kelas dan mapel ini. Pastikan daftar siswa sudah diisi dan sesi mengajar sudah ada."
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
