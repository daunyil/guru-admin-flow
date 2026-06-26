/**
 * PIKET-HARIAN-MOBILE-01: Halaman Piket Harian.
 * Mobile-first. 5 flows dalam satu halaman.
 * Terisolasi dari app utama — tidak menulis ke attendanceRecords.
 */

import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, Input, Select, Button, Badge, EmptyState, Textarea, PrintExportButtons } from "../../shared/ui";
import { getActiveAcademicYear, getTeacherProfile } from "../../shared/db/profile-repo";
import { listClassRosters } from "../../shared/db/class-roster-repo";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";
import {
  listDutyRules, seedDefaultDutyRulesIfEmpty,
  findOrCreateDutyReport, getDutyReportByDate, updateDutyReportNote, finalizeDutyReport, unlockDutyReport,
  addDutyRecord, deleteDutyRecord, listDutyRecordsByDate, listDutyRecordsByStudent,
  listDutyRecordsByAcademicYear,
  getAttendanceDetailForDate, syncAlpaFromAttendance,
} from "../../shared/db/daily-duty-repo";
import type { DutyRule, DutyRecord, ClassAttendanceDetail, StudentSearchable, StudentDutyLedgerItem } from "@guru-admin/domain";
import {
  getStudentDutyStatus, summarizeDutyRecords, formatSIADetail,
  searchStudents, searchDutyRules, validateDutyRecordInput,
  buildStudentDutyLedger, filterDutyRecordsByStudent,
} from "@guru-admin/domain";
import type { AcademicYear, TeacherProfile, ClassRoster } from "@guru-admin/domain";

type Tab = "catat" | "rekap" | "catatan" | "poin" | "riwayat" | "cetak";

