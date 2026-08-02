import { useEffect, useState, useCallback } from "react";
import { AccordionCard } from "@shared/ui/mobile";
import { useDirtyGuard } from "@shared/hooks/useDirtyGuard";
import type { StepState } from "../types";
import type { LessonSession, AttendanceRecord, AttendanceStatus, TeachingJournal } from "@guru-admin/domain";
import type { StructuredNoteCategory, StructuredNoteState, SessionOption } from "../types";
import { PresensiContent } from "./PresensiContent";
import { JurnalContent } from "./JurnalContent";
import { NilaiContent } from "./NilaiContent";
import type { PresensiContentProps } from "./PresensiContent";
import type { JurnalContentProps } from "./JurnalContent";
import type { NilaiContentProps } from "./NilaiContent";

/* ============================================================ */
/*  Editor View — Presensi (hidden when done) → Jurnal → Nilai   */
/* ============================================================ */

export interface EditorViewProps {
  // Session info
  selectedSession: LessonSession | null;
  selectedSessionId: string | null;
  filteredSessions: SessionOption[];

  // Navigation
  backToDashboard: () => void;

  // Dirty guard
  isDirty: boolean;

  // Step flow
  presensiStep: StepState;
  jurnalStep: StepState;
  nilaiStep: StepState;
  reopenPresensi: () => void;

  // Presensi
  effectiveRecords: AttendanceRecord[];
  changes: Map<string, AttendanceStatus>;
  summary: { present: number; sick: number; excused: number; late: number; absent: number };
  noteMap: Map<string, string>;
  setStatus: (studentId: string, status: AttendanceStatus) => void;
  setAllPresent: () => void;
  setStudentNote: (studentId: string, note: string) => void;
  donePresensi: () => void;
  undoLastStatus: () => void;
  absentList: string[];

  // Journal
  journal: TeachingJournal | null;
  journalInput: { actualMaterialTitle: string; note: string };
  setJournalInput: React.Dispatch<React.SetStateAction<{ actualMaterialTitle: string; note: string }>>;
  realizationStatus: string;
  setRealizationStatus: (status: "done" | "continued" | "cancelled") => void;
  realizationReason: string;
  setRealizationReason: (reason: string) => void;
  structuredNote: StructuredNoteState;
  toggleStructuredChip: (category: StructuredNoteCategory, chip: string) => void;
  activeCategoryTab: StructuredNoteCategory;
  setActiveCategoryTab: (tab: StructuredNoteCategory) => void;
  autoNarasi: string;
  handleCopyPreviousJournal: () => void;

  // Nilai
  nilaiToggle: boolean;
  setNilaiToggle: (toggle: boolean) => void;
  nilaiType: string;
  setNilaiType: (type: string) => void;
  nilaiMap: Map<string, number>;
  setNilai: (studentId: string, value: number | null) => void;

  // Save
  saving: boolean;
  justSaved: boolean;
  saveAll: () => void;
}

