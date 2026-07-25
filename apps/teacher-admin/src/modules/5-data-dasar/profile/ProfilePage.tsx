/**
 * Modul M01 Profil: SchoolProfile + TeacherProfile + AcademicYear manager.
 * Sumber: docs/PROJECT_CONTRACT.md §4.1 (M01)
 */

import { useState } from "react";
import { TabButton } from "./TabButton";
import { SchoolProfileForm } from "./SchoolProfileForm";
import { TeacherProfileForm } from "./TeacherProfileForm";
import { AcademicYearManager } from "./AcademicYearManager";

export function ProfilePage() {
  const [tab, setTab] = useState<"school" | "teacher" | "years">("school");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Profil</h1>
        <p className="text-sm text-slate-500 mt-1">
          Data master sekolah, guru, dan tahun pelajaran. Disimpan lokal di perangkat.
        </p>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        <TabButton active={tab === "school"} onClick={() => setTab("school")}>
          Sekolah
        </TabButton>
        <TabButton active={tab === "teacher"} onClick={() => setTab("teacher")}>
          Guru
        </TabButton>
        <TabButton active={tab === "years"} onClick={() => setTab("years")}>
          Tahun Pelajaran
        </TabButton>
      </div>

      {tab === "school" && <SchoolProfileForm />}
      {tab === "teacher" && <TeacherProfileForm />}
      {tab === "years" && <AcademicYearManager />}
    </div>
  );
}
