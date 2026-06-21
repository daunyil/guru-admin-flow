/**
 * Shell aplikasi: responsif mobile + desktop.
 * Mengikuti prinsip UX §8.6 (mobile-first harian, desktop-friendly perencanaan).
 */

import { type ReactNode, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { GraduationCap, Calendar, User, Database, Plus, ClipboardList, FileText, Clock, Users, CheckCircle, BookOpen, FileSpreadsheet, ListChecks, MoreHorizontal } from "./icons";

interface NavItem {
  to: string;
  label: string;
  icon: typeof GraduationCap;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Hari Ini", icon: Calendar },
  { to: "/calendar", label: "Kalender", icon: Calendar },
  { to: "/prota", label: "Prota", icon: ClipboardList },
  { to: "/promes", label: "Promes", icon: FileText },
  { to: "/schedule", label: "Jadwal", icon: Clock },
  { to: "/roster", label: "Siswa", icon: Users },
  { to: "/attendance", label: "Absensi", icon: CheckCircle },
  { to: "/journal", label: "Jurnal", icon: BookOpen },
  { to: "/semester-report", label: "Laporan", icon: FileSpreadsheet },
  { to: "/grades", label: "Nilai", icon: FileSpreadsheet },
  { to: "/completeness", label: "Kelengkapan", icon: ListChecks },
  { to: "/profile", label: "Profil", icon: User },
  { to: "/new-year", label: "Tahun Baru", icon: Plus },
  { to: "/backup", label: "Backup", icon: Database },
];

// Mobile bottom nav: 4 item utama + tombol "Lainnya"
const MOBILE_PRIMARY: NavItem[] = [
  { to: "/", label: "Hari Ini", icon: Calendar },
  { to: "/attendance", label: "Absen", icon: CheckCircle },
  { to: "/journal", label: "Jurnal", icon: BookOpen },
  { to: "/grades", label: "Nilai", icon: FileSpreadsheet },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [showMore, setShowMore] = useState(false);
  const navigate = useNavigate();

  const mobileOthers = NAV_ITEMS.filter(
    (item) => !MOBILE_PRIMARY.some((p) => p.to === item.to)
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header (desktop) */}
      <header className="hidden md:block bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center text-white">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="font-semibold text-slate-900">Guru Admin Flow</span>
            <span className="text-xs text-slate-400 ml-2">v0.6</span>
          </div>
          <nav className="flex items-center gap-1 flex-wrap">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-brand-50 text-brand-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      {/* Mobile header */}
      <header className="md:hidden bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white">
            <GraduationCap className="w-4 h-4" />
          </div>
          <span className="font-semibold text-slate-900 text-sm">Guru Admin Flow</span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 pb-24 md:pb-6">
        {children}
      </main>

      {/* Bottom nav (mobile) — 5 item: 4 primary + Lainnya */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 flex z-20">
        {MOBILE_PRIMARY.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-0.5 py-2 text-xs ${
                isActive ? "text-brand-700" : "text-slate-500"
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
        <button
          onClick={() => setShowMore(true)}
          className="flex-1 flex flex-col items-center gap-0.5 py-2 text-xs text-slate-500"
        >
          <MoreHorizontal className="w-5 h-5" />
          <span>Lainnya</span>
        </button>
      </nav>

      {/* More menu (mobile) — sheet/modal */}
      {showMore && (
        <div className="md:hidden fixed inset-0 z-30" onClick={() => setShowMore(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="absolute bottom-0 inset-x-0 bg-white rounded-t-xl p-4 pb-8 max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Menu Lainnya</h3>
              <button onClick={() => setShowMore(false)} className="text-slate-400 text-xl">×</button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {mobileOthers.map((item) => (
                <button
                  key={item.to}
                  onClick={() => { navigate(item.to); setShowMore(false); }}
                  className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-slate-50"
                >
                  <item.icon className="w-6 h-6 text-brand-600" />
                  <span className="text-xs text-slate-700">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
