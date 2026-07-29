/**
 * KbmKilatPage — Mode KBM Kilat: Accordion flow cepat isi KBM.
 *
 * Flow: Presensi → Jurnal → (Opsional) Nilai → Simpan
 * Guru mengisi seluruh KBM satu sesi dalam 1 layar, step-by-step.
 *
 * UX Pattern:
 *   - Accordion step-by-step (step 1 terbuka, lainnya hidden)
 *   - Setelah selesai step 1 → step 2 muncul & auto-open
 *   - Step 3 (Nilai) opsional — muncul setelah step 2 selesai
 *   - Bottom bar SIMPAN muncul setelah step 2 selesai
 *   - Mobile-first, touch-optimized
 *
 * Data layer:
 *   - useKbmSession hook (unified state for all 3 modules)
 *   - attendance-repo, journal-repo, gradebook-repo via hook
 *
 * DOMAIN-BOUNDARY: Module 1-harian, presentation component only.
 * Import dari @shared/ui/mobile, @shared/constants, dan useKbmSession saja.
 */

import { useKbmSession } from "./useKbmSession";
import { LoadingState, EmptyState } from "@shared/ui";
import { AccordionCard, BottomSheet, MiniStat, StudentRow } from "@shared/ui/mobile";
import { ATTENDANCE_STATUS_OPTIONS } from "@shared/constants/attendance-status";

/* ============================================================ */
/*  Component                                                    */
/* ============================================================ */

