/**
 * Perangkat Evaluasi — halaman /evaluation-docs
 *
 * AI-PROMPT-BRIDGE-RC1: bridge untuk perangkat evaluasi via prompt AI.
 * Flow: App data → Generate Prompt → guru copy ke Claude → paste JSON → validasi → preview → cetak.
 *
 * 3 modul:
 *   1. Rincian Minggu Efektif
 *   2. Kisi-kisi Soal (Blueprint)
 *   3. Kartu Soal (Question Card)
 */

import { useEffect, useState } from "react";
import { Card, CardHeader, Input, Textarea, Button, EmptyState, Badge, Select, InfoCard, PrintExportButtons } from "../../shared/ui";
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

type Tab = "minggu-efektif" | "kisi-kisi" | "kartu-soal";

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
    if (message?.type === "error") setTimeout(() => setMessage(null), 5000);
    if (message?.type === "success") setTimeout(() => setMessage(null), 3000);
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

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;

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
              <Button variant={tab === "minggu-efektif" ? "primary" : "secondary"} className="text-sm" onClick={() => setTab("minggu-efektif")}>Minggu Efektif</Button>
              <Button variant={tab === "kisi-kisi" ? "primary" : "secondary"} className="text-sm" onClick={() => setTab("kisi-kisi")}>Kisi-kisi Soal</Button>
              <Button variant={tab === "kartu-soal" ? "primary" : "secondary"} className="text-sm" onClick={() => setTab("kartu-soal")} disabled={!blueprintResult?.success}>Kartu Soal</Button>
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
                    <Button variant="secondary" onClick={() => setShowDocument(!showDocument)}>{showDocument ? "Mode Tabel" : "Mode Dokumen"}</Button>
                    {showDocument && (
                      <PrintExportButtons filename="minggu-efektif" title="Rincian Minggu Efektif" schoolName={school?.name} />
                    )}
                  </div>
                  {showDocument && (
                    <div className="print-area">
                      <div className="document-page document-portrait">
                        <div className="document-title">RINCIAN MINGGU EFEKTIF</div>
                        <div className="document-subtitle">{school?.name ?? "Sekolah"}</div>
                        <div className="document-subtitle">TP {year?.label} — Semester {assignment.semester === 1 ? "Ganjil" : "Genap"}</div>
                        <table className="document-identity">
                          <tbody>
                            <tr><td>Mata Pelajaran</td><td>{assignment.subject}</td><td>Kelas</td><td>{assignment.classLabel}</td></tr>
                            <tr><td>Total Minggu</td><td>{effectiveWeeks.length}</td><td>Minggu Efektif</td><td>{effectiveWeeksTotal}</td></tr>
                            <tr><td>Total JP Efektif</td><td>{effectiveJPTotal}</td><td>Tanggal</td><td>{formatLongDateID(todayISODate())}</td></tr>
                          </tbody>
                        </table>
                        <table className="document-table">
                          <thead><tr><th>No</th><th>Tanggal</th><th>Keterangan</th><th>Efektif</th><th>Hari</th><th>JP</th></tr></thead>
                          <tbody>
                            {effectiveWeeks.map((w) => (
                              <tr key={w.weekNumber}>
                                <td className="text-center">{w.weekNumber}</td>
                                <td>{w.startDate} - {w.endDate}</td>
                                <td>{w.description}</td>
                                <td className="text-center">{w.isEffective ? "Ya" : "Tidak"}</td>
                                <td className="text-center">{w.effectiveDays}</td>
                                <td className="text-center">{w.effectiveJP}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
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
                    <Card>
                      <div className="print-area">
                        <div className="document-page document-portrait">
                          <div className="document-title">KARTU SOAL</div>
                          <div className="document-subtitle">{school?.name ?? "Sekolah"}</div>
                          <div className="document-subtitle">{assignment.subject} — {assignment.classLabel} — {title || assessmentType.toUpperCase()}</div>
                          <table className="document-identity">
                            <tbody>
                              <tr><td>Guru</td><td>{assignment.teacherName}</td><td>Semester</td><td>{assignment.semester === 1 ? "Ganjil" : "Genap"}</td></tr>
                              <tr><td>Tanggal</td><td>{formatLongDateID(todayISODate())}</td><td>Total Soal</td><td>{cardResult.questions.length}</td></tr>
                            </tbody>
                          </table>
                          {cardResult.questions.map((q) => (
                            <div key={q.questionNumber} style={{ marginBottom: "12pt", pageBreakInside: "avoid" }}>
                              <table className="document-table">
                                <tbody>
                                  <tr><td style={{ fontWeight: "bold", width: "15%", background: "#f5f5f5" }}>No. {q.questionNumber}</td><td style={{ fontWeight: "bold", width: "15%", background: "#f5f5f5" }}>{q.questionType.toUpperCase()}</td><td style={{ fontWeight: "bold", width: "15%", background: "#f5f5f5" }}>{q.cognitiveLevel}</td><td style={{ fontWeight: "bold", width: "15%", background: "#f5f5f5" }}>Skor: {q.score}</td></tr>
                                  <tr><td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Soal</td><td colSpan={3}>{q.stem}</td></tr>
                                  {q.options && (
                                    <>
                                      <tr><td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Opsi A</td><td colSpan={3}>{q.options.A} {q.answerKey === "A" ? "✓ KUNCI" : ""}</td></tr>
                                      <tr><td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Opsi B</td><td colSpan={3}>{q.options.B} {q.answerKey === "B" ? "✓ KUNCI" : ""}</td></tr>
                                      <tr><td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Opsi C</td><td colSpan={3}>{q.options.C} {q.answerKey === "C" ? "✓ KUNCI" : ""}</td></tr>
                                      <tr><td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Opsi D</td><td colSpan={3}>{q.options.D} {q.answerKey === "D" ? "✓ KUNCI" : ""}</td></tr>
                                    </>
                                  )}
                                  {q.essayAnswerGuide && (
                                    <tr><td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Pedoman</td><td colSpan={3}>{q.essayAnswerGuide}</td></tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Card>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
