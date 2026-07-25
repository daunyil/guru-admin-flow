/**
 * EventForm — overlay modal for adding/editing a CalendarEvent.
 * Extracted from CalendarPage.tsx.
 */

import { useState } from "react";
import { Card, CardHeader, Input, Select, Textarea, Button } from "@shared/ui";
import {
  saveCalendarEvent,
  updateCalendarEvent,
} from "@shared/db/calendar-repo";
import type { CalendarEvent, CalendarEventType } from "@guru-admin/domain";
import {
  CALENDAR_EVENT_TYPES,
  CALENDAR_EVENT_TYPE_LABELS_ID,
} from "@guru-admin/shared";

export function EventForm({
  academicYearId,
  editing,
  onClose,
  onSaved,
}: {
  academicYearId: string;
  editing: CalendarEvent | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    label: editing?.label ?? "",
    type: editing?.type ?? ("learning" as CalendarEventType),
    startDate: editing?.startDate ?? "",
    endDate: editing?.endDate ?? "",
    scope: "ALL",
    blocksLearning: editing?.blocksLearning ?? false,
    description: editing?.description ?? "",
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (form.startDate > form.endDate) {
        throw new Error("startDate wajib <= endDate");
      }
      const data = {
        academicYearId,
        startDate: form.startDate,
        endDate: form.endDate,
        type: form.type,
        label: form.label,
        description: form.description || undefined,
        scope: form.scope === "ALL" ? ("ALL" as const) : [form.scope],
        blocksLearning: form.type === "holiday" ? true : form.blocksLearning,
        source: "manual" as const,
      };
      if (editing) {
        await updateCalendarEvent(editing.id, data);
      } else {
        await saveCalendarEvent(data);
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan event.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="doc-overlay no-print" onClick={onClose} role="dialog" aria-modal="true" aria-label={editing ? "Edit Event" : "Tambah Event"}>
      <div className="doc-overlay-card" onClick={(e) => e.stopPropagation()}>
        <Card>
          <CardHeader title={editing ? "Edit Event" : "Tambah Event"} />
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Label" id="ev-label" required value={form.label} onChange={(v) => set("label", v)} />
            <Select
              label="Jenis"
              id="ev-type"
              value={form.type}
              onChange={(v) => set("type", v as CalendarEventType)}
              options={CALENDAR_EVENT_TYPES.map((t) => ({ value: t, label: CALENDAR_EVENT_TYPE_LABELS_ID[t] }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Mulai" id="ev-start" type="date" required value={form.startDate} onChange={(v) => set("startDate", v)} />
              <Input label="Selesai" id="ev-end" type="date" required value={form.endDate} onChange={(v) => set("endDate", v)} />
            </div>
            <Textarea label="Deskripsi (opsional)" id="ev-desc" value={form.description} onChange={(v) => set("description", v)} rows={2} />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.blocksLearning}
                onChange={(e) => set("blocksLearning", e.target.checked)}
                disabled={form.type === "holiday"}
              />
              <span>Blokir KBM (tidak ada pembelajaran di rentang ini)</span>
            </label>
            {form.type === "holiday" && (
              <p className="text-xs text-amber-600">Event tipe Libur wajib memblokir KBM (otomatis aktif).</p>
            )}
            {error && <div className="p-2 rounded bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>}
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button>
              <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Batal</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
