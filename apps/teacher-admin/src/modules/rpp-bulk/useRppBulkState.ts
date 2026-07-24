/**
 * Custom hook: all state management and handlers for RppBulkReplacePage.
 *
 * Extracted from the monolithic component to keep the page file clean.
 */

import { useEffect, useState, useRef } from "react";
import type {
  AcademicYear,
  TeacherProfile,
  TeachingAssignment,
  RppDocument,
  RppIdentityContext,
  LiteralReplacement,
  DocumentIdentityKind,
  DocxProcessResult,
} from "@guru-admin/domain";
import {
  applyAllReplacements,
  countPlaceholders,
  hasAnyPlaceholder,
  countLiteralOccurrences,
  processDocxIdentity,
  isValidDocx,
  extractDocxText,
} from "@guru-admin/domain";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";
import { getActiveAcademicYear, getSchoolProfile, getTeacherProfile } from "../../shared/db/profile-repo";
import { listAssignmentsByTeacher } from "../../shared/db/teaching-assignment-repo";
import {
  listRppDocuments,
  saveRppDocument,
  deleteRppDocument,
  getRppDocument,
} from "../../shared/db/rpp-document-repo";
import { splitMultipleDocuments, arrayBufferToBase64Docx, base64DocxToArrayBuffer, isDocxBase64, countTotalPlaceholders } from "./rpp-bulk-utils";

export interface RppBulkState {
  // Core state
  loading: boolean;
  year: AcademicYear | null;
  teacher: TeacherProfile | undefined;
  assignments: TeachingAssignment[];
  selectedAssignmentId: string;
  archives: RppDocument[];
  message: { type: "success" | "error"; text: string } | null;

  // Identity form
  ctx: RppIdentityContext;
  setCtx: React.Dispatch<React.SetStateAction<RppIdentityContext>>;

  // Literal replacements
  literalReplacements: LiteralReplacement[];
  inputText: string;
  setInputText: React.Dispatch<React.SetStateAction<string>>;
  filename: string;
  docKind: string;
  setDocKind: React.Dispatch<React.SetStateAction<string>>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;

  // DOCX processing
  docxBuffer: ArrayBuffer | null;
  docxProcessing: boolean;
  docxResult: DocxProcessResult | null;
  docxStats: { placeholders: number; literals: Array<{ oldText: string; count: number }> };

  // Preview
  previewDoc: RppDocument | null;
  setPreviewDoc: React.Dispatch<React.SetStateAction<RppDocument | null>>;

  // Computed values
  validLiterals: LiteralReplacement[];
  liveProcessed: string;
  livePlaceholderCount: number;
  liveHasPlaceholders: boolean;
  liveLiteralMatches: Array<{ oldText: string; count: number }>;
  multiDocCount: number;

  // Handlers
  handleAssignmentPick: (id: string) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  updateLiteralReplacement: (idx: number, field: "oldText" | "newText", value: string) => void;
  addLiteralReplacement: () => void;
  removeLiteralReplacement: (idx: number) => void;
  handleProcessAndSave: () => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
  handlePreview: (doc: RppDocument) => Promise<void>;
  handleDownloadProcessed: (doc: RppDocument) => void;
  handleProcessDocx: () => Promise<void>;
  handleDownloadDocx: () => void;
  handleSaveDocxArchive: () => Promise<void>;
  countTotalPlaceholdersFn: (content: string) => number;
  formatLongDateID: (date: string) => string;
  isDocxBase64Fn: (content: string) => boolean;
}

