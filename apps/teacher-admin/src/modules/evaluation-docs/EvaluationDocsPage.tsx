/**
 * Perangkat Evaluasi — halaman /evaluation-docs
 *
 * AI-PROMPT-BRIDGE-RC1: bridge untuk perangkat evaluasi via prompt AI.
 * Flow: App data → Generate Prompt → guru copy ke Claude → paste JSON → validasi → preview → cetak.
 *
 * 5 modul:
 *   1. Rincian Minggu Efektif
 *   2. Analisis KKTP
 *   3. Kisi-kisi Soal (Blueprint)
 *   4. Kartu Soal (Question Card)
 *   5. Kisi-Kisi Penulisan Soal (Assessment Grid)
 */

import { useEffect, useState } from "react";
import { Card, CardHeader, Input, Textarea, Button, EmptyState, Badge, Select } from "../../shared/ui";
import { InfoCard } from "../../shared/ui/ContextCard";
import { PrintExportButtons } from "../../shared/ui/PrintExportButtons";
import { getActiveAcademicYear, getTeacherProfile, getSchoolProfile } from "../../shared/db/profile-repo";
import { listAssignmentsByTeacher } from "../../shared/db/teaching-assignment-repo";
import { listATPEntries } from "../../shared/db/atp-entry-repo";
import { listCalendarEvents } from "../../shared/db/calendar-repo";
import {
  generateBlueprintPrompt,
  parseBlueprintAIJson,
  generateQuestionCardPrompt,
  parseQuestionCardAIJson,
  generateEffectiveWeeks,
  type AssessmentType,
  type ParseBlueprintResult,
  type ParseQuestionCardResult,
  type EffectiveWeekItem,
} from "@guru-admin/domain";
import { filterATPForAssignment } from "@guru-admin/domain";
import type { AcademicYear, TeacherProfile, SchoolProfile, TeachingAssignment, ATPEntry } from "@guru-admin/domain";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";
import { LoadingState } from "../../shared/ui";
import {
  EffectiveWeeksDocument,
  KktpAnalysisDocument,
  AssessmentGridDocument,
  QuestionCardDocument,
  type KktpAnalysisRow,
  type AssessmentGridRow,
  type QuestionCardItem,
} from "../../shared/documents";

type Tab = "minggu-efektif" | "kktp-analisis" | "kisi-kisi" | "kartu-soal" | "kisi-kisi-soal";

