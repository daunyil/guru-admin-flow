import { CascadingSelector } from "./CascadingSelector";
import type { ClassOption, SubjectOption, SessionOption } from "../types";

export interface DesktopHeaderProps {
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

export function DesktopHeader({
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
}: DesktopHeaderProps) {
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">KBM Harian</h1>
          <p className="text-xs text-slate-500">{todayDate}</p>
        </div>
        <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-200">
          KBM
        </span>
      </div>

      {/* Cascading Selector */}
      <CascadingSelector
        variant="desktop"
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
          className="mt-3 bg-emerald-600 text-white text-sm font-bold py-2.5 px-5 rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-sm"
        >
          🚀 MULAI KBM SESI INI
        </button>
      )}
    </>
  );
}