export function EditorView(props: EditorViewProps) {
  const {
    selectedSession,
    selectedSessionId,
    filteredSessions,
    backToDashboard,
    isDirty,
    presensiStep,
    jurnalStep,
    nilaiStep,
    reopenPresensi,
    effectiveRecords,
    changes,
    summary,
    noteMap,
    setStatus,
    setAllPresent,
    setStudentNote,
    donePresensi,
    undoLastStatus,
    absentList,
    journalInput,
    setJournalInput,
    realizationStatus,
    setRealizationStatus,
    realizationReason,
    setRealizationReason,
    structuredNote,
    toggleStructuredChip,
    activeCategoryTab,
    setActiveCategoryTab,
    autoNarasi,
    handleCopyPreviousJournal,
    nilaiToggle,
    setNilaiToggle,
    nilaiType,
    setNilaiType,
    nilaiMap,
    setNilai,
    saving,
    justSaved,
    saveAll,
  } = props;

  /* ---- Single-open accordion: only 1 tab open at a time ---- */
  const [openTab, setOpenTab] = useState<"presensi" | "jurnal" | "nilai" | null>("presensi");

  // Auto-switch: when presensi done → open jurnal
  useEffect(() => {
    if (presensiStep === "done" && openTab === "presensi") {
      setOpenTab("jurnal");
    }
  }, [presensiStep, openTab]);

  const handleToggle = useCallback((tab: "presensi" | "jurnal" | "nilai", nextOpen: boolean) => {
    setOpenTab(nextOpen ? tab : null);
  }, []);

  /* ---- 1a: Guard navigation with unsaved changes — B4-01: use guardAction from shared hook ---- */
  const { guardAction } = useDirtyGuard(isDirty, { message: "Data KBM belum disimpan. Yakin ingin keluar?" });

  const presensiProps: PresensiContentProps = {
    effectiveRecords, changes, summary, noteMap, setStatus, setAllPresent, setStudentNote, donePresensi, undoLastStatus, absentList,
  };

  const jurnalProps: JurnalContentProps = {
    realizationStatus, setRealizationStatus, realizationReason, setRealizationReason,
    handleCopyPreviousJournal, journalInput, setJournalInput,
    structuredNote, toggleStructuredChip, activeCategoryTab, setActiveCategoryTab,
    autoNarasi, absentList,
  };

  const nilaiProps: NilaiContentProps = {
    effectiveRecords, nilaiMap, setNilai, nilaiToggle, setNilaiToggle, nilaiType, setNilaiType,
  };

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Back button + session info */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => guardAction(backToDashboard)}
          className="text-xs md:text-sm text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 active:scale-95 transition-transform min-h-[44px] min-w-[44px] justify-center"
        >
          ← Kembali
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs md:text-sm font-bold text-slate-900 truncate">
            {selectedSession?.classLabel} — {selectedSession?.subject}
          </p>
          <p className="text-[10px] md:text-xs text-slate-500">
            P{filteredSessions.find((s) => s.session.id === selectedSessionId)?.meetingNumber ?? "?"} · {selectedSession?.date}
          </p>
        </div>
      </div>

      {/* ========== PRESENSI — HIDDEN when done, tiny edit link ========== */}
      {presensiStep === "done" ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">✓</span>
            <div>
              <p className="text-xs font-bold text-emerald-800">Presensi Selesai</p>
              <p className="text-[10px] text-emerald-600">
                H:{summary.present} S:{summary.sick} I:{summary.excused} T:{summary.late} A:{summary.absent}
              </p>
            </div>
          </div>
          <button
            onClick={reopenPresensi}
            className="text-[10px] md:text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-2 rounded-lg active:scale-95 transition-transform hover:bg-emerald-200 min-h-[44px] flex items-center"
          >
            ✏️ Edit
          </button>
        </div>
      ) : (
        <AccordionCard
          step={1}
          title="Presensi Siswa"
          subtitle="Isi presensi (Default: Hadir)"
          state={presensiStep}
          stepColor="green"
          open={openTab === "presensi"}
          onToggle={(next) => handleToggle("presensi", next)}
        >
          <PresensiContent {...presensiProps} />
        </AccordionCard>
      )}

      {/* ========== STEP 2: JURNAL MENGAJAR ========== */}
      <AccordionCard
        step={2}
        title="Jurnal Mengajar"
        subtitle={jurnalStep === "done" ? "Jurnal selesai" : "Isi materi & kegiatan pembelajaran"}
        state={jurnalStep}
        stepColor="blue"
        open={openTab === "jurnal"}
        onToggle={(next) => handleToggle("jurnal", next)}
      >
        <JurnalContent {...jurnalProps} />
      </AccordionCard>

      {/* ========== STEP 3: NILAI / ASESMEN ========== */}
      <AccordionCard
        step={3}
        title="Asesmen / Nilai"
        subtitle={
          nilaiToggle
            ? "Input nilai siswa"
            : "Opsional — aktifkan jika ada pengambilan nilai"
        }
        state={nilaiStep}
        stepColor="amber"
        open={openTab === "nilai"}
        onToggle={(next) => handleToggle("nilai", next)}
      >
        <NilaiContent {...nilaiProps} />
      </AccordionCard>

      {/* ========== DESKTOP: Save button inline ========== */}
      <div className="hidden md:block">
        <button
          onClick={saveAll}
          disabled={saving || justSaved}
          className={`w-full font-bold py-3 px-4 rounded-xl text-sm flex justify-center items-center gap-2 transition-all ${
            justSaved
              ? "bg-emerald-500 text-white"
              : saving
                ? "bg-slate-400 text-white cursor-wait"
                : "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700"
          }`}
        >
          {justSaved ? (
            <>
              ✅ Tersimpan!
            </>
          ) : saving ? (
            <>
              <span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
              Menyimpan...
            </>
          ) : (
            <>
              💾 SIMPAN KBM
            </>
          )}
        </button>
      </div>
    </div>
  );
}
