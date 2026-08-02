/**
 * PIKET-REDESIGN: Tab "Laporkan" — Catat pelanggaran siswa dengan cepat.
 *
 * Perubahan dari versi sebelumnya:
 *   - Bahasa ramah: "Laporkan Pelanggaran" bukan "Catat Pelanggaran Cepat"
 *   - Layout lebih lega: space-y-4, padding p-4, font text-sm minimum
 *   - Touch target lebih besar: py-2.5 minimum, px-4
 *   - "Sering Terjadi" untuk popular rules (bukan "1-Tap")
 *   - "Catat Beruntun" bukan "Kunci Aturan (Batch Mode)"
 *   - Panduan langkah yang jelas
 */

import { useState } from "react";
import { Card, CardHeader, Input, Button, EmptyState, Textarea } from "@shared/ui";
import { Chip } from "./Chip";
import { categoryLabel } from "./utils";
import type { ClassRoster, DutyRule, StudentSearchable } from "@guru-admin/domain";

interface CatatPelanggaranViewProps {
  catatClassFilter: string;
  setCatatClassFilter: (f: string) => void;
  studentQuery: string;
  setStudentQuery: (q: string) => void;
  ruleQuery: string;
  setRuleQuery: (q: string) => void;
  selectedStudent: StudentSearchable | null;
  handleSelectStudent: (s: StudentSearchable) => void;
  selectedRule: DutyRule | null;
  setSelectedRule: (r: DutyRule | null) => void;
  catatan: string;
  setCatatan: (n: string) => void;
  tindakLanjut: string;
  setTindakLanjut: (n: string) => void;
  reportFinalized: boolean;
  rosters: ClassRoster[];
  filteredStudents: StudentSearchable[];
  filteredRules: DutyRule[];
  handleCatat: () => Promise<void>;
  isSubmitting: boolean;
  batchMode: boolean;
  setBatchMode: (b: boolean) => void;
  popularRules: DutyRule[];
}

