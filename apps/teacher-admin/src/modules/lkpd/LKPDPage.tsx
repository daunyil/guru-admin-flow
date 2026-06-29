/**
 * LKPD — Lembar Kerja Peserta Didik.
 *
 * APP-USABLE-RC1 Issue 4: LKPD jadi modul nyata, bukan cuma prompt AI.
 *
 * Fitur:
 *   - List LKPD per guru (filter by subject/class optional)
 *   - Buat LKPD dari TP (pilih ATPEntry → auto-fill subject/grade/TP)
 *   - Form lengkap: judul, tujuan, alat/bahan, langkah, pertanyaan pemandu, penilaian
 *   - Simpan Draft vs Setujui & Finalkan
 *   - Preview/cetak sederhana (mode dokumen)
 *   - Terikat ke (academicYearId, teacherId, subject, classId?) + atpEntryId
 */

import { useEffect, useState } from "react";
import { Card, CardHeader, Input, Textarea, Button, EmptyState, Badge, Select, InfoCard, PrintExportButtons } from "../../shared/ui";
import { getActiveAcademicYear, getTeacherProfile, getSchoolProfile } from "../../shared/db/profile-repo";
import { listATPEntries } from "../../shared/db/atp-entry-repo";
import {
  listLKPDs,
  saveLKPD,
  updateLKPD,
  deleteLKPD,
  finalizeLKPD,
} from "../../shared/db/lkpd-repo";
import { listClassRosters } from "../../shared/db/class-roster-repo";
import type {
  AcademicYear,
  TeacherProfile,
  SchoolProfile,
  ATPEntry,
  LKPD,
  ClassRoster,
} from "@guru-admin/domain";
import { lkpdLabel } from "@guru-admin/domain";
import { formatLongDateID, todayISODate } from "@guru-admin/shared";

