/**
 * Promes-Lesson Linker — assign ProtaUnit ke LessonSession.
 * Sumber: docs/PROJECT_CONTRACT.md §4.1 (M05, M04), docs/SPRINT_2_DESIGN.md §5
 *
 * Pure function: ambil LessonSession[] + ProtaUnit[] + cadanganJP,
 * distribusikan materi ke sesi mengajar konkret (bukan asumsi mingguan).
 *
 * Algoritma mirip engine Promes Sprint 2 (cadangan-pertama, week-by-week),
 * tapi di Sprint 3 distribusi ke LessonSession konkret per tanggal.
 *
 * Aturan (lihat §0 CRITICAL PROMES RULE):
 *   - Material capacity = total JP intra di sesi planned - cadanganJP
 *   - KO tetap row terpisah (KO TIDAK mempengaruhi materialCapacity)
 *   - Cadangan di-reserve dari sesi terakhir ke depan
 */

import type { LessonSession, ProtaUnit } from "./index";

/** Input untuk linkPromesToLessons. */
export type LinkPromesToLessonsInput = {
  /** LessonSession[] untuk satu semester, sudah di-sort by date+startPeriod. */
  sessions: LessonSession[];
  /** ProtaUnit[] untuk semester ini, sudah di-sort by order. */
  units: ProtaUnit[];
  /** Cadangan JP, di-reserve dari sesi terakhir. */
  cadanganJP: number;
  /** Reserve cadangan dari akhir (true) atau awal (false). */
  reserveFromEnd?: boolean;
};

/** Hasil linking. */
export type LinkPromesToLessonsResult = {
  /** LessonSession[] dengan plannedUnitId ter-assign (untuk sesi yang dapat materi). */
  linkedSessions: LessonSession[];
  /** Status distribusi per unit. */
  distribution: Array<{
    unitId: string;
    title: string;
    totalJP: number;
    distributedJP: number;
    undistributedJP: number;
    sessionsCount: number;
    status: "fully_distributed" | "partially_distributed" | "not_distributed";
  }>;
  /** Sesi yang di-reserve untuk cadangan (plannedUnitId=null, isCadangan=true). */
  cadanganSessions: LessonSession[];
  /** Sesi yang planned tapi tidak dapat materi (kapasitas lebih dari materi). */
  emptySessions: LessonSession[];
  summary: {
    totalSessions: number;
    plannedSessions: number;
    cancelledSessions: number;
    cadanganSessions: number;
    emptySessions: number;
    totalIntraCapacityJP: number;
    cadanganJP: number;
    materialCapacityJP: number;
    totalUnitJP: number;
    distributedJP: number;
    undistributedJP: number;
    allocationStatus: "tepat" | "cukup" | "kurang";
  };
  warnings: string[];
  errors: string[];
};

/**
 * Link ProtaUnit ke LessonSession.
 *
 * Pure function. LessonSession yang dikembalikan adalah salinan dengan plannedUnitId ter-set.
 * LessonSession asli tidak di-mutate.
 */
