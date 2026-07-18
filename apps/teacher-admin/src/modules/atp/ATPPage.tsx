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
import { Card, CardHeader, Input, Textarea, Button, EmptyState, Badge, Select } from "../../shared/ui";
import { getActiveAcademicYear, getTeacherProfile } from "../../shared/db/profile-repo";
import {
  listATPEntries,
  saveATPEntry,
  updateATPEntry,
  deleteATPEntry,
} from "../../shared/db/atp-entry-repo";
import { listLKPDs } from "../../shared/db/lkpd-repo";
import type { AcademicYear, TeacherProfile, ATPEntry, LKPD } from "@guru-admin/domain";
import {
  atpEntryLabel,
  validateAtpImport,
  atpImportToEntries,
  parseAtpExcelPaste,
  atpPasteRowsToEntries,
  type AtpPasteMeta,
} from "@guru-admin/domain";

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

  // IMPORT-BANK-TP-PROTA-RC1: import JSON + Excel paste
  const [showImport, setShowImport] = useState(false);
  const [importMode, setImportMode] = useState<"json" | "excel">("json");
  const [importJson, setImportJson] = useState("");
  const [importExcel, setImportExcel] = useState("");
  const [importMeta, setImportMeta] = useState<AtpPasteMeta>({
    subject: "",
    grade: "VII",
    phase: "D",
  });
  const [importPreview, setImportPreview] = useState<
    | { type: "json"; entries: Array<Record<string, unknown>>; errors: string[] }
    | { type: "excel"; rows: ReturnType<typeof parseAtpExcelPaste>["rows"]; skipped: ReturnType<typeof parseAtpExcelPaste>["skippedRows"] }
    | null
  >(null);

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
    if (!window.confirm("Hapus TP ini? LKPD yang memakai TP ini tetap ada (TP-nya jadi snapshot).")) return;
    await deleteATPEntry(id);
    setMessage("TP dihapus.");
    void reload();
  }

  // IMPORT-BANK-TP-PROTA-RC1: preview import
  function handleImportPreview() {
    if (importMode === "json") {
      try {
        const json = JSON.parse(importJson);
        const v = validateAtpImport(json);
        if (!v.success) {
          setImportPreview({ type: "json", entries: [], errors: v.errors });
          return;
        }
        const entries = atpImportToEntries(v.data);
        setImportPreview({ type: "json", entries: entries as unknown as Array<Record<string, unknown>>, errors: [] });
      } catch (e) {
        setImportPreview({
          type: "json",
          entries: [],
          errors: [`JSON tidak valid: ${e instanceof Error ? e.message : String(e)}`],
        });
      }
    } else {
      // Excel paste
      if (!importMeta.subject || !importMeta.grade || !importMeta.phase) {
        setImportPreview({
          type: "excel",
          rows: [],
          skipped: [{ lineNumber: 0, raw: "", reason: "Subject, Grade, Phase wajib diisi untuk Excel paste." }],
        });
        return;
      }
      const result = parseAtpExcelPaste(importExcel);
      setImportPreview({ type: "excel", rows: result.rows, skipped: result.skippedRows });
    }
  }

  async function handleImportApply() {
    if (!year || !teacher) return;
    if (!importPreview) return;

    // UX-PLAN-02: deteksi duplikat (subject + grade + tp sama) → default skip
    // Build entries dari preview
    let entries: Array<{
      subject: string; grade: string; phase: string; bab?: string;
      elemen: string; cp: string; tp: string; profilPelajar?: string;
      kataKunci?: string; alokasiJP: number; classId?: string;
    }>;
    let teacherNameForImport = teacher.name;

    if (importPreview.type === "json") {
      const json = JSON.parse(importJson);
      const v = validateAtpImport(json);
      if (!v.success) {
        setMessage(`Import gagal: ${v.errors.join("; ")}`);
        return;
      }
      entries = atpImportToEntries(v.data);
      teacherNameForImport = v.data.teacherName ?? teacher.name;
    } else {
      entries = atpPasteRowsToEntries(importPreview.rows, importMeta);
    }

    if (entries.length === 0) {
      setMessage("Tidak ada TP untuk diimpor.");
      return;
    }

    // Cek duplikat vs existing entries
    const existingKey = (e: { subject: string; grade: string; tp: string }) =>
      `${e.subject}|${e.grade}|${e.tp}`;
    const existingKeys = new Set(entries.map(existingKey));
    // entries lokal sudah pasti unik? Tidak — bisa ada duplikat di input sendiri.
    // Pakai listATPEntries untuk dapat existing di DB
    const existing = await listATPEntries({ academicYearId: year.id, teacherId: teacher.id });
    const dbKeys = new Set(existing.map(existingKey));
    const duplicates = entries.filter((e) => dbKeys.has(existingKey(e)));
    const newEntries = entries.filter((e) => !dbKeys.has(existingKey(e)));
    void existingKeys; // unused tapi keep untuk clarity

    // UX-PLAN-02: bila ada duplikat, confirm typed "IMPOR DUPLIKAT"
    let importDuplicates = false;
    if (duplicates.length > 0) {
      const typed = window.prompt(
        `Ditemukan ${duplicates.length} TP duplikat (subject + kelas + TP sama sudah ada).\n` +
        `Default: hanya ${newEntries.length} TP baru yang akan diimpor.\n\n` +
        `Untuk memaksa impor duplikat juga, ketik: IMPOR DUPLIKAT\n` +
        `(atau klik Batal untuk hanya impor ${newEntries.length} TP baru)`
      );
      if (typed === "IMPOR DUPLIKAT") {
        importDuplicates = true;
      } else if (typed === null) {
        // User klik Cancel → batalkan seluruh import
        setMessage("Import dibatalkan.");
        return;
      }
      // typed lain (kosong/random) → lanjut import hanya yang baru (default skip duplikat)
    }

    // Bila semua duplikat dan user tidak paksa → info
    if (newEntries.length === 0 && !importDuplicates) {
      setMessage(`Semua ${duplicates.length} TP sudah ada (duplikat). Tidak ada yang diimpor.`);
      setShowImport(false);
      setImportJson("");
      setImportExcel("");
      setImportPreview(null);
      return;
    }

    const ok = window.confirm(
      `Impor ${importDuplicates ? entries.length : newEntries.length} TP ke Bank TP?` +
      (duplicates.length > 0 && !importDuplicates
        ? `\n(${duplicates.length} duplikat di-skip)`
        : importDuplicates
          ? `\n(TERMASUK ${duplicates.length} duplikat — akan dibuat entry baru)`
          : "")
    );
    if (!ok) return;

    try {
      const toImport = importDuplicates ? entries : newEntries;
      let saved = 0;
      for (const e of toImport) {
        await saveATPEntry({
          ...e,
          academicYearId: year.id,
          teacherId: teacher.id,
          teacherName: teacherNameForImport,
          status: "draft",
        });
        saved++;
      }
      const skippedMsg = importDuplicates
        ? ""
        : duplicates.length > 0
          ? ` (${duplicates.length} duplikat di-skip)`
          : "";
      setMessage(`${saved} TP berhasil diimpor${skippedMsg}.`);
      // Reset
      setShowImport(false);
      setImportJson("");
      setImportExcel("");
      setImportPreview(null);
      void reload();
    } catch (e) {
      setMessage(`Gagal import: ${e instanceof Error ? e.message : String(e)}`);
    }
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
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowImport(!showImport)}>Impor Bank TP</Button>
            <Button onClick={() => { setEditing(null); setShowForm(true); }}>+ Tambah TP</Button>
          </div>
        </div>
      </Card>

      {showImport && (
        <Card>
          <CardHeader
            title="Impor Bank TP"
            description="Impor TP dari JSON (hasil AI) atau paste dari Excel. Subject/Grade/Phase wajib untuk mode Excel."
          />
          <div className="space-y-3">
            <div className="flex gap-2 items-end">
              <Select
                label="Mode Impor"
                id="atp-import-mode"
                value={importMode}
                onChange={(v) => { setImportMode(v as "json" | "excel"); setImportPreview(null); }}
                options={[
                  { value: "json", label: "JSON (format guru-admin-flow/atp/v1)" },
                  { value: "excel", label: "Excel Paste (tab/koma/semicolon)" },
                ]}
              />
              {importMode === "excel" && (
                <>
                  <Input
                    label="Subject"
                    id="atp-imp-subject"
                    value={importMeta.subject}
                    onChange={(v) => { setImportMeta({ ...importMeta, subject: v }); setImportPreview(null); }}
                  />
                  <Input
                    label="Grade"
                    id="atp-imp-grade"
                    value={importMeta.grade}
                    onChange={(v) => { setImportMeta({ ...importMeta, grade: v }); setImportPreview(null); }}
                  />
                  <Input
                    label="Phase"
                    id="atp-imp-phase"
                    value={importMeta.phase}
                    onChange={(v) => { setImportMeta({ ...importMeta, phase: v }); setImportPreview(null); }}
                  />
                </>
              )}
            </div>

            {importMode === "json" ? (
              <Textarea
                label="JSON Bank TP"
                id="atp-import-json"
                value={importJson}
                onChange={(v) => { setImportJson(v); setImportPreview(null); }}
                rows={8}
                placeholder={'{"$schema":"guru-admin-flow/atp/v1","subject":"PPKn","grade":"VII","phase":"D","entries":[{"bab":"1","elemen":"Norma","cp":"...","tp":"...","alokasiJP":2}]}'}
              />
            ) : (
              <Textarea
                label="Paste dari Excel (header: Bab, Elemen, CP, TP, Profil Pelajar, Kata Kunci, Alokasi JP)"
                id="atp-import-excel"
                value={importExcel}
                onChange={(v) => { setImportExcel(v); setImportPreview(null); }}
                rows={8}
                placeholder={"Bab\tElemen\tCP\tTP\tProfil Pelajar\tKata Kunci\tAlokasi JP\n1\tNorma\tMemahami norma\tMenjelaskan norma\tBernalar\tnorma\t2"}
              />
            )}

            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleImportPreview} disabled={importMode === "json" ? !importJson.trim() : !importExcel.trim()}>
                Preview Import
              </Button>
              {importPreview && (
                <Button onClick={handleImportApply} disabled={
                  (importPreview.type === "json" && importPreview.entries.length === 0) ||
                  (importPreview.type === "excel" && importPreview.rows.length === 0)
                }>
                  Impor {importPreview.type === "json"
                    ? `${importPreview.entries.length} TP`
                    : `${importPreview.rows.length} TP`}
                </Button>
              )}
              <Button variant="secondary" onClick={() => { setShowImport(false); setImportPreview(null); }}>Batal</Button>
            </div>

            {importPreview && (
              <div className="p-3 bg-slate-50 rounded-md space-y-2">
                {importPreview.type === "json" ? (
                  <>
                    {importPreview.errors.length > 0 ? (
                      <div className="p-2 bg-rose-100 rounded text-xs text-rose-800">
                        <p className="font-semibold">Error:</p>
                        <ul className="ml-4 list-disc">
                          {importPreview.errors.map((e, i) => <li key={i}>{e}</li>)}
                        </ul>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-semibold text-emerald-700">
                          ✓ {importPreview.entries.length} TP siap diimpor
                        </p>
                        <div className="mt-2 max-h-48 overflow-y-auto text-xs">
                          {importPreview.entries.map((e, i) => (
                            <div key={i} className="p-1 border-b border-slate-200">
                              <strong>{String(e.elemen ?? "")}</strong>: {String(e.tp ?? "").slice(0, 80)}{String(e.tp ?? "").length > 80 ? "..." : ""} ({String(e.alokasiJP ?? "?")} JP)
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-emerald-700">
                      ✓ {importPreview.rows.length} baris siap diimpor
                      {importPreview.skipped.length > 0 && (
                        <span className="text-amber-700"> · {importPreview.skipped.length} baris di-skip</span>
                      )}
                    </p>
                    {importPreview.skipped.length > 0 && (
                      <div className="mt-2 max-h-32 overflow-y-auto text-xs text-rose-700">
                        <p className="font-semibold">Baris di-skip:</p>
                        {importPreview.skipped.map((s, i) => (
                          <div key={i} className="p-1">
                            Baris {s.lineNumber}: {s.reason}
                          </div>
                        ))}
                      </div>
                    )}
                    {importPreview.rows.length > 0 && (
                      <div className="mt-2 max-h-48 overflow-y-auto text-xs">
                        {importPreview.rows.map((r, i) => (
                          <div key={i} className="p-1 border-b border-slate-200">
                            <strong>{r.elemen}</strong>: {r.tp.slice(0, 80)}{r.tp.length > 80 ? "..." : ""} ({r.alokasiJP} JP)
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

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