export function LKPDPage() {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [teacher, setTeacher] = useState<TeacherProfile | undefined>();
  const [school, setSchool] = useState<SchoolProfile | undefined>();
  const [lkpds, setLkpds] = useState<LKPD[]>([]);
  const [atpEntries, setAtpEntries] = useState<ATPEntry[]>([]);
  const [rosters, setRosters] = useState<ClassRoster[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<LKPD | null>(null);
  const [previewing, setPreviewing] = useState<LKPD | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    void (async () => {
      const [y, tp, sp] = await Promise.all([
        getActiveAcademicYear(),
        getTeacherProfile(),
        getSchoolProfile(),
      ]);
      setYear(y ?? null);
      setTeacher(tp);
      setSchool(sp);
      if (y && tp) {
        const [ls, atps, rs] = await Promise.all([
          listLKPDs({ academicYearId: y.id, teacherId: tp.id }),
          listATPEntries({ academicYearId: y.id, teacherId: tp.id }),
          listClassRosters(y.id),
        ]);
        setLkpds(ls);
        setAtpEntries(atps);
        setRosters(rs);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (message?.type === "error") setTimeout(() => setMessage(null), 5000);
    if (message?.type === "success") setTimeout(() => setMessage(null), 3000);
  }, [message]);

  async function reload() {
    if (!year || !teacher) return;
    setLkpds(await listLKPDs({ academicYearId: year.id, teacherId: teacher.id }));
  }

  async function handleSave(data: Omit<LKPD, "id" | "createdAt" | "updatedAt" | "deletedAt" | "syncStatus" | "academicYearId" | "teacherId" | "status" | "finalizedAt">) {
    if (!year || !teacher) return;
    try {
      if (editing) {
        await updateLKPD(editing.id, data);
        setMessage({ type: "success", text: "LKPD diperbarui." });
      } else {
        await saveLKPD({
          ...data,
          academicYearId: year.id,
          teacherId: teacher.id,
          teacherName: teacher.name,
          status: "draft",
        });
        setMessage({ type: "success", text: "LKPD ditambahkan." });
      }
      setShowForm(false);
      setEditing(null);
      void reload();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Gagal simpan." });
    }
  }

  async function handleFinalize(id: string) {
    // UX-DOC-01: konfirmasi sebelum finalkan
    const ok = window.confirm(
      "Finalkan LKPD? Setelah final, LKPD tidak bisa diedit langsung. " +
      "Untuk mengubah, gunakan tombol 'Buka Revisi' terlebih dahulu."
    );
    if (!ok) return;
    const result = await finalizeLKPD(id);
    if (result.success) {
      setMessage({ type: "success", text: "LKPD difinalkan." });
      void reload();
    } else {
      setMessage({ type: "error", text: result.errors.join(", ") });
    }
  }

  // UX-DOC-02: Buka Revisi — ubah status final → draft supaya bisa edit lagi
  async function handleOpenRevision(lkpd: LKPD) {
    const ok = window.confirm(
      `Buka revisi untuk "${lkpd.title}"? Status akan kembali ke Draf dan LKPD bisa diedit lagi.`
    );
    if (!ok) return;
    await updateLKPD(lkpd.id, { status: "draft" as const, finalizedAt: null });
    setMessage({ type: "success", text: "LKPD dibuka untuk revisi (status: Draf)." });
    void reload();
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus LKPD ini?")) return;
    await deleteLKPD(id);
    setMessage({ type: "success", text: "LKPD dihapus." });
    void reload();
  }

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;

  // DOCUMENT-OUTPUT-FIXPACK-01: empty state bila tahun/guru belum ada
  if (!year || !teacher) {
    return (
      <div className="space-y-4">
        <div className="page-header">
          <h1 className="text-2xl font-bold text-slate-900">LKPD</h1>
          <p className="text-sm text-slate-500 mt-1">Lembar Kerja Peserta Didik</p>
        </div>
        <Card>
          <EmptyState
            title="Belum ada tahun pelajaran aktif"
            description="Buka menu Profil untuk mengaktifkan tahun pelajaran, atau buat tahun baru di menu Tahun Baru. LKPD butuh tahun aktif + profil guru untuk dibuat."
            action={<Button variant="secondary" onClick={() => (window.location.hash = "#/profile")}>Buka Profil</Button>}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="page-header">
        <h1 className="text-2xl font-bold text-slate-900">LKPD</h1>
        <p className="text-sm text-slate-500 mt-1">
          Lembar Kerja Peserta Didik · {year ? `TP ${year.label}` : "Belum ada tahun aktif"}
        </p>
      </div>

      {message && (
        <div className={`info-banner-${message.type === "success" ? "success" : "error"}`}>
          {message.text}
        </div>
      )}

      <Card>
        <div className="flex justify-between items-center">
          <p className="text-sm text-slate-600">
            Buat LKPD dari TP. LKPD wajib terikat ke Tujuan Pembelajaran.
          </p>
          <Button onClick={() => { setEditing(null); setShowForm(true); }} disabled={atpEntries.length === 0}>
            + Buat LKPD
          </Button>
        </div>
        {atpEntries.length === 0 ? (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-sm font-semibold text-amber-900">Belum ada TP (Tujuan Pembelajaran)</p>
            <p className="text-xs text-amber-800 mt-1">
              LKPD wajib terikat ke TP. Tambah TP dulu di menu <strong>Bank TP</strong> (import dari ATP atau input manual). Setelah TP ada, tombol "Buat LKPD" akan aktif.
            </p>
            <Button variant="secondary" className="text-xs mt-2" onClick={() => (window.location.hash = "#/atp")}>
              Buka Bank TP
            </Button>
          </div>
        ) : (
          <p className="text-xs text-slate-500 mt-2">
            {atpEntries.length} TP tersedia · {rosters.length} kelas terdaftar
          </p>
        )}
      </Card>

      {showForm && (
        <LKPDForm
          editing={editing}
          atpEntries={atpEntries}
          rosters={rosters}
          defaultTeacherName={teacher?.name ?? ""}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {lkpds.length === 0 ? (
        <Card>
          <EmptyState
            title="Belum ada LKPD"
            description="Buat LKPD pertama dari TP yang sudah ada."
          />
        </Card>
      ) : (
        <div className="space-y-2">
          {lkpds.map((l) => (
            <Card key={l.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{l.title}</span>
                    <Badge variant={l.status === "final" ? "success" : "neutral"}>
                      {l.status === "final" ? "Final" : "Draf"}
                    </Badge>
                    {l.classLabel && <Badge variant="neutral">{l.classLabel}</Badge>}
                    <Badge variant="neutral">{l.subject}</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    TP: {(l.tp ?? "").length > 80 ? (l.tp ?? "").slice(0, 80) + "..." : (l.tp || "-")}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Dibuat {safeFormatDate(l.createdAt)}
                  </p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Button variant="secondary" className="text-xs px-2 py-1" onClick={() => setPreviewing(l)}>
                    Preview
                  </Button>
                  {l.status !== "final" ? (
                    <>
                      <Button
                        variant="secondary"
                        className="text-xs px-2 py-1"
                        onClick={() => { setEditing(l); setShowForm(true); }}
                      >
                        Edit
                      </Button>
                      <Button className="text-xs px-2 py-1" onClick={() => handleFinalize(l.id)}>
                        Finalkan
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="secondary"
                      className="text-xs px-2 py-1"
                      onClick={() => handleOpenRevision(l)}
                    >
                      Buka Revisi
                    </Button>
                  )}
                  <Button variant="danger" className="text-xs px-2 py-1" onClick={() => handleDelete(l.id)}>
                    Hapus
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {previewing && (
        <LKPDPreview
          lkpd={previewing}
          schoolName={school?.name ?? "Sekolah"}
          teacherName={teacher?.name ?? "Guru"}
          onClose={() => setPreviewing(null)}
        />
      )}
    </div>
  );
}

function LKPDForm({
  editing,
  atpEntries,
  rosters,
  defaultTeacherName,
  onSave,
  onCancel,
}: {
  editing: LKPD | null;
  atpEntries: ATPEntry[];
  rosters: ClassRoster[];
  defaultTeacherName: string;
  onSave: (data: Omit<LKPD, "id" | "createdAt" | "updatedAt" | "deletedAt" | "syncStatus" | "academicYearId" | "teacherId" | "status" | "finalizedAt">) => void;
  onCancel: () => void;
}) {
  const [selectedAtpId, setSelectedAtpId] = useState(editing?.atpEntryId ?? "");
  const [form, setForm] = useState({
    subject: editing?.subject ?? "",
    grade: editing?.grade ?? "",
    classId: editing?.classId ?? "",
    classLabel: editing?.classLabel ?? "",
    tp: editing?.tp ?? "",
    title: editing?.title ?? "",
    objective: editing?.objective ?? "",
    materials: editing?.materials ?? "",
    steps: editing?.steps ?? "",
    guidingQuestions: editing?.guidingQuestions ?? "",
    assessment: editing?.assessment ?? "",
    notes: editing?.notes ?? "",
  });

  function handleAtpPick(atpId: string) {
    setSelectedAtpId(atpId);
    const atp = atpEntries.find((a) => a.id === atpId);
    if (atp) {
      setForm((f) => ({
        ...f,
        subject: atp.subject,
        grade: atp.grade,
        tp: atp.tp,
      }));
    }
  }

  function handleRosterPick(rosterId: string) {
    const r = rosters.find((rr) => rr.id === rosterId);
    if (r) {
      setForm((f) => ({ ...f, classId: r.classId, classLabel: r.classLabel }));
    } else {
      setForm((f) => ({ ...f, classId: "", classLabel: "" }));
    }
  }

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function handleSubmit() {
    if (!selectedAtpId) {
      alert("Pilih TP dulu.");
      return;
    }
    if (!form.title || !form.objective || !form.steps) {
      alert("Judul, Tujuan, dan Langkah Kegiatan wajib diisi.");
      return;
    }
    onSave({
      ...form,
      atpEntryId: selectedAtpId,
      teacherName: defaultTeacherName,
    });
  }

  return (
    <Card>
      <CardHeader
        title={editing ? "Edit LKPD" : "Buat LKPD"}
        description="Wajib: pilih TP, judul, tujuan, langkah kegiatan."
      />
      <div className="space-y-3">
        <Select
          label="Pilih TP (dari Bank TP)"
          id="lkpd-atp"
          value={selectedAtpId}
          onChange={handleAtpPick}
          options={[
            { value: "", label: "-- Pilih TP --" },
            ...atpEntries.map((a) => ({
              value: a.id,
              label: `${a.subject} — ${a.grade} · ${a.tp.length > 50 ? a.tp.slice(0, 50) + "..." : a.tp}`,
            })),
          ]}
          required
        />

        {selectedAtpId && (
          <InfoCard
            entries={[
              { label: "Guru", value: defaultTeacherName },
              { label: "Mapel", value: form.subject || "-" },
              { label: "Kelas", value: form.classLabel || form.grade || "-" },
              { label: "Fase", value: atpEntries.find((a) => a.id === selectedAtpId)?.phase ?? "-" },
              { label: "Bab", value: atpEntries.find((a) => a.id === selectedAtpId)?.bab ?? "-" },
            ]}
          />
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Mapel" id="lkpd-subject" value={form.subject} onChange={(v) => set("subject", v)} />
          <Input label="Kelas (opsional)" id="lkpd-grade" value={form.grade} onChange={(v) => set("grade", v)} />
        </div>

        <Select
          label="Khusus Kelas (opsional)"
          id="lkpd-class"
          value={rosters.find((r) => r.classId === form.classId)?.id ?? ""}
          onChange={handleRosterPick}
          options={[
            { value: "", label: "-- Umum (semua kelas) --" },
            ...rosters.map((r) => ({ value: r.id, label: r.classLabel })),
          ]}
          hint="Pilih kelas bila LKPD ini khusus untuk 1 kelas."
        />

        <Textarea label="Tujuan Pembelajaran (TP)" id="lkpd-tp" value={form.tp} onChange={(v) => set("tp", v)} rows={2} />

        <Input
          label="Judul LKPD"
          id="lkpd-title"
          value={form.title}
          onChange={(v) => set("title", v)}
          placeholder="LKPD Norma dalam Masyarakat"
        />

        <Textarea
          label="Tujuan LKPD"
          id="lkpd-objective"
          value={form.objective}
          onChange={(v) => set("objective", v)}
          rows={2}
          placeholder="Peserta didik mampu mengidentifikasi norma yang berlaku di masyarakat..."
        />

        <Textarea
          label="Alat dan Bahan"
          id="lkpd-materials"
          value={form.materials}
          onChange={(v) => set("materials", v)}
          rows={2}
          placeholder="Buku teks, LKPD, pulpen, kertas..."
        />

        <Textarea
          label="Langkah Kegiatan"
          id="lkpd-steps"
          value={form.steps}
          onChange={(v) => set("steps", v)}
          rows={4}
          placeholder="1. Guru membuka dengan pertanyaan pemandu...&#10;2. Peserta didik berdiskusi...&#10;3. Presentasi..."
        />

        <Textarea
          label="Pertanyaan Pemandu"
          id="lkpd-guiding"
          value={form.guidingQuestions}
          onChange={(v) => set("guidingQuestions", v)}
          rows={3}
          placeholder="Apa yang dimaksud dengan norma? Mengapa norma penting?"
        />

        <Textarea
          label="Penilaian"
          id="lkpd-assessment"
          value={form.assessment}
          onChange={(v) => set("assessment", v)}
          rows={2}
          placeholder="Observasi partisipasi, hasil diskusi, presentasi..."
        />

        <Textarea
          label="Catatan (opsional)"
          id="lkpd-notes"
          value={form.notes}
          onChange={(v) => set("notes", v)}
          rows={2}
        />

        <div className="flex gap-2">
          <Button onClick={handleSubmit}>Simpan Draft</Button>
          <Button variant="secondary" onClick={onCancel}>Batal</Button>
        </div>
      </div>
    </Card>
  );
}

function LKPDPreview({
  lkpd,
  schoolName,
  teacherName,
  onClose,
}: {
  lkpd: LKPD;
  schoolName: string;
  teacherName: string;
  onClose: () => void;
}) {
  return (
    <Card>
      <CardHeader
        title="Preview LKPD"
        description={lkpdLabel(lkpd)}
      />
      <div className="print-area">
        <div className="document-page document-portrait">
          <div className="document-title">LEMBAR KERJA PESERTA DIDIK</div>
          <div className="document-subtitle">{schoolName}</div>
          <table className="document-identity">
            <tbody>
              <tr>
                <td>Mata Pelajaran</td><td>{lkpd.subject || "-"}</td>
                <td>Kelas</td><td>{lkpd.classLabel || lkpd.grade || "-"}</td>
              </tr>
              <tr>
                <td>Guru</td><td>{teacherName || "-"}</td>
                <td>Tanggal</td><td>{formatLongDateID(todayISODate())}</td>
              </tr>
            </tbody>
          </table>
          <table className="document-table">
            <tbody>
              <tr>
                <td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Judul</td>
                <td>{lkpd.title || "-"}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Tujuan Pembelajaran</td>
                <td>{lkpd.tp || "-"}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Tujuan LKPD</td>
                <td>{lkpd.objective || "-"}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Alat dan Bahan</td>
                <td>{lkpd.materials || "-"}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Langkah Kegiatan</td>
                <td><pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{lkpd.steps || "-"}</pre></td>
              </tr>
              <tr>
                <td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Pertanyaan Pemandu</td>
                <td><pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{lkpd.guidingQuestions || "-"}</pre></td>
              </tr>
              <tr>
                <td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Penilaian</td>
                <td>{lkpd.assessment || "-"}</td>
              </tr>
              {lkpd.notes && (
                <tr>
                  <td style={{ fontWeight: "bold", background: "#f5f5f5" }}>Catatan</td>
                  <td>{lkpd.notes}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <PrintExportButtons filename="lkpd" title="LKPD" schoolName={schoolName} />
        <Button variant="secondary" onClick={onClose}>Tutup</Button>
      </div>
    </Card>
  );
}

// DOCUMENT-OUTPUT-FIXPACK-01: safe date formatting — tidak crash bila createdAt
// malformed/missing (mis. data lama hasil migrasi atau backup restore bug).
function safeFormatDate(iso: string | undefined | null): string {
  if (!iso) return "-";
  try {
    return formatLongDateID(iso);
  } catch {
    return iso.slice(0, 10) ?? "-";
  }
}
