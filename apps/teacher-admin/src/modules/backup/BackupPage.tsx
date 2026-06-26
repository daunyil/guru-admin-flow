/**
 * Modul M09 Backup/Restore.
 * Sumber: docs/PROJECT_CONTRACT.md §4.1 (M09), docs/TECHNICAL_PLAN.md §6
 */

import { useState } from "react";
import { Card, CardHeader, Button, Badge } from "../../shared/ui";
import { Download, Upload, AlertTriangle, Check } from "../../shared/layout/icons";
import {
  exportBackup,
  restoreBackup,
  downloadBackupFile,
  parseBackupFileContent,
  validateBackupFile,
  generateBackupFilename,
} from "../../shared/db/backup-repo";
import type { BackupSummary } from "@guru-admin/domain";

export function BackupPage() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<BackupSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Pending restore state
  const [pendingFile, setPendingFile] = useState<{ name: string; data: unknown } | null>(null);
  const [pendingSummary, setPendingSummary] = useState<BackupSummary | null>(null);

  async function handleExport() {
    setExporting(true);
    setError(null);
    setSuccess(null);
    try {
      const backup = await exportBackup();
      downloadBackupFile(backup);
      setSuccess(`Backup ${generateBackupFilename()} berhasil diunduh.`);
      setSummary({
        schemaVersion: backup.schemaVersion,
        exportedAt: backup.exportedAt,
        appVersion: backup.appVersion,
        counts: {
          academicYears: backup.data.academicYears.length,
          calendarEvents: backup.data.calendarEvents.length,
          protaProfiles: backup.data.protaProfiles.length,
          teachingSchedules: backup.data.teachingSchedules.length,
          teachingAssignments: backup.data.teachingAssignments.length,
          lessonSessions: backup.data.lessonSessions.length,
          attendanceRecords: backup.data.attendanceRecords.length,
          classRosters: backup.data.classRosters.length,
          teachingJournals: backup.data.teachingJournals.length,
          semesterReports: backup.data.semesterReports.length,
          gradeBooks: backup.data.gradeBooks.length,
          atpEntries: backup.data.atpEntries.length,
          lkpds: backup.data.lkpds.length,
          rppDocuments: backup.data.rppDocuments.length,
          remedialPrograms: backup.data.remedialPrograms.length,
          enrichmentPrograms: backup.data.enrichmentPrograms.length,
          documentSnapshots: backup.data.documentSnapshots.length,
        },
        hasSchoolProfile: backup.data.schoolProfile !== null,
        hasTeacherProfile: backup.data.teacherProfile !== null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal export backup.");
    } finally {
      setExporting(false);
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setSuccess(null);
    setPendingFile(null);
    setPendingSummary(null);
    try {
      const data = await parseBackupFileContent(file);
      const result = validateBackupFile(data);
      if (!result.success) {
        setError(`File backup tidak valid: ${result.error.message}`);
        return;
      }
      setPendingFile({ name: file.name, data });
      setPendingSummary(result.summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membaca file.");
    } finally {
      // Reset input agar bisa pilih file yang sama lagi
      e.target.value = "";
    }
  }

  async function handleConfirmRestore() {
    if (!pendingFile) return;
    // UX-REL-06: typed confirm "RESTORE" untuk mencegah salah klik
    const typed = window.prompt(
      `PERINGATAN: Restore akan MENGHAPUS SEMUA data lokal saat ini ` +
      `dan menggantinya dengan data dari file backup.\n\n` +
      `Data yang akan direstore:\n` +
      `- ${pendingSummary?.counts.academicYears ?? 0} tahun pelajaran\n` +
      `- ${pendingSummary?.counts.protaProfiles ?? 0} Prota\n` +
      `- ${pendingSummary?.counts.gradeBooks ?? 0} rekap nilai\n` +
      `- ${pendingSummary?.counts.classRosters ?? 0} daftar siswa\n\n` +
      `Ketik RESTORE untuk konfirmasi:`
    );
    if (typed !== "RESTORE") {
      setError("Restore dibatalkan. Ketik RESTORE untuk konfirmasi.");
      return;
    }
    setImporting(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await restoreBackup(pendingFile.data);
      setSuccess(`Restore berhasil. ${result.counts.academicYears} tahun pelajaran, ${result.counts.protaProfiles} Prota, ${result.counts.teachingSchedules} jadwal, ${result.counts.gradeBooks} rekap nilai.`);
      setPendingFile(null);
      setPendingSummary(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal restore backup.");
    } finally {
      setImporting(false);
    }
  }

  function handleCancelRestore() {
    setPendingFile(null);
    setPendingSummary(null);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Backup &amp; Restore</h1>
        <p className="text-sm text-slate-500 mt-1">
          Ekspor seluruh data ke file JSON, atau impor kembali. Berguna untuk pindah perangkat atau arsip.
        </p>
      </div>

      <Card>
        <CardHeader
          title="Export Backup"
          description="Unduh seluruh data lokal ke satu file JSON. Termasuk semua data: profil, tahun, jadwal, sesi, absensi, jurnal, nilai, dokumen."
        />
        <Button onClick={handleExport} disabled={exporting}>
          <Download className="w-4 h-4" />
          {exporting ? "Mengekspor..." : "Export Sekarang"}
        </Button>

        {summary && (
          <div className="mt-4 p-3 rounded-md bg-brand-50 border border-brand-200">
            <p className="text-sm font-medium text-brand-800 flex items-center gap-1.5 mb-2">
              <Check className="w-4 h-4" /> Backup berhasil
            </p>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-brand-900">
              <Stat label="Tahun Pelajaran" value={summary.counts.academicYears} />
              <Stat label="Kalender" value={summary.counts.calendarEvents} />
              <Stat label="Prota" value={summary.counts.protaProfiles} />
              <Stat label="Jadwal" value={summary.counts.teachingSchedules} />
              <Stat label="Sesi Mengajar" value={summary.counts.lessonSessions} />
              <Stat label="Absensi" value={summary.counts.attendanceRecords} />
              <Stat label="Jurnal" value={summary.counts.teachingJournals} />
              <Stat label="Laporan" value={summary.counts.semesterReports} />
              <Stat label="Nilai" value={summary.counts.gradeBooks} />
              <Stat label="Snapshot" value={summary.counts.documentSnapshots} />
            </dl>
            <p className="text-xs text-brand-700 mt-2">
              schemaVersion: {summary.schemaVersion} • appVersion: {summary.appVersion}
            </p>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Restore Backup"
          description="Pulihkan data dari file JSON. Seluruh data lokal akan diganti."
        />

        <div className="space-y-3">
          <label className="block">
            <span className="label">Pilih file backup (.json)</span>
            <input
              type="file"
              accept="application/json,.json"
              onChange={handleFileSelect}
              className="input"
            />
          </label>

          {pendingSummary && pendingFile && (
            <div className="p-4 rounded-md bg-amber-50 border border-amber-300">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-900 mb-1">
                    Konfirmasi restore: {pendingFile.name}
                  </p>
                  <p className="text-xs text-amber-800 mb-3">
                    Seluruh data lokal saat ini akan <strong>dihapus dan diganti</strong> dengan isi file backup.
                    Operasi ini tidak bisa di-undo. Pastikan sudah export backup data saat ini bila perlu.
                  </p>
                  <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-amber-900 mb-3">
                    <Stat label="Tahun Pelajaran" value={pendingSummary.counts.academicYears} />
                    <Stat label="Kalender" value={pendingSummary.counts.calendarEvents} />
                    <Stat label="Prota" value={pendingSummary.counts.protaProfiles} />
                    <Stat label="Jadwal" value={pendingSummary.counts.teachingSchedules} />
                    <Stat label="Sesi Mengajar" value={pendingSummary.counts.lessonSessions} />
                    <Stat label="Absensi" value={pendingSummary.counts.attendanceRecords} />
                    <Stat label="Jurnal" value={pendingSummary.counts.teachingJournals} />
                    <Stat label="Laporan" value={pendingSummary.counts.semesterReports} />
                    <Stat label="Nilai" value={pendingSummary.counts.gradeBooks} />
                  </dl>
                  <p className="text-xs text-amber-800 mb-3">
                    schemaVersion: {pendingSummary.schemaVersion} • di-export: {pendingSummary.exportedAt}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="danger" onClick={handleConfirmRestore} disabled={importing}>
                      <Upload className="w-4 h-4" />
                      {importing ? "Merestore..." : "Ya, Restore Sekarang"}
                    </Button>
                    <Button variant="secondary" onClick={handleCancelRestore} disabled={importing}>
                      Batal
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {error && (
        <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-700">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 rounded-md bg-brand-50 border border-brand-200 text-sm text-brand-700 flex items-start gap-2">
          <Check className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <Card>
        <CardHeader title="Catatan Keamanan" />
        <ul className="text-sm text-slate-600 space-y-1.5 list-disc pl-5">
          <li>File backup berisi seluruh data sekolah, guru, siswa, dan nilai. Simpan di tempat aman.</li>
          <li>schemaVersion divalidasi saat import. File dari versi app yang lebih baru akan ditolak.</li>
          <li>Restore bersifat <strong>overwrite penuh</strong>. Tidak ada merge di MVP lokal.</li>
          <li>Setelah restore, semua entitas ber-status <Badge variant="neutral">local_only</Badge> sampai sinkronisasi cloud tersedia.</li>
        </ul>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs opacity-75">{label}</dt>
      <dd className="text-sm font-semibold">{value}</dd>
    </div>
  );
}
