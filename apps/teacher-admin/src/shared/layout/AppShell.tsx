/**
 * Shell aplikasi: responsif mobile + desktop.
 * Mengikuti prinsip UX §8.6 (mobile-first harian, desktop-friendly perencanaan).
 */

import { type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { GraduationCap, Calendar, User, Database, Plus } from "./icons";

interface NavItem {
  to: string;
  label: string;
  icon: typeof GraduationCap;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Hari Ini", icon: Calendar },
  { to: "/profile", label: "Profil", icon: User },
  { to: "/new-year", label: "Tahun Baru", icon: Plus },
  { to: "/backup", label: "Backup", icon: Database },
];

export function AppShell({ children }: { children: ReactNode }) {
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
            <span className="text-xs text-slate-400 ml-2">Sprint 1</span>
          </div>
          <nav className="flex items-center gap-1">
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

      {/* Main content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 pb-24 md:pb-6">
        {children}
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 flex">
        {NAV_ITEMS.map((item) => (
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
      </nav>

      {/* Mobile header */}
      <header className="md:hidden bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white">
            <GraduationCap className="w-4 h-4" />
          </div>
          <span className="font-semibold text-slate-900 text-sm">Guru Admin Flow</span>
        </div>
      </header>
    </div>
  );
}
