/**
 * Modul M05 Jadwal Guru — halaman /schedule
 * Sumber: docs/PROJECT_CONTRACT.md §4.1 (M05), docs/DATA_MODEL_DRAFT.md §6
 *
 * Fitur:
 *   - List TeachingSchedule per semester
 *   - Form tambah/edit jadwal manual
 *   - Impor JSON dari Smart Roster (guru-admin-flow/schedule/v1)
 *   - Generate LessonSession dari jadwal + kalender (trigger ke lesson-session-repo)
 *   - Lihat sesi yang sudah di-generate
 */

import { useEffect, useState } from "react";
import { Card, CardHeader, Input, Select, Button, EmptyState, Badge } from "../../shared/ui";
import {
  listTeachingSchedules,
  saveTeachingSchedule,
  updateTeachingSchedule,
  deleteTeachingSchedule,
  importScheduleFromJSON,
} from "../../shared/db/teaching-schedule-repo";
import {
  generateAndSaveLessonSessions,
  listLessonSessions,
  clearLessonSessions,
  applyPromesLink,
} from "../../shared/db/lesson-session-repo";
import { listCalendarEvents } from "../../shared/db/calendar-repo";
import { listProtaProfiles } from "../../shared/db/prota-repo";
import { getActiveAcademicYear, getTeacherProfile } from "../../shared/db/profile-repo";
import type { TeachingSchedule, LessonSession, AcademicYear, ProtaUnit } from "@guru-admin/domain";
import { linkPromesToLessons } from "@guru-admin/domain";
import { DAY_LABELS_ID, formatLongDateID, DEFAULT_CADANGAN_JP } from "@guru-admin/shared";

