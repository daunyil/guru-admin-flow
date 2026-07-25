import { useState } from "react";
import { Card, CardHeader, Button } from "../../shared/ui";
import { importScheduleFromJSON } from "../../shared/db/teaching-schedule-repo";
import { getTeacherProfile } from "../../shared/db/profile-repo";

interface ImportModalProps {
  academicYearId: string;
  onClose: () => void;
  onImported: (count: number) => void;
  onError: (errors: string[]) => void;
}

export function ImportModal({
  academicYearId,
  onClose,
  onImported,
  onError,
}: ImportModalProps) {
  const [jsonText, setJsonText] = useState("");
  const [importing, setImporting] = useState(false);

  async function handleImport() {
    setImporting(true);
    try {
      const teacher = await getTeacherProfile();
      if (!teacher) {
        onError(["Profil guru belum diisi. Lengkapi di menu Profil dulu."]);
        setImporting(false);
        return;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonText);
      } catch (e) {
        onError([`JSON tidak valid: ${e instanceof Error ? e.message : String(e)}`]);
        setImporting(false);
        return;
      }
      const result = await importScheduleFromJSON(parsed, academicYearId, teacher.id);
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
    <Card>
      <CardHeader
        title="Impor Jadwal dari Smart Roster"
        description="Format guru-admin-flow/schedule/v1. Jadwal existing akan di-soft-delete dan diganti."
      />
      <textarea
        className="input font-mono text-xs"
        rows={12}
        value={jsonText}
        onChange={(e) => setJsonText(e.target.value)}
        placeholder={`{
  "$schema": "guru-admin-flow/schedule/v1",
  "academicYearLabel": "2025/2026",
  "entries": [...]
}`}
      />
      <div className="mt-3 p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800">
        ⚠️ Impor akan <strong>mengganti</strong> semua jadwal existing untuk tahun pelajaran ini.
      </div>
      <div className="flex gap-2 mt-3">
        <Button onClick={handleImport} disabled={importing || !jsonText.trim()}>
          {importing ? "Mengimpor..." : "Impor & Ganti"}
        </Button>
        <Button variant="secondary" onClick={onClose} disabled={importing}>Batal</Button>
      </div>
    </Card>
  );
}
