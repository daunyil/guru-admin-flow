import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  SchoolDocOrientation,
  DocumentStatus,
  AcademicYear,
  TeacherProfile,
  SchoolProfile,
  TeachingAssignment,
  RemedialProgram,
  RemedialStudent,
} from "@guru-admin/domain";
import { calculateGradeBookEntries } from "@guru-admin/domain";
import { todayISODate } from "@guru-admin/shared";
import { getActiveAcademicYear, getTeacherProfile, getSchoolProfile } from "@shared/db/profile-repo";
import { listAssignmentsByTeacher } from "@shared/db/teaching-assignment-repo";
import { findGradeBook } from "@shared/db/gradebook-repo";
import {
  listRemedialPrograms,
  generateRemedialProgram,
  updateRemedialProgram,
  finalizeRemedialProgram,
  deleteRemedialProgram,
} from "@shared/db/remedial-repo";
import {
  saveSchoolDocument,
  updateSchoolDocumentData,
  updateSchoolDocumentLayout,
  setSchoolDocumentStatus,
  findSchoolDocumentByCompositeKey,
} from "@shared/db/school-document-repo";
/* ------------------------------------------------------------------ */
/*  useRemedialState — all state, effects, and handlers               */
/* ------------------------------------------------------------------ */

export function useRemedialState() {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [school, setSchool] = useState<SchoolProfile | undefined>();
  const [assignments, setAssignments] = useState<TeachingAssignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [program, setProgram] = useState<RemedialProgram | null>(null);
  const [plan, setPlan] = useState("");
  const [kktp, setKktp] = useState(75);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Preset untuk Isi Otomatis Semua
  const [presetMethod, setPresetMethod] = useState("");
  const [presetSchedule, setPresetSchedule] = useState("");
  const [presetNote, setPresetNote] = useState("");

  // WYSIWYG-DOC-FASE6: sidebar + document state
  const [showSidebar, setShowSidebar] = useState(
    typeof window !== "undefined" && window.innerWidth >= 1024
  );
  const [docId, setDocId] = useState<string | undefined>();
  const [docStatus, setDocStatus] = useState<DocumentStatus>("draft");
  const [formatDokumen, setFormatDokumen] = useState<SchoolDocOrientation>("portrait");
  const [docView, setDocView] = useState<"remedial" | "remedial-enrichment">("remedial");

  const ensuringRef = useRef(false);

  // Auto-dismiss messages
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), message.type === "error" ? 5000 : 3000);
    return () => clearTimeout(t);
  }, [message]);

  // Load profile data
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

  function selectedAssignment(): TeachingAssignment | undefined {
    return assignments.find((a) => a.id === selectedAssignmentId);
  }

  // Load program when assignment changes
  async function loadProgram() {
    if (!year || !teacher) return;
    const assignment = selectedAssignment();
    if (!assignment) {
      setProgram(null);
      setDocId(undefined);
      return;
    }
    const all = await listRemedialPrograms({ academicYearId: year.id, teacherId: teacher.id });
    const found = all.find(
      (p) =>
        p.subject === assignment.subject &&
        p.classId === assignment.classId &&
        p.semester === assignment.semester
    );
    if (found) {
      setProgram(found);
      setPlan(found.plan ?? "");
      setKktp(found.kktp);
      setStartDate(found.startDate ?? "");
      setEndDate(found.endDate ?? "");
    } else {
      setProgram(null);
      setPlan("");
    }
  }

  useEffect(() => {
    void loadProgram();
  }, [selectedAssignmentId, year]);

  // WYSIWYG-DOC-FASE6: ensureDoc — find or create schoolDocument
  const ensureDoc = useCallback(async () => {
    if (!year || !teacher || !program) return;
    if (ensuringRef.current) return;
    ensuringRef.current = true;
    try {
      const existing = await findSchoolDocumentByCompositeKey({
        docType: "remedial",
        semester: program.semester,
        tahunAjaran: year.label,
        kodeMapel: program.subject,
        kodeKelas: program.classLabel,
        teacherId: teacher.id,
      });
      if (existing) {
        setDocId(existing.id);
        setDocStatus(existing.status);
        if (existing.orientation) setFormatDokumen(existing.orientation);
      } else {
        const doc = await saveSchoolDocument({
          docType: "remedial",
          semester: program.semester,
          tahunAjaran: year.label,
          kodeMapel: program.subject,
          kodeKelas: program.classLabel,
          teacherId: teacher.id,
          academicYearId: year.id,
          status: "draft",
        });
        setDocId(doc.id);
        setDocStatus("draft");
      }
    } finally {
      ensuringRef.current = false;
    }
  }, [year, teacher, program]);

  useEffect(() => {
    if (program) {
      void ensureDoc();
    } else {
      setDocId(undefined);
    }
  }, [program, ensureDoc]);

  // Auto-save data for DocumentPreview
  const docDataForAutoSave = useMemo<Record<string, unknown>>(() => {
    if (!program) return {};
    return {
      programId: program.id,
      subject: program.subject,
      classLabel: program.classLabel,
      semester: program.semester,
      kktp: program.kktp,
      students: program.students,
      plan,
      teacherName: program.teacherName ?? teacher?.name ?? "",
    };
  }, [program, plan, teacher]);

  const handleSaveDoc = useCallback(async (id: string, data: Record<string, unknown>) => {
    await updateSchoolDocumentData(id, data);
  }, []);

  const handleSetFinal = useCallback(async (id: string) => {
    await setSchoolDocumentStatus(id, "final");
    setDocStatus("final");
  }, []);

  const handleOrientationChange = useCallback((o: SchoolDocOrientation) => {
    setFormatDokumen(o);
    if (docId) void updateSchoolDocumentLayout(docId, { orientation: o });
  }, [docId]);

  // Generate / re-generate program
  async function handleGenerate() {
    if (!year || !teacher) return;
    const assignment = selectedAssignment();
    if (!assignment) {
      setMessage({ type: "error", text: "Pilih Kelas dan Mapel dulu." });
      return;
    }
    if (program) {
      const ok = window.confirm(
        "Susun ulang dari nilai terbaru akan mengganti daftar siswa remedial " +
        "dengan data nilai terbaru. Edit manual yang sudah diisi akan dipertahankan " +
        "untuk siswa yang masih ada. Lanjutkan?"
      );
      if (!ok) return;
    }
    try {
      const gb = await findGradeBook({
        academicYearId: assignment.academicYearId,
        teacherId: assignment.teacherId,
        classId: assignment.classId,
        semester: assignment.semester,
        subject: assignment.subject,
      });
      if (!gb) {
        setMessage({
          type: "error",
          text: `Belum ada GradeBook untuk ${assignment.classLabel} · ${assignment.subject}. Isi nilai dulu di menu Nilai.`,
        });
        return;
      }

      const calculated = calculateGradeBookEntries(gb.entries, kktp);
      const entriesForFilter = calculated.map((e) => ({
        studentId: e.studentId,
        studentName: e.studentName,
        studentNumber: e.studentNumber,
        nis: undefined as string | undefined,
        finalScore: (e.finalScore ?? null) as number | null,
      }));

      const result = await generateRemedialProgram({
        assignment,
        kktp,
        gradebookEntries: entriesForFilter,
        plan: plan || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setProgram(result);
      setMessage({
        type: "success",
        text: `Program remedial dibuat. ${result.students.length} siswa di bawah KKTP.`,
      });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Gagal generate." });
    }
  }

  async function handleUpdateStudent(idx: number, patch: Partial<RemedialStudent>) {
    if (!program) return;
    try {
      const nextStudents = [...program.students];
      nextStudents[idx] = { ...nextStudents[idx], ...patch };
      const updated = await updateRemedialProgram(program.id, { students: nextStudents });
      if (updated) setProgram(updated);
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Gagal memperbarui siswa." });
    }
  }

  async function handleSavePlan() {
    if (!program) return;
    try {
      const updated = await updateRemedialProgram(program.id, { plan });
      if (updated) {
        setProgram(updated);
        setMessage({ type: "success", text: "Rencana remedial tersimpan." });
      }
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Gagal menyimpan rencana." });
    }
  }

  async function handleFinalize() {
    if (!program) return;
    try {
      const result = await finalizeRemedialProgram(program.id);
      if (result.success && result.program) {
        setProgram(result.program);
        setMessage({ type: "success", text: "Program remedial difinalkan." });
      } else {
        setMessage({ type: "error", text: result.errors.join(", ") });
      }
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Gagal finalisasi program." });
    }
  }

  async function handleDelete() {
    if (!program) return;
    if (!window.confirm("Hapus program remedial ini?")) return;
    try {
      await deleteRemedialProgram(program.id);
      setProgram(null);
      setMessage({ type: "success", text: "Program remedial dihapus." });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Gagal menghapus program." });
    }
  }

  const assignment = selectedAssignment();

  return {
    // State
    loading,
    year,
    teacher,
    school,
    assignments,
    selectedAssignmentId,
    setSelectedAssignmentId,
    program,
    setProgram,
    plan,
    setPlan,
    kktp,
    setKktp,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    message,
    setMessage,
    presetMethod,
    setPresetMethod,
    presetSchedule,
    setPresetSchedule,
    presetNote,
    setPresetNote,
    showSidebar,
    setShowSidebar,
    docId,
    docStatus,
    formatDokumen,
    docView,
    setDocView,
    // Derived
    assignment,
    docDataForAutoSave,
    // Handlers
    handleGenerate,
    handleUpdateStudent,
    handleSavePlan,
    handleFinalize,
    handleDelete,
    handleSaveDoc,
    handleSetFinal,
    handleOrientationChange,
  };
}