export function SchedulePage() {
  const [loading, setLoading] = useState(true);
  const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
  const [schedules, setSchedules] = useState<TeachingSchedule[]>([]);
  const [sessions, setSessions] = useState<LessonSession[]>([]);
  const [semester, setSemester] = useState<1 | 2>(1);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState<TeachingSchedule | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function reload() {
    if (!activeYear) return;
    const [scheds, sess] = await Promise.all([
      listTeachingSchedules(activeYear.id),
      listLessonSessions(activeYear.id, semester),
    ]);
    setSchedules(scheds.filter((s) => s.semester === semester));
    setSessions(sess);
  }

  useEffect(() => {
    void (async () => {
      const year = await getActiveAcademicYear();
      if (year) {
        setActiveYear(year);
        const [scheds, sess] = await Promise.all([
          listTeachingSchedules(year.id),
          listLessonSessions(year.id, semester),
        ]);
        setSchedules(scheds.filter((s) => s.semester === semester));
        setSessions(sess);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (activeYear) void reload();
  }, [semester]);

  useEffect(() => {
    if (error) setTimeout(() => setError(null), 5000);
    if (success) setTimeout(() => setSuccess(null), 3000);
  }, [error, success]);

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;

  if (!activeYear) {
    return (
      <div className="space-y-4">
        <Header />
        <Card>
          <EmptyState
            title="Belum ada tahun pelajaran aktif"
            description="Buat tahun pelajaran aktif dulu di menu Profil."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Header yearLabel={activeYear.label} scheduleCount={schedules.length} sessionCount={sessions.length} />

      {error && <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-700">{error}</div>}
      {success && <div className="p-3 rounded-md bg-brand-50 border border-brand-200 text-sm text-brand-700">{success}</div>}

      <div className="flex items-center gap-2 flex-wrap">
        <Select
          label=""
          id="sem-filter"
          value={String(semester)}
          onChange={(v) => setSemester(Number(v) as 1 | 2)}
          options={[{value:"1",label:"Semester 1"},{value:"2",label:"Semester 2"}]}
        />
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>+ Tambah Jadwal</Button>
        <Button variant="secondary" onClick={() => setShowImport(true)}>Impor dari Smart Roster</Button>
      </div>

      {showForm && (
        <ScheduleForm
          academicYearId={activeYear.id}
          semester={semester}
          editing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); void reload(); }}
        />
      )}

      {showImport && (
        <ImportModal
          academicYearId={activeYear.id}
          onClose={() => setShowImport(false)}
          onImported={(count) => {
            setShowImport(false);
            setSuccess(`${count} jadwal berhasil diimpor.`);
            void reload();
          }}
          onError={(errs) => setError(errs.join("; "))}
        />
      )}

      <Card>
        <CardHeader
          title={`Daftar Jadwal Semester ${semester}`}
          description={`${schedules.length} jadwal untuk tahun pelajaran ${activeYear.label}`}
        />
        {schedules.length === 0 ? (
          <EmptyState
            title="Belum ada jadwal"
            description="Tambah manual atau impor dari Smart Roster."
          />
        ) : (
          <div className="space-y-2">
            {schedules.map((s) => (
              <div key={s.id} className="flex items-start justify-between p-3 border border-slate-200 rounded-md">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-slate-900">{s.subject}</span>
                    <Badge variant="neutral">{s.classLabel}</Badge>
                    <Badge variant="success">{DAY_LABELS_ID[s.dayOfWeek]}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Jam ke {s.startPeriod} ({s.startTime}–{s.endTime}) · {s.durationJP} JP · Sumber: {s.source === "smart_roster_import" ? "Smart Roster" : "Manual"}
                  </p>
                  {s.notes && <p className="text-xs text-slate-600 mt-1">{s.notes}</p>}
                </div>
                <div className="flex gap-1">
                  <Button variant="secondary" className="text-xs px-2 py-1"
                    onClick={() => { setEditing(s); setShowForm(true); }}
                  >Edit</Button>
                  <Button variant="danger" className="text-xs px-2 py-1"
                    onClick={async () => {
                      if (confirm(`Hapus jadwal ${s.subject} - ${s.classLabel}?`)) {
                        await deleteTeachingSchedule(s.id);
                        setSuccess("Jadwal dihapus.");
                        void reload();
                      }
                    }}
                  >Hapus</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Generate Sesi Mengajar"
          description="Buat LessonSession dari jadwal + kalender untuk satu semester. Sesi lama akan diganti."
        />
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            onClick={async () => {
              setGenerating(true);
              setError(null);
              try {
                const teacher = await getTeacherProfile();
                if (!teacher) throw new Error("Profil guru belum diisi.");
                const calendar = await listCalendarEvents(activeYear.id);
                const allSchedules = await listTeachingSchedules(activeYear.id);
                const semSchedules = allSchedules.filter((s) => s.semester === semester);
                if (semSchedules.length === 0) {
                  throw new Error(`Tidak ada jadwal untuk semester ${semester}. Tambahkan jadwal dulu.`);
                }
                const result = await generateAndSaveLessonSessions({
                  academicYear: activeYear,
                  schedules: semSchedules,
                  calendar,
                  semester,
                  teacherId: teacher.id,
                });
                if (result.success && result.summary) {
                  setSuccess(
                    `${result.summary.totalSessions} sesi di-generate (${result.summary.plannedSessions} planned, ${result.summary.cancelledSessions} cancelled).`
                  );
                  void reload();
                } else {
                  setError(result.errors.join("; ") || "Gagal generate sesi.");
                }
              } catch (e) {
                setError(e instanceof Error ? e.message : "Gagal generate sesi.");
              } finally {
                setGenerating(false);
              }
            }}
            disabled={generating || schedules.length === 0}
          >
            {generating ? "Generating..." : `Generate Sesi Semester ${semester}`}
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              if (confirm(`Hapus semua sesi semester ${semester}?`)) {
                await clearLessonSessions(activeYear.id, semester);
                setSuccess("Sesi dihapus.");
                void reload();
              }
            }}
          >
            Hapus Sesi Semester {semester}
          </Button>
        </div>
      </Card>

      {/* Sprint 5: Linker Promes-Lesson — assign plannedUnitId massal */}
      <LinkerSection
        academicYearId={activeYear.id}
        semester={semester}
        onError={(msg) => setError(msg)}
        onSuccess={(msg) => { setSuccess(msg); void reload(); }}
      />

      {sessions.length > 0 && (
        <Card>
          <CardHeader
            title={`Sesi Mengajar Semester ${semester}`}
            description={`${sessions.length} sesi (planned: ${sessions.filter((s) => s.status === "planned").length}, cancelled: ${sessions.filter((s) => s.status === "cancelled").length})`}
          />
          <div className="max-h-96 overflow-y-auto space-y-1">
            {sessions.slice(0, 100).map((s) => (
              <div key={s.id} className="flex items-center justify-between p-2 text-xs border border-slate-100 rounded">
                <div>
                  <span className="font-medium">{formatLongDateID(s.date).split(",")[0]},</span>{" "}
                  <span>{s.date}</span> · {s.startTime}–{s.endTime} ·{" "}
                  <span className="font-medium">{s.subject}</span> · {s.classLabel}
                </div>
                <Badge variant={s.status === "planned" ? "success" : "error"}>
                  {s.status === "planned" ? "Planned" : "Cancelled"}
                </Badge>
              </div>
            ))}
            {sessions.length > 100 && (
              <p className="text-xs text-slate-400 text-center pt-2">... dan {sessions.length - 100} sesi lainnya</p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

function Header({
  yearLabel,
  scheduleCount,
  sessionCount,
}: {
  yearLabel?: string;
  scheduleCount?: number;
  sessionCount?: number;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Jadwal Guru</h1>
      <p className="text-sm text-slate-500 mt-1">
        {yearLabel
          ? `Tahun pelajaran: ${yearLabel} · ${scheduleCount ?? 0} jadwal · ${sessionCount ?? 0} sesi`
          : "Input manual atau impor dari Smart Roster."}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Schedule Form                                                      */
/* ------------------------------------------------------------------ */

function ScheduleForm({
  academicYearId,
  semester,
  editing,
  onClose,
  onSaved,
}: {
  academicYearId: string;
  semester: 1 | 2;
  editing: TeachingSchedule | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    subject: editing?.subject ?? "",
    classId: editing?.classId ?? "",
    classLabel: editing?.classLabel ?? "",
    dayOfWeek: editing?.dayOfWeek ?? 1,
    startPeriod: editing?.startPeriod ?? 1,
    durationJP: editing?.durationJP ?? 2,
    startTime: editing?.startTime ?? "07:00",
    endTime: editing?.endTime ?? "08:20",
    notes: editing?.notes ?? "",
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const teacher = await getTeacherProfile();
      if (!teacher) throw new Error("Profil guru belum diisi.");
      if (form.startTime >= form.endTime) throw new Error("startTime wajib < endTime");
      const data = {
        academicYearId,
        teacherId: teacher.id,
        subject: form.subject,
        classId: form.classId || form.classLabel,
        classLabel: form.classLabel,
        dayOfWeek: Number(form.dayOfWeek),
        startPeriod: Number(form.startPeriod),
        durationJP: Number(form.durationJP),
        startTime: form.startTime,
        endTime: form.endTime,
        semester,
        source: "manual" as const,
        notes: form.notes || undefined,
      };
      if (editing) {
        await updateTeachingSchedule(editing.id, data);
      } else {
        await saveTeachingSchedule(data);
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan jadwal.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title={editing ? "Edit Jadwal" : "Tambah Jadwal"} />
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Mapel" id="sc-subject" required value={form.subject} onChange={(v) => set("subject", v)} placeholder="Pendidikan Pancasila" />
          <Input label="Kelas (label)" id="sc-class" required value={form.classLabel} onChange={(v) => set("classLabel", v)} placeholder="VII A" />
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <Select label="Hari" id="sc-day" value={String(form.dayOfWeek)} onChange={(v) => set("dayOfWeek", Number(v))}
            options={[1,2,3,4,5,6,7].map((d) => ({ value: String(d), label: DAY_LABELS_ID[d] }))} />
          <Input label="Jam ke (mulai)" id="sc-period" type="number" value={String(form.startPeriod)} onChange={(v) => set("startPeriod", Number(v))} />
          <Input label="Durasi (JP)" id="sc-dur" type="number" value={String(form.durationJP)} onChange={(v) => set("durationJP", Number(v))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Mulai (HH:mm)" id="sc-start" value={form.startTime} onChange={(v) => set("startTime", v)} placeholder="07:00" />
          <Input label="Selesai (HH:mm)" id="sc-end" value={form.endTime} onChange={(v) => set("endTime", v)} placeholder="08:20" />
        </div>
        <Input label="Catatan (opsional)" id="sc-notes" value={form.notes} onChange={(v) => set("notes", v)} />
        {error && <div className="p-2 rounded bg-rose-50 border border-rose-200 text-xs text-rose-700">{error}</div>}
        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Batal</Button>
        </div>
      </form>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Import Modal                                                       */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Sprint 5: Linker Promes-Lesson — assign plannedUnitId massal     */
/* ------------------------------------------------------------------ */

function LinkerSection({
  academicYearId,
  semester,
  onError,
  onSuccess,
}: {
  academicYearId: string;
  semester: 1 | 2;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}) {
  const [linking, setLinking] = useState(false);
  const [protas, setProtas] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedProtaId, setSelectedProtaId] = useState("");
  const [cadanganJP, setCadanganJP] = useState(DEFAULT_CADANGAN_JP);

  useEffect(() => {
    void (async () => {
      const ps = await listProtaProfiles(academicYearId);
      const options = ps.map((p) => ({ id: p.id, label: `${p.subject} — ${p.grade}` }));
      setProtas(options);
      if (options.length > 0) setSelectedProtaId(options[0].id);
    })();
  }, [academicYearId]);

  async function handleLink() {
    if (!selectedProtaId) {
      onError("Pilih Prota dulu.");
      return;
    }
    setLinking(true);
    try {
      // Load prota + sessions
      const allProtas = await listProtaProfiles(academicYearId);
      const prota = allProtas.find((p) => p.id === selectedProtaId);
      if (!prota) throw new Error("Prota tidak ditemukan");

      const semesterUnits = prota.units.filter((u) => u.semester === semester);
      if (semesterUnits.length === 0) {
        throw new Error(`Tidak ada unit Prota untuk semester ${semester}`);
      }

      const allSessions = await listLessonSessions(academicYearId, semester);
      if (allSessions.length === 0) {
        throw new Error("Belum ada sesi. Generate sesi dulu.");
      }

      // Run linker pure function
      const result = linkPromesToLessons({
        sessions: allSessions,
        units: semesterUnits as ProtaUnit[],
        cadanganJP,
        reserveFromEnd: true,
      });

      if (result.errors.length > 0) {
        onError(result.errors.join("; "));
        setLinking(false);
        return;
      }

      // Apply ke Dexie: update plannedUnitId per session
      const linkedUpdates = result.linkedSessions.map((s) => ({
        id: s.id,
        plannedUnitId: s.plannedUnitId ?? null,
      }));
      await applyPromesLink(linkedUpdates);

      const msg = `${result.summary.distributedJP} JP materi terdistribusi ke ${result.linkedSessions.filter((s) => s.plannedUnitId).length} sesi. ` +
        `${result.summary.cadanganSessions} sesi cadangan. ` +
        `Status: ${result.summary.allocationStatus}.`;
      onSuccess(msg);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Gagal link.");
    } finally {
      setLinking(false);
    }
  }

  if (protas.length === 0) return null;

  return (
    <Card>
      <CardHeader
        title="Link Promes-Lesson (Assign Materi ke Sesi)"
        description="Distribusikan ProtaUnit ke LessonSession secara massal. Cadangan dari intra capacity (sesuai §0 CRITICAL PROMES RULE)."
      />
      <div className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <Select
            label="Prota (Mapel - Kelas)"
            id="link-prota"
            value={selectedProtaId}
            onChange={setSelectedProtaId}
            options={protas.map((p) => ({ value: p.id, label: p.label }))}
          />
          <Input
            label="Cadangan (JP, dari intra)"
            id="link-cad"
            type="number"
            value={String(cadanganJP)}
            onChange={(v) => setCadanganJP(Number(v) || 0)}
            hint="Default 6 JP. Di-reserve dari sesi terakhir."
          />
        </div>
        <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800">
          ℹ️ Linker akan meng-assign plannedUnitId ke setiap sesi planned. Sesi cancelled tidak dialokasikan.
          Sesi yang sudah punya plannedUnitId akan di-overwrite.
        </div>
        <Button onClick={handleLink} disabled={linking || !selectedProtaId}>
          {linking ? "Linking..." : "Link Materi ke Sesi"}
        </Button>
      </div>
    </Card>
  );
}
