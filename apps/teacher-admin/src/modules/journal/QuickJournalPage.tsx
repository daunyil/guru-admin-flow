/**
 * PATCH-03: Quick Journal — jurnal 10-30 detik.
 * Sumber: docs/V0_6_2_PRODUCT_DECISIONS.md §4
 *
 * Guru cukup: Setujui & Simpan / Ganti Materi / Salin Sebelumnya
 * Tidak pakai kolom Terlambat/T di dokumen.
 *
 * PATCH-FLOW-RC1:
 *   - Tombol "Jurnal Manual" tidak palsu: ada mode Manual yang benar-benar
 *     membuat LessonSession ad-hoc (sama dengan absensi manual).
 *   - Karena session sekarang NYATA (bukan virtual ID), editor jurnal
 *     bisa menemukan session via getLessonSession.
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardHeader, Input, Textarea, Button, EmptyState, Badge, Select } from "../../shared/ui";
import { getLessonSessionsByDate, getLessonSession, findOrCreateManualSession } from "../../shared/db/lesson-session-repo";
import { findClassRoster, listClassRosters } from "../../shared/db/class-roster-repo";
import { initJournalForSessionFull, updateJournal, listJournals } from "../../shared/db/journal-repo";
import { listProtaProfiles } from "../../shared/db/prota-repo";
import { getActiveAcademicYear, getTeacherProfile, getSchoolProfile } from "../../shared/db/profile-repo";
import type { LessonSession, TeachingJournal, ProtaUnit, AcademicYear, SchoolProfile, TeacherProfile, ProtaProfile, ClassRoster } from "@guru-admin/domain";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";

type RealizationStatus = TeachingJournal["realizationStatus"];
const REALIZATION_OPTIONS: Array<{ value: RealizationStatus; label: string }> = [
  { value: "done", label: "Selesai" },
  { value: "continued", label: "Dilanjutkan" },
  { value: "cancelled", label: "Tidak Terlaksana" },
];

type JournalMode = "jadwal" | "manual";

export function QuickJournalPage() {
  const [loading, setLoading] = useState(true);
  const [year, setActiveYear] = useState<AcademicYear | null>(null);
  const [school, setSchool] = useState<SchoolProfile | undefined>();
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [date, setDate] = useState(todayISODate());
  const [sessions, setSessions] = useState<LessonSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [mode, setMode] = useState<JournalMode>("jadwal");
  const [rosters, setRosters] = useState<ClassRoster[]>([]);
  const [manualClassId, setManualClassId] = useState("");
  const [manualSubject, setManualSubject] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    void (async () => {
      const [y, sp, tp] = await Promise.all([getActiveAcademicYear(), getSchoolProfile(), getTeacherProfile()]);
      setActiveYear(y ?? null);
      setSchool(sp);
      setTeacher(tp);
      if (tp) {
        setSessions(await getLessonSessionsByDate(tp.id, date));
      }
      if (y) {
        setRosters(await listClassRosters(y.id));
      }
      const urlSessionId = searchParams.get("sessionId");
      if (urlSessionId) setSelectedSessionId(urlSessionId);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (message?.type === "error") setTimeout(() => setMessage(null), 5000);
    if (message?.type === "success") setTimeout(() => setMessage(null), 3000);
  }, [message]);

  async function reloadSessions() {
    if (!teacher) return;
    setSessions(await getLessonSessionsByDate(teacher.id, date));
  }

  useEffect(() => {
    void reloadSessions();
  }, [date]);

  async function handleStartManualJournal() {
    if (!year || !teacher) {
      setMessage({ type: "error", text: "Tahun pelajaran atau profil guru belum siap." });
      return;
    }
    const roster = rosters.find((r) => r.id === manualClassId);
    if (!roster) {
      setMessage({ type: "error", text: "Pilih kelas dulu." });
      return;
    }
    const subject = manualSubject || teacher.subjects[0]?.subject || "Manual";
    try {
      const { session } = await findOrCreateManualSession({
        mode: "manual",
        academicYear: year,
        teacherId: teacher.id,
        roster,
        subject,
        date,
      });
      setSelectedSessionId(session.id);
      // Reload sessions list agar muncul di daftar
      await reloadSessions();
      setMessage({ type: "success", text: "Sesi manual dibuat. Lanjut isi jurnal." });
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Gagal membuat sesi jurnal manual.",
      });
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;

  return (
    <div className="space-y-4">
      <div className="page-header">
        <h1 className="text-2xl font-bold text-slate-900">Jurnal Mengajar</h1>
        <p className="text-sm text-slate-500 mt-1">
          {year ? `TP ${year.label}` : ""} · {formatLongDateID(date)}
        </p>
      </div>

      {message && (
        <div className={`info-banner-${message.type === "success" ? "success" : "error"}`}>
          {message.text}
        </div>
      )}

      <Card>
        <Input label="" id="jrn-date" type="date" value={date} onChange={setDate} />
      </Card>

      {/* Mode selector */}
      <Card>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={mode === "jadwal" ? "primary" : "secondary"}
            onClick={() => { setMode("jadwal"); setSelectedSessionId(null); }}
            className="text-sm"
          >
            Dari Jadwal
          </Button>
          <Button
            variant={mode === "manual" ? "primary" : "secondary"}
            onClick={() => { setMode("manual"); setSelectedSessionId(null); }}
            className="text-sm"
          >
            Jurnal Manual
          </Button>
        </div>
      </Card>

      {/* Mode: Jadwal — list sesi yang ada */}
      {mode === "jadwal" && (
        <Card>
          <CardHeader title="Sesi Mengajar" description={`${sessions.length} sesi`} />
          {sessions.length === 0 ? (
            <EmptyState
              title="Tidak ada sesi hari ini"
              description="Pakai mode Jurnal Manual, atau buka menu Jadwal untuk generate sesi dari jadwal mengajar."
            />
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => {
                const isManual = s.teachingScheduleId === "manual" || s.teachingScheduleId === "susulan";
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSessionId(s.id)}
                    className={`w-full text-left p-3 border rounded-md ${
                      selectedSessionId === s.id ? "border-brand-400 bg-brand-50" : "border-slate-200"
                    } ${s.status === "cancelled" ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-sm">
                          {isManual ? "Manual" : `${s.startTime}–${s.endTime}`}
                        </span>
                        <span className="text-sm text-slate-700 ml-2">{s.subject}</span>
                        <Badge variant="neutral">{s.classLabel}</Badge>
                      </div>
                      {s.status === "planned" ? (
                        isManual
                          ? <Badge variant="warning">Manual</Badge>
                          : <Badge variant="success">Tersedia</Badge>
                      ) : <Badge variant="error">Batal</Badge>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Mode: Manual — form untuk buat sesi ad-hoc */}
      {mode === "manual" && (
        <Card>
          <CardHeader title="Jurnal Manual" description="Buat jurnal untuk kelas+mapel tanpa jadwal." />
          <div className="space-y-3">
            <Select
              label="Kelas"
              id="jmanual-class"
              value={manualClassId}
              onChange={setManualClassId}
              options={[
                { value: "", label: "-- Pilih Kelas --" },
                ...rosters.map((r) => ({ value: r.id, label: r.classLabel })),
              ]}
            />
            <Input
              label="Mata Pelajaran"
              id="jmanual-subject"
              value={manualSubject}
              onChange={setManualSubject}
              placeholder={teacher?.subjects[0]?.subject ?? "Pendidikan Pancasila"}
            />
            {manualClassId && (
              <Button onClick={handleStartManualJournal}>
                Mulai Jurnal Manual
              </Button>
            )}
            <p className="text-xs text-slate-500 mt-1">
              Catatan: bila absensi manual untuk kelas+mapel+tanggal yang sama sudah ada,
              sesi akan dipakai ulang (tidak dobel).
            </p>
          </div>
        </Card>
      )}

      {selectedSessionId && (
        <QuickJournalEditor
          sessionId={selectedSessionId}
          academicYearId={year?.id ?? ""}
          schoolName={school?.name ?? ""}
          teacherName={teacher?.name ?? ""}
          onSaved={(msg) => setMessage({ type: "success", text: msg })}
          onError={(msg) => setMessage({ type: "error", text: msg })}
        />
      )}
    </div>
  );
}

function QuickJournalEditor({
  sessionId,
  academicYearId,
  schoolName,
  teacherName,
  onSaved,
  onError,
}: {
  sessionId: string;
  academicYearId: string;
  schoolName: string;
  teacherName: string;
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<LessonSession | null>(null);
  const [journal, setJournal] = useState<TeachingJournal | null>(null);
  const [showDocument, setShowDocument] = useState(false);
  const [realizationStatus, setRealizationStatus] = useState<RealizationStatus>("done");
  const [actualMaterialTitle, setActualMaterialTitle] = useState("");
  const [note, setNote] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [protas, setProtas] = useState<ProtaProfile[]>([]);
  const [availableUnits, setAvailableUnits] = useState<ProtaUnit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");

  useEffect(() => {
    void (async () => {
      const sess = await getLessonSession(sessionId);
      if (!sess) { onError("Sesi tidak ditemukan"); setLoading(false); return; }
      setSession(sess);

      const roster = academicYearId ? await findClassRoster(academicYearId, sess.classId) : null;

      // Load prota for unit options
      if (academicYearId) {
        const ps = await listProtaProfiles(academicYearId); void protas;
        setProtas(ps);
        // Find units for this subject
        const matchingProta = ps.find((p) => p.subject === sess.subject);
        if (matchingProta) {
          const units = matchingProta.units.filter((u) => u.semester === sess.semester);
          setAvailableUnits(units);
        }
      }

      // Init journal
      const j = await initJournalForSessionFull({
        session: sess,
        roster: roster ?? null,
        plannedUnit: null,
      });
      if (j) {
        setJournal(j);
        setRealizationStatus(j.realizationStatus);
        setActualMaterialTitle(j.actualMaterialTitle ?? "");
        setNote(j.note ?? "");
        setFollowUp(j.followUp ?? "");
        if (j.plannedUnitId) setSelectedUnitId(j.plannedUnitId);
      }
      setLoading(false);
    })();
  }, [sessionId]);

  async function handleApproveAndSave() {
    if (!journal) return;
    try {
      const updated = await updateJournal(journal.id, {
        realizationStatus,
        actualMaterialTitle: actualMaterialTitle || undefined,
        note: note || undefined,
        followUp: followUp || undefined,
      });
      if (updated) {
        setJournal(updated);
        onSaved("Jurnal disetujui & disimpan.");
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : "Gagal menyimpan.");
    }
  }

  async function handleCopyPrevious() {
    if (!session || !journal) return;
    try {
      // Find previous journal for same class+subject
      const allJournals = await listJournals(session.academicYearId, session.semester);
      const prev = allJournals
        .filter((j) => j.classId === session.classId && j.subject === session.subject && j.date < session.date)
        .sort((a, b) => b.date.localeCompare(a.date))[0];

      if (prev) {
        setActualMaterialTitle(prev.actualMaterialTitle ?? prev.plannedMaterialTitle ?? "");
        setNote(prev.note ?? "");
        setFollowUp(prev.followUp ?? "");
        setRealizationStatus(prev.realizationStatus);
        onSaved("Disalin dari jurnal sebelumnya. Klik Setujui & Simpan.");
      } else {
        onError("Tidak ada jurnal sebelumnya untuk kelas+mapel ini.");
      }
    } catch (e) {
      onError("Gagal salin jurnal sebelumnya.");
    }
  }

  function handleUnitChange(unitId: string) {
    setSelectedUnitId(unitId);
    const unit = availableUnits.find((u) => u.id === unitId);
    if (unit) {
      setActualMaterialTitle(unit.title);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Memuat jurnal...</p>;
  if (!session || !journal) return null;

  const isLocked = journal.locked;
  const isManualSession = session.teachingScheduleId === "manual" || session.teachingScheduleId === "susulan";

  return (
    <Card>
      <CardHeader
        title={`Jurnal — ${session.classLabel}`}
        description={`${session.subject} · ${formatLongDateID(journal.date)}${isManualSession ? " · Manual" : ` · Jam ${session.startPeriod}`}`}
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        <Badge variant={isLocked ? "success" : "neutral"}>{isLocked ? "Final" : "Draft"}</Badge>
        {journal.totalStudents > 0 && (
          <Badge variant="neutral">
            H:{journal.presentCount} S:{journal.sickCount} I:{journal.excusedCount} A:{journal.absentCount}
          </Badge>
        )}
      </div>

      {/* Auto-fill info */}
      <div className="p-3 bg-slate-50 rounded-md space-y-1 text-sm mb-4">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Auto-fill (dari absensi + Prota)</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div><span className="text-slate-500">Mapel:</span> <strong>{journal.subject}</strong></div>
          <div><span className="text-slate-500">Kelas:</span> <strong>{journal.classLabel}</strong></div>
          <div><span className="text-slate-500">Tanggal:</span> <strong>{formatLongDateID(journal.date)}</strong></div>
          <div><span className="text-slate-500">Materi (Promes):</span> <strong>{journal.plannedMaterialTitle ?? "-"}</strong></div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 flex-wrap mb-4">
        <Button onClick={handleApproveAndSave} disabled={isLocked} className="bg-brand-600">
          ✓ Setujui & Simpan
        </Button>
        <Button variant="secondary" onClick={handleCopyPrevious} disabled={isLocked}>
          Salin Sebelumnya
        </Button>
        <Button variant="secondary" onClick={() => setShowDocument(!showDocument)}>
          {showDocument ? "Mode Kerja" : "Mode Dokumen"}
        </Button>
      </div>

      {/* Input fields */}
      <div className="space-y-3">
        {availableUnits.length > 0 && (
          <Select
            label="Ganti Materi (dari Prota)"
            id="jrn-unit"
            value={selectedUnitId}
            onChange={handleUnitChange}
            options={[
              { value: "", label: "-- Pakai materi Promes --" },
              ...availableUnits.map((u) => ({ value: u.id, label: `${u.title} (${u.jp} JP)` })),
            ]}
          />
        )}

        <Input
          label="Materi Aktual"
          id="jrn-material"
          value={actualMaterialTitle}
          onChange={setActualMaterialTitle}
          placeholder={journal.plannedMaterialTitle ?? "Tulis materi"}
        />

        <Select
          label="Realisasi"
          id="jrn-real"
          value={realizationStatus}
          onChange={(v) => setRealizationStatus(v as RealizationStatus)}
          options={REALIZATION_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
        />

        <Textarea
          label="Catatan (opsional)"
          id="jrn-note"
          value={note}
          onChange={setNote}
          rows={2}
          placeholder="Catatan singkat..."
        />

        <Textarea
          label="Tindak Lanjut (opsional)"
          id="jrn-followup"
          value={followUp}
          onChange={setFollowUp}
          rows={2}
          placeholder="Rencana pertemuan berikutnya..."
        />
      </div>

      {/* Mode Dokumen */}
      {showDocument && (
        <div className="print-area mt-4">
          <div className="document-page document-portrait">
            <div className="document-title">JURNAL MENGAJAR</div>
            <div className="document-subtitle">{schoolName}</div>
            <table className="document-identity">
              <tbody>
                <tr>
                  <td>Mata Pelajaran</td><td>{journal.subject}</td>
                  <td>Kelas</td><td>{journal.classLabel}</td>
                </tr>
                <tr>
                  <td>Tanggal</td><td>{formatLongDateID(journal.date)}</td>
                  <td>Jam ke</td><td>{isManualSession ? "Manual" : `${session.startPeriod} (${session.startTime}–${session.endTime})`}</td>
                </tr>
              </tbody>
            </table>
            <table className="document-table">
              <tbody>
                <tr><td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Materi</td><td>{actualMaterialTitle || journal.plannedMaterialTitle || "-"}</td></tr>
                <tr><td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Kehadiran</td><td>H: {journal.presentCount} · S: {journal.sickCount} · I: {journal.excusedCount} · A: {journal.absentCount} · Total: {journal.totalStudents}</td></tr>
                <tr><td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Realisasi</td><td>{REALIZATION_OPTIONS.find((s) => s.value === realizationStatus)?.label}</td></tr>
                <tr><td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Catatan</td><td>{note || "-"}</td></tr>
                <tr><td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Tindak Lanjut</td><td>{followUp || "-"}</td></tr>
              </tbody>
            </table>
            <div className="signature-grid">
              <div>
                <p>{schoolName.split(" ").slice(-2).join(" ")}, {formatLongDateID(journal.date)}</p>
                <p>Guru Mata Pelajaran</p>
                <div className="sig-space" />
                <p className="sig-name">{teacherName}</p>
              </div>
            </div>
          </div>
          <div className="print-toolbar">
            <Button onClick={() => window.print()}>Cetak</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
