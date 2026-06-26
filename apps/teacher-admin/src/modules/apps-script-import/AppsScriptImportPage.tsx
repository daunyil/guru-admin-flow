/**
 * Apps Script Import — halaman /apps-script-import
 *
 * APPS-SCRIPT-BRIDGE-RC1: jembatan satu arah Absen/Jurnal HP → Aplikasi Administrasi.
 *
 * Flow:
 *   1. Upload JSON atau paste JSON dari file export HP.
 *   2. App validasi + tampilkan preview (jumlah students/gurus/absensi/jurnal/nilai).
 *   3. Guru klik "Konfirmasi Import".
 *   4. App import data (idempotent) + tampilkan ringkasan hasil.
 */

import { useEffect, useState, useRef } from "react";
import { Card, CardHeader, Button, Badge, Textarea, InfoCard } from "../../shared/ui";
import { getActiveAcademicYear, getTeacherProfile } from "../../shared/db/profile-repo";
import { importFromAppsScript, type ImportSummary } from "../../shared/db/apps-script-import-repo";
import {
  validateAppsScriptImport,
  previewAppsScriptImport,
  type AppsScriptImport,
  type AppsScriptImportValidation,
  type AppsScriptImportPreview,
} from "@guru-admin/domain";
import type { AcademicYear, TeacherProfile } from "@guru-admin/domain";

