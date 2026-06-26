/**
 * PIKET-HARIAN-MOBILE-01: Halaman Piket Harian.
 * Mobile-first. Terisolasi dari app utama — tidak menulis ke attendanceRecords.
 */

import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, Input, Button, Badge, EmptyState, Textarea, PrintExportButtons } from "../../shared/ui";
import { getActiveAcademicYear, getSchoolProfile, getTeacherProfile } from "../../shared/db/profile-repo";
import { listClassRosters } from "../../shared/db/class-roster-repo";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";
import {
  listDutyRules,
  seedDefaultDutyRulesIfEmpty,
  findOrCreateDutyReport,
  getDutyReportByDate,
  updateDutyReportNote,
  finalizeDutyReport,
  unlockDutyReport,
  addDutyRecord,
  deleteDutyRecord,
  listDutyRecordsByDate,
  listDutyRecordsByAcademicYear,
  getAttendanceDetailForDate,
  syncAlpaFromAttendance,
} from "../../shared/db/daily-duty-repo";
import type {
  AcademicYear,
  ClassAttendanceDetail,
  ClassRoster,
  DutyRecord,
  DutyRule,
  SchoolProfile,
  StudentDutyLedgerItem,
  StudentSearchable,
  TeacherProfile,
} from "@guru-admin/domain";
import {
  buildStudentDutyLedger,
  filterDutyRecordsByStudent,
  formatSIADetail,
  searchDutyRules,
  searchStudents,
  summarizeDutyRecords,
  validateDutyRecordInput,
} from "@guru-admin/domain";
import { buildPiketLetter, type PiketLetterDocument, type PiketLetterType } from "./piket-letter";

type Tab = "catat" | "rekap" | "catatan" | "poin" | "cetak";

