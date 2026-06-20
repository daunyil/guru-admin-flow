/**
 * Engine generate Promes — PURE FUNCTION.
 * Sumber: docs/SPRINT_2_DESIGN.md §5
 *
 * Aturan KRITIS (lihat §0 CRITICAL PROMES RULE):
 *   1. Material capacity = (effectiveWeeks × intraJpPerWeek) - cadanganJP
 *      BUKAN pakai total 3 JP/minggu.
 *   2. KO tampil sebagai row terpisah, koTotalJP TIDAK mengurangi materialCapacityJP.
 *   3. Cadangan di-reserve dari INTRA capacity (bukan total).
 *   4. Cadangan TIDAK BOLEH membuat materialCapacityJP negatif → ERROR.
 *   5. Materi didistribusikan berurutan ke minggu yang availableForMaterial.
 *   6. Bila materi tidak muat → status="needs_fix" + tampilkan JP belum terdistribusi.
 */

import type {
  GeneratePromesInput,
  PromesOptions,
  PromesResult,
  PromesWeek,
  KORow,
  UnitDistribution,
  PromesSummary,
  KOMode,
} from "./promes-types";
import type { ProtaUnit } from "./prota";
import { parseISODate, toISODate, getDayOfWeek, dateRangesOverlap } from "@guru-admin/shared";

/**
 * Generate Promes dari Prota + Kalender + options.
 * PURE FUNCTION — tidak ada side effect, tidak baca dari Dexie.
 */
