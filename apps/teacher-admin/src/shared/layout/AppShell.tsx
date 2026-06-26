/**
 * AppShell — sidebar layout untuk desktop, bottom nav untuk mobile.
 *
 * SIDEBAR-NAV-POLISH-RC1:
 *   Desktop: sidebar kiri 260px dengan grouped menu + header tipis.
 *   Mobile: bottom nav 4 primary + "Lainnya" sheet (tidak diubah).
 *   Branding: SIAKAD GURU.
 *   Konten: max-w-6xl (lebih lebar dari 5xl).
 */

import { type ReactNode, useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { APP_VERSION, FEATURE_FLAGS } from "@guru-admin/shared";
import { useSyncStore, refreshSyncStatus } from "../../shared/supabase/sync-store";
import { GraduationCap, Calendar, User, Database, Plus, ClipboardList, FileText, Clock, Users, CheckCircle, BookOpen, FileSpreadsheet, ListChecks, MoreHorizontal, BookMarked } from "./icons";

interface NavItem {
  to: string;
  label: string;
  icon: typeof GraduationCap;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Pusat",
    items: [
      { to: "/", label: "Hari Ini", icon: Calendar },
      // UX-REL-01: Paket Administrasi = pusat tunggal. Auto Document + Cek Kelengkapan
      // digabung ke sini (route tetap ada untuk backward compat, tapi tidak di sidebar).
      { to: "/admin-package", label: "Paket Administrasi", icon: BookMarked },
    ],
  },
  {
    title: "Harian",
    items: [
      { to: "/attendance", label: "Absen", icon: CheckCircle },
      { to: "/journal", label: "Jurnal", icon: BookOpen },
      { to: "/grades", label: "Nilai", icon: FileSpreadsheet },
      // PIKET-HARIAN-MOBILE-01: conditional on FEATURE_FLAGS.dailyDuty
      ...(FEATURE_FLAGS.dailyDuty ? [{ to: "/piket", label: "Piket Harian", icon: ClipboardList }] : []),
    ],
  },
  {
    title: "Evaluasi",
    items: [
      { to: "/evaluation-docs", label: "Perangkat Penilaian", icon: ClipboardList },
      { to: "/remedial", label: "Remedial", icon: FileSpreadsheet },
      { to: "/pengayaan", label: "Pengayaan", icon: FileSpreadsheet },
    ],
  },
  {
    title: "Perencanaan",
    items: [
      { to: "/assignments", label: "Kelas dan Mapel", icon: BookMarked },
      { to: "/calendar", label: "Kalender Pendidikan", icon: Calendar },
      { to: "/prota", label: "Prota Resmi", icon: ClipboardList },
      { to: "/promes", label: "Promes", icon: FileText },
      { to: "/schedule", label: "Jadwal", icon: Clock },
    ],
  },
  {
    title: "Dokumen",
    items: [
      { to: "/roster", label: "Siswa", icon: Users },
      { to: "/atp", label: "Bank TP", icon: ListChecks },
      { to: "/lkpd", label: "LKPD", icon: BookOpen },
      { to: "/rpp", label: "RPP / Modul Ajar", icon: FileText },
      { to: "/rpp-bulk", label: "Perbarui Identitas Dokumen", icon: FileText },
      { to: "/semester-report", label: "Laporan Semester", icon: FileSpreadsheet },
    ],
  },
  {
    title: "Sistem",
    items: [
      { to: "/apps-script-import", label: "Import Apps Script", icon: Database },
      { to: "/profile", label: "Profil", icon: User },
      { to: "/new-year", label: "Tahun Baru", icon: Plus },
      { to: "/backup", label: "Backup", icon: Database },
    ],
  },
];

const MOBILE_PRIMARY: NavItem[] = [
  // UX-MOB-01: bottom nav HP — Hari Ini, Absen, Jurnal, Paket, Lainnya
  // Paket Administrasi jadi menu utama HP (sebelumnya Nilai, kurang penting untuk harian)
  { to: "/", label: "Hari Ini", icon: Calendar },
  { to: "/attendance", label: "Absen", icon: CheckCircle },
  { to: "/journal", label: "Jurnal", icon: BookOpen },
  { to: "/admin-package", label: "Paket", icon: BookMarked },
];

// NAV_GROUPS dipakai langsung untuk desktop sidebar + mobile "Lainnya" modal

