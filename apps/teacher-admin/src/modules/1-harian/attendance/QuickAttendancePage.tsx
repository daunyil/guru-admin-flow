/**
 * UX-STABILITY-FIXPACK-01: Absensi Cepat — kartu pilihan + tombol eksplisit.
 *
 * WYSIWYG-DOC-FASE10: Absensi sebagai dokumen WYSIWYG.
 *   - Layout always-on: sidebar (konteks, daftar pertemuan) + DocumentPreview (editor/dokumen).
 *   - Sidebar: Konteks (pilih Kelas/Mapel, tanggal), Daftar Pertemuan (reguler + susulan).
 *   - DocumentPreview: kanvas A4 + auto-save + status badge.
 *   - Auto-save ke schoolDocuments (docType: "absen-semester").
 *   - ensureDoc pattern: find-or-create saat assignment dipilih.
 */

import { Card, Input, Select, Button, EmptyState, Badge, LoadingState } from "@shared/ui";
import { formatLongDateID } from "@guru-admin/shared";
import { DocumentPreview } from "@shared/documents";
import { useQuickAttendanceState } from "./useQuickAttendanceState";
import { AttendanceUnfilledList } from "./AttendanceUnfilledList";
import { AttendanceEditor } from "./AttendanceEditor";

export function QuickAttendancePage() {
  const state = useQuickAttendanceState();

  const {
    loading,
    year,
    mode,
    setMode,
    date,
    setDate,
    sessions,
    assignments,
    assignmentId,
    setAssignmentId,
    allSessions,
    selectedSessionId,
    setSelectedSessionId,
    notice,
    setNotice,
    saved,
    todayDoneIds,
    // Document (WYSIWYG) state
    showSidebar,
    setShowSidebar,
    formatDokumen,
    docId,
    docStatus,
    // Computed
    doneIds,
    docDataForAutoSave,
    // Functions
    assignment,
    handlePickSession,
    closeSaved,
    afterSave,
    handleSaveDoc,
    handleSetFinal,
    handleOrientationChange,
  } = state;

  /* ---------------------------------------------------------------- */
  /*  Early returns                                                   */
  /* ---------------------------------------------------------------- */

  if (loading) return <LoadingState />;

  if (!year) {
    return (
      <Card>
        <EmptyState
          title="Belum ada tahun pelajaran aktif"
          description="Buat tahun pelajaran baru atau gunakan data contoh terlebih dahulu."
        />
      </Card>
    );
  }

  /* ================================================================ */
  /*  WYSIWYG VIEW — sidebar + document                                */
  /* ================================================================ */

  return (
    <div className="doc-wysiwyg-layout">
      {/* ---------- MOBILE BACKDROP ---------- */}
      <div
        className={`doc-sidebar-backdrop no-print ${!showSidebar ? "doc-backdrop-hidden" : ""}`}
        onClick={() => setShowSidebar(false)}
        aria-hidden="true"
      />

      {/* ---------- SIDEBAR ---------- */}
      <aside className={`doc-sidebar no-print ${!showSidebar ? "doc-sidebar-hidden" : ""}`}>
        <div className="doc-sidebar-header">
          <h2 className="text-sm font-bold text-slate-900">Absensi Cepat</h2>
          <button
            type="button"
            className="doc-sidebar-close"
            onClick={() => setShowSidebar(false)}
            title="Tutup sidebar"
          >
            ✕
          </button>
        </div>

        {/* -- Konteks -- */}
        <div className="doc-sidebar-section">
          <h3 className="doc-sidebar-section-title">Konteks</h3>
          <p className="text-xs text-slate-500 mb-2">
            {year ? `TP ${year.label}` : "Belum ada tahun aktif"}
          </p>
          <Input label="Tanggal" id="att-date" type="date" value={date} onChange={setDate} />
          <div className="flex gap-2 mt-2 flex-wrap">
            <Button variant={mode === "jadwal" ? "primary" : "secondary"} onClick={() => { setMode("jadwal"); setSelectedSessionId(null); }} className="text-xs">Reguler</Button>
            <Button variant={mode === "susulan" ? "primary" : "secondary"} onClick={() => { setMode("susulan"); setSelectedSessionId(null); }} className="text-xs">Susulan</Button>
          </div>
        </div>

        {/* -- Daftar Pertemuan (Reguler) -- */}
        {mode === "jadwal" && (
          <div className="doc-sidebar-section">
            <h3 className="doc-sidebar-section-title">Sesi Hari Ini</h3>
            <p className="text-xs text-slate-500 mb-1">{sessions.length} sesi di {formatLongDateID(date)}</p>
            {sessions.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Tidak ada sesi. Pilih tanggal lain atau coba Susulan.</p>
            ) : (
              <ul className="doc-sidebar-list">
                {sessions.map((s) => {
                  const isActive = selectedSessionId === s.id;
                  const done = todayDoneIds.has(s.id);
                  return (
                    <li key={s.id}
                      className={`doc-sidebar-list-item cursor-pointer ${isActive ? "ring-2 ring-brand-300" : ""} ${done ? "bg-emerald-50" : ""}`}
                      onClick={() => handlePickSession(s.id)}
                    >
                      <span className="doc-sidebar-list-title">{s.subject} · {s.classLabel}</span>
                      <div className="flex items-center gap-1">
                        {done && <Badge variant="success">✓</Badge>}
                        {isActive && <Badge variant="success">Aktif</Badge>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* -- Daftar Pertemuan (Susulan) -- SELALU TAMPIL */}
        {mode === "susulan" && (
          <div className="doc-sidebar-section">
            <h3 className="doc-sidebar-section-title">Susulan</h3>
            {assignments.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Belum ada Kelas dan Mapel. Buat dulu di menu Kelas dan Mapel atau gunakan data contoh.</p>
            ) : (
              <Select label="Kelas dan Mapel" id="susulan-asg" value={assignmentId} onChange={(v) => { setAssignmentId(v); setSelectedSessionId(null); }} options={[{ value: "", label: "-- Pilih --" }, ...assignments.map((a) => ({ value: a.id, label: `${a.classLabel} · ${a.subject}` }))]} />
            )}
            {assignmentId && allSessions.length > 0 && (
              <div className="mt-2 space-y-1 max-h-64 overflow-y-auto">
                <p className="text-xs text-slate-500">{allSessions.filter((s) => doneIds.has(s.id)).length} diisi · {allSessions.filter((s) => !doneIds.has(s.id)).length} belum</p>
                {allSessions.map((s, i) => {
                  const done = doneIds.has(s.id);
                  const isActive = selectedSessionId === s.id;
                  return (
                    <div key={s.id}
                      className={`p-2 border rounded text-xs cursor-pointer transition-colors ${isActive ? "border-brand-500 bg-brand-50" : done ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}
                      onClick={() => handlePickSession(s.id)}
                    >
                      <span className="font-medium">P{i + 1}</span> · {formatLongDateID(s.date)}
                      <Badge variant={done ? "success" : "error"}>{done ? "✓" : "!"}</Badge>
                    </div>
                  );
                })}
              </div>
            )}
            {assignmentId && allSessions.length === 0 && (
              <p className="text-xs text-amber-600 italic mt-2">Belum ada sesi untuk kelas dan mapel ini. Buat jadwal mengajar terlebih dahulu.</p>
            )}
          </div>
        )}
      </aside>

      {/* ---------- FLOATING SIDEBAR TOGGLE ---------- */}
      {!showSidebar && (
        <button
          type="button"
          className="doc-sidebar-toggle no-print"
          onClick={() => setShowSidebar(true)}
          title="Buka sidebar"
        >
          ☰
        </button>
      )}

      {/* ---------- DOCUMENT AREA ---------- */}
      <div className="doc-document-area">
        {notice && <div className="info-banner-success mb-3 no-print" role="status" aria-live="polite">{notice}</div>}

        <DocumentPreview
          docId={docId}
          docType="absen-semester"
          orientation={formatDokumen}
          status={docStatus}
          data={docDataForAutoSave}
          onSave={handleSaveDoc}
          onSetFinal={handleSetFinal}
          onOrientationChange={handleOrientationChange}
        >
          {!selectedSessionId ? (
            <AttendanceUnfilledList
              mode={mode}
              date={date}
              sessions={sessions}
              allSessions={allSessions}
              todayDoneIds={todayDoneIds}
              doneIds={doneIds}
              assignmentId={assignmentId}
              assignments={assignments}
              onPickSession={handlePickSession}
            />
          ) : (
            <AttendanceEditor sessionId={selectedSessionId} date={date} year={year} onSaved={afterSave} onError={setNotice} />
          )}

          {/* Rekap Absensi Document (shown when susulan mode has data) */}
          {mode === "susulan" && assignmentId && allSessions.length > 0 && (
            <div className="document-page document-portrait mt-6" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '11pt', lineHeight: '1.25', width: '100%', boxSizing: 'border-box' }}>
              <div className="document-title">REKAP ABSENSI</div>
              <div className="document-subtitle">{year?.label ?? ""} — Semester {assignment()?.semester === 1 ? "Ganjil" : "Genap"}</div>
              <table className="document-identity" style={{ fontFamily: 'Arial, Helvetica, sans-serif', width: '100%', borderCollapse: 'collapse', boxSizing: 'border-box' }}>
                <tbody>
                  <tr><td>Kelas</td><td>{assignment()?.classLabel ?? "-"}</td><td>Mapel</td><td>{assignment()?.subject ?? "-"}</td></tr>
                  <tr><td>Guru</td><td>{assignment()?.teacherName ?? "-"}</td><td>Total Pertemuan</td><td>{allSessions.length}</td></tr>
                </tbody>
              </table>
              <table className="document-table" style={{ fontFamily: 'Arial, Helvetica, sans-serif', width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', boxSizing: 'border-box' }}>
                <thead>
                  <tr>
                    <th style={{ width: "5%" }}>No</th>
                    <th style={{ width: "15%" }}>Tanggal</th>
                    <th>Mapel</th>
                    <th>Kelas</th>
                    <th style={{ width: "10%" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allSessions.map((s, i) => (
                    <tr key={s.id}>
                      <td className="text-center">{i + 1}</td>
                      <td>{formatLongDateID(s.date)}</td>
                      <td>{s.subject}</td>
                      <td>{s.classLabel}</td>
                      <td className="text-center">{doneIds.has(s.id) ? "Sudah diisi" : "Belum diisi"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DocumentPreview>
      </div>

      {/* Toast saved */}
      {saved && (
        <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 no-print">
          <div className="mx-auto max-w-xl rounded-2xl border bg-white shadow-2xl p-4">
            <p className="font-bold text-emerald-700">Absensi tersimpan</p>
            <p className="text-sm text-slate-600">{saved.subject} - {saved.classLabel} · {formatLongDateID(saved.date)}</p>
            <p className="text-xs text-slate-500">H: {saved.summary.present} · S: {saved.summary.sick} · I: {saved.summary.excused} · A: {saved.summary.absent}</p>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Button onClick={() => { window.location.hash = `#/journal?sessionId=${saved.sessionId}`; }}>Lanjut Isi Jurnal</Button>
              <Button variant="secondary" onClick={closeSaved}>Tutup</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
