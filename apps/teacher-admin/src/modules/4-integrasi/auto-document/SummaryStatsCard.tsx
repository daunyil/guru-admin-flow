import { Card, CardHeader } from "@shared/ui";
import type { AdminDocumentPackage } from "@guru-admin/domain";

function StatBox({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="p-3 bg-slate-50 rounded-md">
      <p className="text-xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

interface SummaryStatsCardProps {
  pkg: AdminDocumentPackage;
}

export function SummaryStatsCard({ pkg }: SummaryStatsCardProps) {
  return (
    <Card>
      <CardHeader title="3. Ringkasan Data" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <StatBox label="Total Sesi" value={pkg.summary.totalSessions} />
        <StatBox label="Record Absensi" value={pkg.summary.totalAttendanceRecords} />
        <StatBox label="Jurnal (Final/Total)" value={`${pkg.summary.totalJournalsFinal}/${pkg.summary.totalJournals}`} />
        <StatBox label="Entri Nilai" value={pkg.summary.totalGradeEntries} />
        <StatBox label="Siswa Remedial" value={pkg.summary.remedialStudents} />
        <StatBox label="Siswa Pengayaan" value={pkg.summary.enrichmentStudents} />
        <StatBox label="Total Siswa" value={pkg.summary.totalStudents} />
        <StatBox label="Dokumen Lengkap" value={`${pkg.summary.availableDocs}/${pkg.summary.totalDocs}`} />
      </div>
    </Card>
  );
}
