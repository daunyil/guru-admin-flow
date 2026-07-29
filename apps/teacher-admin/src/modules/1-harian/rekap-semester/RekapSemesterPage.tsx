/**
 * RekapSemesterPage — 3 format cetak semester per peran guru.
 *
 * FORMAT-1: Absensi Kehadiran Bulanan (Wali Kelas & Guru Piket)
 *   - Matriks 31 kolom tanggal per bulan + rekap ALPA/SAKIT/IZIN/JLH
 *
 * FORMAT-2: Daftar Hadir Tatap Muka (Guru Mata Pelajaran)
 *   - Matriks 1–40 Pertemuan + Jml Jam/Tgl + PTS/PAS/Ket
 *   - Footer: Guru Bidang Studi TTD
 *
 * FORMAT-3: Penilaian Pengetahuan (Guru Mata Pelajaran)
 *   - PA multi-level header (Ulangan + Tugas per KD, PTS, PAS, Ket.)
 *
 * Sprint 6 additions:
 *   - Pre-Print Toolbar: margin & scale controls (anti-overflow)
 *   - DOCX Export: download .docx via rekap-semester-docx-exporter
 *
 * Format referensi: SMPN 8 Bantan (FORMAT-REFERENCE-SMPN8-BANTAN.md)
 * DOMAIN-BOUNDARY: Modul 1-harian, import dari @shared/ saja.
 */

import { useState, useCallback } from "react";
import { useRekapSemesterState, type RekapTab } from "./useRekapSemesterState";
import { useSemesterAggregator } from "./hooks/useSemesterAggregator";
import { AbsensiBulananMatrix } from "./AbsensiBulananMatrix";
import { TatapMukaMatrix } from "./TatapMukaMatrix";
import { NilaiMatrix } from "./NilaiMatrix";
import { Select, LoadingState, EmptyState, Badge, Button, PrintExportButtons } from "@shared/ui";
import {
  exportRekapSemesterDocx,
  type RekapSemesterDocxExportParams,
  type RekapDocxMeta,
} from "@shared/exporters";

/* ------------------------------------------------------------------ */
/*  Semester month names                                                */
/* ------------------------------------------------------------------ */

const SEMESTER_1_MONTHS = [
  { value: 0, label: "Juli" },
  { value: 1, label: "Agustus" },
  { value: 2, label: "September" },
  { value: 3, label: "Oktober" },
  { value: 4, label: "November" },
  { value: 5, label: "Desember" },
];

const SEMESTER_2_MONTHS = [
  { value: 0, label: "Januari" },
  { value: 1, label: "Februari" },
  { value: 2, label: "Maret" },
  { value: 3, label: "April" },
  { value: 4, label: "Mei" },
  { value: 5, label: "Juni" },
];

/* ------------------------------------------------------------------ */
/*  Tab labels — 3 format sesuai peran guru                            */
/* ------------------------------------------------------------------ */

const TAB_LABELS: Record<RekapTab, string> = {
  "absensi-bulanan": "Absensi Bulanan",
  "tatap-muka": "Daftar Hadir Tatap Muka",
  "nilai": "Penilaian Pengetahuan",
};

const TAB_ROLES: Record<RekapTab, string> = {
  "absensi-bulanan": "Wali Kelas / Guru Piket",
  "tatap-muka": "Guru Mata Pelajaran",
  "nilai": "Guru Mata Pelajaran",
};

/* ------------------------------------------------------------------ */
/*  Pre-Print: Margin & Scale presets                                   */
/* ------------------------------------------------------------------ */

type MarginPreset = "normal" | "narrow" | "tight";
type ScalePreset = 100 | 95 | 90 | 85 | 80;

const MARGIN_OPTIONS: { value: MarginPreset; label: string; css: string }[] = [
  { value: "normal", label: "Normal (20mm 15mm)", css: "20mm 15mm" },
  { value: "narrow", label: "Sedang (10mm 10mm)", css: "10mm 10mm" },
  { value: "tight", label: "Rapat (5mm 5mm)", css: "5mm 5mm" },
];

