/**
 * KbmHubPage — Unified KBM: Dashboard + Editor dalam 1 halaman.
 *
 * RESPONSIVE DESIGN:
 *   Mobile  (<768px): Single column, gradient header, bottom bar,
 *            compact cards, thumb-friendly 44px targets,
 *            numeric keypad for nilai, quick student filter
 *   Desktop (≥768px): Wider layout, side-by-side where possible,
 *            larger typography, no bottom bar (save button inline)
 *
 * FLOW SIMPLIFIED:
 *   - No lock/finalize/unlock — everything stays editable
 *   - After Presensi done → auto-open Jurnal, Presensi hidden
 *   - Small "Edit Presensi" link to reopen if needed
 *   - Save button saves everything (attendance + journal + nilai)
 *
 * MOBILE HP OPTIMIZED:
 *   - pb-28 bottom clearance (bebas tertimbun sticky bar)
 *   - inputMode="numeric" + auto-select on nilai inputs (numpad)
 *   - Quick filter: Semua / Tidak Hadir (1-tap verify absent)
 *   - Min 44px touch targets (thumb-zone friendly)
 *   - Defensive date parsing + aria-label on selects
 *
 * DOMAIN-BOUNDARY: Presentation component only. No DB calls directly.
 */

import { useEffect, memo, useCallback, useRef, useState } from "react";
import {
  useKbmHub,
  STRUCTURED_NOTE_CATEGORIES,
  STRUCTURED_CHIPS,
  REALIZATION_STATUS_OPTIONS,
  NILAI_TYPE_OPTIONS,
} from "./useKbmHub";
import type { DashboardCard, DashboardClassGroup, StructuredNoteCategory } from "./useKbmHub";
import { AccordionCard, StudentRow, MiniStat } from "@shared/ui/mobile";
import { ATTENDANCE_STATUS_OPTIONS } from "@shared/constants/attendance-status";
import type { AttendanceStatus } from "@guru-admin/domain";
import { LoadingState, EmptyState, Toast, useToast } from "@shared/ui";

/* ============================================================ */
/*  Component                                                    */
/* ============================================================ */

