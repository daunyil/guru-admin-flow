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
} from "@guru-admin/domain";
import {
  RPP_IDENTITY_PLACEHOLDERS,
  buildPlaceholderMap,
  applyAllReplacements,
  countPlaceholders,
  hasAnyPlaceholder,
  countLiteralOccurrences,
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
        const today = new Date();
        const todayISO = today.toISOString().slice(0, 10);
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
    if (message?.type === "error") setTimeout(() => setMessage(null), 5000);
    if (message?.type === "success") setTimeout(() => setMessage(null), 3000);
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
    // RC1-PATCH-1: honest UI — .docx belum didukung
    if (name.endsWith(".doc") || name.endsWith(".docx") || name.endsWith(".pdf")) {
      setMessage({
        type: "error",
        text: `File ${file.name} berformat Word/PDF. Saat ini hanya .txt/.html/.md yang didukung. Silakan copy-paste isi dokumen secara manual, atau konversi ke .txt dulu. Dukungan .docx = roadmap berikutnya.`,
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setInputText(String(reader.result ?? ""));
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
        text: `${saved.length} dokumen diproses & disimpan. ${placeholderCount} placeholder + ${literalCount} literal replacement diterapkan.`,
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
    if (!confirm("Hapus arsip RPP ini?")) return;
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
      <Card className="bg-amber-50 border-amber-200">
        <div className="flex items-start gap-2 text-sm">
          <span className="text-amber-600 text-lg">⚠</span>
          <div>
            <p className="font-semibold text-amber-900">Format yang Didukung Saat Ini</p>
            <p className="text-amber-800 mt-1">
              Upload file <code>.txt</code>, <code>.html</code>, <code>.md</code> atau <strong>paste teks</strong>.
              File <code>.doc</code>/<code>.docx</code>/<code>.pdf</code> <strong>belum didukung</strong> —
              silakan copy-paste isi Word ke kotak teks di bawah.
              Dukungan .docx = roadmap berikutnya.
            </p>
            <p className="text-amber-800 mt-1">
              <strong>Multi-dokumen:</strong> pisah beberapa RPP dengan delimiter{" "}
              <code>=== DOKUMEN ===</code> atau <code>=== RPP ===</code>. Setiap blok akan jadi arsip terpisah.
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
          description="Auto-fill dari Profil Sekolah + Guru. Pilih Data Mengajar untuk auto-fill mapel/kelas/semester."
        />
        <div className="space-y-3">
          {assignments.length > 0 && (
            <Select
              label="Data Mengajar (opsional, untuk auto-fill mapel/kelas/semester)"
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
          description="Untuk RPP yang identitasnya ditulis langsung sebagai teks (bukan placeholder). Contoh: 'SMA Negeri 1' → 'SMPN 8 Bantan'."
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
          title="2. Dokumen RPP Lama"
          description="Upload file (.txt/.html/.md) atau paste teks RPP lama."
        />
        <div className="space-y-3">
          <div>
            <label className="label">Upload File (opsional, .txt/.html/.md saja)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.html,.htm,.md"
              onChange={handleFileUpload}
              className="input"
            />
            {filename && <p className="text-xs text-slate-500 mt-1">File: {filename}</p>}
          </div>

          <Textarea
            label="Atau Paste Teks RPP Lama"
            id="rpp-input"
            value={inputText}
            onChange={setInputText}
            rows={8}
            placeholder="Tempel teks RPP lama di sini. Placeholder yang didukung: {{NAMA_SEKOLAH}}, {{NAMA_GURU}}, dll. Untuk multi-dokumen, pisah dengan === DOKUMEN ==="
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
                      Download
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
                <div
                  className="rpp-content"
                  style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}
                  dangerouslySetInnerHTML={{ __html: previewDoc.processedContent }}
                />
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
