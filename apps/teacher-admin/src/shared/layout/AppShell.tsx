import { type ReactNode, useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { GraduationCap, Calendar, User, Database, Plus, ClipboardList, FileText, Clock, Users, CheckCircle, BookOpen, FileSpreadsheet, ListChecks, MoreHorizontal, BookMarked } from "./icons";

interface NavItem {
  to: string;
  label: string;
  icon: typeof GraduationCap;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Hari Ini", icon: Calendar },
  { to: "/admin-package", label: "Paket Administrasi", icon: BookMarked },
  { to: "/attendance", label: "Absen", icon: CheckCircle },
  { to: "/journal", label: "Jurnal", icon: BookOpen },
  { to: "/grades", label: "Nilai", icon: FileSpreadsheet },
  { to: "/remedial", label: "Remedial", icon: FileSpreadsheet },
  { to: "/pengayaan", label: "Pengayaan", icon: FileSpreadsheet },
  { to: "/rpp-bulk", label: "RPP Ganti Identitas", icon: FileText },
  { to: "/assignments", label: "Data Mengajar", icon: BookMarked },
  { to: "/calendar", label: "Kalender", icon: Calendar },
  { to: "/prota", label: "Program Tahunan", icon: ClipboardList },
  { to: "/promes", label: "Program Semester", icon: FileText },
  { to: "/schedule", label: "Jadwal", icon: Clock },
  { to: "/roster", label: "Siswa", icon: Users },
  { to: "/atp", label: "Bank TP", icon: ListChecks },
  { to: "/lkpd", label: "LKPD", icon: BookOpen },
  { to: "/rpp", label: "RPP Template", icon: FileText },
  { to: "/completeness", label: "Kelengkapan", icon: ListChecks },
  { to: "/semester-report", label: "Laporan", icon: FileSpreadsheet },
  { to: "/profile", label: "Profil", icon: User },
  { to: "/new-year", label: "Tahun Baru", icon: Plus },
  { to: "/backup", label: "Backup", icon: Database },
  { to: "/apps-script-import", label: "Import Apps Script", icon: Database },
];

const MOBILE_PRIMARY: NavItem[] = [
  { to: "/", label: "Hari Ini", icon: Calendar },
  { to: "/attendance", label: "Absen", icon: CheckCircle },
  { to: "/journal", label: "Jurnal", icon: BookOpen },
  { to: "/grades", label: "Nilai", icon: FileSpreadsheet },
];

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

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000 * 30);
    return () => window.clearInterval(timer);
  }, []);

  const mobileOthers = NAV_ITEMS.filter(
    (item) => !MOBILE_PRIMARY.some((p) => p.to === item.to)
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#eef2f9] md:bg-slate-50">
      <header className="hidden md:block bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center text-white">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="font-semibold text-slate-900">Guru Admin Flow</span>
            <span className="text-xs text-slate-400 ml-2">v0.6.1</span>
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

      <header className="siakad-header no-print">
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

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 pb-28 md:pb-6">
        {children}
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-100 flex z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] no-print">
        {MOBILE_PRIMARY.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[8px] font-extrabold uppercase tracking-wide ${
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
          className="flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[8px] font-extrabold uppercase tracking-wide text-slate-400"
        >
          <MoreHorizontal className="w-5 h-5" />
          <span>Lainnya</span>
        </button>
      </nav>

      {showMore && (
        <div className="md:hidden fixed inset-0 z-30" onClick={() => setShowMore(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute bottom-0 inset-x-0 bg-white rounded-t-[28px] p-4 pb-8 max-h-[70vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-slate-900">Menu Lainnya</h3>
              <button onClick={() => setShowMore(false)} className="text-slate-400 text-xl">×</button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {mobileOthers.map((item) => (
                <button
                  key={item.to}
                  onClick={() => { navigate(item.to); setShowMore(false); }}
                  className="flex flex-col items-center gap-1 p-3 rounded-2xl hover:bg-slate-50"
                >
                  <item.icon className="w-6 h-6 text-brand-600" />
                  <span className="text-xs text-slate-700 font-semibold">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
