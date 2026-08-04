import { CascadingSelector } from "./CascadingSelector";
import type { ClassOption, SubjectOption, SessionOption } from "../types";

export interface MobileHeaderProps {
  todayDate: string;
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
}

export function MobileHeader({
  todayDate,
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
}: MobileHeaderProps) {
  return (
    <>
      {/* Top bar */}
      <div className="flex justify-between items-center mb-3">
        <span className="bg-white/15 backdrop-blur-sm text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-white/20">
          KBM
        </span>
        <span className="text-[11px] text-emerald-200 font-medium">
          {todayDate}
        </span>
      </div>

      {/* Cascading Selector */}
      <CascadingSelector
        variant="mobile"
        selectedClassId={selectedClassId}
        selectedSubject={selectedSubject}
        selectedSessionId={selectedSessionId}
        classOptions={classOptions}
        subjectOptions={subjectOptions}
        filteredSessions={filteredSessions}
        setSelectedClassId={setSelectedClassId}
        setSelectedSubject={setSelectedSubject}
        setSelectedSessionId={setSelectedSessionId}
        handlePertemuanTambahan={handlePertemuanTambahan}
        isDirty={isDirty}
      />

      {/* MULAI KBM action button */}
      {selectedClassId && selectedSubject && !selectedSessionId && (
        <button
          onClick={handlePertemuanTambahan}
          className="w-full mt-3 bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm font-bold py-3 px-4 rounded-xl active:scale-[0.98] transition-transform shadow-sm flex items-center justify-center gap-2 hover:bg-white/25 min-h-[44px]"
        >
          <span className="text-base">🚀</span>
          MULAI KBM SESI INI
        </button>
      )}
    </>
  );
}
