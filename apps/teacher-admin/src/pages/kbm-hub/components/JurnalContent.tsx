import { useState, useCallback } from "react";
import { STRUCTURED_NOTE_CATEGORIES, STRUCTURED_CHIPS, REALIZATION_STATUS_OPTIONS } from "../constants";
import type { StructuredNoteCategory, StructuredNoteState } from "../types";

/* ============================================================ */
/*  Jurnal Content (Fixed Visual Hierarchy & Auto-Center Tab)   */
/* ============================================================ */

export interface JurnalContentProps {
  realizationStatus: string;
  setRealizationStatus: (status: "done" | "continued" | "cancelled") => void;
  realizationReason: string;
  setRealizationReason: (reason: string) => void;
  handleCopyPreviousJournal: () => void;
  journalInput: { actualMaterialTitle: string; note: string };
  setJournalInput: React.Dispatch<React.SetStateAction<{ actualMaterialTitle: string; note: string }>>;
  structuredNote: StructuredNoteState;
  toggleStructuredChip: (category: StructuredNoteCategory, chip: string) => void;
  activeCategoryTab: StructuredNoteCategory;
  setActiveCategoryTab: (tab: StructuredNoteCategory) => void;
  autoNarasi: string;
  absentList: string[];
}

export function JurnalContent({
  realizationStatus,
  setRealizationStatus,
  realizationReason,
  setRealizationReason,
  handleCopyPreviousJournal,
  journalInput,
  setJournalInput,
  structuredNote,
  toggleStructuredChip,
  activeCategoryTab,
  setActiveCategoryTab,
  autoNarasi,
  absentList,
}: JurnalContentProps) {
  return (
    <div className="space-y-3.5 max-w-full overflow-hidden">

      {/* Realization Status */}
      <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3 border border-slate-200">
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Status Keterlaksanaan
        </span>
        <select
          value={realizationStatus}
          onChange={(e) =>
            setRealizationStatus(
              e.target.value as "done" | "continued" | "cancelled"
            )
          }
          className={`text-xs font-bold rounded-lg px-3 py-2 outline-none border min-h-[38px] ${
            realizationStatus === "done"
              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
              : realizationStatus === "continued"
                ? "bg-amber-100 text-amber-800 border-amber-300"
                : "bg-rose-100 text-rose-800 border-rose-300"
          }`}
        >
          {REALIZATION_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {realizationStatus !== "done" && (
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">
            Alasan {realizationStatus === "continued" ? "Penggantian" : "Ketidaklaksanaan"}
          </label>
          <input
            type="text"
            value={realizationReason}
            onChange={(e) => setRealizationReason(e.target.value)}
            placeholder="Tulis alasan..."
            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs md:text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-300 min-h-[44px]"
          />
        </div>
      )}

      {/* Salin Jurnal Lalu */}
      <button
        onClick={handleCopyPreviousJournal}
        className="w-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold py-2.5 rounded-xl active:scale-[0.98] transition-transform flex items-center justify-center gap-1.5 hover:bg-blue-100 min-h-[42px]"
      >
        <span className="text-base">📋</span>
        Salin Jurnal Lalu
      </button>

      {/* Materi / TP */}
      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1">
          📌 Materi / Tujuan Pembelajaran
        </label>
        <textarea
          value={journalInput.actualMaterialTitle}
          onChange={(e) =>
            setJournalInput((prev) => ({
              ...prev,
              actualMaterialTitle: e.target.value,
            }))
          }
          placeholder="Tulis materi yang diajarkan..."
          rows={2}
          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs md:text-sm text-slate-800 outline-none resize-none focus:ring-2 focus:ring-blue-300"
        />
      </div>

      {/* ========== CATATAN TERSTRUKTUR ========== */}
      <div className="w-full min-w-0 space-y-2">
        <label className="block text-xs font-bold text-slate-700">
          📝 Catatan Terstruktur
        </label>

        {/* 1. CHIP GRUP / KATEGORI (Segmented Control Style) */}
        <div className="bg-slate-200/70 p-1.5 rounded-2xl border border-slate-300/60">
          <div className="flex gap-1.5 overflow-x-auto min-w-0 touch-pan-x scrollbar-none scroll-smooth">
            {STRUCTURED_NOTE_CATEGORIES.map((cat) => {
              const isActive = activeCategoryTab === cat.key;
              const count = structuredNote[cat.key].length;
              return (
                <button
                  key={cat.key}
                  onClick={(e) => {
                    setActiveCategoryTab(cat.key);
                    e.currentTarget.scrollIntoView({
                      behavior: "smooth",
                      block: "nearest",
                      inline: "center",
                    });
                  }}
                  className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 flex items-center gap-1.5 whitespace-nowrap min-h-[38px] ${
                    isActive
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 ring-2 ring-blue-600/30"
                      : "bg-white/80 text-slate-700 hover:bg-white hover:text-slate-900 border border-slate-200/60"
                  }`}
                >
                  <span className="text-sm">{cat.icon}</span>
                  <span>{cat.label}</span>
                  {count > 0 && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                        isActive
                          ? "bg-white text-blue-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. CHIP ISI / SUB-CHIP (Panel Pilihan Khusus) */}
        <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-3">
          <div className="text-[11px] font-semibold text-slate-500 mb-2 flex items-center gap-1">
            <span>Pilih {STRUCTURED_NOTE_CATEGORIES.find(c => c.key === activeCategoryTab)?.label}:</span>
          </div>

          <div className="flex flex-wrap gap-1.5 w-full">
            {STRUCTURED_CHIPS[activeCategoryTab].map((chip) => {
              const isActive = structuredNote[activeCategoryTab].includes(chip);
              return (
                <button
                  key={chip}
                  onClick={() => toggleStructuredChip(activeCategoryTab, chip)}
                  className={`px-3 py-1.5 rounded-xl text-xs transition-all active:scale-95 text-left max-w-full break-words leading-tight ${
                    isActive
                      ? "bg-blue-100 text-blue-800 border-2 border-blue-500 font-bold shadow-sm"
                      : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-2xs"
                  }`}
                >
                  {isActive ? "✓ " : "+ "}{chip}
                </button>
              );
            })}

            {/* 3c: Custom "Lainnya..." input */}
            <CustomChipInput
              category={activeCategoryTab}
              existingChips={structuredNote[activeCategoryTab]}
              onAdd={toggleStructuredChip}
            />
          </div>
        </div>
      </div>

      {/* Tidak Hadir (Auto-Sync) */}
      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1">
          Tidak Hadir (Auto-Sync dari Presensi)
        </label>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs md:text-sm text-slate-600">
          {absentList.length > 0 ? absentList.join(", ") : "Nihil (-)"}
        </div>
      </div>

      {/* Auto Narasi — B4-06: editable, pre-fills Catatan Tambahan */}
      {autoNarasi && (
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">
            📝 Narasi Jurnal
            <span className="text-blue-500 font-normal ml-1">(Auto-Generated — bisa diedit)</span>
          </label>
          <textarea
            value={journalInput.note || autoNarasi}
            onChange={(e) =>
              setJournalInput((prev) => ({ ...prev, note: e.target.value }))
            }
            rows={3}
            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs md:text-sm text-slate-700 outline-none resize-none focus:ring-2 focus:ring-teal-400"
            placeholder={autoNarasi}
          />
        </div>
      )}

      {/* Catatan Tambahan */}
      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1">
          ✏️ Catatan Tambahan
        </label>
        <textarea
          value={journalInput.note}
          onChange={(e) =>
            setJournalInput((prev) => ({ ...prev, note: e.target.value }))
          }
          placeholder="Catatan bebas tambahan..."
          rows={2}
          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs md:text-sm text-slate-800 outline-none resize-none focus:ring-2 focus:ring-blue-300"
        />
      </div>
    </div>
  );
}

/* ============================================================ */
/*  3c: Custom Chip Input — "Lainnya..." for structured notes    */
/* ============================================================ */

export function CustomChipInput({
  category,
  existingChips,
  onAdd,
}: {
  category: StructuredNoteCategory;
  existingChips: readonly string[];
  onAdd: (category: StructuredNoteCategory, chip: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed && !existingChips.includes(trimmed)) {
      onAdd(category, trimmed);
    }
    setValue("");
    setOpen(false);
  }, [value, existingChips, onAdd, category]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 rounded-xl text-xs transition-all active:scale-95 bg-white text-slate-500 hover:bg-slate-100 border border-dashed border-slate-300 min-h-[32px]"
      >
        + Lainnya...
      </button>
    );
  }

  return (
    <div className="flex gap-1.5 items-center">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); if (e.key === "Escape") { setOpen(false); setValue(""); } }}
        placeholder="Ketik custom..."
        autoFocus
        className="px-2.5 py-1.5 rounded-xl text-xs bg-white border border-blue-300 outline-none focus:ring-2 focus:ring-blue-300 w-32 min-h-[32px]"
      />
      <button
        onClick={handleSubmit}
        disabled={!value.trim()}
        className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white active:scale-95 disabled:opacity-40 min-h-[32px]"
      >
        ✓
      </button>
      <button
        onClick={() => { setOpen(false); setValue(""); }}
        className="px-2.5 py-1.5 rounded-xl text-xs bg-slate-100 text-slate-500 active:scale-95 min-h-[32px]"
      >
        ✕
      </button>
    </div>
  );
}
