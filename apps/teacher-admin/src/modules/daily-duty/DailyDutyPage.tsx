/**
 * PIKET-HARIAN-MOBILE-01: Halaman Piket Harian.
 * Mobile-first. 5 flows dalam satu halaman.
 * Terisolasi dari app utama — tidak menulis ke attendanceRecords.
 */

import { useEffect, useState } from "react";
import { Card, CardHeader, Input, Select, Button, Badge, EmptyState, Textarea, PrintExportButtons } from "../../shared/ui";
import { getActiveAcademicYear, getTeacherProfile } from "../../shared/db/profile-repo";
import { listClassRosters } from "../../shared/db/class-roster-repo";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";
import {
  listDutyRules, seedDefaultDutyRulesIfEmpty,
  findOrCreateDutyReport, getDutyReportByDate, updateDutyReportNote, finalizeDutyReport, unlockDutyReport,
  addDutyRecord, deleteDutyRecord, listDutyRecordsByDate, listDutyRecordsByStudent,
  getAttendanceSummaryForDate, syncAlpaFromAttendance,
} from "../../shared/db/daily-duty-repo";
import type { DutyRule, DutyRecord, ClassAttendanceSummary } from "@guru-admin/domain";
import { getStudentDutyStatus, summarizeDutyRecords } from "@guru-admin/domain";
import type { AcademicYear, TeacherProfile, ClassRoster } from "@guru-admin/domain";

type Tab = "catat" | "rekap" | "catatan" | "riwayat" | "cetak";

