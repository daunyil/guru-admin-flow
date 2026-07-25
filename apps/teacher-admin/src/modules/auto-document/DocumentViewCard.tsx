import { Card } from "@shared/ui";
import type { AcademicYear, SchoolProfile, AdminDocumentPackage } from "@guru-admin/domain";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";

interface DocumentViewCardProps {
  pkg: AdminDocumentPackage;
  year: AcademicYear | null;
  school: SchoolProfile | undefined;
}

export function DocumentViewCard({ pkg, year, school }: DocumentViewCardProps) {
  return (
    <Card>
      <div className="print-area">
        <div className="document-page document-portrait">
          <div className="document-title">PAKET ADMINISTRASI GURU</div>
          <div className="document-subtitle">{school?.name ?? "Sekolah"}</div>
          <div className="document-subtitle">Tahun Pelajaran {year?.label}</div>

          <table className="document-identity">
            <tbody>
              <tr>
                <td>Guru</td><td>{pkg.assignment.teacherName}</td>
                <td>Mapel</td><td>{pkg.assignment.subject}</td>
              </tr>
              <tr>
                <td>Kelas</td><td>{pkg.assignment.classLabel}</td>
                <td>Semester</td><td>{pkg.assignment.semester === 1 ? "Ganjil" : "Genap"}</td>
              </tr>
              <tr>
                <td>Skor Kelengkapan</td><td>{pkg.summary.completenessScore}%</td>
                <td>Tanggal Generate</td><td>{formatLongDateID(todayISODate())}</td>
              </tr>
            </tbody>
          </table>

          <div className="document-section-title">A. DAFTAR DOKUMEN ADMINISTRASI</div>
          <table className="document-table">
            <thead>
              <tr>
                <th style={{ width: "5%" }}>No</th>
                <th>Dokumen</th>
                <th style={{ width: "15%" }}>Jumlah</th>
                <th style={{ width: "20%" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {pkg.documents.map((doc, i) => (
                <tr key={doc.key}>
                  <td className="text-center">{i + 1}</td>
                  <td>{doc.name}</td>
                  <td className="text-center">{doc.count}</td>
                  <td className="text-center">
                    {doc.status === "available" ? "✓ Lengkap" : doc.status === "draft" ? "Draft" : "Belum Tersedia"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="document-section-title">B. RINGKASAN DATA</div>
          <table className="document-table">
            <thead>
              <tr><th>Uraian</th><th style={{ width: "15%" }}>Jumlah</th></tr>
            </thead>
            <tbody>
              <tr><td>Total Sesi Mengajar</td><td className="text-center">{pkg.summary.totalSessions}</td></tr>
              <tr><td>Record Absensi</td><td className="text-center">{pkg.summary.totalAttendanceRecords}</td></tr>
              <tr><td>Jurnal Mengajar (Final/Total)</td><td className="text-center">{pkg.summary.totalJournalsFinal}/{pkg.summary.totalJournals}</td></tr>
              <tr><td>Entri Nilai</td><td className="text-center">{pkg.summary.totalGradeEntries}</td></tr>
              <tr><td>Siswa Remedial</td><td className="text-center">{pkg.summary.remedialStudents}</td></tr>
              <tr><td>Siswa Pengayaan</td><td className="text-center">{pkg.summary.enrichmentStudents}</td></tr>
              <tr><td>Total Siswa</td><td className="text-center">{pkg.summary.totalStudents}</td></tr>
            </tbody>
          </table>

          <div className="signature-grid">
            <div>
              <p>Mengetahui,</p>
              <p>Kepala Sekolah</p>
              <div className="sig-space" />
              <p className="sig-name">{school?.headmasterName ?? "(............)"}</p>
              <p>NIP. {school?.headmasterNip ?? "-"}</p>
            </div>
            <div>
              <p>{school?.regency ?? "..........."}, {formatLongDateID(todayISODate())}</p>
              <p>Guru Mata Pelajaran</p>
              <div className="sig-space" />
              <p className="sig-name">{pkg.assignment.teacherName}</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
