import {
  AdminPackageReport,
  AttendanceReportDocument,
  EffectiveWeekDetailDocument,
  GradeReportDocument,
  PromesDocument,
  QuestionCardDocument,
  QuestionGridDocument,
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
    </div>
  );
}
