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

import { Card, CardHeader, Select, Button, EmptyState, Badge, LoadingState } from "../../shared/ui";
import { Link } from "react-router-dom";
import { DAY_LABELS_ID, formatLongDateID } from "@guru-admin/shared";
import { useScheduleState } from "./useScheduleState";
import { Header } from "./Header";
import { ScheduleForm } from "./ScheduleForm";
import { ImportModal } from "./ImportModal";
import { LinkerSection } from "./LinkerSection";

export function SchedulePage() {
  const {
    loading,
    activeYear,
    schedules,
    sessions,
    semester,
    showForm,
    showImport,
    editing,
    generating,
    error,
    success,
    setSemester,
    openAddForm,
    openEditForm,
    closeForm,
    openImport,
    closeImport,
    onImported,
    onImportError,
    onFormSaved,
    onLinkerError,
    onLinkerSuccess,
    onDeleteSchedule,
    onGenerate,
    onClearSessions,
  } = useScheduleState();

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <Header yearLabel={activeYear?.label} scheduleCount={schedules.length} sessionCount={sessions.length} />

      {!activeYear && (
        <Card className="border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <span className="text-amber-600 text-xl">⚠</span>
            <div>
              <p className="font-semibold text-amber-900">Belum ada tahun pelajaran aktif</p>
              <p className="text-sm text-amber-800 mt-1">Lengkapi tahun pelajaran terlebih dahulu agar bisa mengelola jadwal.</p>
              <Link to="/profile"><Button variant="secondary" className="text-sm mt-2">Lengkapi Profil</Button></Link>
            </div>
          </div>
        </Card>
      )}

      {error && <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-700" role="status" aria-live="polite">{error}</div>}
      {success && <div className="p-3 rounded-md bg-brand-50 border border-brand-200 text-sm text-brand-700" role="status" aria-live="polite">{success}</div>}

      <div className="flex items-center gap-2 flex-wrap">
        <Select
          label=""
          id="sem-filter"
          value={String(semester)}
          onChange={(v) => setSemester(Number(v) as 1 | 2)}
          options={[{value:"1",label:"Semester 1"},{value:"2",label:"Semester 2"}]}
        />
        <Button onClick={openAddForm} disabled={!activeYear}>+ Tambah Jadwal</Button>
        <Button variant="secondary" onClick={openImport} disabled={!activeYear}>Impor dari Smart Roster</Button>
      </div>

      {showForm && activeYear && (
        <ScheduleForm
          academicYearId={activeYear.id}
          semester={semester}
          editing={editing}
          onClose={closeForm}
          onSaved={onFormSaved}
        />
      )}

      {showImport && activeYear && (
        <ImportModal
          academicYearId={activeYear.id}
          onClose={closeImport}
          onImported={onImported}
          onError={onImportError}
        />
      )}

      <Card>
        <CardHeader
          title={`Daftar Jadwal Semester ${semester}`}
          description={`${schedules.length} jadwal untuk tahun pelajaran ${activeYear?.label ?? "-"}`}
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
                    onClick={() => openEditForm(s)}
                  >Edit</Button>
                  <Button variant="danger" className="text-xs px-2 py-1"
                    onClick={() => onDeleteSchedule(s)}
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
            onClick={onGenerate}
            disabled={generating || schedules.length === 0 || !activeYear}
          >
            {generating ? "Generating..." : `Generate Sesi Semester ${semester}`}
          </Button>
          <Button
            variant="secondary"
            onClick={onClearSessions}
          >
            Hapus Sesi Semester {semester}
          </Button>
        </div>
      </Card>

      {/* Sprint 5: Linker Promes-Lesson — assign plannedUnitId massal */}
      {activeYear && (
        <LinkerSection
          academicYearId={activeYear.id}
          semester={semester}
          onError={onLinkerError}
          onSuccess={onLinkerSuccess}
        />
      )}

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
