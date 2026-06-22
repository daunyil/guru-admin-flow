/**
 * ContextCard — kartu konteks yang menampilkan info assignment.
 *
 * APP-USABLE-RC1 Issue 3: semua layar kerja wajib menampilkan
 * Guru, Mapel, Kelas, Semester, Tahun Pelajaran.
 *
 * Dipakai di: QuickAttendancePage, QuickJournalPage, GradesPage.
 */

import { Card } from "./index";
import type { ContextInfo } from "@guru-admin/domain";
import { contextEntries } from "@guru-admin/domain";

export function ContextCard({ info }: { info: ContextInfo }) {
  const entries = contextEntries(info);
  return (
    <Card className="bg-slate-50">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
        {entries.map((e) => (
          <div key={e.label}>
            <p className="text-slate-500 uppercase tracking-wider font-semibold">
              {e.label}
            </p>
            <p className="text-slate-900 font-medium mt-0.5">{e.value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
