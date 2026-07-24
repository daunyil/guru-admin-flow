/**
 * ImportModal — overlay modal for importing calendar events from JSON.
 * Extracted from CalendarPage.tsx.
 */

import { useState } from "react";
import { Card, CardHeader, Textarea, Button } from "../../shared/ui";
import { importCalendarFromJSON } from "../../shared/db/calendar-repo";

export function ImportModal({
  academicYearId,
  onClose,
  onImported,
  onError,
}: {
  academicYearId: string;
  onClose: () => void;
  onImported: (count: number) => void;
  onError: (errors: string[]) => void;
}) {
  const [jsonText, setJsonText] = useState("");
  const [importing, setImporting] = useState(false);

  async function handleImport() {
    setImporting(true);
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonText);
      } catch (e) {
        onError([`JSON tidak valid: ${e instanceof Error ? e.message : String(e)}`]);
        setImporting(false);
        return;
      }
      const result = await importCalendarFromJSON(parsed, academicYearId);
      if (result.success) {
        onImported(result.importedCount);
      } else {
        onError(result.errors);
      }
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="doc-overlay no-print" onClick={onClose} role="dialog" aria-modal="true" aria-label="Impor Kalender dari JSON">
      <div className="doc-overlay-card" onClick={(e) => e.stopPropagation()}>
        <Card>
          <CardHeader
            title="Impor Kalender dari JSON"
            description="Tempel JSON hasil AI (format guru-admin-flow/calendar/v1). Event existing akan di-soft-delete dan diganti."
          />
          <Textarea
            label="JSON Kalender"
            id="import-json"
            value={jsonText}
            onChange={setJsonText}
            rows={12}
            placeholder={`{
  "$schema": "guru-admin-flow/calendar/v1",
  "academicYearLabel": "2025/2026",
  "events": [...]
}`}
          />
          <div className="mt-3 p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800">
            ⚠️ Impor akan <strong>mengganti</strong> semua event kalender existing untuk tahun pelajaran ini.
            Pastikan backup data lama bila perlu.
          </div>
          <div className="flex gap-2 mt-3">
            <Button onClick={handleImport} disabled={importing || !jsonText.trim()}>
              {importing ? "Mengimpor..." : "Impor & Ganti"}
            </Button>
            <Button variant="secondary" onClick={onClose} disabled={importing}>Batal</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
