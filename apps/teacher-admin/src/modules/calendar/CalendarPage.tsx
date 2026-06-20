/**
 * Modul M02 Kalender — halaman /calendar
 * Sumber: docs/SPRINT_2_DESIGN.md §3
 */

import { useEffect, useState } from "react";
import { Card, CardHeader, Input, Select, Textarea, Button, EmptyState, Badge } from "../../shared/ui";
import {
  listCalendarEvents,
  saveCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  importCalendarFromJSON,
} from "../../shared/db/calendar-repo";
import { getActiveAcademicYear } from "../../shared/db/profile-repo";
import type { CalendarEvent, CalendarEventType } from "@guru-admin/domain";
import {
  CALENDAR_EVENT_TYPES,
  CALENDAR_EVENT_TYPE_LABELS_ID,
  formatLongDateID,
} from "@guru-admin/shared";

export function CalendarPage() {
  const [loading, setLoading] = useState(true);
  const [activeYearId, setActiveYearId] = useState<string | null>(null);
  const [activeYearLabel, setActiveYearLabel] = useState<string>("");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function reload() {
    if (!activeYearId) return;
    const evs = await listCalendarEvents(activeYearId);
    setEvents(evs);
  }

  useEffect(() => {
    void (async () => {
      const year = await getActiveAcademicYear();
      if (year) {
        setActiveYearId(year.id);
        setActiveYearLabel(year.label);
        const evs = await listCalendarEvents(year.id);
        setEvents(evs);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (error) setTimeout(() => setError(null), 5000);
    if (success) setTimeout(() => setSuccess(null), 3000);
  }, [error, success]);

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;

  if (!activeYearId) {
    return (
      <div className="space-y-4">
        <Header />
        <Card>
          <EmptyState
            title="Belum ada tahun pelajaran aktif"
            description="Buat tahun pelajaran aktif dulu di menu Profil sebelum mengelola kalender."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Header yearLabel={activeYearLabel} count={events.length} />

      {error && <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-700">{error}</div>}
      {success && <div className="p-3 rounded-md bg-brand-50 border border-brand-200 text-sm text-brand-700">{success}</div>}

      <div className="flex gap-2">
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>+ Tambah Event</Button>
        <Button variant="secondary" onClick={() => setShowImport(true)}>Impor JSON</Button>
      </div>

      {showForm && (
        <EventForm
          academicYearId={activeYearId}
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); void reload(); }}
        />
      )}

      {showImport && (
        <ImportModal
          academicYearId={activeYearId}
          onClose={() => setShowImport(false)}
          onImported={(count) => {
            setShowImport(false);
            setSuccess(`${count} event berhasil diimpor.`);
            void reload();
          }}
          onError={(errs) => {
            setError(errs.join("; "));
          }}
        />
      )}

      <Card>
        <CardHeader title="Daftar Event" description={`${events.length} event untuk tahun pelajaran ${activeYearLabel}`} />
        {events.length === 0 ? (
          <EmptyState
            title="Belum ada event kalender"
            description="Impor dari JSON hasil AI, atau tambah manual."
          />
        ) : (
          <div className="space-y-2">
            {events.map((e) => (
              <div key={e.id} className="flex items-start justify-between p-3 border border-slate-200 rounded-md">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-slate-900">{e.label}</span>
                    <Badge variant={badgeForType(e.type)}>{CALENDAR_EVENT_TYPE_LABELS_ID[e.type]}</Badge>
                    {e.blocksLearning && <Badge variant="warning">blocks KBM</Badge>}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {formatLongDateID(e.startDate)} — {formatLongDateID(e.endDate)}
                  </p>
                  {e.description && <p className="text-xs text-slate-600 mt-1">{e.description}</p>}
                  <p className="text-[10px] text-slate-400 mt-1">Sumber: {e.source === "ai_import" ? "Impor AI" : "Manual"}</p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="secondary"
                    className="text-xs px-2 py-1"
                    onClick={async () => {
                      const updated = await updateCalendarEvent(e.id, {});
                      if (updated) {
                        setEditing(updated);
                        setShowForm(true);
                      }
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    className="text-xs px-2 py-1"
                    onClick={async () => {
                      if (confirm(`Hapus event "${e.label}"?`)) {
                        await deleteCalendarEvent(e.id);
                        setSuccess("Event dihapus.");
                        void reload();
                      }
                    }}
                  >
                    Hapus
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Header({ yearLabel, count }: { yearLabel?: string; count?: number }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Kalender Pendidikan</h1>
      <p className="text-sm text-slate-500 mt-1">
        {yearLabel ? `Tahun pelajaran aktif: ${yearLabel} · ${count ?? 0} event` : "Impor JSON atau tambah manual."}
      </p>
    </div>
  );
}

function badgeForType(type: CalendarEventType): "success" | "warning" | "error" | "neutral" {
  switch (type) {
    case "learning": return "success";
    case "assessment": return "warning";
    case "holiday": return "error";
    case "school_activity": return "neutral";
    case "remedial": return "warning";
    case "report": return "neutral";
    case "cocurricular": return "neutral";
  }
}

function EventForm({
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
  );
}

function ImportModal({
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
  );
}
