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
 *
 * Refactored: monolithic component split into sub-files:
 *   - useAppsScriptImportState.ts  (state management & handlers hook)
 *   - ImportInputCard.tsx           (Step 1: Masukkan JSON)
 *   - ValidationErrorsCard.tsx      (Validasi Gagal)
 *   - PreviewCard.tsx               (Step 2: Preview Data)
 *   - PreviewStat.tsx               (Preview stat sub-component)
 *   - SummaryResultCard.tsx         (Step 3: Ringkasan Import)
 *   - SummaryCard.tsx               (Summary card sub-component)
 */

import { Card } from "../../shared/ui";
import { LoadingState } from "../../shared/ui";
import { useAppsScriptImportState } from "./useAppsScriptImportState";
import { ImportInputCard } from "./ImportInputCard";
import { ValidationErrorsCard } from "./ValidationErrorsCard";
import { PreviewCard } from "./PreviewCard";
import { SummaryResultCard } from "./SummaryResultCard";

export function AppsScriptImportPage() {
  const state = useAppsScriptImportState();

  if (state.loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="page-header">
        <h1 className="text-2xl font-bold text-slate-900">Import dari Absen/Jurnal HP</h1>
        <p className="text-sm text-slate-500 mt-1">
          {state.year ? `TP ${state.year.label}` : "Belum ada tahun aktif"} · Jembatan satu arah: Absen/Jurnal HP → Aplikasi Administrasi.
        </p>
      </div>

      {state.message && (
        <div className={`info-banner-${state.message.type === "success" ? "success" : "error"}`}>
          {state.message.text}
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
      <ImportInputCard state={state} />

      {/* Step 2: Validation errors */}
      {state.validation && !state.validation.success && (
        <ValidationErrorsCard validation={state.validation} />
      )}

      {/* Step 2: Preview */}
      <PreviewCard state={state} />

      {/* Step 3: Summary */}
      {state.summary && (
        <SummaryResultCard summary={state.summary} />
      )}
    </div>
  );
}
