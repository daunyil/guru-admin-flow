/**
 * PATCH-05: Nilai Cepat — administrasi ringan, bukan sistem ujian.
 * Sumber: docs/V0_6_2_PRODUCT_DECISIONS.md §5
 *
 * Fitur: Isi Semua 80, Acak Terkontrol, Salin Sebelumnya, Paste Excel
 * Remedial otomatis < KKTP, Pengayaan ≥ 90
 */

import { useEffect, useState } from "react";
import { Card, CardHeader, Input, Select, Button, Badge, Textarea } from "../../shared/ui";
import { listClassRosters } from "../../shared/db/class-roster-repo";
import { getActiveAcademicYear, getTeacherProfile } from "../../shared/db/profile-repo";
import { db } from "../../shared/db/schema";
import { uuid, nowTimestamp } from "@guru-admin/shared";
import type { AcademicYear, TeacherProfile, ClassRoster } from "@guru-admin/domain";

interface GradeEntry {
  id: string;
  studentId: string;
  studentName: string;
  studentNumber: number;
  classId: string;
  classLabel: string;
  academicYearId: string;
  subject: string;
  semester: 1 | 2;
  dailyGrade: number | null;
  finalGrade: number | null;
  kktp: number;
  needsRemedial: boolean;
  needsEnrichment: boolean;
  createdAt: string;
  updatedAt: string;
}

