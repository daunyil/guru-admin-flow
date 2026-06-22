/**
 * PATCH-01B: Import Data Siswa — paste Excel, preview, simpan ke roster.
 * Sumber: docs/V0_6_2_PRODUCT_DECISIONS.md §3 (updated)
 *
 * Flow: Pilih Kelas → Paste Excel/Upload CSV → Preview → Cek duplikat → Simpan
 */

import { useEffect, useState } from "react";
import { Card, CardHeader, Input, Textarea, Button, EmptyState, Badge } from "../../shared/ui";
import {
  listClassRosters,
  saveClassRoster,
  importStudents,
  addStudent,
  removeStudent,
} from "../../shared/db/class-roster-repo";
import { getActiveAcademicYear } from "../../shared/db/profile-repo";
import type { ClassRoster, AcademicYear, StudentEntry } from "@guru-admin/domain";
import { uuid } from "@guru-admin/shared";

interface ParsedStudent {
  number: number;
  nis: string;
  name: string;
  warning?: string;
}

export function RosterPage() {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<AcademicYear | null>(null);
  const [rosters, setRosters] = useState<ClassRoster[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function reload() {
    if (!year) return;
    const rs = await listClassRosters(year.id);
    setRosters(rs);
  }

  useEffect(() => {
    void (async () => {
      const y = await getActiveAcademicYear();
      setYear(y);
      if (y) setRosters(await listClassRosters(y.id));
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (error) setTimeout(() => setError(null), 5000);
    if (success) setTimeout(() => setSuccess(null), 3000);
  }, [error, success]);

  if (loading) return <p className="text-sm text-slate-500">Memuat...</p>;

  if (!year) {
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
      <Header yearLabel={year.label} count={rosters.length} />

      {error && <div className="info-banner-error">{error}</div>}
      {success && <div className="info-banner-success">{success}</div>}

      <div className="flex gap-2">
        <Button onClick={() => setShowNew(true)}>+ Buat Kelas</Button>
        <Button variant="secondary" onClick={() => selected ? setShowImport(true) : setError("Pilih kelas dulu")}>
          Import Siswa (Paste Excel)
        </Button>
      </div>

      {showNew && (
        <NewRosterForm
          academicYearId={year.id}
          onClose={() => setShowNew(false)}
          onSaved={(r) => { setShowNew(false); setSelectedId(r.id); setSuccess(`Kelas ${r.classLabel} dibuat.`); void reload(); }}
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
        <CardHeader title="Daftar Kelas" description={`${rosters.length} kelas`} />
        {rosters.length === 0 ? (
          <EmptyState title="Belum ada kelas" description="Buat kelas dulu, lalu import siswa." />
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
                  <Button variant="secondary" className="text-xs px-2 py-1" onClick={(e) => { e.stopPropagation(); setShowImport(true); setSelectedId(r.id); }}>
                    Import
                  </Button>
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
    <div className="page-header">
      <h1 className="text-2xl font-bold text-slate-900">Siswa</h1>
      <p className="text-sm text-slate-500 mt-1">
        {yearLabel ? `TP ${yearLabel} · ${count ?? 0} kelas` : "Daftar siswa per kelas."}
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
      onError(e instanceof Error ? e.message : "Gagal membuat kelas.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Buat Kelas Baru" />
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

/* ------------------------------------------------------------------ */
/*  Import Modal — paste Excel, preview, cek duplikat, simpan          */
/* ------------------------------------------------------------------ */

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
  const [parsed, setParsed] = useState<ParsedStudent[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [importMode, setImportMode] = useState<"replace" | "append">("replace");
  const [importing, setImporting] = useState(false);

  function parseExcelPaste(raw: string): ParsedStudent[] {
    const lines = raw.trim().split("\n").map((l) => l.trim()).filter(Boolean);
    const result: ParsedStudent[] = [];
    const seenNames = new Set<string>();
    const seenNIS = new Set<string>();

    lines.forEach((line, idx) => {
      // Coba beberapa format:
      // 1. "1\t12345\tANDI SAPUTRA" (tab-separated)
      // 2. "1 12345 ANDI SAPUTRA" (spasi, nomor + NIS + nama)
      // 3. "1. ANDI SAPUTRA" (dengan titik)
      // 4. "ANDI SAPUTRA" (hanya nama)
      // 5. "1,12345,ANDI SAPUTRA" (CSV koma)

      let parts: string[];
      if (line.includes("\t")) {
        parts = line.split("\t").map((p) => p.trim());
      } else if (line.includes(",")) {
        parts = line.split(",").map((p) => p.trim());
      } else if (line.includes(";")) {
        parts = line.split(";").map((p) => p.trim());
      } else {
        // Coba split spasi: jika ada 3+ parts dan part[0] + part[1] adalah angka, sisanya nama
        parts = line.split(/\s+/);
        if (parts.length >= 3 && /^\d+$/.test(parts[0]) && /^\d+$/.test(parts[1])) {
          // Format: "No NIS Nama Lengkap"
          const no = parts[0];
          const nis = parts[1];
          const name = parts.slice(2).join(" ");
          parts = [no, nis, name];
        } else if (parts.length >= 2 && /^\d+$/.test(parts[0])) {
          // Format: "No Nama Lengkap" atau "No. Nama"
          const no = parts[0].replace(/[.]/g, "");
          const name = parts.slice(1).join(" ");
          parts = [no, "", name];
        } else {
          // Hanya nama
          parts = ["", "", line];
        }
      }

      let number: number;
      let nis: string;
      let name: string;

      if (parts.length >= 3) {
        number = parseInt(parts[0]) || (idx + 1);
        nis = parts[1] || "";
        name = parts.slice(2).join(" ").trim();
      } else if (parts.length === 2) {
        number = parseInt(parts[0]) || (idx + 1);
        nis = "";
        name = parts[1].trim();
      } else {
        number = idx + 1;
        nis = "";
        name = parts[0].trim();
      }

      if (!name) {
        result.push({ number, nis, name: `(baris ${idx + 1}: kosong)`, warning: "Nama kosong" });
        return;
      }

      const warnings: string[] = [];
      if (seenNames.has(name.toLowerCase())) warnings.push("Nama dobel");
      seenNames.add(name.toLowerCase());

      if (nis && seenNIS.has(nis)) warnings.push("NIS dobel");
      if (nis) seenNIS.add(nis);

      result.push({
        number,
        nis,
        name,
        warning: warnings.length > 0 ? warnings.join(", ") : undefined,
      });
    });

    return result;
  }

  function handleParse() {
    if (!text.trim()) {
      onError("Tempel data dulu.");
      return;
    }
    const result = parseExcelPaste(text);
    setParsed(result);
    setShowPreview(true);
  }

  function handleEditNumber(idx: number, value: string) {
    const next = [...parsed];
    next[idx] = { ...next[idx], number: Number(value) || 0 };
    setParsed(next);
  }

  function handleEditNIS(idx: number, value: string) {
    const next = [...parsed];
    next[idx] = { ...next[idx], nis: value };
    setParsed(next);
  }

  function handleEditName(idx: number, value: string) {
    const next = [...parsed];
    next[idx] = { ...next[idx], name: value };
    setParsed(next);
  }

  function handleRemoveRow(idx: number) {
    setParsed(parsed.filter((_, i) => i !== idx));
  }

  async function handleImport() {
    setImporting(true);
    try {
      const valid = parsed.filter((p) => p.name && !p.name.startsWith("(baris"));
      if (valid.length === 0) {
        onError("Tidak ada siswa valid untuk diimpor.");
        setImporting(false);
        return;
      }

      if (importMode === "replace") {
        // Ganti semua siswa
        await importStudents(roster.id, valid.map((p) => ({ name: p.name, number: p.number })));
      } else {
        // Tambahkan ke siswa existing
        const startNumber = roster.students.length + 1;
        for (let i = 0; i < valid.length; i++) {
          await addStudent(roster.id, { name: valid[i].name, number: startNumber + i });
        }
      }
      onImported();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Gagal impor.");
    } finally {
      setImporting(false);
    }
  }

  const hasWarnings = parsed.some((p) => p.warning);
  const validCount = parsed.filter((p) => p.name && !p.name.startsWith("(baris")).length;

  return (
    <Card>
      <CardHeader
        title={`Import Siswa — ${roster.classLabel}`}
        description="Tempel dari Excel: format 'No NIS Nama' atau 'No Nama' per baris. Bisa juga tab/koma separated."
      />

      {!showPreview ? (
        <div className="space-y-3">
          <Textarea
            label="Tempel Data Siswa"
            id="import-paste"
            value={text}
            onChange={setText}
            rows={12}
            placeholder={`1\t12345\tANDI SAPUTRA
2\t12346\tBUDI PRATAMA
3\t12347\tCITRA LESTARI

Atau:
1. ANDI SAPUTRA
2. BUDI PRATAMA
3. CITRA LESTARI

Atau cukup nama:
ANDI SAPUTRA
BUDI PRATAMA
CITRA LESTARI`}
          />
          <div className="flex gap-2">
            <Button onClick={handleParse}>Preview Data</Button>
            <Button variant="secondary" onClick={onClose}>Batal</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Summary + warnings */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="neutral">{validCount} siswa valid</Badge>
            {hasWarnings && <Badge variant="warning">Ada peringatan duplikat</Badge>}
            {roster.students.length > 0 && (
              <Badge variant="neutral">{roster.students.length} siswa existing</Badge>
            )}
          </div>

          {/* Mode: Replace / Append */}
          {roster.students.length > 0 && (
            <div className="flex gap-2">
              <Button
                variant={importMode === "replace" ? "primary" : "secondary"}
                onClick={() => setImportMode("replace")}
                className="text-sm"
              >
                Ganti Semua
              </Button>
              <Button
                variant={importMode === "append" ? "primary" : "secondary"}
                onClick={() => setImportMode("append")}
                className="text-sm"
              >
                Tambahkan
              </Button>
            </div>
          )}

          {/* Preview table */}
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="py-2 px-2 w-16">No</th>
                  <th className="py-2 px-2 w-28">NIS/NISN</th>
                  <th className="py-2 px-2">Nama Siswa</th>
                  <th className="py-2 px-2 w-24">Status</th>
                  <th className="py-2 px-2 w-16">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {parsed.map((p, i) => (
                  <tr key={i} className={`border-b border-slate-100 ${p.warning ? "bg-amber-50" : ""}`}>
                    <td className="py-1.5 px-2">
                      <input
                        type="number"
                        className="w-12 px-1 py-0.5 border border-slate-300 rounded text-sm"
                        value={p.number}
                        onChange={(e) => handleEditNumber(i, e.target.value)}
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        type="text"
                        className="w-24 px-1 py-0.5 border border-slate-300 rounded text-sm"
                        value={p.nis}
                        onChange={(e) => handleEditNIS(i, e.target.value)}
                        placeholder="-"
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        type="text"
                        className="w-full px-1 py-0.5 border border-slate-300 rounded text-sm"
                        value={p.name}
                        onChange={(e) => handleEditName(i, e.target.value)}
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      {p.warning ? <Badge variant="warning">{p.warning}</Badge> : <Badge variant="success">OK</Badge>}
                    </td>
                    <td className="py-1.5 px-2">
                      <button onClick={() => handleRemoveRow(i)} className="text-rose-600 hover:underline text-xs">Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleImport} disabled={importing || validCount === 0}>
              {importing ? "Mengimpor..." : `Simpan ${validCount} Siswa ${importMode === "replace" ? "(Ganti)" : "(Tambah)"}`}
            </Button>
            <Button variant="secondary" onClick={() => { setShowPreview(false); setParsed([]); }}>
              Ubah Data
            </Button>
            <Button variant="secondary" onClick={onClose}>Batal</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Roster Detail — list + add/remove/edit siswa                       */
/* ------------------------------------------------------------------ */

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
          <p className="text-sm text-slate-400 italic">Belum ada siswa. Klik Import untuk paste dari Excel.</p>
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
                onSuccess("Siswa ditambahkan.");
              }}
            >Tambah</Button>
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Selesai</Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2 mt-3">
          <Button variant="secondary" onClick={() => setShowAdd(true)}>+ Tambah Siswa Manual</Button>
        </div>
      )}
    </Card>
  );
}
