/**
 * useGradesInit — loads year, teacher, assignments, rosters on mount.
 */
import { useEffect, useState } from "react";
import type { AcademicYear, TeacherProfile, TeachingAssignment, ClassRoster } from "@guru-admin/domain";
import { getActiveAcademicYear, getTeacherProfile } from "@shared/db/profile-repo";
import { listAssignmentsByTeacher } from "@shared/db/teaching-assignment-repo";
import { listClassRosters } from "@shared/db/class-roster-repo";
import { todayISODate } from "@guru-admin/shared";

export function useGradesInit() {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [assignments, setAssignments] = useState<TeachingAssignment[]>([]);
  const [rosters, setRosters] = useState<ClassRoster[]>([]);
  const [docSemester, setDocSemester] = useState<1 | 2>(1);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [y, tp] = await Promise.all([getActiveAcademicYear(), getTeacherProfile()]);
      setYear(y ?? null);
      setTeacher(tp);
      if (y) setRosters(await listClassRosters(y.id));
      if (y && tp) {
        const todayISO = todayISODate();
        const defaultSemester: 1 | 2 =
          y.semester2Start <= todayISO && todayISO <= y.semester2End ? 2 : 1;
        setDocSemester(defaultSemester);
        setAssignments(await listAssignmentsByTeacher(tp.id, y.id, defaultSemester));
      }
      setLoading(false);
    })();
  }, []);

  // Auto-clear messages
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 3000);
    return () => clearTimeout(t);
  }, [message]);

  return { loading, year, teacher, assignments, rosters, docSemester, setDocSemester, message, setMessage };
}