export function DailyDutyPage() {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [date, setDate] = useState(todayISODate());
  const [tab, setTab] = useState<Tab>("catat");
  const [rules, setRules] = useState<DutyRule[]>([]);
  const [rosters, setRosters] = useState<ClassRoster[]>([]);
  const [records, setRecords] = useState<DutyRecord[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<ClassAttendanceSummary[]>([]);
  const [reportNote, setReportNote] = useState("");
  const [reportFinalized, setReportFinalized] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedRuleId, setSelectedRuleId] = useState("");
  const [catatan, setCatatan] = useState("");
  const [tindakLanjut, setTindakLanjut] = useState("");
  const [riwayatStudentId, setRiwayatStudentId] = useState("");
  const [riwayatRecords, setRiwayatRecords] = useState<DutyRecord[]>([]);

  useEffect(() => { void init(); }, []);
  useEffect(() => { if (year) void loadData(); }, [date, year]);

  async function init() {
    const [y, tp] = await Promise.all([getActiveAcademicYear(), getTeacherProfile()]);
    setYear(y ?? null); setTeacher(tp);
    if (y) setRosters(await listClassRosters(y.id));
    await seedDefaultDutyRulesIfEmpty();
    setRules(await listDutyRules());
    setLoading(false);
  }

  async function loadData() {
    if (!year) return;
    const [recs, summary, report] = await Promise.all([
      listDutyRecordsByDate(year.id, date),
      getAttendanceSummaryForDate({ academicYearId: year.id, date }),
      getDutyReportByDate(year.id, date),
    ]);
    setRecords(recs);
    setAttendanceSummary(summary);
    if (report) { setReportNote(report.note ?? ""); setReportFinalized(report.finalized); }
    else { setReportNote(""); setReportFinalized(false); }
  }

  async function handleCatat() {
    if (!year || !teacher || !selectedClassId || !selectedStudentId || !selectedRuleId) {
      setMessage("Lengkapi: Kelas, Siswa, dan Jenis Catatan."); return;
    }
    const rule = rules.find((r) => r.id === selectedRuleId);
    if (!rule) return;
    if (rule.type === "other" && !catatan.trim()) {
      setMessage("Catatan wajib untuk jenis 'Lainnya'."); return;
    }
    const roster = rosters.find((r) => r.classId === selectedClassId);
    const student = roster?.students.find((s) => s.id === selectedStudentId);
    if (!student) return;

    const report = await findOrCreateDutyReport({
      academicYearId: year.id, date, dutyTeacherId: teacher.id, dutyTeacherName: teacher.name,
    });
    if (report.finalized) { setMessage("Laporan sudah difinalisasi. Buka revisi dulu."); return; }

    await addDutyRecord({
      dutyReportId: report.id, academicYearId: year.id, date,
      studentId: student.id, studentName: student.name, studentNumber: student.number,
      classId: selectedClassId, classLabel: roster?.classLabel ?? "",
      category: rule.category, type: rule.type, ruleId: rule.id, ruleLabel: rule.label,
      points: rule.points,
      source: "manual", attendanceLinkType: null, // PIKET-HARIAN-MOBILE-01A Fix 4: terlambat = manual
      note: catatan || undefined, followUp: tindakLanjut || undefined,
      recordedByTeacherId: teacher.id, recordedByTeacherName: teacher.name,
    });
    setMessage(`Catatan tersimpan: ${student.name} — ${rule.label} (${rule.points} poin).`);
    setSelectedStudentId(""); setSelectedRuleId(""); setCatatan(""); setTindakLanjut("");
    void loadData();
  }

  async function handleDeleteRecord(id: string) {
    if (!confirm("Hapus catatan ini?")) return;
    await deleteDutyRecord(id);
    setMessage("Catatan dihapus.");
    void loadData();
  }

  async function handleFinalize() {
    if (!year) return;
    const report = await getDutyReportByDate(year.id, date);
    if (!report) return;
    await finalizeDutyReport(report.id);
    setReportFinalized(true);
    setMessage("Laporan piket difinalisasi.");
  }

  async function handleUnlock() {
    if (!year) return;
    const report = await getDutyReportByDate(year.id, date);
    if (!report) return;
    await unlockDutyReport(report.id);
    setReportFinalized(false);
    setMessage("Laporan dibuka untuk revisi.");
  }

  async function handleSyncAlpa() {
    if (!year || !teacher) return;
    if (reportFinalized) { setMessage("Laporan sudah difinalisasi. Buka revisi dulu."); return; }
    const ok = window.confirm(
      "Sinkron Alpa dari Absen? Siswa dengan status 'Alpa' di absen utama " +
      "akan dibuat catatan piket (10 poin). Catatan yang sudah ada tidak akan dobel."
    );
    if (!ok) return;
    const result = await syncAlpaFromAttendance({
      academicYearId: year.id, date,
      dutyTeacherId: teacher.id, dutyTeacherName: teacher.name,
    });
    setMessage(`Sinkron Alpa: ${result.created} baru, ${result.skipped} sudah ada (skip).`);
    void loadData();
  }

  async function handleSaveNote() {
    if (!year) return;
    const report = await findOrCreateDutyReport({
      academicYearId: year.id, date,
      dutyTeacherId: teacher?.id ?? "", dutyTeacherName: teacher?.name ?? "",
    });
    await updateDutyReportNote(report.id, reportNote);
    setMessage("Catatan piket tersimpan.");
  }

  async function handleRiwayatSearch() {
    if (!year || !riwayatStudentId) return;
    const recs = await listDutyRecordsByStudent(year.id, riwayatStudentId);
    setRiwayatRecords(recs);
  }

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;

  const selectedRoster = rosters.find((r) => r.classId === selectedClassId);
  const summary = summarizeDutyRecords(records);
  const riwayatSummary = summarizeDutyRecords(riwayatRecords);

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: "catat", label: "Catat" },
    { key: "rekap", label: "Rekap" },
    { key: "catatan", label: "Catatan" },
    { key: "riwayat", label: "Riwayat" },
    { key: "cetak", label: "Cetak" },
  ];

  return (
    <div className="space-y-4">
      <div className="page-header">
        <h1 className="text-2xl font-bold text-slate-900">Piket Harian</h1>
        <p className="text-sm text-slate-500 mt-1">
          {year ? `TP ${year.label}` : ""} · {formatLongDateID(date)} · Guru Piket: {teacher?.name ?? "-"}
        </p>
      </div>

      {message && <div className="info-banner-success">{message}</div>}

      <Card><Input label="Tanggal" id="duty-date" type="date" value={date} onChange={setDate} /></Card>

      <Card>
        <div className="flex gap-2 flex-wrap">
          {tabs.map((t) => (
            <Button key={t.key} variant={tab === t.key ? "primary" : "secondary"} className="text-xs" onClick={() => setTab(t.key)}>
              {t.label}
            </Button>
          ))}
        </div>
      </Card>

      {/* TAB: Catat Kejadian */}
      {tab === "catat" && (
        <Card>
          <CardHeader title="Catat Kejadian Siswa" description="Pilih kelas → siswa → jenis catatan. Poin otomatis." />
          {reportFinalized && <div className="p-2 bg-amber-50 rounded text-xs text-amber-800 mb-3">⚠ Laporan sudah difinalisasi. Buka revisi dulu.</div>}
          <div className="space-y-3">
            <Select label="Kelas" id="duty-class" value={selectedClassId} onChange={setSelectedClassId}
              options={[{ value: "", label: "-- Pilih --" }, ...rosters.map((r) => ({ value: r.classId, label: r.classLabel }))]} />
            {selectedRoster && (
              <Select label="Siswa" id="duty-student" value={selectedStudentId} onChange={setSelectedStudentId}
                options={[{ value: "", label: "-- Pilih --" }, ...selectedRoster.students.map((s) => ({ value: s.id, label: `${s.number}. ${s.name}` }))]} />
            )}
            <div>
              <label className="label">Jenis Catatan</label>
              <div className="flex gap-2 flex-wrap">
                {rules.map((r) => (
                  <button key={r.id} onClick={() => setSelectedRuleId(r.id)}
                    className={`px-3 py-2 text-xs rounded-lg border transition-all ${selectedRuleId === r.id ? "border-brand-500 bg-brand-50 ring-2 ring-brand-200" : "border-slate-200"}`}>
                    {r.label} ({r.points}p)
                  </button>
                ))}
              </div>
            </div>
            <Textarea label="Catatan (wajib untuk 'Lainnya')" id="duty-note" value={catatan} onChange={setCatatan} rows={2} />
            <Textarea label="Tindak Lanjut (opsional)" id="duty-followup" value={tindakLanjut} onChange={setTindakLanjut} rows={2} />
            <Button onClick={handleCatat} disabled={reportFinalized}>Simpan Catatan</Button>
          </div>
        </Card>
      )}

      {/* TAB: Rekap Kehadiran */}
      {tab === "rekap" && (
        <Card>
          <CardHeader title="Rekap Kehadiran Hari Ini" description="Dari absen utama (read-only)." />
          {attendanceSummary.length === 0 ? (
            <EmptyState title="Belum ada data" description="Belum ada kelas/roster." />
          ) : (
            <div className="space-y-2">
              {attendanceSummary.map((s) => (
                <div key={s.classId} className="p-3 border rounded-lg flex items-center justify-between">
                  <span className="font-medium text-sm">{s.classLabel}</span>
                  {s.source === "empty" ? (
                    <Badge variant="warning">Absen belum diisi</Badge>
                  ) : (
                    <div className="flex gap-2 text-xs">
                      <Badge variant="success">H {s.present}</Badge>
                      <Badge variant="warning">S {s.sick}</Badge>
                      <Badge variant="neutral">I {s.excused}</Badge>
                      <Badge variant="error">A {s.absent}</Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* TAB: Catatan Hari Ini */}
      {tab === "catatan" && (
        <Card>
          <CardHeader title="Catatan Piket Hari Ini" description={`${records.length} catatan · ${summary.totalPoints} total poin`} />
          {reportFinalized && <div className="p-2 bg-emerald-50 rounded text-xs text-emerald-700 mb-3">✓ Laporan sudah difinalisasi.</div>}
          {records.length === 0 ? (
            <EmptyState title="Belum ada catatan" description="Belum ada catatan piket untuk hari ini." />
          ) : (
            <div className="space-y-2">
              {records.map((r) => (
                <div key={r.id} className="p-3 border rounded-lg flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{r.studentName} — {r.classLabel}</p>
                    <p className="text-xs text-slate-500">{r.ruleLabel} · {r.points} poin{r.note ? ` · ${r.note}` : ""}</p>
                  </div>
                  {!reportFinalized && <Button variant="danger" className="text-xs px-2 py-1 shrink-0" onClick={() => handleDeleteRecord(r.id)}>Hapus</Button>}
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 space-y-2">
            <Textarea label="Catatan Umum Guru Piket" id="duty-report-note" value={reportNote} onChange={setReportNote} rows={3} />
            <div className="flex gap-2">
              <Button variant="secondary" className="text-sm" onClick={handleSaveNote} disabled={reportFinalized}>Simpan Catatan</Button>
              {!reportFinalized && <Button variant="secondary" className="text-sm" onClick={handleSyncAlpa}>Sinkron Alpa dari Absen</Button>}
              {!reportFinalized ? <Button className="text-sm" onClick={handleFinalize}>Finalisasi</Button> : <Button variant="secondary" className="text-sm" onClick={handleUnlock}>Buka Revisi</Button>}
            </div>
          </div>
        </Card>
      )}

      {/* TAB: Riwayat Siswa */}
      {tab === "riwayat" && (
        <Card>
          <CardHeader title="Riwayat Siswa" description="Pilih kelas → siswa → lihat total poin + riwayat." />
          <div className="space-y-3">
            <Select label="Kelas" id="riwayat-class" value={selectedClassId} onChange={(v) => { setSelectedClassId(v); setRiwayatStudentId(""); setRiwayatRecords([]); }}
              options={[{ value: "", label: "-- Pilih --" }, ...rosters.map((r) => ({ value: r.classId, label: r.classLabel }))]} />
            {selectedRoster && (
              <Select label="Siswa" id="riwayat-student" value={riwayatStudentId} onChange={setRiwayatStudentId}
                options={[{ value: "", label: "-- Pilih --" }, ...selectedRoster.students.map((s) => ({ value: s.id, label: `${s.number}. ${s.name}` }))]} />
            )}
            {riwayatStudentId && <Button variant="secondary" className="text-sm" onClick={handleRiwayatSearch}>Lihat Riwayat</Button>}
            {riwayatRecords.length > 0 && (
              <div className="p-3 bg-slate-50 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">{riwayatRecords[0]?.studentName}</span>
                  <Badge variant={riwayatSummary.totalPoints >= 75 ? "error" : riwayatSummary.totalPoints >= 25 ? "warning" : "success"}>Total: {riwayatSummary.totalPoints} poin</Badge>
                </div>
                <p className="text-xs text-slate-500">Status: <strong>{getStudentDutyStatus(riwayatSummary.totalPoints)}</strong></p>
                <div className="space-y-1">
                  {riwayatRecords.map((r) => (
                    <div key={r.id} className="text-xs flex justify-between border-b border-slate-200 py-1">
                      <span>{formatLongDateID(r.date)} — {r.ruleLabel}</span>
                      <span className="font-medium">{r.points} poin</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* TAB: Cetak Laporan */}
      {tab === "cetak" && (
        <Card>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-slate-700">Cetak Laporan Piket</h3>
            <PrintExportButtons filename={`laporan-piket-${date}`} title="Laporan Piket Harian" orientation="portrait" targetId="print-duty" />
          </div>
          <div className="print-area hidden print:block" id="print-duty">
            <div className="document-page document-portrait">
              <div className="document-title">LAPORAN PIKET HARIAN</div>
              <div className="document-subtitle">{year?.label ?? ""} · {formatLongDateID(date)}</div>
              <table className="document-identity">
                <tbody>
                  <tr><td>Tanggal</td><td>{formatLongDateID(date)}</td><td>Guru Piket</td><td>{teacher?.name ?? "-"}</td></tr>
                  <tr><td>Tahun Pelajaran</td><td>{year?.label ?? "-"}</td><td>Catatan</td><td>{records.length} kejadian</td></tr>
                </tbody>
              </table>
              <div className="document-section-title">A. REKAP KEHADIRAN</div>
              <table className="document-table">
                <thead><tr><th>Kelas</th><th>Hadir</th><th>Sakit</th><th>Izin</th><th>Alpa</th></tr></thead>
                <tbody>
                  {attendanceSummary.map((s) => (
                    <tr key={s.classId}>
                      <td>{s.classLabel}</td>
                      <td className="text-center">{s.source === "empty" ? "-" : s.present}</td>
                      <td className="text-center">{s.source === "empty" ? "-" : s.sick}</td>
                      <td className="text-center">{s.source === "empty" ? "-" : s.excused}</td>
                      <td className="text-center">{s.source === "empty" ? "-" : s.absent}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="document-section-title">B. CATATAN KEJADIAN / PELANGGARAN</div>
              <table className="document-table">
                <thead><tr><th>No</th><th>Nama</th><th>Kelas</th><th>Jenis</th><th>Poin</th><th>Catatan</th></tr></thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={r.id}>
                      <td className="text-center">{i + 1}</td><td>{r.studentName}</td><td>{r.classLabel}</td>
                      <td>{r.ruleLabel}</td><td className="text-center">{r.points}</td><td>{r.note ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {reportNote && (<><div className="document-section-title">C. CATATAN UMUM</div><p style={{ fontSize: "10pt", marginTop: "4pt" }}>{reportNote}</p></>)}
              <div className="document-section-title">D. TANDA TANGAN</div>
              <div className="signature-grid"><div><p>Guru Piket</p><div className="sig-space"></div><p className="sig-name">{teacher?.name ?? "-"}</p></div></div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
