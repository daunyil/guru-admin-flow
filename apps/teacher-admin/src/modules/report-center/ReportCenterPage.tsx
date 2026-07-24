/**
 * Report Center — /report-center
 *
 * REPORT-CENTER-RC1: Pusat laporan guru.
 * 4 tab: Laporan Piket, Matrix Absensi, Daftar Nilai, Jurnal Guru.
 *
 * Orchestrator: page-level state, initial data load, tab navigation.
 * Tab content is delegated to separate components.
 */

import { useEffect, useState } from "react";
import { LoadingState } from "../../shared/ui";
import { getActiveAcademicYear, getTeacherProfile, getSchoolProfile } from "../../shared/db/profile-repo";
import { listAssignmentsByTeacher } from "../../shared/db/teaching-assignment-repo";
import { todayISODate } from "@guru-admin/shared";
import type {
  AcademicYear,
  TeacherProfile,
  SchoolProfile,
  TeachingAssignment,
} from "@guru-admin/domain";
import type { ReportTab } from "./report-center-types";
import { PiketReportTab } from "./PiketReportTab";
import { AttendanceMatrixTab } from "./AttendanceMatrixTab";
import { GradeReportTab } from "./GradeReportTab";
import { JournalReportTab } from "./JournalReportTab";

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
