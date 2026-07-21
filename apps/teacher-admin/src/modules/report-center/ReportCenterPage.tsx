/**
 * Report Center — /report-center
 *
 * REPORT-CENTER-RC1: Pusat laporan guru.
 * 4 tab: Laporan Piket, Matrix Absensi, Daftar Nilai, Jurnal Guru.
 *
 * Setiap tab:
 *   1. Filter (kelas, mapel, rentang tanggal)
 *   2. Load data dari IndexedDB
 *   3. Render dokumen pakai DocumentLayout + ReportTemplates
 *   4. Cetak / Download HTML via PrintExportButtons
 */

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Card,
  CardHeader,
  Button,
  Select,
  EmptyState,
  Badge,
  LoadingState,
  Input,
  PrintExportButtons,
} from "../../shared/ui";
import { InfoCard } from "../../shared/ui/ContextCard";
import { getActiveAcademicYear, getTeacherProfile, getSchoolProfile } from "../../shared/db/profile-repo";
import { listAssignmentsByTeacher } from "../../shared/db/teaching-assignment-repo";
import { listLessonSessions } from "../../shared/db/lesson-session-repo";
import { listJournals } from "../../shared/db/journal-repo";
import { findGradeBook } from "../../shared/db/gradebook-repo";
import { findClassRoster } from "../../shared/db/class-roster-repo";
import {
  listDutyRecordsByAcademicYear,
} from "../../shared/db/daily-duty-repo";
import { db } from "../../shared/db/schema";
import {
  AttendanceReportDocument,
  JournalReportDocument,
  GradeReportDocument,
  type AttendanceReportData,
  type AttendanceMeeting,
  type AttendanceStudentRow,
  type JournalReportData,
  type JournalReportRow,
  type GradeReportData,
  type GradeReportRow,
  type GradeKdColumn,
  type DocumentContext,
} from "../../shared/documents/ReportTemplates";
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
} from "../../shared/documents/DocumentLayout";
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
  TeachingAssignment,
  LessonSession,
  TeachingJournal,
  AttendanceRecord,
  GradeBook,
  ClassRoster,
  DutyRecord,
} from "@guru-admin/domain";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ReportTab = "piket" | "attendance" | "grades" | "journal";

interface DateRange {
  startDate: string;
  endDate: string;
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export function ReportCenterPage() {
  const [tab, setTab] = useState<ReportTab>("piket");
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [school, setSchool] = useState<SchoolProfile | undefined>();
  const [assignments, setAssignments] = useState<TeachingAssignment[]>([]);

  useEffect(() => {
    void (async () => {
      const [y, tp, sp] = await Promise.all([
        getActiveAcademicYear(),
        getTeacherProfile(),
        getSchoolProfile(),
      ]);
      setYear(y ?? null);
      setTeacher(tp);
      setSchool(sp);
      if (y && tp) {
        const todayISO = todayISODate();
        const sem: 1 | 2 =
          y.semester2Start <= todayISO && todayISO <= y.semester2End ? 2 : 1;
        setAssignments(await listAssignmentsByTeacher(tp.id, y.id, sem));
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <LoadingState />;

  const semester = year
    ? todayISODate() >= year.semester2Start && todayISODate() <= year.semester2End
      ? 2
      : 1
    : 1;

  const tabs: { key: ReportTab; label: string }[] = [
    { key: "piket", label: "Laporan Piket" },
    { key: "attendance", label: "Matrix Absensi" },
    { key: "grades", label: "Daftar Nilai" },
    { key: "journal", label: "Jurnal Guru" },
  ];

  return (
    <div className="space-y-4">
      <div className="page-header">
        <h1 className="text-2xl font-bold text-slate-900">Pusat Laporan</h1>
        <p className="text-sm text-slate-500 mt-1">
          {year ? `TP ${year.label} · Semester ${semester}` : "Belum ada tahun aktif"} — Cetak laporan administrasi guru.
        </p>
      </div>

      {/* Tab Navigation — WAI-ARIA tablist */}
      <div role="tablist" className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            aria-controls={`tabpanel-${t.key}`}
            id={`tab-${t.key}`}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "piket" && (
        <div role="tabpanel" id="tabpanel-piket" aria-labelledby="tab-piket">
          <PiketReportTab
            year={year}
            teacher={teacher}
            school={school}
            semester={semester}
          />
        </div>
      )}
      {tab === "attendance" && (
        <div role="tabpanel" id="tabpanel-attendance" aria-labelledby="tab-attendance">
          <AttendanceMatrixTab
            year={year}
            teacher={teacher}
            school={school}
            assignments={assignments}
            semester={semester}
          />
        </div>
      )}
      {tab === "grades" && (
        <div role="tabpanel" id="tabpanel-grades" aria-labelledby="tab-grades">
          <GradeReportTab
            year={year}
            teacher={teacher}
            school={school}
            assignments={assignments}
            semester={semester}
          />
        </div>
      )}
      {tab === "journal" && (
        <div role="tabpanel" id="tabpanel-journal" aria-labelledby="tab-journal">
          <JournalReportTab
            year={year}
            teacher={teacher}
            school={school}
            assignments={assignments}
            semester={semester}
          />
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Shared: makeDocumentContext                                        */
/* ================================================================== */

function makeDocContext(
  school?: SchoolProfile,
  teacher?: TeacherProfile,
  extra?: Partial<DocumentContext>,
): DocumentContext {
  return {
    schoolName: school?.name,
    schoolAddress: [school?.village, school?.district, school?.regency].filter(Boolean).join(", "),
    institutionName: school?.name,
    headmasterName: school?.headmasterName,
    headmasterNip: school?.headmasterNip,
    teacherName: teacher?.name,
    teacherNip: teacher?.nip,
    place: school?.regency,
    dateLabel: formatLongDateID(todayISODate()),
    ...extra,
  };
}

/* ================================================================== */
/*  A1: Laporan Piket                                                 */
/* ================================================================== */

function PiketReportTab({
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
                          <Badge
                            variant={
                              getDutyStatusVariant(item.totalPoints) === "success"
                                ? "success"
                                : getDutyStatusVariant(item.totalPoints) === "warning"
                                ? "warning"
                                : "error"
                            }
                          >
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

/* ================================================================== */
/*  A2: Matrix Absensi                                                */
/* ================================================================== */

function AttendanceMatrixTab({
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

/* ================================================================== */
/*  A3: Daftar Nilai                                                  */
/* ================================================================== */

function GradeReportTab({
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

/* ================================================================== */
/*  A4: Jurnal Guru                                                   */
/* ================================================================== */

function JournalReportTab({
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
            <Button variant="secondary" onClick={() => (window.location.hash = "#/journal")}>
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
