import type { DutyRule } from "@guru-admin/domain";

export function statusClass(label: string): string {
  if (label === "Aman") return "border-emerald-300 bg-emerald-50 text-emerald-800";
  if (label === "Pembinaan ringan") return "border-amber-300 bg-amber-50 text-amber-800";
  if (label === "Panggilan orang tua") return "border-orange-300 bg-orange-50 text-orange-800";
  if (label === "Kesiswaan/BK") return "border-rose-300 bg-rose-50 text-rose-800";
  return "border-rose-500 bg-rose-100 text-rose-900 font-bold";
}

export function categoryLabel(category: DutyRule["category"]): string {
  switch (category) {
    case "attendance": return "Kehadiran";
    case "discipline": return "Kedisiplinan";
    case "health": return "Kesehatan";
    case "permission": return "Izin";
    case "other": return "Lainnya";
    default: return category;
  }
}