export function DailyDutyPage() {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [school, setSchool] = useState<SchoolProfile | undefined>();
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [date, setDate] = useState(todayISODate());
  const [tab, setTab] = useState<Tab>("catat");
  const [rules, setRules] = useState<DutyRule[]>([]);
  const [rosters, setRosters] = useState<ClassRoster[]>([]);
  const [records, setRecords] = useState<DutyRecord[]>([]);
  const [attendanceDetail, setAttendanceDetail] = useState<ClassAttendanceDetail[]>([]);
  const [reportNote, setReportNote] = useState("");
  const [reportFinalized, setReportFinalized] = useState(false);
  // PIKET-AUDIT-05C: message dibedakan success/error/warning + auto-dismiss
  const [message, setMessage] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);

  function notify(type: "success" | "error" | "warning", text: string) {
    setMessage({ type, text });
  }

  // PIKET-AUDIT-05C: auto-dismiss message setelah 4 detik
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(t);
  }, [message]);

  const [catatClassFilter, setCatatClassFilter] = useState<string>("all");
  const [studentQuery, setStudentQuery] = useState("");
  const [ruleQuery, setRuleQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentSearchable | null>(null);
  const [selectedRule, setSelectedRule] = useState<DutyRule | null>(null);
  const [catatan, setCatatan] = useState("");
  const [tindakLanjut, setTindakLanjut] = useState("");

  const [ledgerRecords, setLedgerRecords] = useState<DutyRecord[]>([]);
  const [ledgerClassFilter, setLedgerClassFilter] = useState<string>("all");
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState<string>("all");
  const [ledgerStudentQuery, setLedgerStudentQuery] = useState("");
  const [ledgerDetailStudent, setLedgerDetailStudent] = useState<StudentDutyLedgerItem | null>(null);
  const [ledgerDetailRecords, setLedgerDetailRecords] = useState<DutyRecord[]>([]);
  const [letterPreview, setLetterPreview] = useState<PiketLetterDocument | null>(null);

  useEffect(() => { void init(); }, []);
  useEffect(() => { if (year) void loadData(); }, [date, year]);
  useEffect(() => { if (year) void loadLedgerData(); }, [year]);

  async function init() {
    const [y, sp, tp] = await Promise.all([
      getActiveAcademicYear(),
      getSchoolProfile(),
      getTeacherProfile(),
    ]);
    setYear(y ?? null);
    setSchool(sp);
    setTeacher(tp);
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
    if (report) {
      setReportNote(report.note ?? "");
      setReportFinalized(report.finalized);
    } else {
      setReportNote("");
      setReportFinalized(false);
    }
  }

  async function loadLedgerData() {
    if (!year) return;
    const all = await listDutyRecordsByAcademicYear(year.id);
    setLedgerRecords(all);
  }

  async function refreshDutyData() {
    await Promise.all([loadData(), loadLedgerData()]);
  }

  const allStudents = useMemo<StudentSearchable[]>(() => {
    const out: StudentSearchable[] = [];
    for (const r of rosters) {
      for (const s of r.students) {
        out.push({
          id: s.id,
          name: s.name,
          number: s.number,
          nis: s.nis,
          classId: r.classId,
          classLabel: r.classLabel,
        });
      }
    }
    return out;
  }, [rosters]);

  const filteredStudents = useMemo<StudentSearchable[]>(() => {
    const byClass = catatClassFilter === "all"
      ? allStudents
      : allStudents.filter((s) => s.classId === catatClassFilter);
    return searchStudents(byClass, studentQuery);
  }, [allStudents, catatClassFilter, studentQuery]);

  const filteredRules = useMemo<DutyRule[]>(() => searchDutyRules(rules, ruleQuery), [rules, ruleQuery]);
  const ledger = useMemo<StudentDutyLedgerItem[]>(() => buildStudentDutyLedger(ledgerRecords), [ledgerRecords]);

  const filteredLedger = useMemo<StudentDutyLedgerItem[]>(() => {
    let items = ledger;
    if (ledgerClassFilter !== "all") items = items.filter((i) => i.classId === ledgerClassFilter);
    if (ledgerStatusFilter !== "all") items = items.filter((i) => i.statusLabel === ledgerStatusFilter);
    if (ledgerStudentQuery.trim()) {
      const searchable = items.map((i) => ({
        id: i.studentId,
        name: i.studentName,
        number: i.studentNumber,
        classId: i.classId,
        classLabel: i.classLabel,
      }));
      const matchedIds = new Set(searchStudents(searchable, ledgerStudentQuery).map((s) => s.id));
      items = items.filter((i) => matchedIds.has(i.studentId));
    }
    return items;
  }, [ledger, ledgerClassFilter, ledgerStatusFilter, ledgerStudentQuery]);

  async function handleCatat() {
    if (!year || !teacher) return;
    const validation = validateDutyRecordInput({ selectedStudent, selectedRule, note: catatan });
    if (!validation.ok) { notify("warning", validation.message); return; }

    try {
      const report = await findOrCreateDutyReport({
        academicYearId: year.id,
        date,
        dutyTeacherId: teacher.id,
        dutyTeacherName: teacher.name,
      });
      if (report.finalized) { notify("warning", "Laporan sudah difinalisasi. Buka revisi dulu."); return; }

      await addDutyRecord({
        dutyReportId: report.id,
        academicYearId: year.id,
        date,
        studentId: selectedStudent!.id,
        studentName: selectedStudent!.name,
        studentNumber: selectedStudent!.number,
        classId: selectedStudent!.classId,
        classLabel: selectedStudent!.classLabel,
        category: selectedRule!.category,
        type: selectedRule!.type,
        ruleId: selectedRule!.id,
        ruleLabel: selectedRule!.label,
        points: selectedRule!.points,
        source: "manual",
        attendanceLinkType: null,
        note: catatan || undefined,
        followUp: tindakLanjut || undefined,
        recordedByTeacherId: teacher.id,
        recordedByTeacherName: teacher.name,
      });
      notify("success", `Catatan tersimpan: ${selectedStudent!.name} — ${selectedRule!.label} (${selectedRule!.points} poin).`);
      setSelectedStudent(null);
      setSelectedRule(null);
      setCatatan("");
      setTindakLanjut("");
      await refreshDutyData();
    } catch (e) {
      notify("error", e instanceof Error ? e.message : "Gagal menyimpan catatan.");
    }
  }

  async function handleDeleteRecord(id: string) {
    if (!confirm("Hapus catatan ini?")) return;
    try {
      await deleteDutyRecord(id);
      notify("success", "Catatan dihapus.");
      await refreshDutyData();
    } catch (e) {
      notify("error", e instanceof Error ? e.message : "Gagal menghapus catatan.");
    }
  }

  async function handleFinalize() {
    if (!year) return;
    try {
      const report = await getDutyReportByDate(year.id, date);
      if (!report) { notify("warning", "Belum ada laporan untuk difinalisasi."); return; }
      await finalizeDutyReport(report.id);
      setReportFinalized(true);
      notify("success", "Laporan piket difinalisasi.");
    } catch (e) {
      notify("error", e instanceof Error ? e.message : "Gagal finalisasi laporan.");
    }
  }

  async function handleUnlock() {
    if (!year) return;
    try {
      const report = await getDutyReportByDate(year.id, date);
      if (!report) { notify("warning", "Belum ada laporan untuk dibuka."); return; }
      await unlockDutyReport(report.id);
      setReportFinalized(false);
      notify("success", "Laporan dibuka untuk revisi.");
    } catch (e) {
      notify("error", e instanceof Error ? e.message : "Gagal membuka revisi.");
    }
  }

  async function handleSyncAlpa() {
    if (!year || !teacher) return;
    if (reportFinalized) { notify("warning", "Laporan sudah difinalisasi. Buka revisi dulu."); return; }
    const ok = window.confirm("Sinkron Alpa dari Absen? Siswa dengan status Alpa di absen utama akan dibuat catatan piket (10 poin). Catatan yang sudah ada tidak akan dobel.");
    if (!ok) return;
    try {
      const result = await syncAlpaFromAttendance({
        academicYearId: year.id,
        date,
        dutyTeacherId: teacher.id,
        dutyTeacherName: teacher.name,
      });
      notify("success", `Sinkron Alpa: ${result.created} baru, ${result.skipped} sudah ada (skip).`);
      await refreshDutyData();
    } catch (e) {
      notify("error", e instanceof Error ? e.message : "Gagal sinkron Alpa dari absen.");
    }
  }

  async function handleSaveNote() {
    if (!year) return;
    if (!teacher?.id) { notify("error", "Profil guru belum lengkap. Buka menu Profil."); return; }
    try {
      const report = await findOrCreateDutyReport({
        academicYearId: year.id,
        date,
        dutyTeacherId: teacher.id,
        dutyTeacherName: teacher.name,
      });
      await updateDutyReportNote(report.id, reportNote);
      notify("success", "Catatan piket tersimpan.");
    } catch (e) {
      notify("error", e instanceof Error ? e.message : "Gagal menyimpan catatan umum.");
    }
  }

  function handleOpenLedgerDetail(item: StudentDutyLedgerItem) {
    setLedgerDetailStudent(item);
    setLedgerDetailRecords(filterDutyRecordsByStudent(ledgerRecords, item.studentId, item.classId));
    setLetterPreview(null);
  }

  function handleCloseLedgerDetail() {
    setLedgerDetailStudent(null);
    setLedgerDetailRecords([]);
    setLetterPreview(null);
  }

  function handleBuildLetter(letterType: PiketLetterType) {
    if (!ledgerDetailStudent || ledgerDetailRecords.length === 0) {
      notify("warning", "Data siswa atau riwayat belum tersedia.");
      return;
    }
    if (!school?.name) {
      notify("error", "Lengkapi profil sekolah terlebih dahulu.");
      return;
    }
    // PIKET-AUDIT-05C: warning bila siswa Aman (<25 poin) — surat tidak direkomendasikan
    if (ledgerDetailStudent.totalPoints < 25) {
      notify("warning", `Siswa ini berstatus "Aman" (${ledgerDetailStudent.totalPoints} poin). Surat biasanya untuk siswa dengan poin >= 25.`);
      // tetap lanjut — guru boleh membuat surat bila ingin
    }
    const letter = buildPiketLetter({
      letterType,
      schoolName: school.name,
      schoolAddress: school.address,
      principalName: school.headmasterName,
      principalNip: school.headmasterNip,
      date: todayISODate(),
      place: school.regency || school.district || "",
      studentName: ledgerDetailStudent.studentName,
      studentNumber: ledgerDetailStudent.studentNumber,
      classLabel: ledgerDetailStudent.classLabel,
      totalPoints: ledgerDetailStudent.totalPoints,
      totalRecords: ledgerDetailStudent.totalRecords,
      statusLabel: ledgerDetailStudent.statusLabel,
      records: ledgerDetailRecords,
      dutyTeacherName: teacher?.name ?? "-",
    });
    setLetterPreview(letter);
  }

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;

  const summary = summarizeDutyRecords(records);
  const tabs: Array<{ key: Tab; label: string }> = [
    { key: "catat", label: "Catat" },
    { key: "rekap", label: "Rekap" },
    { key: "catatan", label: "Catatan" },
    { key: "poin", label: "Rekap Poin" },
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

      {message && (
        <div className={`info-banner-${message.type === "success" ? "success" : message.type === "warning" ? "warning" : "error"}`}>
          {message.text}
        </div>
      )}
      <Card><Input label="Tanggal" id="duty-date" type="date" value={date} onChange={setDate} /></Card>

      <Card>
        <div className="flex gap-2 flex-wrap">
          {tabs.map((t) => <Button key={t.key} variant={tab === t.key ? "primary" : "secondary"} className="text-xs" onClick={() => setTab(t.key)}>{t.label}</Button>)}
        </div>
      </Card>

      {tab === "catat" && (
        <Card>
          <CardHeader title="Catat Kejadian Siswa" description="Cari siswa → kelas otomatis. Cari pelanggaran → poin otomatis." />
          {rosters.length === 0 ? (
            <EmptyState
              title="Belum ada data kelas/siswa"
              description="Buka menu 'Kelas dan Mapel' atau import roster siswa dulu sebelum mencatat pelanggaran."
              action={<Button variant="secondary" onClick={() => (window.location.hash = "#/roster")}>Buka Roster</Button>}
            />
          ) : (<>
          {reportFinalized && <div className="p-2 bg-amber-50 rounded text-xs text-amber-800 mb-3">⚠ Laporan sudah difinalisasi. Buka revisi dulu.</div>}
          <div className="space-y-4">
            <div>
              <label className="label">Filter kelas</label>
              <div className="flex gap-2 flex-wrap">
                <Chip active={catatClassFilter === "all"} onClick={() => setCatatClassFilter("all")}>Semua</Chip>
                {rosters.map((r) => <Chip key={r.classId} active={catatClassFilter === r.classId} onClick={() => setCatatClassFilter(r.classId)}>{r.classLabel}</Chip>)}
              </div>
            </div>
            <Input label="Cari siswa" id="student-search" value={studentQuery} onChange={setStudentQuery} placeholder="Cari siswa... (nama / nomor / NIS)" />
            {filteredStudents.length === 0 ? <p className="text-xs text-slate-500">Tidak ada siswa.</p> : (
              <ul className="mt-2 space-y-1 max-h-64 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                {filteredStudents.slice(0, 50).map((s) => (
                  <li key={`${s.classId}-${s.id}`}>
                    <button type="button" onClick={() => { setSelectedStudent(s); setSelectedRule(null); setCatatan(""); setTindakLanjut(""); }} className={`w-full text-left px-3 py-2 text-sm ${selectedStudent?.id === s.id && selectedStudent?.classId === s.classId ? "bg-brand-50" : "hover:bg-slate-50"}`}>
                      <span className="font-medium">{s.name}</span><span className="text-xs text-slate-500 ml-2">{s.classLabel} · No. {s.number ?? "-"}{s.nis ? ` · NIS ${s.nis}` : ""}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Input label="Cari pelanggaran" id="rule-search" value={ruleQuery} onChange={setRuleQuery} placeholder="Cari pelanggaran... (nama / kategori / sinonim)" />
            {filteredRules.length === 0 ? <p className="text-xs text-slate-500">Tidak ada pelanggaran.</p> : (
              <ul className="mt-2 space-y-1 border border-slate-200 rounded-lg divide-y divide-slate-100">
                {filteredRules.map((r) => (
                  <li key={r.id}>
                    <button type="button" onClick={() => setSelectedRule(r)} className={`w-full text-left px-3 py-2 text-sm ${selectedRule?.id === r.id ? "bg-brand-50" : "hover:bg-slate-50"}`}>
                      <span className="font-medium">{r.label}</span><span className="text-xs text-slate-500 ml-2">{categoryLabel(r.category)} · {r.points} poin</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {(selectedStudent || selectedRule) && (
              <div className="p-3 bg-slate-50 rounded-lg space-y-1 text-sm">
                {selectedStudent && <p><span className="font-medium">{selectedStudent.name}</span><span className="text-xs text-slate-500"> — {selectedStudent.classLabel}</span></p>}
                {selectedRule && <p>{selectedRule.label}<span className="text-xs text-slate-500 ml-1">· {selectedRule.points} poin</span></p>}
              </div>
            )}
            <Textarea label={`Catatan tambahan${selectedRule?.type === "other" ? " (wajib untuk Lainnya)" : " (opsional)"}`} id="duty-note" value={catatan} onChange={setCatatan} rows={2} />
            <Textarea label="Tindak Lanjut (opsional)" id="duty-followup" value={tindakLanjut} onChange={setTindakLanjut} rows={2} />
            <Button onClick={handleCatat} disabled={reportFinalized}>Simpan Catatan</Button>
          </div>
          </>)}
        </Card>
      )}

      {tab === "rekap" && <AttendanceRecapCard attendanceDetail={attendanceDetail} />}

      {tab === "catatan" && (
        <Card>
          <CardHeader title="Catatan Piket Hari Ini" description={`${records.length} catatan · ${summary.totalPoints} total poin`} />
          {reportFinalized && <div className="p-2 bg-emerald-50 rounded text-xs text-emerald-700 mb-3">✓ Laporan sudah difinalisasi.</div>}
          {records.length === 0 ? <EmptyState title="Belum ada catatan" description="Belum ada catatan piket untuk hari ini." /> : (
            <div className="space-y-2">
              {records.map((r) => (
                <div key={r.id} className="p-3 border rounded-lg flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1"><p className="text-sm font-medium">{r.studentName} — {r.classLabel}</p><p className="text-xs text-slate-500">{r.ruleLabel} · {r.points} poin{r.note ? ` · ${r.note}` : ""}</p></div>
                  {!reportFinalized && <Button variant="danger" className="text-xs px-2 py-1 shrink-0" onClick={() => void handleDeleteRecord(r.id)}>Hapus</Button>}
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 space-y-2">
            <Textarea label="Catatan Umum Guru Piket" id="duty-report-note" value={reportNote} onChange={setReportNote} rows={3} />
            <div className="flex gap-2 flex-wrap">
              <Button variant="secondary" className="text-sm" onClick={handleSaveNote} disabled={reportFinalized}>Simpan Catatan</Button>
              {!reportFinalized && <Button variant="secondary" className="text-sm" onClick={() => void handleSyncAlpa()}>Sinkron Alpa dari Absen</Button>}
              {!reportFinalized ? <Button className="text-sm" onClick={handleFinalize}>Finalisasi</Button> : <Button variant="secondary" className="text-sm" onClick={handleUnlock}>Buka Revisi</Button>}
            </div>
          </div>
        </Card>
      )}

      {tab === "poin" && (
        <Card>
          <CardHeader title="Rekap Poin Siswa" description={`${ledger.length} siswa · ${ledgerRecords.length} catatan total · TP ${year?.label ?? ""}`} />
          {/* PIKET-AUDIT-05C: summary stats per status */}
          {ledger.length > 0 && (
            <div className="grid grid-cols-5 gap-2 text-center mb-3 text-xs">
              <div className="p-2 bg-emerald-50 rounded"><p className="font-bold text-emerald-700">{ledger.filter((i) => i.statusLabel === "Aman").length}</p><p>Aman</p></div>
              <div className="p-2 bg-amber-50 rounded"><p className="font-bold text-amber-700">{ledger.filter((i) => i.statusLabel === "Pembinaan ringan").length}</p><p>Pembinaan</p></div>
              <div className="p-2 bg-orange-50 rounded"><p className="font-bold text-orange-700">{ledger.filter((i) => i.statusLabel === "Panggilan orang tua").length}</p><p>Panggilan</p></div>
              <div className="p-2 bg-rose-50 rounded"><p className="font-bold text-rose-700">{ledger.filter((i) => i.statusLabel === "Kesiswaan/BK").length}</p><p>BK</p></div>
              <div className="p-2 bg-rose-100 rounded"><p className="font-bold text-rose-900">{ledger.filter((i) => i.statusLabel === "Tindak lanjut khusus").length}</p><p>Khusus</p></div>
            </div>
          )}
          {ledgerDetailStudent ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div><p className="font-bold text-sm">Riwayat {ledgerDetailStudent.studentName} — {ledgerDetailStudent.classLabel}</p><p className="text-xs text-slate-500">Total {ledgerDetailStudent.totalPoints} poin · {ledgerDetailStudent.totalRecords} kejadian · Status: {ledgerDetailStudent.statusLabel}</p></div>
                <Button variant="secondary" className="text-xs" onClick={handleCloseLedgerDetail}>Tutup Riwayat</Button>
              </div>
              {ledgerDetailStudent.totalPoints >= 50 && <div className="p-2 rounded bg-amber-50 text-xs text-amber-800">Rekomendasi: Surat Panggilan Orang Tua/Wali.</div>}
              {ledgerDetailStudent.totalPoints >= 75 && <div className="p-2 rounded bg-rose-50 text-xs text-rose-800">Rekomendasi lanjutan: koordinasikan dengan Kesiswaan/BK.</div>}
              <div className="flex gap-2 flex-wrap">
                <Button className="text-xs" onClick={() => handleBuildLetter("parent_summons")}>Buat Surat Panggilan</Button>
                <Button variant="secondary" className="text-xs" onClick={() => handleBuildLetter("student_statement")}>Buat Surat Pernyataan</Button>
              </div>
              {letterPreview && <LetterPreview letter={letterPreview} onClose={() => setLetterPreview(null)} />}
              {ledgerDetailRecords.length === 0 ? <EmptyState title="Belum ada riwayat" description="Siswa ini belum punya catatan piket." /> : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {ledgerDetailRecords.map((r) => <RecordCard key={r.id} record={r} />)}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <Input label="Cari siswa" id="ledger-search" value={ledgerStudentQuery} onChange={setLedgerStudentQuery} placeholder="Cari siswa... (nama / nomor / NIS)" />
              <div><label className="label">Filter kelas</label><div className="flex gap-2 flex-wrap"><Chip active={ledgerClassFilter === "all"} onClick={() => setLedgerClassFilter("all")}>Semua Kelas</Chip>{rosters.map((r) => <Chip key={r.classId} active={ledgerClassFilter === r.classId} onClick={() => setLedgerClassFilter(r.classId)}>{r.classLabel}</Chip>)}</div></div>
              <div><label className="label">Filter status</label><div className="flex gap-2 flex-wrap">{["all", "Aman", "Pembinaan ringan", "Panggilan orang tua", "Kesiswaan/BK", "Tindak lanjut khusus"].map((s) => <Chip key={s} active={ledgerStatusFilter === s} onClick={() => setLedgerStatusFilter(s)}>{s === "all" ? "Semua Status" : s}</Chip>)}</div></div>
              {filteredLedger.length === 0 ? <EmptyState title="Belum ada catatan" description={ledgerRecords.length === 0 ? "Belum ada catatan piket tahun ini." : "Tidak ada siswa yang cocok dengan filter."} /> : (
                <div className="space-y-2">
                  {filteredLedger.map((item) => <LedgerItemCard key={`${item.studentId}__${item.classId}`} item={item} onOpen={() => handleOpenLedgerDetail(item)} />)}
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {tab === "cetak" && <PrintDutyReport date={date} yearLabel={year?.label ?? ""} teacherName={teacher?.name ?? "-"} records={records} attendanceDetail={attendanceDetail} reportNote={reportNote} ledger={ledger} />}
    </div>
  );
}

function AttendanceRecapCard({ attendanceDetail }: { attendanceDetail: ClassAttendanceDetail[] }) {
  return <Card><CardHeader title="Rekap Kehadiran Hari Ini" description="Dari absen utama (read-only). Nama siswa Hadir tidak ditampilkan." />{attendanceDetail.length === 0 ? <EmptyState title="Belum ada data" description="Belum ada kelas/roster." /> : <div className="space-y-3">{attendanceDetail.map((s) => <div key={s.classId} className="p-3 border rounded-lg"><div className="flex items-center justify-between mb-2"><span className="font-medium text-sm">{s.classLabel}</span>{s.source === "empty" ? <Badge variant="warning">Absen belum diisi</Badge> : <div className="flex gap-2 text-xs"><Badge variant="success">H {s.present}</Badge><Badge variant="warning">S {s.sick}</Badge><Badge variant="neutral">I {s.excused}</Badge><Badge variant="error">A {s.absent}</Badge></div>}</div>{s.source === "attendance" && (s.sick > 0 || s.excused > 0 || s.absent > 0) && <div className="text-xs text-slate-600 space-y-0.5">{s.sickStudents.length > 0 && <p>Sakit: {s.sickStudents.join(", ")}</p>}{s.excusedStudents.length > 0 && <p>Izin: {s.excusedStudents.join(", ")}</p>}{s.absentStudents.length > 0 && <p>Alpa: {s.absentStudents.join(", ")}</p>}</div>}</div>)}</div>}</Card>;
}

function LedgerItemCard({ item, onOpen }: { item: StudentDutyLedgerItem; onOpen: () => void }) {
  const cls = statusClass(item.statusLabel);
  return <div className="p-3 border rounded-lg"><div className="flex items-start justify-between gap-2"><div className="min-w-0 flex-1"><p className="font-medium text-sm">{item.studentName}{item.studentNumber ? <span className="text-xs text-slate-500 ml-2">No. {item.studentNumber}</span> : null}</p><p className="text-xs text-slate-500">{item.classLabel} · {item.totalPoints} poin · {item.totalRecords} kejadian{item.lastRecordDate ? ` · terakhir ${formatLongDateID(item.lastRecordDate)}` : ""}</p><span className={`inline-block mt-1.5 px-2 py-0.5 text-xs rounded border ${cls}`}>{item.statusLabel}</span></div><Button variant="secondary" className="text-xs shrink-0" onClick={onOpen}>Lihat Riwayat</Button></div><p className="text-xs text-slate-600 mt-1.5">{[item.attendanceCount > 0 && `Kehadiran: ${item.attendanceCount}`, item.disciplineCount > 0 && `Disiplin: ${item.disciplineCount}`, item.healthCount > 0 && `Kesehatan: ${item.healthCount}`, item.permissionCount > 0 && `Izin: ${item.permissionCount}`, item.otherCount > 0 && `Lainnya: ${item.otherCount}`].filter(Boolean).join(" · ")}</p></div>;
}

function RecordCard({ record }: { record: DutyRecord }) {
  return <div className="p-3 border rounded-lg"><p className="text-xs text-slate-500">{formatLongDateID(record.date)}</p><p className="text-sm font-medium mt-0.5">{record.ruleLabel} · {record.points} poin</p>{record.note && <p className="text-xs text-slate-600 mt-1">Catatan: {record.note}</p>}{record.followUp && <p className="text-xs text-slate-600 mt-0.5">Tindak lanjut: {record.followUp}</p>}</div>;
}

function LetterPreview({ letter, onClose }: { letter: PiketLetterDocument; onClose: () => void }) {
  const filename = `surat-piket-${letter.studentIdentity[0]?.value ?? "siswa"}-${letter.date}`.toLowerCase().replace(/\s+/g, "-");
  return <div className="border rounded-lg p-3 bg-white space-y-3"><div className="flex justify-between items-center gap-2"><h4 className="text-sm font-bold text-slate-800">Preview Surat</h4><div className="flex gap-2"><PrintExportButtons filename={filename} title={letter.title} orientation="portrait" targetId="print-piket-letter" /><Button variant="secondary" className="text-xs" onClick={onClose}>Tutup Preview</Button></div></div><div id="print-piket-letter" className="document-page document-portrait"><div className="text-center border-b-4 border-double border-slate-900 pb-2 mb-4"><div className="text-xs font-semibold uppercase">Pemerintah Kabupaten Bengkalis</div><div className="text-xs font-semibold uppercase">Dinas Pendidikan</div><div className="text-lg font-extrabold uppercase">{letter.schoolName}</div>{letter.schoolAddress && <div className="text-xs">Alamat: {letter.schoolAddress}</div>}</div><div className="document-title">{letter.title}</div>{letter.letterType === "parent_summons" && <table className="document-identity"><tbody><tr><td>Nomor</td><td>................................</td><td>Perihal</td><td>Panggilan Orang Tua/Wali Siswa</td></tr><tr><td>Lampiran</td><td>-</td><td>Tanggal</td><td>{formatLongDateID(letter.date)}</td></tr></tbody></table>}{letter.letterType === "parent_summons" && <p style={{ fontSize: "10pt", marginBottom: "8pt" }}>Kepada Yth.<br />Bapak/Ibu Orang Tua/Wali Siswa<br />di Tempat</p>}<p style={{ fontSize: "10.5pt", lineHeight: 1.55 }}>{letter.opening}</p><table className="document-identity"><tbody>{letter.studentIdentity.map((row) => <tr key={row.label}><td>{row.label}</td><td colSpan={3}>{row.value}</td></tr>)}</tbody></table>{letter.letterType === "parent_summons" && <table className="document-identity"><tbody><tr><td>Hari/Tanggal</td><td>................................</td><td>Waktu</td><td>Pukul ........ WIB</td></tr><tr><td>Tempat</td><td colSpan={3}>Ruang Guru / Ruang BK</td></tr></tbody></table>}{letter.bodyParagraphs.map((p) => <p key={p} style={{ fontSize: "10.5pt", lineHeight: 1.55, textAlign: "justify" }}>{p}</p>)}<div className="document-section-title">Ringkasan Catatan Piket</div><table className="document-table"><thead><tr><th>No</th><th>Tanggal</th><th>Pelanggaran</th><th>Poin</th><th>Catatan</th></tr></thead><tbody>{letter.recordRows.map((r, i) => <tr key={`${r.date}-${i}`}><td className="text-center">{i + 1}</td><td>{formatLongDateID(r.date)}</td><td>{r.violation}</td><td className="text-center">{r.points}</td><td>{r.note ?? "-"}</td></tr>)}</tbody></table>{letter.additionalNote && <p style={{ fontSize: "9.5pt" }}>{letter.additionalNote}</p>}<p style={{ fontSize: "10.5pt", lineHeight: 1.55 }}>{letter.closing}</p><p style={{ fontSize: "10.5pt", textAlign: "right" }}>{letter.place ? `${letter.place}, ` : ""}{formatLongDateID(letter.date)}</p><div style={{ display: "grid", gridTemplateColumns: `repeat(${letter.signatureBlocks.length}, 1fr)`, gap: "24px", marginTop: "24px", textAlign: "center", fontSize: "10pt" }}>{letter.signatureBlocks.map((s) => <div key={s.role}><p>{s.role}</p><div style={{ height: "56px" }} /><p style={{ fontWeight: 700, textDecoration: s.name ? "underline" : "none" }}>{s.name ?? "................................"}</p>{s.nip && <p>NIP. {s.nip}</p>}</div>)}</div></div></div>;
}

function PrintDutyReport({ date, yearLabel, teacherName, records, attendanceDetail, reportNote, ledger }: { date: string; yearLabel: string; teacherName: string; records: DutyRecord[]; attendanceDetail: ClassAttendanceDetail[]; reportNote: string; ledger: StudentDutyLedgerItem[] }) {
  // PIKET-AUDIT-05C: Mode Dokumen toggle + disable print bila tidak ada data
  const [showDocument, setShowDocument] = useState(false);
  const hasAnyData = records.length > 0 || attendanceDetail.length > 0 || ledger.length > 0;
  return (
    <Card>
      <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
        <h3 className="text-sm font-bold text-slate-700">Cetak Laporan Piket</h3>
        <div className="flex gap-2">
          <Button variant="secondary" className="text-xs" onClick={() => setShowDocument(!showDocument)}>
            {showDocument ? "Mode Kerja" : "Mode Dokumen"}
          </Button>
          <PrintExportButtons filename={`laporan-piket-${date}`} title="Laporan Piket Harian" orientation="portrait" targetId="print-duty" />
        </div>
      </div>
      {!hasAnyData && (
        <div className="p-2 bg-amber-50 rounded text-xs text-amber-800 mb-3">
          ⚠ Belum ada data untuk tanggal ini. Laporan akan kosong.
        </div>
      )}
      <div className={`print-area ${showDocument ? "block" : "hidden print:block"}`} id="print-duty">
        <div className="document-page document-portrait">
          <div className="document-title">LAPORAN PIKET HARIAN</div>
          <div className="document-subtitle">{yearLabel} · {formatLongDateID(date)}</div>
          <table className="document-identity">
            <tbody>
              <tr><td>Tanggal</td><td>{formatLongDateID(date)}</td><td>Guru Piket</td><td>{teacherName}</td></tr>
              <tr><td>Tahun Pelajaran</td><td>{yearLabel || "-"}</td><td>Catatan</td><td>{records.length} kejadian</td></tr>
            </tbody>
          </table>
          <div className="document-section-title">A. REKAP KEHADIRAN</div>
          {attendanceDetail.length === 0 ? (
            <p style={{ fontSize: "10pt", marginTop: "4pt" }}>Belum ada data kehadiran untuk tanggal ini.</p>
          ) : (
            <table className="document-table">
              <thead><tr><th>No</th><th>Kelas</th><th>H</th><th>S</th><th>I</th><th>A</th><th>Daftar Siswa S/I/A</th></tr></thead>
              <tbody>
                {attendanceDetail.map((s, i) => (
                  <tr key={s.classId}>
                    <td className="text-center">{i + 1}</td><td>{s.classLabel}</td>
                    <td className="text-center">{s.source === "empty" ? "-" : s.present}</td>
                    <td className="text-center">{s.source === "empty" ? "-" : s.sick}</td>
                    <td className="text-center">{s.source === "empty" ? "-" : s.excused}</td>
                    <td className="text-center">{s.source === "empty" ? "-" : s.absent}</td>
                    <td>{s.source === "empty" ? "—" : formatSIADetail(s)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="document-section-title">B. CATATAN KEJADIAN / PELANGGARAN</div>
          {records.length === 0 ? (
            <p style={{ fontSize: "10pt", marginTop: "4pt" }}>Belum ada catatan pelanggaran untuk tanggal ini.</p>
          ) : (
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
          )}
          {reportNote && (<><div className="document-section-title">C. CATATAN UMUM</div><p style={{ fontSize: "10pt", marginTop: "4pt" }}>{reportNote}</p></>)}
          <div className="document-section-title">D. REKAP POIN SISWA</div>
          {ledger.length === 0 ? (
            <p style={{ fontSize: "10pt", marginTop: "4pt" }}>Belum ada catatan piket tahun ini.</p>
          ) : (
            <table className="document-table">
              <thead><tr><th>No</th><th>Nama Siswa</th><th>Kelas</th><th>Kejadian</th><th>Total Poin</th><th>Status</th></tr></thead>
              <tbody>
                {ledger.map((item, i) => (
                  <tr key={`${item.studentId}__${item.classId}`}>
                    <td className="text-center">{i + 1}</td><td>{item.studentName}</td>
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
          <div className="signature-grid"><div><p>Guru Piket</p><div className="sig-space" /><p className="sig-name">{teacherName}</p></div></div>
        </div>
      </div>
    </Card>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${active ? "border-brand-500 bg-brand-50 ring-2 ring-brand-200" : "border-slate-200"}`}>{children}</button>;
}

function statusClass(label: string): string {
  if (label === "Aman") return "border-emerald-300 bg-emerald-50 text-emerald-800";
  if (label === "Pembinaan ringan") return "border-amber-300 bg-amber-50 text-amber-800";
  if (label === "Panggilan orang tua") return "border-orange-300 bg-orange-50 text-orange-800";
  if (label === "Kesiswaan/BK") return "border-rose-300 bg-rose-50 text-rose-800";
  return "border-rose-500 bg-rose-100 text-rose-900 font-bold";
}

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