export function CatatPelanggaranView(props: CatatPelanggaranViewProps) {
  const {
    catatClassFilter, setCatatClassFilter,
    studentQuery, setStudentQuery,
    ruleQuery, setRuleQuery,
    selectedStudent, handleSelectStudent,
    selectedRule, setSelectedRule,
    catatan, setCatatan,
    tindakLanjut, setTindakLanjut,
    reportFinalized,
    rosters,
    filteredStudents,
    filteredRules,
    handleCatat,
    isSubmitting,
    batchMode,
    setBatchMode,
    popularRules,
  } = props;

  const canSave = selectedStudent && selectedRule && !reportFinalized && !isSubmitting;

  // Smart Hide: apakah rule yang dipilih berasal dari preset?
  const isPresetRuleSelected = selectedRule
    ? popularRules.some((r) => r.id === selectedRule.id)
    : false;
  const [showRuleSearch, setShowRuleSearch] = useState(false);
  const shouldShowRuleSearch = showRuleSearch || !isPresetRuleSelected;

  // Collapsible Catatan & Tindak Lanjut
  const [showNotes, setShowNotes] = useState(false);

  return (
    <div className="space-y-4 pb-40">
      {/* ─── Panduan Langkah ─── */}
      {!selectedStudent && !selectedRule && (
        <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm font-medium text-blue-800">Cara melaporkan pelanggaran:</p>
          <ol className="text-sm text-blue-700 mt-1 space-y-0.5 list-decimal list-inside">
            <li>Pilih jenis pelanggaran</li>
            <li>Cari dan pilih siswa</li>
            <li>Tekan tombol <strong>Simpan</strong></li>
          </ol>
        </div>
      )}

      {/* ─── Step 1: Pilih Jenis Pelanggaran ─── */}
      <Card>
        <CardHeader
          title="⚡ Pilih Jenis Pelanggaran"
          description="Pilih yang sering terjadi, atau cari jenis lainnya"
        />
        {rosters.length === 0 ? (
          <EmptyState
            title="Belum ada data kelas"
            description="Tambahkan data kelas dan siswa dulu sebelum mencatat pelanggaran."
            action={<Button variant="secondary" onClick={() => (window.location.hash = "#/roster")}>Buka Data Siswa</Button>}
          />
        ) : (
          <>
            {reportFinalized && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 mb-3">
                ⚠ Laporan hari ini sudah selesai. Buka revisi di tab <strong>Catatan</strong> jika perlu mengubah.
              </div>
            )}

            {/* Popular rule chips */}
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Sering Terjadi</label>
                <div className="flex gap-2 flex-wrap">
                  {popularRules.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setSelectedRule(selectedRule?.id === r.id ? null : r);
                        setShowRuleSearch(false);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border-2 ${
                        selectedRule?.id === r.id
                          ? "border-brand-500 bg-brand-50 text-brand-700 shadow-sm"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-base">
                        {r.type === "late" ? "⏰" : r.type === "incomplete_uniform" ? "👔" : r.type === "skipping_class" ? "🚪" : "📋"}
                      </span>
                      <span>{r.label}</span>
                      <span className="text-xs opacity-60">+{r.points}</span>
                    </button>
                  ))}
                  {/* "Lainnya" button */}
                  <button
                    type="button"
                    onClick={() => setShowRuleSearch(!showRuleSearch)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium border-2 border-dashed transition-all ${
                      showRuleSearch
                        ? "border-brand-400 bg-brand-50 text-brand-600"
                        : "border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-600"
                    }`}
                  >
                    <span>{showRuleSearch ? "✕" : "＋"}</span>
                    <span>{showRuleSearch ? "Tutup" : "Lainnya"}</span>
                  </button>
                </div>
              </div>

              {/* ─── Catat Beruntun (Batch Mode) ─── */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <span className="text-lg">🔒</span>
                  <div>
                    <p className="text-sm font-medium text-slate-700">Catat Beruntun</p>
                    <p className="text-xs text-slate-500">Kunci jenis pelanggaran untuk catat banyak siswa sekaligus</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={batchMode}
                  onClick={() => setBatchMode(!batchMode)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 ${
                    batchMode ? "bg-brand-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      batchMode ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {batchMode && selectedRule && (
                <div className="p-3 bg-brand-50 border border-brand-200 rounded-xl text-sm text-brand-700">
                  🔒 Jenis pelanggaran terkunci: <strong>{selectedRule.label}</strong> (+{selectedRule.points} poin). Pilih siswa berikutnya lalu simpan — jenis pelanggaran tidak akan berubah.
                </div>
              )}
            </div>
          </>
        )}
      </Card>

      {/* ─── Step 2: Cari Siswa ─── */}
      <Card>
        <CardHeader
          title="👤 Pilih Siswa"
          description="Filter kelas lalu cari nama siswa"
        />
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Pilih kelas</label>
            <div className="flex gap-2 flex-wrap">
              <Chip active={catatClassFilter === "all"} onClick={() => setCatatClassFilter("all")}>Semua</Chip>
              {rosters.map((r) => (
                <Chip key={r.classId} active={catatClassFilter === r.classId} onClick={() => setCatatClassFilter(r.classId)}>
                  {r.classLabel}
                </Chip>
              ))}
            </div>
          </div>

          <Input
            label="🔍 Cari nama siswa"
            id="student-search"
            value={studentQuery}
            onChange={setStudentQuery}
            placeholder="Ketik nama atau NIS..."
          />
          {filteredStudents.length === 0 ? (
            <p className="text-sm text-slate-500 py-2">Tidak ada siswa ditemukan.</p>
          ) : (
            <ul className="space-y-1 max-h-56 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
              {filteredStudents.slice(0, 30).map((s) => (
                <li key={`${s.classId}-${s.id}`}>
                  <button
                    type="button"
                    onClick={() => handleSelectStudent(s)}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                      selectedStudent?.id === s.id && selectedStudent?.classId === s.classId
                        ? "bg-brand-50 border-l-4 border-brand-500"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <span className="font-medium">{s.name}</span>
                    <span className="text-xs text-slate-500 ml-2">
                      {s.classLabel}{s.nis ? ` · NIS ${s.nis}` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      {/* ─── Cari Jenis Pelanggaran Lainnya ─── */}
      {shouldShowRuleSearch && (
        <Card>
          <CardHeader
            title="🔍 Cari Jenis Pelanggaran Lainnya"
            description="Ketik untuk mencari jenis pelanggaran"
          />
          <div className="space-y-3">
            <Input
              label="Cari pelanggaran"
              id="rule-search"
              value={ruleQuery}
              onChange={setRuleQuery}
              placeholder="Ketik nama atau kategori..."
            />
            {filteredRules.length === 0 ? (
              <p className="text-sm text-slate-500 py-2">Tidak ditemukan.</p>
            ) : (
              <ul className="space-y-1 max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
                {filteredRules.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRule(selectedRule?.id === r.id ? null : r);
                        setShowRuleSearch(false);
                      }}
                      className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                        selectedRule?.id === r.id
                          ? "bg-brand-50 border-l-4 border-brand-500"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <span className="font-medium">{r.label}</span>
                      <span className="text-xs text-slate-500 ml-2">
                        {categoryLabel(r.category)} · {r.points} poin
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      )}

      {/* ─── Ringkasan Pilihan ─── */}
      {(selectedStudent || selectedRule) && (
        <div className="flex items-center gap-3 flex-wrap px-4 py-3 bg-slate-50 rounded-xl text-sm border border-slate-200">
          {selectedStudent && (
            <span className="inline-flex items-center gap-1.5">
              <span>👤</span>
              <span className="font-medium">{selectedStudent.name}</span>
              <span className="text-xs text-slate-500">{selectedStudent.classLabel}</span>
            </span>
          )}
          {selectedStudent && selectedRule && <span className="text-slate-300">→</span>}
          {selectedRule && (
            <span className="inline-flex items-center gap-1.5">
              <span>📋</span>
              <span>{selectedRule.label}</span>
              <span className="text-xs text-slate-500">+{selectedRule.points} poin</span>
            </span>
          )}
        </div>
      )}

      {/* ─── Catatan & Tindak Lanjut (Collapsible) ─── */}
      <Card>
        <button
          type="button"
          onClick={() => setShowNotes(!showNotes)}
          className="w-full flex items-center justify-between text-sm font-medium text-slate-700 py-1"
        >
          <span className="flex items-center gap-2">
            <span>💬</span>
            <span>Catatan Tambahan</span>
            {(catatan || tindakLanjut) && <span className="text-xs text-brand-600">(terisi)</span>}
          </span>
          <span className={`text-slate-400 transition-transform duration-200 ${showNotes ? "rotate-180" : ""}`}>▾</span>
        </button>
        {showNotes && (
          <div className="space-y-3 mt-3">
            <Textarea
              label={`Catatan${selectedRule?.type === "other" ? " (wajib untuk Lainnya)" : " (opsional)"}`}
              id="duty-note"
              value={catatan}
              onChange={setCatatan}
              rows={2}
              placeholder="Keterangan tambahan..."
            />
            <Textarea
              label="Tindak Lanjut (opsional)"
              id="duty-followup"
              value={tindakLanjut}
              onChange={setTindakLanjut}
              rows={2}
              placeholder="Langkah yang akan diambil..."
            />
          </div>
        )}
      </Card>

      {/* ─── Floating Save Button ─── */}
      <div className="fixed bottom-[60px] inset-x-0 z-30 px-3 sm:px-4 lg:px-6 pointer-events-none">
        <div className="pointer-events-auto max-w-lg mx-auto">
          <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-lg p-3">
            <button
              type="button"
              onClick={() => void handleCatat()}
              disabled={!canSave}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                canSave
                  ? "bg-brand-600 text-white hover:bg-brand-700 active:scale-[0.98]"
                  : isSubmitting
                    ? "bg-brand-400 text-white cursor-wait"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              {isSubmitting ? (
                <>
                  <span className="loading-spinner-sm" />
                  <span>Menyimpan…</span>
                </>
              ) : (
                <>
                  <span>💾</span>
                  <span>Simpan{batchMode && selectedRule ? ` (${selectedRule.label})` : ""}</span>
                </>
              )}
            </button>
            {/* Hint text */}
            {selectedStudent && !selectedRule && (
              <p className="text-xs text-center text-slate-500 mt-1.5">Pilih jenis pelanggaran terlebih dahulu</p>
            )}
            {!selectedStudent && selectedRule && (
              <p className="text-xs text-center text-slate-500 mt-1.5">Pilih siswa terlebih dahulu</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
