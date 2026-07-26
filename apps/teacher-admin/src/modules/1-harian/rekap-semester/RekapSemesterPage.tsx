/**
 * RekapSemesterPage — Matriks rekap bulanan absensi dan rekap nilai per semester.
 *
 * Sprint 4 implementation:
 *   1. Tab Absensi — Matriks 31 kolom per bulan (landscape, kop surat, ALPA/SAKIT/IZIN/JLH)
 *   2. Tab Nilai   — PA multi-level header (Ulangan + Tugas per KD, PTS, PAS, Ket.)
 *
 * Format referensi: SMPN 8 Bantan (FORMAT-REFERENCE-SMPN8-BANTAN.md)
 * DOMAIN-BOUNDARY: Modul 1-harian, import dari @shared/ saja.
 */

import { useRekapSemesterState } from "./useRekapSemesterState";
import { useSemesterAggregator } from "./hooks/useSemesterAggregator";
import { AbsensiMatrix } from "./AbsensiMatrix";
import { NilaiMatrix } from "./NilaiMatrix";
import { Select, LoadingState, EmptyState, Badge, Button, PrintExportButtons } from "@shared/ui";

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

  // Aggregator hook — reads data from DB
  const aggregator = useSemesterAggregator(rekapContext);
  const { gradeRecords, gradeBook, monthlyMatrices, loading: aggLoading, error: aggError } = aggregator;

  // Months for current semester
  const months = semester === 1 ? SEMESTER_1_MONTHS : SEMESTER_2_MONTHS;
  const currentMatrix = monthlyMatrices[selectedMonthIndex];

  // --- Loading state ---
  if (loading) return <LoadingState message="Memuat data semester..." />;

  // --- Error state ---
  if (error) {
    return (
      <div className="space-y-6 p-4">
        <EmptyState title="Gagal memuat data" description={error} />
      </div>
    );
  }

  // --- No assignments ---
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

  return (
    <div className="space-y-4">
      {/* --- Header + Context Bar --- */}
      <div className="flex flex-col gap-3 no-print">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">Rekap Semester</h1>
          <Badge variant="success">Sprint 4</Badge>
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
          {tab === "absensi" && (
            <Select
              label="Bulan"
              id="rekap-month"
              value={String(selectedMonthIndex)}
              onChange={(v) => setSelectedMonthIndex(Number(v))}
              options={months.map((m) => ({ value: String(m.value), label: m.label }))}
            />
          )}

          {/* Print/Export buttons */}
          <div className="ml-auto flex gap-2">
            <PrintExportButtons
              filename={`rekap-${tab}-${assignment?.classLabel ?? "semester"}`}
              title={tab === "absensi" ? "Rekap Absensi" : "Rekap Nilai"}
              schoolName={school?.name}
              orientation="landscape"
              targetId={tab === "absensi" ? "rekap-absensi-doc" : "rekap-nilai-doc"}
              disabled={tab === "absensi" ? !currentMatrix : gradeRecords.length === 0}
            />
          </div>
        </div>

        {/* Tab buttons */}
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === "absensi"
                ? "bg-white text-brand-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
            onClick={() => setTab("absensi")}
          >
            Matriks Absensi
          </button>
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === "nilai"
                ? "bg-white text-brand-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
            onClick={() => setTab("nilai")}
          >
            Matriks Nilai
          </button>
        </div>
      </div>

      {/* --- Content area --- */}
      {aggLoading && <LoadingState message="Mengagregasi data semester..." />}

      {aggError && (
        <EmptyState title="Gagal memuat rekap" description={aggError} />
      )}

      {!aggLoading && !aggError && tab === "absensi" && (
        currentMatrix && currentMatrix.students.length > 0 ? (
          <AbsensiMatrix
            matrix={currentMatrix}
            school={school}
            teacherName={teacher?.name}
            yearLabel={year?.label}
          />
        ) : (
          <EmptyState title="Belum ada data absensi" description={`Tidak ada data absensi untuk bulan ${months[selectedMonthIndex]?.label ?? "terpilih"}.`} />
        )
      )}

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
