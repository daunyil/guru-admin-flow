/**
 * PIKET-UI-V2: VIEW 1 — Mode Catat Pelanggaran (Express / Mobile-First)
 *
 * Fitur:
 * - Preset Chip Pelanggaran Populer (1-Tap)
 * - Flexi-Order & Smart Search (siswa ATAU aturan dulu, tidak saling hapus)
 * - Toggle "Kunci Aturan" (Batch Mode) — kunci jenis pelanggaran untuk catat beruntun
 * - Tombol Simpan Ber-Guard (Large & Sticky) — loading + auto-disable
 * - Auto-Reset Tanggal — reset draf input saat tanggal berubah (P1-2, di hook)
 */

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

  return (
    <div className="space-y-4">
      {/* ─── Preset Chips: Pelanggaran Populer (1-Tap) ─── */}
      <Card>
        <CardHeader
          title="⚡ Catat Pelanggaran Cepat"
          description="Pilih aturan dulu → cari siswa → simpan. Atau sebaliknya."
        />
        {rosters.length === 0 ? (
          <EmptyState
            title="Belum ada data kelas/siswa"
            description="Buka menu 'Kelas dan Mapel' atau import roster siswa dulu sebelum mencatat pelanggaran."
            action={<Button variant="secondary" onClick={() => (window.location.hash = "#/roster")}>Buka Roster</Button>}
          />
        ) : (
          <>
            {reportFinalized && (
              <div className="p-2 bg-amber-50 rounded text-xs text-amber-800 mb-3">
                ⚠ Laporan sudah difinalisasi. Buka revisi dulu di tab Rekap → Catatan.
              </div>
            )}

            {/* Popular rule chips */}
            <div className="space-y-3">
              <div>
                <label className="label">Pilih Aturan Cepat (1-Tap)</label>
                <div className="flex gap-2 flex-wrap">
                  {popularRules.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedRule(selectedRule?.id === r.id ? null : r)}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border-2 ${
                        selectedRule?.id === r.id
                          ? "border-brand-500 bg-brand-50 text-brand-700 shadow-sm"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-base">
                        {r.type === "late" ? "⏰" : r.type === "incomplete_uniform" ? "👔" : r.type === "skipping_class" ? "🚪" : "📋"}
                      </span>
                      <span>{r.label}</span>
                      <span className="text-xs opacity-60">+{r.points} pt</span>
                    </button>
                  ))}
                  {/* "Pilih Aturan Lainnya" button — opens rule search */}
                  {!popularRules.some((r) => selectedRule?.id === r.id) && (
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById("rule-search-section");
                        el?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium border-2 border-dashed border-slate-300 text-slate-500 hover:border-slate-400 hover:text-slate-600 transition-all"
                    >
                      <span>＋</span>
                      <span>Pilih Aturan Lainnya</span>
                    </button>
                  )}
                </div>
              </div>

              {/* ─── Batch Mode Toggle (Kunci Aturan) ─── */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-base">🔒</span>
                  <div>
                    <p className="text-sm font-medium text-slate-700">Kunci Aturan (Batch Mode)</p>
                    <p className="text-xs text-slate-500">Kunci jenis pelanggaran untuk catat puluhan siswa beruntun</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={batchMode}
                  onClick={() => setBatchMode(!batchMode)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                    batchMode ? "bg-brand-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                      batchMode ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {batchMode && selectedRule && (
                <div className="p-2 bg-brand-50 rounded text-xs text-brand-700">
                  🔒 Aturan terkunci: <strong>{selectedRule.label}</strong> (+{selectedRule.points} poin). Aturan tidak akan direset setelah simpan. Pilih siswa berikutnya → simpan.
                </div>
              )}
            </div>
          </>
        )}
      </Card>

      {/* ─── Student Search ─── */}
      <Card>
        <div className="space-y-3">
          <div>
            <label className="label">Filter kelas</label>
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
            label="🔍 Cari siswa"
            id="student-search"
            value={studentQuery}
            onChange={setStudentQuery}
            placeholder="Cari siswa... (nama / nomor / NIS)"
          />
          {filteredStudents.length === 0 ? (
            <p className="text-xs text-slate-500">Tidak ada siswa ditemukan.</p>
          ) : (
            <ul className="mt-2 space-y-1 max-h-64 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
              {filteredStudents.slice(0, 50).map((s) => (
                <li key={`${s.classId}-${s.id}`}>
                  <button
                    type="button"
                    onClick={() => handleSelectStudent(s)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      selectedStudent?.id === s.id && selectedStudent?.classId === s.classId
                        ? "bg-brand-50 border-l-2 border-brand-500"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <span className="font-medium">{s.name}</span>
                    <span className="text-xs text-slate-500 ml-2">
                      {s.classLabel} · No. {s.number ?? "-"}{s.nis ? ` · NIS ${s.nis}` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      {/* ─── Rule Search (Expanded) ─── */}
      <div id="rule-search-section">
      <Card>
        <div className="space-y-3">
          <Input
            label="🔍 Cari pelanggaran"
            id="rule-search"
            value={ruleQuery}
            onChange={setRuleQuery}
            placeholder="Cari pelanggaran... (nama / kategori / sinonim)"
          />
          {filteredRules.length === 0 ? (
            <p className="text-xs text-slate-500">Tidak ada pelanggaran ditemukan.</p>
          ) : (
            <ul className="mt-2 space-y-1 max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
              {filteredRules.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedRule(selectedRule?.id === r.id ? null : r)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      selectedRule?.id === r.id
                        ? "bg-brand-50 border-l-2 border-brand-500"
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
      </div>

      {/* ─── Selection Summary ─── */}
      {(selectedStudent || selectedRule) && (
        <Card className="bg-slate-50">
          <div className="p-3 space-y-1 text-sm">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Ringkasan Pilihan</p>
            {selectedStudent && (
              <div className="flex items-center gap-2">
                <span className="text-base">👤</span>
                <span className="font-medium">{selectedStudent.name}</span>
                <span className="text-xs text-slate-500">— {selectedStudent.classLabel}</span>
              </div>
            )}
            {selectedRule && (
              <div className="flex items-center gap-2">
                <span className="text-base">📋</span>
                <span>{selectedRule.label}</span>
                <span className="text-xs text-slate-500">· {selectedRule.points} poin</span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ─── Additional Notes ─── */}
      <Card>
        <div className="space-y-3">
          <Textarea
            label={`Catatan tambahan${selectedRule?.type === "other" ? " (wajib untuk Lainnya)" : " (opsional)"}`}
            id="duty-note"
            value={catatan}
            onChange={setCatatan}
            rows={2}
          />
          <Textarea
            label="Tindak Lanjut (opsional)"
            id="duty-followup"
            value={tindakLanjut}
            onChange={setTindakLanjut}
            rows={2}
          />
        </div>
      </Card>

      {/* ─── Sticky Save Button (Large & Guarded) ─── */}
      <div className="sticky bottom-4 z-10">
        <button
          type="button"
          onClick={() => void handleCatat()}
          disabled={!canSave}
          className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-base font-bold transition-all duration-200 shadow-lg ${
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
              <span>Simpan Catatan{batchMode && selectedRule ? ` (${selectedRule.label})` : ""}</span>
            </>
          )}
        </button>
        {!selectedStudent && selectedRule && (
          <p className="text-xs text-center text-slate-500 mt-1">Pilih siswa untuk melanjutkan</p>
        )}
        {selectedStudent && !selectedRule && (
          <p className="text-xs text-center text-slate-500 mt-1">Pilih aturan pelanggaran untuk melanjutkan</p>
        )}
      </div>
    </div>
  );
}