export function EvaluationDocsPage() {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [, setTeacher] = useState<TeacherProfile | undefined>();
  const [school, setSchool] = useState<SchoolProfile | undefined>();
  const [assignments, setAssignments] = useState<TeachingAssignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [atpEntries, setAtpEntries] = useState<ATPEntry[]>([]);
  const [tab, setTab] = useState<Tab>("minggu-efektif");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Assessment plan form
  const [assessmentType, setAssessmentType] = useState<AssessmentType>("sumatif");
  const [title, setTitle] = useState("");
  const [selectedTpIds, setSelectedTpIds] = useState<Set<string>>(new Set());
  const [pgCount, setPgCount] = useState(5);
  const [essayCount, setEssayCount] = useState(2);
  const [jpPerWeek, setJpPerWeek] = useState(3);

  // Blueprint prompt + parse
  const [blueprintPrompt, setBlueprintPrompt] = useState("");
  const [blueprintJsonInput, setBlueprintJsonInput] = useState("");
  const [blueprintResult, setBlueprintResult] = useState<ParseBlueprintResult | null>(null);

  // Question card prompt + parse
  const [cardPrompt, setCardPrompt] = useState("");
  const [cardJsonInput, setCardJsonInput] = useState("");
  const [cardResult, setCardResult] = useState<ParseQuestionCardResult | null>(null);

  // Effective weeks
  const [effectiveWeeks, setEffectiveWeeks] = useState<EffectiveWeekItem[]>([]);

  // KKTP Analysis rows
  const [kktpRows, setKktpRows] = useState<KktpAnalysisRow[]>([]);
  const [kktpValue, setKktpValue] = useState(75);

  // Assessment Grid rows
  const [assessmentGridRows, setAssessmentGridRows] = useState<AssessmentGridRow[]>([]);
  const [assessmentGridTitle, setAssessmentGridTitle] = useState("");

  // Document mode
  const [showDocument, setShowDocument] = useState(false);

  useEffect(() => {
    void (async () => {
      const [y, tp, sp] = await Promise.all([getActiveAcademicYear(), getTeacherProfile(), getSchoolProfile()]);
      setYear(y ?? null);
      setTeacher(tp);
      setSchool(sp);
      if (y && tp) {
                const todayISO = todayISODate();
        const sem: 1 | 2 = y.semester2Start <= todayISO && todayISO <= y.semester2End ? 2 : 1;
        setAssignments(await listAssignmentsByTeacher(tp.id, y.id, sem));
        setAtpEntries(await listATPEntries({ academicYearId: y.id, teacherId: tp.id }));
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), message.type === "error" ? 5000 : 3000);
    return () => clearTimeout(t);
  }, [message]);

  function selectedAssignment(): TeachingAssignment | undefined {
    return assignments.find((a) => a.id === selectedAssignmentId);
  }

  function filteredATP(): ATPEntry[] {
    const a = selectedAssignment();
    if (!a) return [];
    return filterATPForAssignment(atpEntries, a);
  }

  function toggleTp(tpId: string) {
    const next = new Set(selectedTpIds);
    if (next.has(tpId)) next.delete(tpId);
    else next.add(tpId);
    setSelectedTpIds(next);
  }

  // --- Effective Weeks ---
  function handleGenerateWeeks() {
    if (!year) return;
    const a = selectedAssignment();
    if (!a) return;
    const semStart = a.semester === 1 ? year.semester1Start : year.semester2Start;
    const semEnd = a.semester === 1 ? year.semester1End : year.semester2End;
    void (async () => {
      const cal = await listCalendarEvents(year.id);
      const blocking = cal.filter((e) => e.blocksLearning).map((e) => ({ startDate: e.startDate, endDate: e.endDate, label: e.label }));
      const weeks = generateEffectiveWeeks({ semesterStart: semStart, semesterEnd: semEnd, blockingEvents: blocking, jpPerWeek });
      setEffectiveWeeks(weeks);
      setMessage({ type: "success", text: `${weeks.length} minggu dihitung. ${weeks.filter(w => w.isEffective).length} efektif.` });
    })();
  }

  // --- Blueprint Prompt ---
  function handleGenerateBlueprintPrompt() {
    const a = selectedAssignment();
    if (!a) return;
    const selectedTps = filteredATP().filter((t) => selectedTpIds.has(t.id)).map((t) => ({ id: t.id, tp: t.tp, material: t.bab }));
    if (selectedTps.length === 0) {
      setMessage({ type: "error", text: "Pilih minimal 1 TP." });
      return;
    }
    const prompt = generateBlueprintPrompt({
      subject: a.subject,
      classLabel: a.classLabel,
      semester: a.semester,
      assessmentType,
      title: title || `${assessmentType.toUpperCase()}`,
      multipleChoiceCount: pgCount,
      essayCount,
      tps: selectedTps,
    });
    setBlueprintPrompt(prompt);
    setMessage({ type: "success", text: "Prompt kisi-kisi dibuat. Copy lalu paste ke Claude." });
  }

  function handleParseBlueprint() {
    const a = selectedAssignment();
    if (!a) return;
    const result = parseBlueprintAIJson(blueprintJsonInput, Array.from(selectedTpIds), pgCount, essayCount);
    setBlueprintResult(result);
    if (result.success) {
      setMessage({ type: "success", text: `Kisi-kisi valid. ${result.blueprints!.length} kelompok soal.` });
    } else {
      setMessage({ type: "error", text: result.errors.join("; ") });
    }
  }

  // --- Question Card Prompt ---
  function handleGenerateCardPrompt() {
    const a = selectedAssignment();
    if (!a || !blueprintResult?.success) return;
    const prompt = generateQuestionCardPrompt({
      subject: a.subject,
      classLabel: a.classLabel,
      title: title || assessmentType.toUpperCase(),
      blueprints: blueprintResult.blueprints!,
    });
    setCardPrompt(prompt);
    setMessage({ type: "success", text: "Prompt kartu soal dibuat. Copy lalu paste ke Claude." });
  }

  function handleParseCard() {
    if (!blueprintResult?.success) return;
    const allNumbers = blueprintResult.blueprints!.flatMap((b) => b.questionNumbers);
    const pgNumbers = blueprintResult.blueprints!.filter((b) => b.questionType === "pg").flatMap((b) => b.questionNumbers);
    const essayNumbers = blueprintResult.blueprints!.filter((b) => b.questionType === "esai").flatMap((b) => b.questionNumbers);
    const result = parseQuestionCardAIJson(cardJsonInput, allNumbers, pgNumbers, essayNumbers);
    setCardResult(result);
    if (result.success) {
      setMessage({ type: "success", text: `Kartu soal valid. ${result.questions!.length} soal.` });
    } else {
      setMessage({ type: "error", text: result.errors.join("; ") });
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setMessage({ type: "success", text: "Disalin ke clipboard." });
  }

  if (loading) return <LoadingState />;

  const assignment = selectedAssignment();
  const effectiveWeeksTotal = effectiveWeeks.filter((w) => w.isEffective).length;
  const effectiveJPTotal = effectiveWeeks.reduce((sum, w) => sum + w.effectiveJP, 0);

  return (
    <div className="space-y-4">
      <div className="page-header">
        <h1 className="text-2xl font-bold text-slate-900">Perangkat Evaluasi</h1>
        <p className="text-sm text-slate-500 mt-1">
          {year ? `TP ${year.label}` : "Belum ada tahun aktif"} · Kisi-kisi, Kartu Soal, Minggu Efektif via AI Prompt Bridge.
        </p>
      </div>

      {message && (
        <div className={`info-banner-${message.type === "success" ? "success" : "error"}`}>
          {message.text}
        </div>
      )}

      {/* Pilih Kelas dan Mapel */}
      <Card>
        <CardHeader title="1. Pilih Kelas dan Mapel" description="Filter TP + konteks dari assignment." />
        {assignments.length === 0 ? (
          <EmptyState title="Belum ada Kelas dan Mapel" description="Buka menu Kelas dan Mapel dulu." />
        ) : (
          <div className="space-y-3">
            <Select
              label="Kelas dan Mapel"
              id="ev-asg"
              value={selectedAssignmentId}
              onChange={setSelectedAssignmentId}
              options={[
                { value: "", label: "-- Pilih --" },
                ...assignments.map((a) => ({ value: a.id, label: `${a.classLabel} · ${a.subject} · ${a.teacherName}` })),
              ]}
            />
            {assignment && (
              <InfoCard entries={[
                { label: "Guru", value: assignment.teacherName },
                { label: "Mapel", value: assignment.subject },
                { label: "Kelas", value: assignment.classLabel },
                { label: "Semester", value: String(assignment.semester) },
                { label: "Tahun", value: year?.label ?? "-" },
              ]} />
            )}
          </div>
        )}
      </Card>

      {assignment && (
        <>
          {/* Tab selector */}
          <Card>
            <div className="flex gap-2 flex-wrap">
              <Button variant={tab === "minggu-efektif" ? "primary" : "secondary"} className="text-sm" onClick={() => { setTab("minggu-efektif"); setShowDocument(false); }}>Minggu Efektif</Button>
              <Button variant={tab === "kktp-analisis" ? "primary" : "secondary"} className="text-sm" onClick={() => { setTab("kktp-analisis"); setShowDocument(false); }}>Analisis KKTP</Button>
              <Button variant={tab === "kisi-kisi" ? "primary" : "secondary"} className="text-sm" onClick={() => { setTab("kisi-kisi"); setShowDocument(false); }}>Kisi-kisi Soal</Button>
              <Button variant={tab === "kartu-soal" ? "primary" : "secondary"} className="text-sm" onClick={() => { setTab("kartu-soal"); setShowDocument(false); }} disabled={!blueprintResult?.success}>Kartu Soal</Button>
              <Button variant={tab === "kisi-kisi-soal" ? "primary" : "secondary"} className="text-sm" onClick={() => { setTab("kisi-kisi-soal"); setShowDocument(false); }}>Kisi-Kisi Penulisan Soal</Button>
            </div>
          </Card>

          {/* TAB: Minggu Efektif */}
          {tab === "minggu-efektif" && (
            <Card>
              <CardHeader title="Rincian Minggu Efektif" description="Hitung dari Kalender Pendidikan dan hari tidak efektif." />
              <div className="flex gap-3 items-end">
                <Input label="JP per Minggu" id="ev-jp" type="number" value={String(jpPerWeek)} onChange={(v) => setJpPerWeek(Number(v) || 3)} hint="Default 3 JP/minggu." />
                <Button onClick={handleGenerateWeeks}>Hitung Minggu Efektif</Button>
              </div>
              {effectiveWeeks.length > 0 && (
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-2 bg-slate-50 rounded"><p className="text-xl font-bold">{effectiveWeeks.length}</p><p className="text-xs">Total Minggu</p></div>
                    <div className="p-2 bg-brand-50 rounded"><p className="text-xl font-bold text-brand-700">{effectiveWeeksTotal}</p><p className="text-xs">Efektif</p></div>
                    <div className="p-2 bg-amber-50 rounded"><p className="text-xl font-bold text-amber-700">{effectiveJPTotal}</p><p className="text-xs">JP Efektif</p></div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-left">
                          <th className="py-2 px-2">Minggu</th>
                          <th className="py-2 px-2">Tanggal</th>
                          <th className="py-2 px-2">Keterangan</th>
                          <th className="py-2 px-2 text-center">Efektif?</th>
                          <th className="py-2 px-2 text-center">Hari</th>
                          <th className="py-2 px-2 text-center">JP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {effectiveWeeks.map((w) => (
                          <tr key={w.weekNumber} className="border-b border-slate-100">
                            <td className="py-1.5 px-2 font-medium">{w.weekNumber}</td>
                            <td className="py-1.5 px-2 text-xs">{w.startDate} - {w.endDate}</td>
                            <td className="py-1.5 px-2 text-xs">{w.description}{w.notes ? ` (${w.notes})` : ""}</td>
                            <td className="py-1.5 px-2 text-center">{w.isEffective ? <Badge variant="success">Ya</Badge> : <Badge variant="error">Tidak</Badge>}</td>
                            <td className="py-1.5 px-2 text-center">{w.effectiveDays}</td>
                            <td className="py-1.5 px-2 text-center">{w.effectiveJP}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setShowDocument(!showDocument)}>{showDocument ? "Mode Tabel" : "Cetak Dokumen"}</Button>
                    {showDocument && (
                      <PrintExportButtons filename="minggu-efektif" title="Rincian Minggu Efektif" schoolName={school?.name} />
                    )}
                  </div>
                  {showDocument && (
                    <EffectiveWeeksDocument
                      withPrintArea={true}
                      data={{
                        context: {
                          schoolName: school?.name,
                          schoolAddress: school?.address,
                          schoolOffice: "Dinas Pendidikan",
                          institutionName: "",
                          academicYear: year?.label,
                          semester: assignment.semester === 1 ? "Ganjil" : "Genap",
                          teacherName: assignment.teacherName,
                          subject: assignment.subject,
                          classLabel: assignment.classLabel,
                          headmasterName: school?.headmasterName,
                          headmasterNip: school?.headmasterNip,
                          place: school?.regency ?? "",
                          dateLabel: formatLongDateID(todayISODate()),
                        },
                        rows: effectiveWeeks.map((w) => ({
                          month: w.description || `Minggu ${w.weekNumber}`,
                          totalWeeks: w.isEffective ? 1 : 0,
                          nonEffectiveWeeks: w.isEffective ? 0 : 1,
                          effectiveWeeks: w.isEffective ? 1 : 0,
                          activities: w.notes || w.description || "",
                        })),
                        allocations: [{
                          component: `${assignment.subject} — ${assignment.classLabel}`,
                          jpPerWeek,
                          totalWeeks: effectiveWeeksTotal,
                          totalJp: effectiveJPTotal,
                        }],
                        totalEffectiveWeeks: effectiveWeeksTotal,
                        totalJp: effectiveJPTotal,
                      }}
                    />
                  )}
                </div>
              )}
            </Card>
          )}

          {/* TAB: KKTP Analisis */}
          {tab === "kktp-analisis" && (
            <>
              <Card>
                <CardHeader title="Analisis KKTP" description="Pemetaan kriteria ketercapaian tujuan pembelajaran berdasarkan interval nilai/rubrik." />
                <div className="space-y-3">
                  <Input label="KKTP / KKM" id="ev-kktp" type="number" value={String(kktpValue)} onChange={(v) => setKktpValue(Number(v) || 75)} hint="Nilai batas ketuntasan (default 75)." />
                  <div>
                    <p className="label">Pilih TP & tentukan interval ketercapaian:</p>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {filteredATP().length === 0 ? (
                        <p className="text-sm text-slate-500">Belum ada TP untuk assignment ini.</p>
                      ) : (
                        filteredATP().map((tp) => (
                          <label key={tp.id} className="flex items-center gap-2 p-2 border border-slate-200 rounded">
                            <input type="checkbox" checked={selectedTpIds.has(tp.id)} onChange={() => toggleTp(tp.id)} className="mt-0.5" />
                            <div className="flex-1 text-sm">
                              <span className="font-medium">{tp.tp}</span>
                              <span className="text-xs text-slate-500 ml-2">Elemen: {tp.elemen ?? "-"}</span>
                            </div>
                            <Select
                              label=""
                              id={`interval-${tp.id}`}
                              value={String(kktpRows.find(r => r.learningObjective === tp.tp)?.intervalIndex ?? -1)}
                              onChange={(v) => {
                                const idx = Number(v);
                                setKktpRows(prev => {
                                  const existing = prev.findIndex(r => r.learningObjective === tp.tp);
                                  if (existing >= 0) {
                                    const next = [...prev];
                                    next[existing] = { ...next[existing], intervalIndex: idx >= 0 ? idx : undefined };
                                    return next;
                                  }
                                  return [...prev, { element: tp.elemen ?? "", learningObjective: tp.tp, intervalIndex: idx >= 0 ? idx : undefined }];
                                });
                              }}
                              options={[
                                { value: "-1", label: "— belum ditentukan —" },
                                { value: "0", label: "0–60% (Perlu Bimbingan)" },
                                { value: "1", label: "61–70% (Cukup)" },
                                { value: "2", label: "71–80% (Baik)" },
                                { value: "3", label: "81–100% (Sangat Baik)" },
                              ]}
                            />
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                  <Button onClick={() => {
                    const rows = filteredATP().filter(t => selectedTpIds.has(t.id)).map(t => {
                      const existing = kktpRows.find(r => r.learningObjective === t.tp);
                      return existing ?? { element: t.elemen ?? "", learningObjective: t.tp, intervalIndex: undefined };
                    });
                    setKktpRows(rows);
                    setMessage({ type: "success", text: `${rows.length} TP dimasukkan ke tabel KKTP.` });
                  }} disabled={selectedTpIds.size === 0}>
                    Buat Tabel KKTP
                  </Button>
                </div>
              </Card>

              {kktpRows.length > 0 && (
                <>
                  <Card>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => setShowDocument(!showDocument)}>
                        {showDocument ? "Mode Input" : "Cetak Dokumen"}
                      </Button>
                      {showDocument && (
                        <PrintExportButtons filename="analisis-kktp" title="Analisis KKTP" schoolName={school?.name} />
                      )}
                    </div>
                  </Card>
                  {showDocument && (
                    <KktpAnalysisDocument
                      withPrintArea={true}
                      data={{
                        context: {
                          schoolName: school?.name,
                          schoolAddress: school?.address,
                          schoolOffice: "Dinas Pendidikan",
                          academicYear: year?.label,
                          semester: assignment.semester === 1 ? "Ganjil" : "Genap",
                          teacherName: assignment.teacherName,
                          subject: assignment.subject,
                          classLabel: assignment.classLabel,
                          headmasterName: school?.headmasterName,
                          headmasterNip: school?.headmasterNip,
                          place: school?.regency ?? "",
                          dateLabel: formatLongDateID(todayISODate()),
                        },
                        kktp: kktpValue,
                        rows: kktpRows,
                      }}
                    />
                  )}
                </>
              )}
            </>
          )}

          {/* TAB: Kisi-kisi */}
          {tab === "kisi-kisi" && (
            <>
              <Card>
                <CardHeader title="2. Buat Assessment Plan" description="Pilih TP, jenis penilaian, jumlah soal." />
                <div className="space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Select label="Jenis Penilaian" id="ev-type" value={assessmentType} onChange={(v) => setAssessmentType(v as AssessmentType)}
                      options={[{value:"sumatif",label:"Sumatif"},{value:"pts",label:"PTS"},{value:"pas",label:"PAS"},{value:"uas",label:"UAS"}]} />
                    <Input label="Judul" id="ev-title" value={title} onChange={setTitle} placeholder="Sumatif Bab 1" />
                    <Input label="Jumlah PG" id="ev-pg" type="number" value={String(pgCount)} onChange={(v) => setPgCount(Number(v) || 0)} />
                    <Input label="Jumlah Esai" id="ev-essay" type="number" value={String(essayCount)} onChange={(v) => setEssayCount(Number(v) || 0)} />
                  </div>

                  <div>
                    <p className="label">Pilih TP (dari Bank TP):</p>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {filteredATP().length === 0 ? (
                        <p className="text-sm text-slate-500">Belum ada TP untuk assignment ini. Tambah di menu Bank TP.</p>
                      ) : (
                        filteredATP().map((tp) => (
                          <label key={tp.id} className="flex items-start gap-2 p-2 border border-slate-200 rounded cursor-pointer hover:bg-slate-50">
                            <input type="checkbox" checked={selectedTpIds.has(tp.id)} onChange={() => toggleTp(tp.id)} className="mt-1" />
                            <div className="text-sm">
                              <p className="font-medium">{tp.tp}</p>
                              <p className="text-xs text-slate-500">Bab {tp.bab ?? "-"} · {tp.alokasiJP} JP · {tp.elemen ?? "-"}</p>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  <Button onClick={handleGenerateBlueprintPrompt} disabled={selectedTpIds.size === 0}>
                    Buat Prompt AI Kisi-kisi
                  </Button>
                </div>
              </Card>

              {blueprintPrompt && (
                <Card>
                  <CardHeader title="3. Prompt Kisi-kisi untuk Claude" description="Copy prompt ini, paste ke Claude, tunggu jawaban JSON." />
                  <Textarea id="bp-prompt" label="" value={blueprintPrompt} onChange={() => {}} rows={10} />
                  <div className="mt-2"><Button variant="secondary" onClick={() => copyToClipboard(blueprintPrompt)}>Salin Prompt ke AI</Button></div>
                </Card>
              )}

              <Card>
                <CardHeader title="4. Paste JSON dari Claude" description="Paste hasil JSON dari Claude di sini." />
                <Textarea id="bp-json" label="" value={blueprintJsonInput} onChange={setBlueprintJsonInput} rows={8} placeholder='{"blueprints":[...]}' />
                <div className="mt-2"><Button onClick={handleParseBlueprint} disabled={!blueprintJsonInput.trim()}>Periksa &amp; Simpan Kisi-kisi</Button></div>
              </Card>

              {blueprintResult?.success && blueprintResult.blueprints && (
                <Card>
                  <CardHeader title="5. Preview Kisi-kisi" description={`${blueprintResult.blueprints.length} kelompok soal`} />
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead><tr className="border-b border-slate-200 text-left">
                        <th className="py-2 px-2">No</th><th className="py-2 px-2">TP</th><th className="py-2 px-2">Materi</th>
                        <th className="py-2 px-2">Kognitif</th><th className="py-2 px-2">Tipe</th><th className="py-2 px-2">Nomor Soal</th>
                      </tr></thead>
                      <tbody>
                        {blueprintResult.blueprints.map((bp, i) => (
                          <tr key={i} className="border-b border-slate-100">
                            <td className="py-1.5 px-2">{i + 1}</td>
                            <td className="py-1.5 px-2 text-xs">{bp.tpText}</td>
                            <td className="py-1.5 px-2 text-xs">{bp.material ?? "-"}</td>
                            <td className="py-1.5 px-2"><Badge variant="neutral">{bp.cognitiveLevel}</Badge></td>
                            <td className="py-1.5 px-2"><Badge variant={bp.questionType === "pg" ? "success" : "warning"}>{bp.questionType.toUpperCase()}</Badge></td>
                            <td className="py-1.5 px-2 text-xs">{bp.questionNumbers.join(", ")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3">
                    <Button onClick={handleGenerateCardPrompt}>Buat Prompt AI Kartu Soal</Button>
                    <Button variant="secondary" className="ml-2" onClick={() => setTab("kartu-soal")}>Lanjut ke Kartu Soal</Button>
                  </div>
                </Card>
              )}
            </>
          )}

          {/* TAB: Kartu Soal */}
          {tab === "kartu-soal" && (
            <>
              {cardPrompt && (
                <Card>
                  <CardHeader title="6. Prompt Kartu Soal untuk Claude" description="Copy, paste ke Claude, tunggu JSON." />
                  <Textarea id="qc-prompt" label="" value={cardPrompt} onChange={() => {}} rows={10} />
                  <div className="mt-2"><Button variant="secondary" onClick={() => copyToClipboard(cardPrompt)}>Salin Prompt ke AI</Button></div>
                </Card>
              )}

              <Card>
                <CardHeader title="7. Paste JSON Kartu Soal dari Claude" />
                <Textarea id="qc-json" label="" value={cardJsonInput} onChange={setCardJsonInput} rows={8} placeholder='{"questions":[...]}' />
                <div className="mt-2"><Button onClick={handleParseCard} disabled={!cardJsonInput.trim()}>Periksa &amp; Simpan Kartu Soal</Button></div>
              </Card>

              {cardResult?.success && cardResult.questions && (
                <>
                  <Card>
                    <CardHeader title="8. Preview Kartu Soal" description={`${cardResult.questions.length} soal`} />
                    <div className="space-y-3">
                      {cardResult.questions.map((q) => (
                        <div key={q.questionNumber} className="p-3 border border-slate-200 rounded-md">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="neutral">No. {q.questionNumber}</Badge>
                            <Badge variant={q.questionType === "pg" ? "success" : "warning"}>{q.questionType.toUpperCase()}</Badge>
                            <Badge variant="neutral">{q.cognitiveLevel}</Badge>
                            <Badge variant="neutral">Skor: {q.score}</Badge>
                          </div>
                          <p className="text-sm font-medium">{q.stem}</p>
                          {q.options && (
                            <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
                              <p>A. {q.options.A} {q.answerKey === "A" && "✓"}</p>
                              <p>B. {q.options.B} {q.answerKey === "B" && "✓"}</p>
                              <p>C. {q.options.C} {q.answerKey === "C" && "✓"}</p>
                              <p>D. {q.options.D} {q.answerKey === "D" && "✓"}</p>
                            </div>
                          )}
                          {q.essayAnswerGuide && (
                            <div className="mt-2 p-2 bg-slate-50 rounded text-xs">
                              <p className="font-semibold">Pedoman Jawaban:</p>
                              <p>{q.essayAnswerGuide}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card>
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="secondary" onClick={() => setShowDocument(!showDocument)}>
                        {showDocument ? "Mode Preview" : "Mode Dokumen (Cetak)"}
                      </Button>
                      {showDocument && (
                        <PrintExportButtons filename="kartu-soal" title="Kartu Soal" schoolName={school?.name} />
                      )}
                    </div>
                  </Card>

                  {showDocument && (
                    <QuestionCardDocument
                      withPrintArea={true}
                      data={{
                        context: {
                          schoolName: school?.name,
                          schoolAddress: school?.address,
                          schoolOffice: "Dinas Pendidikan",
                          academicYear: year?.label,
                          semester: assignment.semester === 1 ? "Ganjil" : "Genap",
                          teacherName: assignment.teacherName,
                          subject: assignment.subject,
                          classLabel: assignment.classLabel,
                          headmasterName: school?.headmasterName,
                          headmasterNip: school?.headmasterNip,
                          place: school?.regency ?? "",
                          dateLabel: formatLongDateID(todayISODate()),
                        },
                        assessmentTitle: `${title || assessmentType.toUpperCase()} — ${assignment.subject} ${assignment.classLabel}`,
                        items: cardResult.questions.map((q): QuestionCardItem => ({
                          number: q.questionNumber,
                          competency: "—",
                          material: "—",
                          indicator: "—",
                          cognitiveLevel: q.cognitiveLevel,
                          questionForm: q.questionType === "pg" ? "Pilihan Ganda" : "Esai",
                          questionText: q.stem,
                          options: q.options ? [
                            { label: "A", text: q.options.A },
                            { label: "B", text: q.options.B },
                            { label: "C", text: q.options.C },
                            { label: "D", text: q.options.D },
                          ] : undefined,
                          answerKey: q.answerKey,
                          scoringGuide: q.essayAnswerGuide,
                        })),
                      }}
                    />
                  )}
                </>
              )}
            </>
          )}

          {/* TAB: Kisi-Kisi Penulisan Soal (Assessment Grid) */}
          {tab === "kisi-kisi-soal" && (
            <>
              <Card>
                <CardHeader title="Kisi-Kisi Penulisan Soal" description="Matriks pemetaan kisi-kisi penyusunan soal asesmen (STS/SAS)." />
                <div className="space-y-3">
                  <Input label="Judul Asesmen" id="ev-grid-title" value={assessmentGridTitle} onChange={setAssessmentGridTitle} placeholder="Sumatif Akhir Semester (SAS) Ganjil 2025/2026" />
                  <div>
                    <p className="label">Pilih TP untuk kisi-kisi:</p>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {filteredATP().length === 0 ? (
                        <p className="text-sm text-slate-500">Belum ada TP untuk assignment ini.</p>
                      ) : (
                        filteredATP().map((tp) => (
                          <label key={tp.id} className="flex items-start gap-2 p-2 border border-slate-200 rounded cursor-pointer hover:bg-slate-50">
                            <input type="checkbox" checked={selectedTpIds.has(tp.id)} onChange={() => toggleTp(tp.id)} className="mt-1" />
                            <div className="text-sm">
                              <p className="font-medium">{tp.tp}</p>
                              <p className="text-xs text-slate-500">Bab {tp.bab ?? "-"} · {tp.elemen ?? "-"}</p>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                  <Button onClick={() => {
                    const rows: AssessmentGridRow[] = filteredATP().filter(t => selectedTpIds.has(t.id)).map((t, i) => ({
                      no: i + 1,
                      element: t.elemen ?? "—",
                      material: t.bab ?? "—",
                      indicator: t.tp ?? "—",
                      questionForm: "—",
                      cognitiveLevel: "—",
                      questionNumbers: "—",
                    }));
                    setAssessmentGridRows(rows);
                    setMessage({ type: "success", text: `${rows.length} baris kisi-kisi dibuat. Isi detail per baris di tabel di bawah.` });
                  }} disabled={selectedTpIds.size === 0}>
                    Buat Kisi-Kisi dari TP
                  </Button>
                </div>
              </Card>

              {assessmentGridRows.length > 0 && (
                <Card>
                  <CardHeader title="Edit Detail Kisi-Kisi" description="Isi indikator soal, bentuk soal, level kognitif, dan nomor soal per baris." />
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-left">
                          <th className="py-2 px-2">No</th><th className="py-2 px-2">Elemen</th><th className="py-2 px-2">Materi</th>
                          <th className="py-2 px-2">Indikator Soal</th><th className="py-2 px-2">Bentuk Soal</th>
                          <th className="py-2 px-2">Level</th><th className="py-2 px-2">No. Soal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assessmentGridRows.map((row, i) => (
                          <tr key={i} className="border-b border-slate-100">
                            <td className="py-1.5 px-2 text-center">{row.no}</td>
                            <td className="py-1.5 px-2 text-xs">{row.element}</td>
                            <td className="py-1.5 px-2 text-xs">{row.material}</td>
                            <td className="py-1.5 px-2">
                              <Input label="Indikator" id={`grid-ind-${i}`} value={row.indicator ?? "—"} onChange={(v) => {
                                setAssessmentGridRows(prev => { const next = [...prev]; next[i] = { ...next[i], indicator: v }; return next; });
                              }} />
                            </td>
                            <td className="py-1.5 px-2">
                              <Select label="Bentuk" id={`grid-form-${i}`} value={row.questionForm ?? "—"} onChange={(v) => {
                                setAssessmentGridRows(prev => { const next = [...prev]; next[i] = { ...next[i], questionForm: v }; return next; });
                              }} options={[{value:"Pilihan Ganda",label:"Pilihan Ganda"},{value:"Esai",label:"Esai"},{value:"Uraian",label:"Uraian"},{value:"—",label:"—"}]} />
                            </td>
                            <td className="py-1.5 px-2">
                              <Select label="Level" id={`grid-level-${i}`} value={row.cognitiveLevel ?? "—"} onChange={(v) => {
                                setAssessmentGridRows(prev => { const next = [...prev]; next[i] = { ...next[i], cognitiveLevel: v }; return next; });
                              }} options={[{value:"C1",label:"C1 (Mengingat)"},{value:"C2",label:"C2 (Memahami)"},{value:"C3",label:"C3 (Menerapkan)"},{value:"C4",label:"C4 (Menganalisis)"},{value:"C5",label:"C5 (Mengevaluasi)"},{value:"C6",label:"C6 (Mencipta)"},{value:"L1",label:"L1"},{value:"L2",label:"L2"},{value:"L3",label:"L3"},{value:"—",label:"—"}]} />
                            </td>
                            <td className="py-1.5 px-2">
                              <Input label="No. Soal" id={`grid-num-${i}`} value={row.questionNumbers ?? "—"} onChange={(v) => {
                                setAssessmentGridRows(prev => { const next = [...prev]; next[i] = { ...next[i], questionNumbers: v }; return next; });
                              }} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button variant="secondary" onClick={() => setShowDocument(!showDocument)}>
                      {showDocument ? "Mode Edit" : "Cetak Dokumen"}
                    </Button>
                    {showDocument && (
                      <PrintExportButtons filename="kisi-kisi-penulisan-soal" title="Kisi-Kisi Penulisan Soal" schoolName={school?.name} />
                    )}
                  </div>
                </Card>
              )}

              {showDocument && assessmentGridRows.length > 0 && (
                <AssessmentGridDocument
                  withPrintArea={true}
                  data={{
                    context: {
                      schoolName: school?.name,
                      schoolAddress: school?.address,
                      schoolOffice: "Dinas Pendidikan",
                      academicYear: year?.label,
                      semester: assignment.semester === 1 ? "Ganjil" : "Genap",
                      teacherName: assignment.teacherName,
                      subject: assignment.subject,
                      classLabel: assignment.classLabel,
                      headmasterName: school?.headmasterName,
                      headmasterNip: school?.headmasterNip,
                      place: school?.regency ?? "",
                      dateLabel: formatLongDateID(todayISODate()),
                    },
                    assessmentTitle: assessmentGridTitle || `Asesmen ${assignment.subject} ${assignment.classLabel}`,
                    rows: assessmentGridRows,
                  }}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
