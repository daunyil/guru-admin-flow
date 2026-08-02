/**
 * PIKET-REDESIGN: Tab "Riwayat" — Riwayat Pelanggaran Siswa.
 *
 * Perubahan dari versi sebelumnya:
 *   - Judul ramah: "Riwayat Pelanggaran Siswa" bukan "Buku Kedisiplinan BK"
 *   - Status label lebih manusiawi: "Aman", "Perlu Bimbingan", "Panggilan Orang Tua", dst
 *   - Card lebih lega: padding p-4, spacing space-y-3
 *   - Font lebih besar: text-sm minimum, text-xs hanya untuk info sekunder
 *   - Tombol aksi lebih jelas dan ramah
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
  letterType: PiketLetterType;
  actionLabel: string;
  description: string;
} {
  if (yearPoints >= 100) {
    return {
      label: "Skorsing",
      color: "bg-rose-100 text-rose-800 border-rose-200",
      letterType: "student_statement",
      actionLabel: "Cetak Surat Pernyataan",
      description: "Siswa memerlukan tindak lanjut khusus",
    };
  }
  if (yearPoints >= 75) {
    return {
      label: "Panggilan Orang Tua ke-2",
      color: "bg-orange-100 text-orange-800 border-orange-200",
      letterType: "parent_summons",
      actionLabel: "Cetak Surat Panggilan",
      description: "Perlu panggilan orang tua kedua",
    };
  }
  if (yearPoints >= 50) {
    return {
      label: "Panggilan Orang Tua",
      color: "bg-amber-100 text-amber-800 border-amber-200",
      letterType: "parent_summons",
      actionLabel: "Cetak Surat Panggilan",
      description: "Perlu panggilan orang tua",
    };
  }
  if (yearPoints >= 25) {
    return {
      label: "Perlu Bimbingan",
      color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      letterType: "parent_summons",
      actionLabel: "Cetak Surat Panggilan",
      description: "Perlu pembinaan dari BK",
    };
  }
  return {
    label: "Aman",
    color: "bg-emerald-100 text-emerald-800 border-emerald-200",
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
      <Card>
        <EmptyState
          title="Belum Ada Data Pelanggaran"
          description="Data pelanggaran siswa akan otomatis muncul di sini setelah Anda melaporkan pelanggaran di tab Laporkan."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* ─── Ringkasan ─── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-slate-900">{todayCount}</div>
          <div className="text-xs text-slate-500 mt-0.5">Hari Ini</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-slate-900">{totalStudents}</div>
          <div className="text-xs text-slate-500 mt-0.5">Siswa Tercatat</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-amber-600">{needAttention}</div>
          <div className="text-xs text-slate-500 mt-0.5">Perlu Perhatian</div>
        </div>
      </div>

      {/* ─── Filter & Search ─── */}
      <Card>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Pilih kelas</label>
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
      </Card>

      {/* ─── Daftar Siswa ─── */}
      {filtered.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500 text-center py-4">Tidak ada siswa ditemukan.</p>
        </Card>
      ) : (
        filtered.map((item) => {
          const badge = getStatusBadge(item.yearPoints);
          return (
            <div
              key={`${item.studentId}__${item.classId}`}
              className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-sm"
            >
              {/* Baris utama: nama + badge */}
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-900">{item.studentName}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{item.classLabel}</div>
                </div>
                <span className={`shrink-0 text-xs font-bold px-3 py-1 rounded-lg border ${badge.color}`}>
                  {badge.label}
                </span>
              </div>

              {/* Info poin */}
              <div className="flex gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Hari ini: </span>
                  <span className={item.todayPoints > 0 ? "font-semibold text-rose-600" : "text-slate-400"}>
                    {item.todayRecords > 0 ? `${item.todayRecords} catatan (+${item.todayPoints} poin)` : "Tidak ada"}
                  </span>
                </div>
              </div>
              <div className="flex gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Total setahun: </span>
                  <span className={`font-semibold ${item.yearPoints >= 50 ? "text-rose-600" : item.yearPoints >= 25 ? "text-amber-600" : "text-slate-700"}`}>
                    {item.yearPoints} poin
                  </span>
                  <span className="text-xs text-slate-400 ml-1">({item.yearRecords} kejadian)</span>
                </div>
              </div>

              {/* Detail pelanggaran hari ini */}
              {item.todayDetails.length > 0 && (
                <div className="space-y-1.5 mt-1">
                  <div className="text-xs font-medium text-slate-500">Pelanggaran hari ini:</div>
                  {item.todayDetails.map((d, idx) => (
                    <div key={idx} className="text-xs text-slate-600 pl-3 border-l-2 border-slate-200">
                      {d.ruleLabel} (+{d.points}){d.note ? ` — ${d.note}` : ""}
                    </div>
                  ))}
                </div>
              )}

              {/* Deskripsi status */}
              {item.yearPoints >= 25 && (
                <div className="text-xs text-slate-500 italic">
                  {badge.description}
                </div>
              )}

              {/* Tombol aksi */}
              <div className="flex gap-2 pt-2 border-t border-slate-100">
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
                    className="flex-1 bg-rose-50 text-rose-700 border border-rose-200 font-semibold text-sm py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-rose-100 active:scale-[0.98] transition-all"
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
                  className="flex-1 bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-sm py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-100 active:scale-[0.98] transition-all"
                >
                  <span>📋</span> Lihat Detail
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
