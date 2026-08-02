/**
 * Sub-hook: Initialization — loads academic year, school/teacher profile,
 * class rosters, and duty rules on mount.
 *
 * P0-1/P0-2: try/catch/finally + error state + retry button
 */

import { useCallback, useEffect, useState } from "react";
import { getActiveAcademicYear, getSchoolProfile, getTeacherProfile } from "@shared/db/profile-repo";
import { listClassRosters } from "@shared/db/class-roster-repo";
import { todayISODate } from "@guru-admin/shared";
import {
  listDutyRules,
  seedDefaultDutyRulesIfEmpty,
} from "@shared/db/daily-duty-repo";
import type {
  AcademicYear,
  ClassRoster,
  DutyRule,
  SchoolProfile,
  TeacherProfile,
} from "@guru-admin/domain";

export function useDutyInit() {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [school, setSchool] = useState<SchoolProfile | undefined>();
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [date, setDate] = useState(todayISODate());

  const [rules, setRules] = useState<DutyRule[]>([]);
  const [rosters, setRosters] = useState<ClassRoster[]>([]);

  // ─── P0-1/P0-2: Error state ───
  const [initError, setInitError] = useState<string | null>(null);

  // ─── P0-1/P0-2: init with try/catch/finally ───
  async function init() {
    setInitError(null);
    try {
      const [y, sp, tp] = await Promise.all([
        getActiveAcademicYear(),
        getSchoolProfile(),
        getTeacherProfile(),
      ]);
      setYear(y ?? null);
      setSchool(sp);
      setTeacher(tp);
      if (y) setRosters(await listClassRosters(y.id));
      await seedDefaultDutyRulesIfEmpty();
      setRules(await listDutyRules());
    } catch (e) {
      setInitError(e instanceof Error ? e.message : "Gagal memuat data awal. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  // ─── Effects: init on mount ───
  useEffect(() => { void init(); }, []);

  /** P0-1/P0-2: retry handler */
  const handleRetryInit = useCallback(() => { void init(); }, []);

  return {
    loading,
    year,
    school,
    teacher,
    date,
    setDate,
    rules,
    rosters,
    initError,
    handleRetryInit,
  } as const;
}
