/**
 * THRESHOLD-WARNING-MODAL: Peringatan otomatis saat poin siswa melewati batas.
 *
 * PIKET-REDESIGN: Bahasa lebih ramah dan manusiawi.
 */

import type { ThresholdWarning } from "./types";

interface ThresholdWarningModalProps {
  warning: ThresholdWarning;
  onPrintSP: () => void;
  onDismiss: () => void;
}

const thresholdLabels: Record<ThresholdWarning["thresholdLevel"], { title: string; desc: string; actionLabel: string; explanation: string }> = {
  sp1: {
    title: "Siswa Perlu Perhatian",
    desc: "Poin pelanggaran sudah cukup tinggi",
    actionLabel: "Cetak Surat Panggilan Orang Tua",
    explanation: "Siswa ini sudah mencapai batas untuk diberi surat panggilan orang tua pertama. Disarankan untuk segera menghubungi orang tua/wali.",
  },
  sp2: {
    title: "Siswa Perlu Perhatian Serius",
    desc: "Poin pelanggaran sudah sangat tinggi",
    actionLabel: "Cetak Surat Panggilan Orang Tua ke-2",
    explanation: "Siswa ini sudah mencapai batas untuk diberi surat panggilan orang tua kedua. Perlu pembinaan lebih intensif dari BK.",
  },
  sp3: {
    title: "Perlu Tindak Lanjut Khusus",
    desc: "Siswa membutuhkan penanganan khusus",
    actionLabel: "Cetak Surat Pernyataan",
    explanation: "Siswa ini sudah melampaui batas poin kritis. Perlu tindak lanjut berupa surat pernyataan dan koordinasi dengan wali kelas serta BK.",
  },
};

export function ThresholdWarningModal({ warning, onPrintSP, onDismiss }: ThresholdWarningModalProps) {
  const info = thresholdLabels[warning.thresholdLevel];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4 z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm shadow-2xl border border-amber-100 animate-in slide-in-from-bottom-2 sm:zoom-in-95">

        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-amber-100 bg-amber-50 rounded-t-2xl sm:rounded-t-2xl">
          <span className="text-3xl">⚠️</span>
          <div>
            <h3 className="text-sm font-bold text-amber-800">{info.title}</h3>
            <p className="text-xs text-slate-500">{info.desc}</p>
          </div>
        </div>

        {/* Detail siswa */}
        <div className="p-4 space-y-3">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
            <div className="text-sm font-bold text-slate-900">
              {warning.studentName} <span className="text-slate-500 font-normal">({warning.classLabel})</span>
            </div>
            <div className="text-sm text-slate-600">
              Penambahan poin: <strong className="text-amber-700">+{warning.newPoints} poin</strong>
            </div>
            <div className="text-base font-bold text-amber-800">
              Total poin sekarang: {warning.totalPoints} poin
            </div>
          </div>

          {/* Penjelasan */}
          <p className="text-sm text-slate-600 leading-relaxed">
            {info.explanation}
          </p>

          {/* Tombol Aksi */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={onPrintSP}
              className="w-full bg-amber-600 text-white font-bold text-sm py-3 rounded-xl shadow-sm active:scale-[0.98] flex items-center justify-center gap-2 transition-transform"
            >
              <span>🖨️</span> {info.actionLabel}
            </button>

            <button
              type="button"
              onClick={onDismiss}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm py-2.5 rounded-xl transition-colors"
            >
              Simpan Catatan Saja
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
