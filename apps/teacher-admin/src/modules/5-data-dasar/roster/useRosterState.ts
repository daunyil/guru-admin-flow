/**
 * Custom hook that encapsulates all state management for RosterPage.
 * PATCH-01B: Import Data Siswa.
 */

import { useEffect, useState } from "react";
import {
  listClassRosters,
  importStudents,
  addStudent,
  removeStudent,
} from "@shared/db/class-roster-repo";
import { getActiveAcademicYear } from "@shared/db/profile-repo";
import type { ClassRoster, AcademicYear } from "@guru-admin/domain";

export function useRosterState() {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [rosters, setRosters] = useState<ClassRoster[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function reload() {
    if (!year) return;
    const rs = await listClassRosters(year.id);
    setRosters(rs);
  }

  useEffect(() => {
    void (async () => {
      const y = await getActiveAcademicYear();
      setYear(y ?? null);
      if (y) setRosters(await listClassRosters(y.id));
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!error && !success) return;
    const t = setTimeout(() => { setError(null); setSuccess(null); }, error ? 5000 : 3000);
    return () => clearTimeout(t);
  }, [error, success]);

  const selected = rosters.find((r) => r.id === selectedId) ?? null;

  // Handlers exposed for the import modal and other sub-components
  async function handleImportStudents(
    rosterId: string,
    students: { name: string; number: number; nis?: string }[],
    mode: "replace" | "append",
    existingCount: number,
  ) {
    if (mode === "replace") {
      await importStudents(rosterId, students);
    } else {
      const startNumber = existingCount + 1;
      for (let i = 0; i < students.length; i++) {
        await addStudent(rosterId, { name: students[i].name, number: startNumber + i, nis: students[i].nis || undefined });
      }
    }
  }

  async function handleRemoveStudent(rosterId: string, studentId: string) {
    await removeStudent(rosterId, studentId);
  }

  async function handleAddStudent(rosterId: string, student: { name: string; number: number }) {
    await addStudent(rosterId, student);
  }

  return {
    loading,
    year,
    rosters,
    selectedId,
    setSelectedId,
    showNew,
    setShowNew,
    showImport,
    setShowImport,
    error,
    setError,
    success,
    setSuccess,
    selected,
    reload,
    handleImportStudents,
    handleRemoveStudent,
    handleAddStudent,
  };
}