function formatClock(date: Date): string {
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export function AppShell({ children }: { children: ReactNode }) {
  const [showMore, setShowMore] = useState(false);
  const [now, setNow] = useState(new Date());
  const navigate = useNavigate();
  const syncStatus = useSyncStore((s) => s.status);
  const syncErrors = useSyncStore((s) => s.errors);
  const [showSyncErrors, setShowSyncErrors] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000 * 30);
    void refreshSyncStatus();
    const syncTimer = window.setInterval(() => void refreshSyncStatus(), 1000 * 60);
    return () => { window.clearInterval(timer); window.clearInterval(syncTimer); };
  }, []);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#eef2f9] md:bg-slate-50">
      {/* === DESKTOP: Sidebar kiri === */}
      <aside className="hidden md:flex flex-col w-[260px] shrink-0 bg-white border-r border-slate-200 h-screen sticky top-0 overflow-y-auto no-print">
        {/* Branding */}
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-slate-900 leading-none">SIAKAD GURU</p>
              <p className="text-[10px] text-slate-400 mt-0.5">v{APP_VERSION}</p>
            </div>
          </div>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 px-3 py-3 space-y-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors ${
                        isActive
                          ? "bg-brand-50 text-brand-700 font-medium"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`
                    }
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* === MAIN AREA === */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop header tipis */}
        <header className="hidden md:flex items-center justify-between px-6 py-2.5 bg-white border-b border-slate-200 no-print">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span className="font-medium text-slate-700">{formatDate(now)}</span>
            <span className="text-slate-300">·</span>
            <span className="font-mono text-slate-600">{formatClock(now)} WIB</span>
          </div>
          <div className="flex items-center gap-2">
            {/* SUPABASE-CLOUD-READY-01: Sync status badge */}
            <button
              onClick={() => setShowSyncErrors(!showSyncErrors)}
              className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                syncStatus === "cloud-active"
                  ? "bg-emerald-50 text-emerald-700"
                  : syncStatus === "cloud-error"
                    ? "bg-rose-50 text-rose-700"
                    : syncStatus === "offline"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-slate-100 text-slate-500"
              }`}
              title={
                syncStatus === "cloud-active" ? "Cloud aktif / user terhubung"
                : syncStatus === "cloud-error" ? `${syncErrors.length} error sync`
                : syncStatus === "offline" ? "Cloud belum dikonfigurasi / belum login"
                : "Mode lokal (offline)"
              }
            >
              {syncStatus === "cloud-active" ? "☁ Cloud aktif" : syncStatus === "cloud-error" ? `⚠ ${syncErrors.length} error` : syncStatus === "offline" ? "☁ Offline" : "📱 Lokal"}
            </button>
            <button
              onClick={() => navigate("/backup")}
              className="px-3 py-1.5 rounded-md text-sm text-slate-600 hover:bg-slate-100 transition-colors"
              title="Backup"
            >
              💾 Backup
            </button>
            <button
              onClick={() => navigate("/profile")}
              className="px-3 py-1.5 rounded-md text-sm text-slate-600 hover:bg-slate-100 transition-colors"
              title="Profil"
            >
              👤 Profil
            </button>
          </div>
        </header>

        {/* Mobile header (SIAKAD style) */}
        <header className="siakad-header no-print md:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[18px] font-black leading-none tracking-tight">SIAKAD GURU</div>
              <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/65 mt-1">
                {formatDate(now)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className="text-xl font-black leading-none">{formatClock(now)}</div>
                <div className="text-[8px] font-bold uppercase text-white/55">WIB</div>
              </div>
              {/* UX-MOB-02: shortcut Profil + Kelas dan Mapel di header HP */}
              <button
                onClick={() => navigate("/assignments")}
                className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 text-white text-base active:scale-95"
                title="Kelas dan Mapel"
              >
                📚
              </button>
              <button
                onClick={() => navigate("/profile")}
                className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 text-white text-base active:scale-95"
                title="Profil"
              >
                👤
              </button>
              <button
                onClick={() => navigate("/backup")}
                className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 text-white text-base active:scale-95"
                title="Backup"
              >
                💾
              </button>
            </div>
          </div>
        </header>

        {/* Konten halaman */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 pb-28 md:pb-6">
          {children}
        </main>
      </div>

      {/* === MOBILE: Bottom nav === */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-100 flex z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] no-print">
        {MOBILE_PRIMARY.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              // UX-MOB-04: label 11px, sentence case (bukan uppercase 8px)
              `flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${
                isActive ? "text-brand-700" : "text-slate-400"
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
        <button
          onClick={() => setShowMore(true)}
          className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold text-slate-400"
        >
          <MoreHorizontal className="w-5 h-5" />
          <span>Lainnya</span>
        </button>
      </nav>

      {/* SUPABASE-CLOUD-READY-01: Sync error panel */}
      {showSyncErrors && syncErrors.length > 0 && (
        <div className="fixed bottom-4 right-4 z-40 max-w-sm no-print" onClick={() => setShowSyncErrors(false)}>
          <div className="bg-white rounded-2xl shadow-2xl border border-rose-200 p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-bold text-rose-700 text-sm">⚠ Error Sinkronisasi</p>
              <button onClick={() => setShowSyncErrors(false)} className="text-slate-400 text-lg">×</button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {syncErrors.map((err) => (
                <div key={err.id} className="p-2 bg-rose-50 rounded text-xs">
                  <p className="font-medium text-rose-800">{err.module} · {err.operation}</p>
                  <p className="text-rose-600 mt-0.5">{err.message}</p>
                  <p className="text-slate-400 mt-0.5">{new Date(err.timestamp).toLocaleTimeString("id-ID")}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => useSyncStore.getState().clearAllErrors()}
              className="w-full px-3 py-1.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200"
            >
              Hapus Semua Error
            </button>
          </div>
        </div>
      )}

      {/* Mobile "Lainnya" modal */}
      {showMore && (
        <div className="md:hidden fixed inset-0 z-30" onClick={() => setShowMore(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute bottom-0 inset-x-0 bg-white rounded-t-[28px] p-4 pb-8 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-slate-900">Semua Menu</h3>
              <button onClick={() => setShowMore(false)} className="text-slate-400 text-xl">×</button>
            </div>
            <div className="space-y-4">
              {NAV_GROUPS.map((group) => (
                <div key={group.title}>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">{group.title}</p>
                  <div className="grid grid-cols-3 gap-3">
                    {group.items.map((item) => (
                      <button
                        key={item.to}
                        onClick={() => { navigate(item.to); setShowMore(false); }}
                        className="flex flex-col items-center gap-1 p-3 rounded-2xl hover:bg-slate-50 transition-colors"
                      >
                        <item.icon className="w-6 h-6 text-brand-600" />
                        <span className="text-xs text-slate-700 font-semibold text-center leading-tight">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