export function KbmHubPage() {
  const kbm = useKbmHub();
  const toast = useToast();

  /* ---- Bridge: notice → toast ---- */
  useEffect(() => {
    if (!kbm.notice) return;
    const isSuccess = kbm.notice.toLowerCase().includes("berhasil");
    toast.show(kbm.notice, { variant: isSuccess ? "success" : "error", duration: 4000 });
    kbm.setNotice(null);
  }, [kbm.notice, kbm.setNotice, toast]);

  /* ---- 1a: Unsaved changes guard — beforeunload ---- */
  useEffect(() => {
    if (!kbm.isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers ignore custom messages, but legacy requires returnValue
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [kbm.isDirty]);

  /* ---- Render ---- */
  if (kbm.loading) return <LoadingState />;
  if (!kbm.year) return <EmptyState title="Belum ada tahun pelajaran aktif" />;

  return (
    <div className="max-w-4xl mx-auto md:max-w-6xl pb-28 md:pb-6">
      {/* ========== HEADER — RESPONSIVE ========== */}
      <header className="md:hidden bg-gradient-to-br from-emerald-700 via-teal-700 to-teal-800 text-white p-4 rounded-2xl shadow-lg mb-3">
        <MobileHeader kbm={kbm} />
      </header>

      <header className="hidden md:block bg-white border border-slate-200 rounded-xl shadow-sm mb-4 p-5">
        <DesktopHeader kbm={kbm} />
      </header>

      {/* Toast notification */}
      {toast.toast && (
        <Toast toast={toast.toast} onDismiss={toast.dismiss} />
      )}

      {/* No assignments */}
      {kbm.classOptions.length === 0 && !kbm.loading && (
        <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5 text-center shadow-sm">
          <p className="text-base font-bold text-amber-800 mb-1">Belum Ada Kelas Mengajar</p>
          <p className="text-xs text-amber-600 mb-3">
            Tambahkan kelas dan mata pelajaran terlebih dahulu.
          </p>
          <button
            onClick={() => window.location.hash = "/assignments"}
            className="bg-amber-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl active:scale-[0.98] transition-transform min-h-[44px]"
          >
            Ke Penugasan Mengajar
          </button>
        </div>
      )}

      {/* Has sessions but no session selected → show dashboard */}
      {kbm.selectedSubject && kbm.hasNoSessions && !kbm.selectedSession && (
        <div className="bg-blue-50 rounded-2xl border border-blue-200 p-5 text-center shadow-sm">
          <div className="text-3xl mb-2">📝</div>
          <p className="text-sm font-bold text-blue-800 mb-1">Belum Ada Sesi untuk Kelas & Mapel Ini</p>
          <p className="text-xs text-blue-600 mb-4">
            Anda bisa langsung membuat sesi baru tanpa jadwal.
          </p>
          <button
            onClick={kbm.handlePertemuanTambahan}
            className="w-full md:w-auto bg-blue-600 text-white text-sm font-bold py-3 px-6 rounded-xl active:scale-[0.98] transition-transform shadow-sm flex items-center justify-center gap-2 mx-auto min-h-[44px]"
          >
            <span className="text-base">🚀</span>
            MULAI KBM SESI INI
          </button>
        </div>
      )}

      {/* ========== DASHBOARD: Day Progress + Session Cards ========== */}
      {!kbm.isReadyToStart && kbm.daySummary.total > 0 && (
        <DashboardView kbm={kbm} />
      )}

      {/* ========== EDITOR: Session Selected ========== */}
      {kbm.isReadyToStart && kbm.selectedSession && (
        <EditorView kbm={kbm} />
      )}

      {/* ========== STICKY BOTTOM: SIMPAN (MOBILE ONLY) ========== */}
      {kbm.isReadyToStart && kbm.selectedSession && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <button
            onClick={kbm.saveAll}
            disabled={kbm.saving}
            className={`w-full font-bold py-3.5 px-4 rounded-xl text-sm flex justify-center items-center gap-2 transition-all active:scale-[0.98] min-h-[44px] ${
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
                SIMPAN KBM
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

/* ============================================================ */
/*  Mobile Header — Gradient + Glass Selector                    */
/* ============================================================ */

function MobileHeader({ kbm }: { kbm: ReturnType<typeof useKbmHub> }) {
  return (
    <>
      {/* Top bar */}
      <div className="flex justify-between items-center mb-3">
        <span className="bg-white/15 backdrop-blur-sm text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-white/20">
          KBM
        </span>
        <span className="text-[11px] text-emerald-200 font-medium">
          {kbm.todayDate}
        </span>
      </div>

      {/* Cascading Selector */}
      <CascadingSelector kbm={kbm} variant="mobile" />

      {/* MULAI KBM action button */}
      {kbm.selectedClassId && kbm.selectedSubject && !kbm.selectedSessionId && (
        <button
          onClick={kbm.handlePertemuanTambahan}
          className="w-full mt-3 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm font-bold py-3 px-4 rounded-xl active:scale-[0.98] transition-transform shadow-sm flex items-center justify-center gap-2 hover:bg-white/25 min-h-[44px]"
        >
          <span className="text-base">🚀</span>
          MULAI KBM SESI INI
        </button>
      )}
    </>
  );
}

/* ============================================================ */
/*  Desktop Header — Clean White + Selector                      */
/* ============================================================ */

function DesktopHeader({ kbm }: { kbm: ReturnType<typeof useKbmHub> }) {
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">KBM Harian</h1>
          <p className="text-xs text-slate-500">{kbm.todayDate}</p>
        </div>
        <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-200">
          KBM
        </span>
      </div>

      {/* Cascading Selector */}
      <CascadingSelector kbm={kbm} variant="desktop" />

      {/* MULAI KBM action button */}
      {kbm.selectedClassId && kbm.selectedSubject && !kbm.selectedSessionId && (
        <button
          onClick={kbm.handlePertemuanTambahan}
          className="mt-3 bg-emerald-600 text-white text-sm font-bold py-2.5 px-5 rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-sm"
        >
          🚀 MULAI KBM SESI INI
        </button>
      )}
    </>
  );
}

/* ============================================================ */
/*  Cascading Selector — Kelas → Mapel → Sesi                    */
/* ============================================================ */

function CascadingSelector({ kbm, variant }: { kbm: ReturnType<typeof useKbmHub>; variant: "mobile" | "desktop" }) {
  const isMobile = variant === "mobile";

  /* ---- 1a: Guard selector changes with unsaved data ---- */
  const guardChange = useCallback((action: () => void) => {
    if (kbm.isDirty && !window.confirm("Data belum disimpan. Yakin ingin berpindah?")) return;
    action();
  }, [kbm.isDirty]);

  const selectClass = isMobile
    ? "w-full bg-white/15 backdrop-blur-sm text-white text-sm font-bold rounded-xl p-3 border border-white/20 outline-none focus:bg-white/20 transition-colors min-h-[44px]"
    : "w-full bg-white border border-slate-300 text-slate-800 text-sm font-medium rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-colors";

  const labelClass = isMobile
    ? "block text-[10px] font-bold text-emerald-200 mb-1 uppercase tracking-wider"
    : "block text-xs font-semibold text-slate-600 mb-1";

  const optionClass = "text-slate-800";

  return (
    <div className={`grid gap-3 ${isMobile ? 'space-y-2' : 'md:grid-cols-3 md:gap-3'}`}>
      {/* 1. Kelas */}
      <div>
        <label htmlFor="select-kelas" className={labelClass}>Kelas</label>
        <select
          id="select-kelas"
          aria-label="Pilih Kelas"
          value={kbm.selectedClassId ?? ""}
          onChange={(e) => guardChange(() => kbm.setSelectedClassId(e.target.value))}
          className={selectClass}
        >
          <option value="" className={optionClass}>Pilih Kelas...</option>
          {kbm.classOptions.map((c) => (
            <option key={c.classId} value={c.classId} className={optionClass}>
              {c.classLabel}
            </option>
          ))}
        </select>
      </div>

      {/* 2. Mapel */}
      {kbm.selectedClassId && (
        <div>
          <label htmlFor="select-mapel" className={labelClass}>Mapel</label>
          <select
            id="select-mapel"
            aria-label="Pilih Mata Pelajaran"
            value={kbm.selectedSubject ?? ""}
            onChange={(e) => guardChange(() => kbm.setSelectedSubject(e.target.value))}
            className={selectClass}
          >
            <option value="" className={optionClass}>Pilih Mapel...</option>
            {kbm.subjectOptions.map((s) => (
              <option key={s.subject} value={s.subject} className={optionClass}>
                {s.subject}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 3. Sesi */}
      {kbm.selectedSubject && (
        <div>
          <label htmlFor="select-sesi" className={labelClass}>Sesi</label>
          <select
            id="select-sesi"
            aria-label="Pilih Pertemuan"
            value={kbm.selectedSessionId ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "__tambahan__") {
                guardChange(() => kbm.handlePertemuanTambahan());
              } else {
                guardChange(() => kbm.setSelectedSessionId(val || null));
              }
            }}
            className={selectClass}
          >
            <option value="" className={optionClass}>Pilih Pertemuan...</option>
            {kbm.filteredSessions.map((s) => (
              <option key={s.session.id} value={s.session.id} className={optionClass}>
                {s.statusIcon} P{s.meetingNumber} — {s.statusLabel} ({s.session.date?.slice(5) ?? "-"})
              </option>
            ))}
            <option value="__tambahan__" className={optionClass}>
              ➕ Pertemuan Tambahan / Luar Jadwal
            </option>
          </select>
        </div>
      )}
    </div>
  );
}

/* ============================================================ */
/*  Dashboard View — Day Progress + Session Cards                */
/* ============================================================ */

function DashboardView({ kbm }: { kbm: ReturnType<typeof useKbmHub> }) {
  const { dashboardClassGroups, daySummary, progressPercent } = kbm;

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Day Progress Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 md:p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs md:text-sm font-bold text-slate-700">Progres Hari Ini</span>
          <span className="text-xs md:text-sm font-bold text-emerald-600">{progressPercent}%</span>
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
          {daySummary.done > 0 && (
            <div className="bg-emerald-500 h-full transition-all" style={{ width: `${(daySummary.done / daySummary.total) * 100}%` }} />
          )}
          {daySummary.partial > 0 && (
            <div className="bg-amber-400 h-full transition-all" style={{ width: `${(daySummary.partial / daySummary.total) * 100}%` }} />
          )}
          {daySummary.unfilled > 0 && (
            <div className="bg-slate-200 h-full transition-all" style={{ width: `${(daySummary.unfilled / daySummary.total) * 100}%` }} />
          )}
        </div>
        <div className="flex gap-3 md:gap-4 mt-2">
          <span className="text-[10px] md:text-xs text-slate-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Selesai ({daySummary.done})
          </span>
          <span className="text-[10px] md:text-xs text-slate-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Sebagian ({daySummary.partial})
          </span>
          <span className="text-[10px] md:text-xs text-slate-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-200 inline-block" /> Belum ({daySummary.unfilled})
          </span>
        </div>
      </div>

      {/* Session cards grouped by class */}
      {dashboardClassGroups.map((group) => (
        <ClassGroupCard key={group.classId} group={group} onSelect={kbm.selectDashboardSession} />
      ))}
    </div>
  );
}

/* ---- Class Group Card ---- */
function ClassGroupCard({ group, onSelect }: { group: DashboardClassGroup; onSelect: (id: string) => void }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="bg-slate-50 px-4 py-2.5 md:py-3 border-b border-slate-100">
        <h3 className="text-xs md:text-sm font-bold text-slate-800 uppercase tracking-wider">{group.classLabel}</h3>
      </div>
      <div className="divide-y divide-slate-100">
        {group.cards.map((card) => (
          <SessionCardRow key={card.session.id} card={card} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

/* ---- Session Card Row (clickable) ---- */
function SessionCardRow({ card, onSelect }: { card: DashboardCard; onSelect: (id: string) => void }) {
  const statusColorMap: Record<string, string> = {
    done: "bg-emerald-100 text-emerald-700",
    partial: "bg-amber-100 text-amber-700",
    unfilled: "bg-slate-100 text-slate-600",
  };
  const statusDotColor: Record<string, string> = {
    done: "bg-emerald-500",
    partial: "bg-amber-400",
    unfilled: "bg-slate-300",
  };

  return (
    <button
      onClick={() => onSelect(card.session.id)}
      className="w-full flex items-center gap-3 px-4 py-3 md:py-3.5 text-left active:bg-slate-50 hover:bg-slate-50 transition-colors min-h-[44px]"
    >
      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusDotColor[card.status]}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs md:text-sm font-bold text-slate-900 truncate">
            P{card.meetingNumber} — {card.session.subject}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] md:text-xs text-slate-500">
            JP {card.session.startPeriod}{card.session.durationJP > 1 ? `-${card.session.startPeriod + card.session.durationJP - 1}` : ""}
          </span>
          {card.attendanceSummary && (
            <span className="text-[10px] md:text-xs text-slate-400 truncate">{card.attendanceSummary}</span>
          )}
        </div>
      </div>
      <span className={`text-[10px] md:text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap ${statusColorMap[card.status]}`}>
        {card.statusIcon} {card.statusLabel}
      </span>
    </button>
  );
}

/* ============================================================ */
/*  Editor View — Presensi (hidden when done) → Jurnal → Nilai   */
/* ============================================================ */

function EditorView({ kbm }: { kbm: ReturnType<typeof useKbmHub> }) {
  /* ---- Single-open accordion: only 1 tab open at a time ---- */
  const [openTab, setOpenTab] = useState<"presensi" | "jurnal" | "nilai" | null>("presensi");

  // Auto-switch: when presensi done → open jurnal
  useEffect(() => {
    if (kbm.presensiStep === "done" && openTab === "presensi") {
      setOpenTab("jurnal");
    }
  }, [kbm.presensiStep, openTab]);

  const handleToggle = useCallback((tab: "presensi" | "jurnal" | "nilai", nextOpen: boolean) => {
    setOpenTab(nextOpen ? tab : null);
  }, []);

  /* ---- 1a: Guard navigation with unsaved changes ---- */
  const guardNavigate = useCallback((action: () => void) => {
    if (kbm.isDirty && !window.confirm("Data belum disimpan. Yakin ingin keluar?")) return;
    action();
  }, [kbm.isDirty]);

  return (
    <div className="space-y-3 md:space-y-4">
      {/* Back button + session info */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => guardNavigate(kbm.backToDashboard)}
          className="text-xs md:text-sm text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 active:scale-95 transition-transform min-h-[44px] min-w-[44px] justify-center"
        >
          ← Kembali
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs md:text-sm font-bold text-slate-900 truncate">
            {kbm.selectedSession?.classLabel} — {kbm.selectedSession?.subject}
          </p>
          <p className="text-[10px] md:text-xs text-slate-500">
            P{kbm.filteredSessions.find((s) => s.session.id === kbm.selectedSessionId)?.meetingNumber ?? "?"} · {kbm.selectedSession?.date}
          </p>
        </div>
      </div>

      {/* ========== PRESENSI — HIDDEN when done, tiny edit link ========== */}
      {kbm.presensiStep === "done" ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">✓</span>
            <div>
              <p className="text-xs font-bold text-emerald-800">Presensi Selesai</p>
              <p className="text-[10px] text-emerald-600">
                H:{kbm.summary.present} S:{kbm.summary.sick} I:{kbm.summary.excused} T:{kbm.summary.late} A:{kbm.summary.absent}
              </p>
            </div>
          </div>
          <button
            onClick={kbm.reopenPresensi}
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
          state={kbm.presensiStep}
          stepColor="green"
          open={openTab === "presensi"}
          onToggle={(next) => handleToggle("presensi", next)}
        >
          <PresensiContent kbm={kbm} />
        </AccordionCard>
      )}

      {/* ========== STEP 2: JURNAL MENGAJAR ========== */}
      <AccordionCard
        step={2}
        title="Jurnal Mengajar"
        subtitle={kbm.jurnalStep === "done" ? "Jurnal selesai" : "Isi materi & kegiatan pembelajaran"}
        state={kbm.jurnalStep}
        stepColor="blue"
        open={openTab === "jurnal"}
        onToggle={(next) => handleToggle("jurnal", next)}
      >
        <JurnalContent kbm={kbm} />
      </AccordionCard>

      {/* ========== STEP 3: NILAI / ASESMEN ========== */}
      <AccordionCard
        step={3}
        title="Asesmen / Nilai"
        subtitle={
          kbm.nilaiToggle
            ? "Input nilai siswa"
            : "Opsional — aktifkan jika ada pengambilan nilai"
        }
        state={kbm.nilaiStep}
        stepColor="amber"
        open={openTab === "nilai"}
        onToggle={(next) => handleToggle("nilai", next)}
      >
        <NilaiContent kbm={kbm} />
      </AccordionCard>

      {/* ========== DESKTOP: Save button inline ========== */}
      <div className="hidden md:block">
        <button
          onClick={kbm.saveAll}
          disabled={kbm.saving}
          className={`w-full font-bold py-3 px-4 rounded-xl text-sm flex justify-center items-center gap-2 transition-all ${
            kbm.saving
              ? "bg-slate-400 text-white cursor-wait"
              : "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700"
          }`}
        >
          {kbm.saving ? (
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

/* ============================================================ */
/*  Presensi Content — Shared StudentRow + MiniStat + Filter     */
/* ============================================================ */

type PresensiFilter = "all" | "absent";

function PresensiContent({ kbm }: { kbm: ReturnType<typeof useKbmHub> }) {
  const [filter, setFilter] = useState<PresensiFilter>("all");
  const listRef = useRef<HTMLDivElement>(null);

  // 2b: Smart scroll — auto-scroll to first absent student on mount
  useEffect(() => {
    if (!listRef.current) return;
    const firstAbsent = listRef.current.querySelector("[data-absent='true']");
    if (firstAbsent) {
      firstAbsent.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  // Filter logic: show only absent students when filter is "absent"
  const filteredRecords = filter === "absent"
    ? kbm.effectiveRecords.filter((r) => {
        const status = kbm.changes.get(r.studentId) ?? r.status;
        return status !== "present" && status !== "late";
      })
    : kbm.effectiveRecords;

  const absentCount = kbm.effectiveRecords.filter((r) => {
    const status = kbm.changes.get(r.studentId) ?? r.status;
    return status !== "present" && status !== "late";
  }).length;

  return (
    <div className="space-y-3">
      {/* Summary stats — using MiniStat grid */}
      <div className="grid grid-cols-5 gap-1.5 md:gap-2 text-center">
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

      {/* Quick action: Set Semua Hadir + Undo + Filter toggle */}
      <div className="flex gap-2">
        <button
          onClick={kbm.setAllPresent}
          className="flex-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] md:text-xs font-bold py-2.5 rounded-xl active:scale-[0.98] transition-transform flex items-center justify-center gap-1.5 hover:bg-emerald-100 min-h-[44px]"
        >
          <span className="text-sm">⚡</span>
          Set Semua Hadir
        </button>
        {/* 2c: Quick Undo — 1-level undo last status change */}
        <button
          onClick={kbm.undoLastStatus}
          className="shrink-0 bg-amber-50 border border-amber-200 text-amber-700 text-[11px] md:text-xs font-bold py-2.5 px-3 rounded-xl active:scale-[0.98] transition-transform flex items-center gap-1.5 hover:bg-amber-100 min-h-[44px]"
        >
          <span className="text-sm">↩️</span>
          Undo
        </button>
        <button
          onClick={() => setFilter(filter === "absent" ? "all" : "absent")}
          className={`shrink-0 border font-bold text-[11px] md:text-xs py-2.5 px-3 rounded-xl active:scale-[0.98] transition-transform flex items-center gap-1.5 min-h-[44px] ${
            filter === "absent"
              ? "bg-rose-50 border-rose-200 text-rose-700"
              : "bg-slate-50 border-slate-200 text-slate-600"
          }`}
        >
          <span className="text-sm">🔍</span>
          {filter === "absent" ? "Semua" : `Tidak Hadir (${absentCount})`}
        </button>
      </div>

      {/* Student rows — scrollable (memoized for performance) */}
      <div ref={listRef} className="space-y-1.5 max-h-[50vh] md:max-h-[55vh] overflow-y-auto">
        {filteredRecords.length === 0 ? (
          <div className="text-center py-4 text-xs text-slate-400">
            Semua siswa hadir 🎉
          </div>
        ) : (
          filteredRecords.map((r) => {
            const originalIdx = kbm.effectiveRecords.indexOf(r);
            const currentStatus = kbm.changes.get(r.studentId) ?? r.status;
            const isAbsent = currentStatus !== "present" && currentStatus !== "late";
            return (
              <div key={r.studentId} data-absent={isAbsent ? "true" : undefined}>
                <MemoPresensiRow
                  studentId={r.studentId}
                  number={r.studentNumber ?? originalIdx + 1}
                  name={r.studentName}
                  currentStatus={currentStatus}
                  note={kbm.noteMap.get(r.studentId) ?? ""}
                  onStatusChange={kbm.setStatus}
                  onNoteChange={kbm.setStudentNote}
                />
              </div>
            );
          })
        )}
      </div>

      {/* Absent summary */}
      {kbm.absentList.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-500">
          <span className="font-bold text-slate-700">Tidak Hadir:</span> {kbm.absentList.join(", ")}
        </div>
      )}

      {/* Done button — triggers auto-open Jurnal */}
      <button
        onClick={kbm.donePresensi}
        className="w-full bg-emerald-600 text-white text-xs md:text-sm font-bold py-3 md:py-3 rounded-xl active:scale-[0.98] transition-transform shadow-sm hover:bg-emerald-700 min-h-[44px]"
      >
        ✓ Selesai Presensi (Lanjut Jurnal)
      </button>
    </div>
  );
}

/* ============================================================ */
/*  Jurnal Content (Fixed Visual Hierarchy & Auto-Center Tab)   */
/* ============================================================ */

function JurnalContent({ kbm }: { kbm: ReturnType<typeof useKbmHub> }) {
  return (
    <div className="space-y-3.5 max-w-full overflow-hidden">

      {/* Realization Status */}
      <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3 border border-slate-200">
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Status Keterlaksanaan
        </span>
        <select
          value={kbm.realizationStatus}
          onChange={(e) =>
            kbm.setRealizationStatus(
              e.target.value as "done" | "continued" | "cancelled"
            )
          }
          className={`text-xs font-bold rounded-lg px-3 py-2 outline-none border min-h-[38px] ${
            kbm.realizationStatus === "done"
              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
              : kbm.realizationStatus === "continued"
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

      {kbm.realizationStatus !== "done" && (
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">
            Alasan {kbm.realizationStatus === "continued" ? "Penggantian" : "Ketidaklaksanaan"}
          </label>
          <input
            type="text"
            value={kbm.realizationReason}
            onChange={(e) => kbm.setRealizationReason(e.target.value)}
            placeholder="Tulis alasan..."
            className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs md:text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-300 min-h-[44px]"
          />
        </div>
      )}

      {/* Salin Jurnal Lalu */}
      <button
        onClick={kbm.handleCopyPreviousJournal}
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
          value={kbm.journalInput.actualMaterialTitle}
          onChange={(e) =>
            kbm.setJournalInput((prev) => ({
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
              const isActive = kbm.activeCategoryTab === cat.key;
              const count = kbm.structuredNote[cat.key].length;
              return (
                <button
                  key={cat.key}
                  onClick={(e) => {
                    kbm.setActiveCategoryTab(cat.key);
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
            <span>Pilih {STRUCTURED_NOTE_CATEGORIES.find(c => c.key === kbm.activeCategoryTab)?.label}:</span>
          </div>

          <div className="flex flex-wrap gap-1.5 w-full">
            {STRUCTURED_CHIPS[kbm.activeCategoryTab].map((chip) => {
              const isActive = kbm.structuredNote[kbm.activeCategoryTab].includes(chip);
              return (
                <button
                  key={chip}
                  onClick={() => kbm.toggleStructuredChip(kbm.activeCategoryTab, chip)}
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
              category={kbm.activeCategoryTab}
              existingChips={kbm.structuredNote[kbm.activeCategoryTab]}
              onAdd={kbm.toggleStructuredChip}
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
          {kbm.absentList.length > 0 ? kbm.absentList.join(", ") : "Nihil (-)"}
        </div>
      </div>

      {/* Auto Narasi */}
      {kbm.autoNarasi && (
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1">
            📝 Narasi Jurnal
            <span className="text-blue-500 font-normal ml-1">(Auto-Generated)</span>
          </label>
          <textarea
            value={kbm.autoNarasi}
            readOnly
            rows={3}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs md:text-sm text-slate-600 outline-none resize-none"
          />
        </div>
      )}

      {/* Catatan Tambahan */}
      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1">
          ✏️ Catatan Tambahan
        </label>
        <textarea
          value={kbm.journalInput.note}
          onChange={(e) =>
            kbm.setJournalInput((prev) => ({ ...prev, note: e.target.value }))
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
/*  Nilai Content                                                */
/* ============================================================ */

function NilaiContent({ kbm }: { kbm: ReturnType<typeof useKbmHub> }) {
  return (
    <div className="space-y-3">
      {/* Toggle ON/OFF */}
      <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3">
        <div>
          <p className="text-xs md:text-sm font-bold text-slate-700">Pengambilan Nilai Hari Ini?</p>
          <p className="text-[10px] md:text-xs text-slate-500">Aktifkan jika ada ulangan/asesmen</p>
        </div>
        <button
          onClick={() => kbm.setNilaiToggle(!kbm.nilaiToggle)}
          className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
            kbm.nilaiToggle ? "bg-emerald-500" : "bg-slate-300"
          }`}
          role="switch"
          aria-checked={kbm.nilaiToggle}
          aria-label="Toggle pengambilan nilai"
        >
          <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${
            kbm.nilaiToggle ? "translate-x-[22px]" : "translate-x-0.5"
          }`} />
        </button>
      </div>

      {/* Nilai form — only when toggle ON */}
      {kbm.nilaiToggle && (
        <div className="space-y-3">
          {/* Jenis Nilai selector */}
          <div>
            <label htmlFor="select-jenis-nilai" className="block text-[10px] md:text-xs font-bold text-slate-600 mb-1">
              Jenis Nilai
            </label>
            <select
              id="select-jenis-nilai"
              aria-label="Pilih Jenis Nilai"
              value={kbm.nilaiType}
              onChange={(e) => kbm.setNilaiType(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs md:text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-300 min-h-[44px]"
            >
              {NILAI_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Desktop: Table layout for nilai */}
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left p-2 text-xs font-bold text-slate-600">No</th>
                  <th className="text-left p-2 text-xs font-bold text-slate-600">Nama Siswa</th>
                  <th className="text-left p-2 text-xs font-bold text-slate-600">Status</th>
                  <th className="text-center p-2 text-xs font-bold text-slate-600 w-28">Nilai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {kbm.effectiveRecords.map((r, idx) => {
                  const isAbsent = r.status !== "present" && r.status !== "late";
                  return (
                    <tr key={r.studentId} className={isAbsent ? "bg-slate-50 opacity-60" : ""}>
                      <td className="p-2 text-xs text-slate-600">{idx + 1}</td>
                      <td className="p-2 text-xs font-medium text-slate-800">{r.studentName}</td>
                      <td className="p-2">
                        {isAbsent ? (
                          <span className="text-[9px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-full">
                            {r.status === "sick" ? "Sakit" : r.status === "excused" ? "Izin" : "Alpa"}
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">Hadir</span>
                        )}
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="--"
                          min={0}
                          max={100}
                          disabled={isAbsent}
                          value={kbm.nilaiMap.get(r.studentId) ?? ""}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === "") { kbm.setNilai(r.studentId, null); return; }
                            const parsed = parseInt(raw, 10);
                            if (isNaN(parsed)) return;
                            kbm.setNilai(r.studentId, Math.min(100, Math.max(0, parsed)));
                          }}
                          onFocus={(e) => e.target.select()}
                          className="w-20 bg-white border border-slate-300 rounded-lg p-2 text-center text-sm font-bold outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile: Card layout for nilai */}
          <div className="md:hidden space-y-1.5 max-h-[40vh] overflow-y-auto">
            {kbm.effectiveRecords.map((r) => {
              const isAbsent = r.status !== "present" && r.status !== "late";
              return (
                <div
                  key={r.studentId}
                  className={`flex items-center justify-between p-2.5 rounded-xl min-h-[44px] ${
                    isAbsent ? "bg-slate-50 opacity-60" : "bg-white border border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-xs font-semibold text-slate-700 truncate">
                      {r.studentName}
                    </span>
                    {isAbsent && (
                      <span className="text-[9px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-full shrink-0">
                        {r.status === "sick" ? "Sakit" : r.status === "excused" ? "Izin" : "Alpa"}
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="--"
                    min={0}
                    max={100}
                    disabled={isAbsent}
                    value={kbm.nilaiMap.get(r.studentId) ?? ""}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") { kbm.setNilai(r.studentId, null); return; }
                      const parsed = parseInt(raw, 10);
                      if (isNaN(parsed)) return;
                      kbm.setNilai(r.studentId, Math.min(100, Math.max(0, parsed)));
                    }}
                    onFocus={(e) => e.target.select()}
                    className="w-[72px] bg-white border border-slate-300 rounded-lg p-2.5 text-center text-xs font-bold outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-slate-100 disabled:text-slate-400 min-h-[44px]"
                  />
                </div>
              );
            })}
          </div>

          {/* Summary */}
          {kbm.nilaiMap.size > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
              <p className="text-xs md:text-sm text-emerald-700">
                <strong>{kbm.nilaiMap.size}</strong> nilai diisi · Rata-rata:{" "}
                <strong>
                  {Math.round(Array.from(kbm.nilaiMap.values()).reduce((a, b) => a + b, 0) / kbm.nilaiMap.size)}
                </strong>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================ */
/*  Memoized Sub-Components — avoid re-rendering entire list     */
/* ============================================================ */

/** Memoized presensi row — only re-renders when this student's props change */
const MemoPresensiRow = memo(function MemoPresensiRow({
  studentId,
  number,
  name,
  currentStatus,
  note,
  onStatusChange,
  onNoteChange,
}: {
  studentId: string;
  number: number;
  name: string;
  currentStatus: AttendanceStatus;
  note: string;
  onStatusChange: (studentId: string, status: AttendanceStatus) => void;
  onNoteChange: (studentId: string, note: string) => void;
}) {
  const isNotHadir = currentStatus !== "present" && currentStatus !== "late";
  const handleStatusChange = useCallback(
    (status: AttendanceStatus) => onStatusChange(studentId, status),
    [studentId, onStatusChange]
  );

  return (
    <div>
      <StudentRow
        number={number}
        name={name}
        status={currentStatus}
        onStatusChange={handleStatusChange}
        compact
      />
      {isNotHadir && (
        <div className="mt-0.5 ml-2 mb-1">
          <input
            type="text"
            placeholder="💬 Catatan (opsional)..."
            value={note}
            onChange={(e) => onNoteChange(studentId, e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-[10px] md:text-xs text-slate-600 outline-none focus:ring-1 focus:ring-blue-300 placeholder:text-slate-400 min-h-[44px]"
          />
        </div>
      )}
    </div>
  );
});

/* ============================================================ */
/*  3c: Custom Chip Input — "Lainnya..." for structured notes    */
/* ============================================================ */

function CustomChipInput({
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
