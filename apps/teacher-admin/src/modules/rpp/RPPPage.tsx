/**
 * PATCH-07: RPP Template — generate placeholder untuk Word.
 * Sumber: docs/V0_6_2_PRODUCT_DECISIONS.md §8
 *
 * App simpan data identitas + hasilkan daftar placeholder.
 * Guru copy placeholder, paste ke Word template master.
 *
 * DOCUMENT-OUTPUT-FIXPACK-01: tambah petunjuk alur pakai template yang jelas,
 * empty state bila guru belum punya mapel, await clipboard dengan error handling.
 */

import { useEffect, useState } from "react";
import { Card, CardHeader, Input, Select, Button, InfoCard, EmptyState } from "../../shared/ui";
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
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(t);
  }, [message]);

  function notify(type: "success" | "error", text: string) {
    setMessage({ type, text });
  }

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

  // DOCUMENT-OUTPUT-FIXPACK-01: await clipboard dengan error handling
  async function handleCopyAll() {
    try {
      const text = placeholders.map((p) => `${p.key} = ${p.value}`).join("\n");
      await navigator.clipboard.writeText(text);
      notify("success", "Semua placeholder disalin ke clipboard.");
    } catch {
      notify("error", "Gagal menyalin. Browser mungkin blokir clipboard. Coba klik manual dan tekan Ctrl+C.");
    }
  }

  async function handleCopyKey(key: string) {
    try {
      await navigator.clipboard.writeText(key);
      notify("success", `${key} disalin.`);
    } catch {
      notify("error", "Gagal menyalin. Coba pilih teks manual dan tekan Ctrl+C.");
    }
  }

  async function handleGenerateDoc() {
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

    try {
      await navigator.clipboard.writeText(template);
      notify("success", "Template RPP dengan placeholder disalin. Paste ke Word template master Anda.");
    } catch {
      notify("error", "Gagal menyalin template. Coba pilih teks manual dan tekan Ctrl+C.");
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;

  // DOCUMENT-OUTPUT-FIXPACK-01: empty state bila tahun/guru belum ada
  if (!year || !teacher) {
    return (
      <div className="space-y-4">
        <div className="page-header">
          <h1 className="text-2xl font-bold text-slate-900">Template / Helper RPP</h1>
          <p className="text-sm text-slate-500 mt-1">Buat placeholder untuk Word.</p>
        </div>
        <Card>
          <EmptyState
            title="Belum siap pakai template RPP"
            description="Template RPP butuh tahun pelajaran aktif + profil guru lengkap. Buka menu Profil untuk mengisi data dasar terlebih dahulu."
            action={<Button variant="secondary" onClick={() => (window.location.hash = "#/profile")}>Buka Profil</Button>}
          />
        </Card>
      </div>
    );
  }

  const hasSubjects = (teacher?.subjects ?? []).length > 0;

  return (
    <div className="space-y-4">
      <div className="page-header">
        <h1 className="text-2xl font-bold text-slate-900">Template / Helper RPP</h1>
        <p className="text-sm text-slate-500 mt-1">Buat placeholder identitas untuk Word. RPP tetap dibuat di Word, app hanya membantu identitas.</p>
      </div>

      {message && (
        <div className={`info-banner-${message.type === "success" ? "success" : "error"}`}>
          {message.text}
        </div>
      )}

      {/* DOCUMENT-OUTPUT-FIXPACK-01: Petunjuk alur pakai template */}
      <Card>
        <CardHeader title="Cara Pakai Template RPP" description="Ikuti 5 langkah berikut untuk membuat RPP dari template Word." />
        <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-700">
          <li>
            <strong>Pilih konteks</strong> di kartu "Konteks Dokumen" di bawah: mapel, kelas, semester, tempat tanda tangan.
            Identitas sekolah dan guru otomatis terisi dari Profil.
          </li>
          <li>
            <strong>Salin placeholder</strong> — klik tombol "Salin" di setiap baris, atau "Salin Semua" untuk menyalin semua
            placeholder sekaligus. Format placeholder: <code className="bg-slate-100 px-1 rounded">{`{{NAMA_VARIABEL}}`}</code>.
          </li>
          <li>
            <strong>Buka template Word master</strong> Anda (file .docx template RPP dari sekolah). Pastikan template
            menggunakan placeholder yang sama dengan format di atas.
          </li>
          <li>
            <strong>Tempel (paste)</strong> nilai placeholder ke Word, atau gunakan fitur <em>Find &amp; Replace</em> Word
            (Ctrl+H) untuk mengganti <code className="bg-slate-100 px-1 rounded">{`{{NAMA_SEKOLAH}}`}</code> dengan nama
            sekolah Anda, dst. Atau klik <strong>"Generate Template"</strong> untuk menyalin teks template lengkap yang
            sudah berisi placeholder.
          </li>
          <li>
            <strong>Cek dan cetak</strong> — periksa hasil di Word, pastikan semua identitas terisi benar, lalu cetak atau
            simpan sebagai PDF dari Word.
          </li>
        </ol>
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800">
          <p className="font-semibold">Catatan:</p>
          <ul className="list-disc pl-5 mt-1 space-y-0.5">
            <li>RPP tetap dibuat di Word. App hanya membantu identitas, bukan generate RPP utuh.</li>
            <li>Gunakan template master asli dari sekolah, bukan file hasil generate.</li>
            <li>Cek identitas ganda sebelum cetak — pastikan tidak ada placeholder tertinggal.</li>
            <li>Untuk RPP bulk (banyak kelas/mapel sekaligus), gunakan menu <strong>"RPP Bulk Replace"</strong>.</li>
          </ul>
        </div>
      </Card>

      {/* Pilih konteks */}
      <Card>
        <CardHeader title="Konteks Dokumen" description="Pilih mapel, kelas, semester, dan tempat tanda tangan." />
        {hasSubjects ? (
          <div className="grid sm:grid-cols-4 gap-3">
            <Select label="Mapel" id="rpp-subject" value={subject} onChange={setSubject}
              options={(teacher?.subjects ?? []).map((s) => ({ value: s.subject, label: s.subject }))} />
            <Select label="Kelas" id="rpp-grade" value={grade} onChange={setGrade}
              options={["VII", "VIII", "IX"].map((g) => ({ value: g, label: g }))} />
            <Select label="Semester" id="rpp-sem" value={String(semester)} onChange={(v) => setSemester(Number(v) as 1 | 2)}
              options={[{ value: "1", label: "Ganjil" }, { value: "2", label: "Genap" }]} />
            <Input label="Tempat TTD" id="rpp-tempat" value={tempatTTD} onChange={setTempatTTD} />
          </div>
        ) : (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-sm font-semibold text-amber-900">Belum ada mapel di profil guru</p>
            <p className="text-xs text-amber-800 mt-1">
              Tambahkan mapel yang Anda ampu di menu Profil (bagian "Paket Mengajar"). Setelah mapel ada, Anda bisa
              memilih konteks untuk template RPP.
            </p>
            <Button variant="secondary" className="text-xs mt-2" onClick={() => (window.location.hash = "#/profile")}>
              Buka Profil
            </Button>
          </div>
        )}
      </Card>

      {teacher && year && (
        <InfoCard
          entries={[
            { label: "Guru", value: teacher.name || "-" },
            { label: "Mapel", value: subject || "-" },
            { label: "Kelas", value: grade || "-" },
            { label: "Semester", value: semester === 1 ? "Ganjil" : "Genap" },
            { label: "Tahun Pelajaran", value: year.label || "-" },
          ]}
        />
      )}

      {/* Daftar placeholder */}
      <Card>
        <CardHeader title="Daftar Placeholder" description="Klik placeholder untuk salin, atau salin semua." />
        <div className="flex gap-2 mb-3">
          <Button variant="secondary" className="text-sm" onClick={() => void handleCopyAll()}>Salin Semua</Button>
          <Button className="text-sm" onClick={() => void handleGenerateDoc()}>Generate Template</Button>
        </div>
        <div className="space-y-2">
          {placeholders.map((p) => (
            <div key={p.key} className="flex items-center justify-between p-2 border border-slate-200 rounded-md">
              <div className="min-w-0">
                <code className="text-sm font-mono text-brand-700">{p.key}</code>
                <span className="text-xs text-slate-500 ml-2">{p.label}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm text-slate-700 truncate max-w-[12rem]">{p.value || <span className="text-slate-400 italic">kosong</span>}</span>
                <Button variant="secondary" className="text-xs px-2 py-1" onClick={() => void handleCopyKey(p.key)}>Salin</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