const SCALE_OPTIONS: { value: ScalePreset; label: string; pt: number }[] = [
  { value: 100, label: "8pt (Full)", pt: 8 },
  { value: 95, label: "7.5pt", pt: 7.5 },
  { value: 90, label: "7pt (Default)", pt: 7 },
  { value: 85, label: "6.5pt (Compact)", pt: 6.5 },
  { value: 80, label: "6pt (Mini)", pt: 6 },
];

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export function RekapSemesterPage() {
  const state = useRekapSemesterState();
  const {
    loading, error, year, teacher, school,
    assignments, assignment, rekapContext,
    selectedAssignmentId, setSelectedAssignmentId,
    semester, setSemester,
    tab, setTab,
    selectedMonthIndex, setSelectedMonthIndex,
  } = state;

  // Threshold kehadiran untuk Ket. column (default 75%, diset oleh dewan sekolah)
  const [attendanceThreshold, setAttendanceThreshold] = useState(0.75);

  // Pre-Print settings: margin & scale
  const [marginPreset, setMarginPreset] = useState<MarginPreset>("narrow");
  const [scalePreset, setScalePreset] = useState<ScalePreset>(90);

  // Aggregator hook — reads data from DB
  const aggregator = useSemesterAggregator(rekapContext);
  const {
    gradeRecords, gradeBook, monthlyMatrices, tatapMukaMatrix,
    loading: aggLoading, error: aggError,
  } = aggregator;

  // Months for current semester (only for Absensi Bulanan tab)
  const months = semester === 1 ? SEMESTER_1_MONTHS : SEMESTER_2_MONTHS;
  const currentMatrix = monthlyMatrices[selectedMonthIndex];

  // --- Print/Export helpers ---
  // NOTE: These plain functions & hooks MUST be declared BEFORE any early returns
  // to avoid React error #310 (hooks order violation).

  const getPrintTargetId = (): string => {
    if (tab === "absensi-bulanan") return "rekap-absensi-doc";
    if (tab === "tatap-muka") return "rekap-tatapmuka-doc";
    return "rekap-nilai-doc";
  };

  const getPrintDisabled = (): boolean => {
    if (tab === "absensi-bulanan") return !currentMatrix;
    if (tab === "tatap-muka") return !tatapMukaMatrix;
    return gradeRecords.length === 0;
  };

  // --- DOCX Export: build params and create callback ---
  const buildDocxMeta = (): RekapDocxMeta => ({
    schoolName: school?.name ?? "",
    schoolVillage: school?.village,
    schoolDistrict: school?.district,
    yearLabel: year?.label ?? "",
    classLabel: assignment?.classLabel ?? "",
    teacherName: teacher?.name ?? "",
    subject: assignment?.subject,
    semester,
  });

  const docxExportCallback = useCallback(async (): Promise<Blob> => {
    const meta = buildDocxMeta();

    let params: RekapSemesterDocxExportParams;
    if (tab === "absensi-bulanan") {
      params = {
        format: "absensi_bulanan",
        meta,
        matrix: currentMatrix!,
        teacherRole: "Wali Kelas",
      };
    } else if (tab === "tatap-muka") {
      params = {
        format: "tatap_muka",
        meta,
        matrix: tatapMukaMatrix!,
        attendanceThreshold,
      };
    } else {
      params = {
        format: "nilai",
        meta,
        records: gradeRecords,
        gradeBook,
      };
    }

    return exportRekapSemesterDocx(params);
  }, [tab, currentMatrix, tatapMukaMatrix, gradeRecords, gradeBook, school, year, teacher, assignment, semester, attendanceThreshold]);

  // --- Early returns (AFTER all hooks) ---
  if (loading) return <LoadingState message="Memuat data semester..." />;

  if (error) {
    return (
      <div className="space-y-6 p-4">
        <EmptyState title="Gagal memuat data" description={error} />
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="space-y-6 p-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Rekap Semester</h1>
          <Badge variant="warning">Sprint 4</Badge>
        </div>
        <EmptyState
          title="Belum ada Kelas dan Mapel"
          description="Tambahkan assignment di menu Kelas dan Mapel sebelum menggunakan Rekap Semester."
          action={<Button variant="secondary" onClick={() => (window.location.hash = "#/assignments")}>Buka Kelas & Mapel</Button>}
        />
      </div>
    );
  }

  // --- Dynamic @media print CSS injection ---
  // PRINT-FIX-RC1: Removed transform:scale + width compensation approach.
  //   The old approach set width:111%+ and then scaled down to 90%, which
  //   caused the table to overflow the A4 landscape area BEFORE scaling.
  //   Now: only inject @page margin changes. Table sizing handled by
  //   table-layout:fixed + <colgroup> percentages in the matrix components.
  const marginCss = MARGIN_OPTIONS.find((o) => o.value === marginPreset)?.css ?? "10mm 10mm";
  const scalePt = SCALE_OPTIONS.find((o) => o.value === scalePreset)?.pt ?? 7;

  const printStyleTag = `
    @media print {
      /* 1. PAKSA BROWSER KUNCI KE LANDSCAPE A4
         @page landscape named page + page:landscape on .rekap-landscape-doc
         forces Chrome/Edge to auto-select Landscape orientation in print dialog.
         User tidak perlu manual ubah Portrait → Landscape lagi. */
      @page landscape {
        size: A4 landscape;
        margin: ${marginCss} !important;
      }
      @page :first {
        margin: ${marginCss} !important;
      }
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      /* 2. KUNCI WIDTH & PADDING TABEL AGAR TIDAK TERLIPAT VERTIKAL */
      .rekap-landscape-doc {
        page: landscape;
        font-size: ${scalePt}pt !important;
        line-height: 1.4 !important;
      }
      .rekap-matrix-table {
        font-size: ${scalePt - 0.5}pt !important;
        width: 100% !important;
        border-collapse: collapse !important;
        table-layout: fixed !important;
      }
      .rekap-matrix-table th,
      .rekap-matrix-table td {
        font-size: ${scalePt - 0.5}pt !important;
        vertical-align: middle !important;
        word-break: keep-all !important;   /* Cegah kata terpotong per huruf */
      }

      /* 3. KHUSUS JUDUL HEADER KIRI (Mengajar ke-, Jumlah Jam, Tanggal)
         Beri lebar cukup agar teks tidak terhimpit/terlipat per karakter.
         white-space:nowrap mencegah teks header terlipat vertikal. */
      .rekap-matrix-table .header-label {
        white-space: normal !important;
        text-align: left !important;
        font-weight: bold !important;
        min-width: 80px !important;
      }

      /* 4. PASTIKAN HANYA 1 HALAMAN (BEBAS OVERFLOW) */
      .rekap-landscape-doc {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
      .signature-block {
        break-inside: avoid !important;
        margin-top: 15px !important;
      }

      /* Signature text scales with slider — overrides Tailwind text-[9px]/text-[7px] */
      .rekap-landscape-doc .signature-block * {
        font-size: ${scalePt}pt !important;
      }
      .page-break-avoid {
        break-inside: avoid;
        page-break-inside: avoid;
      }
    }
  `;

  return (
    <div className="space-y-4">
      {/* ── Dynamic Print CSS Injection ── */}
      <style dangerouslySetInnerHTML={{ __html: printStyleTag }} />

      {/* --- Header + Context Bar --- */}
      <div className="flex flex-col gap-3 no-print">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Rekap Semester</h1>
          <Badge variant="success">Sprint 6</Badge>
        </div>

        {/* Context selector bar */}
        <div className="flex flex-wrap items-end gap-3 bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <Select
            label="Kelas dan Mapel"
            id="rekap-assignment"
            value={selectedAssignmentId}
            onChange={setSelectedAssignmentId}
            options={assignments.map((a) => ({
              value: a.id,
              label: `${a.classLabel} · ${a.subject}`,
            }))}
          />
          <Select
            label="Semester"
            id="rekap-semester"
            value={String(semester)}
            onChange={(v) => setSemester(Number(v) as 1 | 2)}
            options={[
              { value: "1", label: "Semester 1 (Ganjil)" },
              { value: "2", label: "Semester 2 (Genap)" },
            ]}
          />
          {tab === "absensi-bulanan" && (
            <Select
              label="Bulan"
              id="rekap-month"
              value={String(selectedMonthIndex)}
              onChange={(v) => setSelectedMonthIndex(Number(v))}
              options={months.map((m) => ({ value: String(m.value), label: m.label }))}
            />
          )}

          {/* Threshold slider — only shown on Tatap Muka tab */}
          {tab === "tatap-muka" && (
            <div className="flex items-center gap-2">
              <label htmlFor="threshold-slider" className="text-xs font-medium text-slate-600 whitespace-nowrap">
                Batas Kehadiran
              </label>
              <input
                id="threshold-slider"
                type="range"
                min="0.50"
                max="1.00"
                step="0.05"
                value={attendanceThreshold}
                onChange={(e) => setAttendanceThreshold(Number(e.target.value))}
                className="w-20 accent-brand-600"
              />
              <span className="text-xs font-bold text-slate-800">
                {Math.round(attendanceThreshold * 100)}%
              </span>
            </div>
          )}

          {/* Role badge */}
          <div className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-600 font-medium">
            {TAB_ROLES[tab]}
          </div>

          {/* Print/Export buttons + DOCX */}
          <div className="ml-auto flex gap-2">
            <PrintExportButtons
              filename={`rekap-${tab}-${assignment?.classLabel ?? "semester"}`}
              title={TAB_LABELS[tab]}
              schoolName={school?.name}
              orientation="landscape"
              targetId={getPrintTargetId()}
              disabled={getPrintDisabled()}
              docxExport={docxExportCallback}
            />
          </div>
        </div>

        {/* ── Pre-Print Toolbar: Margin & Scale ── */}
        <div className="flex flex-wrap items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Pengaturan Cetak</span>

          {/* Margin selector */}
          <div className="flex items-center gap-1">
            <label htmlFor="margin-select" className="text-xs font-medium text-slate-600">Margin:</label>
            <select
              id="margin-select"
              value={marginPreset}
              onChange={(e) => setMarginPreset(e.target.value as MarginPreset)}
              className="text-xs border border-slate-300 rounded px-2 py-1 bg-white"
            >
              {MARGIN_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Scale selector */}
          <div className="flex items-center gap-1">
            <label htmlFor="scale-select" className="text-xs font-medium text-slate-600">Ukuran Font:</label>
            <select
              id="scale-select"
              value={scalePreset}
              onChange={(e) => setScalePreset(Number(e.target.value) as ScalePreset)}
              className="text-xs border border-slate-300 rounded px-2 py-1 bg-white"
            >
              {SCALE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Live preview hint */}
          <span className="text-xs text-amber-600">
            Ctrl+P untuk preview cetak. Skala mengatur ukuran font (lebih kecil = lebih muat). DOCX margin rapat default.
          </span>
        </div>

        {/* Tab buttons — 3 format */}
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {(["absensi-bulanan", "tatap-muka", "nilai"] as RekapTab[]).map((tabKey) => (
            <button
              key={tabKey}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === tabKey
                  ? "bg-white text-brand-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              onClick={() => setTab(tabKey)}
            >
              {TAB_LABELS[tabKey]}
            </button>
          ))}
        </div>
      </div>

      {/* --- Content area --- */}
      {aggLoading && <LoadingState message="Mengagregasi data semester..." />}

      {aggError && (
        <EmptyState title="Gagal memuat rekap" description={aggError} />
      )}

      {/* FORMAT-1: Absensi Bulanan (Wali Kelas) */}
      {!aggLoading && !aggError && tab === "absensi-bulanan" && (
        currentMatrix && currentMatrix.students.length > 0 ? (
          <AbsensiBulananMatrix
            matrix={currentMatrix}
            school={school}
            teacherName={teacher?.name}
            yearLabel={year?.label}
            classLabel={assignment?.classLabel}
          />
        ) : (
          <EmptyState title="Belum ada data absensi" description={`Tidak ada data absensi untuk bulan ${months[selectedMonthIndex]?.label ?? "terpilih"}.`} />
        )
      )}

      {/* FORMAT-2: Daftar Hadir Tatap Muka (Guru Mapel) */}
      {!aggLoading && !aggError && tab === "tatap-muka" && (
        tatapMukaMatrix && tatapMukaMatrix.students.length > 0 ? (
          <TatapMukaMatrix
            matrix={tatapMukaMatrix}
            school={school}
            teacherName={teacher?.name}
            yearLabel={year?.label}
            classLabel={assignment?.classLabel}
            subject={assignment?.subject}
            semester={semester}
            attendanceThreshold={attendanceThreshold}
          />
        ) : (
          <EmptyState title="Belum ada data tatap muka" description="Tidak ada sesi mengajar (LessonSession) untuk assignment terpilih. Generate jadwal di menu Jadwal dulu, atau input jurnal harian." />
        )
      )}

      {/* FORMAT-3: Penilaian Pengetahuan (Guru Mapel) */}
      {!aggLoading && !aggError && tab === "nilai" && (
        gradeRecords.length > 0 ? (
          <NilaiMatrix
            records={gradeRecords}
            gradeBook={gradeBook}
            school={school}
            teacherName={teacher?.name}
            yearLabel={year?.label}
            classLabel={assignment?.classLabel}
            subject={assignment?.subject}
            semester={semester}
          />
        ) : (
          <EmptyState title="Belum ada data nilai" description="Tidak ada GradeBook untuk assignment terpilih. Input nilai di menu Daftar Nilai dulu." />
        )
      )}
    </div>
  );
}
