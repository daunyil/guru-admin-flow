/**
 * Modul M07 Jurnal Otomatis — halaman /journal
 * Sumber: docs/PROJECT_CONTRACT.md §8.3
 *
 * Filosofi:
 *   - Jurnal tidak dimulai dari kosong
 *   - Auto-fill: tanggal, jam, kelas, mapel, materi dari Promes, absensi
 *   - Guru hanya pilih realisasi (Selesai/Dilanjutkan/Tidak Terlaksana) + catatan
 *   - Mode Dokumen: format jurnal sekolah, print ready
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardHeader, Input, Textarea, Button, EmptyState, Badge, Select } from "../../shared/ui";
import { getLessonSessionsByDate, getLessonSession } from "../../shared/db/lesson-session-repo";
import { findClassRoster } from "../../shared/db/class-roster-repo";
import {
  initJournalForSessionFull,
  updateJournal,
  finalizeJournal,
  unlockJournal,
} from "../../shared/db/journal-repo";
import { listProtaProfiles, getProtaProfile } from "../../shared/db/prota-repo";
import { getActiveAcademicYear, getTeacherProfile, getSchoolProfile } from "../../shared/db/profile-repo";
import type {
  LessonSession,
  TeachingJournal,
  ProtaUnit,
  AcademicYear,
  SchoolProfile,
} from "@guru-admin/domain";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";

type RealizationStatus = TeachingJournal["realizationStatus"];
const REALIZATION_STATUSES: Array<{ value: RealizationStatus; label: string; color: string }> = [
  { value: "done", label: "Selesai", color: "success" },
  { value: "continued", label: "Dilanjutkan", color: "warning" },
  { value: "cancelled", label: "Tidak Terlaksana", color: "error" },
];

export function JournalPage() {
  const [loading, setLoading] = useState(true);
  const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
  const [school, setSchool] = useState<SchoolProfile | undefined>();
  const [selectedDate, setSelectedDate] = useState(todayISODate());
  const [sessions, setSessions] = useState<LessonSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  async function reloadSessions() {
    const teacher = await getTeacherProfile();
    if (!teacher) return;
    const sess = await getLessonSessionsByDate(teacher.id, selectedDate);
    setSessions(sess);
  }

  useEffect(() => {
    void (async () => {
      const [year, sp] = await Promise.all([
        getActiveAcademicYear(),
        getSchoolProfile(),
      ]);
      setActiveYear(year ?? null);
      setSchool(sp);
      await reloadSessions();
      // Bila ada sessionId di URL, langsung pilih sesi itu
      const urlSessionId = searchParams.get("sessionId");
      if (urlSessionId) setSelectedSessionId(urlSessionId);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    void reloadSessions();
  }, [selectedDate]);

  useEffect(() => {
    if (!error && !success) return;
    const t = setTimeout(() => { setError(null); setSuccess(null); }, error ? 5000 : 3000);
    return () => clearTimeout(t);
  }, [error, success]);

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;

  if (!activeYear) {
    return (
      <div className="space-y-4">
        <Header />
        <Card><EmptyState title="Belum ada tahun pelajaran aktif" /></Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Header dateLabel={formatLongDateID(selectedDate)} sessionCount={sessions.length} />

      {error && <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-700">{error}</div>}
      {success && <div className="p-3 rounded-md bg-brand-50 border border-brand-200 text-sm text-brand-700">{success}</div>}

      <Card>
        <CardHeader title="Pilih Tanggal" />
        <Input label="" id="jrn-date" type="date" value={selectedDate} onChange={setSelectedDate} />
      </Card>

      <Card>
        <CardHeader
          title={`Sesi Mengajar — ${formatLongDateID(selectedDate)}`}
          description={`${sessions.length} sesi`}
        />
        {sessions.length === 0 ? (
          <EmptyState title="Tidak ada sesi mengajar" description="Buka menu Jadwal untuk generate sesi." />
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSessionId(s.id)}
                className={`w-full text-left p-3 border rounded-md ${
                  selectedSessionId === s.id ? "border-brand-400 bg-brand-50" : "border-slate-200"
                } ${s.status === "cancelled" ? "opacity-50" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-sm">{s.startTime}–{s.endTime}</span>
                    <span className="text-sm text-slate-700 ml-2">{s.subject}</span>
                    <Badge variant="neutral">{s.classLabel}</Badge>
                  </div>
                  <Badge variant={s.status === "planned" ? "success" : "error"}>
                    {s.status === "planned" ? "Planned" : "Cancelled"}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      {selectedSessionId && (
        <JournalEditor
          sessionId={selectedSessionId}
          academicYearId={activeYear.id}
          schoolName={school?.name ?? ""}
          onSaved={(msg) => setSuccess(msg)}
          onError={(msg) => setError(msg)}
        />
      )}
    </div>
  );
}

function Header({ dateLabel, sessionCount }: { dateLabel?: string; sessionCount?: number }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Jurnal Mengajar</h1>
      <p className="text-sm text-slate-500 mt-1">
        {dateLabel ? `${dateLabel} · ${sessionCount ?? 0} sesi` : "Auto-fill dari sesi + Prota + absensi."}
      </p>
    </div>
  );
}

function JournalEditor({
  sessionId,
  academicYearId,
  schoolName,
  onSaved,
  onError,
}: {
  sessionId: string;
  academicYearId: string;
  schoolName: string;
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<LessonSession | null>(null);
  const [journal, setJournal] = useState<TeachingJournal | null>(null);
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);

  // Form input guru
  const [realizationStatus, setRealizationStatus] = useState<RealizationStatus>("done");
  const [actualMaterialTitle, setActualMaterialTitle] = useState("");
  const [note, setNote] = useState("");
  const [followUp, setFollowUp] = useState("");

  useEffect(() => {
    void (async () => {
      const sess = await getLessonSession(sessionId);
      if (!sess) { onError("Sesi tidak ditemukan"); setLoading(false); return; }
      setSession(sess);

      const roster = await findClassRoster(academicYearId, sess.classId);

      // Cari plannedUnit dari ProtaProfile (bila plannedUnitId ada di session)
      let unit: ProtaUnit | null = null;
      if (sess.plannedUnitId) {
        const protas = await listProtaProfiles(academicYearId);
        for (const p of protas) {
          const found = p.units.find((u) => u.id === sess.plannedUnitId);
          if (found) {
            unit = found;
            const fullProfile = await getProtaProfile(p.id);
            void fullProfile; // untuk konteks
            break;
          }
        }
      }

      // Init journal (auto-fill)
      // PATCH-FLOW-RC2D: initJournalForSessionFull returns { journal, needsAttendance }
      const result = await initJournalForSessionFull({
        session: sess,
        roster: roster ?? null,
        plannedUnit: unit,
      });
      if (result) {
        const j = result.journal;
        setJournal(j);
        setRealizationStatus(j.realizationStatus);
        setActualMaterialTitle(j.actualMaterialTitle ?? "");
        setNote(j.note ?? "");
        setFollowUp(j.followUp ?? "");
      }
      setLoading(false);
    })();
  }, [sessionId]);

  async function handleSave() {
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
        onSaved("Jurnal tersimpan.");
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : "Gagal menyimpan.");
    }
  }

  async function handleFinalize() {
    if (!journal) return;
    try {
      const result = await finalizeJournal(journal.id);
      if (result.success && result.journal) {
        setJournal(result.journal);
        onSaved("Jurnal difinalisasi (locked).");
      } else {
        onError(result.errors.join("; "));
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : "Gagal finalize.");
    }
  }

  async function handleUnlock() {
    if (!journal) return;
    const updated = await unlockJournal(journal.id);
    if (updated) {
      setJournal(updated);
      onSaved("Jurnal di-unlock (kembali ke draft).");
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Memuat jurnal...</p>;
  if (!session || !journal) return null;

  const isLocked = journal.locked;

  return (
    <Card>
      <CardHeader
        title={`Jurnal — ${session.classLabel}`}
        description={`${session.subject} · ${formatLongDateID(session.date)} · Jam ke ${session.startPeriod} (${session.startTime}–${session.endTime})`}
      />

      {/* Status badges */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <Badge variant={isLocked ? "success" : "neutral"}>
          {isLocked ? "Final (Locked)" : "Draft"}
        </Badge>
        <Badge variant={session.status === "planned" ? "success" : "error"}>
          Sesi: {session.status === "planned" ? "Planned" : "Cancelled"}
        </Badge>
      </div>

      {/* Mode Kerja: input guru */}
      {!showDocumentPreview && (
        <div className="space-y-4">
          {/* Auto-fill info (read-only) */}
          <div className="p-3 bg-slate-50 rounded-md space-y-1 text-sm">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Auto-fill (read-only)</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-slate-500">Mapel:</span> <strong>{journal.subject}</strong></div>
              <div><span className="text-slate-500">Kelas:</span> <strong>{journal.classLabel}</strong></div>
              <div><span className="text-slate-500">Tanggal:</span> <strong>{formatLongDateID(journal.date)}</strong></div>
              <div><span className="text-slate-500">Semester:</span> <strong>{journal.semester}</strong></div>
              <div><span className="text-slate-500">Materi (Promes):</span> <strong>{journal.plannedMaterialTitle ?? "(belum di-assign)"}</strong></div>
              <div><span className="text-slate-500">Tujuan Pembelajaran:</span> <strong>{journal.plannedLearningOutcome ?? "-"}</strong></div>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-2 pt-2 border-t border-slate-200 text-xs">
              <div><span className="text-slate-500">Hadir:</span> <strong className="text-brand-700">{journal.presentCount}</strong></div>
              <div><span className="text-slate-500">Sakit:</span> <strong className="text-amber-700">{journal.sickCount}</strong></div>
              <div><span className="text-slate-500">Izin:</span> <strong>{journal.excusedCount}</strong></div>
              <div><span className="text-slate-500">Alpa:</span> <strong className="text-rose-700">{journal.absentCount}</strong></div>
            </div>
            <p className="text-xs text-slate-400 mt-1">Total: {journal.totalStudents} siswa</p>
          </div>

          {/* Input guru */}
          <Select
            label="Status Realisasi"
            id="jrn-real"
            value={realizationStatus}
            onChange={(v) => setRealizationStatus(v as RealizationStatus)}
            options={REALIZATION_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
          />

          <Input
            label="Materi Aktual (bila berbeda dari rencana)"
            id="jrn-actual"
            value={actualMaterialTitle}
            onChange={setActualMaterialTitle}
            placeholder={journal.plannedMaterialTitle ?? "Tulis materi yang sebenarnya diajar"}
            hint="Kosongkan bila sama dengan rencana"
          />

          <Textarea
            label="Catatan"
            id="jrn-note"
            value={note}
            onChange={setNote}
            rows={3}
            placeholder="Catatan pelaksanaan pembelajaran..."
          />

          <Textarea
            label="Tindak Lanjut"
            id="jrn-followup"
            value={followUp}
            onChange={setFollowUp}
            rows={2}
            placeholder="Rencana tindak lanjut untuk pertemuan berikutnya..."
          />

          <div className="flex gap-2 flex-wrap no-print">
            <Button onClick={handleSave} disabled={isLocked}>Simpan</Button>
            <Button variant="secondary" onClick={() => setShowDocumentPreview(true)}>Mode Dokumen</Button>
            {!isLocked && (
              <Button variant="secondary" onClick={handleFinalize}>Finalisasi (Lock)</Button>
            )}
            {isLocked && (
              <Button variant="danger" onClick={handleUnlock}>Unlock</Button>
            )}
          </div>
        </div>
      )}

      {/* Mode Dokumen: format jurnal sekolah, print ready */}
      {showDocumentPreview && (
        <>
          <div className="print-area">
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
                    <td>Jam ke</td><td>{session.startPeriod} ({session.startTime}–{session.endTime})</td>
                  </tr>
                  <tr>
                    <td>Semester</td><td>{journal.semester === 1 ? "Ganjil" : "Genap"}</td>
                    <td>Tahun Pelajaran</td><td>{activeYearLabel(journal)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="document-section-title">A. MATERI PEMBELAJARAN</div>
              <table className="document-table">
                <tbody>
                  <tr>
                    <td style={{ width: "30%", fontWeight: "bold", background: "#f5f5f5" }}>Materi (Rencana)</td>
                    <td>{journal.plannedMaterialTitle ?? "-"}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Materi (Realisasi)</td>
                    <td>{actualMaterialTitle || journal.plannedMaterialTitle || "-"}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Tujuan Pembelajaran</td>
                    <td>{journal.plannedLearningOutcome ?? "-"}</td>
                  </tr>
                </tbody>
              </table>

              <div className="document-section-title">B. KEHADIRAN SISWA</div>
              <table className="document-table">
                <thead>
                  <tr>
                    <th>Hadir</th><th>Sakit</th><th>Izin</th><th>Terlambat</th><th>Alpa</th><th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="text-center">{journal.presentCount}</td>
                    <td className="text-center">{journal.sickCount}</td>
                    <td className="text-center">{journal.excusedCount}</td>
                    <td className="text-center">{journal.lateCount ?? 0}</td>
                    <td className="text-center">{journal.absentCount}</td>
                    <td className="text-center">{journal.totalStudents}</td>
                  </tr>
                </tbody>
              </table>

              <div className="document-section-title">C. REALISASI PEMBELAJARAN</div>
              <table className="document-table">
                <tbody>
                  <tr>
                    <td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Status</td>
                    <td>{REALIZATION_STATUSES.find((s) => s.value === realizationStatus)?.label ?? "-"}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: "bold", background: "#f5f5f5", verticalAlign: "top" }}>Catatan</td>
                    <td>{note || "-"}</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: "bold", background: "#f5f5f5", verticalAlign: "top" }}>Tindak Lanjut</td>
                    <td>{followUp || "-"}</td>
                  </tr>
                </tbody>
              </table>

              <div className="signature-grid">
                <div>
                  <p>Mengetahui,</p>
                  <p>Kepala Sekolah</p>
                  <div className="sig-space" />
                  <p className="sig-name">(...........................)</p>
                  <p>NIP. .....................</p>
                </div>
                <div>
                  <p>{schoolName.split(" ").slice(-2).join(" ")}, {formatLongDateID(journal.date).split(",")[1]?.trim()}</p>
                  <p>Guru Mata Pelajaran</p>
                  <div className="sig-space" />
                  <p className="sig-name">(...........................)</p>
                  <p>NIP. .....................</p>
                </div>
              </div>
            </div>
          </div>

          <div className="print-toolbar">
            <Button variant="secondary" onClick={() => setShowDocumentPreview(false)}>Mode Kerja</Button>
            <Button onClick={() => window.print()}>Cetak</Button>
            {!isLocked && (
              <Button onClick={handleSave} disabled={isLocked}>Simpan</Button>
            )}
          </div>
        </>
      )}
    </Card>
  );
}

function activeYearLabel(journal: TeachingJournal): string {
  // Simplified — actual year label bisa diambil dari academicYear repo bila perlu
  void journal;
  return "2025/2026";
}
