/**
 * PATCH-06: Bank ATP/TP + LKPD + AI Prompt Generator.
 * Sumber: docs/V0_6_2_PRODUCT_DECISIONS.md §6, §7
 *
 * ATP/TP menyimpan: kelas, bab, elemen, CP, TP, profil Pelajar Pancasila, kata kunci, alokasi JP.
 * LKPD wajib pilih TP.
 * AI hanya prompt generator — guru klik "Salin Prompt".
 */

import { useEffect, useState } from "react";
import { Card, CardHeader, Input, Textarea, Button, EmptyState, Badge } from "../../shared/ui";
import { getActiveAcademicYear, getTeacherProfile } from "../../shared/db/profile-repo";
import { db } from "../../shared/db/schema";
import { uuid, nowTimestamp } from "@guru-admin/shared";
import type { AcademicYear, TeacherProfile } from "@guru-admin/domain";

interface ATPEntry {
  id: string;
  academicYearId: string;
  teacherId: string;
  subject: string;
  grade: string;
  phase: string;
  bab: string;
  elemen: string;
  cp: string;
  tp: string;
  profilPelajar: string;
  kataKunci: string;
  alokasiJP: number;
  createdAt: string;
  updatedAt: string;
}

export function ATPPage() {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [entries, setEntries] = useState<ATPEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ATPEntry | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showAIPrompt, setShowAIPrompt] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [y, tp] = await Promise.all([getActiveAcademicYear(), getTeacherProfile()]);
      setYear(y ?? null);
      setTeacher(tp);
      if (y && tp) {
        const all = await db.table("atp_entries").toArray().catch(() => []);
        setEntries((all as ATPEntry[]).filter((e) => e.academicYearId === y.id && e.teacherId === tp.id));
      }
      setLoading(false);
    })();
  }, []);

  async function reload() {
    if (!year || !teacher) return;
    const all = await db.table("atp_entries").toArray().catch(() => []);
    setEntries((all as ATPEntry[]).filter((e) => e.academicYearId === year.id && e.teacherId === teacher.id));
  }

  async function handleSave(data: Omit<ATPEntry, "id" | "createdAt" | "updatedAt" | "academicYearId" | "teacherId">) {
    if (!year || !teacher) return;
    const now = nowTimestamp();
    if (editing) {
      await db.table("atp_entries").put({ ...editing, ...data, updatedAt: now });
      setMessage("TP diperbarui.");
    } else {
      const entry: ATPEntry = {
        ...data,
        id: uuid(),
        academicYearId: year.id,
        teacherId: teacher.id,
        createdAt: now,
        updatedAt: now,
      };
      await db.table("atp_entries").put(entry);
      setMessage("TP ditambahkan.");
    }
    setShowForm(false);
    setEditing(null);
    void reload();
  }

  async function handleDelete(id: string) {
    await db.table("atp_entries").delete(id);
    setMessage("TP dihapus.");
    void reload();
  }

  function generateAIPrompt(entry: ATPEntry, type: "lkpd" | "rpp" | "jurnal" | "remedial" | "pengayaan"): string {
    const base = `Sebagai guru ${entry.subject} kelas ${entry.grade} (Fase ${entry.phase}), buatkan ${type.toUpperCase()} untuk Tujuan Pembelajaran berikut:

Tujuan Pembelajaran: ${entry.tp}
Elemen: ${entry.elemen}
Capaian Pembelajaran: ${entry.cp}
Bab: ${entry.bab}
Profil Pelajar Pancasila: ${entry.profilPelajar}
Kata Kunci: ${entry.kataKunci}
Alokasi JP: ${entry.alokasiJP} JP

Format: sesuaikan dengan standar Kurikulum Merdeka untuk ${entry.grade}.`;

    if (type === "lkpd") {
      return base + "\n\nLKPD harus memuat: tujuan, alat/bahan, langkah kegiatan, pertanyaan pemandu, penilaian.";
    }
    if (type === "rpp") {
      return base + "\n\nRPP/Modul Ajar harus memuat: identitas, kompetensi awal, tujuan, kegiatan pendahuluan-inti-penutup, asesmen.";
    }
    if (type === "remedial") {
      return base + "\n\nBuat program remedial sederhana untuk siswa yang belum mencapai TP ini.";
    }
    if (type === "pengayaan") {
      return base + "\n\nBuat program pengayaan untuk siswa yang sudah menguasai TP ini.";
    }
    return base;
  }

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;

  return (
    <div className="space-y-4">
      <div className="page-header">
        <h1 className="text-2xl font-bold text-slate-900">Bank ATP/TP</h1>
        <p className="text-sm text-slate-500 mt-1">Pusat sinkron semua dokumen perangkat.</p>
      </div>

      {message && <div className="info-banner-success">{message}</div>}

      <Button onClick={() => { setEditing(null); setShowForm(true); }}>+ Tambah TP</Button>

      {showForm && (
        <ATPForm
          editing={editing}
          defaultSubject={teacher?.subjects[0]?.subject ?? ""}
          defaultGrade={teacher?.subjects[0]?.grades[0] ?? "VII"}
          defaultPhase={teacher?.subjects[0]?.phases[0] ?? "D"}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {entries.length === 0 ? (
        <Card><EmptyState title="Belum ada TP" description="Tambah TP untuk sinkronisasi dokumen." /></Card>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <Card key={e.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{e.subject} — {e.grade}</span>
                    <Badge variant="neutral">Bab: {e.bab}</Badge>
                    <Badge variant="neutral">{e.alokasiJP} JP</Badge>
                  </div>
                  <p className="text-sm text-slate-700 mt-1"><strong>TP:</strong> {e.tp}</p>
                  <p className="text-xs text-slate-500 mt-1">Elemen: {e.elemen} · CP: {e.cp}</p>
                  {e.profilPelajar && <p className="text-xs text-slate-500">Profil: {e.profilPelajar}</p>}
                  {e.kataKunci && <p className="text-xs text-slate-400">Kata kunci: {e.kataKunci}</p>}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Button variant="secondary" className="text-xs px-2 py-1" onClick={() => { setEditing(e); setShowForm(true); }}>Edit</Button>
                  <Button variant="danger" className="text-xs px-2 py-1" onClick={() => handleDelete(e.id)}>Hapus</Button>
                  <Button variant="secondary" className="text-xs px-2 py-1" onClick={() => setShowAIPrompt(e.id)}>AI Prompt</Button>
                </div>
              </div>

              {showAIPrompt === e.id && (
                <div className="mt-3 p-3 bg-slate-50 rounded-md space-y-2">
                  <p className="text-xs font-semibold text-slate-600">Prompt AI — klik Salin lalu paste ke AI eksternal:</p>
                  <div className="flex gap-2 flex-wrap">
                    {(["lkpd", "rpp", "jurnal", "remedial", "pengayaan"] as const).map((type) => (
                      <Button
                        key={type}
                        variant="secondary"
                        className="text-xs px-2 py-1"
                        onClick={() => {
                          const prompt = generateAIPrompt(e, type);
                          navigator.clipboard.writeText(prompt);
                          setMessage(`Prompt ${type.toUpperCase()} disalin ke clipboard.`);
                        }}
                      >
                        Salin Prompt {type.toUpperCase()}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400">Tidak ada API key. Tidak ada data dikirim. Guru paste manual ke AI.</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ATPForm({
  editing,
  defaultSubject,
  defaultGrade,
  defaultPhase,
  onSave,
  onCancel,
}: {
  editing: ATPEntry | null;
  defaultSubject: string;
  defaultGrade: string;
  defaultPhase: string;
  onSave: (data: Omit<ATPEntry, "id" | "createdAt" | "updatedAt" | "academicYearId" | "teacherId">) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    subject: editing?.subject ?? defaultSubject,
    grade: editing?.grade ?? defaultGrade,
    phase: editing?.phase ?? defaultPhase,
    bab: editing?.bab ?? "",
    elemen: editing?.elemen ?? "",
    cp: editing?.cp ?? "",
    tp: editing?.tp ?? "",
    profilPelajar: editing?.profilPelajar ?? "",
    kataKunci: editing?.kataKunci ?? "",
    alokasiJP: editing?.alokasiJP ?? 2,
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <Card>
      <CardHeader title={editing ? "Edit TP" : "Tambah TP"} />
      <div className="space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <Input label="Mapel" id="atp-subject" value={form.subject} onChange={(v) => set("subject", v)} />
          <Input label="Kelas" id="atp-grade" value={form.grade} onChange={(v) => set("grade", v)} />
          <Input label="Fase" id="atp-phase" value={form.phase} onChange={(v) => set("phase", v)} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Bab" id="atp-bab" value={form.bab} onChange={(v) => set("bab", v)} />
          <Input label="Elemen" id="atp-elemen" value={form.elemen} onChange={(v) => set("elemen", v)} />
        </div>
        <Textarea label="Capaian Pembelajaran (CP)" id="atp-cp" value={form.cp} onChange={(v) => set("cp", v)} rows={2} />
        <Textarea label="Tujuan Pembelajaran (TP)" id="atp-tp" value={form.tp} onChange={(v) => set("tp", v)} rows={3} />
        <Input label="Profil Pelajar Pancasila" id="atp-profil" value={form.profilPelajar} onChange={(v) => set("profilPelajar", v)} />
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Kata Kunci" id="atp-kk" value={form.kataKunci} onChange={(v) => set("kataKunci", v)} />
          <Input label="Alokasi JP" id="atp-jp" type="number" value={String(form.alokasiJP)} onChange={(v) => set("alokasiJP", Number(v) || 2)} />
        </div>
        <div className="flex gap-2">
          <Button onClick={() => onSave(form)}>Simpan</Button>
          <Button variant="secondary" onClick={onCancel}>Batal</Button>
        </div>
      </div>
    </Card>
  );
}
