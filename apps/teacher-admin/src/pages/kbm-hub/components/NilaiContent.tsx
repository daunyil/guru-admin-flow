import { NILAI_TYPE_OPTIONS } from "../constants";
import type { AttendanceRecord } from "@guru-admin/domain";

/* ============================================================ */
/*  Nilai Content                                                */
/* ============================================================ */

export interface NilaiContentProps {
  effectiveRecords: AttendanceRecord[];
  nilaiMap: Map<string, number>;
  setNilai: (studentId: string, value: number | null) => void;
  nilaiToggle: boolean;
  setNilaiToggle: (toggle: boolean) => void;
  nilaiType: string;
  setNilaiType: (type: string) => void;
}

export function NilaiContent({ effectiveRecords, nilaiMap, setNilai, nilaiToggle, setNilaiToggle, nilaiType, setNilaiType }: NilaiContentProps) {
  return (
    <div className="space-y-3">
      {/* Toggle ON/OFF */}
      <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3">
        <div>
          <p className="text-xs md:text-sm font-bold text-slate-700">Pengambilan Nilai Hari Ini?</p>
          <p className="text-[10px] md:text-xs text-slate-500">Aktifkan jika ada ulangan/asesmen</p>
        </div>
        <button
          onClick={() => setNilaiToggle(!nilaiToggle)}
          className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
            nilaiToggle ? "bg-emerald-500" : "bg-slate-300"
          }`}
          role="switch"
          aria-checked={nilaiToggle}
          aria-label="Toggle pengambilan nilai"
        >
          <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${
            nilaiToggle ? "translate-x-[22px]" : "translate-x-0.5"
          }`} />
        </button>
      </div>

      {/* Nilai form — only when toggle ON */}
      {nilaiToggle && (
        <div className="space-y-3">
          {/* Jenis Nilai selector */}
          <div>
            <label htmlFor="select-jenis-nilai" className="block text-[10px] md:text-xs font-bold text-slate-600 mb-1">
              Jenis Nilai
            </label>
            <select
              id="select-jenis-nilai"
              aria-label="Pilih Jenis Nilai"
              value={nilaiType}
              onChange={(e) => setNilaiType(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs md:text-sm text-slate-800 outline-none focus:ring-2 focus:ring-blue-300 min-h-[44px]"
            >
              {NILAI_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Desktop: Table layout for nilai */}
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left p-2 text-xs font-bold text-slate-600">No</th>
                  <th className="text-left p-2 text-xs font-bold text-slate-600">Nama Siswa</th>
                  <th className="text-left p-2 text-xs font-bold text-slate-600">Status</th>
                  <th className="text-center p-2 text-xs font-bold text-slate-600 w-28">Nilai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {effectiveRecords.map((r, idx) => {
                  const isAbsent = r.status !== "present" && r.status !== "late";
                  return (
                    <tr key={r.studentId} className={isAbsent ? "bg-slate-50 opacity-60" : ""}>
                      <td className="p-2 text-xs text-slate-600">{idx + 1}</td>
                      <td className="p-2 text-xs font-medium text-slate-800">{r.studentName}</td>
                      <td className="p-2">
                        {isAbsent ? (
                          <span className="text-[9px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-full">
                            {r.status === "sick" ? "Sakit" : r.status === "excused" ? "Izin" : "Alpa"}
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">Hadir</span>
                        )}
                      </td>
                      <td className="p-2 text-center">
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="--"
                          min={0}
                          max={100}
                          disabled={isAbsent}
                          value={nilaiMap.get(r.studentId) ?? ""}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === "") { setNilai(r.studentId, null); return; }
                            const parsed = parseInt(raw, 10);
                            if (isNaN(parsed)) return;
                            setNilai(r.studentId, Math.min(100, Math.max(0, parsed)));
                          }}
                          onFocus={(e) => e.target.select()}
                          className="w-20 bg-white border border-slate-300 rounded-lg p-2 text-center text-sm font-bold outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-slate-100 disabled:text-slate-400"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile: Card layout for nilai */}
          <div className="md:hidden space-y-1.5 max-h-[40vh] overflow-y-auto">
            {effectiveRecords.map((r) => {
              const isAbsent = r.status !== "present" && r.status !== "late";
              return (
                <div
                  key={r.studentId}
                  className={`flex items-center justify-between p-2.5 rounded-xl min-h-[44px] ${
                    isAbsent ? "bg-slate-50 opacity-60" : "bg-white border border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-xs font-semibold text-slate-700 truncate">
                      {r.studentName}
                    </span>
                    {isAbsent && (
                      <span className="text-[9px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-full shrink-0">
                        {r.status === "sick" ? "Sakit" : r.status === "excused" ? "Izin" : "Alpa"}
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="--"
                    min={0}
                    max={100}
                    disabled={isAbsent}
                    value={nilaiMap.get(r.studentId) ?? ""}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") { setNilai(r.studentId, null); return; }
                      const parsed = parseInt(raw, 10);
                      if (isNaN(parsed)) return;
                      setNilai(r.studentId, Math.min(100, Math.max(0, parsed)));
                    }}
                    onFocus={(e) => e.target.select()}
                    className="w-[72px] bg-white border border-slate-300 rounded-lg p-2.5 text-center text-xs font-bold outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-slate-100 disabled:text-slate-400 min-h-[44px]"
                  />
                </div>
              );
            })}
          </div>

          {/* Summary */}
          {nilaiMap.size > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
              <p className="text-xs md:text-sm text-emerald-700">
                <strong>{nilaiMap.size}</strong> nilai diisi · Rata-rata:{" "}
                <strong>
                  {Math.round(Array.from(nilaiMap.values()).reduce((a, b) => a + b, 0) / nilaiMap.size)}
                </strong>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
