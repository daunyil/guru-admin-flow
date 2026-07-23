import {
  AdminPackageReport,
  AssessmentGridDocument,
  AtpReportDocument,
  AttendanceReportDocument,
  EffectiveWeekDetailDocument,
  EffectiveWeeksDocument,
  GradeReportDocument,
  JournalReportDocument,
  KktpAnalysisDocument,
  PromesDocument,
  ProtaReportDocument,
  QuestionCardDocument,
  QuestionGridDocument,
  RemedialEnrichmentDocument,
} from "./ReportTemplates";
import "./document-print.css";

const context = {
  schoolName: "SMP Negeri 8 Bantan",
  schoolAddress: "Jalan Utama Muntai, Kecamatan Bantan, Kabupaten Bengkalis",
  institutionName: "Pemerintah Kabupaten Bengkalis",
  schoolOffice: "Dinas Pendidikan",
  academicYear: "2025/2026",
  semester: "Ganjil",
  teacherName: "Nama Guru",
  teacherNip: "................",
  subject: "Pendidikan Pancasila",
  classLabel: "VII A",
  headmasterName: "Nama Kepala Sekolah",
  headmasterNip: "................",
  place: "Muntai",
  dateLabel: "........................",
};

export function DocumentPrintPreviewExample() {
  return (
    <div className="print-area">
      <AdminPackageReport
        withPrintArea={false}
        data={{
          context,
          items: [
            { group: "Referensi Resmi", name: "Kalender Pendidikan Dinas", source: "official", status: "complete" },
            { group: "Referensi Resmi", name: "CP", source: "official", status: "complete" },
            { group: "Referensi Resmi", name: "ATP / Alur Tujuan Pembelajaran", source: "official", status: "complete" },
            { group: "Referensi Resmi", name: "Prota Resmi", source: "official", status: "complete" },
            { group: "Perencanaan", name: "Rincian Minggu Efektif", source: "app", status: "complete" },
            { group: "Perencanaan", name: "Promes", source: "teacher", status: "complete" },
            { group: "Penilaian", name: "Kisi-kisi Soal", source: "teacher", status: "draft" },
            { group: "Penilaian", name: "Kartu Soal", source: "teacher", status: "draft" },
          ],
        }}
      />

      <EffectiveWeekDetailDocument withPrintArea={false} data={{ context }} />

      <PromesDocument withPrintArea={false} data={{ context, allocationTime: "2 Jam/Minggu" }} />

      <AttendanceReportDocument
        withPrintArea={false}
        data={{
          context,
          meetings: Array.from({ length: 24 }, (_, index) => ({
            label: String(index + 1),
            date: `${String(index + 1).padStart(2, "0")}/08`,
          })),
          students: [
            { no: 1, nis: "4210", name: "Ahmad Hidayat", statuses: ["", "", "S"], summary: { sick: 1, excused: 0, absent: 0 } },
            { no: 2, nis: "4211", name: "Anita", statuses: ["", "", ""], summary: { sick: 0, excused: 0, absent: 0 } },
          ],
        }}
      />

      <GradeReportDocument
        withPrintArea={false}
        data={{
          context,
          kktp: 75,
          rows: [
            {
              no: 1,
              nis: "4210",
              name: "Ahmad Hidayat",
              kdScores: { kd1: 78, kd2: 80, kd3: 82, kd4: 85, kd5: 84, kd6: 86 },
              ptsScore: 82,
              pasScore: 84,
              finalScore: 83,
              predicate: "B",
              note: "Tuntas",
            },
          ],
        }}
      />

      <QuestionGridDocument withPrintArea={false} data={{ context }} />
      <QuestionCardDocument withPrintArea={false} data={{ context }} />

      {/* ── Paket 1: Missing originals ── */}
      <ProtaReportDocument
        withPrintArea={false}
        data={{
          context,
          rows: [
            { semester: 1, atpNumber: "ATP-1.1", learningObjective: "Memahami konsep dasar akuntansi dan transaksi keuangan", allocationJp: 8 },
            { semester: 1, atpNumber: "ATP-1.2", learningObjective: "Menganalisis laporan keuangan usaha kecil", allocationJp: 6 },
            { semester: 1, atpNumber: "ATP-1.3", learningObjective: "Menerapkan pencatatan transaksi dalam jurnal umum", allocationJp: 8 },
            { semester: 2, atpNumber: "ATP-2.1", learningObjective: "Memahami instrumen pasar keuangan", allocationJp: 6 },
            { semester: 2, atpNumber: "ATP-2.2", learningObjective: "Menganalisis peluang usaha di lingkungan lokal", allocationJp: 8 },
            { semester: 2, atpNumber: "ATP-2.3", learningObjective: "Menyusun proposal usaha kecil", allocationJp: 10 },
          ],
        }}
      />

      <JournalReportDocument
        withPrintArea={false}
        data={{
          context,
          rows: [
            { no: 1, date: "2025-08-04", hourSlot: "1-2", classLabel: "VII A", material: "Konsep dasar akuntansi", attendanceSummary: { sick: 1, excused: 0, absent: 0 }, note: "Materi berjalan lancar" },
            { no: 2, date: "2025-08-06", hourSlot: "3-4", classLabel: "VII A", material: "Transaksi keuangan", attendanceSummary: { sick: 0, excused: 1, absent: 0 }, note: "2 siswa perlu remedial" },
            { no: 3, date: "2025-08-11", hourSlot: "1-2", classLabel: "VII A", material: "Jurnal umum", attendanceSummary: { sick: 2, excused: 0, absent: 1 }, reflection: "Perlu penjelasan lebih detail tentang debit-kredit" },
          ],
        }}
      />

      {/* ── Paket 2: Supplementary School Documents ── */}
      <EffectiveWeeksDocument
        withPrintArea={false}
        data={{
          context,
          rows: [
            { month: "Juli", totalWeeks: 5, nonEffectiveWeeks: 1, effectiveWeeks: 4 },
            { month: "Agustus", totalWeeks: 4, nonEffectiveWeeks: 0, effectiveWeeks: 4 },
            { month: "September", totalWeeks: 4, nonEffectiveWeeks: 1, effectiveWeeks: 3 },
            { month: "Oktober", totalWeeks: 5, nonEffectiveWeeks: 1, effectiveWeeks: 4 },
            { month: "November", totalWeeks: 4, nonEffectiveWeeks: 0, effectiveWeeks: 4 },
            { month: "Desember", totalWeeks: 5, nonEffectiveWeeks: 2, effectiveWeeks: 3 },
          ],
          allocations: [
            { component: "ATP Elemen 1", jpPerWeek: 2, totalWeeks: 20, totalJp: 40 },
            { component: "ATP Elemen 2", jpPerWeek: 2, totalWeeks: 20, totalJp: 40 },
          ],
          totalEffectiveWeeks: 20,
          totalJp: 80,
        }}
      />
      <KktpAnalysisDocument
        withPrintArea={false}
        data={{
          context,
          kktp: 75,
          rows: [
            { element: "Elemen 1", learningObjective: "TP 1.1", intervalIndex: 2, actionOrRecommendation: "Perlu ditingkatkan" },
            { element: "Elemen 2", learningObjective: "TP 2.1", intervalIndex: 3, actionOrRecommendation: "Sudut sangat baik" },
            { element: "Elemen 1", learningObjective: "TP 1.2", intervalIndex: 1, actionOrRecommendation: "Perlu bimbingan tambahan" },
          ],
        }}
      />
      <RemedialEnrichmentDocument
        withPrintArea={false}
        data={{
          context,
          kktp: 75,
          rows: [
            { no: 1, name: "Ahmad Hidayat", initialScore: 65, unfinishedTp: "TP 1.2, TP 2.1", activityType: "Remedial", activity: "Pembelajaran ulang + tugas perbaikan", finalScore: 78, status: "TUNTAS" },
            { no: 2, name: "Anita Sari", initialScore: 58, unfinishedTp: "TP 3.1", activityType: "Remedial", activity: "Bimbingan individual", finalScore: 72, status: "TUNTAS" },
            { no: 3, name: "Budi Pratama", initialScore: 92, unfinishedTp: "", activityType: "Pengayaan", activity: "Proyek mandiri: analisis data lingkungan", finalScore: 95, status: "TUNTAS" },
          ],
        }}
      />
      <AtpReportDocument
        withPrintArea={false}
        data={{
          context,
          rows: [
            { element: "Elemen 1: Akuntansi", learningOutcome: "Peserta didik mampu memahami konsep dasar akuntansi", learningObjective: "TP 1.1 Mengidentifikasi transaksi keuangan", allocationJp: 8, pancasilaProfile: "Bernalar Kritis, Mandiri" },
            { element: "Elemen 2: Pasar Keuangan", learningOutcome: "Peserta didik mampu menganalisis instrumen pasar keuangan", learningObjective: "TP 2.1 Mendeskripsikan jenis-jenis pasar", allocationJp: 6, pancasilaProfile: "Gotong Royong, Bernalar Kritis" },
          ],
        }}
      />
      <AssessmentGridDocument
        withPrintArea={false}
        data={{
          context,
          assessmentTitle: "Sumatif Akhir Semester (SAS) Ganjil 2025/2026",
          rows: [
            { element: "Elemen 1: Akuntansi", material: "Konsep dasar akuntansi", indicator: "Disajikan kasus transaksi, peserta didik dapat mengidentifikasi akun yang terlibat", questionForm: "Pilihan Ganda", cognitiveLevel: "C2", questionNumbers: "1–5" },
            { element: "Elemen 2: Pasar Keuangan", material: "Instrumen pasar keuangan", indicator: "Peserta didik dapat membedakan instrumen pasar modal dan pasar uang", questionForm: "Esai", cognitiveLevel: "C4", questionNumbers: "6–8" },
          ],
        }}
      />
    </div>
  );
}
