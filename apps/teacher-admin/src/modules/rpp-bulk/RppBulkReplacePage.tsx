/**
 * Perbarui Identitas Dokumen — ganti identitas dokumen lama secara massal.
 *
 * BATCH-ADMIN-USABILITY-RC1: ubah dari "RPP Bulk Replace" ke
 * "Perbarui Identitas Dokumen" yang mendukung berbagai jenis dokumen.
 *
 * Jenis dokumen yang didukung:
 *   RPP/Modul Ajar, Prota, ATP, LKPD, Kisi-kisi, Kartu Soal, Naskah Soal, Lainnya.
 *
 * Mode teks/paste tetap aman. DOCX = roadmap berikutnya.
 */

import { useEffect, useState, useRef } from "react";
import { Card, CardHeader, Input, Textarea, Button, EmptyState, Badge, Select, InfoCard } from "../../shared/ui";
import { getActiveAcademicYear, getSchoolProfile, getTeacherProfile } from "../../shared/db/profile-repo";
import { listAssignmentsByTeacher } from "../../shared/db/teaching-assignment-repo";
import {
  listRppDocuments,
  saveRppDocument,
  deleteRppDocument,
  getRppDocument,
} from "../../shared/db/rpp-document-repo";
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
  RPP_IDENTITY_PLACEHOLDERS,
  buildPlaceholderMap,
  applyAllReplacements,
  countPlaceholders,
  hasAnyPlaceholder,
  countLiteralOccurrences,
  processDocxIdentity,
  isValidDocx,
  extractDocxText,
} from "@guru-admin/domain";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";

/** Delimiter untuk multi-dokumen paste. */
const DOC_DELIMITERS = ["=== DOKUMEN ===", "=== RPP ===", "---DOKUMEN---", "---RPP---"];

/** Pisahkan teks yang berisi multiple dokumen jadi array. */
function splitMultipleDocuments(text: string): string[] {
  let result = [text];
  for (const delim of DOC_DELIMITERS) {
    const next: string[] = [];
    for (const doc of result) {
      next.push(...doc.split(delim));
    }
    result = next;
  }
  return result
    .map((d) => d.trim())
    .filter((d) => d.length > 0);
}