export function KbmKilatPage() {
  const kbm = useKbmSession();

  /* ---- Render ---- */
  if (kbm.loading) return <LoadingState />;
  if (!kbm.year) return <EmptyState title="Belum ada tahun pelajaran aktif" />;

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-3">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white p-4 rounded-2xl shadow-md">
        <div className="flex justify-between items-center mb-1">
          <span className="bg-blue-800/80 text-blue-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-blue-400/30">
            Mode KBM Kilat
          </span>
          <span className="text-xs text-blue-100 font-medium">
            {kbm.todayDate}
          </span>
        </div>

        {/* Session selector */}
        {kbm.sessions.length > 0 ? (
          <select
            value={kbm.selectedSessionId ?? ""}
            onChange={(e) => kbm.setSelectedSessionId(e.target.value)}
            className="w-full bg-blue-800/50 text-white text-sm font-bold rounded-xl p-2 mt-2 border border-blue-400/30 outline-none"
          >
            {kbm.sessions.map((s) => (
              <option key={s.id} value={s.id} className="text-slate-800">
                {s.classLabel} — {s.subject} (Jam {s.startPeriod}{s.durationJP > 1 ? ` - ${s.startPeriod + s.durationJP - 1}` : ""})
              </option>
            ))}
          </select>
        ) : (
          <h1 className="text-lg font-bold leading-tight mt-1">Tidak ada sesi hari ini</h1>
        )}

        {kbm.selectedSession && (
          <p className="text-xs text-blue-100/90 mt-1">
            Jam Ke: <span className="font-semibold text-white">
              {kbm.selectedSession.startPeriod}{kbm.selectedSession.durationJP > 1 ? ` - ${kbm.selectedSession.startPeriod + kbm.selectedSession.durationJP - 1}` : ""}
            </span>
          </p>
        )}
      </div>

      {/* Notice */}
      {kbm.notice && (
        <div className={`p-3 rounded-xl text-xs font-bold text-center ${
          kbm.notice.includes("berhasil") ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
        }`}>
          {kbm.notice}
          <button onClick={() => kbm.setNotice(null)} className="ml-2 opacity-60">✕</button>
        </div>
      )}

      {/* No session */}
      {!kbm.selectedSession && (
        <EmptyState title="Tidak ada sesi mengajar hari ini" description="Buat jadwal terlebih dahulu dari menu Jadwal." />
      )}

      {kbm.selectedSession && (
        <>
          {/* STEP 1: PRESENSI */}
          <AccordionCard
            step={1}
            title="Presensi Siswa"
            subtitle={kbm.presensiStep === "done" ? "Presensi selesai diisi" : "Klik untuk isi presensi (Default Hadir)"}
            state={kbm.presensiStep}
            defaultOpen={kbm.presensiStep === "active"}
          >
            {/* Summary stats */}
            <div className="grid grid-cols-5 gap-2 mb-3 text-center">
              {ATTENDANCE_STATUS_OPTIONS.map((opt) => {
                const key = opt.value as keyof typeof kbm.summary;
                return (
                  <MiniStat
                    key={opt.value}
                    label={opt.short}
                    value={kbm.summary[key] as number}
                    color={opt.textColor}
                  />
                );
              })}
            </div>

            {/* Student rows — using shared StudentRow component */}
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {kbm.effectiveRecords.map((record, idx) => (
                <StudentRow
                  key={record.id}
                  number={idx + 1}
                  name={record.studentName}
                  status={record.status}
                  onStatusChange={(status) => kbm.setStatus(record.studentId, status)}
                  compact
                />
              ))}
            </div>

            {kbm.records.length > 0 && (
              <button
                onClick={kbm.donePresensi}
                className="w-full bg-blue-600 text-white text-xs font-bold py-2.5 rounded-xl mt-3 active:scale-[0.98] transition-transform"
              >
                Selesai Presensi (Lanjut Jurnal)
              </button>
            )}
          </AccordionCard>

          {/* STEP 2: JURNAL MENGAJAR */}
          <AccordionCard
            step={2}
            title="Jurnal Mengajar"
            subtitle={kbm.jurnalStep === "done" ? "Jurnal selesai diisi" : "Isi materi & kegiatan pembelajaran"}
            state={kbm.jurnalStep}
            defaultOpen={kbm.jurnalStep === "active"}
          >
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  Materi / Tujuan Pembelajaran
                </label>
                <textarea
                  value={kbm.journalInput.actualMaterialTitle}
                  onChange={(e) => kbm.setJournalInput((prev) => ({ ...prev, actualMaterialTitle: e.target.value }))}
                  placeholder="Tulis materi yang diajarkan..."
                  rows={2}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-800 outline-none resize-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  Catatan / Kegiatan
                </label>
                <textarea
                  value={kbm.journalInput.note}
                  onChange={(e) => kbm.setJournalInput((prev) => ({ ...prev, note: e.target.value }))}
                  placeholder="Catatan tambahan (opsional)..."
                  rows={2}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-800 outline-none resize-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  Tidak Hadir (Auto-Sync)
                </label>
                <input
                  type="text"
                  readOnly
                  value={kbm.absentList.length > 0 ? kbm.absentList.join(", ") : "Nihil (-)"}
                  className="w-full bg-slate-100 border border-slate-200 text-slate-500 rounded-xl p-2 text-xs outline-none"
                />
              </div>

              <button
                onClick={kbm.doneJurnal}
                className="w-full bg-blue-600 text-white text-xs font-bold py-2.5 rounded-xl mt-1 active:scale-[0.98] transition-transform"
              >
                Selesai Isi Jurnal
              </button>
            </div>
          </AccordionCard>

          {/* STEP 3: NILAI OPSIONAL */}
          {kbm.nilaiStep === "active" && (
            <div>
              <button
                onClick={() => kbm.setShowNilaiSheet(true)}
                className="w-full active:scale-[0.98] transition-transform bg-amber-50 border border-amber-200 text-amber-800 p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">📝</span>
                  <div className="text-left">
                    <p className="font-bold">Input Nilai Ulangan Hari Ini?</p>
                    <p className="text-[10px] text-amber-600 font-normal">Klik jika ada pengambilan nilai (Opsional)</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  kbm.nilaiMap.size > 0
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-200 text-amber-900"
                }`}>
                  {kbm.nilaiMap.size > 0 ? "Nilai Terisi" : "+ Isi Nilai"}
                </span>
              </button>
            </div>
          )}

          {/* BOTTOM BAR: SIMPAN */}
          {kbm.showBottomBar && (
            <div className="sticky bottom-4 z-10 bg-white border border-slate-200 p-3.5 rounded-2xl shadow-lg">
              <button
                onClick={kbm.saveAll}
                disabled={kbm.saving}
                className={`w-full font-bold py-3.5 px-4 rounded-xl text-sm flex justify-center items-center gap-2 transition-all active:scale-[0.98] ${
                  kbm.saving
                    ? "bg-slate-400 text-white cursor-wait"
                    : "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700"
                }`}
              >
                {kbm.saving ? (
                  <>
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                    Menyimpan...
                  </>
                ) : (
                  <>SIMPAN SEMUA DATA KBM</>
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* Bottom Sheet: Nilai Input — using shared BottomSheet */}
      <BottomSheet
        open={kbm.showNilaiSheet}
        onClose={() => kbm.setShowNilaiSheet(false)}
        title="Form Nilai Ulangan"
        action={
          <button
            onClick={() => kbm.setShowNilaiSheet(false)}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl text-xs"
          >
            Selesai Isi Nilai
          </button>
        }
      >
        {kbm.effectiveRecords.map((record) => (
          <div key={record.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl">
            <span className="text-xs font-semibold text-slate-700 truncate max-w-[60%]">
              {record.studentName}
            </span>
            <input
              type="number"
              placeholder="0-100"
              min={0}
              max={100}
              value={kbm.nilaiMap.get(record.studentId) ?? ""}
              onChange={(e) => {
                const val = e.target.value === "" ? null : parseInt(e.target.value, 10);
                kbm.setNilai(record.studentId, val !== null && !isNaN(val) ? val : null);
              }}
              className="w-20 bg-white border border-slate-300 rounded-lg p-1.5 text-center text-xs font-bold outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
        ))}
      </BottomSheet>
    </div>
  );
}
