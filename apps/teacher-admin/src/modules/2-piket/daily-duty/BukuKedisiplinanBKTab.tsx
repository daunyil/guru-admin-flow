/**
 * PIKET-REDESIGN-V2: Tab "Riwayat" — Riwayat Pelanggaran Siswa.
 *
 * V2 changes:
 *   - Consistent card styling with rounded-2xl
 *   - MiniStat-style summary stats
 *   - Better student card layout with section headers
 *   - Desktop responsive
 *   - Professional badge styling
 *   - Better touch targets
 */

import { useState, useMemo } from "react";
import { Card, CardHeader, Input, EmptyState } from "@shared/ui";
import { Chip } from "./Chip";
import type { StudentDutyLedgerItem, DutyRecord, ClassRoster } from "@guru-admin/domain";
import type { PiketLetterType } from "./piket-letter";

interface BukuKedisiplinanBKTabProps {
  records: DutyRecord[];
  ledger: StudentDutyLedgerItem[];
  rosters: ClassRoster[];
  handleBuildLetter: (type: PiketLetterType, item?: StudentDutyLedgerItem) => void;
  handleOpenLedgerDetail: (item: StudentDutyLedgerItem) => void;
}

/** Info per siswa yang dikumpulkan dari records hari ini + ledger */
interface StudentBKInfo {
  studentId: string;
  studentName: string;
  classId: string;
  classLabel: string;
  todayRecords: number;
  todayPoints: number;
  yearPoints: number;
  yearRecords: number;
  statusLabel: string;
  todayDetails: Array<{ ruleLabel: string; points: number; note?: string }>;
}

/** Status label ramah — lebih manusiawi */
function getStatusBadge(yearPoints: number): {
  label: string;
  color: string;
  dotColor: string;
  letterType: PiketLetterType;
  actionLabel: string;
  description: string;
} {
  if (yearPoints >= 100) {
    return {
      label: "Skorsing",
      color: "bg-rose-100 text-rose-700",
      dotColor: "bg-rose-500",
      letterType: "student_statement",
      actionLabel: "Cetak Surat Pernyataan",
      description: "Siswa memerlukan tindak lanjut khusus",
    };
  }
  if (yearPoints >= 75) {
    return {
      label: "SP 2",
      color: "bg-orange-100 text-orange-700",
      dotColor: "bg-orange-500",
      letterType: "parent_summons",
      actionLabel: "Cetak Surat Panggilan",
      description: "Perlu panggilan orang tua kedua",
    };
  }
  if (yearPoints >= 50) {
    return {
      label: "SP 1",
      color: "bg-amber-100 text-amber-700",
      dotColor: "bg-amber-500",
      letterType: "parent_summons",
      actionLabel: "Cetak Surat Panggilan",
      description: "Perlu panggilan orang tua",
    };
  }
  if (yearPoints >= 25) {
    return {
      label: "Bimbingan",
      color: "bg-yellow-100 text-yellow-700",
      dotColor: "bg-yellow-500",
      letterType: "parent_summons",
      actionLabel: "Cetak Surat Panggilan",
      description: "Perlu pembinaan dari BK",
    };
  }
  return {
    label: "Aman",
    color: "bg-emerald-100 text-emerald-700",
    dotColor: "bg-emerald-500",
    letterType: "parent_summons",
    actionLabel: "",
    description: "Belum perlu tindak lanjut khusus",
  };
}

