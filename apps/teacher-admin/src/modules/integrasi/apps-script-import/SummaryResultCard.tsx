import { Card, CardHeader, Badge } from "@shared/ui";
import { SummaryCard } from "./SummaryCard";
import type { ImportSummary } from "@shared/db/apps-script-import-repo";

interface SummaryResultCardProps {
  summary: ImportSummary;
}

export function SummaryResultCard({ summary }: SummaryResultCardProps) {
  return (
    <Card>
      <CardHeader
        title="3. Ringkasan Import"
        description="Hasil import (idempotent — import ulang tidak menggandakan data)."
      />
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <SummaryCard title="Siswa" data={summary.students} />
          <SummaryCard title="Kelas dan Mapel" data={summary.gurus} />
          <SummaryCard title="Absensi" data={summary.absensi} />
          <SummaryCard title="Jurnal" data={summary.jurnal} />
          <SummaryCard title="Nilai" data={summary.nilai} />
        </div>

        {summary.errors.length > 0 && (
          <div className="p-3 bg-rose-50 rounded-md text-sm">
            <p className="font-semibold text-rose-700">Error ({summary.errors.length}):</p>
            <ul className="list-disc pl-5 mt-1 text-rose-600 text-xs">
              {summary.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {summary.errors.length === 0 && (
          <Badge variant="success">✓ Semua data berhasil diimpor tanpa error</Badge>
        )}
      </div>
    </Card>
  );
}