export function RppBulkReplacePage() {
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

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), message.type === "error" ? 5000 : 3000);
    return () => clearTimeout(t);
  }, [message]);

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

  function getValidLiteralReplacements(): LiteralReplacement[] {
    return literalReplacements.filter((r) => r.oldText.trim().length > 0);
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

  function countTotalPlaceholders(content: string): number {
    const counts = countPlaceholders(content);
    return Object.values(counts).reduce((sum, n) => sum + n, 0);
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
    const docxBuffer = base64DocxToArrayBuffer(doc.processedContent);
    if (docxBuffer) {
      // Mode DOCX: download binary .docx
      const blob = new Blob([docxBuffer], {
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

  /** Konversi ArrayBuffer DOCX → string base64 dengan prefix data URI. */
  function arrayBufferToBase64Docx(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const chunk = 0x8000; // 32KB chunk untuk avoid call stack overflow
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    const base64 = btoa(binary);
    return `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64}`;
  }

  /** Cek apakah content adalah base64 DOCX (dari import DOCX). */
  function isDocxBase64(content: string): boolean {
    return content.startsWith("data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,");
  }

  /** Decode base64 DOCX → ArrayBuffer untuk download. */
  function base64DocxToArrayBuffer(content: string): ArrayBuffer | null {
    if (!isDocxBase64(content)) return null;
    const base64 = content.split(",")[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;

  // Live preview saat user ketik
  const validLiterals = getValidLiteralReplacements();
  const liveProcessed = inputText ? applyAllReplacements(inputText, ctx, validLiterals) : "";
  const livePlaceholderCount = inputText ? countTotalPlaceholders(inputText) : 0;
  const liveHasPlaceholders = inputText ? hasAnyPlaceholder(inputText) : false;
  const liveLiteralMatches = validLiterals.map((r) => ({
    oldText: r.oldText,
    count: inputText ? countLiteralOccurrences(inputText, r.oldText) : 0,
  }));
  const multiDocCount = inputText ? splitMultipleDocuments(inputText).length : 0;

  return (
    <div className="space-y-4">
      <div className="page-header">
        <h1 className="text-2xl font-bold text-slate-900">Perbarui Identitas Dokumen</h1>
        <p className="text-sm text-slate-500 mt-1">
          {year ? `TP ${year.label}` : "Belum ada tahun aktif"} · Ganti identitas dokumen lama tanpa ubah isi materi.
        </p>
      </div>

      {message && (
        <div className={`info-banner-${message.type === "success" ? "success" : "error"}`}>
          {message.text}
        </div>
      )}

      {/* Info: format yang didukung */}
      <Card className="bg-emerald-50 border-emerald-200">
        <div className="flex items-start gap-2 text-sm">
          <span className="text-emerald-600 text-lg">✓</span>
          <div>
            <p className="font-semibold text-emerald-900">Format yang Didukung</p>
            <p className="text-emerald-800 mt-1">
              Upload file <code>.docx</code> (Word 2007+), <code>.txt</code>, <code>.html</code>, <code>.md</code> atau <strong>paste teks</strong>.
              Untuk <code>.docx</code>: app baca isi dokumen, ganti identitas lama dengan yang baru, dan hasilkan <code>.docx</code> baru dengan format Word tetap utuh.
            </p>
            <p className="text-emerald-800 mt-1">
              <strong>Multi-dokumen (teks):</strong> pisah beberapa RPP dengan delimiter <code>=== DOKUMEN ===</code> atau <code>=== RPP ===</code>.
            </p>
            <p className="text-amber-700 mt-1 text-xs">
              Catatan: <code>.doc</code> lama (OLE) dan <code>.pdf</code> belum didukung. Konversi dulu ke <code>.docx</code> via Word → Save As .docx.
            </p>
          </div>
        </div>
      </Card>

      {/* Pilih jenis dokumen */}
      <Card>
        <CardHeader title="Jenis Dokumen" description="Pilih jenis dokumen yang akan diperbarui identitasnya." />
        <Select
          label="Jenis Dokumen"
          id="doc-kind"
          value={docKind}
          onChange={setDocKind}
          options={[
            { value: "rpp", label: "RPP / Modul Ajar" },
            { value: "prota", label: "Prota" },
            { value: "atp", label: "ATP" },
            { value: "lkpd", label: "LKPD" },
            { value: "blueprint", label: "Kisi-kisi" },
            { value: "question_card", label: "Kartu Soal" },
            { value: "exam", label: "Naskah Soal" },
            { value: "other", label: "Dokumen Lain" },
          ]}
        />
      </Card>

      {/* Step 1: Identitas */}
      <Card>
        <CardHeader
          title="1. Identitas Baru"
          description="Auto-fill dari Profil Sekolah + Guru. Pilih Kelas dan Mapel untuk auto-fill mapel/kelas/semester."
        />
        <div className="space-y-3">
          {assignments.length > 0 && (
            <Select
              label="Kelas dan Mapel (opsional, untuk auto-fill mapel/kelas/semester)"
              id="rpp-asg"
              value={selectedAssignmentId}
              onChange={handleAssignmentPick}
              options={[
                { value: "", label: "-- Tidak pakai assignment --" },
                ...assignments.map((a) => ({
                  value: a.id,
                  label: `${a.classLabel} · ${a.subject} · ${a.teacherName}`,
                })),
              ]}
            />
          )}

          <InfoCard
            entries={[
              { label: "Sekolah", value: ctx.schoolName || "-" },
              { label: "Guru", value: ctx.teacherName || "-" },
              { label: "Mapel", value: ctx.subject || "-" },
              { label: "Kelas", value: ctx.classLabel || "-" },
              { label: "Semester", value: ctx.semester },
            ]}
          />

          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Nama Sekolah" id="rpp-school" value={ctx.schoolName} onChange={(v) => setCtx({ ...ctx, schoolName: v })} />
            <Input label="Kepala Sekolah" id="rpp-head" value={ctx.headmasterName} onChange={(v) => setCtx({ ...ctx, headmasterName: v })} />
            <Input label="NIP Kepala Sekolah" id="rpp-headnip" value={ctx.headmasterNip} onChange={(v) => setCtx({ ...ctx, headmasterNip: v })} />
            <Input label="Nama Guru" id="rpp-teacher" value={ctx.teacherName} onChange={(v) => setCtx({ ...ctx, teacherName: v })} />
            <Input label="NIP Guru" id="rpp-teachernip" value={ctx.teacherNip} onChange={(v) => setCtx({ ...ctx, teacherNip: v })} />
            <Input label="Mata Pelajaran" id="rpp-subject" value={ctx.subject} onChange={(v) => setCtx({ ...ctx, subject: v })} />
            <Input label="Kelas" id="rpp-class" value={ctx.classLabel} onChange={(v) => setCtx({ ...ctx, classLabel: v })} />
            <Select
              label="Semester"
              id="rpp-sem"
              value={ctx.semester === "Ganjil" ? "1" : "2"}
              onChange={(v) => setCtx({ ...ctx, semester: v === "1" ? "Ganjil" : "Genap" })}
              options={[{ value: "1", label: "Ganjil" }, { value: "2", label: "Genap" }]}
            />
            <Input label="Tahun Pelajaran" id="rpp-year" value={ctx.academicYearLabel} onChange={(v) => setCtx({ ...ctx, academicYearLabel: v })} />
            <Input label="Fase" id="rpp-fase" value={ctx.fase} onChange={(v) => setCtx({ ...ctx, fase: v })} />
            <Input label="Tempat TTD" id="rpp-place" value={ctx.place} onChange={(v) => setCtx({ ...ctx, place: v })} />
            <Input label="Tanggal" id="rpp-date" type="date" value={ctx.date} onChange={(v) => setCtx({ ...ctx, date: v })} />
          </div>
          <Input label="Alamat Sekolah" id="rpp-addr" value={ctx.schoolAddress} onChange={(v) => setCtx({ ...ctx, schoolAddress: v })} />
        </div>
      </Card>

      {/* Step 1b: Literal Replacements (RC1-PATCH-1) */}
      <Card>
        <CardHeader
          title="1b. Ganti Teks Identitas Lama (Opsional)"
          description="Untuk RPP yang identitasnya ditulis langsung sebagai teks (bukan kode). Contoh: 'SMA Negeri 1' → 'SMPN 8 Bantan'."
        />
        <div className="space-y-2">
          {literalReplacements.map((r, i) => (
            <div key={i} className="flex gap-2 items-end">
              <Input
                label={i === 0 ? "Teks Lama" : ""}
                id={`rpp-old-${i}`}
                value={r.oldText}
                onChange={(v) => updateLiteralReplacement(i, "oldText", v)}
                placeholder="SMA Negeri 1"
              />
              <span className="pb-2 text-slate-400">→</span>
              <Input
                label={i === 0 ? "Teks Baru" : ""}
                id={`rpp-new-${i}`}
                value={r.newText}
                onChange={(v) => updateLiteralReplacement(i, "newText", v)}
                placeholder="SMPN 8 Bantan"
              />
              <Button
                variant="danger"
                className="text-xs px-2 py-2 mb-0"
                onClick={() => removeLiteralReplacement(i)}
                disabled={literalReplacements.length === 1}
              >
                ×
              </Button>
            </div>
          ))}
          <Button variant="secondary" className="text-sm" onClick={addLiteralReplacement}>
            + Tambah Pasangan
          </Button>
          {validLiterals.length > 0 && inputText && (
            <div className="p-3 bg-slate-50 rounded-md text-xs space-y-1">
              <p className="font-semibold text-slate-700">Preview Literal Match:</p>
              {liveLiteralMatches.map((m, i) => (
                <p key={i}>
                  <code>{m.oldText}</code> → ditemukan <strong>{m.count}</strong> kali
                </p>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Step 2: Input dokumen lama */}
      <Card>
        <CardHeader
          title="2. Dokumen Lama"
          description="Upload file (.docx/.txt/.html/.md) atau paste teks dokumen lama."
        />
        <div className="space-y-3">
          <div>
            <label className="label">Upload File (.docx/.txt/.html/.md)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.txt,.html,.htm,.md"
              onChange={handleFileUpload}
              className="input"
            />
            {filename && (
              <p className="text-xs text-slate-500 mt-1">
                File: {filename}
                {docxBuffer && <Badge variant="success">DOCX siap diproses</Badge>}
              </p>
            )}
          </div>

          {/* DOCX-IDENTITY-RC1: section khusus DOCX */}
          {docxBuffer && (
            <div className="p-3 bg-slate-50 rounded-md space-y-3">
              <div className="text-sm font-semibold text-slate-700">
                Mode DOCX: {filename}
              </div>
              <div className="text-xs text-slate-600 space-y-1">
                <p>Placeholder ditemukan: <strong>{docxStats.placeholders}</strong></p>
                {docxStats.literals.length > 0 && (
                  <div>
                    <p>Literal match:</p>
                    <ul className="ml-4 list-disc">
                      {docxStats.literals.map((l, i) => (
                        <li key={i}><code>{l.oldText}</code> → <strong>{l.count}</strong>×</li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="text-slate-500">
                  {docxStats.placeholders === 0 && docxStats.literals.every((l) => l.count === 0)
                    ? "⚠ Tidak ada placeholder/literal ditemukan. Tambah pasangan literal di Step 1b dulu."
                    : "✓ Klik Proses DOCX untuk replace."}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={handleProcessDocx}
                  disabled={docxProcessing}
                >
                  {docxProcessing ? "Memproses..." : "Proses DOCX"}
                </Button>
              </div>

              {docxResult && (
                <div className="p-3 bg-emerald-50 rounded border border-emerald-200 space-y-2">
                  <p className="text-sm font-semibold text-emerald-900">✓ DOCX berhasil diproses</p>
                  <div className="text-xs text-emerald-800 space-y-1">
                    <p>Placeholder di-replace: <strong>{docxResult.stats.placeholdersReplaced}</strong> / {docxResult.stats.placeholdersFound} ditemukan</p>
                    <p>Literal replacement: <strong>{docxResult.stats.literalMatches}</strong></p>
                    <p>File diproses: {docxResult.stats.filesProcessed.join(", ")}</p>
                    {docxResult.warnings.length > 0 && (
                      <p className="text-amber-700">⚠ {docxResult.warnings.join(" ")}</p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="secondary" className="text-sm" onClick={handleDownloadDocx}>
                      Download .docx
                    </Button>
                    <Button variant="secondary" className="text-sm" onClick={handleSaveDocxArchive}>
                      Simpan ke Arsip
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="text-xs text-slate-500 text-center">— atau paste teks di bawah (mode teks) —</div>

          <Textarea
            label="Atau Paste Teks Dokumen Lama"
            id="rpp-input"
            value={inputText}
            onChange={setInputText}
            rows={8}
            placeholder="Tempel teks dokumen lama di sini. Placeholder yang didukung: {{NAMA_SEKOLAH}}, {{NAMA_GURU}}, dll. Untuk multi-dokumen, pisah dengan === DOKUMEN ==="
          />

          {inputText && (
            <div className="p-3 bg-slate-50 rounded-md text-sm space-y-2">
              <p className="font-medium text-slate-700">
                Placeholder terdeteksi: <strong>{livePlaceholderCount}</strong> buah
                {multiDocCount > 1 && (
                  <span className="ml-3">
                    Multi-dokumen: <strong>{multiDocCount}</strong> blok
                  </span>
                )}
              </p>
              {!liveHasPlaceholders && validLiterals.length === 0 && (
                <p className="text-xs text-amber-700">
                  ⚠ Tidak ada placeholder ditemukan. Tambah pasangan literal di Step 1b
                  untuk ganti teks identitas lama secara langsung.
                </p>
              )}
              {(liveHasPlaceholders || validLiterals.length > 0) && (
                <p className="text-xs text-emerald-700">
                  ✓ Klik &quot;Proses &amp; Simpan&quot; untuk ganti placeholder + literal
                  dengan identitas di atas.
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleProcessAndSave} disabled={!inputText.trim()}>
              Proses &amp; Simpan Arsip
            </Button>
            {inputText && (liveHasPlaceholders || validLiterals.length > 0) && (
              <Button
                variant="secondary"
                onClick={() => {
                  setPreviewDoc({
                    id: "preview",
                    academicYearId: year?.id ?? "",
                    teacherId: teacher?.id ?? "",
                    originalContent: inputText,
                    processedContent: liveProcessed,
                    source: filename ? "upload" : "paste",
                    filename: filename || null,
                    contextSnapshot: ctx,
                    literalReplacements: validLiterals,
                    status: "draft",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    deletedAt: null,
                    syncStatus: "local_only",
                  } as RppDocument);
                }}
              >
                Preview Hasil Replace
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Step 3: Arsip */}
      <Card>
        <CardHeader
          title="3. Arsip RPP Hasil Replace"
          description={`${archives.length} dokumen tersimpan`}
        />
        {archives.length === 0 ? (
          <EmptyState
            title="Belum ada arsip"
            description="Proses RPP lama di atas untuk membuat arsip pertama."
          />
        ) : (
          <div className="space-y-2">
            {archives.map((doc) => (
              <div key={doc.id} className="p-3 border border-slate-200 rounded-md">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {doc.filename ?? "Paste teks"}
                      </span>
                      <Badge variant="neutral">{doc.source}</Badge>
                      <Badge variant={doc.status === "final" ? "success" : "neutral"}>
                        {doc.status === "final" ? "Final" : "Draft"}
                      </Badge>
                      {doc.subject && <Badge variant="neutral">{doc.subject}</Badge>}
                      {doc.classLabel && <Badge variant="neutral">{doc.classLabel}</Badge>}
                      {(doc.literalReplacements?.length ?? 0) > 0 && (
                        <Badge variant="warning">{doc.literalReplacements?.length} literal</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Diproses {formatLongDateID(doc.createdAt.slice(0, 10))} ·{" "}
                      {countTotalPlaceholders(doc.originalContent)} placeholder
                      {(doc.literalReplacements?.length ?? 0) > 0 && ` + ${doc.literalReplacements?.length} literal`}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button variant="secondary" className="text-xs px-2 py-1" onClick={() => handlePreview(doc)}>
                      Preview
                    </Button>
                    <Button variant="secondary" className="text-xs px-2 py-1" onClick={() => handleDownloadProcessed(doc)}>
                      {isDocxBase64(doc.processedContent) ? "Download .docx" : "Download .html"}
                    </Button>
                    <Button variant="danger" className="text-xs px-2 py-1" onClick={() => handleDelete(doc.id)}>
                      Hapus
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Preview Modal */}
      {previewDoc && (
        <Card>
          <CardHeader
            title="Preview Hasil Replace"
            description={previewDoc.filename ?? "Paste teks"}
          />
          <div className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              <Badge variant="neutral">
                {countTotalPlaceholders(previewDoc.originalContent)} placeholder
              </Badge>
              {(previewDoc.literalReplacements?.length ?? 0) > 0 && (
                <Badge variant="warning">
                  {previewDoc.literalReplacements?.length} literal replacement
                </Badge>
              )}
              {previewDoc.id !== "preview" && (
                <Button variant="secondary" className="text-xs" onClick={() => handleDownloadProcessed(previewDoc)}>
                  Download .html
                </Button>
              )}
              <Button variant="secondary" className="text-xs" onClick={() => window.print()}>
                Cetak
              </Button>
              <Button variant="secondary" className="text-xs" onClick={() => setPreviewDoc(null)}>
                Tutup Preview
              </Button>
            </div>

            <div className="print-area">
              <div className="document-page document-portrait">
                {isDocxBase64(previewDoc.processedContent) ? (
                  // UX-DOC-05: arsip DOCX base64 TIDAK boleh ditampilkan sebagai HTML.
                  // Tampilkan info + tombol Download saja.
                  <div className="p-4 bg-slate-50 rounded text-center space-y-3">
                    <p className="text-sm font-semibold text-slate-700">
                      Arsip DOCX (binary)
                    </p>
                    <p className="text-xs text-slate-500">
                      File .docx hasil replace identitas. Preview teks tidak tersedia untuk arsip DOCX.
                      Klik Download untuk mengambil file .docx.
                    </p>
                    <Button variant="secondary" className="text-sm" onClick={() => handleDownloadProcessed(previewDoc)}>
                      Download .docx
                    </Button>
                  </div>
                ) : (
                  <div
                    className="rpp-content"
                    style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}
                    dangerouslySetInnerHTML={{ __html: previewDoc.processedContent }}
                  />
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Daftar placeholder (info card) */}
      <Card>
        <CardHeader title="Daftar Placeholder Didukung" description="Tempel placeholder ini di RPP lama untuk auto-replace." />
        <div className="grid sm:grid-cols-3 gap-2 text-xs">
          {RPP_IDENTITY_PLACEHOLDERS.map((ph) => {
            const map = buildPlaceholderMap(ctx);
            return (
              <div key={ph} className="p-2 bg-slate-50 rounded">
                <code className="text-brand-700">{ph}</code>
                <p className="text-slate-600 mt-1">→ {map[ph] || "(kosong)"}</p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