/** Bangun StudentBKInfo dari records (hari ini) + ledger (setahun) */
function buildStudentBKList(
  records: DutyRecord[],
  ledger: StudentDutyLedgerItem[]
): StudentBKInfo[] {
  const todayMap = new Map<string, {
    studentId: string;
    studentName: string;
    classId: string;
    classLabel: string;
    records: DutyRecord[];
    totalPoints: number;
  }>();

  for (const r of records) {
    const key = `${r.studentId}__${r.classId}`;
    if (!todayMap.has(key)) {
      todayMap.set(key, {
        studentId: r.studentId,
        studentName: r.studentName,
        classId: r.classId,
        classLabel: r.classLabel,
        records: [],
        totalPoints: 0,
      });
    }
    const entry = todayMap.get(key)!;
    entry.records.push(r);
    entry.totalPoints += r.points;
  }

  const ledgerMap = new Map<string, StudentDutyLedgerItem>();
  for (const item of ledger) {
    ledgerMap.set(`${item.studentId}__${item.classId}`, item);
  }

  const allKeys = new Set([...todayMap.keys(), ...ledgerMap.keys()]);
  const result: StudentBKInfo[] = [];

  for (const key of allKeys) {
    const today = todayMap.get(key);
    const year = ledgerMap.get(key);

    result.push({
      studentId: today?.studentId ?? year?.studentId ?? "",
      studentName: today?.studentName ?? year?.studentName ?? "",
      classId: today?.classId ?? year?.classId ?? "",
      classLabel: today?.classLabel ?? year?.classLabel ?? "",
      todayRecords: today?.records.length ?? 0,
      todayPoints: today?.totalPoints ?? 0,
      yearPoints: year?.totalPoints ?? today?.totalPoints ?? 0,
      yearRecords: year?.totalRecords ?? today?.records.length ?? 0,
      statusLabel: year?.statusLabel ?? getStatusBadge(today?.totalPoints ?? 0).label,
      todayDetails: today?.records.map(r => ({
        ruleLabel: r.ruleLabel,
        points: r.points,
        note: r.note ?? undefined,
      })) ?? [],
    });
  }

  result.sort((a, b) => b.yearPoints - a.yearPoints);
  return result;
}

