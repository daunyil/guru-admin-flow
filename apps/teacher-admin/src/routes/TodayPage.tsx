/**
 * PATCH-04: Home Pending Work — meja kerja harian guru.
 * Sumber: docs/V0_6_2_PRODUCT_DECISIONS.md §2.4
 *
 * UX-LIST-REDESIGN:
 *   - Modul tidak lagi berserakan sebagai grid emoji, tapi daftar rapi
 *     dengan kategori, status (Belum diisi / Draft / Perlu Finalisasi / Lengkap),
 *     dan tombol Buka/Edit per baris.
 *   - Absensi & Jurnal menampilkan list sesi yang belum diisi langsung
 *     di halaman utama, bukan tersembunyi di sidebar.
 *
 * UX-FIX-ALWAYS-SHOW: Semua modul SELALU ditampilkan meski data belum ada.
 * Yang kosong diberi keterangan, bukan disembunyikan.
 */

import { Card, CardHeader, Button } from "@shared/ui";
import { useTodayPageState } from "./useTodayPageState";
import { TodayPageHeader } from "./TodayPageHeader";
import { TodayPageNotices } from "./TodayPageNotices";
import { TodaySessionsCard } from "./TodaySessionsCard";
import { PendingItemsCard } from "./PendingItemsCard";
import { ModuleRow } from "./ModuleRow";

/* ================================================================== */
/*  TodayPage                                                            */
/* ================================================================== */

export function TodayPage() {
  const state = useTodayPageState();

  // B4-03: Phase 1 — show skeleton while loading basic data
  if (state.loading) {
    return (
      <div className="space-y-4">
        {/* Header skeleton */}
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-48 mb-2" />
          <div className="h-4 bg-slate-200 rounded w-32" />
        </div>
        {/* Session card skeleton */}
        <div className="animate-pulse border border-slate-200 rounded-lg p-4">
          <div className="h-5 bg-slate-200 rounded w-40 mb-3" />
          <div className="space-y-2">
            <div className="h-12 bg-slate-100 rounded" />
            <div className="h-12 bg-slate-100 rounded" />
          </div>
        </div>
        {/* Pending items skeleton */}
        <div className="animate-pulse border border-slate-200 rounded-lg p-4">
          <div className="h-5 bg-slate-200 rounded w-32 mb-3" />
          <div className="h-8 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  if (state.errorMsg) {
    return (
      <Card className="border-rose-200 bg-rose-50">
        <div className="flex items-start gap-3">
          <span className="text-rose-600 text-xl">⚠</span>
          <div>
            <p className="font-semibold text-rose-900">Gagal Memuat Data</p>
            <p className="text-sm text-rose-800 mt-1">{state.errorMsg}</p>
            <Button
              variant="secondary"
              className="text-sm mt-3"
              onClick={state.handleReload}
            >
              Muat Ulang
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <TodayPageHeader
        todayLabel={state.todayLabel}
        activeYear={state.activeYear}
        school={state.school}
        teacher={state.teacher}
      />

      <TodayPageNotices
        school={state.school}
        teacher={state.teacher}
        activeYear={state.activeYear}
        assignments={state.assignments}
        seeding={state.seeding}
        seedMsg={state.seedMsg}
        onSeedSampleData={state.handleSeedSampleData}
      />

      <TodaySessionsCard
        activeYear={state.activeYear}
        todaySessions={state.todaySessions}
        todayAttendanceSessionIds={state.todayAttendanceSessionIds}
        todayJournalSessionIds={state.todayJournalSessionIds}
      />

      <PendingItemsCard pendingItems={state.pendingItems} />

      {state.modulesByCategory.map(({ category, modules }) => (
        <Card key={category}>
          <CardHeader
            title={category}
            description={`${modules.length} modul`}
          />
          <div className="divide-y divide-slate-100">
            {modules.map((m) => (
              <ModuleRow key={m.id} entry={m} />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
