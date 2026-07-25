/**
 * QuickJournalEditor — sub-component for editing a single session journal.
 * WYSIWYG-DOC-FASE9: no showDocument toggle, no PrintExportButtons.
 * JOURNAL-REVIEW-NARRATIVE-03: structured input (chip quick choices) + narrative preview.
 */

import { useEffect, useMemo, useState } from "react";
import { Input, Textarea, Button, Badge, Select, Card, EmptyState, LoadingState } from "@shared/ui";
import { getLessonSession } from "@shared/db/lesson-session-repo";
import {
  initJournalForSessionFull,
  updateJournal,
  finalizeJournal,
  unlockJournal,
  listJournals,
} from "@shared/db/journal-repo";
import { findClassRoster } from "@shared/db/class-roster-repo";
import { listProtaProfiles } from "@shared/db/prota-repo";
import type { LessonSession, TeachingJournal, ProtaUnit } from "@guru-admin/domain";
import {
  buildJournalNarrative,
  canFinalizeJournal,
  packStructuredNote,
  unpackStructuredNote,
  JOURNAL_ACTIVITY_CHOICES,
  JOURNAL_RESPONSE_CHOICES,
  JOURNAL_OBSTACLE_CHOICES,
  JOURNAL_FOLLOWUP_CHOICES,
} from "@guru-admin/domain";
import { formatLongDateID } from "@guru-admin/shared";
import { RealizationStatus, REALIZATION_OPTIONS } from "./quickJournalTypes";

