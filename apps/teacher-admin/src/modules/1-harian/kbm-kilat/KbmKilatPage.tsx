/**
 * KbmKilatPage — Mode KBM Kilat: Accordion flow cepat isi KBM.
 *
 * V4: REFACTOR TOTAL & COMPLETION
 *   - Smart Selector Card (always-visible cascading dropdowns)
 *   - MULAI KBM SESI INI action button
 *   - Realization Status (Terlaksana / Tidak Terlaksana / Diganti)
 *   - Copy Journal from previous session
 *   - Structured Note with 4 Category Tabs (progressive disclosure)
 *   - Journal Finalize & Lock (isFinalized / locked)
 *   - Read-only mode when locked
 *   - Toast notification feedback
 *
 * Flow: Smart Selector → Presensi → Jurnal → (Opsional) Nilai → Simpan/Finalisasi
 * Guru mengisi seluruh KBM satu sesi dalam 1 layar, step-by-step.
 *
 * DOMAIN-BOUNDARY: Module 1-harian, presentation component only.
 * Import dari @shared/ui/mobile, @shared/constants, dan useKbmSession saja.
 */

import { useEffect } from "react";
import {
  useKbmSession,
  STRUCTURED_NOTE_CATEGORIES,
  STRUCTURED_CHIPS,
  REALIZATION_STATUS_OPTIONS,
  NILAI_TYPE_OPTIONS,
} from "./useKbmSession";
import { LoadingState, EmptyState, Toast, useToast } from "@shared/ui";
import type { UseToastReturn } from "@shared/ui/Toast";
import { AccordionCard, MiniStat, StudentRow } from "@shared/ui/mobile";
import { ATTENDANCE_STATUS_OPTIONS } from "@shared/constants/attendance-status";

/* ============================================================ */
/*  Component                                                    */
/* ============================================================ */