export function DailyDutyPage() {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [date, setDate] = useState(todayISODate());
  const [tab, setTab] = useState<Tab>("catat");
  const [rules, setRules] = useState<DutyRule[]>([]);
  const [rosters, setRosters] = useState<ClassRoster[]>([]);
  const [records, setRecords] = useState<DutyRecord[]>([]);
  const [attendanceDetail, setAttendanceDetail] = useState<ClassAttendanceDetail[]>([]);
  const [reportNote, setReportNote] = useState("");
  const [reportFinalized, setReportFinalized] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // PIKET-QUICK-INPUT-LIST-02B: catat-tab state (list-based smart search)
  const [catatClassFilter, setCatatClassFilter] = useState<string>("all"); // "all" | classId
  const [studentQuery, setStudentQuery] = useState("");
  const [ruleQuery, setRuleQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentSearchable | null>(null);
  const [selectedRule, setSelectedRule] = useState<DutyRule | null>(null);
  const [catatan, setCatatan] = useState("");
  const [tindakLanjut, setTindakLanjut] = useState("");

  // Riwayat tab (separate state — old Select-based flow)
  const [riwayatClassId, setRiwayatClassId] = useState("");
  const [riwayatStudentId, setRiwayatStudentId] = useState("");
  const [riwayatRecords, setRiwayatRecords] = useState<DutyRecord[]>([]);

  // PIKET-STUDENT-LEDGER-RECAP-04A: Rekap Poin tab state
  const [ledgerRecords, setLedgerRecords] = useState<DutyRecord[]>([]);
  const [ledgerClassFilter, setLedgerClassFilter] = useState<string>("all");
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState<string>("all");
  const [ledgerStudentQuery, setLedgerStudentQuery] = useState("");
  const [ledgerDetailStudent, setLedgerDetailStudent] = useState<StudentDutyLedgerItem | null>(null);
  const [ledgerDetailRecords, setLedgerDetailRecords] = useState<DutyRecord[]>([]);

  useEffect(() => { void init(); }, []);
  useEffect(() => { if (year) void loadData(); }, [date, year]);
  // PIKET-STUDENT-LEDGER-RECAP-04A: load ledger records saat year berubah (yearly, bukan per-date)
  useEffect(() => { if (year) void loadLedgerData(); }, [year]);

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
    const [recs, detail, report] = await Promise.all([
      listDutyRecordsByDate(year.id, date),
      getAttendanceDetailForDate({ academicYearId: year.id, date }),
      getDutyReportByDate(year.id, date),
    ]);
    setRecords(recs);
    setAttendanceDetail(detail);
    if (report) { setReportNote(report.note ?? ""); setReportFinalized(report.finalized); }
    else { setReportNote(""); setReportFinalized(false); }
  }

  // PIKET-STUDENT-LEDGER-RECAP-04A: Load semua DutyRecord tahunan untuk ledger.
  // Read-only. Dipakai buildStudentDutyLedger.
  async function loadLedgerData() {
    if (!year) return;
    const all = await listDutyRecordsByAcademicYear(year.id);
    setLedgerRecords(all);
  }

  // PIKET-QUICK-INPUT-LIST-02B: Bangun daftar siswa dari semua roster.
  // classId/classLabel mengikuti data siswa (bukan filter dropdown).
  const allStudents = useMemo<StudentSearchable[]>(() => {
    const out: StudentSearchable[] = [];
    for (const r of rosters) {
      for (const s of r.students) {
        out.push({
          id: s.id, name: s.name, number: s.number, nis: s.nis,
          classId: r.classId, classLabel: r.classLabel,
        });
      }
    }
    return out;
  }, [rosters]);

  // Filter siswa: kelas (chip) + smart search query.
  const filteredStudents = useMemo<StudentSearchable[]>(() => {
    const byClass = catatClassFilter === "all"
      ? allStudents
      : allStudents.filter((s) => s.classId === catatClassFilter);
    return searchStudents(byClass, studentQuery);
  }, [allStudents, catatClassFilter, studentQuery]);

  // Filter pelanggaran: smart search query.
  const filteredRules = useMemo<DutyRule[]>(() => {
    return searchDutyRules(rules, ruleQuery);
  }, [rules, ruleQuery]);

  async function handleCatat() {
    if (!year || !teacher) return;
    // PIKET-QUICK-INPUT-LIST-02B: validasi terpusat di domain.
    const v = validateDutyRecordInput({ selectedStudent, selectedRule, note: catatan });
    if (!v.ok) { setMessage(v.message); return; }

    const report = await findOrCreateDutyReport({
      academicYearId: year.id, date, dutyTeacherId: teacher.id, dutyTeacherName: teacher.name,
    });
    if (report.finalized) { setMessage("Laporan sudah difinalisasi. Buka revisi dulu."); return; }

    // classId/classLabel mengikuti siswa; points mengikuti rule.
    await addDutyRecord({
      dutyReportId: report.id, academicYearId: year.id, date,
      studentId: selectedStudent!.id,
      studentName: selectedStudent!.name,
      studentNumber: selectedStudent!.number,
      classId: selectedStudent!.classId,
      classLabel: selectedStudent!.classLabel,
      category: selectedRule!.category,
      type: selectedRule!.type,
      ruleId: selectedRule!.id,
      ruleLabel: selectedRule!.label,
      points: selectedRule!.points, // PIKET-QUICK-INPUT-LIST-02B §6: poin otomatis dari rule
      source: "manual", attendanceLinkType: null,
      note: catatan || undefined, followUp: tindakLanjut || undefined,
      recordedByTeacherId: teacher.id, recordedByTeacherName: teacher.name,
    });
    setMessage(`Catatan tersimpan: ${selectedStudent!.name} — ${selectedRule!.label} (${selectedRule!.points} poin).`);
    // Reset pilihan siswa + pelanggaran + catatan. Filter kelas/search tetap.
    setSelectedStudent(null); setSelectedRule(null); setCatatan(""); setTindakLanjut("");
    void loadData();
    void loadLedgerData(); // PIKET-STUDENT-LEDGER-RECAP-04A-PATCH-1: refresh ledger setelah tambah catatan
  }

  async function handleDeleteRecord(id: string) {
    if (!confirm("Hapus catatan ini?")) return;
    await deleteDutyRecord(id);
    setMessage("Catatan dihapus.");
    void loadData();
    void loadLedgerData(); // PIKET-STUDENT-LEDGER-RECAP-04A-PATCH-1: refresh ledger setelah hapus catatan
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
    void loadLedgerData(); // PIKET-STUDENT-LEDGER-RECAP-04A-PATCH-1: refresh ledger setelah Sinkron Alpa
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

  // PIKET-STUDENT-LEDGER-RECAP-04A: Buka detail riwayat siswa dari ledger.
  function handleOpenLedgerDetail(item: StudentDutyLedgerItem) {
    setLedgerDetailStudent(item);
    setLedgerDetailRecords(filterDutyRecordsByStudent(ledgerRecords, item.studentId, item.classId));
  }

  function handleCloseLedgerDetail() {
    setLedgerDetailStudent(null);
    setLedgerDetailRecords([]);
  }

  // PIKET-STUDENT-LEDGER-RECAP-04A: Build ledger from yearly records (memo di atas early-return agar hook order konsisten)
  const ledger = useMemo<StudentDutyLedgerItem[]>(() => buildStudentDutyLedger(ledgerRecords), [ledgerRecords]);

  // Filter ledger: class chip + status chip + smart search by student name
  const filteredLedger = useMemo<StudentDutyLedgerItem[]>(() => {
    let items = ledger;
    if (ledgerClassFilter !== "all") {
      items = items.filter((i) => i.classId === ledgerClassFilter);
    }
    if (ledgerStatusFilter !== "all") {
      items = items.filter((i) => i.statusLabel === ledgerStatusFilter);
    }
    if (ledgerStudentQuery.trim()) {
      // Smart search via searchStudents helper. Build a StudentSearchable view of ledger items.
      const searchable = items.map((i) => ({
        id: i.studentId, name: i.studentName, number: i.studentNumber,
        classId: i.classId, classLabel: i.classLabel,
      }));
      const matchedIds = new Set(
        searchStudents(searchable, ledgerStudentQuery).map((s) => s.id)
      );
      items = items.filter((i) => matchedIds.has(i.studentId));
    }
    return items;
  }, [ledger, ledgerClassFilter, ledgerStatusFilter, ledgerStudentQuery]);

  // Status badge variant helper (UI mapping for ledger)
  function statusVariantForLabel(label: string): "success" | "warning" | "neutral" | "error" | "errorStrong" {
    if (label === "Aman") return "success";
    if (label === "Pembinaan ringan") return "warning";
    if (label === "Panggilan orang tua") return "neutral";
    if (label === "Kesiswaan/BK") return "error";
    return "errorStrong";
  }

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;

  const riwayatRoster = rosters.find((r) => r.classId === riwayatClassId);
  const summary = summarizeDutyRecords(records);
  const riwayatSummary = summarizeDutyRecords(riwayatRecords);

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: "catat", label: "Catat" },
    { key: "rekap", label: "Rekap" },
    { key: "catatan", label: "Catatan" },
    { key: "poin", label: "Rekap Poin" },
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

      {/* TAB: Catat Kejadian — PIKET-QUICK-INPUT-LIST-02B list-based smart search */}
      {tab === "catat" && (
        <Card>
          <CardHeader
            title="Catat Kejadian Siswa"
            description="Cari siswa → kelas otomatis. Cari pelanggaran → poin otomatis."
          />
          {reportFinalized && (
            <div className="p-2 bg-amber-50 rounded text-xs text-amber-800 mb-3">
              ⚠ Laporan sudah difinalisasi. Buka revisi dulu.
            </div>
          )}

          <div className="space-y-4">
            {/* Filter kelas (chips) — hanya filter bantuan, BUKAN sumber data utama */}
            <div>
              <label className="label">Filter kelas</label>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setCatatClassFilter("all")}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                    catatClassFilter === "all"
                      ? "border-brand-500 bg-brand-50 ring-2 ring-brand-200"
                      : "border-slate-200"
                  }`}
                >
                  Semua
                </button>
                {rosters.map((r) => (
                  <button
                    key={r.classId}
                    type="button"
                    onClick={() => setCatatClassFilter(r.classId)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                      catatClassFilter === r.classId
                        ? "border-brand-500 bg-brand-50 ring-2 ring-brand-200"
                        : "border-slate-200"
                    }`}
                  >
                    {r.classLabel}
                  </button>
                ))}
              </div>
            </div>

            {/* Search siswa */}
            <div>
              <label className="label">Cari siswa</label>
              <input
                type="text"
                value={studentQuery}
                onChange={(e) => setStudentQuery(e.target.value)}
                placeholder="Cari siswa... (nama / nomor / NIS)"
                className="input"
              />
              {filteredStudents.length === 0 ? (
                <p className="text-xs text-slate-500 mt-2">
                  Tidak ada siswa{studentQuery ? ` untuk "${studentQuery}"` : ""}.
                </p>
              ) : (
                <ul className="mt-2 space-y-1 max-h-64 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {filteredStudents.slice(0, 50).map((s) => (
                    <li key={`${s.classId}-${s.id}`}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStudent(s);
                          // Reset pelanggaran bila siswa ganti (poin tergantung rule).
                          setSelectedRule(null);
                          setCatatan(""); setTindakLanjut("");
                        }}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                          selectedStudent?.id === s.id && selectedStudent?.classId === s.classId
                            ? "bg-brand-50"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <span className="font-medium">{s.name}</span>
                        <span className="text-xs text-slate-500 ml-2">
                          {s.classLabel} · No. {s.number ?? "-"}
                          {s.nis ? ` · NIS ${s.nis}` : ""}
                        </span>
                      </button>
                    </li>
                  ))}
                  {filteredStudents.length > 50 && (
                    <li className="px-3 py-2 text-xs text-slate-500 bg-slate-50">
                      Menampilkan 50 dari {filteredStudents.length}. Persempit pencarian untuk hasil lebih spesifik.
                    </li>
                  )}
                </ul>
              )}
            </div>

            {/* Search pelanggaran */}
            <div>
              <label className="label">Cari pelanggaran</label>
              <input
                type="text"
                value={ruleQuery}
                onChange={(e) => setRuleQuery(e.target.value)}
                placeholder="Cari pelanggaran... (nama / kategori / sinonim)"
                className="input"
              />
              {filteredRules.length === 0 ? (
                <p className="text-xs text-slate-500 mt-2">
                  Tidak ada pelanggaran{ruleQuery ? ` untuk "${ruleQuery}"` : ""}.
                </p>
              ) : (
                <ul className="mt-2 space-y-1 border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {filteredRules.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedRule(r)}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                          selectedRule?.id === r.id ? "bg-brand-50" : "hover:bg-slate-50"
                        }`}
                      >
                        <span className="font-medium">{r.label}</span>
                        <span className="text-xs text-slate-500 ml-2">
                          {categoryLabel(r.category)} · {r.points} poin
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Ringkasan sebelum simpan */}
            {(selectedStudent || selectedRule) && (
              <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                {selectedStudent && (
                  <p className="text-sm">
                    <span className="font-medium">{selectedStudent.name}</span>
                    <span className="text-xs text-slate-500"> — {selectedStudent.classLabel}</span>
                  </p>
                )}
                {selectedRule && (
                  <p className="text-sm">
                    {selectedRule.label}
                    <span className="text-xs text-slate-500 ml-1">· {selectedRule.points} poin</span>
                  </p>
                )}
              </div>
            )}

            <Textarea
              label={`Catatan tambahan${selectedRule?.type === "other" ? " (wajib untuk Lainnya)" : " (opsional)"}`}
              id="duty-note"
              value={catatan}
              onChange={setCatatan}
              rows={2}
            />
            <Textarea label="Tindak Lanjut (opsional)" id="duty-followup" value={tindakLanjut} onChange={setTindakLanjut} rows={2} />
            <Button onClick={handleCatat} disabled={reportFinalized}>Simpan Catatan</Button>
          </div>
        </Card>
      )}

      {/* TAB: Rekap Kehadiran */}
      {tab === "rekap" && (
        <Card>
          <CardHeader title="Rekap Kehadiran Hari Ini" description="Dari absen utama (read-only). Nama siswa Hadir tidak ditampilkan." />
          {attendanceDetail.length === 0 ? (
            <EmptyState title="Belum ada data" description="Belum ada kelas/roster." />
          ) : (
            <div className="space-y-3">
              {attendanceDetail.map((s) => (
                <div key={s.classId} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
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
                  {/* PIKET-REPORT-APPSCRIPT-PARITY-02A: nama siswa S/I/A */}
                  {s.source === "attendance" && (s.sick > 0 || s.excused > 0 || s.absent > 0) && (
                    <div className="text-xs text-slate-600 space-y-0.5">
                      {s.sickStudents.length > 0 && <p>Sakit: {s.sickStudents.join(", ")}</p>}
                      {s.excusedStudents.length > 0 && <p>Izin: {s.excusedStudents.join(", ")}</p>}
                      {s.absentStudents.length > 0 && <p>Alpa: {s.absentStudents.join(", ")}</p>}
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

      {/* TAB: Rekap Poin — PIKET-STUDENT-LEDGER-RECAP-04A */}
      {tab === "poin" && (
        <Card>
          <CardHeader
            title="Rekap Poin Siswa"
            description={`${ledger.length} siswa · ${ledgerRecords.length} catatan total · TP ${year?.label ?? ""}`}
          />

          {/* Detail riwayat siswa (overlay state) */}
          {ledgerDetailStudent ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-sm">
                    Riwayat {ledgerDetailStudent.studentName} — {ledgerDetailStudent.classLabel}
                  </p>
                  <p className="text-xs text-slate-500">
                    Total {ledgerDetailStudent.totalPoints} poin · {ledgerDetailStudent.totalRecords} kejadian · Status: {ledgerDetailStudent.statusLabel}
                  </p>
                </div>
                <Button variant="secondary" className="text-xs" onClick={handleCloseLedgerDetail}>
                  Tutup Riwayat
                </Button>
              </div>
              {ledgerDetailRecords.length === 0 ? (
                <EmptyState title="Belum ada riwayat" description="Siswa ini belum punya catatan piket." />
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {ledgerDetailRecords.map((r) => (
                    <div key={r.id} className="p-3 border rounded-lg">
                      <p className="text-xs text-slate-500">{formatLongDateID(r.date)}</p>
                      <p className="text-sm font-medium mt-0.5">
                        {r.ruleLabel} · {r.points} poin
                      </p>
                      {r.note && <p className="text-xs text-slate-600 mt-1">Catatan: {r.note}</p>}
                      {r.followUp && <p className="text-xs text-slate-600 mt-0.5">Tindak lanjut: {r.followUp}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Search siswa */}
              <div>
                <label className="label">Cari siswa</label>
                <input
                  type="text"
                  value={ledgerStudentQuery}
                  onChange={(e) => setLedgerStudentQuery(e.target.value)}
                  placeholder="Cari siswa... (nama / nomor / NIS)"
                  className="input"
                />
              </div>

              {/* Filter kelas (chips) */}
              <div>
                <label className="label">Filter kelas</label>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setLedgerClassFilter("all")}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                      ledgerClassFilter === "all"
                        ? "border-brand-500 bg-brand-50 ring-2 ring-brand-200"
                        : "border-slate-200"
                    }`}
                  >
                    Semua Kelas
                  </button>
                  {rosters.map((r) => (
                    <button
                      key={r.classId}
                      type="button"
                      onClick={() => setLedgerClassFilter(r.classId)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                        ledgerClassFilter === r.classId
                          ? "border-brand-500 bg-brand-50 ring-2 ring-brand-200"
                          : "border-slate-200"
                      }`}
                    >
                      {r.classLabel}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter status (chips) */}
              <div>
                <label className="label">Filter status</label>
                <div className="flex gap-2 flex-wrap">
                  {["all", "Aman", "Pembinaan ringan", "Panggilan orang tua", "Kesiswaan/BK", "Tindak lanjut khusus"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setLedgerStatusFilter(s)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                        ledgerStatusFilter === s
                          ? "border-brand-500 bg-brand-50 ring-2 ring-brand-200"
                          : "border-slate-200"
                      }`}
                    >
                      {s === "all" ? "Semua Status" : s}
                    </button>
                  ))}
                </div>
              </div>

              {/* List rekap (mobile-first) */}
              {filteredLedger.length === 0 ? (
                <EmptyState
                  title="Belum ada catatan"
                  description={ledgerRecords.length === 0
                    ? "Belum ada catatan piket tahun ini."
                    : "Tidak ada siswa yang cocok dengan filter."}
                />
              ) : (
                <div className="space-y-2">
                  {filteredLedger.map((item) => {
                    const variant = statusVariantForLabel(item.statusLabel);
                    const badgeCls = {
                      success: "border-emerald-300 bg-emerald-50 text-emerald-800",
                      warning: "border-amber-300 bg-amber-50 text-amber-800",
                      neutral: "border-orange-300 bg-orange-50 text-orange-800",
                      error: "border-rose-300 bg-rose-50 text-rose-800",
                      errorStrong: "border-rose-500 bg-rose-100 text-rose-900 font-bold",
                    }[variant];
                    return (
                      <div key={`${item.studentId}__${item.classId}`} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm">
                              {item.studentName}
                              {item.studentNumber ? <span className="text-xs text-slate-500 ml-2">No. {item.studentNumber}</span> : null}
                            </p>
                            <p className="text-xs text-slate-500">
                              {item.classLabel} · {item.totalPoints} poin · {item.totalRecords} kejadian
                              {item.lastRecordDate ? ` · terakhir ${formatLongDateID(item.lastRecordDate)}` : ""}
                            </p>
                            <span className={`inline-block mt-1.5 px-2 py-0.5 text-xs rounded border ${badgeCls}`}>
                              {item.statusLabel}
                            </span>
                          </div>
                          <Button
                            variant="secondary"
                            className="text-xs shrink-0"
                            onClick={() => handleOpenLedgerDetail(item)}
                          >
                            Lihat Riwayat
                          </Button>
                        </div>
                        {/* Breakdown by category (compact) */}
                        {(item.attendanceCount > 0 || item.disciplineCount > 0 || item.healthCount > 0 || item.permissionCount > 0 || item.otherCount > 0) && (
                          <p className="text-xs text-slate-600 mt-1.5">
                            {[
                              item.attendanceCount > 0 && `Kehadiran: ${item.attendanceCount}`,
                              item.disciplineCount > 0 && `Disiplin: ${item.disciplineCount}`,
                              item.healthCount > 0 && `Kesehatan: ${item.healthCount}`,
                              item.permissionCount > 0 && `Izin: ${item.permissionCount}`,
                              item.otherCount > 0 && `Lainnya: ${item.otherCount}`,
                            ].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* TAB: Riwayat Siswa */}
      {tab === "riwayat" && (
        <Card>
          <CardHeader title="Riwayat Siswa" description="Pilih kelas → siswa → lihat total poin + riwayat." />
          <div className="space-y-3">
            <Select label="Kelas" id="riwayat-class" value={riwayatClassId} onChange={(v) => { setRiwayatClassId(v); setRiwayatStudentId(""); setRiwayatRecords([]); }}
              options={[{ value: "", label: "-- Pilih --" }, ...rosters.map((r) => ({ value: r.classId, label: r.classLabel }))]} />
            {riwayatRoster && (
              <Select label="Siswa" id="riwayat-student" value={riwayatStudentId} onChange={setRiwayatStudentId}
                options={[{ value: "", label: "-- Pilih --" }, ...riwayatRoster.students.map((s) => ({ value: s.id, label: `${s.number}. ${s.name}` }))]} />
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
                <thead><tr><th>No</th><th>Kelas</th><th>H</th><th>S</th><th>I</th><th>A</th><th>Daftar Siswa S/I/A</th></tr></thead>
                <tbody>
                  {attendanceDetail.map((s, i) => (
                    <tr key={s.classId}>
                      <td className="text-center">{i + 1}</td>
                      <td>{s.classLabel}</td>
                      <td className="text-center">{s.source === "empty" ? "-" : s.present}</td>
                      <td className="text-center">{s.source === "empty" ? "-" : s.sick}</td>
                      <td className="text-center">{s.source === "empty" ? "-" : s.excused}</td>
                      <td className="text-center">{s.source === "empty" ? "-" : s.absent}</td>
                      <td>{s.source === "empty" ? "—" : formatSIADetail(s)}</td>
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

              {/* PIKET-STUDENT-LEDGER-RECAP-04A §12: Cetak rekap poin sederhana */}
              <div className="document-section-title">D. REKAP POIN SISWA</div>
              {ledger.length === 0 ? (
                <p style={{ fontSize: "10pt", marginTop: "4pt" }}>Belum ada catatan piket tahun ini.</p>
              ) : (
                <table className="document-table">
                  <thead><tr><th>No</th><th>Nama Siswa</th><th>Kelas</th><th>Kejadian</th><th>Total Poin</th><th>Status</th></tr></thead>
                  <tbody>
                    {ledger.map((item, i) => (
                      <tr key={`${item.studentId}__${item.classId}`}>
                        <td className="text-center">{i + 1}</td>
                        <td>{item.studentName}</td>
                        <td className="text-center">{item.classLabel}</td>
                        <td className="text-center">{item.totalRecords}</td>
                        <td className="text-center">{item.totalPoints}</td>
                        <td>{item.statusLabel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div className="document-section-title">E. TANDA TANGAN</div>
              <div className="signature-grid"><div><p>Guru Piket</p><div className="sig-space"></div><p className="sig-name">{teacher?.name ?? "-"}</p></div></div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// PIKET-QUICK-INPUT-LIST-02B: Helper untuk label kategori (UI-friendly Bahasa Indonesia).
function categoryLabel(category: DutyRule["category"]): string {
  switch (category) {
    case "attendance": return "Kehadiran";
    case "discipline": return "Kedisiplinan";
    case "health": return "Kesehatan";
    case "permission": return "Izin";
    case "other": return "Lainnya";
    default: return category;
  }
}