export function GradesPage() {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [rosters, setRosters] = useState<ClassRoster[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [semester, setSemester] = useState<1 | 2>(1);
  const [kktp, setKktp] = useState(75);
  const [entries, setEntries] = useState<GradeEntry[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [y, tp] = await Promise.all([getActiveAcademicYear(), getTeacherProfile()]);
      setYear(y ?? null);
      setTeacher(tp);
      if (y) setRosters(await listClassRosters(y.id));
      if (tp?.subjects[0]) setSelectedSubject(tp.subjects[0].subject);
      setLoading(false);
    })();
  }, []);

  async function loadEntries() {
    if (!year || !selectedClassId || !selectedSubject) return;
    const roster = rosters.find((r) => r.id === selectedClassId);
    if (!roster) return;

    // Load from Dexie (grades table — dynamic, not in schema yet)
    const existing = await db.table("grades").toArray().catch(() => []);
    const filtered = (existing as GradeEntry[]).filter(
      (g) => g.classId === roster.classId && g.subject === selectedSubject && g.semester === semester
    );

    if (filtered.length > 0) {
      setEntries(filtered.sort((a, b) => a.studentNumber - b.studentNumber));
    } else {
      // Create entries from roster
      const newEntries: GradeEntry[] = roster.students.map((s) => ({
        id: uuid(),
        studentId: s.id,
        studentName: s.name,
        studentNumber: s.number,
        classId: roster.classId,
        classLabel: roster.classLabel,
        academicYearId: year.id,
        subject: selectedSubject,
        semester,
        dailyGrade: null,
        finalGrade: null,
        kktp,
        needsRemedial: false,
        needsEnrichment: false,
        createdAt: nowTimestamp(),
        updatedAt: nowTimestamp(),
      }));
      setEntries(newEntries);
    }
  }

  useEffect(() => {
    void loadEntries();
  }, [selectedClassId, selectedSubject, semester]);

  function setGrade(idx: number, field: "dailyGrade" | "finalGrade", value: string) {
    const num = value === "" ? null : Math.max(0, Math.min(100, Number(value)));
    const next = [...entries];
    next[idx] = { ...next[idx], [field]: num, updatedAt: nowTimestamp() };

    // Auto-detect remedial/enrichment from finalGrade
    if (field === "finalGrade" && num !== null) {
      next[idx].needsRemedial = num < next[idx].kktp;
      next[idx].needsEnrichment = num >= 90;
    }
    setEntries(next);
  }

  function handleFillAll80() {
    setEntries(entries.map((e) => ({ ...e, dailyGrade: 80, finalGrade: 80, needsRemedial: 80 < e.kktp, needsEnrichment: 80 >= 90, updatedAt: nowTimestamp() })));
    setMessage("Semua diisi 80. Klik Simpan.");
  }

  function handleRandomControlled() {
    setEntries(entries.map((e) => {
      const base = 75 + Math.floor(Math.random() * 20); // 75-94
      return { ...e, dailyGrade: base, finalGrade: base, needsRemedial: base < e.kktp, needsEnrichment: base >= 90, updatedAt: nowTimestamp() };
    }));
    setMessage("Nilai diacak terkontrol (75-94). Klik Simpan.");
  }

  function handlePasteExcel(text: string) {
    const lines = text.trim().split("\n").map((l) => l.trim()).filter(Boolean);
    const next = [...entries];
    lines.forEach((line, i) => {
      if (i < next.length) {
        const val = Number(line.replace(/[^\d.]/g, ""));
        if (!isNaN(val) && val >= 0 && val <= 100) {
          next[i] = { ...next[i], dailyGrade: val, finalGrade: val, needsRemedial: val < next[i].kktp, needsEnrichment: val >= 90, updatedAt: nowTimestamp() };
        }
      }
    });
    setEntries(next);
    setMessage("Nilai di-paste dari Excel. Klik Simpan.");
  }

  async function handleSave() {
    try {
      // Ensure grades table exists (create dynamically)
      if (!db.tables.some((t) => t.name === "grades")) {
        // Dynamic table — Dexie allows this if schema is flexible
        await db.transaction("rw", db.tables, async () => {
          for (const e of entries) {
            await db.table("grades").put(e);
          }
        });
      } else {
        for (const e of entries) {
          await db.table("grades").put(e);
        }
      }
      setMessage("Nilai tersimpan.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Gagal simpan.");
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;

  const remedialCount = entries.filter((e) => e.needsRemedial).length;
  const enrichmentCount = entries.filter((e) => e.needsEnrichment).length;

  return (
    <div className="space-y-4">
      <div className="page-header">
        <h1 className="text-2xl font-bold text-slate-900">Nilai Cepat</h1>
        <p className="text-sm text-slate-500 mt-1">Administrasi ringan — bukan sistem ujian.</p>
      </div>

      {message && <div className="info-banner-success">{message}</div>}

      {/* Selector */}
      <Card>
        <div className="grid sm:grid-cols-4 gap-3">
          <Select label="Kelas" id="g-class" value={selectedClassId} onChange={setSelectedClassId}
            options={[{ value: "", label: "-- Pilih --" }, ...rosters.map((r) => ({ value: r.id, label: r.classLabel }))]} />
          <Select label="Mapel" id="g-subject" value={selectedSubject} onChange={setSelectedSubject}
            options={(teacher?.subjects ?? []).map((s) => ({ value: s.subject, label: s.subject }))} />
          <Select label="Semester" id="g-sem" value={String(semester)} onChange={(v) => setSemester(Number(v) as 1 | 2)}
            options={[{ value: "1", label: "Semester 1" }, { value: "2", label: "Semester 2" }]} />
          <Input label="KKTP" id="g-kktp" type="number" value={String(kktp)} onChange={(v) => setKktp(Number(v) || 75)} />
        </div>
      </Card>

      {selectedClassId && entries.length > 0 && (
        <>
          {/* Quick actions */}
          <Card>
            <div className="flex gap-2 flex-wrap">
              <Button variant="secondary" className="text-sm" onClick={handleFillAll80}>Isi Semua 80</Button>
              <Button variant="secondary" className="text-sm" onClick={handleRandomControlled}>Acak Terkontrol</Button>
              <Button variant="secondary" className="text-sm" onClick={handleSave}>Simpan</Button>
            </div>
          </Card>

          {/* Summary */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-2 bg-brand-50 rounded"><p className="text-lg font-bold text-brand-700">{entries.filter((e) => e.finalGrade !== null).length}</p><p className="text-xs">Terisi</p></div>
            <div className="p-2 bg-slate-100 rounded"><p className="text-lg font-bold">{entries.length}</p><p className="text-xs">Total</p></div>
            <div className="p-2 bg-rose-50 rounded"><p className="text-lg font-bold text-rose-700">{remedialCount}</p><p className="text-xs">Remedial</p></div>
            <div className="p-2 bg-emerald-50 rounded"><p className="text-lg font-bold text-emerald-700">{enrichmentCount}</p><p className="text-xs">Pengayaan</p></div>
          </div>

          {/* Grade table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="py-2 px-2">No</th>
                    <th className="py-2 px-2">Nama</th>
                    <th className="py-2 px-2 w-24">Harian</th>
                    <th className="py-2 px-2 w-24">Akhir</th>
                    <th className="py-2 px-2 w-28">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, i) => (
                    <tr key={e.id} className="border-b border-slate-100">
                      <td className="py-1.5 px-2">{e.studentNumber}</td>
                      <td className="py-1.5 px-2">{e.studentName}</td>
                      <td className="py-1.5 px-2">
                        <input
                          type="number"
                          className="w-20 px-2 py-1 border border-slate-300 rounded text-sm"
                          value={e.dailyGrade ?? ""}
                          onChange={(ev) => setGrade(i, "dailyGrade", ev.target.value)}
                          min={0} max={100}
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        <input
                          type="number"
                          className="w-20 px-2 py-1 border border-slate-300 rounded text-sm"
                          value={e.finalGrade ?? ""}
                          onChange={(ev) => setGrade(i, "finalGrade", ev.target.value)}
                          min={0} max={100}
                        />
                      </td>
                      <td className="py-1.5 px-2">
                        {e.needsRemedial && <Badge variant="error">Remedial</Badge>}
                        {e.needsEnrichment && <Badge variant="success">Pengayaan</Badge>}
                        {!e.needsRemedial && !e.needsEnrichment && e.finalGrade !== null && <Badge variant="neutral">Tuntas</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Paste from Excel */}
          <Card>
            <CardHeader title="Paste dari Excel/CBT" description="Tempel kolom nilai (satu angka per baris)." />
            <Textarea id="paste-grades" label="" value="" onChange={handlePasteExcel} rows={5} placeholder="85\n90\n78\n..." />
          </Card>
        </>
      )}
    </div>
  );
}