export function KbmKilatPage() {
  const kbm = useKbmSession();
  const toast = useToast();

  /* ---- Render ---- */
  if (kbm.loading) return <LoadingState />;
  if (!kbm.year) return <EmptyState title="Belum ada tahun pelajaran aktif" />;

  return (
    <div className="max-w-md mx-auto px-3 pb-28">
      {/* ========== HEADER — SMART SELECTOR CARD ========== */}
      <header className="bg-gradient-to-br from-blue-700 via-indigo-700 to-indigo-800 text-white p-4 rounded-2xl shadow-lg mb-3">
        {/* Top bar */}
        <div className="flex justify-between items-center mb-3">
          <span className="bg-white/15 backdrop-blur-sm text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-white/20">
            KBM Kilat
          </span>
          <span className="text-[11px] text-blue-200 font-medium">
            {kbm.todayDate}
          </span>
        </div>

        {/* Cascading Selector: Kelas → Mapel → Sesi (ALWAYS ACTIVE) */}
        <div className="space-y-2">
          {/* 1. Kelas */}
          <div>
            <label className="block text-[10px] font-bold text-blue-200 mb-1 uppercase tracking-wider">
              Kelas
            </label>
            <select
              value={kbm.selectedClassId ?? ""}
              onChange={(e) => kbm.setSelectedClassId(e.target.value)}
              className="w-full bg-white/15 backdrop-blur-sm text-white text-sm font-bold rounded-xl p-2.5 border border-white/20 outline-none focus:bg-white/20 transition-colors"
            >
              <option value="" className="text-slate-800">Pilih Kelas...</option>
              {kbm.classOptions.map((c) => (
                <option key={c.classId} value={c.classId} className="text-slate-800">
                  {c.classLabel}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Mapel */}
          {kbm.selectedClassId && (
            <div>
              <label className="block text-[10px] font-bold text-blue-200 mb-1 uppercase tracking-wider">
                Mapel
              </label>
              <select
                value={kbm.selectedSubject ?? ""}
                onChange={(e) => kbm.setSelectedSubject(e.target.value)}
                className="w-full bg-white/15 backdrop-blur-sm text-white text-sm font-bold rounded-xl p-2.5 border border-white/20 outline-none focus:bg-white/20 transition-colors"
              >
                <option value="" className="text-slate-800">Pilih Mapel...</option>
                {kbm.subjectOptions.map((s) => (
                  <option key={s.subject} value={s.subject} className="text-slate-800">
                    {s.subject}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 3. Sesi (Pertemuan Ke-X) */}
          {kbm.selectedSubject && (
            <div>
              <label className="block text-[10px] font-bold text-blue-200 mb-1 uppercase tracking-wider">
                Sesi
              </label>
              <select
                value={kbm.selectedSessionId ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "__tambahan__") {
                    kbm.handlePertemuanTambahan();
                  } else {
                    kbm.setSelectedSessionId(val);
                  }
                }}
                className="w-full bg-white/15 backdrop-blur-sm text-white text-sm font-bold rounded-xl p-2.5 border border-white/20 outline-none focus:bg-white/20 transition-colors"
              >
                <option value="" className="text-slate-800">Pilih Pertemuan...</option>
                {kbm.filteredSessions.map((s) => (
                  <option key={s.session.id} value={s.session.id} className="text-slate-800">
                    {s.statusIcon} Pertemuan Ke-{s.meetingNumber} ({s.session.date.slice(5)} &bull; {s.statusLabel})
                  </option>
                ))}
                <option value="__tambahan__" className="text-slate-800 font-bold">
                  ➕ Pertemuan Tambahan / Luar Jadwal
                </option>
              </select>
            </div>
          )}
        </div>

        {/* MULAI KBM SESI INI — action button inside header */}
        {kbm.selectedClassId && kbm.selectedSubject && !kbm.selectedSessionId && (
          <button
            onClick={kbm.handlePertemuanTambahan}
            className="w-full mt-3 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm font-bold py-3 px-4 rounded-xl active:scale-[0.98] transition-transform shadow-sm flex items-center justify-center gap-2 hover:bg-white/25"
          >
            <span className="text-base">🚀</span>
            MULAI KBM SESI INI
          </button>
        )}
      </header>

      {/* Toast notification */}
      {toast.toast && (
        <Toast
          toast={toast.toast}
          onDismiss={toast.dismiss}
        />
      )}

      {/* No assignments at all — teacher hasn't set up any classes */}
      {kbm.classOptions.length === 0 && !kbm.loading && (
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5 text-center shadow-sm">
          <p className="text-base font-bold text-amber-800 mb-1">Belum Ada Kelas Mengajar</p>
          <p className="text-xs text-amber-600 mb-3">
            Tambahkan kelas dan mata pelajaran terlebih dahulu melalui menu Penugasan Mengajar.
          </p>
          <button
            onClick={() => window.location.hash = "/assignments"}
            className="bg-amber-600 text-white text-xs font-bold px-4 py-2 rounded-xl active:scale-[0.98] transition-transform"
          >
            Ke Penugasan Mengajar
          </button>
        </div>
      )}

      {/* Class+Subject selected but no session — show CTA inside header already, extra info here */}
      {kbm.selectedSubject && kbm.hasNoSessions && !kbm.selectedSession && (
        <div className="bg-blue-50 rounded-2xl border border-blue-200 p-5 text-center shadow-sm">
          <div className="text-3xl mb-2">📝</div>
          <p className="text-sm font-bold text-blue-800 mb-1">Belum Ada Sesi untuk Kelas & Mapel Ini</p>
          <p className="text-xs text-blue-600 mb-4">
            Anda bisa langsung membuat sesi baru tanpa jadwal.
          </p>
          <button
            onClick={kbm.handlePertemuanTambahan}
            className="w-full bg-blue-600 text-white text-sm font-bold py-3 px-4 rounded-xl active:scale-[0.98] transition-transform shadow-sm flex items-center justify-center gap-2"
          >
            <span className="text-base">🚀</span>
            MULAI KBM SESI INI
          </button>
        </div>
      )}

      {/* ========== SESSION SELECTED — SHOW ACCORDION STEPS ========== */}
      {kbm.selectedSession && (
        <>
          {/* Finalized badge */}
          {kbm.isFinalized && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 mb-3 flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                🔒 TERKUNCI — Jurnal sudah difinalisasi
              </span>
              <button
                onClick={kbm.handleUnlock}
                className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-lg active:scale-95 transition-transform"
              >
                🔓 Buka Kunci
              </button>
            </div>
          )}

          {/* ========== STEP 1: PRESENSI ========== */}
          <AccordionCard
            step={1}
            title="Presensi Siswa"
            subtitle={kbm.presensiStep === "done" ? "Presensi selesai" : "Isi presensi (Default: Hadir)"}
            state={kbm.presensiStep}
            defaultOpen={kbm.presensiStep === "active"}
            stepColor="green"
          >
            {/* Summary stats */}
            <div className="grid grid-cols-5 gap-1.5 mb-3 text-center">
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

            {/* Quick action: Set Semua Hadir */}
            <button
              onClick={kbm.setAllPresent}
              disabled={kbm.isFinalized}
              className="w-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold py-2 rounded-xl mb-3 active:scale-[0.98] transition-transform flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-sm">⚡</span>
              Set Semua Hadir
            </button>

            {/* Student rows */}
            <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
              {kbm.effectiveRecords.map((record, idx) => {
                const isNotHadir = record.status !== "present" && record.status !== "late";
                const note = kbm.noteMap.get(record.studentId) ?? "";

                return (
                  <div key={record.id}>
                    <StudentRow
                      number={idx + 1}
                      name={record.studentName}
                      status={record.status}
                      onStatusChange={kbm.isFinalized ? () => {} : (status) => kbm.setStatus(record.studentId, status)}
                      compact
                    />
                    {/* Conditional note field — only when status ≠ Hadir */}
                    {isNotHadir && !kbm.isFinalized && (
                      <div className="mt-0.5 ml-2 mb-1">
                        <input
                          type="text"
                          placeholder="💬 Catatan (opsional)..."
                          value={note}
                          onChange={(e) => kbm.setStudentNote(record.studentId, e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-600 outline-none focus:ring-1 focus:ring-blue-300 placeholder:text-slate-400"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {kbm.records.length > 0 && !kbm.isFinalized && (
              <button
                onClick={kbm.donePresensi}
                className="w-full bg-emerald-600 text-white text-xs font-bold py-2.5 rounded-xl mt-3 active:scale-[0.98] transition-transform shadow-sm"
              >
                ✓ Selesai Presensi (Lanjut Jurnal)
              </button>
            )}
          </AccordionCard>

          {/* ========== STEP 2: JURNAL MENGAJAR ========== */}
          <AccordionCard
            step={2}
            title="Jurnal Mengajar"
            subtitle={kbm.jurnalStep === "done" ? "Jurnal selesai" : "Isi materi & kegiatan pembelajaran"}
            state={kbm.jurnalStep}
            defaultOpen={kbm.jurnalStep === "active"}
            stepColor="blue"
          >
            <div className="space-y-3">
              {/* ---- A. Realization Status ---- */}
              <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Status Keterlaksanaan</p>
                </div>
                <select
                  value={kbm.realizationStatus}
                  onChange={(e) => kbm.setRealizationStatus(e.target.value as "done" | "continued" | "cancelled")}
                  disabled={kbm.isFinalized}
                  className={`text-xs font-bold rounded-lg px-2.5 py-1.5 outline-none border disabled:opacity-50 ${
                    kbm.realizationStatus === "done"
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                      : kbm.realizationStatus === "continued"
                        ? "bg-amber-100 text-amber-700 border-amber-200"
                        : "bg-rose-100 text-rose-700 border-rose-200"
                  }`}
                >
                  {REALIZATION_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reason field — shown when not "done" */}
              {kbm.realizationStatus !== "done" && !kbm.isFinalized && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Alasan {kbm.realizationStatus === "continued" ? "Penggantian" : "Ketidaklaksanaan"}
                  </label>
                  <input
                    type="text"
                    value={kbm.realizationReason}
                    onChange={(e) => kbm.setRealizationReason(e.target.value)}
                    placeholder="Tulis alasan..."
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              )}

              {/* ---- B. Copy Journal from previous session ---- */}
              {!kbm.isFinalized && (
                <button
                  onClick={kbm.handleCopyPreviousJournal}
                  className="w-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold py-2 rounded-xl active:scale-[0.98] transition-transform flex items-center justify-center gap-1.5"
                >
                  <span className="text-sm">📋</span>
                  Salin Jurnal Lalu
                </button>
              )}

              {/* ---- C. Materi / TP ---- */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  📌 Materi / Tujuan Pembelajaran
                </label>
                <textarea
                  value={kbm.journalInput.actualMaterialTitle}
                  onChange={(e) => kbm.setJournalInput((prev) => ({ ...prev, actualMaterialTitle: e.target.value }))}
                  placeholder="Tulis materi yang diajarkan..."
                  rows={2}
                  disabled={kbm.isFinalized}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none resize-none focus:ring-2 focus:ring-blue-300 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>

              {/* ---- D. Structured Note — 4 Category Tabs ---- */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1.5">
                  📝 Catatan Terstruktur
                </label>

                {/* Horizontal Category Tabs */}
                <div className="flex gap-1 mb-2 overflow-x-auto no-scrollbar">
                  {STRUCTURED_NOTE_CATEGORIES.map((cat) => {
                    const isActive = kbm.activeCategoryTab === cat.key;
                    const count = kbm.structuredNote[cat.key].length;
                    return (
                      <button
                        key={cat.key}
                        onClick={() => kbm.setActiveCategoryTab(cat.key)}
                        disabled={kbm.isFinalized}
                        className={`shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all active:scale-95 whitespace-nowrap disabled:opacity-50 ${
                          isActive
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {cat.icon} {cat.label}
                        {count > 0 && (
                          <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] ${
                            isActive ? "bg-white/20" : "bg-blue-100 text-blue-600"
                          }`}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Chips for active category */}
                {!kbm.isFinalized && (
                  <div className="flex flex-wrap gap-1.5">
                    {STRUCTURED_CHIPS[kbm.activeCategoryTab].map((chip) => {
                      const isActive = kbm.structuredNote[kbm.activeCategoryTab].includes(chip);
                      return (
                        <button
                          key={chip}
                          onClick={() => kbm.toggleStructuredChip(kbm.activeCategoryTab, chip)}
                          className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all active:scale-95 ${
                            isActive
                              ? "bg-blue-600 text-white shadow-sm"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {isActive && "✓ "}{chip}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Selected chips summary (when finalized) */}
                {kbm.isFinalized && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-600">
                    {STRUCTURED_NOTE_CATEGORIES.map((cat) => {
                      const items = kbm.structuredNote[cat.key];
                      if (items.length === 0) return null;
                      return (
                        <div key={cat.key} className="mb-1 last:mb-0">
                          <span className="font-bold">{cat.icon} {cat.label}:</span> {items.join(", ")}
                        </div>
                      );
                    })}
                    {Object.values(kbm.structuredNote).every((arr) => arr.length === 0) && (
                      <span className="text-slate-400">Tidak ada catatan terstruktur</span>
                    )}
                  </div>
                )}
              </div>

              {/* ---- E. Tidak Hadir (Auto-Sync) ---- */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  Tidak Hadir (Auto-Sync dari Presensi)
                </label>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-500">
                  {kbm.absentList.length > 0 ? kbm.absentList.join(", ") : "Nihil (-)"}
                </div>
              </div>

              {/* ---- F. Narasi Jurnal (Auto-Generated & Editable) ---- */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  📝 Narasi Jurnal
                  <span className="text-blue-500 font-normal ml-1">(Auto-Generated)</span>
                </label>
                <textarea
                  value={kbm.autoNarasi}
                  readOnly
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-600 outline-none resize-none"
                />
              </div>

              {/* Catatan tambahan (free note) */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  ✏️ Catatan Tambahan
                </label>
                <textarea
                  value={kbm.journalInput.note}
                  onChange={(e) => kbm.setJournalInput((prev) => ({ ...prev, note: e.target.value }))}
                  placeholder="Catatan bebas tambahan..."
                  rows={2}
                  disabled={kbm.isFinalized}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none resize-none focus:ring-2 focus:ring-blue-300 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>

              {/* Step 2 action buttons */}
              {!kbm.isFinalized && (
                <button
                  onClick={kbm.doneJurnal}
                  className="w-full bg-blue-600 text-white text-xs font-bold py-2.5 rounded-xl mt-1 active:scale-[0.98] transition-transform shadow-sm"
                >
                  ✓ Selesai Isi Jurnal
                </button>
              )}
            </div>
          </AccordionCard>

          {/* ========== STEP 3: NILAI / ASESMEN ========== */}
          <AccordionCard
            step={3}
            title="Asesmen / Nilai"
            subtitle={
              kbm.nilaiStep === "done"
                ? "Nilai sudah diisi"
                : kbm.nilaiToggle
                  ? "Input nilai siswa"
                  : "Opsional — aktifkan jika ada pengambilan nilai"
            }
            state={kbm.nilaiStep}
            defaultOpen={kbm.nilaiStep === "active" && kbm.nilaiToggle}
            stepColor="amber"
          >
            {/* Toggle ON/OFF */}
            <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3 mb-3">
              <div>
                <p className="text-xs font-bold text-slate-700">Pengambilan Nilai Hari Ini?</p>
                <p className="text-[10px] text-slate-500">Aktifkan jika ada ulangan/asesmen</p>
              </div>
              <button
                onClick={() => kbm.setNilaiToggle(!kbm.nilaiToggle)}
                disabled={kbm.isFinalized}
                className={`relative w-12 h-7 rounded-full transition-colors ${
                  kbm.nilaiToggle ? "bg-emerald-500" : "bg-slate-300"
                } disabled:opacity-50`}
                role="switch"
                aria-checked={kbm.nilaiToggle}
              >
                <span
                  className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${
                    kbm.nilaiToggle ? "translate-x-[22px]" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {/* Nilai form — only when toggle ON */}
            {kbm.nilaiToggle && (
              <div className="space-y-3">
                {/* Jenis Nilai selector */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">
                    Jenis Nilai
                  </label>
                  <select
                    value={kbm.nilaiType}
                    onChange={(e) => kbm.setNilaiType(e.target.value)}
                    disabled={kbm.isFinalized}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-slate-50"
                  >
                    {NILAI_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Student nilai input */}
                <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
                  {kbm.effectiveRecords.map((record) => {
                    const isAbsent = record.status !== "present" && record.status !== "late";
                    return (
                      <div
                        key={record.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl ${
                          isAbsent ? "bg-slate-50 opacity-60" : "bg-white border border-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-semibold text-slate-700 truncate">
                            {record.studentName}
                          </span>
                          {isAbsent && (
                            <span className="text-[9px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-full">
                              {record.status === "sick" ? "Sakit" : record.status === "excused" ? "Izin" : "Alpa"}
                            </span>
                          )}
                        </div>
                        <input
                          type="number"
                          placeholder="--"
                          min={0}
                          max={100}
                          disabled={isAbsent || kbm.isFinalized}
                          value={kbm.nilaiMap.get(record.studentId) ?? ""}
                          onChange={(e) => {
                            const val = e.target.value === "" ? null : parseInt(e.target.value, 10);
                            kbm.setNilai(record.studentId, val !== null && !isNaN(val) ? val : null);
                          }}
                          className="w-16 bg-white border border-slate-300 rounded-lg p-1.5 text-center text-xs font-bold outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </AccordionCard>
        </>
      )}

      {/* Bridge: notice → toast */}
      <KbmNoticeToaster notice={kbm.notice} onConsumed={() => kbm.setNotice(null)} toast={toast} />

      {/* ========== STICKY BOTTOM: SIMPAN & FINALISASI ========== */}
      {kbm.showBottomBar && kbm.selectedSession && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="max-w-md mx-auto space-y-2">
            {/* Main save button */}
            {!kbm.isFinalized && (
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
                  <>
                    <span className="text-base">💾</span>
                    SIMPAN & SELESAIKAN KBM SESI INI
                  </>
                )}
              </button>
            )}

            {/* Finalize & Lock button */}
            {!kbm.isFinalized && (
              <button
                onClick={kbm.handleFinalize}
                className="w-full bg-amber-600 text-white text-xs font-bold py-2.5 rounded-xl active:scale-[0.98] transition-transform shadow-sm flex items-center justify-center gap-2 hover:bg-amber-700"
              >
                🔒 KUNCI & FINALISASI JURNAL
              </button>
            )}

            {/* Unlock button (shown when finalized) */}
            {kbm.isFinalized && (
              <button
                onClick={kbm.handleUnlock}
                className="w-full bg-amber-100 text-amber-800 text-xs font-bold py-2.5 rounded-xl active:scale-[0.98] transition-transform flex items-center justify-center gap-2 hover:bg-amber-200"
              >
                🔓 Buka Kunci Jurnal
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================ */
/*  Bridge: notice → toast                                       */
/* ============================================================ */

/**
 * KbmNoticeToaster — Bridges useKbmSession's `notice` to useToast.
 */
function KbmNoticeToaster({
  notice,
  onConsumed,
  toast,
}: {
  notice: string | null;
  onConsumed: () => void;
  toast: UseToastReturn;
}) {
  useEffect(() => {
    if (!notice) return;
    const isSuccess = notice.toLowerCase().includes("berhasil");
    toast.show(notice, {
      variant: isSuccess ? "success" : "error",
      duration: 4000,
    });
    onConsumed();
  }, [notice, onConsumed, toast]);

  return null;
}