export function useRppBulkState(): RppBulkState {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [assignments, setAssignments] = useState<TeachingAssignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [archives, setArchives] = useState<RppDocument[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Identity form
  const [ctx, setCtx] = useState<RppIdentityContext>({
    schoolName: "",
    schoolAddress: "",
    headmasterName: "",
    headmasterNip: "",
    teacherName: "",
    teacherNip: "",
    subject: "",
    classLabel: "",
    semester: "Ganjil",
    academicYearLabel: "",
    fase: "D",
    place: "",
    date: todayISODate(),
  });

  // Literal replacements (RC1-PATCH-1)
  const [literalReplacements, setLiteralReplacements] = useState<LiteralReplacement[]>([
    { oldText: "", newText: "" },
  ]);

  // Input content
  const [inputText, setInputText] = useState("");
  const [filename, setFilename] = useState("");
  const [docKind, setDocKind] = useState("rpp");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // DOCX-IDENTITY-RC1: state untuk DOCX processing
  const [docxBuffer, setDocxBuffer] = useState<ArrayBuffer | null>(null);
  const [docxProcessing, setDocxProcessing] = useState(false);
  const [docxResult, setDocxResult] = useState<DocxProcessResult | null>(null);
  const [docxStats, setDocxStats] = useState<{ placeholders: number; literals: Array<{ oldText: string; count: number }> }>({ placeholders: 0, literals: [] });

  // Preview
  const [previewDoc, setPreviewDoc] = useState<RppDocument | null>(null);

  // ── Initial data loading ──────────────────────────────────────────
  useEffect(() => {
    void (async () => {
      const [y, sp, tp] = await Promise.all([
        getActiveAcademicYear(),
        getSchoolProfile(),
        getTeacherProfile(),
      ]);
      setYear(y ?? null);
      setTeacher(tp);
      if (y && tp) {
                const todayISO = todayISODate();
        const sem: 1 | 2 =
          y.semester2Start <= todayISO && todayISO <= y.semester2End ? 2 : 1;
        setAssignments(await listAssignmentsByTeacher(tp.id, y.id, sem));
        setArchives(await listRppDocuments({ academicYearId: y.id, teacherId: tp.id }));
      }
      // Auto-fill identitas dari profil
      if (sp && tp && y) {
        setCtx((c) => ({
          ...c,
          schoolName: sp.name ?? "",
          schoolAddress: [sp.address, sp.village, sp.district, sp.regency, sp.province].filter(Boolean).join(", "),
          headmasterName: sp.headmasterName ?? "",
          headmasterNip: sp.headmasterNip ?? "",
          teacherName: tp.name ?? "",
          teacherNip: tp.nip ?? "",
          academicYearLabel: y.label,
          place: sp.regency ?? "",
        }));
      }
      setLoading(false);
    })();
  }, []);

  // ── Message auto-dismiss ──────────────────────────────────────────
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), message.type === "error" ? 5000 : 3000);
    return () => clearTimeout(t);
  }, [message]);

  // ── Handlers ──────────────────────────────────────────────────────

  function selectedAssignment(): TeachingAssignment | undefined {
    return assignments.find((a) => a.id === selectedAssignmentId);
  }

  function handleAssignmentPick(id: string) {
    setSelectedAssignmentId(id);
    const a = assignments.find((asg) => asg.id === id);
    if (a) {
      setCtx((c) => ({
        ...c,
        teacherName: a.teacherName,
        subject: a.subject,
        classLabel: a.classLabel,
        semester: a.semester === 1 ? "Ganjil" : "Genap",
      }));
    }
  }

  function getValidLiteralReplacements(): LiteralReplacement[] {
    return literalReplacements.filter((r) => r.oldText.trim().length > 0);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = file.name.toLowerCase();
    setFilename(file.name);

    // DOCX-IDENTITY-RC1: support .docx
    if (name.endsWith(".docx")) {
      const reader = new FileReader();
      reader.onload = async () => {
        const buf = reader.result as ArrayBuffer;
        // Validasi: cek apakah benar DOCX
        const valid = await isValidDocx(buf);
        if (!valid) {
          setMessage({
            type: "error",
            text: `File ${file.name} bukan .docx valid. Pastikan file disimpan sebagai .docx (Word 2007+), bukan .doc lama atau .pdf.`,
          });
          setDocxBuffer(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }
        setDocxBuffer(buf);
        // Extract preview text untuk display stats placeholder
        try {
          const text = await extractDocxText(buf);
          const phCount = Object.values(countPlaceholders(text)).reduce((s, n) => s + n, 0);
          const literals = getValidLiteralReplacements().map((r) => ({
            oldText: r.oldText,
            count: text ? countLiteralOccurrences(text, r.oldText) : 0,
          }));
          setDocxStats({ placeholders: phCount, literals });
          setMessage({
            type: "success",
            text: `File .docx dimuat: ${phCount} teks identitas ditemukan + ${literals.reduce((s, l) => s + l.count, 0)} teks pengganti siap. Klik "Proses DOCX" untuk mulai.`,
          });
        } catch (err) {
          setMessage({
            type: "error",
            text: `Gagal membaca teks DOCX: ${err instanceof Error ? err.message : String(err)}`,
          });
        }
      };
      reader.onerror = () => setMessage({ type: "error", text: "Gagal baca file." });
      reader.readAsArrayBuffer(file);
      return;
    }

    // .doc lama / .pdf: tetap tidak didukung (butuh konversi eksternal)
    if (name.endsWith(".doc") || name.endsWith(".pdf")) {
      setMessage({
        type: "error",
        text: `File ${file.name} berformat .doc lama atau .pdf. Saat ini hanya .docx (Word 2007+), .txt, .html, .md yang didukung. Silakan konversi ke .docx via Word → Save As .docx, atau copy-paste isi dokumen secara manual.`,
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // .txt/.html/.md: baca sebagai teks
    const reader = new FileReader();
    reader.onload = () => {
      setInputText(String(reader.result ?? ""));
      setDocxBuffer(null);
    };
    reader.onerror = () => setMessage({ type: "error", text: "Gagal baca file." });
    reader.readAsText(file);
  }

  function updateLiteralReplacement(idx: number, field: "oldText" | "newText", value: string) {
    const next = [...literalReplacements];
    next[idx] = { ...next[idx], [field]: value };
    setLiteralReplacements(next);
  }

  function addLiteralReplacement() {
    setLiteralReplacements([...literalReplacements, { oldText: "", newText: "" }]);
  }

  function removeLiteralReplacement(idx: number) {
    setLiteralReplacements(literalReplacements.filter((_, i) => i !== idx));
  }

  async function handleProcessAndSave() {
    if (!year || !teacher) return;
    if (!inputText.trim()) {
      setMessage({ type: "error", text: "Konten RPP lama kosong. Upload file atau paste teks dulu." });
      return;
    }
    try {
      const assignment = selectedAssignment();
      const validLiterals = getValidLiteralReplacements();

      // Cek multi-dokumen
      const docs = splitMultipleDocuments(inputText);
      const isMulti = docs.length > 1;

      const saved: RppDocument[] = [];
      for (let i = 0; i < docs.length; i++) {
        const content = docs[i];
        const docFilename = isMulti
          ? `${filename || "rpp"}_${i + 1}.txt`
          : filename || undefined;

        const doc = await saveRppDocument({
          academicYearId: year.id,
          teacherId: teacher.id,
          teacherName: teacher.name,
          assignmentId: assignment?.id ?? null,
          subject: ctx.subject || undefined,
          classLabel: ctx.classLabel || undefined,
          semester: ctx.semester === "Ganjil" ? 1 : 2,
          documentKind: docKind as DocumentIdentityKind,
          originalContent: content,
          context: ctx,
          literalReplacements: validLiterals,
          source: filename ? "upload" : "paste",
          filename: docFilename,
        });
        saved.push(doc);
      }

      setArchives(await listRppDocuments({ academicYearId: year.id, teacherId: teacher.id }));

      const placeholderCount = saved.reduce(
        (sum, d) => sum + Object.values(countPlaceholders(d.originalContent)).reduce((s, n) => s + n, 0),
        0
      );
      const literalCount = validLiterals.reduce(
        (sum, r) => sum + saved.reduce((s, d) => s + countLiteralOccurrences(d.processedContent, r.newText), 0),
        0
      );

      setMessage({
        type: "success",
        text: `${saved.length} dokumen diproses & disimpan. ${placeholderCount} identitas terisi + ${literalCount} teks lama diganti.`,
      });
      setInputText("");
      setFilename("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (saved.length > 0) setPreviewDoc(saved[0]);
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Gagal simpan." });
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Hapus arsip RPP ini?")) return;
    await deleteRppDocument(id);
    if (year && teacher) {
      setArchives(await listRppDocuments({ academicYearId: year.id, teacherId: teacher.id }));
    }
    setMessage({ type: "success", text: "Arsip dihapus." });
  }

  async function handlePreview(doc: RppDocument) {
    const full = await getRppDocument(doc.id);
    if (full) setPreviewDoc(full);
  }

  function handleDownloadProcessed(doc: RppDocument) {
    // P0-4 FIX: cek apakah doc.processedContent adalah base64 DOCX.
    // Bila ya → download sebagai .docx. Bila bukan → download sebagai .html (mode teks lama).
    const ab = base64DocxToArrayBuffer(doc.processedContent);
    if (ab) {
      // Mode DOCX: download binary .docx
      const blob = new Blob([ab], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = (doc.filename ?? "rpp").replace(/\.docx$/i, "") + ".docx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }
    // Mode teks (legacy): download .html
    const blob = new Blob([doc.processedContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (doc.filename ?? "rpp") + ".processed.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // DOCX-IDENTITY-RC1: proses .docx → ganti placeholder + literal → download .docx baru
  async function handleProcessDocx() {
    if (!docxBuffer) {
      setMessage({ type: "error", text: "Belum ada file .docx. Upload file .docx dulu." });
      return;
    }
    setDocxProcessing(true);
    setDocxResult(null);
    try {
      const result = await processDocxIdentity({
        docxBuffer,
        context: ctx,
        literalReplacements: getValidLiteralReplacements(),
      });
      setDocxResult(result);
      if (result.warnings.length > 0) {
        setMessage({
          type: "error",
          text: `Proses DOCX selesai dengan catatan: ${result.warnings.join(" ")}`,
        });
      } else {
        setMessage({
          type: "success",
          text: `DOCX berhasil diproses: ${result.stats.placeholdersReplaced} identitas terisi + ${result.stats.literalMatches} teks lama diganti. Klik "Download .docx" untuk simpan file baru.`,
        });
      }
    } catch (e) {
      setMessage({
        type: "error",
        text: `Gagal proses DOCX: ${e instanceof Error ? e.message : String(e)}`,
      });
    } finally {
      setDocxProcessing(false);
    }
  }

  function handleDownloadDocx() {
    if (!docxResult || !filename) return;
    const blob = new Blob([docxResult.outputBlob], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    // Nama file baru: original-replaced.docx
    const baseName = filename.replace(/\.docx$/i, "");
    a.download = `${baseName}-replaced.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleSaveDocxArchive() {
    if (!docxResult || !year || !teacher) return;
    if (!filename) return;
    try {
      // PATCH-1 FIX: simpan binary DOCX sebagai base64.
      // - originalContent = base64 DOCX asli (sebelum replace)
      // - processedContent = base64 DOCX hasil replace (docxResult.outputBlob)
      //   dikirim via processedContentOverride supaya tidak di-applyAllReplacements
      //   (yang tidak ada efek pada base64 binary).
      const originalBase64 = arrayBufferToBase64Docx(docxBuffer!);
      const processedBase64 = arrayBufferToBase64Docx(docxResult.outputBlob);
      const assignment = selectedAssignment();
      await saveRppDocument({
        academicYearId: year.id,
        teacherId: teacher.id,
        teacherName: teacher.name,
        assignmentId: assignment?.id ?? null,
        subject: ctx.subject || undefined,
        classLabel: ctx.classLabel || undefined,
        semester: ctx.semester === "Ganjil" ? 1 : 2,
        documentKind: docKind as DocumentIdentityKind,
        originalContent: originalBase64,
        // PATCH-1: override processedContent dengan base64 DOCX hasil replace.
        // Tanpa ini, repo akan applyAllReplacements(originalBase64) yang tidak
        // mengubah base64 binary → arsip menyimpan DOCX asli, bukan DOCX hasil replace.
        processedContentOverride: processedBase64,
        context: ctx,
        literalReplacements: getValidLiteralReplacements(),
        source: "upload",
        filename: filename.replace(/\.docx$/i, "") + ".docx",
      });
      setArchives(await listRppDocuments({ academicYearId: year.id, teacherId: teacher.id }));
      setMessage({
        type: "success",
        text: `Arsip DOCX tersimpan. File .docx hasil replace tersimpan di arsip. Klik Download di arsip untuk ambil file .docx yang sudah diperbarui identitasnya.`,
      });
    } catch (e) {
      setMessage({
        type: "error",
        text: `Gagal simpan arsip: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  // ── Computed values ───────────────────────────────────────────────
  const validLiterals = getValidLiteralReplacements();
  const liveProcessed = inputText ? applyAllReplacements(inputText, ctx, validLiterals) : "";
  const livePlaceholderCount = inputText ? countTotalPlaceholders(inputText) : 0;
  const liveHasPlaceholders = inputText ? hasAnyPlaceholder(inputText) : false;
  const liveLiteralMatches = validLiterals.map((r) => ({
    oldText: r.oldText,
    count: inputText ? countLiteralOccurrences(inputText, r.oldText) : 0,
  }));
  const multiDocCount = inputText ? splitMultipleDocuments(inputText).length : 0;

  return {
    // Core state
    loading,
    year,
    teacher,
    assignments,
    selectedAssignmentId,
    archives,
    message,

    // Identity form
    ctx,
    setCtx,

    // Literal replacements
    literalReplacements,
    inputText,
    setInputText,
    filename,
    docKind,
    setDocKind,
    fileInputRef,

    // DOCX processing
    docxBuffer,
    docxProcessing,
    docxResult,
    docxStats,

    // Preview
    previewDoc,
    setPreviewDoc,

    // Computed values
    validLiterals,
    liveProcessed,
    livePlaceholderCount,
    liveHasPlaceholders,
    liveLiteralMatches,
    multiDocCount,

    // Handlers
    handleAssignmentPick,
    handleFileUpload,
    updateLiteralReplacement,
    addLiteralReplacement,
    removeLiteralReplacement,
    handleProcessAndSave,
    handleDelete,
    handlePreview,
    handleDownloadProcessed,
    handleProcessDocx,
    handleDownloadDocx,
    handleSaveDocxArchive,
    countTotalPlaceholdersFn: countTotalPlaceholders,
    formatLongDateID,
    isDocxBase64Fn: isDocxBase64,
  };
}
