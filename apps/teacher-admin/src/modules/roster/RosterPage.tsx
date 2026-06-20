/**
 * Modul ClassRoster — halaman /roster
 * Daftar siswa per kelas. Input manual atau paste dari Excel.
 */

import { useEffect, useState } from "react";
import { Card, CardHeader, Input, Textarea, Button, EmptyState, Badge } from "../../shared/ui";
import {
  listClassRosters,
  saveClassRoster,
  addStudent,
  removeStudent,
  importStudents,
} from "../../shared/db/class-roster-repo";
import { getActiveAcademicYear } from "../../shared/db/profile-repo";
import type { ClassRoster, AcademicYear } from "@guru-admin/domain";

export function RosterPage() {
  const [loading, setLoading] = useState(true);
  const [activeYear, setActiveYear] = useState<AcademicYear | null>(null);
  const [rosters, setRosters] = useState<ClassRoster[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function reload() {
    if (!activeYear) return;
    const rs = await listClassRosters(activeYear.id);
    setRosters(rs);
  }

  useEffect(() => {
    void (async () => {
      const year = await getActiveAcademicYear();
      if (year) {
        setActiveYear(year);
        setRosters(await listClassRosters(year.id));
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (error) setTimeout(() => setError(null), 5000);
    if (success) setTimeout(() => setSuccess(null), 3000);
  }, [error, success]);

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;

  if (!activeYear) {
    return (
      <div className="space-y-4">
        <Header />
        <Card><EmptyState title="Belum ada tahun pelajaran aktif" description="Buat tahun pelajaran dulu di menu Profil." /></Card>
      </div>
    );
  }

  const selected = rosters.find((r) => r.id === selectedId);

  return (
    <div className="space-y-4">
      <Header yearLabel={activeYear.label} count={rosters.length} />

      {error && <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-sm text-rose-700">{error}</div>}
      {success && <div className="p-3 rounded-md bg-brand-50 border border-brand-200 text-sm text-brand-700">{success}</div>}

      <div className="flex gap-2">
        <Button onClick={() => setShowNew(true)}>+ Buat Roster Baru</Button>
        <Button variant="secondary" onClick={() => selected ? setShowImport(true) : setError("Pilih roster dulu")}>
          Impor Massal (paste Excel)
        </Button>
      </div>

      {showNew && (
        <NewRosterForm
          academicYearId={activeYear.id}
          onClose={() => setShowNew(false)}
          onSaved={(r) => { setShowNew(false); setSelectedId(r.id); setSuccess(`Roster ${r.classLabel} dibuat.`); void reload(); }}
          onError={(msg) => setError(msg)}
        />
      )}

      {showImport && selected && (
        <ImportModal
          roster={selected}
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); setSuccess("Siswa diimpor."); void reload(); }}
          onError={(msg) => setError(msg)}
        />
      )}

      <Card>
        <CardHeader title="Daftar Roster" description={`${rosters.length} kelas`} />
        {rosters.length === 0 ? (
          <EmptyState title="Belum ada roster" description="Buat roster per kelas untuk mengisi absensi." />
        ) : (
          <div className="space-y-2">
            {rosters.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className={`w-full text-left p-3 border rounded-md transition-colors ${
                  selectedId === r.id ? "border-brand-400 bg-brand-50" : "border-slate-200 hover:border-brand-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-slate-900">{r.classLabel}</span>
                    <Badge variant="neutral">{r.students.length} siswa</Badge>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      {selected && (
        <RosterDetail
          roster={selected}
          onChanged={() => { void reload(); }}
          onError={(msg) => setError(msg)}
          onSuccess={(msg) => setSuccess(msg)}
        />
      )}
    </div>
  );
}

function Header({ yearLabel, count }: { yearLabel?: string; count?: number }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Daftar Siswa (Roster)</h1>
      <p className="text-sm text-slate-500 mt-1">
        {yearLabel ? `Tahun: ${yearLabel} · ${count ?? 0} kelas` : "Daftar siswa per kelas untuk absensi."}
      </p>
    </div>
  );
}

function NewRosterForm({
  academicYearId,
  onClose,
  onSaved,
  onError,
}: {
  academicYearId: string;
  onClose: () => void;
  onSaved: (r: ClassRoster) => void;
  onError: (msg: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [classLabel, setClassLabel] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await saveClassRoster({
        classId: classLabel,
        classLabel,
        academicYearId,
        students: [],
      });
      onSaved(saved);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Gagal membuat roster.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Buat Roster Baru" />
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input label="Label Kelas" id="r-class" required value={classLabel} onChange={setClassLabel} placeholder="VII A" />
        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>{saving ? "Menyimpan..." : "Buat"}</Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Batal</Button>
        </div>
      </form>
    </Card>
  );
}

function RosterDetail({
  roster,
  onChanged,
  onError,
  onSuccess,
}: {
  roster: ClassRoster;
  onChanged: () => void;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNumber, setNewNumber] = useState(roster.students.length + 1);

  return (
    <Card>
      <CardHeader title={`Roster ${roster.classLabel}`} description={`${roster.students.length} siswa`} />
      <div className="space-y-2">
        {roster.students.length === 0 ? (
          <p className="text-sm text-slate-400 italic">Belum ada siswa. Tambah manual atau impor massal.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="py-2 px-2 w-12">No</th>
                  <th className="py-2 px-2">Nama</th>
                  <th className="py-2 px-2 w-20">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {roster.students.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100">
                    <td className="py-1.5 px-2">{s.number}</td>
                    <td className="py-1.5 px-2">{s.name}</td>
                    <td className="py-1.5 px-2">
                      <button
                        className="text-rose-600 hover:underline text-xs"
                        onClick={async () => {
                          await removeStudent(roster.id, s.id);
                          onChanged();
                          onSuccess("Siswa dihapus.");
                        }}
                      >Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd ? (
        <div className="mt-4 p-3 border border-slate-200 rounded-md space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <Input label="No" id="s-num" type="number" value={String(newNumber)} onChange={(v) => setNewNumber(Number(v))} />
            <div className="col-span-2">
              <Input label="Nama" id="s-name" value={newName} onChange={setNewName} placeholder="Nama siswa" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={async () => {
                if (!newName.trim()) { onError("Nama wajib diisi"); return; }
                await addStudent(roster.id, { name: newName.trim(), number: newNumber });
                setNewName("");
                setNewNumber(newNumber + 1);
                onChanged();
              }}
            >Tambah</Button>
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Selesai</Button>
          </div>
        </div>
      ) : (
        <Button className="mt-3" variant="secondary" onClick={() => setShowAdd(true)}>+ Tambah Siswa</Button>
      )}
    </Card>
  );
}

function ImportModal({
  roster,
  onClose,
  onImported,
  onError,
}: {
  roster: ClassRoster;
  onClose: () => void;
  onImported: () => void;
  onError: (msg: string) => void;
}) {
  const [text, setText] = useState("");
  const [importing, setImporting] = useState(false);

  async function handleImport() {
    setImporting(true);
    try {
      // Parse format: "1. Andi\n2. Budi\n3. Cici" atau "Andi\nBudi\nCici"
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
      const students: Array<{ name: string; number: number }> = [];
      lines.forEach((line, idx) => {
        const match = line.match(/^(\d+)[\.\)]\s*(.+)$/);
        if (match) {
          students.push({ number: Number(match[1]), name: match[2].trim() });
        } else {
          students.push({ number: idx + 1, name: line });
        }
      });
      if (students.length === 0) {
        onError("Tidak ada siswa yang terparse.");
        setImporting(false);
        return;
      }
      await importStudents(roster.id, students);
      onImported();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Gagal impor.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title={`Impor Massal — ${roster.classLabel}`}
        description="Paste dari Excel. Format: '1. Andi' per baris, atau hanya nama per baris. Siswa existing akan diganti."
      />
      <Textarea
        label="Daftar Siswa"
        id="import-students"
        value={text}
        onChange={setText}
        rows={12}
        placeholder={`1. Andi Saputra\n2. Budi Pratama\n3. Cici Lestari\n...`}
      />
      <div className="flex gap-2 mt-3">
        <Button onClick={handleImport} disabled={importing || !text.trim()}>
          {importing ? "Mengimpor..." : "Impor & Ganti"}
        </Button>
        <Button variant="secondary" onClick={onClose} disabled={importing}>Batal</Button>
      </div>
    </Card>
  );
}
