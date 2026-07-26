/**
 * useRekapSemesterState — loads year, teacher, school, assignments
 * and manages tab/month state for RekapSemesterPage.
 *
 * DOMAIN-BOUNDARY: Module 1-harian, imports from @shared/db/ and @guru-admin/domain only.
 */

import { useEffect, useState, useMemo } from "react";
import type { AcademicYear, TeacherProfile, SchoolProfile, TeachingAssignment, ClassRoster } from "@guru-admin/domain";
import { getActiveAcademicYear, getSchoolProfile, getTeacherProfile } from "@shared/db/profile-repo";
import { listAssignmentsByTeacher } from "@shared/db/teaching-assignment-repo";
import { listClassRosters } from "@shared/db/class-roster-repo";
import { todayISODate } from "@guru-admin/shared";
import type { RekapContext } from "./hooks/useSemesterAggregator";

export type RekapTab = "absensi" | "nilai";

export function useRekapSemesterState() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [school, setSchool] = useState<SchoolProfile | undefined>();
  const [assignments, setAssignments] = useState<TeachingAssignment[]>([]);
  const [rosters, setRosters] = useState<ClassRoster[]>([]);

  // User selections
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [semester, setSemester] = useState<1 | 2>(1);
  const [tab, setTab] = useState<RekapTab>("absensi");
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0);

  // Load data on mount
  useEffect(() => {
    void (async () => {
      try {
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
          const defaultSemester: 1 | 2 =
            y.semester2Start <= todayISO && todayISO <= y.semester2End ? 2 : 1;
          setSemester(defaultSemester);

          const asgList = await listAssignmentsByTeacher(tp.id, y.id, defaultSemester);
          setAssignments(asgList);
          if (asgList.length > 0) {
            setSelectedAssignmentId(asgList[0].id);
          }
          setRosters(await listClassRosters(y.id));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal memuat data.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Load assignments when semester changes
  useEffect(() => {
    if (!year || !teacher) return;
    void (async () => {
      try {
        const asgList = await listAssignmentsByTeacher(teacher.id, year.id, semester);
        setAssignments(asgList);
        if (asgList.length > 0) {
          setSelectedAssignmentId(asgList[0].id);
        } else {
          setSelectedAssignmentId("");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal memuat assignments.");
      }
    })();
  }, [year, teacher, semester]);

  // Derived: selected assignment
  const assignment = useMemo(
    () => assignments.find((a) => a.id === selectedAssignmentId),
    [assignments, selectedAssignmentId]
  );

  // derived: roster for selected class
  const roster = useMemo(
    () => rosters.find((r) => r.classId === assignment?.classId),
    [rosters, assignment?.classId]
  );

  // Derived: RekapContext for useSemesterAggregator
  const rekapContext: RekapContext | null = useMemo(() => {
    if (!year || !teacher || !assignment || !school) return null;
    return {
      academicYearId: year.id,
      teacherId: teacher.id,
      classId: assignment.classId,
      classLabel: assignment.classLabel,
      subject: assignment.subject,
      semester,
      schoolName: school.name,
      yearLabel: year.label,
      teacherName: teacher.name,
    };
  }, [year, teacher, assignment, school, semester]);

  return {
    loading,
    error,
    year,
    teacher,
    school,
    assignments,
    assignment,
    roster,
    rekapContext,
    selectedAssignmentId,
    setSelectedAssignmentId,
    semester,
    setSemester,
    tab,
    setTab,
    selectedMonthIndex,
    setSelectedMonthIndex,
  };
}