export function AppsScriptImportPage() {
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
    if (message?.type === "error") setTimeout(() => setMessage(null), 5000);
    if (message?.type === "success") setTimeout(() => setMessage(null), 3000);
  }, [message]);

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

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;

  return (
    <div className="space-y-4">
      <div className="page-header">
        <h1 className="text-2xl font-bold text-slate-900">Import dari Absen/Jurnal HP</h1>
        <p className="text-sm text-slate-500 mt-1">
          {year ? `TP ${year.label}` : "Belum ada tahun aktif"} · Jembatan satu arah: Absen/Jurnal HP → Aplikasi Administrasi.
        </p>
      </div>

      {message && (
        <div className={`info-banner-${message.type === "success" ? "success" : "error"}`}>
          {message.text}
        </div>
      )}

      {/* Info card */}
      <Card className="bg-brand-50 border-brand-200">
        <div className="flex items-start gap-2 text-sm">
          <span className="text-brand-600 text-lg">ℹ</span>
          <div>
            <p className="font-semibold text-brand-900">Cara Pakai</p>
            <p className="text-brand-800 mt-1">
              Gunakan export dari file export HP V2: <code>exportForAppGenerator()</code> atau{" "}
              <code>backupDataV3()</code>. App akan memetakan: siswa → Daftar Siswa,
              guru → Kelas dan Mapel, absensi → Sesi + Absensi, jurnal → Sesi + Jurnal,
              nilai → Daftar Nilai.
              Import ulang file yang sama tidak membuat data dobel (idempotent).
            </p>
            <p className="text-brand-800 mt-1">
              Upload file <code>.json</code> atau paste teks file export HP.
            </p>
          </div>
        </div>
      </Card>

      {/* Step 1: Input JSON */}
      <Card>
        <CardHeader
          title="1. Masukkan JSON dari file export HP"
          description="Upload file .json atau paste teks file export."
        />
        <div className="space-y-3">
          <div>
            <label className="label">Upload File JSON (opsional)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileUpload}
              className="input"
            />
            {filename && <p className="text-xs text-slate-500 mt-1">File: {filename}</p>}
          </div>

          <Textarea
            label="Atau Paste JSON"
            id="as-json"
            value={inputText}
            onChange={setInputText}
            rows={10}
            placeholder='{"source":"apps_script","exportedAt":"...","academicYearLabel":"2025/2026","semester":1,"students":[...],"gurus":[...],"absensi":[...],"jurnal":[...],"nilai":[...]}'
          />

          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleValidate} disabled={!inputText.trim()}>
              Validasi & Preview
            </Button>
            <Button variant="secondary" onClick={handleLoadSample}>
              Muat Contoh JSON
            </Button>
          </div>
        </div>
      </Card>

      {/* Step 2: Preview */}
      {validation && !validation.success && (
        <Card className="border-rose-200 bg-rose-50">
          <CardHeader title="Validasi Gagal" description={`${validation.errors.length} error ditemukan`} />
          <ul className="space-y-1 text-sm text-rose-700">
            {validation.errors.map((err, i) => (
              <li key={i}>• {err}</li>
            ))}
          </ul>
        </Card>
      )}

      {validation?.success && preview && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardHeader
            title="2. Preview Data"
            description="Data valid. Klik 'Konfirmasi Import' untuk memproses."
          />
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <PreviewStat label="Siswa" value={preview.counts.students} />
              <PreviewStat label="Kelas dan Mapel" value={preview.counts.gurus} />
              <PreviewStat label="Absensi" value={preview.counts.absensi} />
              <PreviewStat label="Jurnal" value={preview.counts.jurnal} />
              <PreviewStat label="Nilai" value={preview.counts.nilai} />
            </div>

            {/* APPS-SCRIPT-IMPORT-ADAPTER-01: daftar kelas+mapel unik */}
            {preview.uniqueClasses.length > 0 && (
              <div className="p-3 bg-white rounded-md">
                <p className="text-xs font-semibold text-slate-600 mb-2">Kelas dan Mapel yang akan diproses:</p>
                <div className="flex gap-2 flex-wrap">
                  {preview.uniqueClasses.map((c, i) => (
                    <Badge key={i} variant="neutral">{c.classLabel} · {c.subject} · {c.teacherName}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* APPS-SCRIPT-IMPORT-ADAPTER-01: warning duplikat + missing class */}
            {preview.warnings.length > 0 && (
              <div className="p-3 bg-amber-50 rounded-md text-sm text-amber-800">
                <p className="font-semibold">Peringatan:</p>
                <ul className="list-disc pl-5 mt-1">
                  {preview.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {validation.warnings.length > 0 && (
              <div className="p-3 bg-amber-50 rounded-md text-sm text-amber-800">
                <p className="font-semibold">Peringatan Validasi:</p>
                <ul className="list-disc pl-5 mt-1">
                  {validation.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {year && teacher && (
              <InfoCard
                entries={[
                  { label: "Tahun Pelajaran", value: year.label },
                  { label: "Guru Aktif", value: teacher.name },
                  { label: "Semester JSON", value: String(validation.data?.semester ?? "-") },
                  { label: "Sekolah JSON", value: validation.data?.schoolName ?? "-" },
                  { label: "Export At", value: validation.data?.exportedAt ?? "-" },
                ]}
              />
            )}

            <Button onClick={handleImport} disabled={importing}>
              {importing ? "Mengimpor..." : "Konfirmasi Import"}
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: Summary */}
      {summary && (
        <Card>
          <CardHeader
            title="3. Ringkasan Import"
            description="Hasil import (idempotent — import ulang tidak menggandakan data)."
          />
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <SummaryCard title="Siswa" data={summary.students} />
              <SummaryCard title="Kelas dan Mapel" data={summary.gurus} />
              <SummaryCard title="Absensi" data={summary.absensi} />
              <SummaryCard title="Jurnal" data={summary.jurnal} />
              <SummaryCard title="Nilai" data={summary.nilai} />
            </div>

            {summary.errors.length > 0 && (
              <div className="p-3 bg-rose-50 rounded-md text-sm">
                <p className="font-semibold text-rose-700">Error ({summary.errors.length}):</p>
                <ul className="list-disc pl-5 mt-1 text-rose-600 text-xs">
                  {summary.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {summary.errors.length === 0 && (
              <Badge variant="success">✓ Semua data berhasil diimpor tanpa error</Badge>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

function PreviewStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-2 bg-white rounded border border-emerald-200">
      <p className="text-2xl font-bold text-emerald-700">{value}</p>
      <p className="text-xs text-slate-600">{label}</p>
    </div>
  );
}

function SummaryCard({ title, data }: { title: string; data: { new: number; updated: number; skipped: number; errors: number } }) {
  return (
    <div className="p-3 border border-slate-200 rounded-md">
      <p className="font-semibold text-sm text-slate-900 mb-2">{title}</p>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-emerald-600">Baru</span>
          <span className="font-bold">{data.new}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-brand-600">Update</span>
          <span className="font-bold">{data.updated}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Skip</span>
          <span className="font-bold">{data.skipped}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-rose-600">Error</span>
          <span className="font-bold">{data.errors}</span>
        </div>
      </div>
    </div>
  );
}