export function generatePromes(input: GeneratePromesInput): PromesResult {
  const { prota, calendar, semester, options } = input;
  const warnings: string[] = [];
  const errors: string[] = [];

  // Validasi input awal
  if (options.intraJpPerWeek <= 0) {
    errors.push(
      `intraJpPerWeek harus > 0. Diterima: ${options.intraJpPerWeek}. Tidak ada kapasitas untuk distribusi materi.`
    );
  }
  if (options.cadanganJP < 0) {
    errors.push(`cadanganJP tidak boleh negatif. Diterima: ${options.cadanganJP}.`);
  }
  if (options.koJpPerWeek < 0) {
    errors.push(`koJpPerWeek tidak boleh negatif. Diterima: ${options.koJpPerWeek}.`);
  }
  if (errors.length > 0) {
    return emptyResult(warnings, errors);
  }

  // Validasi Prota status
  if (prota.status === "final" || prota.status === "locked") {
    errors.push(
      `Prota berstatus "${prota.status}". Ubah ke draft dulu sebelum generate Promes.`
    );
    return emptyResult(warnings, errors);
  }

  // LANGKAH 1: Tentukan rentang semester
  const academicYear = input.academicYear;
  const semesterStart =
    semester === 1 ? academicYear.semester1Start : academicYear.semester2Start;
  const semesterEnd =
    semester === 1 ? academicYear.semester1End : academicYear.semester2End;

  // CalendarEvent tidak punya field semester, jadi kita filter pakai rentang tanggal
  // Ambil CalendarEvent yang overlap dengan rentang semester
  const semesterCalendar = calendar.filter((e) =>
    dateRangesOverlap(e.startDate, e.endDate, semesterStart, semesterEnd)
  );

  if (semesterCalendar.length === 0) {
    errors.push(
      `Kalender kosong untuk semester ${semester}. Impor kalender dulu di menu Kalender.`
    );
    return emptyResult(warnings, errors);
  }

  // LANGKAH 2: Enumerasi minggu-minggu dalam semester (Senin-Minggu)
  const weeks = enumerateWeeks(semesterStart, semesterEnd);
  if (weeks.length === 0) {
    errors.push(`Tidak ada minggu dalam rentang semester ${semester}.`);
    return emptyResult(warnings, errors);
  }

  // LANGKAH 3: Tentukan isEffective per minggu
  for (const week of weeks) {
    const learningEvent = semesterCalendar.find(
      (e) => e.type === "learning" && dateRangesOverlap(week.startDate, week.endDate, e.startDate, e.endDate)
    );
    const blockingEvent = semesterCalendar.find(
      (e) => e.blocksLearning && dateRangesOverlap(week.startDate, week.endDate, e.startDate, e.endDate)
    );
    week.isEffective = !!learningEvent && !blockingEvent;
    week.blockReason = blockingEvent?.label;
  }

  // LANGKAH 4: Hitung kapasitas INTRA per minggu (BUKAN total 3 JP)
  for (const week of weeks) {
    if (week.isEffective) {
      week.intraCapacityJP = options.intraJpPerWeek;
      week.koJP = options.koJpPerWeek;
    } else {
      week.intraCapacityJP = 0;
      week.koJP = 0;
    }
    week.reservedForCadangan = 0;
    week.availableForMaterial = week.intraCapacityJP;
  }

  // LANGKAH 5: Reserve cadangan dari INTRA capacity
  const totalIntraCapacity = weeks
    .filter((w) => w.isEffective)
    .reduce((sum, w) => sum + w.intraCapacityJP, 0);

  if (options.cadanganJP > totalIntraCapacity) {
    errors.push(
      `Cadangan ${options.cadanganJP} JP melebihi total kapasitas intra ${totalIntraCapacity} JP. ` +
        `Kurangi cadangan atau tambah minggu efektif.`
    );
    // Tetap return result dengan weeks kosong assignment, supaya UI bisa tampilkan error
    const koRows = generateKORows(weeks, options);
    const distribution = computeDistribution(prota.units, semester, weeks);
    const summary = computeSummary(weeks, options, distribution, totalIntraCapacity, 0);
    return {
      weeks,
      distribution,
      koRows,
      summary,
      status: "needs_fix",
      warnings,
      errors,
    };
  }

  // Reserve cadangan dari minggu terakhir ke depan (default) atau sebaliknya
  const effectiveWeeksForReserve = weeks.filter((w) => w.isEffective);
  const reserveOrder = options.reserveFromEnd
    ? [...effectiveWeeksForReserve].reverse()
    : effectiveWeeksForReserve;

  let cadanganRemaining = options.cadanganJP;
  for (const week of reserveOrder) {
    if (cadanganRemaining <= 0) break;
    const take = Math.min(week.intraCapacityJP, cadanganRemaining);
    week.reservedForCadangan = take;
    cadanganRemaining -= take;
  }

  // Hitung availableForMaterial setelah reserve
  for (const week of weeks) {
    week.availableForMaterial = week.intraCapacityJP - week.reservedForCadangan;
  }

  // LANGKAH 6: Distribusikan materi ke minggu availableForMaterial
  const semesterUnits = prota.units
    .filter((u) => u.semester === semester)
    .sort((a, b) => a.order - b.order);

  if (semesterUnits.length === 0) {
    errors.push(
      `Tidak ada materi (ProtaUnit) untuk semester ${semester}. Tambahkan unit di Prota dulu.`
    );
    const koRows = generateKORows(weeks, options);
    const distribution: UnitDistribution[] = [];
    const summary = computeSummary(weeks, options, distribution, totalIntraCapacity, 0);
    return {
      weeks,
      distribution,
      koRows,
      summary,
      status: "needs_fix",
      warnings,
      errors,
    };
  }

  // Queue-based distribution
  const unitQueue = semesterUnits.map((u) => ({ unit: u, remainingJP: u.jp }));

  for (const week of weeks) {
    if (!week.isEffective) continue;
    let weekAvailable = week.availableForMaterial;
    while (weekAvailable > 0 && unitQueue.length > 0) {
      const current = unitQueue[0];
      const assign = Math.min(current.remainingJP, weekAvailable);
      week.assignedUnits.push({
        unitId: current.unit.id,
        title: current.unit.title,
        jp: assign,
      });
      current.remainingJP -= assign;
      weekAvailable -= assign;
      if (current.remainingJP === 0) {
        unitQueue.shift();
      }
    }
  }

  // LANGKAH 7: Generate KO rows (row terpisah)
  const koRows = generateKORows(weeks, options);

  // LANGKAH 8: Hitung distribution per unit
  const distribution = computeDistribution(semesterUnits, semester, weeks);

  // LANGKAH 9: Hitung summary & status
  const totalUnitJP = semesterUnits.reduce((sum, u) => sum + u.jp, 0);
  const summary = computeSummary(weeks, options, distribution, totalIntraCapacity, totalUnitJP);

  // Warning bila ada unit belum terdistribusi penuh
  const undistributedUnits = distribution.filter(
    (d) => d.status !== "fully_distributed"
  );
  if (undistributedUnits.length > 0) {
    for (const d of undistributedUnits) {
      warnings.push(
        `Unit "${d.title}" ${d.status === "not_distributed" ? "TIDAK terdistribusi" : "terdistribusi sebagian"}: ` +
          `${d.distributedJP}/${d.totalJP} JP (sisa ${d.undistributedJP} JP belum muat).`
      );
    }
  }

  const status: PromesResult["status"] =
    summary.undistributedJP === 0 ? "valid" : "needs_fix";

  return {
    weeks,
    distribution,
    koRows,
    summary,
    status,
    warnings,
    errors,
  };
}

/* ------------------------------------------------------------------ */
/*  Helper functions (internal)                                       */
/* ------------------------------------------------------------------ */

