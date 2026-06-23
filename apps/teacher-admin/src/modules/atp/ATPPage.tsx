/**
 * Bank ATP/TP — Tujuan Pembelajaran per guru per mapel per kelas.
 *
 * APP-USABLE-RC1: pakai atp-entry-repo formal (Dexie schema resmi),
 * bukan db.table("atp_entries") dynamic.
 *
 * ATP/TP menyimpan: kelas, bab, elemen, CP, TP, profil Pelajar Pancasila,
 * kata kunci, alokasi JP. LKPD wajib pilih TP (lihat menu LKPD).
 * AI Prompt tetap ada sebagai generator prompt (guru salin manual).
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, Input, Textarea, Button, EmptyState, Badge } from "../../shared/ui";
import { getActiveAcademicYear, getTeacherProfile } from "../../shared/db/profile-repo";
import {
  listATPEntries,
  saveATPEntry,
  updateATPEntry,
  deleteATPEntry,
} from "../../shared/db/atp-entry-repo";
import { listLKPDs } from "../../shared/db/lkpd-repo";
import type { AcademicYear, TeacherProfile, ATPEntry, LKPD } from "@guru-admin/domain";
import { atpEntryLabel } from "@guru-admin/domain";

export function ATPPage() {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [entries, setEntries] = useState<ATPEntry[]>([]);
  const [lkpds, setLkpds] = useState<LKPD[]>([]);
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
        const [atps, lks] = await Promise.all([
          listATPEntries({ academicYearId: y.id, teacherId: tp.id }),
          listLKPDs({ academicYearId: y.id, teacherId: tp.id }),
        ]);
        setEntries(atps);
        setLkpds(lks);
      }
      setLoading(false);
    })();
  }, []);

  async function reload() {
    if (!year || !teacher) return;
    const [atps, lks] = await Promise.all([
      listATPEntries({ academicYearId: year.id, teacherId: teacher.id }),
      listLKPDs({ academicYearId: year.id, teacherId: teacher.id }),
    ]);
    setEntries(atps);
    setLkpds(lks);
  }

  async function handleSave(data: Omit<ATPEntry, "id" | "createdAt" | "updatedAt" | "deletedAt" | "syncStatus" | "academicYearId" | "teacherId" | "status">) {
    if (!year || !teacher) return;
    try {
      if (editing) {
        await updateATPEntry(editing.id, data);
        setMessage("TP diperbarui.");
      } else {
        await saveATPEntry({
          ...data,
          academicYearId: year.id,
          teacherId: teacher.id,
          teacherName: teacher.name,
          status: "draft",
        });
        setMessage("TP ditambahkan.");
      }
      setShowForm(false);
      setEditing(null);
      void reload();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Gagal simpan.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus TP ini? LKPD yang memakai TP ini tetap ada (TP-nya jadi snapshot).")) return;
    await deleteATPEntry(id);
    setMessage("TP dihapus.");
    void reload();
  }

  function generateAIPrompt(entry: ATPEntry, type: "lkpd" | "rpp" | "jurnal" | "remedial" | "pengayaan"): string {
    const base = `Sebagai guru ${entry.subject} kelas ${entry.grade} (Fase ${entry.phase}), buatkan ${type.toUpperCase()} untuk Tujuan Pembelajaran berikut:

Tujuan Pembelajaran: ${entry.tp}
Elemen: ${entry.elemen}
Capaian Pembelajaran: ${entry.cp}
Bab: ${entry.bab ?? "-"}
Profil Pelajar Pancasila: ${entry.profilPelajar ?? "-"}
Kata Kunci: ${entry.kataKunci ?? "-"}
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
        <h1 className="text-2xl font-bold text-slate-900">Bank TP (Tujuan Pembelajaran)</h1>
        <p className="text-sm text-slate-500 mt-1">
          {year ? `TP ${year.label}` : "Belum ada tahun aktif"} · {teacher?.name ?? "Belum ada guru"}
        </p>
      </div>

      {message && <div className="info-banner-success">{message}</div>}

      <Card>
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-slate-600">
              Pusat bank Tujuan Pembelajaran. TP dipakai untuk: LKPD, Perangkat Penilaian, Promes.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              CP (Capaian Pembelajaran) adalah dokumen resmi pemerintah — diarsipkan sebagai referensi, bukan digenerate app.
            </p>
          </div>
          <Button onClick={() => { setEditing(null); setShowForm(true); }}>+ Tambah TP</Button>
        </div>
      </Card>

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
        <Card><EmptyState title="Belum ada TP" description="Tambah TP untuk membuat LKPD, RPP, dan jurnal." /></Card>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <Card key={e.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{atpEntryLabel(e)}</span>
                    <Badge variant={e.status === "final" ? "success" : "neutral"}>
                      {e.status === "final" ? "Final" : "Draft"}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-700 mt-1"><strong>TP:</strong> {e.tp}</p>
                  <p className="text-xs text-slate-500 mt-1">Elemen: {e.elemen} · CP: {e.cp}</p>
                  {e.profilPelajar && <p className="text-xs text-slate-500">Profil: {e.profilPelajar}</p>}
                  {e.kataKunci && <p className="text-xs text-slate-400">Kata kunci: {e.kataKunci}</p>}

                  {/* Dipakai di */}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wide">Dipakai di:</span>
                    {lkpds.some((l) => l.atpEntryId === e.id) ? (
                      <Link to="/lkpd"><Badge variant="success">LKPD</Badge></Link>
                    ) : (
                      <span className="text-[10px] text-slate-300">belum</span>
                    )}
                    <Link to="/evaluation-docs"><Badge variant="neutral">Perangkat Penilaian</Badge></Link>
                    <Link to="/promes"><Badge variant="neutral">Promes</Badge></Link>
                  </div>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Button variant="secondary" className="text-xs px-2 py-1" onClick={() => { setEditing(e); setShowForm(true); }}>Edit</Button>
                  <Button variant="danger" className="text-xs px-2 py-1" onClick={() => handleDelete(e.id)}>Hapus</Button>
                  <Button variant="secondary" className="text-xs px-2 py-1" onClick={() => setShowAIPrompt(showAIPrompt === e.id ? null : e.id)}>Prompt AI</Button>
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
  onSave: (data: Omit<ATPEntry, "id" | "createdAt" | "updatedAt" | "deletedAt" | "syncStatus" | "academicYearId" | "teacherId" | "status">) => void;
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
    teacherName: editing?.teacherName ?? "",
  });

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <Card>
      <CardHeader title={editing ? "Edit TP" : "Tambah TP"} description="Wajib: Mapel, Kelas, Fase, Elemen, CP, TP, Alokasi JP." />
      <div className="space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <Input label="Mapel" id="atp-subject" value={form.subject} onChange={(v) => set("subject", v)} />
          <Input label="Kelas" id="atp-grade" value={form.grade} onChange={(v) => set("grade", v)} placeholder="VII" />
          <Input label="Fase" id="atp-phase" value={form.phase} onChange={(v) => set("phase", v)} placeholder="D" />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Bab" id="atp-bab" value={form.bab} onChange={(v) => set("bab", v)} placeholder="Bab 1" />
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
