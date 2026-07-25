import { Card, CardHeader } from "@shared/ui";
import type { AppsScriptImportValidation } from "@guru-admin/domain";

interface ValidationErrorsCardProps {
  validation: AppsScriptImportValidation;
}

export function ValidationErrorsCard({ validation }: ValidationErrorsCardProps) {
  return (
    <Card className="border-rose-200 bg-rose-50">
      <CardHeader title="Validasi Gagal" description={`${validation.errors.length} error ditemukan`} />
      <ul className="space-y-1 text-sm text-rose-700">
        {validation.errors.map((err, i) => (
          <li key={i}>• {err}</li>
        ))}
      </ul>
    </Card>
  );
}