/** Hasil kosong bila ada error awal. */
function emptyResult(warnings: string[], errors: string[]): PromesResult {
  return {
    weeks: [],
    distribution: [],
    koRows: [],
    summary: {
      totalWeeks: 0,
      effectiveWeeks: 0,
      intraCapacityJP: 0,
      cadanganJP: 0,
      materialCapacityJP: 0,
      totalUnitJP: 0,
      distributedJP: 0,
      undistributedJP: 0,
      koTotalJP: 0,
      allocationStatus: "kurang",
    },
    status: "needs_fix",
    warnings,
    errors,
  };
}

/** Enumerasi minggu Senin-Minggu dalam rentang semester. */
function enumerateWeeks(semesterStartISO: string, semesterEndISO: string): PromesWeek[] {
  const weeks: PromesWeek[] = [];
  const semesterStart = parseISODate(semesterStartISO);
  const semesterEnd = parseISODate(semesterEndISO);

  if (semesterStart > semesterEnd) return weeks;

  // Cari Senin pertama pada/tepat setelah semesterStart
  const cursor = new Date(semesterStart);
  const startDow = getDayOfWeek(toISODate(cursor)); // 1=Senin, 7=Minggu
  if (startDow > 1) {
    // Maju ke Senin berikutnya
    cursor.setDate(cursor.getDate() + (7 - startDow + 1));
  }

  let weekNumber = 1;
  while (cursor <= semesterEnd) {
    const weekStart = new Date(cursor);
    const weekEnd = new Date(cursor);
    weekEnd.setDate(weekEnd.getDate() + 6);

    weeks.push({
      weekNumber: weekNumber++,
      startDate: toISODate(weekStart),
      endDate: toISODate(weekEnd),
      isEffective: false,
      intraCapacityJP: 0,
      reservedForCadangan: 0,
      availableForMaterial: 0,
      koJP: 0,
      assignedUnits: [],
    });

    cursor.setDate(cursor.getDate() + 7);
  }

  return weeks;
}

/** Generate KO rows dari minggu efektif. */
function generateKORows(weeks: PromesWeek[], options: PromesOptions): KORow[] {
  const mode: KOMode = options.koMode ?? "daily_block";
  const koRows: KORow[] = [];
  for (const week of weeks) {
    if (week.isEffective && week.koJP > 0) {
      koRows.push({
        weekNumber: week.weekNumber,
        date: week.startDate,
        jp: week.koJP,
        mode,
        label: `Alokasi kokurikuler: ${week.koJP} JP/minggu (${mode})`,
      });
    }
  }
  return koRows;
}

/** Hitung distribution per unit. */
function computeDistribution(
  semesterUnits: ProtaUnit[],
  _semester: 1 | 2,
  weeks: PromesWeek[]
): UnitDistribution[] {
  return semesterUnits.map((unit) => {
    const assignedWeeks = weeks.filter((w) =>
      w.assignedUnits.some((a) => a.unitId === unit.id)
    );
    const distributedJP = assignedWeeks.reduce(
      (sum, w) => sum + (w.assignedUnits.find((a) => a.unitId === unit.id)?.jp ?? 0),
      0
    );
    const undistributedJP = unit.jp - distributedJP;
    let status: UnitDistribution["status"];
    if (distributedJP === 0) {
      status = "not_distributed";
    } else if (undistributedJP === 0) {
      status = "fully_distributed";
    } else {
      status = "partially_distributed";
    }
    return {
      unitId: unit.id,
      title: unit.title,
      totalJP: unit.jp,
      distributedJP,
      undistributedJP,
      weeks: assignedWeeks.map((w) => w.weekNumber),
      status,
    };
  });
}

/** Hitung summary. */
function computeSummary(
  weeks: PromesWeek[],
  options: PromesOptions,
  distribution: UnitDistribution[],
  totalIntraCapacity: number,
  totalUnitJP: number
): PromesSummary {
  const effectiveWeeks = weeks.filter((w) => w.isEffective).length;
  const cadanganJP = options.cadanganJP;
  const materialCapacityJP = Math.max(0, totalIntraCapacity - cadanganJP);
  const distributedJP = distribution.reduce((sum, d) => sum + d.distributedJP, 0);
  const undistributedJP = totalUnitJP - distributedJP;
  const koTotalJP = weeks
    .filter((w) => w.isEffective)
    .reduce((sum, w) => sum + w.koJP, 0);

  let allocationStatus: PromesSummary["allocationStatus"];
  if (materialCapacityJP === totalUnitJP) {
    allocationStatus = "tepat";
  } else if (materialCapacityJP > totalUnitJP) {
    allocationStatus = "cukup";
  } else {
    allocationStatus = "kurang";
  }

  return {
    totalWeeks: weeks.length,
    effectiveWeeks,
    intraCapacityJP: totalIntraCapacity,
    cadanganJP,
    materialCapacityJP,
    totalUnitJP,
    distributedJP,
    undistributedJP,
    koTotalJP,
    allocationStatus,
  };
}
