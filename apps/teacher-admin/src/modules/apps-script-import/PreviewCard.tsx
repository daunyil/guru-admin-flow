import { Card, CardHeader, Badge, Button } from "@shared/ui";
import { InfoCard } from "@shared/ui/ContextCard";
import { PreviewStat } from "./PreviewStat";
import type { AppsScriptImportState } from "./useAppsScriptImportState";

interface PreviewCardProps {
  state: AppsScriptImportState;
}

export function PreviewCard({ state }: PreviewCardProps) {
  const { validation, preview, year, teacher, importing } = state;

  if (!validation?.success || !preview) return null;

  return (
    <Card className="border-emerald-200 bg-emerald-50">
      <CardHeader
        title="2. Preview Data"
        description="Data valid. Klik 'Konfirmasi Import' untuk memproses."
      />
      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
          <PreviewStat label="Siswa" value={preview.counts.students} />
          <PreviewStat label="Kelas dan Mapel" value={preview.counts.gurus} />
          <PreviewStat label="Absensi" value={preview.counts.absensi} />
          <PreviewStat label="Jurnal" value={preview.counts.jurnal} />
          <PreviewStat label="Nilai" value={preview.counts.nilai} />
        </div>

        {/* APPS-SCRIPT-IMPORT-ADAPTER-01: daftar kelas+mapel unik */}
        {preview.uniqueClasses.length > 0 && (
          <div className="p-3 bg-white rounded-md">
            <p className="text-xs font-semibold text-slate-600 mb-2">Kelas dan Mapel yang akan diproses:</p>
            <div className="flex gap-2 flex-wrap">
              {preview.uniqueClasses.map((c, i) => (
                <Badge key={i} variant="neutral">{c.classLabel} · {c.subject} · {c.teacherName}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* APPS-SCRIPT-IMPORT-ADAPTER-01: warning duplikat + missing class */}
        {preview.warnings.length > 0 && (
          <div className="p-3 bg-amber-50 rounded-md text-sm text-amber-800">
            <p className="font-semibold">Peringatan:</p>
            <ul className="list-disc pl-5 mt-1">
              {preview.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {validation.warnings.length > 0 && (
          <div className="p-3 bg-amber-50 rounded-md text-sm text-amber-800">
            <p className="font-semibold">Peringatan Validasi:</p>
            <ul className="list-disc pl-5 mt-1">
              {validation.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {year && teacher && (
          <InfoCard
            entries={[
              { label: "Tahun Pelajaran", value: year.label },
              { label: "Guru Aktif", value: teacher.name },
              { label: "Semester JSON", value: String(validation.data?.semester ?? "-") },
              { label: "Sekolah JSON", value: validation.data?.schoolName ?? "-" },
              { label: "Export At", value: validation.data?.exportedAt ?? "-" },
            ]}
          />
        )}

        <Button onClick={state.handleImport} disabled={importing}>
          {importing ? "Mengimpor..." : "Konfirmasi Import"}
        </Button>
      </div>
    </Card>
  );
}