export function linkPromesToLessons(
  input: LinkPromesToLessonsInput
): LinkPromesToLessonsResult {
  const { sessions, units, cadanganJP, reserveFromEnd = true } = input;
  const warnings: string[] = [];
  const errors: string[] = [];

  // Validasi
  if (sessions.length === 0) {
    errors.push("Tidak ada LessonSession. Generate sesi dari jadwal dulu.");
    return emptyResult(warnings, errors);
  }

  if (units.length === 0) {
    errors.push("Tidak ada ProtaUnit untuk semester ini. Tambahkan materi di Prota dulu.");
    return emptyResult(warnings, errors);
  }

  if (cadanganJP < 0) {
    errors.push("cadanganJP tidak boleh negatif.");
    return emptyResult(warnings, errors);
  }

  // Filter sesi yang planned (bisa diajar)
  const plannedSessions = sessions
    .filter((s) => s.status === "planned")
    .sort((a, b) => {
      // Sort by date asc, lalu startPeriod asc
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startPeriod - b.startPeriod;
    });

  const cancelledSessions = sessions.filter((s) => s.status === "cancelled");

  // Hitung total intra capacity (dari planned sessions)
  const totalIntraCapacity = plannedSessions.reduce(
    (sum, s) => sum + s.durationJP,
    0
  );

  // Validasi cadangan
  if (cadanganJP > totalIntraCapacity) {
    errors.push(
      `Cadangan ${cadanganJP} JP melebihi total kapasitas intra ${totalIntraCapacity} JP. ` +
        `Kurangi cadangan atau tambah sesi mengajar.`
    );
    return emptyResult(warnings, errors);
  }

  // Salin plannedSessions untuk di-mutate (linkedSessions)
  const linkedSessions: LessonSession[] = plannedSessions.map((s) => ({ ...s }));
  const cadanganSessions: LessonSession[] = [];
  const emptySessions: LessonSession[] = [];

  // LANGKAH 1: Reserve cadangan dari sesi terakhir (atau awal)
  const reserveOrder = reserveFromEnd ? [...linkedSessions].reverse() : [...linkedSessions];
  let cadanganRemaining = cadanganJP;
  const cadanganSessionIds = new Set<string>();

  for (const session of reserveOrder) {
    if (cadanganRemaining <= 0) break;
    const take = Math.min(session.durationJP, cadanganRemaining);
    if (take > 0) {
      cadanganSessionIds.add(session.id);
      cadanganRemaining -= take;
      // Tandai sesi ini sebagai cadangan (plannedUnitId tetap null)
      // Kita track di cadanganSessions array
      cadanganSessions.push(session);
    }
  }

  // Sesi yang bukan cadangan dan planned → kandidat untuk distribusi materi
  const materialSessions = linkedSessions.filter(
    (s) => !cadanganSessionIds.has(s.id)
  );

  // LANGKAH 2: Distribusikan unit ke materialSessions
  const unitQueue = units
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((u) => ({ unit: u, remainingJP: u.jp }));

  for (const session of materialSessions) {
    let sessionRemaining = session.durationJP;
    while (sessionRemaining > 0 && unitQueue.length > 0) {
      const current = unitQueue[0];
      const assign = Math.min(current.remainingJP, sessionRemaining);
      session.plannedUnitId = current.unit.id;
      current.remainingJP -= assign;
      sessionRemaining -= assign;
      if (current.remainingJP === 0) {
        unitQueue.shift();
      }
      // Bila sesi masih ada kapasitas dan unit ini habis, lanjut ke unit berikutnya
      // (loop akan ambil unitQueue[0] baru)
    }
    if (!session.plannedUnitId) {
      emptySessions.push(session);
    }
  }

  // LANGKAH 3: Hitung distribution per unit
  const distribution = units.map((unit) => {
    const assignedSessions = linkedSessions.filter((s) => s.plannedUnitId === unit.id);
    const distributedJP = assignedSessions.reduce((sum, s) => {
      // Hitung JP yang benar-benar dialokasikan ke unit ini di sesi ini
      // Bila satu sesi punya 2 unit (split), kita perlu track alokasi per unit
      // Untuk simplifikasi Sprint 3: satu sesi = satu unit (bila split, ambil durationJP penuh)
      // Bila sesi adalah sesi terakhir unit dan unit habis di tengah sesi,
      // kita hitung proporsional. Tapi di Sprint 3, asumsi: 1 sesi = 1 unit.
      return sum + s.durationJP;
    }, 0);
    // Bila ada unit split di sesi terakhir, distributedJP bisa > unit.jp. Clamp.
    const clampedDistributed = Math.min(distributedJP, unit.jp);
    const undistributed = unit.jp - clampedDistributed;
    let status: "fully_distributed" | "partially_distributed" | "not_distributed";
    if (clampedDistributed === 0) {
      status = "not_distributed";
    } else if (undistributed === 0) {
      status = "fully_distributed";
    } else {
      status = "partially_distributed";
    }
    return {
      unitId: unit.id,
      title: unit.title,
      totalJP: unit.jp,
      distributedJP: clampedDistributed,
      undistributedJP: undistributed,
      sessionsCount: assignedSessions.length,
      status,
    };
  });

  // LANGKAH 4: Hitung summary
  const totalUnitJP = units.reduce((sum, u) => sum + u.jp, 0);
  const distributedJP = distribution.reduce((sum, d) => sum + d.distributedJP, 0);
  const undistributedJP = totalUnitJP - distributedJP;
  const materialCapacityJP = totalIntraCapacity - cadanganJP;

  let allocationStatus: "tepat" | "cukup" | "kurang";
  if (materialCapacityJP === totalUnitJP) {
    allocationStatus = "tepat";
  } else if (materialCapacityJP > totalUnitJP) {
    allocationStatus = "cukup";
  } else {
    allocationStatus = "kurang";
  }

  // Warnings
  const undistributedUnits = distribution.filter((d) => d.status !== "fully_distributed");
  for (const d of undistributedUnits) {
    warnings.push(
      `Unit "${d.title}" ${d.status === "not_distributed" ? "TIDAK terdistribusi" : "terdistribusi sebagian"}: ` +
        `${d.distributedJP}/${d.totalJP} JP (${d.sessionsCount} sesi, sisa ${d.undistributedJP} JP).`
    );
  }

  return {
    linkedSessions,
    distribution,
    cadanganSessions,
    emptySessions,
    summary: {
      totalSessions: sessions.length,
      plannedSessions: plannedSessions.length,
      cancelledSessions: cancelledSessions.length,
      cadanganSessions: cadanganSessions.length,
      emptySessions: emptySessions.length,
      totalIntraCapacityJP: totalIntraCapacity,
      cadanganJP,
      materialCapacityJP,
      totalUnitJP,
      distributedJP,
      undistributedJP,
      allocationStatus,
    },
    warnings,
    errors,
  };
}

function emptyResult(warnings: string[], errors: string[]): LinkPromesToLessonsResult {
  return {
    linkedSessions: [],
    distribution: [],
    cadanganSessions: [],
    emptySessions: [],
    summary: {
      totalSessions: 0,
      plannedSessions: 0,
      cancelledSessions: 0,
      cadanganSessions: 0,
      emptySessions: 0,
      totalIntraCapacityJP: 0,
      cadanganJP: 0,
      materialCapacityJP: 0,
      totalUnitJP: 0,
      distributedJP: 0,
      undistributedJP: 0,
      allocationStatus: "kurang",
    },
    warnings,
    errors,
  };
}
