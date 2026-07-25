/**
 * NewRosterForm — form to create a new class roster.
 */

import { useState } from "react";
import { Card, CardHeader, Input, Button } from "@shared/ui";
import { saveClassRoster } from "@shared/db/class-roster-repo";
import type { ClassRoster } from "@guru-admin/domain";

interface NewRosterFormProps {
  academicYearId: string;
  onClose: () => void;
  onSaved: (r: ClassRoster) => void;
  onError: (msg: string) => void;
}

export function NewRosterForm({
  academicYearId,
  onClose,
  onSaved,
  onError,
}: NewRosterFormProps) {
  const [saving, setSaving] = useState(false);
  const [classLabel, setClassLabel] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await saveClassRoster({
        classId: classLabel,
        classLabel,
        academicYearId,
        students: [],
      });
      onSaved(saved);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Gagal membuat kelas.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Buat Kelas Baru" />
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input label="Label Kelas" id="r-class" required value={classLabel} onChange={setClassLabel} placeholder="VII A" />
        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Buat"}</Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Batal</Button>
        </div>
      </form>
    </Card>
  );
}