export function BukuKedisiplinanBKTab({
  records,
  ledger,
  rosters,
  handleBuildLetter,
  handleOpenLedgerDetail,
}: BukuKedisiplinanBKTabProps) {
  const [classFilter, setClassFilter] = useState<string>("all");
  const [studentQuery, setStudentQuery] = useState("");

  const studentList = useMemo(
    () => buildStudentBKList(records, ledger),
    [records, ledger]
  );

  const filtered = useMemo(() => {
    let items = studentList;
    if (classFilter !== "all") items = items.filter((i) => i.classId === classFilter);
    if (studentQuery.trim()) {
      const q = studentQuery.toLowerCase();
      items = items.filter(
        (i) =>
          i.studentName.toLowerCase().includes(q) ||
          String(i.studentId).includes(q)
      );
    }
    return items;
  }, [studentList, classFilter, studentQuery]);

  // Stats
  const todayCount = records.length;
  const totalStudents = studentList.length;
  const needAttention = studentList.filter((i) => i.yearPoints >= 25).length;

  if (records.length === 0 && ledger.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <EmptyState
          title="Belum Ada Data Pelanggaran"
          description="Data pelanggaran siswa akan otomatis muncul di sini setelah Anda melaporkan pelanggaran di tab Laporkan."
        />
      </div>
    );
  }

  return (
    <div className="space-y-3 md:space-y-4">
      {/* ─── Ringkasan Stats (MiniStat-style) ─── */}
      <div className="grid grid-cols-3 gap-1.5 md:gap-2 text-center">
        <div className="rounded-xl bg-slate-50 p-2 md:p-3">
          <div className="text-xl md:text-2xl font-black text-slate-900">{todayCount}</div>
          <div className="text-[9px] md:text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Hari Ini</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-2 md:p-3">
          <div className="text-xl md:text-2xl font-black text-slate-900">{totalStudents}</div>
          <div className="text-[9px] md:text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Siswa</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-2 md:p-3">
          <div className="text-xl md:text-2xl font-black text-amber-600">{needAttention}</div>
          <div className="text-[9px] md:text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Perlu Perhatian</div>
        </div>
      </div>

      {/* ─── Filter & Search ─── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 md:p-4">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-600 mb-2 block uppercase tracking-wider">Pilih kelas</label>
            <div className="flex gap-2 flex-wrap">
              <Chip active={classFilter === "all"} onClick={() => setClassFilter("all")}>Semua</Chip>
              {rosters.map((r) => (
                <Chip key={r.classId} active={classFilter === r.classId} onClick={() => setClassFilter(r.classId)}>
                  {r.classLabel}
                </Chip>
              ))}
            </div>
          </div>

          <Input
            label="🔍 Cari siswa"
            id="bk-student-search"
            value={studentQuery}
            onChange={setStudentQuery}
            placeholder="Ketik nama siswa..."
          />
        </div>
      </div>

      {/* ─── Daftar Siswa ─── */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <p className="text-sm text-slate-500 text-center">Tidak ada siswa ditemukan.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-4 py-2.5 md:py-3 border-b border-slate-100">
            <h3 className="text-xs md:text-sm font-bold text-slate-800 uppercase tracking-wider">
              Daftar Siswa ({filtered.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {filtered.map((item) => {
              const badge = getStatusBadge(item.yearPoints);
              return (
                <div key={`${item.studentId}__${item.classId}`} className="p-3 md:p-4 space-y-2.5">
                  {/* Baris utama: nama + badge */}
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${badge.dotColor}`} />
                        <span className="text-xs md:text-sm font-bold text-slate-900 truncate">{item.studentName}</span>
                      </div>
                      <div className="text-[10px] md:text-xs text-slate-500 mt-0.5 ml-4">{item.classLabel}</div>
                    </div>
                    <span className={`shrink-0 text-[10px] md:text-xs font-bold px-2.5 py-1 rounded-full ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Info poin — compact grid */}
                  <div className="flex gap-3 ml-4 text-xs md:text-sm">
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500">Hari ini:</span>
                      <span className={item.todayPoints > 0 ? "font-bold text-rose-600" : "text-slate-400"}>
                        {item.todayRecords > 0 ? `${item.todayRecords} (+${item.todayPoints})` : "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500">Total:</span>
                      <span className={`font-bold ${item.yearPoints >= 50 ? "text-rose-600" : item.yearPoints >= 25 ? "text-amber-600" : "text-slate-700"}`}>
                        {item.yearPoints} poin
                      </span>
                      <span className="text-[10px] text-slate-400">({item.yearRecords}x)</span>
                    </div>
                  </div>

                  {/* Detail pelanggaran hari ini */}
                  {item.todayDetails.length > 0 && (
                    <div className="space-y-1 ml-4">
                      {item.todayDetails.map((d, idx) => (
                        <div key={idx} className="text-[10px] md:text-xs text-slate-600 pl-3 border-l-2 border-slate-200">
                          {d.ruleLabel} (+{d.points}){d.note ? ` — ${d.note}` : ""}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tombol aksi — selalu tampil */}
                  <div className="flex gap-2 pt-2 border-t border-slate-100 ml-4">
                    {item.yearPoints >= 25 && (
                      <button
                        type="button"
                        onClick={() => {
                          const ledgerItem = ledger.find(
                            (l) => l.studentId === item.studentId && l.classId === item.classId
                          );
                          if (ledgerItem) {
                            handleOpenLedgerDetail(ledgerItem);
                            handleBuildLetter(badge.letterType, ledgerItem);
                          }
                        }}
                        className="flex-1 bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs md:text-sm py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-rose-100 active:scale-[0.98] transition-all min-h-[44px]"
                      >
                        <span>🖨️</span> {badge.actionLabel}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const ledgerItem = ledger.find(
                          (l) => l.studentId === item.studentId && l.classId === item.classId
                        );
                        if (ledgerItem) handleOpenLedgerDetail(ledgerItem);
                      }}
                      className={`${item.yearPoints >= 25 ? "flex-1" : "w-full"} bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs md:text-sm py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-100 active:scale-[0.98] transition-all min-h-[44px]`}
                    >
                      <span>📋</span> Lihat Detail
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
