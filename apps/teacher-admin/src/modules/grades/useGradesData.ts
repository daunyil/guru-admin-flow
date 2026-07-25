/**
 * useGradesData — core data state: entries, gradeBook, dirty, kktp, gradeModel, score editing.
 */
import { useEffect, useMemo, useState } from "react";
import type { AcademicYear, TeacherProfile, TeachingAssignment, ClassRoster, GradeBook, GradeEntry } from "@guru-admin/domain";
import { calculateGradeBookEntries } from "@guru-admin/domain";
import { findGradeBook, saveGradeBook, updateGradeBook } from "@shared/db/gradebook-repo";
import { getScoreColumns } from "./grades-utils";

interface UseGradesDataParams {
  year: AcademicYear | null;
  teacher: TeacherProfile | undefined;
  assignments: TeachingAssignment[];
  rosters: ClassRoster[];
  docSemester: 1 | 2;
  setMessage: (msg: string | null) => void;
}

export function useGradesData({ year, teacher, assignments, rosters, docSemester, setMessage }: UseGradesDataParams) {
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [kktp, setKktp] = useState("75");
  const [entries, setEntries] = useState<GradeEntry[]>([]);
  const [gradeBook, setGradeBook] = useState<GradeBook | null>(null);
  const [dirty, setDirty] = useState(false);

  // V3: Model penilaian
  const [gradeModel, setGradeModel] = useState<"uh" | "kd">("uh");
  const [uhCount, setUhCount] = useState(2);
  const [weightUH, setWeightUH] = useState(25);
  const [weightUTS, setWeightUTS] = useState(25);
  const [weightUAS, setWeightUAS] = useState(50);

  function selectedAssignment(): TeachingAssignment | undefined {
    return assignments.find((a) => a.id === selectedAssignmentId);
  }

  // Dirty guard saat ganti assignment
  function handleAssignmentChange(newId: string) {
    if (newId === selectedAssignmentId) return;
    if (dirty) {
      const ok = window.confirm(
        "Nilai belum disimpan. Ganti Kelas dan Mapel akan membuang perubahan. Lanjutkan?"
      );
      if (!ok) return;
    }
    setSelectedAssignmentId(newId);
    setDirty(false);
  }

  async function loadEntries() {
    if (!year || !teacher) return;
    const assignment = selectedAssignment();
    if (!assignment) { setEntries([]); setGradeBook(null); return; }
    const roster = rosters.find((r) => r.classId === assignment.classId);
    if (!roster) { setEntries([]); setGradeBook(null); return; }

    try {
      const existing = await findGradeBook({
        academicYearId: assignment.academicYearId,
        teacherId: assignment.teacherId,
        classId: assignment.classId,
        semester: assignment.semester,
        subject: assignment.subject,
      });

      if (existing) {
        setGradeBook(existing);
        setKktp(String(existing.passingScore));
        setEntries(existing.entries.slice().sort((a, b) => (a.studentNumber ?? 0) - (b.studentNumber ?? 0)));
        if (existing.gradeModel) setGradeModel(existing.gradeModel);
        if (existing.uhCount) setUhCount(existing.uhCount);
        if (existing.weightUH != null) setWeightUH(existing.weightUH);
        if (existing.weightUTS != null) setWeightUTS(existing.weightUTS);
        if (existing.weightUAS != null) setWeightUAS(existing.weightUAS);
      } else {
        setGradeBook(null);
        const newEntries: GradeEntry[] = roster.students.map((s) => ({
          studentId: s.id,
          studentName: s.name,
          studentNumber: s.number,
          kd1: null, kd2: null, kd3: null, kd4: null, kd5: null, kd6: null,
          pts: null, pas: null,
          finalScore: null, averageKd: null,
          dailyScore: null, assignmentScore: null, summativeScore: null,
          remedialScore: null, averageScore: null,
          status: "incomplete" as const,
        }));
        setEntries(newEntries);
      }
      setDirty(false);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Gagal memuat data nilai. Coba lagi.");
    }
  }

  useEffect(() => {
    void loadEntries();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssignmentId]);

  function setScore(idx: number, field: keyof GradeEntry, value: string) {
    const num = value === "" ? null : Math.max(0, Math.min(100, Number(value)));
    const next = [...entries];
    next[idx] = { ...next[idx], [field]: num };
    setEntries(next);
    setDirty(true);
  }

  function handleFillAll80() {
    const cols = getScoreColumns(gradeModel, uhCount);
    const fillCols = Object.fromEntries(cols.map((c) => [c.key, 80])) as Record<string, number>;
    setEntries(entries.map((e) => ({ ...e, ...fillCols })));
    setDirty(true);
    setMessage("Semua diisi 80. Klik Simpan.");
  }

  function handleRandomControlled() {
    const cols = getScoreColumns(gradeModel, uhCount);
    setEntries(entries.map((e) => {
      const base = 75 + Math.floor(Math.random() * 20);
      const fillCols = Object.fromEntries(cols.map((c) => [c.key, base])) as Record<string, number>;
      return { ...e, ...fillCols };
    }));
    setDirty(true);
    setMessage("Nilai diacak terkontrol (75-94). Klik Simpan.");
  }

  async function handleSave() {
    if (!year || !teacher) return;
    const assignment = selectedAssignment();
    if (!assignment) return;
    const roster = rosters.find((r) => r.classId === assignment.classId);
    if (!roster) return;

    try {
      if (gradeBook) {
        const updated = await updateGradeBook(gradeBook.id, {
          passingScore: Number(kktp) || 75, entries,
          gradeModel, uhCount, weightUH, weightUTS, weightUAS,
        });
        if (updated) {
          setGradeBook(updated);
          setEntries(updated.entries.slice().sort((a, b) => (a.studentNumber ?? 0) - (b.studentNumber ?? 0)));
          setDirty(false);
          setMessage("Nilai tersimpan.");
        }
      } else {
        const created = await saveGradeBook({
          academicYearId: assignment.academicYearId,
          teacherId: assignment.teacherId,
          classId: assignment.classId,
          classLabel: assignment.classLabel,
          subject: assignment.subject,
          semester: assignment.semester,
          passingScore: Number(kktp) || 75,
          entries,
          status: "draft",
          gradeModel, uhCount, weightUH, weightUTS, weightUAS,
        });
        setGradeBook(created);
        setEntries(created.entries.slice().sort((a, b) => (a.studentNumber ?? 0) - (b.studentNumber ?? 0)));
        setDirty(false);
        setMessage("Nilai tersimpan.");
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Gagal simpan.");
    }
  }

  const calculated = useMemo(
    () => calculateGradeBookEntries(entries, Number(kktp) || 75, { gradeModel, uhCount, weightUH, weightUTS, weightUAS }),
    [entries, kktp, gradeModel, uhCount, weightUH, weightUTS, weightUAS]
  );

  const assignment = selectedAssignment();
  const remedialCount = calculated.filter((e) => e.status === "remedial").length;
  const enrichmentCount = calculated.filter((e) => (e.finalScore ?? 0) >= 90).length;

  const docDataForAutoSave = useMemo(() => {
    if (!assignment) return {};
    return {
      semester: docSemester,
      tahunAjaran: year?.label ?? "",
      subject: assignment.subject,
      classLabel: assignment.classLabel,
      kktp: Number(kktp) || 75,
      totalStudents: entries.length,
      filledCount: calculated.filter((e) => e.finalScore !== null).length,
      remedialCount,
      enrichmentCount,
    };
  }, [assignment, docSemester, year?.label, entries.length, calculated, kktp, remedialCount, enrichmentCount]);

  return {
    selectedAssignmentId, selectedAssignment, handleAssignmentChange,
    kktp, setKktp,
    entries, setEntries, gradeBook, dirty, setDirty,
    gradeModel, setGradeModel, uhCount, setUhCount,
    weightUH, setWeightUH, weightUTS, setWeightUTS, weightUAS, setWeightUAS,
    calculated, assignment, remedialCount, enrichmentCount,
    docDataForAutoSave,
    setScore, handleFillAll80, handleRandomControlled, handleSave, loadEntries,
  };
}
