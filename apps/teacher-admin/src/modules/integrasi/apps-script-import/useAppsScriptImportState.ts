/**
 * Custom hook: all state management and handlers for AppsScriptImportPage.
 *
 * Extracted from the monolithic component to keep the page file clean.
 */

import { useEffect, useState, useRef } from "react";
import { getActiveAcademicYear, getTeacherProfile } from "@shared/db/profile-repo";
import { importFromAppsScript, type ImportSummary } from "@shared/db/apps-script-import-repo";
import {
  validateAppsScriptImport,
  previewAppsScriptImport,
  type AppsScriptImport,
  type AppsScriptImportValidation,
  type AppsScriptImportPreview,
} from "@guru-admin/domain";
import type { AcademicYear, TeacherProfile } from "@guru-admin/domain";

export interface AppsScriptImportState {
  // Core state
  loading: boolean;
  year: AcademicYear | null;
  teacher: TeacherProfile | undefined;
  inputText: string;
  filename: string;
  validation: AppsScriptImportValidation | null;
  preview: AppsScriptImportPreview | null;
  importing: boolean;
  summary: ImportSummary | null;
  message: { type: "success" | "error"; text: string } | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;

  // Handlers
  handleInputChange: (v: string) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleValidate: () => void;
  handleImport: () => Promise<void>;
  handleLoadSample: () => void;
}

export function useAppsScriptImportState(): AppsScriptImportState {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [inputText, setInputText] = useState("");
  const [filename, setFilename] = useState("");
  const [validation, setValidation] = useState<AppsScriptImportValidation | null>(null);
  const [preview, setPreview] = useState<AppsScriptImportPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void (async () => {
      const [y, tp] = await Promise.all([getActiveAcademicYear(), getTeacherProfile()]);
      setYear(y ?? null);
      setTeacher(tp);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), message.type === "error" ? 5000 : 3000);
    return () => clearTimeout(t);
  }, [message]);

  function handleInputChange(v: string) {
    setInputText(v);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setInputText(String(reader.result ?? ""));
      setValidation(null);
      setPreview(null);
      setSummary(null);
    };
    reader.onerror = () => setMessage({ type: "error", text: "Gagal baca file." });
    reader.readAsText(file);
  }

  function handleValidate() {
    setValidation(null);
    setPreview(null);
    setSummary(null);
    try {
      const json = JSON.parse(inputText);
      const result = validateAppsScriptImport(json);
      setValidation(result);
      if (result.success && result.data) {
        setPreview(previewAppsScriptImport(result.data));
      }
    } catch (e) {
      setValidation({
        success: false,
        errors: [`JSON tidak valid: ${e instanceof Error ? e.message : String(e)}`],
        warnings: [],
      });
    }
  }

  async function handleImport() {
    if (!validation?.success || !validation.data) return;
    // UX-REL-07: confirm kuat sebelum import data besar/update
    const totalItems = validation.data.students?.length ?? 0;
    const ok = window.confirm(
      `Import data dari file export HP/Absen?\n\n` +
      `Akan diproses: ${totalItems} siswa + data absensi/jurnal/nilai.\n` +
      `Import bersifat idempotent (data yang sama tidak dobel).\n\n` +
      `Lanjutkan?`
    );
    if (!ok) return;
    setImporting(true);
    setSummary(null);
    try {
      const result = await importFromAppsScript(validation.data);
      setSummary(result);
      const totalNew = result.students.new + result.gurus.new + result.absensi.new + result.jurnal.new + result.nilai.new;
      const totalUpdated = result.students.updated + result.gurus.updated + result.absensi.updated + result.jurnal.updated + result.nilai.updated;
      const totalErrors = result.errors.length;
      setMessage({
        type: totalErrors > 0 ? "error" : "success",
        text: `Import selesai. ${totalNew} baru, ${totalUpdated} update, ${totalErrors} error.`,
      });
      // Reset input
      setInputText("");
      setFilename("");
      setValidation(null);
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Gagal import." });
    } finally {
      setImporting(false);
    }
  }

  function handleLoadSample() {
    const sample: AppsScriptImport = {
      source: "apps_script",
      exportedAt: new Date().toISOString(),
      schoolName: "SMPN 8 Bantan",
      academicYearLabel: "2025/2026",
      semester: 1,
      students: [
        { id: "as-s1", name: "Andi Saputra", number: 1, nis: "2025001", classId: "VII A", classLabel: "VII A" },
        { id: "as-s2", name: "Budi Pratama", number: 2, nis: "2025002", classId: "VII A", classLabel: "VII A" },
        { id: "as-s3", name: "Cici Lestari", number: 3, nis: "2025003", classId: "VII A", classLabel: "VII A" },
      ],
      gurus: [
        {
          id: "as-g1",
          teacherName: "Siti Aminah, S.Pd.",
          teacherNip: "198503152010012005",
          subject: "Pendidikan Pancasila",
          classId: "VII A",
          classLabel: "VII A",
          semester: 1,
          academicYearLabel: "2025/2026",
        },
      ],
      absensi: [
        {
          id: "as-a1",
          date: "2025-07-21",
          classId: "VII A",
          classLabel: "VII A",
          subject: "Pendidikan Pancasila",
          teacherName: "Siti Aminah, S.Pd.",
          semester: 1,
          academicYearLabel: "2025/2026",
          startPeriod: 1,
          startTime: "07:00",
          endTime: "08:20",
          records: [
            { studentId: "as-s1", studentName: "Andi Saputra", studentNumber: 1, status: "present" },
            { studentId: "as-s2", studentName: "Budi Pratama", studentNumber: 2, status: "sick" },
            { studentId: "as-s3", studentName: "Cici Lestari", studentNumber: 3, status: "present" },
          ],
        },
      ],
      jurnal: [
        {
          id: "as-j1",
          date: "2025-07-21",
          classId: "VII A",
          classLabel: "VII A",
          subject: "Pendidikan Pancasila",
          teacherName: "Siti Aminah, S.Pd.",
          semester: 1,
          academicYearLabel: "2025/2026",
          startPeriod: 1,
          startTime: "07:00",
          endTime: "08:20",
          materialTitle: "Norma dalam Kehidupan Masyarakat",
          realizationStatus: "done",
          presentCount: 2,
          sickCount: 1,
          excusedCount: 0,
          absentCount: 0,
          totalStudents: 3,
        },
      ],
      nilai: [
        {
          id: "as-n1",
          classId: "VII A",
          classLabel: "VII A",
          subject: "Pendidikan Pancasila",
          teacherName: "Siti Aminah, S.Pd.",
          semester: 1,
          academicYearLabel: "2025/2026",
          kktp: 75,
          entries: [
            { studentId: "as-s1", studentName: "Andi Saputra", studentNumber: 1, dailyScore: 85, finalScore: 85 },
            { studentId: "as-s2", studentName: "Budi Pratama", studentNumber: 2, dailyScore: 70, finalScore: 70 },
            { studentId: "as-s3", studentName: "Cici Lestari", studentNumber: 3, dailyScore: 90, finalScore: 90 },
          ],
        },
      ],
    };
    setInputText(JSON.stringify(sample, null, 2));
    setValidation(null);
    setPreview(null);
    setSummary(null);
  }

  return {
    loading,
    year,
    teacher,
    inputText,
    filename,
    validation,
    preview,
    importing,
    summary,
    message,
    fileInputRef,
    handleInputChange,
    handleFileUpload,
    handleValidate,
    handleImport,
    handleLoadSample,
  };
}