export function QuickJournalEditor({
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
  const [needsAttendance, setNeedsAttendance] = useState(false);

  // JOURNAL-REVIEW-NARRATIVE-03 §4: review state
  const [reviewOpened, setReviewOpened] = useState(false);

  // Realization + material + followUp (existing schema fields)
  const [realizationStatus, setRealizationStatus] = useState<RealizationStatus>("done");
  const [actualMaterialTitle, setActualMaterialTitle] = useState("");
  const [followUp, setFollowUp] = useState("");

  // JOURNAL-REVIEW-NARRATIVE-03 §5: structured input (stored as JSON in `note`)
  const [activities, setActivities] = useState<string[]>([]);
  const [studentResponse, setStudentResponse] = useState("");
  const [obstacle, setObstacle] = useState("");
  const [freeNote, setFreeNote] = useState("");

  const [availableUnits, setAvailableUnits] = useState<ProtaUnit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");

  // Helper: reset reviewOpened saat input berubah (spec §4: "Jika isi jurnal berubah setelah review, reviewOpened kembali false.")
  function invalidateReview() {
    setReviewOpened(false);
  }

  // Wrapped setters that invalidate review
  function setActualMaterial(v: string) { setActualMaterialTitle(v); invalidateReview(); }
  function setActivitiesList(v: string[]) { setActivities(v); invalidateReview(); }
  function setResponse(v: string) { setStudentResponse(v); invalidateReview(); }
  function setObstacleVal(v: string) { setObstacle(v); invalidateReview(); }
  function setFreeNoteVal(v: string) { setFreeNote(v); invalidateReview(); }
  function setFollowUpVal(v: string) { setFollowUp(v); invalidateReview(); }
  function setRealization(v: RealizationStatus) { setRealizationStatus(v); invalidateReview(); }

  useEffect(() => {
    void (async () => {
      try {
        const sess = await getLessonSession(sessionId);
        if (!sess) { onError("Sesi tidak ditemukan"); setLoading(false); return; }
        setSession(sess);

        const roster = academicYearId ? await findClassRoster(academicYearId, sess.classId) : null;

        if (academicYearId) {
          const ps = await listProtaProfiles(academicYearId);
          const matchingProta = ps.find((p) => p.subject === sess.subject);
          if (matchingProta) {
            const units = matchingProta.units.filter((u) => u.semester === sess.semester);
            setAvailableUnits(units);
          }
        }

        // PATCH-FLOW-RC2D: jangan auto-create absensi
        const result = await initJournalForSessionFull({
          session: sess,
          roster: roster ?? null,
          plannedUnit: null,
        });
        if (result) {
          setJournal(result.journal);
          setNeedsAttendance(result.needsAttendance);
          setRealizationStatus(result.journal.realizationStatus);
          setActualMaterialTitle(result.journal.actualMaterialTitle ?? "");
          setFollowUp(result.journal.followUp ?? "");
          // JOURNAL-REVIEW-NARRATIVE-03: unpack structured note
          const structured = unpackStructuredNote(result.journal.note);
          setActivities(structured.activities);
          setStudentResponse(structured.studentResponse);
          setObstacle(structured.obstacle);
          setFreeNote(structured.freeNote);
          if (result.journal.plannedUnitId) setSelectedUnitId(result.journal.plannedUnitId);
          // Review dimulai tertutup. Bila jurnal sudah final, anggap review sudah dilakukan.
          setReviewOpened(result.journal.locked);
        }
      } catch (err) {
        console.error("[QuickJournalEditor] Gagal memuat jurnal:", err);
        onError(err instanceof Error ? err.message : "Gagal memuat jurnal.");
      } finally {
        setLoading(false);
      }
    })();
  // RELEASE-FIXPACK-P1-P2-01: tambah academicYearId ke deps untuk hindari stale closure
  }, [sessionId, academicYearId]);

  // JOURNAL-REVIEW-NARRATIVE-03 §6: build narrative on-the-fly for preview/print
  const narrative = useMemo(
    () => buildJournalNarrative({
      material: actualMaterialTitle || journal?.plannedMaterialTitle || "",
      activities,
      studentResponse,
      obstacle,
      followUp,
      freeNote,
    }),
    [actualMaterialTitle, journal, activities, studentResponse, obstacle, followUp, freeNote],
  );

  // JOURNAL-REVIEW-NARRATIVE-03 §4: tombol final aktif hanya bila canFinalizeJournal.ok
  const finalizeCheck = canFinalizeJournal({
    material: actualMaterialTitle || journal?.plannedMaterialTitle || "",
    activities,
    reviewOpened,
  });

  async function handleSaveDraft() {
    if (!journal) return;
    try {
      const structuredNote = packStructuredNote({ activities, studentResponse, obstacle, freeNote });
      const updated = await updateJournal(journal.id, {
        realizationStatus,
        actualMaterialTitle: actualMaterialTitle || undefined,
        note: structuredNote,
        followUp: followUp || undefined,
      });
      if (updated) {
        setJournal(updated);
        onSaved("Draft jurnal tersimpan.");
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : "Gagal menyimpan.");
    }
  }

  // JOURNAL-REVIEW-NARRATIVE-03: Setujui & Finalkan = review + finalize
  async function handleApproveAndFinalize() {
    if (!journal) return;
    // Spec §4: validasi final wajib review dibuka
    if (!finalizeCheck.ok) {
      // RELEASE-FIXPACK-P1-P2-01: jangan panggil onError dengan string kosong.
      // Hanya panggil onError bila ada pesan error yang jelas.
      onError(finalizeCheck.message);
      return;
    }
    try {
      const structuredNote = packStructuredNote({ activities, studentResponse, obstacle, freeNote });
      // Simpan input dulu
      const updated = await updateJournal(journal.id, {
        realizationStatus,
        actualMaterialTitle: actualMaterialTitle || undefined,
        note: structuredNote,
        followUp: followUp || undefined,
      });
      if (!updated) {
        onError("Gagal menyimpan input.");
        return;
      }
      // Lalu finalize (lock)
      const result = await finalizeJournal(updated.id);
      if (result.success && result.journal) {
        setJournal(result.journal);
        onSaved("Jurnal disetujui & difinalkan (terkunci).");
      } else {
        onError(result.errors.join(", ") || "Gagal finalisasi jurnal.");
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : "Gagal finalisasi.");
    }
  }

  async function handleUnlock() {
    if (!journal) return;
    try {
      const unlocked = await unlockJournal(journal.id);
      if (unlocked) {
        setJournal(unlocked);
        setReviewOpened(false); // reset review saat buka revisi
        onSaved("Jurnal dibuka kembali (draft).");
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : "Gagal unlock.");
    }
  }

  async function handleCopyPrevious() {
    if (!session || !journal) return;
    try {
      const allJournals = await listJournals(session.academicYearId, session.semester);
      const prev = allJournals
        .filter(
          (j) =>
            j.classId === session.classId &&
            j.subject === session.subject &&
            j.date < session.date
        )
        .sort((a, b) => b.date.localeCompare(a.date))[0];

      if (prev) {
        setActualMaterialTitle(prev.actualMaterialTitle ?? prev.plannedMaterialTitle ?? "");
        const structured = unpackStructuredNote(prev.note);
        setActivities(structured.activities);
        setStudentResponse(structured.studentResponse);
        setObstacle(structured.obstacle);
        setFreeNote(structured.freeNote);
        setFollowUp(prev.followUp ?? "");
        setRealizationStatus(prev.realizationStatus);
        invalidateReview();
        onSaved("Disalin dari jurnal sebelumnya. Buka review lalu Setujui & Finalkan.");
      } else {
        onError("Tidak ada jurnal sebelumnya untuk kelas+mapel ini.");
      }
    } catch (e) {
      console.error("[QuickJournalEditor] Gagal salin jurnal sebelumnya:", e);
      onError("Gagal salin jurnal sebelumnya.");
    }
  }

  function handleUnitChange(unitId: string) {
    setSelectedUnitId(unitId);
    const unit = availableUnits.find((u) => u.id === unitId);
    if (unit) {
      setActualMaterial(unit.title);
    }
  }

  // Toggle activity chip
  function toggleActivity(activity: string) {
    if (activities.includes(activity)) {
      setActivitiesList(activities.filter((a) => a !== activity));
    } else {
      setActivitiesList([...activities, activity]);
    }
  }

  if (loading) return <LoadingState message="Memuat jurnal..." />;
  if (!session || !journal) {
    return (
      <Card>
        <EmptyState
          title="Jurnal tidak tersedia"
          description="Sesi tidak ditemukan atau jurnal gagal dimuat. Coba pilih sesi lain."
        />
      </Card>
    );
  }

  const isLocked = journal.locked;
  const isManualSession = session.teachingScheduleId === "manual" || session.teachingScheduleId === "susulan";
  const effectiveMaterial = actualMaterialTitle || journal.plannedMaterialTitle || "";

  return (
    <>
      {/* ========== FORM SECTION (no-print) ========== */}
      <div className="no-print" style={{ marginBottom: "1rem" }}>
        {/* Header badges */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
          <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Jurnal — {session.classLabel}</span>
          <Badge variant={isLocked ? "success" : "neutral"}>{isLocked ? "Final" : "Draft"}</Badge>
          {reviewOpened && !isLocked && <Badge variant="success">✓ Review dibuka</Badge>}
          {journal.totalStudents > 0 && (
            <Badge variant="neutral">
              H:{journal.presentCount} S:{journal.sickCount} I:{journal.excusedCount} A:{journal.absentCount}
            </Badge>
          )}
        </div>

        {/* PATCH-FLOW-RC2D: warning bila belum ada absensi */}
        {needsAttendance && !isLocked && (
          <div style={{ padding: 12, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, marginBottom: 12 }}>
            <p style={{ fontWeight: 600, color: "#92400e", fontSize: "0.85rem" }}>Belum ada absensi untuk sesi ini</p>
            <p style={{ fontSize: "0.75rem", color: "#92400e", marginTop: 4 }}>
              Jurnal tidak akan punya data kehadiran. Buat absensi dulu di menu Absen, atau lanjut simpan draft tanpa data kehadiran.
            </p>
            <Button
              variant="secondary"
              className="text-xs mt-2"
              onClick={() => (window.location.hash = `/attendance?sessionId=${session.id}`)}
            >
              Buat Absensi Dulu
            </Button>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {!isLocked ? (
            <>
              <Button
                onClick={handleApproveAndFinalize}
                disabled={!finalizeCheck.ok}
                className="bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ✓ Setujui & Finalkan
              </Button>
              <Button variant="secondary" onClick={handleSaveDraft}>
                Simpan Draft
              </Button>
              <Button
                variant={reviewOpened ? "primary" : "secondary"}
                onClick={() => setReviewOpened(true)}
              >
                {reviewOpened ? "✓ Review Dibuka" : "Lihat Review"}
              </Button>
              <Button variant="secondary" onClick={handleCopyPrevious}>
                Salin Sebelumnya
              </Button>
            </>
          ) : (
            <>
              <Badge variant="success">Jurnal Final (terkunci)</Badge>
              <Button variant="secondary" onClick={handleUnlock}>
                Buka Kembali
              </Button>
            </>
          )}
        </div>

        {/* Validasi hint */}
        {!isLocked && !finalizeCheck.ok && (
          <div style={{ padding: 8, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 4, fontSize: "0.75rem", color: "#92400e", marginBottom: 12 }}>
            ⚠ {finalizeCheck.message}
          </div>
        )}

        {/* Form inputs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Auto-fill info */}
          <div style={{ padding: 10, background: "#f8fafc", borderRadius: 6, fontSize: "0.8rem" }}>
            <p style={{ fontSize: "0.65rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
              Auto-fill (dari assignment + sesi + Prota + absensi)
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: "0.75rem" }}>
              <div><span style={{ color: "#94a3b8" }}>Guru:</span> <strong>{teacherName}</strong></div>
              <div><span style={{ color: "#94a3b8" }}>Mapel:</span> <strong>{journal.subject}</strong></div>
              <div><span style={{ color: "#94a3b8" }}>Kelas:</span> <strong>{journal.classLabel}</strong></div>
              <div><span style={{ color: "#94a3b8" }}>Tanggal:</span> <strong>{formatLongDateID(journal.date)}</strong></div>
              <div><span style={{ color: "#94a3b8" }}>Materi (Promes):</span> <strong>{journal.plannedMaterialTitle ?? "-"}</strong></div>
              <div><span style={{ color: "#94a3b8" }}>TP:</span> <strong>{journal.plannedLearningOutcome ?? "-"}</strong></div>
            </div>
          </div>

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
            label="Materi / Pokok Bahasan"
            id="jrn-material"
            value={actualMaterialTitle}
            onChange={setActualMaterial}
            placeholder={journal.plannedMaterialTitle ?? "Tulis materi"}
          />

          {/* JOURNAL-REVIEW-NARRATIVE-03 §5: Kegiatan Pembelajaran (chip quick choices) */}
          <div>
            <label className="label">Kegiatan Pembelajaran</label>
            <div className="flex gap-2 flex-wrap">
              {JOURNAL_ACTIVITY_CHOICES.map((kegiatan) => (
                <button
                  key={kegiatan}
                  type="button"
                  disabled={isLocked}
                  onClick={() => toggleActivity(kegiatan)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                    activities.includes(kegiatan)
                      ? "border-brand-500 bg-brand-100 text-brand-800"
                      : "border-brand-300 text-brand-700 bg-brand-50 hover:bg-brand-100"
                  } ${isLocked ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {kegiatan}
                </button>
              ))}
            </div>
            {activities.length > 0 && (
              <p className="text-xs text-slate-500 mt-2">
                Terpilih: {activities.join(", ")}
              </p>
            )}
          </div>

          <Select
            label="Realisasi"
            id="jrn-real"
            value={realizationStatus}
            onChange={(v) => setRealization(v as RealizationStatus)}
            options={REALIZATION_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
          />

          {/* JOURNAL-REVIEW-NARRATIVE-03 §5: Respons Siswa (chip quick choices) */}
          <div>
            <label className="label">Respons Siswa</label>
            <div className="flex gap-2 flex-wrap">
              {JOURNAL_RESPONSE_CHOICES.map((resp) => (
                <button
                  key={resp}
                  type="button"
                  disabled={isLocked}
                  onClick={() => setResponse(studentResponse === resp ? "" : resp)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                    studentResponse === resp
                      ? "border-emerald-500 bg-emerald-100 text-emerald-800"
                      : "border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                  } ${isLocked ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {resp}
                </button>
              ))}
            </div>
          </div>

          {/* JOURNAL-REVIEW-NARRATIVE-03 §5: Kendala / Catatan (chip quick choices) */}
          <div>
            <label className="label">Kendala / Catatan</label>
            <div className="flex gap-2 flex-wrap">
              {JOURNAL_OBSTACLE_CHOICES.map((obs) => (
                <button
                  key={obs}
                  type="button"
                  disabled={isLocked}
                  onClick={() => setObstacleVal(obstacle === obs ? "" : obs)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                    obstacle === obs
                      ? "border-amber-500 bg-amber-100 text-amber-800"
                      : "border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100"
                  } ${isLocked ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {obs}
                </button>
              ))}
            </div>
          </div>

          {/* JOURNAL-REVIEW-NARRATIVE-03 §5: Catatan tambahan bebas */}
          <Textarea
            label="Catatan Tambahan (opsional)"
            id="jrn-freenote"
            value={freeNote}
            onChange={setFreeNoteVal}
            rows={2}
            placeholder="Catatan tambahan dari guru..."
          />

          {/* JOURNAL-REVIEW-NARRATIVE-03 §5: Tindak Lanjut (chip quick choices) */}
          <div>
            <label className="label">Tindak Lanjut</label>
            <div className="flex gap-2 flex-wrap">
              {JOURNAL_FOLLOWUP_CHOICES.map((fu) => (
                <button
                  key={fu}
                  type="button"
                  disabled={isLocked}
                  onClick={() => setFollowUpVal(followUp === fu ? "" : fu)}
                  className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                    followUp === fu
                      ? "border-sky-500 bg-sky-100 text-sky-800"
                      : "border-sky-300 text-sky-700 bg-sky-50 hover:bg-sky-100"
                  } ${isLocked ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {fu}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ========== DOCUMENT SECTION (always visible, printed) ========== */}
      <div className="document-page document-portrait" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '11pt', lineHeight: '1.25', width: '100%', boxSizing: 'border-box' }}>
        <div className="document-title">JURNAL MENGAJAR</div>
        <div className="document-subtitle">{schoolName}</div>
        <table className="document-identity" style={{ fontFamily: 'Arial, Helvetica, sans-serif', width: '100%', borderCollapse: 'collapse', boxSizing: 'border-box' }}>
          <tbody>
            <tr>
              <td>Mata Pelajaran</td><td>{journal.subject}</td>
              <td>Kelas</td><td>{journal.classLabel}</td>
            </tr>
            <tr>
              <td>Guru</td><td>{teacherName}</td>
              <td>Tanggal</td><td>{formatLongDateID(journal.date)}</td>
            </tr>
            <tr>
              <td>Jam ke</td><td>{isManualSession ? "Darurat" : `${session.startPeriod} (${session.startTime}–${session.endTime})`}</td>
              <td>Realisasi</td><td>{REALIZATION_OPTIONS.find((s) => s.value === realizationStatus)?.label}</td>
            </tr>
          </tbody>
        </table>
        <table className="document-table" style={{ fontFamily: 'Arial, Helvetica, sans-serif', width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', boxSizing: 'border-box' }}>
          <tbody>
            <tr><td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Materi</td><td>{effectiveMaterial || "-"}</td></tr>
            <tr><td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Tujuan Pembelajaran</td><td>{journal.plannedLearningOutcome ?? "-"}</td></tr>
            <tr><td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Kehadiran</td><td>H: {journal.presentCount} · S: {journal.sickCount} · I: {journal.excusedCount} · A: {journal.absentCount} · Total: {journal.totalStudents}</td></tr>
            {/* JOURNAL-REVIEW-NARRATIVE-03 §8: pakai narrative */}
            <tr><td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Kegiatan Pembelajaran</td><td>{narrative.activityNarrative}</td></tr>
            <tr><td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Catatan / Respons Siswa</td><td>{narrative.noteNarrative}</td></tr>
            <tr><td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Tindak Lanjut</td><td>{narrative.followUpNarrative}</td></tr>
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
    </>
  );
}
