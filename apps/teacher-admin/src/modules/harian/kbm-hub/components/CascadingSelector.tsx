import { useCallback } from "react";
import type { ClassOption, SubjectOption, SessionOption } from "../types";
import { formatSessionDateLabel } from "../constants";

export interface CascadingSelectorProps {
  selectedClassId: string | null;
  selectedSubject: string | null;
  selectedSessionId: string | null;
  classOptions: ClassOption[];
  subjectOptions: SubjectOption[];
  filteredSessions: SessionOption[];
  setSelectedClassId: (classId: string) => void;
  setSelectedSubject: (subject: string) => void;
  setSelectedSessionId: (id: string | null) => void;
  handlePertemuanTambahan: () => void;
  isDirty: boolean;
  variant: "mobile" | "desktop";
}

export function CascadingSelector({
  selectedClassId,
  selectedSubject,
  selectedSessionId,
  classOptions,
  subjectOptions,
  filteredSessions,
  setSelectedClassId,
  setSelectedSubject,
  setSelectedSessionId,
  handlePertemuanTambahan,
  isDirty,
  variant,
}: CascadingSelectorProps) {
  const isMobile = variant === "mobile";

  /* ---- 1a: Guard selector changes with unsaved data ---- */
  const guardChange = useCallback((action: () => void) => {
    if (isDirty && !window.confirm("Data belum disimpan. Yakin ingin berpindah?")) return;
    action();
  }, [isDirty]);

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
          value={selectedClassId ?? ""}
          onChange={(e) => guardChange(() => setSelectedClassId(e.target.value))}
          className={selectClass}
        >
          <option value="" className={optionClass}>Pilih Kelas...</option>
          {classOptions.map((c) => (
            <option key={c.classId} value={c.classId} className={optionClass}>
              {c.classLabel}
            </option>
          ))}
        </select>
      </div>

      {/* 2. Mapel */}
      {selectedClassId && (
        <div>
          <label htmlFor="select-mapel" className={labelClass}>Mapel</label>
          <select
            id="select-mapel"
            aria-label="Pilih Mata Pelajaran"
            value={selectedSubject ?? ""}
            onChange={(e) => guardChange(() => setSelectedSubject(e.target.value))}
            className={selectClass}
          >
            <option value="" className={optionClass}>Pilih Mapel...</option>
            {subjectOptions.map((s) => (
              <option key={s.subject} value={s.subject} className={optionClass}>
                {s.subject}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 3. Sesi */}
      {selectedSubject && (
        <div>
          <label htmlFor="select-sesi" className={labelClass}>Sesi</label>
          <select
            id="select-sesi"
            aria-label="Pilih Pertemuan"
            value={selectedSessionId ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "__tambahan__") {
                guardChange(() => handlePertemuanTambahan());
              } else {
                guardChange(() => setSelectedSessionId(val || null));
              }
            }}
            className={selectClass}
          >
            <option value="" className={optionClass}>Pilih Pertemuan...</option>
            {filteredSessions.map((s) => (
              <option key={s.session.id} value={s.session.id} className={optionClass}>
                {s.statusIcon} P{s.meetingNumber} — {s.statusLabel} ({formatSessionDateLabel(s.session.date)})
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
