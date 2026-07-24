/**
 * Generate standalone HTML checklist untuk print/audit.
 */
import type { DocItem } from "./admin-package-types";
import type { AcademicYear, TeachingAssignment } from "@guru-admin/domain";
import { todayISODate } from "@guru-admin/shared";

export function generateChecklistHTML(
  docs: DocItem[],
  assignment: TeachingAssignment,
  year: AcademicYear,
  score: number,
  lengkapCount: number,
  totalDocs: number
): string {
  const today = todayISODate();
  const rows = docs.map((d) => {
    const statusSymbol = d.status === "lengkap" ? "V" : d.status === "belum" ? "O" : "X";
    const statusColor = d.status === "lengkap" ? "#10b981" : d.status === "belum" ? "#f59e0b" : "#ef4444";
    return `<tr>
      <td style="padding: 6pt 8pt; border: 1px solid #000; text-align: center;">${statusSymbol}</td>
      <td style="padding: 6pt 8pt; border: 1px solid #000; font-weight: bold;">${d.name}</td>
      <td style="padding: 6pt 8pt; border: 1px solid #000; color: ${statusColor}; font-weight: bold;">${d.status === "lengkap" ? "Lengkap" : d.status === "belum" ? "Belum Lengkap" : "Kosong"}</td>
      <td style="padding: 6pt 8pt; border: 1px solid #000;">${d.detail}</td>
      <td style="padding: 6pt 8pt; border: 1px solid #000; text-align: center;">${d.count}</td>
    </tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Checklist Administrasi — ${assignment.classLabel} ${assignment.subject}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: "Times New Roman", Georgia, serif; font-size: 11pt; padding: 2cm; max-width: 21cm; margin: 0 auto; color: #000; }
    h1 { text-align: center; font-size: 14pt; text-transform: uppercase; margin-bottom: 4pt; }
    h2 { text-align: center; font-size: 11pt; margin-bottom: 16pt; }
    .identitas { width: 100%; border-collapse: collapse; margin-bottom: 16pt; font-size: 10pt; }
    .identitas td { border: 1px solid #000; padding: 4pt 8pt; }
    .identitas td:first-child { font-weight: bold; width: 25%; background: #f5f5f5; }
    .score-box { text-align: center; padding: 12pt; background: #f0f9ff; border: 1px solid #000; margin-bottom: 16pt; }
    .score-box .score { font-size: 24pt; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; font-size: 10pt; }
    th { background: #e0e0e0; padding: 6pt 8pt; border: 1px solid #000; text-align: left; font-weight: bold; }
    th:first-child { width: 30pt; text-align: center; }
    th:last-child { width: 50pt; text-align: center; }
    .footer { margin-top: 24pt; padding-top: 8pt; border-top: 1px solid #999; font-size: 9pt; color: #666; text-align: center; }
    @media print { body { padding: 0; } @page { size: A4 portrait; margin: 1.5cm 2cm; } }
  </style>
</head>
<body>
  <h1>Checklist Kelengkapan Administrasi Guru</h1>
  <h2>Tahun Pelajaran ${year.label}</h2>
  <table class="identitas">
    <tr><td>Guru</td><td>${assignment.teacherName}</td></tr>
    <tr><td>Mata Pelajaran</td><td>${assignment.subject}</td></tr>
    <tr><td>Kelas</td><td>${assignment.classLabel}</td></tr>
    <tr><td>Semester</td><td>${assignment.semester === 1 ? "Ganjil" : "Genap"}</td></tr>
    <tr><td>Tanggal Cetak</td><td>${today}</td></tr>
  </table>
  <div class="score-box">
    <p>Skor Kelengkapan</p>
    <p class="score">${score}%</p>
    <p>${lengkapCount} / ${totalDocs} dokumen lengkap</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Dokumen</th>
        <th>Status</th>
        <th>Detail</th>
        <th>Jumlah</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">
    Dokumen ini di-generate otomatis oleh Guru Admin Flow (SIAKAD GURU) pada ${today}.
  </div>
</body>
</html>`;
}
