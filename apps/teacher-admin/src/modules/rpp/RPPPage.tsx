/**
 * PATCH-07: RPP Template — generate placeholder untuk Word.
 * Sumber: docs/V0_6_2_PRODUCT_DECISIONS.md §8
 *
 * App simpan data identitas + hasilkan daftar placeholder.
 * Guru copy placeholder, paste ke Word template master.
 */

import { useEffect, useState } from "react";
import { Card, CardHeader, Input, Select, Button, InfoCard } from "../../shared/ui";
import { getActiveAcademicYear, getSchoolProfile, getTeacherProfile } from "../../shared/db/profile-repo";
import type { AcademicYear, SchoolProfile, TeacherProfile } from "@guru-admin/domain";

export function RPPPage() {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [school, setSchool] = useState<SchoolProfile | undefined>();
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [semester, setSemester] = useState<1 | 2>(1);
  const [tempatTTD, setTempatTTD] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [y, sp, tp] = await Promise.all([getActiveAcademicYear(), getSchoolProfile(), getTeacherProfile()]);
      setYear(y ?? null);
      setSchool(sp);
      setTeacher(tp);
      if (tp?.subjects[0]) {
        setSubject(tp.subjects[0].subject);
        setGrade(tp.subjects[0].grades[0] ?? "VII");
      }
      if (sp?.regency) setTempatTTD(sp.regency);
      setLoading(false);
    })();
  }, []);

  const placeholders: Array<{ key: string; label: string; value: string }> = [
    { key: "{{NAMA_SEKOLAH}}", label: "Nama Sekolah", value: school?.name ?? "" },
    { key: "{{NAMA_GURU}}", label: "Nama Guru", value: teacher?.name ?? "" },
    { key: "{{NIP_GURU}}", label: "NIP Guru", value: teacher?.nip ?? "" },
    { key: "{{MAPEL}}", label: "Mata Pelajaran", value: subject },
    { key: "{{KELAS}}", label: "Kelas", value: grade },
    { key: "{{SEMESTER}}", label: "Semester", value: semester === 1 ? "Ganjil" : "Genap" },
    { key: "{{TAHUN_PELAJARAN}}", label: "Tahun Pelajaran", value: year?.label ?? "" },
    { key: "{{TEMPAT_TTD}}", label: "Tempat TTD", value: tempatTTD },
    { key: "{{KEPALA_SEKOLAH}}", label: "Kepala Sekolah", value: school?.headmasterName ?? "" },
  ];

  function handleCopyAll() {
    const text = placeholders.map((p) => `${p.key} = ${p.value}`).join("\n");
    navigator.clipboard.writeText(text);
    setMessage("Semua placeholder disalin ke clipboard.");
  }

  function handleCopyKey(key: string) {
    navigator.clipboard.writeText(key);
    setMessage(`${key} disalin.`);
  }

  function handleGenerateDoc() {
    // Generate teks template dengan placeholder
    const template = `PROGRAM PEMBELAJARAN

${placeholders[0].key}
Mata Pelajaran: ${placeholders[3].key}
Kelas/Semester: ${placeholders[4].key} / ${placeholders[5].key}
Tahun Pelajaran: ${placeholders[6].key}

Guru Mata Pelajaran,
${placeholders[1].key}
NIP. ${placeholders[2].key}

Mengetahui,
Kepala Sekolah,
${placeholders[8].key}

${placeholders[7].key}, ........................`;

    navigator.clipboard.writeText(template);
    setMessage("Template RPP dengan placeholder disalin. Paste ke Word template master.");
  }

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;

  return (
    <div className="space-y-4">
      <div className="page-header">
        <h1 className="text-2xl font-bold text-slate-900">RPP Template</h1>
        <p className="text-sm text-slate-500 mt-1">Buat placeholder untuk Word. RPP tetap Word, app hanya bantu identitas.</p>
      </div>

      {message && <div className="info-banner-success">{message}</div>}

      {/* Pilih konteks */}
      <Card>
        <div className="grid sm:grid-cols-4 gap-3">
          <Select label="Mapel" id="rpp-subject" value={subject} onChange={setSubject}
            options={(teacher?.subjects ?? []).map((s) => ({ value: s.subject, label: s.subject }))} />
          <Select label="Kelas" id="rpp-grade" value={grade} onChange={setGrade}
            options={["VII", "VIII", "IX"].map((g) => ({ value: g, label: g }))} />
          <Select label="Semester" id="rpp-sem" value={String(semester)} onChange={(v) => setSemester(Number(v) as 1 | 2)}
            options={[{ value: "1", label: "Ganjil" }, { value: "2", label: "Genap" }]} />
          <Input label="Tempat TTD" id="rpp-tempat" value={tempatTTD} onChange={setTempatTTD} />
        </div>
      </Card>

      {teacher && year && (
        <InfoCard
          entries={[
            { label: "Guru", value: teacher.name },
            { label: "Mapel", value: subject || "-" },
            { label: "Kelas", value: grade || "-" },
            { label: "Semester", value: semester === 1 ? "Ganjil" : "Genap" },
            { label: "Tahun Pelajaran", value: year.label },
          ]}
        />
      )}

      {/* Daftar placeholder */}
      <Card>
        <CardHeader title="Daftar Placeholder" description="Klik placeholder untuk salin, atau salin semua." />
        <div className="flex gap-2 mb-3">
          <Button variant="secondary" className="text-sm" onClick={handleCopyAll}>Salin Semua</Button>
          <Button className="text-sm" onClick={handleGenerateDoc}>Generate Template</Button>
        </div>
        <div className="space-y-2">
          {placeholders.map((p) => (
            <div key={p.key} className="flex items-center justify-between p-2 border border-slate-200 rounded-md">
              <div>
                <code className="text-sm font-mono text-brand-700">{p.key}</code>
                <span className="text-xs text-slate-500 ml-2">{p.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-700">{p.value || <span className="text-slate-400 italic">kosong</span>}</span>
                <Button variant="secondary" className="text-xs px-2 py-1" onClick={() => handleCopyKey(p.key)}>Salin</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Catatan */}
      <Card>
        <div className="p-3 bg-amber-50 rounded-md text-sm text-amber-800">
          <p className="font-semibold">Catatan:</p>
          <ul className="list-disc pl-5 mt-1 space-y-0.5 text-xs">
            <li>RPP tetap dibuat di Word. App hanya membantu identitas.</li>
            <li>Gunakan template master asli, bukan file hasil generate.</li>
            <li>Cek identitas ganda sebelum download/print.</li>
            <li>Placeholder pakai format {`{{NAMA_VARIABEL}}`} — sesuaikan dengan template Word Anda.</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
